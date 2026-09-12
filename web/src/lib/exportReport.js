// 提出用プレビューの内容から、実際にダウンロードできるExcel(.xlsx)・PDFファイルを生成する。
// Excel: 会社の実際の整備報告書テンプレート(api/assets/report-template.xlsx)へ、サーバー側
//        (/api/generate-report、exceljs使用)で値を書き込んだものをそのままダウンロードする。
// PDF: プレビューのDOMをそのまま画像化してPDFに貼り込む（日本語フォントの埋め込みが不要で、
//      画面表示と完全に同じ見た目になる）。
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// previewData（顧客名・作業完了日など）・結果確認(reviewFields)・作業内容(workRows)・測定値(measRows)を
// サーバーへ送り、実テンプレートに書き込まれたxlsxファイルを受け取ってダウンロードする。
export async function exportReportExcel(previewData, ctrl, reviewFields, workRows, measRows) {
  const res = await fetch("/api/generate-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ctrl,
      customer: previewData?.customer || "",
      caseDate: previewData?.completeDate || "",
      reviewFields: reviewFields || [],
      defects: workRows || [],
      measurements: measRows || [],
    }),
  });

  if (!res.ok) {
    let msg = `帳票の生成に失敗しました（${res.status}）`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch { /* JSON以外のエラー応答は無視してデフォルトメッセージを使う */ }
    throw new Error(msg);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${ctrl || "整備報告書"}_整備報告書.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
