import { useEffect, useMemo, useRef, useState } from "react";
import { C, STATUS, CONF } from "../lib/theme";
import {
  Upload as UploadIcon, Cpu, Ruler, CheckCircle2, FileSpreadsheet, FileText,
  ChevronLeft, ChevronRight, AlertTriangle, Check, X, ImageIcon, ArrowRight, Info, FolderOpen,
  ExternalLink, Filter,
} from "../lib/icons";
import { Btn, Card, ConfPill, ProtoNote } from "../components/ui";
import { PHRASES, MEAS_COL_LABEL, STEPS } from "../lib/mockWorkflow";

export function Stepper({ current, go, maxReached }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {STEPS.map((s, i) => {
        const active = i === idx, reached = i <= maxReached;
        return (
          <div key={s.id} className="flex items-center gap-1">
            <button disabled={!reached} onClick={() => reached && go(s.id)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-medium whitespace-nowrap"
              style={{
                color: active ? "#fff" : reached ? C.navy : "#b0bac6",
                backgroundColor: active ? C.navy : reached ? "#eef2f7" : "transparent",
                cursor: reached ? "pointer" : "default",
              }}>
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px]"
                style={{ backgroundColor: active ? "rgba(255,255,255,.2)" : reached ? "#dbe3ec" : "#eef2f7", color: active ? "#fff" : reached ? C.navy : "#b0bac6" }}>
                {i + 1}
              </span>
              <span className="hidden xl:inline">{s.name}</span>
            </button>
            {i < STEPS.length - 1 && <ChevronRight size={14} style={{ color: "#cbd5e1" }} />}
          </div>
        );
      })}
    </div>
  );
}

export function UploadScreen({ theCase, owners, onStart, onAudit }) {
  const [file, setFile] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [drag, setDrag] = useState(false);
  const pick = () => setFile({ name: `成績書_${theCase?.customer?.replace(/[㈱\s]/g, "") || "新規"}_${theCase?.ctrl || "26MTxxxx"}.pdf`, pages: 8 });
  return (
    <div className="mx-auto px-8 py-6" style={{ maxWidth: 1440 }}>
      <h1 className="text-lg font-semibold mb-4" style={{ color: C.ink }}>手書きPDFのアップロード</h1>
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-4">
          <Card>
            <div className="text-sm font-semibold mb-3" style={{ color: C.ink }}>スキャン済み成績書（手書きPDF）</div>
            <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); pick(); }}
              className="rounded-lg border-2 border-dashed flex flex-col items-center justify-center py-12 transition-colors"
              style={{ borderColor: drag ? C.navy : C.line2, backgroundColor: drag ? "#f0f5fa" : C.panel }}>
              <UploadIcon size={30} style={{ color: C.navy }} />
              <div className="text-sm mt-3" style={{ color: C.ink }}>PDFをここにドラッグ＆ドロップ</div>
              <div className="text-xs mt-1 mb-3" style={{ color: C.sub }}>または</div>
              <Btn variant="outline" icon={FileText} onClick={pick}>ファイルを選択</Btn>
            </div>
            {file && (
              <div className="mt-4 flex items-center justify-between rounded border px-4 py-3" style={{ borderColor: C.line, backgroundColor: "#fff" }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded flex items-center justify-center" style={{ backgroundColor: "#fde8e8" }}><FileText size={18} style={{ color: "#c0392b" }} /></div>
                  <div>
                    <div className="text-sm" style={{ color: C.ink }}>{file.name}</div>
                    <div className="text-xs" style={{ color: C.sub }}>PDF ・ {file.pages}ページ ・ 2.4 MB</div>
                  </div>
                </div>
                <button onClick={() => setFile(null)} className="p-1.5 rounded hover:bg-slate-100"><X size={16} style={{ color: C.sub }} /></button>
              </div>
            )}
          </Card>
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold" style={{ color: C.ink }}>作業写真の追加<span className="font-normal text-xs ml-2" style={{ color: C.sub }}>（任意）</span></div>
              <Btn variant="outline" size="sm" icon={ImageIcon} onClick={() => setPhotos((p) => [...p, { id: p.length + 1 }])}>写真を追加</Btn>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {photos.length === 0 && <div className="col-span-6 text-xs py-4 text-center rounded border border-dashed" style={{ color: C.sub, borderColor: C.line2 }}>写真は登録されていません</div>}
              {photos.map((p) => (
                <div key={p.id} className="aspect-square rounded border flex items-center justify-center relative" style={{ borderColor: C.line, backgroundColor: C.panel }}>
                  <ImageIcon size={18} style={{ color: C.sub }} />
                  <button onClick={() => setPhotos((ps) => ps.filter((x) => x.id !== p.id))} className="absolute -top-1.5 -right-1.5 bg-white rounded-full border p-0.5" style={{ borderColor: C.line2 }}><X size={11} /></button>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <div className="text-sm font-semibold mb-3" style={{ color: C.ink }}>案件情報</div>
            <div className="text-xs rounded border px-3 py-2 space-y-1" style={{ borderColor: C.line, backgroundColor: C.panel }}>
              <div className="flex justify-between"><span style={{ color: C.sub }}>管理番号</span><span className="font-mono" style={{ color: C.navy }}>{theCase?.ctrl}</span></div>
              <div className="flex justify-between"><span style={{ color: C.sub }}>顧客名</span><span style={{ color: C.ink }}>{theCase?.customer}</span></div>
              <div className="flex justify-between"><span style={{ color: C.sub }}>担当者</span><span style={{ color: C.ink }}>{theCase?.owner || owners[0] || "—"}</span></div>
            </div>
          </Card>
          <Btn variant="primary" size="lg" icon={Cpu} disabled={!file} onClick={() => { onAudit?.("AI読み取り開始", theCase?.ctrl || "新規案件", file?.name || "—", "読み取り開始"); onStart(); }}>
            AI読み取りを開始
          </Btn>
          {!file && <div className="text-[11px] text-center" style={{ color: C.sub }}>PDFを選択すると開始できます</div>}
        </div>
      </div>
      <div className="mt-5"><ProtoNote /></div>
    </div>
  );
}

const PROC_STEPS = ["PDF読み込み", "ページ分類", "基本情報抽出", "本体仕様抽出", "作業内容抽出", "測定値抽出", "訂正箇所検出", "提出用項目への変換"];
export function Processing({ theCase, onDone }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (step >= PROC_STEPS.length) { const t = setTimeout(onDone, 700); return () => clearTimeout(t); }
    const t = setTimeout(() => setStep((s) => s + 1), 500);
    return () => clearTimeout(t);
  }, [step, onDone]);
  const pct = Math.round((Math.min(step, PROC_STEPS.length) / PROC_STEPS.length) * 100);
  return (
    <div className="mx-auto px-8 py-10" style={{ maxWidth: 820 }}>
      <Card>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: C.navy }}><Cpu size={20} className="text-white" /></div>
          <div>
            <div className="text-base font-semibold" style={{ color: C.ink }}>AIが成績書を読み取っています</div>
            <div className="text-xs font-mono" style={{ color: C.sub }}>{theCase?.ctrl} ／ {theCase?.customer}</div>
          </div>
        </div>
        <div className="my-4">
          <div className="flex justify-between text-xs mb-1.5"><span style={{ color: C.sub }}>進捗</span><span className="font-mono" style={{ color: C.navy }}>{pct}%</span></div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: C.panel2 }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: C.navy }} />
          </div>
        </div>
        <div className="space-y-1.5">
          {PROC_STEPS.map((s, i) => {
            const state = i < step ? "done" : i === step ? "run" : "wait";
            return (
              <div key={s} className="flex items-center gap-3 px-3 py-2.5 rounded" style={{ backgroundColor: state === "run" ? "#f0f5fa" : "transparent" }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: state === "done" ? "#d1fae5" : state === "run" ? C.navy : C.panel2 }}>
                  {state === "done" ? <Check size={14} style={{ color: "#059669" }} /> : state === "run" ? <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" /> : <span className="text-[11px] font-mono" style={{ color: "#94a3b8" }}>{i + 1}</span>}
                </div>
                <span className="text-sm" style={{ color: state === "wait" ? "#94a3b8" : C.ink, fontWeight: state === "run" ? 600 : 400 }}>{s}</span>
                {state === "run" && <span className="text-xs ml-auto" style={{ color: C.navy }}>処理中…</span>}
                {state === "done" && <span className="text-xs ml-auto" style={{ color: "#059669" }}>完了</span>}
              </div>
            );
          })}
        </div>
        <div className="mt-4"><ProtoNote /></div>
      </Card>
    </div>
  );
}

const REVIEW_FILTERS = ["要確認項目のみ", "全項目", "基本情報", "本体仕様", "作業内容", "測定値", "不具合・処置", "固定子コイル巻替"];
export function Review({ onNext, onAudit }) {
  // OCRは未接続のため、案件ごとに前回のダミーデータが残らないよう空の状態から始める
  const [fields, setFields] = useState([]);
  const [filter, setFilter] = useState("全項目");
  const [selId, setSelId] = useState(null);
  const shown = useMemo(() => fields.filter((f) => {
    if (filter === "全項目") return true;
    if (filter === "要確認項目のみ") return f.status === "review";
    if (filter === "不具合・処置") return f.defect;
    return f.grp === filter;
  }), [fields, filter]);
  const sel = fields.find((f) => f.id === selId);
  const reviewLeft = fields.filter((f) => f.status === "review").length;
  const setField = (id, patch) => setFields((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  return (
    <div className="mx-auto px-6 py-4" style={{ maxWidth: 1440 }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold" style={{ color: C.ink }}>読み取り結果の確認</h1>
          <span className="text-xs px-2 py-1 rounded" style={{ color: STATUS.review.fg, backgroundColor: STATUS.review.bg }}>要確認 {reviewLeft} 件</span>
        </div>
        <Btn variant="primary" icon={ArrowRight} onClick={onNext}>作業内容の確認へ</Btn>
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: "minmax(0,5fr) minmax(0,7fr)" }}>
        <Card pad={false} className="overflow-hidden">
          <div className="p-6" style={{ backgroundColor: "#e9edf1", minHeight: 400 }}>
            <div className="text-center text-sm py-16" style={{ color: "#94a3b8" }}>
              <FileText size={40} className="mx-auto mb-2" style={{ opacity: 0.5 }} />
              スキャン帳票プレビュー（モック）
            </div>
          </div>
          <div className="border-t px-3 py-2.5" style={{ borderColor: C.line, backgroundColor: C.panel }}>
            <div className="text-[11px] mb-1.5" style={{ color: C.sub }}>選択項目の認識範囲（拡大）</div>
            <div className="flex items-center gap-3">
              <div className="rounded border px-4 py-3 bg-white flex items-center justify-center" style={{ borderColor: sel ? CONF[sel.conf].ring : C.line, minWidth: 150 }}>
                <span className="text-2xl" style={{ color: "#1e40af", fontStyle: "italic", fontWeight: 700 }}>{sel?.raw || "—"}</span>
              </div>
              <div className="text-xs space-y-0.5">
                <div style={{ color: C.ink }}>{sel?.label}</div>
                {sel && <ConfPill level={sel.conf} small />}
              </div>
            </div>
          </div>
        </Card>
        <div>
          <div className="flex items-center gap-1.5 flex-wrap mb-3">
            <Filter size={14} style={{ color: C.sub }} className="mr-0.5" />
            {REVIEW_FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)} className="text-xs px-2.5 py-1 rounded border transition-colors"
                style={f === filter ? { backgroundColor: C.navy, color: "#fff", borderColor: C.navy } : { backgroundColor: "#fff", color: C.sub, borderColor: C.line2 }}>
                {f}{f === "要確認項目のみ" && reviewLeft > 0 ? ` (${reviewLeft})` : ""}
              </button>
            ))}
          </div>
          <div className="space-y-2 overflow-auto pr-1" style={{ maxHeight: 620 }}>
            {shown.map((f) => {
              const isSel = f.id === selId, isReview = f.status === "review";
              return (
                <div key={f.id} onClick={() => setSelId(f.id)} className="rounded-lg border transition-colors cursor-pointer"
                  style={{ borderColor: isSel ? C.navy : isReview ? "#f5d9a8" : C.line, backgroundColor: isReview ? "#fffdf7" : "#fff" }}>
                  <div className="px-3.5 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: C.navy, backgroundColor: C.panel2 }}>{f.grp}</span>
                          <span className="text-sm font-medium truncate" style={{ color: C.ink }}>{f.label}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <ConfPill level={f.conf} small />
                        {f.status === "confirmed" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded" style={{ color: "#047857", backgroundColor: "#d1fae5" }}><Check size={11} />確定</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded" style={{ color: STATUS.review.fg, backgroundColor: STATUS.review.bg }}><AlertTriangle size={11} />要確認</span>
                        )}
                      </div>
                    </div>
                    {isSel && (
                      <div className="mt-2.5 pt-2.5 border-t grid grid-cols-2 gap-x-4 gap-y-2 text-xs" style={{ borderColor: C.line }} onClick={(e) => e.stopPropagation()}>
                        <div><div style={{ color: C.sub }}>OCR原文</div><div className="font-medium" style={{ color: "#1e40af" }}>{f.raw}</div></div>
                        <div><div style={{ color: C.sub }}>正規化後の値 / 単位</div><div className="font-medium" style={{ color: C.ink }}>{f.norm || "—"} <span style={{ color: C.sub }}>{f.unit}</span></div></div>
                        <div><div style={{ color: C.sub }}>転記先シート</div><div style={{ color: C.ink }}>{f.sheet}</div></div>
                        <div><div style={{ color: C.sub }}>転記先項目</div><div className="font-mono text-[11px]" style={{ color: C.ink }}>{f.target}</div></div>
                        {f.reason && <div className="col-span-2 text-[11px] flex items-start gap-1 rounded px-2 py-1" style={{ color: STATUS.review.fg, backgroundColor: STATUS.review.bg }}><AlertTriangle size={11} className="mt-0.5" />{f.reason}</div>}
                        {f.candidates && (
                          <div className="col-span-2">
                            <div className="mb-1" style={{ color: C.sub }}>候補から選択</div>
                            <div className="flex gap-2">
                              {f.candidates.map((cd) => (
                                <button key={cd} onClick={() => { const before = f.norm; setField(f.id, { norm: cd, raw: cd }); if (before !== cd) onAudit?.("候補選択", f.label, before, cd); }}
                                  className="px-2.5 py-1 rounded border text-sm font-mono"
                                  style={f.norm === cd ? { borderColor: C.navy, color: C.navy, backgroundColor: "#eef2f7" } : { borderColor: C.line2, color: C.ink }}>{cd}</button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="col-span-2">
                          <div className="mb-1" style={{ color: C.sub }}>修正入力</div>
                          <input value={f.norm} onChange={(e) => setField(f.id, { norm: e.target.value })}
                            onBlur={(e) => { if (e.target.value !== f.raw) onAudit?.("項目を手修正", f.label, f.raw, e.target.value); }}
                            className="w-full text-sm rounded border px-2.5 py-1.5" style={{ borderColor: C.line2, color: C.ink }} />
                        </div>
                        <div className="col-span-2 flex items-center gap-2 pt-0.5">
                          <Btn size="sm" variant="ok" icon={Check} onClick={() => { setField(f.id, { status: "confirmed" }); onAudit?.("項目確定", f.label, "要確認", f.norm); }}>確定</Btn>
                          <Btn size="sm" variant="outline" icon={AlertTriangle} onClick={() => { setField(f.id, { status: "review" }); onAudit?.("要確認に差し戻し", f.label, "確定", "要確認"); }}>要確認に戻す</Btn>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {shown.length === 0 && (
              <div className="text-center text-sm py-12" style={{ color: C.sub }}>
                {fields.length === 0 ? (
                  <>
                    <AlertTriangle size={28} className="mx-auto mb-2" style={{ opacity: 0.4 }} />
                    <div>読み取り結果はまだありません。</div>
                    <div className="text-xs mt-1">OCRはまだ本番実装に接続されていないため、項目はここには自動で表示されません。</div>
                  </>
                ) : "該当する項目はありません"}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4"><ProtoNote /></div>
    </div>
  );
}

export function WorkContent({ onNext, onAudit }) {
  const [phraseSel, setPhraseSel] = useState({});
  // OCRは未接続のため、案件ごとに前回のダミーの不具合内容が残らないよう空から始める
  const defects = [];
  const set = (id, patch) => setPhraseSel((s) => ({ ...s, [id]: { ...s[id], ...patch } }));
  return (
    <div className="mx-auto px-8 py-5" style={{ maxWidth: 1120 }}>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-lg font-semibold" style={{ color: C.ink }}>作業内容・定型文の選択</h1>
        <Btn variant="primary" icon={ArrowRight} onClick={onNext}>測定値の確認へ</Btn>
      </div>
      <div className="flex items-start gap-1.5 text-xs mb-4 rounded px-3 py-2" style={{ color: "#475569", backgroundColor: C.panel }}>
        <Info size={13} className="mt-0.5" />
        AIは技術的な文章を新規に作成しません。手書き原文に対し、<b className="mx-1">リスト報告書に登録済みの定型文</b>から候補を提示します。
      </div>
      <div className="space-y-4">
        {defects.length === 0 && (
          <Card>
            <div className="text-center text-sm py-8" style={{ color: C.sub }}>
              <AlertTriangle size={28} className="mx-auto mb-2" style={{ opacity: 0.4 }} />
              <div>不具合・処置の抽出結果はまだありません。</div>
              <div className="text-xs mt-1">OCRはまだ本番実装に接続されていないため、項目はここには自動で表示されません。</div>
            </div>
          </Card>
        )}
        {defects.map((f) => {
          const p = PHRASES[f.id];
          const cur = phraseSel[f.id] || { mode: "dict", symptom: p.symptomPick, treat: p.treatPick, custom: "" };
          return (
            <Card key={f.id}>
              <div className="grid gap-5" style={{ gridTemplateColumns: "minmax(0,4fr) minmax(0,6fr)" }}>
                <div>
                  <div className="text-xs mb-1" style={{ color: C.sub }}>手書き原文</div>
                  <div className="rounded border px-3 py-2.5 text-[15px] mb-3" style={{ borderColor: C.line2, color: "#1e40af", fontStyle: "italic", backgroundColor: "#fafbfc" }}>{f.raw}</div>
                  <div className="text-xs mb-1" style={{ color: C.sub }}>作業内容のチェック結果</div>
                  <div className="text-sm mb-3" style={{ color: C.ink }}>{p.check}</div>
                </div>
                <div className="border-l pl-5" style={{ borderColor: C.line }}>
                  <div className="flex items-center gap-4 mb-3">
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: C.ink }}>
                      <input type="radio" checked={cur.mode === "dict"} onChange={() => set(f.id, { mode: "dict" })} />リスト報告書の定型文を使用
                    </label>
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: C.ink }}>
                      <input type="radio" checked={cur.mode === "raw"} onChange={() => set(f.id, { mode: "raw" })} />原文を使用
                    </label>
                  </div>
                  {cur.mode === "dict" ? (
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs mb-1" style={{ color: C.sub }}>症状・箇所（候補）</div>
                        <div className="flex flex-wrap gap-1.5">
                          {p.symptomCands.map((s) => (
                            <button key={s} onClick={() => set(f.id, { symptom: s })} className="text-xs px-2.5 py-1.5 rounded border text-left"
                              style={cur.symptom === s ? { borderColor: C.navy, backgroundColor: "#eef2f7", color: C.navy } : { borderColor: C.line2, color: C.ink }}>{s}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs mb-1" style={{ color: C.sub }}>処置内容（候補）</div>
                        <div className="flex flex-wrap gap-1.5">
                          {p.treatCands.map((s) => (
                            <button key={s} onClick={() => set(f.id, { treat: s })} className="text-xs px-2.5 py-1.5 rounded border text-left"
                              style={cur.treat === s ? { borderColor: C.navy, backgroundColor: "#eef2f7", color: C.navy } : { borderColor: C.line2, color: C.ink }}>{s}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm rounded border px-3 py-2" style={{ borderColor: C.line2, color: C.ink, backgroundColor: "#fafbfc" }}>{f.raw}</div>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs rounded px-2 py-1" style={{ color: C.navy, backgroundColor: C.panel2 }}>
                      特記事項へ転記：<b>{cur.custom || (cur.mode === "raw" ? f.raw : `${cur.symptom} → ${cur.treat}`)}</b>
                    </div>
                    <Btn size="sm" variant="ok" icon={Check} onClick={() => onAudit?.("特記事項確定", f.label, f.raw, cur.custom || (cur.mode === "raw" ? f.raw : `${cur.symptom} → ${cur.treat}`))}>この内容で確定</Btn>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <div className="mt-4"><ProtoNote /></div>
    </div>
  );
}

export function Measurements({ onNext, onAudit }) {
  const [measSel, setMeasSel] = useState({});
  const flagStyle = (flag) => (flag === "low" ? { backgroundColor: "#fef2f2" } : flag === "mid" ? { backgroundColor: "#fffaf0" } : {});
  // OCRは未接続のため、案件ごとに前回のダミー測定値が残らないよう空から始める
  const meas = [];
  return (
    <div className="mx-auto px-8 py-5" style={{ maxWidth: 1440 }}>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-semibold" style={{ color: C.ink }}>測定値の確認</h1>
        <Btn variant="primary" icon={ArrowRight} onClick={onNext}>提出プレビューへ</Btn>
      </div>
      {meas.length === 0 && (
        <Card>
          <div className="text-center text-sm py-8" style={{ color: C.sub }}>
            <AlertTriangle size={28} className="mx-auto mb-2" style={{ opacity: 0.4 }} />
            <div>測定値の抽出結果はまだありません。</div>
            <div className="text-xs mt-1">OCRはまだ本番実装に接続されていないため、項目はここには自動で表示されません。</div>
          </div>
        </Card>
      )}
      <div className="grid grid-cols-2 gap-4">
        {meas.map((tbl) => (
          <Card key={tbl.key} pad={false}>
            <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: C.line, backgroundColor: C.panel }}>
              <Ruler size={14} style={{ color: C.navy }} /><span className="text-sm font-semibold" style={{ color: C.ink }}>{tbl.title}</span>
            </div>
            <table className="w-full text-xs">
              <thead><tr style={{ color: C.sub }}><th className="text-left px-3 py-1.5 font-medium">項目</th>{tbl.cols.map((c) => <th key={c} className="text-right px-3 py-1.5 font-medium">{MEAS_COL_LABEL[c]}</th>)}</tr></thead>
              <tbody>
                {tbl.rows.map((r, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: C.line, ...flagStyle(r.flag) }}>
                    <td className="px-3 py-1.5" style={{ color: C.ink }}>{r.name}</td>
                    {tbl.cols.map((c) => {
                      if (c === "conf") return <td key={c} className="px-3 py-1.5 text-right"><ConfPill level={r.conf} small /></td>;
                      if (c === "judge") return <td key={c} className="px-3 py-1.5 text-right font-medium" style={{ color: (r.judge || "").includes("否") ? "#b45309" : r.judge === "良" ? "#047857" : C.ink }}>{r.judge || "—"}</td>;
                      if (c === "treat") return <td key={c} className="px-3 py-1.5 text-right" style={{ color: C.navy }}>{r.treat || "—"}</td>;
                      const v = r[c];
                      return <td key={c} className="px-3 py-1.5 text-right font-mono" style={{ color: v == null ? "#cbd5e1" : C.ink }}>{v == null ? "—" : v}</td>;
                    })}
                  </tr>
                ))}
                {tbl.rows.filter((r) => r.cands).map((r, i) => (
                  <tr key={"c" + i} className="border-t" style={{ borderColor: C.line, backgroundColor: "#fef2f2" }}>
                    <td colSpan={tbl.cols.length + 1} className="px-3 py-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <AlertTriangle size={12} style={{ color: "#b91c1c" }} />
                        <span style={{ color: "#b91c1c" }}>{r.name}：{r.reason}</span>
                        <span style={{ color: C.sub }}>候補</span>
                        {r.cands.map((cd) => (
                          <button key={cd} onClick={() => { setMeasSel((s) => ({ ...s, [tbl.key + r.name]: cd })); onAudit?.("測定値候補選択", `${tbl.title} / ${r.name}`, r.reason, cd); }}
                            className="px-2 py-0.5 rounded border font-mono"
                            style={measSel[tbl.key + r.name] === cd ? { borderColor: C.navy, backgroundColor: "#eef2f7", color: C.navy } : { borderColor: C.line2, color: C.ink }}>{cd} {r.unit}</button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ))}
      </div>
      <div className="mt-4"><ProtoNote /></div>
    </div>
  );
}

export function Preview({ theCase, onNext, onAudit }) {
  // OCRは未接続のため、案件の実データ（顧客名・管理番号・担当者）以外は
  // 前回のダミー値を出さず空欄から始める。値は下の欄で自由に入力できます。
  const [previewData, setPreviewData] = useState({
    customer: theCase?.customer || "", completeDate: "", ctrl: theCase?.ctrl || "", owner: theCase?.owner || "",
    output: "", voltage: "", pole: "", note1: "", note2: "",
  });
  const focusValues = useRef({});
  const rows = [{ id: "customer", label: "顧客名" }, { id: "completeDate", label: "作業完了日" }, { id: "ctrl", label: "管理No" }, { id: "owner", label: "担当者" },
    { id: "output", label: "出力" }, { id: "voltage", label: "電圧" }, { id: "pole", label: "極数" }, { id: "note1", label: "特記事項①", long: true }, { id: "note2", label: "特記事項②", long: true }];
  const update = (id, v) => setPreviewData((d) => ({ ...d, [id]: v }));
  const onFocus = (id) => { focusValues.current[id] = previewData[id] || ""; };
  const onBlur = (id) => {
    const before = focusValues.current[id], after = previewData[id] || "";
    if (before !== undefined && before !== after) onAudit?.("提出用プレビュー編集", `${theCase?.ctrl || "新規案件"} / ${id}`, before, after);
  };
  return (
    <div className="mx-auto px-8 py-5" style={{ maxWidth: 1000 }}>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-semibold" style={{ color: C.ink }}>提出用プレビュー</h1>
        <Btn variant="primary" icon={FileText} onClick={() => { onAudit?.("帳票生成", theCase?.ctrl || "案件", "—", "Excel/PDF生成"); onNext(); }}>Excel・PDFを生成</Btn>
      </div>
      <Card>
        <div className="mx-auto bg-white shadow-sm" style={{ maxWidth: 640, border: "1px solid #cfd6dd" }}>
          <div className="text-center py-3 border-b" style={{ borderColor: "#cfd6dd", backgroundColor: "#f3f5f7" }}>
            <div className="text-base font-semibold tracking-widest" style={{ color: "#1f2937" }}>整 備 報 告 書</div>
          </div>
          {rows.map((r) => (
            <div key={r.id} className="flex border-b" style={{ borderColor: "#d9dee4" }}>
              <div className="w-32 px-2 py-1.5 text-[11px] border-r shrink-0" style={{ borderColor: "#d9dee4", backgroundColor: "#f6f8fa", color: "#64748b" }}>{r.label}</div>
              <div className="flex-1 px-2 py-1.5 text-[13px]">
                {r.long ? (
                  <textarea value={previewData[r.id] || ""} rows={2} onChange={(e) => update(r.id, e.target.value)} onFocus={() => onFocus(r.id)} onBlur={() => onBlur(r.id)} className="w-full bg-transparent outline-none" />
                ) : (
                  <input value={previewData[r.id] || ""} onChange={(e) => update(r.id, e.target.value)} onFocus={() => onFocus(r.id)} onBlur={() => onBlur(r.id)} className="w-full bg-transparent outline-none" />
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
      <div className="mt-4"><ProtoNote /></div>
    </div>
  );
}

export function Done({ theCase, onHome }) {
  return (
    <div className="mx-auto px-8 py-10" style={{ maxWidth: 820 }}>
      <Card>
        <div className="text-center py-2">
          <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-3" style={{ backgroundColor: "#d1fae5" }}><CheckCircle2 size={30} style={{ color: "#059669" }} /></div>
          <div className="text-lg font-semibold" style={{ color: C.ink }}>ファイルを生成しました</div>
          <div className="text-xs font-mono mt-1" style={{ color: C.sub }}>{theCase?.ctrl} ／ {theCase?.customer}</div>
        </div>
        <div className="grid grid-cols-2 gap-3 my-5">
          {[
            { icon: FileSpreadsheet, c: "#1e7d45", bg: "#e4efe6", t: "Excel作成完了", s: `${theCase?.ctrl}_整備報告書.xlsx` },
            { icon: FileText, c: "#c0392b", bg: "#fde8e8", t: "PDF作成完了", s: `${theCase?.ctrl}_整備報告書.pdf` },
          ].map((x, i) => (
            <div key={i} className="rounded-lg border px-4 py-3.5" style={{ borderColor: C.line }}>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-9 h-9 rounded flex items-center justify-center" style={{ backgroundColor: x.bg }}><x.icon size={18} style={{ color: x.c }} /></div>
                <div>
                  <div className="text-sm font-medium" style={{ color: C.ink }}>{x.t}</div>
                  <div className="inline-flex items-center gap-1 text-[11px]" style={{ color: "#059669" }}><Check size={11} />完了</div>
                </div>
              </div>
              <div className="text-[11px] font-mono mb-2.5 truncate" style={{ color: C.sub }}>{x.s}</div>
              <Btn size="sm" variant="outline" icon={ExternalLink} disabled>開く（未接続）</Btn>
            </div>
          ))}
        </div>
        <div className="rounded-lg border px-4 py-3 mb-5 flex items-center justify-between gap-2" style={{ borderColor: C.line, backgroundColor: C.panel }}>
          <div className="text-[13px] font-mono truncate" style={{ color: C.ink }}>¥¥amaden-nas¥整備報告書¥2026¥{theCase?.ctrl}¥</div>
          <Btn size="sm" variant="outline" icon={FolderOpen} disabled>フォルダを開く（未接続）</Btn>
        </div>
        <div className="flex justify-center"><Btn variant="primary" size="lg" icon={ChevronLeft} onClick={onHome}>案件一覧へ戻る</Btn></div>
        <div className="mt-5"><ProtoNote /></div>
      </Card>
    </div>
  );
}
