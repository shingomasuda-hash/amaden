// 提出用プレビューの内容から、実際にダウンロードできるExcel(.xlsx)・PDFファイルを生成する。
// Excel: SheetJS(xlsx) でプログラム的にシートを組み立てて書き出す（外部ファイルの読み込みは行わない）。
// PDF: プレビューのDOMをそのまま画像化してPDFに貼り込む（日本語フォントの埋め込みが不要で、
//      画面表示と完全に同じ見た目になる）。
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const REPORT_ROWS = [
  { id: "customer", label: "顧客名" },
  { id: "completeDate", label: "作業完了日" },
  { id: "ctrl", label: "管理No" },
  { id: "owner", label: "担当者" },
  { id: "output", label: "出力" },
  { id: "voltage", label: "電圧" },
  { id: "pole", label: "極数" },
  { id: "note1", label: "特記事項①" },
  { id: "note2", label: "特記事項②" },
];

// previewData（基本情報）に加え、結果確認(reviewFields)・作業内容(workRows)・測定値(measRows)の
// 全件をそれぞれ別シートに書き出す（該当データが無いシートは省略）。
export function exportReportExcel(previewData, ctrl, reviewFields, workRows, measRows) {
  const wb = XLSX.utils.book_new();

  const headRows = [["整備報告書"], []];
  REPORT_ROWS.forEach((r) => headRows.push([r.label, previewData?.[r.id] || ""]));
  const wsHead = XLSX.utils.aoa_to_sheet(headRows);
  wsHead["!cols"] = [{ wch: 14 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsHead, "整備報告書");

  if (reviewFields?.length) {
    const rows = [["グループ", "項目", "値", "単位"]];
    reviewFields.forEach((f) => rows.push([f.grp || "", f.label || "", f.norm || f.raw || "", f.unit || ""]));
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 16 }, { wch: 22 }, { wch: 30 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, "確認済み項目");
  }

  if (workRows?.length) {
    const rows = [["項目", "特記事項"]];
    workRows.forEach((r) => rows.push([r.label || "", r.note || ""]));
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 22 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, ws, "作業内容");
  }

  if (measRows?.length) {
    const rows = [["区分", "項目", "管理値", "整備前", "整備後", "単位", "判定"]];
    measRows.forEach((r) => rows.push([r.title || "", r.item || "", r.mgmt || "", r.before || "", r.after || "", r.unit || "", r.judge || ""]));
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 18 }, { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, ws, "測定値");
  }

  XLSX.writeFile(wb, `${ctrl || "整備報告書"}_整備報告書.xlsx`);
}

export async function exportReportPdf(reportEl, ctrl) {
  if (!reportEl) throw new Error("プレビュー要素が見つかりません");
  const canvas = await html2canvas(reportEl, { scale: 2, backgroundColor: "#ffffff" });

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidthMm = pageWidth - margin * 2;
  const contentHeightMm = pageHeight - margin * 2;

  // canvas上のpx ⇔ PDF上のmm の換算比（幅基準）
  const pxPerMm = canvas.width / contentWidthMm;
  const pageHeightPx = Math.max(1, Math.floor(contentHeightMm * pxPerMm)); // 1ページ分に収まるcanvas上の高さ(px)

  // 元画像を、ページに収まる高さごとに別々のcanvasへ完全に切り出してから貼り付ける。
  // jsPDFの座標をずらして重ねて描く方式(addImageを毎ページ同じ画像で位置だけ変える)は、
  // ページ境界の余白をjsPDFがクリップしてくれない場合があり、前後のページで内容が
  // 重複して表示される不具合があったため、この方式に変更した。
  let renderedPx = 0;
  let first = true;
  while (renderedPx < canvas.height) {
    const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedPx);
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeightPx;
    const ctx = sliceCanvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

    if (!first) pdf.addPage();
    pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", margin, margin, contentWidthMm, sliceHeightPx / pxPerMm);
    first = false;
    renderedPx += sliceHeightPx;
  }

  pdf.save(`${ctrl || "整備報告書"}_整備報告書.pdf`);
}
