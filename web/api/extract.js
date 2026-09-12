// Vercel Serverless Function（Node.js runtime）
// 手書きの「分解整備成績書」PDFを Claude(Anthropic API) に読み取らせ、
// 確認画面（Review／作業内容／測定値）で使える構造化データに変換する。
//
// 測定値の表が多い帳票は出力量が非常に多くなり、1回のリクエストにまとめると
// Vercel関数のタイムアウト（504）に達することがあるため、
// 「基本情報など(fields)」と「不具合・測定値(defects/measurements、出力量が多い方)」を
// 2つのリクエストに分けて並行実行し、合計の待ち時間を短縮している。
import Anthropic from "@anthropic-ai/sdk";

export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
  maxDuration: 60,
};

const MODEL = "claude-sonnet-5";

// 参考価格（USD / 100万トークン、claude-sonnet-5）。実際の請求額と若干ズレる可能性があるため、
// 正確な金額は https://www.anthropic.com/pricing または console.anthropic.com の使用状況を参照してください。
const PRICE_PER_MTOK_USD = { input: 2, output: 10 };
const usdToJpyEstimate = (usd) => usd * 155; // 概算レート。正確な換算ではありません。

const estimateCost = (usage) => {
  const inputTok = (usage?.input_tokens || 0) + (usage?.cache_creation_input_tokens || 0) + (usage?.cache_read_input_tokens || 0);
  const outputTok = usage?.output_tokens || 0;
  const usd = (inputTok / 1_000_000) * PRICE_PER_MTOK_USD.input + (outputTok / 1_000_000) * PRICE_PER_MTOK_USD.output;
  return { usd, jpyEstimate: usdToJpyEstimate(usd), inputTok, outputTok };
};

// 2回分のAPI usageを合算してコストを見積もる
const sumUsage = (...usages) => ({
  input_tokens: usages.reduce((s, u) => s + (u?.input_tokens || 0), 0),
  output_tokens: usages.reduce((s, u) => s + (u?.output_tokens || 0), 0),
  cache_creation_input_tokens: usages.reduce((s, u) => s + (u?.cache_creation_input_tokens || 0), 0),
  cache_read_input_tokens: usages.reduce((s, u) => s + (u?.cache_read_input_tokens || 0), 0),
});

const FIELD_ITEM_SCHEMA = {
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
};

const FIELDS_TOOL = {
  name: "submit_fields",
  description: "分解整備成績書（手書きPDF）から読み取った基本情報・本体仕様等の項目一覧を提出する",
  input_schema: {
    type: "object",
    properties: {
      fields: {
        type: "array",
        description: "確認画面に一覧表示する項目。基本情報・本体仕様・固定子コイル巻替など、書面に書かれているものはできる限り拾う（測定値の表そのものは含めない）。",
        items: FIELD_ITEM_SCHEMA,
      },
    },
    required: ["fields"],
  },
};

const DEFECTS_TOOL = {
  name: "submit_defects",
  description: "分解整備成績書（手書きPDF）から読み取った不具合・処置を提出する",
  input_schema: {
    type: "object",
    properties: {
      defects: {
        type: "array",
        description: [
          "不具合・処置に関する記載。「通常分解整備以外の不良個所および懸念箇所」という表に、①②③...のように番号付きで記入されている行は必ずすべて拾う。",
          "この表は次のような列を持つ：箇所／症状（詳細を記載）／推奨作業【必要な処置、数量、資材など記載】／施工範疇／作業完了。「例」という見本行（口出し線3本/6本中...）は対象外、番号①以降の実際の記入行のみが対象。",
          "具体例（実際に読み取った表のイメージ）：",
          "①の行に「箇所=ロータ軸(D)ベアリング下」「症状=摩耗」「推奨作業=溶射加工」と書かれていたら → { label: \"①ロータ軸(D)ベアリング下\", raw: \"症状：摩耗／推奨作業：溶射加工\" } のように1件として提出する。",
          "②③④も同様に、番号が振られていて箇所・症状・推奨作業のいずれかに記入がある行はすべて1件ずつ提出する（空欄の番号行は無視してよい）。",
          "ほかに特記事項欄・コメント欄などに記載があればそれも対象。無ければ空配列。",
        ].join("\n"),
        items: {
          type: "object",
          properties: {
            label: { type: "string", description: "見出し（例: ①ロータ軸(D)ベアリング下 のように番号と箇所名）" },
            raw: { type: "string", description: "その行の症状・推奨作業をまとめたもの（例: 症状：摩耗／推奨作業：溶射加工）" },
          },
          required: ["label", "raw"],
        },
      },
    },
    required: ["defects"],
  },
};

const MEASUREMENTS_TOOL = {
  name: "submit_measurements",
  description: "分解整備成績書（手書きPDF）から読み取った測定値の各行を提出する",
  input_schema: {
    type: "object",
    properties: {
      measurements: {
        type: "array",
        description: "測定値の各行。次のような表を想定し、記入がある表はすべて対象（複数ページにまたがることが多い）: 巻線抵抗値計測／絶縁抵抗値計測／軸ブレ測定／シャフトジャーナル部寸法測定／ブラケットハウジング部寸法測定／シャフト外径とカップリング内径の嵌め合い寸法測定／カーボンブラシの詳細／回転試験／温度試験／振動試験。",
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
    required: ["measurements"],
  },
};

const baseSystem = (customer, ctrl) => [
  "あなたはモーター整備工場の「分解整備成績書」（手書きPDF）を読み取り、社内の整備報告書作成システム向けに構造化するアシスタントです。",
  "この帳票は複数ページ（数ページ〜10ページ程度）にわたることがあります。ページ数の多さを理由に途中で切り上げず、すべてのページを確認してください。",
  "手書き文字は丁寧に読み取ってください。自信が持てない箇所は正直に conf を \"mid\" または \"low\" にし、reason に理由を書いてください。",
  "存在しない情報を作り出さないでください。読めない・書かれていない項目は無理に埋めず、そもそも項目自体を出力しないか raw を空にしてください。",
  `参考情報（分かっていれば）: 顧客名=${customer || "不明"}, 管理番号=${ctrl || "不明"}`,
];

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "method not allowed" }); return; }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: "サーバーにANTHROPIC_API_KEYが設定されていません。Vercelの環境変数を確認してください。" });
    return;
  }

  const { pdfBase64, customer, ctrl } = req.body || {};
  if (!pdfBase64) { res.status(400).json({ error: "pdfBase64 is required" }); return; }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const documentBlock = { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } };

  try {
    const [fieldsMsg, defectsMsg, measMsg] = await Promise.all([
      client.messages.create({
        model: MODEL,
        max_tokens: 12000, // 6000だと基本情報だけでも上限に達して打ち切られることがあったため引き上げ
        thinking: { type: "disabled" }, // 単純な項目一覧の読み取りなので速度優先
        system: [...baseSystem(customer, ctrl), "今回は「基本情報・本体仕様・目視/触診調査結果」など、測定値の表以外の項目一覧のみを読み取ってください。"].join("\n"),
        tools: [FIELDS_TOOL],
        tool_choice: { type: "tool", name: "submit_fields" },
        messages: [{ role: "user", content: [documentBlock, { type: "text", text: "この分解整備成績書PDFの項目一覧を読み取り、submit_fields ツールで結果を提出してください。" }] }],
      }),
      client.messages.create({
        model: MODEL,
        max_tokens: 12000,
        // 該当箇所は手書きの丸印・二重線・訂正などが混ざり読み取りが難しいため、こちらも推論(thinking)を有効のままにする
        system: [
          ...baseSystem(customer, ctrl),
          "今回は「不具合・処置」のみを読み取ってください。",
          "特に「通常分解整備以外の不良個所および懸念箇所」という表（①②③...と番号が振られ、箇所／症状／推奨作業の列を持つ）は、番号ごとに1行ずつ、記入がある行をすべて拾ってください。番号だけ振られていて中身が空欄の行は無視してください。",
          "手書きの箇所名（例: ロータ軸(D)ベアリング下、ブラケット(B) など）や、症状（例: 摩耗、ギヤー条痕）、推奨作業（例: 溶射加工、ブッシュ加工、切削加工）は、多少崩した字でも実在する専門用語なのでできる限り読み取ってください。読めた範囲だけでも1件として提出し、全く読めない場合のみ省略してください。",
          "ほかに特記事項欄・コメント欄に記載があればそれも対象です。",
        ].join("\n"),
        tools: [DEFECTS_TOOL],
        tool_choice: { type: "tool", name: "submit_defects" },
        messages: [{ role: "user", content: [documentBlock, { type: "text", text: "この分解整備成績書PDFの不具合・処置を読み取り、submit_defects ツールで結果を提出してください。" }] }],
      }),
      client.messages.create({
        model: MODEL,
        max_tokens: 20000,
        // 測定値の表は複雑で読み取りに丁寧な確認が要るため、こちらは推論(thinking)を有効のままにする
        system: [...baseSystem(customer, ctrl), "今回は「測定値」のみを読み取ってください。記入がある表・行を1件も漏らさず、最後のページまで抽出してください（空欄の表・行は無視してよい）。"].join("\n"),
        tools: [MEASUREMENTS_TOOL],
        tool_choice: { type: "tool", name: "submit_measurements" },
        messages: [{ role: "user", content: [documentBlock, { type: "text", text: "この分解整備成績書PDFの測定値を読み取り、submit_measurements ツールで結果を提出してください。" }] }],
      }),
    ]);

    const fieldsTool = fieldsMsg.content.find((b) => b.type === "tool_use");
    const defectsTool = defectsMsg.content.find((b) => b.type === "tool_use");
    const measTool = measMsg.content.find((b) => b.type === "tool_use");
    console.log("[extract] fields:", { stop: fieldsMsg.stop_reason, usage: fieldsMsg.usage, hasTool: !!fieldsTool });
    console.log("[extract] defects:", { stop: defectsMsg.stop_reason, usage: defectsMsg.usage, hasTool: !!defectsTool });
    console.log("[extract] measurements:", { stop: measMsg.stop_reason, usage: measMsg.usage, hasTool: !!measTool });

    if (!fieldsTool || !defectsTool || !measTool) {
      // 出力上限に達して構造化データを最後まで生成できなかった場合もここに来ることがある
      const anyTruncated = [fieldsMsg, defectsMsg, measMsg].some((m) => m.stop_reason === "max_tokens");
      const reason = anyTruncated ? "（出力量が多く、上限に達しました）" : "";
      res.status(502).json({ error: `モデルが構造化データを返しませんでした${reason}。もう一度お試しください。` });
      return;
    }

    const result = {
      fields: Array.isArray(fieldsTool.input.fields) ? fieldsTool.input.fields : [],
      defects: Array.isArray(defectsTool.input.defects) ? defectsTool.input.defects : [],
      measurements: Array.isArray(measTool.input.measurements) ? measTool.input.measurements : [],
    };
    // 各呼び出しがツール以外にテキストを残していないか（言い訳・説明・拒否など）は毎回記録しておく。
    // 0件だった時にその場で理由が分かるよう、サーバーログだけでなく画面側にも渡す。
    const textOf = (m) => m.content.filter((b) => b.type === "text").map((b) => b.text).join(" / ");
    const fieldsTexts = textOf(fieldsMsg), defectsTexts = textOf(defectsMsg), measTexts = textOf(measMsg);
    console.log("[extract] 件数:", { fields: result.fields.length, defects: result.defects.length, measurements: result.measurements.length });
    if (fieldsTexts || defectsTexts || measTexts) {
      console.log("[extract] モデルの発言:", { fieldsTexts, defectsTexts, measTexts });
    }

    // ツール呼び出し自体は成功したのに全項目が0件、というのは今回のPDFでは本来あり得ない
    // （実データが存在するため）。原因調査用に、通常のエラーとして診断情報つきで返す。
    if (result.fields.length === 0 && result.defects.length === 0 && result.measurements.length === 0) {
      console.error("[extract] 全項目が空でした", {
        fieldsStop: fieldsMsg.stop_reason, defectsStop: defectsMsg.stop_reason, measStop: measMsg.stop_reason,
        fieldsTexts, defectsTexts, measTexts,
      });
      res.status(502).json({
        error: `読み取り結果が空でした（診断情報: fields停止理由=${fieldsMsg.stop_reason}, 不具合停止理由=${defectsMsg.stop_reason}, 測定値停止理由=${measMsg.stop_reason}${measTexts ? `, モデルの発言=${measTexts.slice(0, 200)}` : ""}）。もう一度お試しいただくか、この画面をスクリーンショットして共有してください。`,
      });
      return;
    }

    const cost = estimateCost(sumUsage(fieldsMsg.usage, defectsMsg.usage, measMsg.usage));
    // max_tokensで打ち切られた場合、いずれかの項目が途中までしか入っていない可能性がある
    const truncated = [fieldsMsg, defectsMsg, measMsg].some((m) => m.stop_reason === "max_tokens");
    // 不具合・測定値が0件の場合は、本当に記載が無いのか読み取り漏れなのか画面側では判断できないため、
    // 一覧確認を促す注意フラグとして返す（エラーにはせず処理は続行する）。診断用にモデルの発言も添える。
    const warnings = {};
    if (result.defects.length === 0) { warnings.defectsEmpty = true; if (defectsTexts) warnings.defectsNote = defectsTexts.slice(0, 300); }
    if (result.measurements.length === 0) { warnings.measurementsEmpty = true; if (measTexts) warnings.measurementsNote = measTexts.slice(0, 300); }
    console.log("[extract] 完了", { truncated, warnings });
    res.status(200).json({ result, cost, model: MODEL, truncated, warnings });
  } catch (e) {
    console.error("[extract] エラー:", e);
    res.status(500).json({ error: e?.message || "読み取りに失敗しました" });
  }
}
