/* デザイントークン（濃紺・白・グレー中心／過度な装飾なし） */
export const C = {
  navy: "#16324f",
  navyDark: "#0f2740",
  ink: "#1f2937",
  sub: "#64748b",
  line: "#e2e8f0",
  line2: "#cbd5e1",
  surface: "#ffffff",
  panel: "#f5f7fa",
  panel2: "#eef2f7",
};

export const STATUS = {
  review: { label: "確認待ち", fg: "#b45309", bg: "#fef3c7", dot: "#d97706" },
  process: { label: "処理中", fg: "#1d4ed8", bg: "#dbeafe", dot: "#2563eb" },
  done: { label: "完了", fg: "#047857", bg: "#d1fae5", dot: "#059669" },
  error: { label: "エラー", fg: "#b91c1c", bg: "#fee2e2", dot: "#dc2626" },
};

export const CONF = {
  high: { label: "高信頼", fg: "#047857", bg: "#d1fae5", ring: "#10b981" },
  mid: { label: "確認推奨", fg: "#b45309", bg: "#fef3c7", ring: "#f59e0b" },
  low: { label: "読取不能/候補", fg: "#b91c1c", bg: "#fee2e2", ring: "#ef4444" },
  na: { label: "未記入/対象外", fg: "#64748b", bg: "#f1f5f9", ring: "#94a3b8" },
};

export const nowText = () => new Date().toISOString();

// Firestore の Timestamp（.toDate()を持つ）とISO文字列の両方を受け付ける
export const fmtAt = (value) => {
  if (!value) return "";
  const d = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
