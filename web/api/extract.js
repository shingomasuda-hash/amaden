// Vercel Serverless Function（Node.js runtime）
// 手書きの「分解整備成績書」PDFを Claude(Anthropic API) に読み取らせ、
// 確認画面（Review／作業内容／測定値）で使える構造化データに変換する。
import Anthropic from "@anthropic-ai/sdk";

export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
};

const MODEL = "claude-sonnet-5";

// 参考価格（USD / 100万トークン）。実際の請求額と若干ズレる可能性があるため、
// 正確な金額は https://www.anthropic.com/pricing または console.anthropic.com の使用状況を参照してください。
const PRICE_PER_MTOK_USD = { input: 3, output: 15 };
const usdToJpyEstimate = (usd) => usd * 155; // 概算レート。正確な換算ではありません。

const estimateCost = (usage) => {
  const inputTok = (usage?.input_tokens || 0) + (usage?.cache_creation_input_tokens || 0) + (usage?.cache_read_input_tokens || 0);
  const outputTok = usage?.output_tokens || 0;
  const usd = (inputTok / 1_000_000) * PRICE_PER_MTOK_USD.input + (outputTok / 1_000_000) * PRICE_PER_MTOK_USD.output;
  return { usd, jpyEstimate: usdToJpyEstimate(usd), inputTok, outputTok };
};

const EXTRACT_TOOL = {
  name: "submit_extraction",
  description: "分解整備成績書（手書きPDF）から読み取った内容を構造化して提出する",
  input_schema: {
    type: "object",
    properties: {
      fields: {
        type: "array",
        description: "確認画面に一覧表示する項目。基本情報・本体仕様・固定子コイル巻替など、書面に書かれているものはできる限り拾う。",
        items: {
          type: "object",
          properties: {
            grp: { type: "string", description: "グループ名（例: 基本情報／本体仕様／固定子コイル巻替）" },
            label: { type: "string", description: "項目名（例: 顧客名／出力／機番）" },
            raw: { type: "string", description: "手書き原文をそのまま（読めた通りに）" },
            norm: { type: "string", description: "正規化した値（単位を除いた数値や、整形済みの文字列）" },
            unit: { type: "string", description: "単位（kW・V・A・mm など）。無ければ空文字" },
            conf: { type: "string", enum: ["high", "mid", "low"], description: "読み取りの自信度" },
            reason: { type: "string", description: "conf が mid/low の場合、判読しづらい理由を一言" },
          },
          required: ["grp", "label", "raw", "norm", "conf"],
        },
      },
      defects: {
        type: "array",
        description: "不具合・処置の記載（特記事項欄など）。無ければ空配列。",
        items: {
          type: "object",
          properties: {
            label: { type: "string", description: "見出し（例: 不良個所① ローター軸(D)）" },
            raw: { type: "string", description: "手書き原文" },
          },
          required: ["label", "raw"],
        },
      },
      measurements: {
        type: "array",
        description: "測定値の各行。巻線抵抗値・絶縁抵抗値・軸ブレ・シャフト寸法・ブラケット寸法・回転試験・温度試験・振動試験などを想定。",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "測定区分（例: 巻線抵抗値）" },
            item: { type: "string", description: "行の名称（例: 220V U-V）" },
            mgmt: { type: "string", description: "管理値。無ければ空文字" },
            before: { type: "string", description: "整備前 or 受入時の値。無ければ空文字" },
            after: { type: "string", description: "整備後の値。無ければ空文字" },
            unit: { type: "string" },
            judge: { type: "string", description: "判定（良／可／否 など）。手書きの記入をそのまま。無ければ空文字" },
            conf: { type: "string", enum: ["high", "mid", "low"] },
          },
          required: ["title", "item", "conf"],
        },
      },
    },
    required: ["fields", "defects", "measurements"],
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "method not allowed" }); return; }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: "サーバーにANTHROPIC_API_KEYが設定されていません。Vercelの環境変数を確認してください。" });
    return;
  }

  const { pdfBase64, customer, ctrl } = req.body || {};
  if (!pdfBase64) { res.status(400).json({ error: "pdfBase64 is required" }); return; }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: [
        "あなたはモーター整備工場の「分解整備成績書」（手書きPDF）を読み取り、社内の整備報告書作成システム向けに構造化するアシスタントです。",
        "手書き文字は丁寧に読み取ってください。自信が持てない箇所は正直に conf を \"mid\" または \"low\" にし、reason に理由を書いてください。",
        "存在しない情報を作り出さないでください。読めない・書かれていない項目は無理に埋めず、そもそも項目自体を出力しないか raw を空にしてください。",
        `参考情報（分かっていれば）: 顧客名=${customer || "不明"}, 管理番号=${ctrl || "不明"}`,
      ].join("\n"),
      tools: [EXTRACT_TOOL],
      tool_choice: { type: "tool", name: "submit_extraction" },
      messages: [
        {
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
            { type: "text", text: "この分解整備成績書PDFの内容を読み取り、submit_extraction ツールで結果を提出してください。" },
          ],
        },
      ],
    });

    const toolUse = msg.content.find((b) => b.type === "tool_use");
    if (!toolUse) { res.status(502).json({ error: "モデルが構造化データを返しませんでした。もう一度お試しください。" }); return; }
    const cost = estimateCost(msg.usage);
    res.status(200).json({ result: toolUse.input, cost, model: MODEL });
  } catch (e) {
    res.status(500).json({ error: e?.message || "読み取りに失敗しました" });
  }
}
