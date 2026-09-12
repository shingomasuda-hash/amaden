// アップロードしたPDFをVercelのサーバーレス関数(/api/extract)へ送り、
// Claudeによる読み取り結果を受け取る。

const MAX_BYTES = 8 * 1024 * 1024; // 8MB。大きすぎるとサーバーレス関数のリクエスト上限に引っかかる可能性があるため事前にガードする

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      // "data:application/pdf;base64,xxxx" の "xxxx" だけを取り出す
      const base64 = typeof result === "string" ? result.split(",")[1] : "";
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"));
    reader.readAsDataURL(file);
  });

export async function extractCase(file, { customer, ctrl } = {}) {
  if (!file) throw new Error("ファイルが選択されていません");
  if (file.size > MAX_BYTES) {
    throw new Error(`PDFのサイズが大きすぎます（${(file.size / 1024 / 1024).toFixed(1)}MB）。${MAX_BYTES / 1024 / 1024}MB以下のファイルをお試しください。`);
  }
  const pdfBase64 = await fileToBase64(file);

  const res = await fetch("/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pdfBase64, customer, ctrl }),
  });

  let body;
  try { body = await res.json(); } catch { body = null; }

  if (!res.ok) {
    throw new Error(body?.error || `読み取りに失敗しました（${res.status}）`);
  }
  // result: { fields: [...], defects: [...], measurements: [...] }
  // cost: { usd, jpyEstimate, inputTok, outputTok }（概算）
  // truncated: true の場合、出力上限に達し内容が途中までしか読み取れていない可能性がある
  // warnings: { defectsEmpty, measurementsEmpty } — 0件だった場合の注意フラグ（記載が無い場合もあるためエラーにはしない）
  return { result: body.result, cost: body.cost, model: body.model, truncated: !!body.truncated, warnings: body.warnings || {} };
}
