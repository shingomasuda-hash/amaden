import { useEffect } from "react";
import { C, STATUS, CONF } from "../lib/theme";
import { Info } from "../lib/icons";

export function Btn({ children, onClick, variant = "primary", size = "md", icon: Icon, disabled, type = "button" }) {
  const base = "inline-flex items-center justify-center gap-2 font-medium rounded transition-colors select-none";
  const sz = size === "sm" ? "text-xs px-2.5 py-1.5" : size === "lg" ? "text-sm px-5 py-2.5" : "text-sm px-3.5 py-2";
  const styles = {
    primary: { className: "text-white", style: { backgroundColor: disabled ? "#94a3b8" : C.navy } },
    dark: { className: "text-white", style: { backgroundColor: C.navyDark } },
    outline: { className: "border", style: { color: C.navy, borderColor: C.line2, backgroundColor: "#fff" } },
    ghost: { className: "", style: { color: C.sub } },
    danger: { className: "text-white", style: { backgroundColor: disabled ? "#fca5a5" : "#dc2626" } },
    ok: { className: "text-white", style: { backgroundColor: "#059669" } },
  }[variant];
  return (
    <button type={type} onClick={disabled ? undefined : onClick} disabled={disabled}
      className={`${base} ${sz} ${styles.className} ${disabled ? "cursor-not-allowed opacity-90" : "hover:opacity-90"}`}
      style={styles.style}>
      {Icon && <Icon size={size === "sm" ? 14 : 16} />}{children}
    </button>
  );
}

export function StatusBadge({ s }) {
  const st = STATUS[s];
  if (!st) return null;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium"
      style={{ color: st.fg, backgroundColor: st.bg }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.dot }} />{st.label}
    </span>
  );
}

export function ConfPill({ level, small }) {
  const c = CONF[level];
  if (!c) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded font-medium ${small ? "text-[11px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"}`}
      style={{ color: c.fg, backgroundColor: c.bg }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.ring }} />{c.label}
    </span>
  );
}

export function Card({ children, className = "", pad = true, style = {} }) {
  return <div className={`bg-white rounded-lg border ${pad ? "p-5" : ""} ${className}`} style={{ borderColor: C.line, ...style }}>{children}</div>;
}

export function Stat({ label, value, tone }) {
  const st = tone ? STATUS[tone] : null;
  return (
    <div className="bg-white rounded-lg border px-4 py-3.5" style={{ borderColor: C.line }}>
      <div className="text-xs mb-1" style={{ color: C.sub }}>{label}</div>
      <div className="flex items-end gap-2">
        <div className="text-2xl font-semibold" style={{ color: st ? st.fg : C.ink, fontVariantNumeric: "tabular-nums" }}>{value}</div>
        <div className="text-xs mb-1" style={{ color: C.sub }}>件</div>
      </div>
    </div>
  );
}

export function ProtoNote({ inline, children }) {
  return (
    <div className={`flex items-start gap-1.5 text-[11px] leading-snug ${inline ? "" : "px-3 py-1.5 rounded border"}`}
      style={inline ? { color: "#94a3b8" } : { color: "#92826a", backgroundColor: "#fdf7ec", borderColor: "#f0e2c4" }}>
      <Info size={12} className="mt-0.5 shrink-0" />
      <span>{children || "OCR、Excel出力、PDF生成、フォルダ保存は未接続のモックです。アカウント・案件・チャットはFirestoreに保存され、社内スタッフ間でリアルタイムに共有されます。"}</span>
    </div>
  );
}

export function Toast({ msg, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2600);
    return () => clearTimeout(t);
  }, [msg, onClose]);
  if (!msg) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-2 text-white text-sm px-4 py-2.5 rounded shadow-lg" style={{ backgroundColor: C.navyDark }}>
        <Info size={15} />{msg}
      </div>
    </div>
  );
}
