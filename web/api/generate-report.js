// Vercel Serverless Function（Node.js runtime）
// 実際の会社の整備報告書テンプレート（api/assets/report-template.xlsx）を読み込み、
// AIの読み取り結果・確認済みの内容を該当セルへ書き込んで、そのままダウンロードできるxlsxを返す。
import ExcelJS from "exceljs";
import { fileURLToPath } from "url";
import path from "path";
import { SHEET_NAME_AC, COVER, SPEC_CELLS, NOTE_CELLS, MEASUREMENT_TABLES } from "./lib/reportMapping.js";

export const config = {
  api: { bodyParser: { sizeLimit: "5mb" } },
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(__dirname, "assets", "report-template.xlsx");

const includesAll = (text, keywords) => keywords.every((k) => text.includes(k));
const includesAny = (text, keywords) => keywords.some((k) => text.includes(k));

// 作業完了日は画面上フリーテキスト入力のため、"2026/6/11"「2026-06-11」「2026年6月11日」など
// 表記ゆれを吸収できるよう、Date.parseに頼らず年月日の数字だけを正規表現で拾う。
const parseDateParts = (s) => {
  if (!s) return null;
  const m = String(s).match(/(\d{4})\s*[/\-年]\s*(\d{1,2})\s*[/\-月]\s*(\d{1,2})/);
  if (!m) return null;
  return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
};

// 確認済み項目・作業内容・測定値を、テンプレートの該当セルへ書き込む（表紙情報は呼び出し側で別途処理する）
function fillWorkbook(ws, { reviewFields, defects, measurements }) {
  const setCell = (addr, value) => {
    if (value === undefined || value === null || value === "") return;
    ws.getCell(addr).value = value;
  };

  // 本体仕様
  (reviewFields || []).forEach((f) => {
    const label = f.label || "";
    for (const spec of SPEC_CELLS) {
      if (!includesAny(label, spec.keywords)) continue;
      if (spec.excludeKeywords && includesAny(label, spec.excludeKeywords)) continue;
      setCell(spec.cell, f.norm || f.raw || "");
      break;
    }
  });

  // 特記事項（不具合・処置の各行を上から※1,※2...へ）
  (defects || []).slice(0, NOTE_CELLS.length).forEach((d, i) => {
    setCell(NOTE_CELLS[i], `${d.label ? d.label + "：" : ""}${d.note || d.raw || ""}`);
  });

  // 測定値
  (measurements || []).forEach((m) => {
    const title = m.title || "";
    const item = m.item || "";
    const table = MEASUREMENT_TABLES.find((t) => includesAny(title, t.titleKeywords));
    if (!table) return;

    if (table.mode === "before_after") {
      const row = table.rows.find((r) => includesAll(item, r.itemKeywords || []) && !(r.excludeKeywords && includesAny(item, r.excludeKeywords)));
      if (!row) return;
      if (m.before) setCell(row.cells.before, m.before);
      if (m.after) setCell(row.cells.after, m.after);
      return;
    }

    if (table.mode === "single") {
      const row = table.rows.find((r) => includesAll(item, r.itemKeywords || []) && !(r.excludeKeywords && includesAny(item, r.excludeKeywords)));
      if (!row) return;
      setCell(row.cell, m.before || m.after || m.mgmt || "");
      return;
    }

    if (table.mode === "temperature") {
      // "10分"に"0分"が部分文字列として含まれてしまう(includesだと"0分"に誤マッチする)ため、
      // 数字部分を正規表現で厳密に取り出してから時間キーと突き合わせる。
      const timeNum = item.match(/(\d+)\s*分/);
      const timeMatch = timeNum && Object.prototype.hasOwnProperty.call(table.timeRows, timeNum[1]) ? timeNum[1] : null;
      const col = table.columns.find((c) => includesAny(item, c.keywords) && !(c.excludeKeywords && includesAny(item, c.excludeKeywords)));
      if (!col) return;
      const row = col.onlyFirstRow ? 298 : (timeMatch ? table.timeRows[timeMatch] : null);
      if (!row) return;
      setCell(`${col.col}${row}`, m.before || m.after || m.mgmt || "");
      return;
    }

    if (table.mode === "vibration") {
      const typeMatch = Object.keys(table.typeRows).find((t) => item.toUpperCase().includes(t));
      // keywordsは[箇所, 方向]の組で、両方そろって初めてその列だと判定する(includesAnyだと
      // 「反負荷側」に部分文字列として含まれる「負荷側」だけで誤マッチしていた)。
      const col = table.columns.find((c) => includesAll(item, c.keywords) && !(c.excludeKeywords && includesAny(item, c.excludeKeywords)));
      if (!typeMatch || !col) return;
      setCell(`${col.col}${table.typeRows[typeMatch]}`, m.before || m.after || m.mgmt || "");
      return;
    }
  });
}

// テスト用に内部関数もエクスポートしておく（Vercelはdefault exportのみをハンドラとして扱うため無害）
export { fillWorkbook, parseDateParts };

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "method not allowed" }); return; }

  const { ctrl, customer, caseDate, reviewFields, defects, measurements } = req.body || {};

  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(TEMPLATE_PATH);

    const cover = wb.getWorksheet("表紙");
    if (cover) {
      if (customer) cover.getCell(COVER.customer).value = customer;
      if (customer) cover.getCell(COVER.title).value = customer;
      if (ctrl) {
        const m = /^(\d+)MT(\d+)$/i.exec(ctrl);
        if (m) {
          cover.getCell(COVER.refYear).value = m[1];
          cover.getCell(COVER.refNo).value = m[2];
        }
      }
      const dp = parseDateParts(caseDate);
      if (dp) {
        cover.getCell(COVER.year).value = dp.y;
        cover.getCell(COVER.month).value = dp.mo;
        cover.getCell(COVER.day).value = dp.d;
      }
    }

    const wsAc = wb.getWorksheet(SHEET_NAME_AC);
    if (wsAc) fillWorkbook(wsAc, { reviewFields, defects, measurements });

    const buffer = await wb.xlsx.writeBuffer();
    const filename = `${ctrl || "整備報告書"}_整備報告書.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    // HTTPヘッダーには日本語などの非ASCII文字をそのまま入れられない(Node側でERR_INVALID_CHARになる)ため、
    // RFC 5987のfilename*でパーセントエンコードして渡す（fallback用のfilenameはASCIIの固定名にする）。
    res.setHeader("Content-Disposition", `attachment; filename="report.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.status(200).send(Buffer.from(buffer));
  } catch (e) {
    console.error("[generate-report] エラー:", e);
    res.status(500).json({ error: e?.message || "帳票の生成に失敗しました" });
  }
}
