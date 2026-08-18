import { useEffect, useState, useCallback, useRef } from "react";
import {
  collection, doc, onSnapshot, query, orderBy, limit, addDoc, setDoc, updateDoc,
  serverTimestamp, getDoc, increment,
} from "firebase/firestore";
import { db } from "./firebase";

const genToken = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  return Array.from({ length: 16 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");
};

/* 案件一覧（リアルタイム同期） */
export function useCases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "cases"), (snap) => {
      setCases(snap.docs.map((d) => ({ id: d.id, ctrl: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);
  return { cases, loading };
}

/* 社内スタッフ一覧（承認待ちも含む） */
export function useProfiles() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "profiles"), (snap) => {
      setProfiles(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);
  return { profiles, loading };
}

/* 案件ごとのチャット／履歴タイムライン（リアルタイム）。
   正規のメッセージ保存場所は caseLinks/{token}/messages（社内・先方共通）。 */
export function useCaseThread(theCase) {
  const token = theCase?.linkToken;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setMessages([]); setLoading(false); return; }
    setLoading(true);
    const q = query(collection(db, "caseLinks", token, "messages"), orderBy("created_at", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [token]);

  const send = useCallback(async (role, author, text) => {
    if (!token || !text.trim()) return;
    await addDoc(collection(db, "caseLinks", token, "messages"), { role, author, text, created_at: serverTimestamp() });
    const preview = text.length > 40 ? text.slice(0, 40) + "…" : text;
    await logActivity(author, "メッセージ送信", `${theCase.ctrl}（${role === "customer" ? "先方" : "社内"}）`, "—", preview);
  }, [token, theCase?.ctrl]);

  return { messages, loading, send };
}

/* 全社共通の変更履歴（監査ログ） */
export function useAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const q = query(collection(db, "auditLogs"), orderBy("at", "desc"), limit(500));
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);
  return { logs, loading };
}

/* 監査ログ記録のヘルパー（誰が・どこを触ったかを1件書き込む） */
export async function logActivity(userName, action, target, before = "—", after = "—") {
  await addDoc(collection(db, "auditLogs"), {
    at: serverTimestamp(), userName: userName || "未ログイン", action, target,
    before: String(before ?? "—"), after: String(after ?? "—"),
  });
}

/* 案件チャットへシステムメッセージを1件追加 */
export async function pushSystemNote(theCase, text) {
  if (!theCase?.linkToken) return;
  await addDoc(collection(db, "caseLinks", theCase.linkToken, "messages"), { role: "system", author: "システム", text, created_at: serverTimestamp() });
}

/* 新しい案件を作成（cases と、先方リンクの実体である caseLinks を同時に作る） */
export async function createCase({ ctrl, customer, kind, rewind, spec, owner }) {
  const token = genToken();
  const caseDoc = {
    customer, kind, rewind, spec: spec || "", status: "review", owner: owner || "",
    aiEnabled: false, linkToken: token, linkEnabled: true,
    aiCostUsd: 0, aiCostCount: 0,
    caseDate: new Date().toISOString().slice(0, 10),
    created_at: serverTimestamp(), updated_at: serverTimestamp(),
  };
  await setDoc(doc(db, "cases", ctrl), caseDoc);
  await setDoc(doc(db, "caseLinks", token), { ctrl, enabled: true, customer, kind, rewind, spec: spec || "", status: "review", aiEnabled: false });
  return { id: ctrl, ctrl, ...caseDoc };
}

export async function updateCaseOwner(theCase, owner) {
  await updateDoc(doc(db, "cases", theCase.ctrl), { owner, updated_at: serverTimestamp() });
}

export async function toggleCaseAi(theCase, enabled) {
  await updateDoc(doc(db, "cases", theCase.ctrl), { aiEnabled: enabled });
  if (theCase.linkToken) await updateDoc(doc(db, "caseLinks", theCase.linkToken), { aiEnabled: enabled });
}

export async function toggleCaseLink(theCase) {
  const wasEnabled = theCase.linkEnabled !== false;
  await updateDoc(doc(db, "cases", theCase.ctrl), { linkEnabled: !wasEnabled });
  if (theCase.linkToken) await updateDoc(doc(db, "caseLinks", theCase.linkToken), { enabled: !wasEnabled });
  return !wasEnabled;
}

/* AI読み取り（Claude API）1回分のコストを、案件の累計とあわせて記録する。
   cost: { usd, jpyEstimate, inputTok, outputTok }（サーバー側の概算値） */
export async function logAiCost(theCase, actorName, cost) {
  if (!theCase?.ctrl || !cost) return;
  const usdText = `$${cost.usd.toFixed(4)}（約¥${Math.ceil(cost.jpyEstimate)}）`;
  await updateDoc(doc(db, "cases", theCase.ctrl), {
    aiCostUsd: increment(cost.usd), aiCostCount: increment(1), updated_at: serverTimestamp(),
  });
  await logActivity(actorName, "AI読み取りコスト（概算）", theCase.ctrl, "—", usdText);
  await pushSystemNote(theCase, `AI読み取りを実行しました（概算コスト ${usdText}）`);
}

/* 先方ポータル：トークンから案件情報を取得（未ログインで呼ばれる） */
export async function getCaseByToken(token) {
  const snap = await getDoc(doc(db, "caseLinks", token));
  return snap.exists() ? snap.data() : null;
}

/* 案件ごとのメッセージ件数（管理者画面の一覧用）。case一覧の token を購読して集計する。 */
export function useThreadCounts(cases) {
  const [counts, setCounts] = useState({});
  const unsubsRef = useRef({});
  const tokenToCtrl = {};
  cases.forEach((c) => { if (c.linkToken) tokenToCtrl[c.linkToken] = c.ctrl; });
  const tokensKey = Object.keys(tokenToCtrl).sort().join(",");

  useEffect(() => {
    const tokens = new Set(Object.keys(tokenToCtrl));
    Object.keys(unsubsRef.current).forEach((token) => {
      if (!tokens.has(token)) { unsubsRef.current[token](); delete unsubsRef.current[token]; }
    });
    tokens.forEach((token) => {
      if (unsubsRef.current[token]) return;
      const ctrl = tokenToCtrl[token];
      unsubsRef.current[token] = onSnapshot(collection(db, "caseLinks", token, "messages"), (snap) => {
        const n = snap.docs.filter((d) => d.data().role !== "system").length;
        setCounts((cs) => ({ ...cs, [ctrl]: n }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokensKey]);

  useEffect(() => () => { Object.values(unsubsRef.current).forEach((u) => u()); }, []);

  return counts;
}
