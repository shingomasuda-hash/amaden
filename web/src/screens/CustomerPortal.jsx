import { useEffect, useState, useCallback } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getCaseByToken, logActivity } from "../lib/useData";
import { C, STATUS } from "../lib/theme";
import { FileSpreadsheet, ChevronLeft, Info, MessageSquare, Sparkles, Check } from "../lib/icons";
import { Card, StatusBadge } from "../components/ui";
import { CaseChatPanel } from "../components/CaseChatPanel";

const AI_ACTIONS = [
  { id: "check-status", label: "案件の処理状況を確認する" },
  { id: "read-history", label: "これまでのやり取り履歴を読む" },
  { id: "post-message", label: "担当者へメッセージを送る" },
];

/* 先方向けポータル：ログイン不要・URLのトークンだけで開く */
export function CustomerPortal({ token, onBackToStaff }) {
  const [state, setState] = useState("loading"); // loading | notfound | ok
  const [info, setInfo] = useState(null);
  const [messages, setMessages] = useState([]);

  const load = useCallback(async () => {
    const data = await getCaseByToken(token);
    if (!data || data.enabled === false) { setState("notfound"); return; }
    setInfo(data);
    setState("ok");
  }, [token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (state !== "ok") return;
    const q = query(collection(db, "caseLinks", token, "messages"), orderBy("created_at", "asc"));
    const unsub = onSnapshot(q, (snap) => setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, [state, token]);

  const send = async (role, author, text) => {
    await addDoc(collection(db, "caseLinks", token, "messages"), { role, author, text, created_at: serverTimestamp() });
    const preview = text.length > 40 ? text.slice(0, 40) + "…" : text;
    await logActivity(author, "メッセージ送信", `${info.ctrl}（先方）`, "—", preview);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f0f2f5" }}>
      <header style={{ backgroundColor: C.navy }}>
        <div className="mx-auto flex items-center justify-between px-6 h-14" style={{ maxWidth: 900 }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,.12)" }}><FileSpreadsheet size={17} className="text-white" /></div>
            <div>
              <div className="text-white text-sm font-semibold leading-tight">整備報告書【モータ】お客様ポータル</div>
              <div className="text-[10px] leading-tight" style={{ color: "#a9bdd4" }}>Amaden ／ 進捗確認・お問い合わせ</div>
            </div>
          </div>
          {onBackToStaff && (
            <button onClick={onBackToStaff} className="text-[11px] flex items-center gap-1" style={{ color: "#cbd5e1" }}><ChevronLeft size={12} />社内画面に戻る</button>
          )}
        </div>
      </header>
      <main className="mx-auto px-6 py-6" style={{ maxWidth: 900 }} aria-label="お客様ポータル">
        {state === "loading" && <Card><div className="text-sm" style={{ color: C.sub }}>読み込み中…</div></Card>}
        {state === "notfound" && (
          <Card><div className="text-sm" style={{ color: C.ink }}>このリンクは無効です。担当者にご確認ください。</div></Card>
        )}
        {state === "ok" && info && (
          <>
            <Card className="mb-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-xs" style={{ color: C.sub }}>管理番号 {info.ctrl}</div>
                  <h1 className="text-lg font-semibold mt-0.5" style={{ color: C.ink }}>{info.customer} 様</h1>
                  <div className="text-xs mt-1" style={{ color: C.sub }}>{info.kind}{info.rewind ? "・巻替" : ""} ／ {info.spec}</div>
                </div>
                {STATUS[info.status] && <StatusBadge s={info.status} />}
              </div>
              <div className="mt-3 text-[11px] flex items-start gap-1.5 rounded px-2.5 py-2" style={{ color: "#475569", backgroundColor: C.panel }}>
                <Info size={12} className="mt-0.5" />
                メッセージは担当者とリアルタイムに共有されます。
              </div>
            </Card>

            {info.aiEnabled && (
              <Card className="mb-4">
                <div className="flex items-center gap-1.5 text-sm font-semibold mb-2" style={{ color: C.ink }}><Sparkles size={14} style={{ color: C.navy }} />AIエージェントでの操作について</div>
                <p className="text-xs mb-2" style={{ color: C.sub }}>お客様がご利用のAIアシスタント（ブラウザ拡張など）から、このページ上で以下の操作を行うことを許可しています。</p>
                <ul className="text-xs space-y-1" style={{ color: C.ink }} aria-label="AIエージェントが実行できる操作の一覧">
                  {AI_ACTIONS.map((a) => (
                    <li key={a.id} data-ai-action={a.id} className="flex items-center gap-2"><Check size={12} style={{ color: "#059669" }} />{a.label}</li>
                  ))}
                </ul>
              </Card>
            )}

            <Card pad={false} style={{ height: 460 }} className="flex flex-col">
              <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: C.line, backgroundColor: C.panel }}>
                <MessageSquare size={14} style={{ color: C.navy }} />
                <span className="text-sm font-semibold" style={{ color: C.ink }}>担当者とのやり取り</span>
              </div>
              <div className="p-4 flex-1 min-h-0">
                <CaseChatPanel messages={messages} onSend={send} viewerRole="customer" />
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
