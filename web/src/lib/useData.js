import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase";

/* 案件一覧（リアルタイム同期） */
export function useCases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data } = await supabase.from("cases").select("*").order("created_at", { ascending: false });
    setCases(data || []);
  }, []);

  useEffect(() => {
    reload().finally(() => setLoading(false));
    const channel = supabase
      .channel("cases-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "cases" }, () => reload())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [reload]);

  return { cases, loading, reload };
}

/* 社内スタッフ一覧（承認待ちも含む） */
export function useProfiles() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: true });
    setProfiles(data || []);
  }, []);

  useEffect(() => {
    reload().finally(() => setLoading(false));
    const channel = supabase
      .channel("profiles-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => reload())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [reload]);

  return { profiles, loading, reload };
}

/* 案件ごとのチャット／履歴タイムライン（リアルタイム） */
export function useCaseThread(ctrl) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!ctrl) { setMessages([]); return; }
    const { data } = await supabase.from("case_messages").select("*").eq("ctrl", ctrl).order("created_at", { ascending: true });
    setMessages(data || []);
  }, [ctrl]);

  useEffect(() => {
    if (!ctrl) { setMessages([]); setLoading(false); return; }
    setLoading(true);
    reload().finally(() => setLoading(false));
    const channel = supabase
      .channel(`case-messages-${ctrl}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "case_messages", filter: `ctrl=eq.${ctrl}` },
        (payload) => setMessages((ms) => ms.some(m => m.id === payload.new.id) ? ms : [...ms, payload.new]))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [ctrl, reload]);

  const send = useCallback(async (role, author, text) => {
    if (!ctrl || !text.trim()) return;
    await supabase.from("case_messages").insert({ ctrl, role, author, text });
    const preview = text.length > 40 ? text.slice(0, 40) + "…" : text;
    await logActivity(author, "メッセージ送信", `${ctrl}（${role === "customer" ? "先方" : "社内"}）`, "—", preview);
  }, [ctrl]);

  return { messages, loading, send };
}

/* 案件ごとのメッセージ件数（管理者画面の一覧用） */
export function useThreadCounts() {
  const [counts, setCounts] = useState({});
  const reload = useCallback(async () => {
    const { data } = await supabase.from("case_messages").select("ctrl").neq("role", "system");
    const map = {};
    (data || []).forEach((r) => { map[r.ctrl] = (map[r.ctrl] || 0) + 1; });
    setCounts(map);
  }, []);
  useEffect(() => {
    reload();
    const channel = supabase
      .channel("thread-counts-all")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "case_messages" }, () => reload())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [reload]);
  return counts;
}

/* 全社共通の変更履歴（監査ログ） */
export function useAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data } = await supabase.from("audit_logs").select("*").order("at", { ascending: false }).limit(500);
    setLogs(data || []);
  }, []);

  useEffect(() => {
    reload().finally(() => setLoading(false));
    const channel = supabase
      .channel("audit-logs-all")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" },
        (payload) => setLogs((ls) => [payload.new, ...ls]))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [reload]);

  return { logs, loading };
}

/* 監査ログ記録のヘルパー（誰が・どこを触ったかを1件書き込む） */
export async function logActivity(userName, action, target, before = "—", after = "—") {
  await supabase.from("audit_logs").insert({
    user_name: userName || "未ログイン", action, target,
    before_value: String(before ?? "—"), after_value: String(after ?? "—"),
  });
}

/* 案件チャットへシステムメッセージを1件追加 */
export async function pushSystemNote(ctrl, text) {
  if (!ctrl) return;
  await supabase.from("case_messages").insert({ ctrl, role: "system", author: "システム", text });
}

/* 案件ごとの先方リンク（トークン）管理 */
export function useCaseLinks() {
  const [links, setLinks] = useState({});
  const reload = useCallback(async () => {
    const { data } = await supabase.from("case_links").select("*");
    const map = {};
    (data || []).forEach((l) => { map[l.ctrl] = l; });
    setLinks(map);
  }, []);
  useEffect(() => {
    reload();
    const channel = supabase
      .channel("case-links-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "case_links" }, () => reload())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [reload]);

  const ensureLink = useCallback(async (ctrl) => {
    const { data } = await supabase.from("case_links").select("*").eq("ctrl", ctrl).maybeSingle();
    if (data) return data.token;
    const { data: created } = await supabase.from("case_links").insert({ ctrl }).select().single();
    return created?.token;
  }, []);

  const toggleLink = useCallback(async (ctrl) => {
    const cur = links[ctrl];
    if (!cur) { await ensureLink(ctrl); return; }
    await supabase.from("case_links").update({ enabled: !cur.enabled }).eq("ctrl", ctrl);
  }, [links, ensureLink]);

  return { links, ensureLink, toggleLink };
}
