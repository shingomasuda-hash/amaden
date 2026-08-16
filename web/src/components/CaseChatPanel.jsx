import { useEffect, useRef, useState } from "react";
import { C } from "../lib/theme";
import { fmtAt } from "../lib/theme";
import { Send, Sparkles } from "../lib/icons";
import { Btn } from "./ui";

const roleStyle = {
  internal: { align: "items-start", bg: "#fff", border: C.line, label: "社内", labelBg: C.panel2, labelFg: C.navy },
  customer: { align: "items-end", bg: "#eef7f0", border: "#d3ecd9", label: "先方", labelBg: "#e4efe6", labelFg: "#1e7d45" },
};

/* 案件チャット（履歴＋やり取り）— 社内の管理画面・先方向けポータルの両方から使う共通部品 */
export function CaseChatPanel({ messages, onSend, viewerRole, currentUserName, aiEnabled, onToggleAi, showAiToggle }) {
  const [text, setText] = useState("");
  const listRef = useRef(null);
  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [messages.length]);

  const send = () => {
    const v = text.trim();
    if (!v) return;
    const author = viewerRole === "customer" ? "先方（お客様）" : currentUserName || "社内担当者";
    onSend?.(viewerRole, author, v);
    setText("");
  };

  return (
    <div className="flex flex-col" style={{ height: "100%" }}>
      {showAiToggle && (
        <label className="flex items-center justify-between gap-2 px-3 py-2 rounded border mb-2 cursor-pointer" style={{ borderColor: C.line, backgroundColor: C.panel }}>
          <span className="flex items-center gap-1.5 text-xs" style={{ color: C.ink }}><Sparkles size={13} style={{ color: C.navy }} />先方がAIエージェント経由でこのチャットを操作することを許可する</span>
          <input type="checkbox" checked={!!aiEnabled} onChange={(e) => onToggleAi?.(e.target.checked)} />
        </label>
      )}
      <div ref={listRef} className="flex-1 overflow-auto rounded border px-3 py-3 space-y-2.5" style={{ borderColor: C.line, backgroundColor: "#f8fafc", minHeight: 260 }}>
        {messages.length === 0 && <div className="text-center text-xs py-8" style={{ color: C.sub }}>まだやり取りはありません。</div>}
        {messages.map((m) => {
          if (m.role === "system") {
            return (
              <div key={m.id} className="flex items-center gap-2 my-1">
                <div className="flex-1 h-px" style={{ backgroundColor: C.line }} />
                <span className="text-[10px] whitespace-nowrap px-2" style={{ color: C.sub }}>{m.text}（{fmtAt(m.created_at)}）</span>
                <div className="flex-1 h-px" style={{ backgroundColor: C.line }} />
              </div>
            );
          }
          const rs = roleStyle[m.role] || roleStyle.internal;
          return (
            <div key={m.id} className={`flex flex-col ${rs.align}`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: rs.labelFg, backgroundColor: rs.labelBg }}>{rs.label}</span>
                <span className="text-[11px]" style={{ color: C.sub }}>{m.author}</span>
              </div>
              <div className="rounded-lg border px-3 py-2 text-sm max-w-[80%]" style={{ borderColor: rs.border, backgroundColor: rs.bg, color: C.ink }}>{m.text}</div>
              <span className="text-[10px] mt-0.5" style={{ color: "#a3adb8" }}>{fmtAt(m.created_at)}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-end gap-2 mt-2">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={viewerRole === "customer" ? "担当者へのメッセージを入力（Enterで送信）" : "先方へのメッセージを入力（Enterで送信）"}
          className="flex-1 rounded border px-3 py-2 text-sm" style={{ borderColor: C.line2, color: C.ink }} />
        <Btn variant="primary" icon={Send} onClick={send}>送信</Btn>
      </div>
    </div>
  );
}
