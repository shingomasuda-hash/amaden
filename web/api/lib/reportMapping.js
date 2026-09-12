// 実際の会社テンプレート（api/assets/report-template.xlsx）へ、AIの読み取り結果を書き込むための
// セル座標マッピング。テンプレートの構造（マージセル）を実際に開いて確認した座標。
//
// 対応しているのは「ページ①（交流）」シートのみ（直流は未対応）。また、以下は今回のスコープ外
// （チェックボックス状態の読み取りに対応する抽出スキーマが無いため、空欄のまま）：
//   種類／付属品／通常整備・ブッシング挿入加工・コイル巻替整備・その他作業のチェック欄
//   冷却ファン仕様（本体仕様のみ対応）
//   シャフト外径とカップリング内径の嵌め合い寸法測定（D側/B側で整備前セルが1つに結合されており、
//     複数行の値を書き分けられないため）

export const SHEET_NAME_AC = "ページ①（交流）";

export const COVER = {
  customer: "L13", // 顧客名（「御中」の上）
  year: "W36", month: "AI36", day: "AQ36", // 点検・整備完了日
  title: "N47", // 件名
  refYear: "AD51", refNo: "AJ51", // 弊社REF番号（例: 26 / MT / 7423）
};

// 本体仕様（グループ名「本体仕様」の項目をラベルのキーワードで拾う）
export const SPEC_CELLS = [
  { keywords: ["出力"], cell: "G4" },
  { keywords: ["電圧"], excludeKeywords: ["2次側"], cell: "V4" },
  { keywords: ["極数"], cell: "AL4" },
  { keywords: ["電流"], excludeKeywords: ["2次側"], cell: "BA4" },
  { keywords: ["回転数"], cell: "G6" },
  { keywords: ["2次側電圧"], cell: "V6" },
  { keywords: ["周波数"], cell: "G8" },
  { keywords: ["2次側電流"], cell: "V8" },
  { keywords: ["製造会社", "製造者", "メーカー"], cell: "G10" },
  { keywords: ["形式"], cell: "V10" },
  { keywords: ["製造番号", "製番"], cell: "AS10" },
];

// 特記事項欄（※1〜※5）。作業内容（不具合）の各行を上から順に入れる。
export const NOTE_CELLS = ["AA75", "AA77", "AA79", "AA81", "AA83"];

// 測定値（title・itemのキーワードでマッチさせ、該当セルへ書き込む）
// mode: "before_after" = before/afterを1つずつ書く。"insulation" = MΩ/V×受入時/整備完了時の4値。
export const MEASUREMENT_TABLES = [
  {
    titleKeywords: ["巻線抵抗"],
    mode: "before_after",
    rows: [
      { itemKeywords: ["1次", "U-V"], cells: { before: "P98", after: "AC98" } },
      { itemKeywords: ["1次", "V-W"], cells: { before: "P100", after: "AC100" } },
      { itemKeywords: ["1次", "U-W"], cells: { before: "P102", after: "AC102" } },
      { itemKeywords: ["U-V"], cells: { before: "P98", after: "AC98" } }, // 1次/2次の記載が無い場合のフォールバック
      { itemKeywords: ["V-W"], cells: { before: "P100", after: "AC100" } },
      { itemKeywords: ["U-W"], cells: { before: "P102", after: "AC102" } },
      { itemKeywords: ["2次", "u-v"], cells: { before: "P104", after: "AC104" } },
      { itemKeywords: ["2次", "v-w"], cells: { before: "P106", after: "AC106" } },
      { itemKeywords: ["2次", "u-w"], cells: { before: "P108", after: "AC108" } },
    ],
  },
  {
    // 絶縁抵抗値(MΩ)の列のみ書き込む。試験電圧(500V等)の列は測定プロトコルの固定値の
    // ように見えるテンプレートのため上書きしない。
    titleKeywords: ["絶縁抵抗"],
    mode: "before_after",
    rows: [
      { itemKeywords: ["固定子", "1次"], cells: { before: "M137", after: "AE137" } },
      { itemKeywords: ["回転子", "2次"], cells: { before: "M139", after: "AE139" } },
    ],
  },
  {
    titleKeywords: ["軸ブレ"],
    mode: "before_after",
    rows: [{ itemKeywords: [], cells: { before: "L157", after: "AB157" } }],
  },
  {
    titleKeywords: ["シャフトジャーナル"],
    mode: "before_after",
    rows: [
      { itemKeywords: ["反負荷側"], cells: { before: "T189", after: "AG189" } },
      { itemKeywords: ["負荷側"], cells: { before: "T185", after: "AG185" } },
    ],
  },
  {
    titleKeywords: ["ブラケットハウジング"],
    mode: "before_after",
    rows: [
      { itemKeywords: ["反負荷側"], cells: { before: "T220", after: "AG220" } },
      { itemKeywords: ["負荷側"], cells: { before: "T216", after: "AG216" } },
    ],
  },
  {
    // 回転試験は1行1値（電圧・U相電流・V相電流・W相電流をそれぞれ別の記入行として読み取る想定）
    titleKeywords: ["回転試験"],
    mode: "single",
    rows: [
      { itemKeywords: ["拘束", "電圧"], cell: "M272" },
      { itemKeywords: ["拘束", "U相"], cell: "T272" },
      { itemKeywords: ["拘束", "V相"], cell: "AB272" },
      { itemKeywords: ["拘束", "W相"], cell: "AJ272" },
      { itemKeywords: ["無負荷", "1次", "電圧"], cell: "M274" },
      { itemKeywords: ["無負荷", "1次", "U相"], cell: "T274" },
      { itemKeywords: ["無負荷", "1次", "V相"], cell: "AB274" },
      { itemKeywords: ["無負荷", "1次", "W相"], cell: "AJ274" },
      { itemKeywords: ["無負荷", "2次", "電圧"], cell: "M276" },
      { itemKeywords: ["無負荷", "2次", "U相"], cell: "T276" },
      { itemKeywords: ["無負荷", "2次", "V相"], cell: "AB276" },
      { itemKeywords: ["無負荷", "2次", "W相"], cell: "AJ276" },
    ],
  },
  {
    titleKeywords: ["温度試験"],
    mode: "temperature",
    // 行は経過時間(分)で選ぶ。列は箇所（負荷側／反負荷側／固定子中央／外気温）で選ぶ。
    timeRows: { "0": 298, "10": 300, "20": 302, "30": 304 },
    columns: [
      { keywords: ["外気温"], onlyFirstRow: true, col: "A" },
      { keywords: ["負荷側軸受"], excludeKeywords: ["反"], col: "O" },
      { keywords: ["反負荷側軸受"], col: "AA" },
      { keywords: ["固定子中央", "固定子"], col: "AM" },
    ],
  },
  {
    titleKeywords: ["振動試験"],
    mode: "vibration",
    typeRows: { ACC: 323, VEL: 325, DIS: 327 },
    columns: [
      { keywords: ["負荷側", "垂直"], excludeKeywords: ["反"], col: "I" },
      { keywords: ["負荷側", "軸方向"], excludeKeywords: ["反"], col: "Q" },
      { keywords: ["負荷側", "水平"], excludeKeywords: ["反"], col: "Y" },
      { keywords: ["反負荷側", "垂直"], col: "AG" },
      { keywords: ["反負荷側", "軸方向"], col: "AO" },
      { keywords: ["反負荷側", "水平"], col: "AW" },
    ],
  },
];
