import { useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { C, STATUS } from "../lib/theme";
import { Plus, ShieldCheck, Filter, Search, MessageSquare, Link2, Eye, RotateCcw, Cpu, FileCheck2, AlertTriangle } from "../lib/icons";
import { Btn, Card, Stat, StatusBadge, ProtoNote } from "../components/ui";
import { logActivity, pushSystemNote } from "../lib/useData";

export function Dashboard({ cases, profiles, caseLinks, currentUser, canManage, onOpenCase, onNewCase, onAdmin, onOpenChat, onCopyLink }) {
  const monthOptions = useMemo(() => Array.from(new Set(cases.map((c) => (c.case_date || "").slice(0, 7)).filter(Boolean))).sort().reverse(), [cases]);
  const [month, setMonth] = useState("all");
  const owners = profiles.filter((p) => p.status === "有効" && p.role !== "pending").map((p) => p.name);

  const filtered = month === "all" ? cases : cases.filter((c) => (c.case_date || "").slice(0, 7) === month);
  const count = (k) => filtered.filter((c) => c.status === k).length;
  const monthLabel = (m) => (m === "all" ? "全期間" : `${m.slice(0, 4)}年${Number(m.slice(5, 7))}月`);

  const changeOwner = async (c, owner) => {
    if (c.owner === owner) return;
    await supabase.from("cases").update({ owner, updated_at: new Date().toISOString() }).eq("id", c.id);
    await logActivity(currentUser.name, "担当者変更", c.ctrl, c.owner || "未設定", owner || "未設定");
    await pushSystemNote(c.ctrl, `${currentUser.name} が担当者を「${c.owner || "未設定"}」から「${owner || "未設定"}」に変更しました。`);
  };

  return (
    <div className="mx-auto px-8 py-6" style={{ maxWidth: 1440 }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: C.ink }}>案件ダッシュボード</h1>
          <p className="text-sm mt-0.5" style={{ color: C.sub }}>整備報告書【モータ】自動作成システム</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded border bg-white px-3 py-2" style={{ borderColor: C.line2 }}>
            <Filter size={14} style={{ color: C.sub }} />
            <span className="text-xs" style={{ color: C.sub }}>登録月</span>
            <select value={month} onChange={(e) => setMonth(e.target.value)} className="text-sm outline-none bg-white" style={{ color: C.ink }}>
              <option value="all">全期間</option>
              {monthOptions.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          </div>
          {canManage && <Btn variant="outline" size="lg" icon={ShieldCheck} onClick={onAdmin}>管理者画面</Btn>}
          {canManage && <Btn variant="primary" size="lg" icon={Plus} onClick={onNewCase}>新規案件登録</Btn>}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Stat label="確認待ち" value={count("review")} tone="review" />
        <Stat label="処理中" value={count("process")} tone="process" />
        <Stat label="完了" value={count("done")} tone="done" />
        <Stat label="エラー" value={count("error")} tone="error" />
      </div>

      <Card pad={false}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: C.line }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: C.ink }}>案件一覧</h2>
            <div className="text-[11px] mt-0.5" style={{ color: C.sub }}>{monthLabel(month)}で絞り込み中</div>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: C.sub }}>
            <Search size={14} /><span>表示 {filtered.length} 件 ／ 全 {cases.length} 件</span>
          </div>
        </div>
        <datalist id="ownerOptions">{owners.map((o) => <option key={o} value={o} />)}</datalist>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: C.sub, backgroundColor: C.panel }}>
              {["管理番号", "顧客名", "モーター種別", "処理状況", "登録日", "担当者", "先方とのやり取り", "操作"].map((h) => (
                <th key={h} className="px-5 py-2.5 font-medium text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const link = caseLinks[c.ctrl];
              return (
                <tr key={c.id} className="border-t hover:bg-slate-50" style={{ borderColor: C.line }}>
                  <td className="px-5 py-3 font-mono text-[13px]" style={{ color: C.navy }}>{c.ctrl}</td>
                  <td className="px-5 py-3" style={{ color: C.ink }}>{c.customer}<div className="text-[11px]" style={{ color: C.sub }}>{c.spec}</div></td>
                  <td className="px-5 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs border" style={{ color: C.navy, borderColor: C.line2 }}>{c.kind}{c.rewind ? " ・巻替" : ""}</span></td>
                  <td className="px-5 py-3"><StatusBadge s={c.status} /></td>
                  <td className="px-5 py-3 font-mono text-[13px]" style={{ color: C.sub }}>{c.case_date}</td>
                  <td className="px-5 py-3">
                    {canManage ? (
                      <input list="ownerOptions" defaultValue={c.owner || ""} onBlur={(e) => changeOwner(c, e.target.value)}
                        className="w-36 rounded border px-2 py-1.5 text-xs bg-white" style={{ borderColor: C.line2, color: C.ink }} />
                    ) : (
                      <span style={{ color: C.ink }}>{c.owner || "—"}</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      <Btn size="sm" variant="outline" icon={MessageSquare} onClick={() => onOpenChat(c)}>履歴・チャット</Btn>
                      {canManage && (
                        <button title="先方用リンクをコピー" onClick={() => onCopyLink(c)} className="p-1.5 rounded hover:bg-slate-100">
                          <Link2 size={14} style={{ color: link?.enabled === false ? "#dc2626" : C.sub }} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {!canManage ? (
                      <Btn size="sm" variant="outline" icon={Eye} onClick={() => onOpenCase(c, "preview")}>表示（閲覧のみ）</Btn>
                    ) : c.status === "error" ? (
                      <Btn size="sm" variant="outline" icon={RotateCcw} onClick={() => onOpenCase(c, "upload")}>再処理</Btn>
                    ) : c.status === "done" ? (
                      <Btn size="sm" variant="outline" icon={Eye} onClick={() => onOpenCase(c, "preview")}>表示</Btn>
                    ) : c.status === "process" ? (
                      <Btn size="sm" variant="outline" icon={Cpu} onClick={() => onOpenCase(c, "processing")}>状況</Btn>
                    ) : (
                      <Btn size="sm" variant="primary" icon={FileCheck2} onClick={() => onOpenCase(c, "review")}>確認する</Btn>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="px-5 py-10 text-center text-sm" style={{ color: C.sub }}>選択した月の案件はありません。</div>}
        {filtered.some((c) => c.status === "error") && (
          <div className="px-5 py-3 border-t flex items-start gap-2 text-xs" style={{ borderColor: C.line, color: STATUS.error.fg, backgroundColor: "#fef6f6" }}>
            <AlertTriangle size={14} className="mt-0.5" />
            <span><b className="font-mono">{filtered.find((c) => c.status === "error")?.ctrl}</b>：{filtered.find((c) => c.status === "error")?.err}</span>
          </div>
        )}
      </Card>
      <div className="mt-5"><ProtoNote /></div>
    </div>
  );
}
