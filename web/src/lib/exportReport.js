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

export function exportReportExcel(previewData, ctrl) {
  const rows = [["整備報告書"], []];
  REPORT_ROWS.forEach((r) => rows.push([r.label, previewData?.[r.id] || ""]));
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 14 }, { wch: 60 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "整備報告書");
  XLSX.writeFile(wb, `${ctrl || "整備報告書"}_整備報告書.xlsx`);
}

export async function exportReportPdf(reportEl, ctrl) {
  if (!reportEl) throw new Error("プレビュー要素が見つかりません");
  const canvas = await html2canvas(reportEl, { scale: 2, backgroundColor: "#ffffff" });
  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const imgWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = margin;
  pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
  heightLeft -= pageHeight - margin * 2;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight + margin;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;
  }

  pdf.save(`${ctrl || "整備報告書"}_整備報告書.pdf`);
}
