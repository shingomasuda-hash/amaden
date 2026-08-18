import { useMemo, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { C, fmtAt } from "../lib/theme";
import { ShieldCheck, Users, MessageSquare, History, LayoutDashboard, FileText, Link2 } from "../lib/icons";
import { Btn, Card, ProtoNote } from "../components/ui";
import { logActivity } from "../lib/useData";

const JPY_PER_USD = 155; // 概算レート。web/api/extract.js の usdToJpyEstimate と合わせている

export function AdminPanel({ profiles, cases, threadCounts, currentUser, onBack, onOpenChat, onCopyLink, onToggleLink, logs, toast }) {
  const [tab, setTab] = useState("accounts");
  const [logUser, setLogUser] = useState("全員");
  const [logAction, setLogAction] = useState("全操作");
  const totalAiCostUsd = useMemo(() => cases.reduce((sum, c) => sum + (c.aiCostUsd || 0), 0), [cases]);
  const totalAiCostCount = useMemo(() => cases.reduce((sum, c) => sum + (c.aiCostCount || 0), 0), [cases]);

  const updateProfile = async (p, patch) => {
    const key = Object.keys(patch)[0];
    await updateDoc(doc(db, "profiles", p.id), patch);
    await logActivity(currentUser.name, "アカウント変更", `${p.name} / ${key}`, p[key], patch[key]);
    toast?.(`${p.name} を更新しました`);
  };

  const logUsers = useMemo(() => ["全員", ...Array.from(new Set(logs.map((l) => l.userName)))], [logs]);
  const logActions = useMemo(() => ["全操作", ...Array.from(new Set(logs.map((l) => l.action)))], [logs]);
  const filteredLogs = logs.filter((l) => (logUser === "全員" || l.userName === logUser) && (logAction === "全操作" || l.action === logAction));

  const exportCsv = () => {
    const header = ["日時", "ユーザー", "操作", "対象", "変更前", "変更後"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = filteredLogs.map((l) => [fmtAt(l.at), l.userName, l.action, l.target, l.before, l.after].map(esc).join(","));
    const csv = "﻿" + [header.map(esc).join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `変更履歴_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto px-8 py-6" style={{ maxWidth: 1440 }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: C.ink }}><ShieldCheck size={20} />管理者画面</h1>
          <p className="text-sm mt-0.5" style={{ color: C.sub }}>アカウント承認・先方とのやり取り・変更履歴を確認できます。</p>
        </div>
        <Btn variant="outline" icon={LayoutDashboard} onClick={onBack}>ダッシュボードへ戻る</Btn>
      </div>

      <div className="flex gap-2 mb-4">
        <Btn variant={tab === "accounts" ? "primary" : "outline"} icon={Users} onClick={() => setTab("accounts")}>
          アカウント管理{profiles.some((p) => p.role === "pending") ? ` (${profiles.filter((p) => p.role === "pending").length})` : ""}
        </Btn>
        <Btn variant={tab === "chats" ? "primary" : "outline"} icon={MessageSquare} onClick={() => setTab("chats")}>先方とのやり取り</Btn>
        <Btn variant={tab === "logs" ? "primary" : "outline"} icon={History} onClick={() => setTab("logs")}>変更履歴</Btn>
      </div>

      {tab === "accounts" && (
        <Card pad={false}>
          <div className="px-5 py-3 border-b" style={{ borderColor: C.line }}>
            <div className="text-sm font-semibold" style={{ color: C.ink }}>登録アカウント</div>
            <div className="text-[11px] mt-0.5" style={{ color: C.sub }}>「承認待ち」は新規サインアップ直後の状態です。権限を選ぶと入れるようになります。</div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-left" style={{ color: C.sub, backgroundColor: C.panel }}>
              {["氏名", "メール", "権限", "状態", "登録日", "操作"].map((h) => <th key={h} className="px-5 py-2.5 font-medium text-xs">{h}</th>)}
            </tr></thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className="border-t" style={{ borderColor: C.line, backgroundColor: p.role === "pending" ? "#fffdf7" : "transparent" }}>
                  <td className="px-5 py-3" style={{ color: C.ink }}>{p.name}{p.id === currentUser?.id && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded" style={{ color: C.navy, backgroundColor: C.panel2 }}>自分</span>}</td>
                  <td className="px-5 py-3 text-xs" style={{ color: C.sub }}>{p.email}</td>
                  <td className="px-5 py-3">
                    <select value={p.role} onChange={(e) => updateProfile(p, { role: e.target.value })} className="rounded border px-2 py-1 text-xs" style={{ borderColor: p.role === "pending" ? "#f59e0b" : C.line2 }}>
                      <option value="pending">承認待ち</option><option value="管理者">管理者</option><option value="担当者">担当者</option><option value="閲覧者">閲覧者</option>
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <select value={p.status} onChange={(e) => updateProfile(p, { status: e.target.value })} className="rounded border px-2 py-1 text-xs" style={{ borderColor: C.line2 }}>
                      <option>有効</option><option>停止</option>
                    </select>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs" style={{ color: C.sub }}>{fmtAt(p.created_at).slice(0, 10)}</td>
                  <td className="px-5 py-3 text-xs" style={{ color: C.sub }}>—</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-3 text-[11px]" style={{ color: C.sub }}>
            アカウントの削除は現在ここからはできません（削除にはFirebaseの管理者操作が必要です。停止で無効化してください）。
          </div>
        </Card>
      )}

      {tab === "chats" && (
        <Card pad={false}>
          <div className="px-5 py-3 border-b flex items-center justify-between flex-wrap gap-2" style={{ borderColor: C.line }}>
            <div className="text-sm font-semibold" style={{ color: C.ink }}>案件ごとの先方とのやり取り</div>
            <div className="text-xs" style={{ color: C.sub }}>
              AI読み取り 合計 <span className="font-mono font-medium" style={{ color: C.navy }}>${totalAiCostUsd.toFixed(4)}</span>（約¥{Math.ceil(totalAiCostUsd * JPY_PER_USD)}）・{totalAiCostCount}回
            </div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-left" style={{ color: C.sub, backgroundColor: C.panel }}>
              {["管理番号", "顧客名", "担当者", "件数", "AI操作", "AI読み取りコスト（概算）", "リンク", "操作"].map((h) => <th key={h} className="px-5 py-2.5 font-medium text-xs">{h}</th>)}
            </tr></thead>
            <tbody>
              {cases.map((c) => {
                const linkEnabled = c.linkEnabled !== false;
                const costUsd = c.aiCostUsd || 0;
                return (
                  <tr key={c.ctrl} className="border-t" style={{ borderColor: C.line }}>
                    <td className="px-5 py-3 font-mono text-[13px]" style={{ color: C.navy }}>{c.ctrl}</td>
                    <td className="px-5 py-3" style={{ color: C.ink }}>{c.customer}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: C.sub }}>{c.owner || "—"}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: C.sub }}>{threadCounts?.[c.ctrl] ?? 0}</td>
                    <td className="px-5 py-3">
                      <span className="text-[11px] px-1.5 py-0.5 rounded" style={c.aiEnabled ? { color: "#1e7d45", backgroundColor: "#e4efe6" } : { color: C.sub, backgroundColor: C.panel }}>
                        {c.aiEnabled ? "許可中" : "無効"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs font-mono" style={{ color: costUsd > 0 ? C.ink : C.sub }}>
                      {costUsd > 0 ? `$${costUsd.toFixed(4)}（約¥${Math.ceil(costUsd * JPY_PER_USD)}）・${c.aiCostCount || 0}回` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={() => onToggleLink(c)} className="text-[11px] px-1.5 py-0.5 rounded" style={linkEnabled ? { color: "#1e7d45", backgroundColor: "#e4efe6" } : { color: "#b91c1c", backgroundColor: "#fee2e2" }}>
                        {linkEnabled ? "有効" : "無効化中"}
                      </button>
                    </td>
                    <td className="px-5 py-3 flex items-center gap-1.5">
                      <Btn size="sm" variant="outline" icon={MessageSquare} onClick={() => onOpenChat(c)}>開く</Btn>
                      <button title="先方用リンクをコピー" onClick={() => onCopyLink(c)} className="p-1.5 rounded hover:bg-slate-100"><Link2 size={14} style={{ color: C.sub }} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-5 py-3 text-[11px]" style={{ color: C.sub }}>
            コストは概算です（Claude APIの参考単価から算出）。正確な請求額は console.anthropic.com の使用状況をご確認ください。
          </div>
        </Card>
      )}

      {tab === "logs" && (
        <Card pad={false}>
          <div className="px-5 py-3 border-b flex items-center justify-between flex-wrap gap-2" style={{ borderColor: C.line }}>
            <div className="text-sm font-semibold" style={{ color: C.ink }}>変更履歴</div>
            <div className="flex items-center gap-2">
              <select value={logUser} onChange={(e) => setLogUser(e.target.value)} className="rounded border px-2 py-1.5 text-xs" style={{ borderColor: C.line2 }}>
                {logUsers.map((u) => <option key={u}>{u}</option>)}
              </select>
              <select value={logAction} onChange={(e) => setLogAction(e.target.value)} className="rounded border px-2 py-1.5 text-xs" style={{ borderColor: C.line2 }}>
                {logActions.map((a) => <option key={a}>{a}</option>)}
              </select>
              <Btn size="sm" variant="outline" icon={FileText} onClick={exportCsv}>CSV出力</Btn>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-left" style={{ color: C.sub, backgroundColor: C.panel }}>
              {["日時", "ユーザー", "操作", "対象", "変更前", "変更後"].map((h) => <th key={h} className="px-5 py-2.5 font-medium text-xs">{h}</th>)}
            </tr></thead>
            <tbody>
              {filteredLogs.map((l) => (
                <tr key={l.id} className="border-t" style={{ borderColor: C.line }}>
                  <td className="px-5 py-3 font-mono text-xs" style={{ color: C.sub }}>{fmtAt(l.at)}</td>
                  <td className="px-5 py-3" style={{ color: C.ink }}>{l.userName}</td>
                  <td className="px-5 py-3"><span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: C.panel2, color: C.navy }}>{l.action}</span></td>
                  <td className="px-5 py-3" style={{ color: C.ink }}>{l.target}</td>
                  <td className="px-5 py-3 text-xs" style={{ color: C.sub }}>{l.before}</td>
                  <td className="px-5 py-3 text-xs" style={{ color: C.ink }}>{l.after}</td>
                </tr>
              ))}
              {filteredLogs.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-sm" style={{ color: C.sub }}>該当する履歴はありません。</td></tr>}
            </tbody>
          </table>
        </Card>
      )}
      <div className="mt-4"><ProtoNote /></div>
    </div>
  );
}
