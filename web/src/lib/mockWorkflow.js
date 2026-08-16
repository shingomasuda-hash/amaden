/* ============================================================
   OCR読み取り〜提出プレビューのワークフローは、まだ実際のOCR/Excel/PDF
   エンジンに接続していないため、ここのモックデータを表示・編集する形の
   UIプロトタイプのままです（バックエンドはSupabaseに接続済み）。
   ============================================================ */
export const FIELDS_INIT = [
  { id: "f1", grp: "基本情報", label: "顧客名", raw: "近畿テクノ㈱エレベータ", norm: "近畿テクノ㈱エレベータ", unit: "", conf: "high", sheet: "表紙", target: "顧客名 (L13)", status: "confirmed", box: "customer" },
  { id: "f2", grp: "基本情報", label: "管理番号", raw: "26MT1020", norm: "1020", unit: "", conf: "high", sheet: "表紙", target: "管理No (AJ51)", status: "confirmed", note: "年2桁+MTはフォーム印字済のため除去", box: "ctrl" },
  { id: "f3", grp: "基本情報", label: "受入日", raw: "2025.12.27", norm: "2025-12-27", unit: "", conf: "high", sheet: "—", target: "—", status: "confirmed", box: "recv" },
  { id: "f4", grp: "基本情報", label: "作業完了日", raw: "2026.3.17", norm: "2026 / 3 / 17", unit: "", conf: "high", sheet: "表紙", target: "完了 年/月/日 (W36/AI36/AQ36)", status: "confirmed" },
  { id: "f10", grp: "本体仕様", label: "出力", raw: "55", norm: "55", unit: "kW", conf: "high", sheet: "ページ①（交流）", target: "出力 (G4)", status: "confirmed", box: "kw" },
  { id: "f11", grp: "本体仕様", label: "電圧", raw: "220/440", norm: "220/440", unit: "V", conf: "high", sheet: "ページ①（交流）", target: "電圧 (V4)", status: "confirmed", box: "v" },
  { id: "f12", grp: "本体仕様", label: "極数", raw: "4", norm: "4", unit: "P", conf: "high", sheet: "ページ①（交流）", target: "極数 (AL4)", status: "confirmed", box: "p" },
  { id: "f13", grp: "本体仕様", label: "電流", raw: "179/90", norm: "179/90", unit: "A", conf: "high", sheet: "ページ①（交流）", target: "電流 (BA4)", status: "confirmed", box: "a" },
  { id: "f14", grp: "本体仕様", label: "回転数", raw: "1760", norm: "1760", unit: "rpm", conf: "high", sheet: "ページ①（交流）", target: "回転数 (G6)", status: "confirmed", box: "rpm" },
  { id: "f15", grp: "本体仕様", label: "周波数", raw: "60", norm: "60", unit: "Hz", conf: "high", sheet: "ページ①（交流）", target: "周波数 (G8)", status: "confirmed", box: "hz" },
  { id: "f16", grp: "本体仕様", label: "製造会社", raw: "フジ", norm: "フジ", unit: "", conf: "high", sheet: "ページ①（交流）", target: "製造 (G10)", status: "confirmed", box: "maker" },
  { id: "f17", grp: "本体仕様", label: "形式", raw: "MRA5205A", norm: "MRA5205A", unit: "", conf: "high", sheet: "ページ①（交流）", target: "形式 (V10)", status: "confirmed", box: "model" },
  { id: "f18", grp: "本体仕様", label: "機番", raw: "89118752MS2", norm: "89118752MS2", unit: "", conf: "mid", sheet: "ページ①（交流）", target: "製番 (AS10)", status: "review", reason: "末尾 MS2 / M82 の判読が不明瞭", candidates: ["89118752MS2", "89118752M82"], box: "serial" },
  { id: "f19", grp: "本体仕様", label: "ベアリングD", raw: "6315ZZ", norm: "6315ZZ", unit: "", conf: "high", sheet: "ページ①（交流）", target: "ベアD (AP6)", status: "confirmed", box: "brD" },
  { id: "f20", grp: "本体仕様", label: "ベアリングB", raw: "6212ZZ", norm: "6212ZZ", unit: "", conf: "high", sheet: "ページ①（交流）", target: "ベアB (AP8)", status: "confirmed", box: "brB" },
  { id: "f30", grp: "作業内容", label: "種類：全閉外扇型", raw: "☑", norm: "◎", unit: "", conf: "high", sheet: "ページ①（交流）", target: "種類 (K25)", status: "confirmed", box: "type" },
  { id: "f31", grp: "作業内容", label: "付属品：プーリー", raw: "☑", norm: "◎", unit: "", conf: "high", sheet: "ページ①（交流）", target: "付属品 (AM25)", status: "confirmed" },
  { id: "f32", grp: "作業内容", defect: true, label: "不良個所① ローター軸(D)", raw: "ローター軸(D)ベアリング部 摩耗 → 溶射加工", norm: "（定型文照合）", unit: "", conf: "mid", sheet: "ページ①（交流）", target: "特記事項 (D75/AA75)", status: "review", reason: "リスト報告書の定型文候補から選択が必要" },
  { id: "f33", grp: "作業内容", defect: true, label: "不良個所③ 固定子コイル", raw: "固定子コイル 絶縁劣化 → 巻替", norm: "（定型文照合）", unit: "", conf: "mid", sheet: "ページ①（交流）", target: "特記事項 (D77/AA77)", status: "review", reason: "リスト報告書の定型文候補から選択が必要" },
  { id: "f40", grp: "測定値", label: "絶縁抵抗 受入", raw: "2000", norm: "2000", unit: "MΩ", conf: "high", sheet: "ページ①（交流）", target: "絶縁 (P137)", status: "confirmed" },
  { id: "f41", grp: "測定値", label: "ジャーナル(負荷) 整備前", raw: "75.009", norm: "75.009", unit: "mm", conf: "high", sheet: "ページ①（交流）", target: "ジャーナル (T185)", status: "confirmed" },
  { id: "f42", grp: "測定値", label: "拘束試験 U相(整備後)", raw: "17〔7/9〕", norm: "", unit: "A", conf: "low", sheet: "ページ①（交流）", target: "回転試験 (T272)", status: "review", reason: "受入179と整備177が重なり判読困難", candidates: ["177", "179"] },
  { id: "f43", grp: "測定値", label: "分解時 湿度", raw: "5 7", norm: "57", unit: "%", conf: "mid", sheet: "ページ①（交流）", target: "環境 (I94)", status: "review", reason: "湿度表記が判読しにくい", candidates: ["57", "5.7"] },
  { id: "f50", grp: "固定子コイル巻替", label: "巻替理由", raw: "客先希望 ☑", norm: "客先希望", unit: "", conf: "high", sheet: "固定子コイル巻替", target: "巻替理由", status: "confirmed" },
  { id: "f51", grp: "固定子コイル巻替", label: "線径", raw: "φ1.3/1.2", norm: "1.3/1.2", unit: "φ", conf: "high", sheet: "固定子コイル巻替", target: "線径", status: "confirmed" },
  { id: "f52", grp: "固定子コイル巻替", label: "スロット数", raw: "48", norm: "48", unit: "", conf: "high", sheet: "固定子コイル巻替", target: "スロット数 (AQ23)", status: "confirmed" },
  { id: "f53", grp: "固定子コイル巻替", label: "結線", raw: "220Y/440Δ", norm: "220Y/440Δ", unit: "", conf: "high", sheet: "固定子コイル巻替", target: "結線 (BN23)", status: "confirmed" },
];

export const PHRASES = {
  f32: {
    check: "ローター軸（D側）ベアリング部の摩耗",
    symbol: "◎",
    symptomCands: ["両側シャフトベアリング嵌合部の摩耗", "負荷側シャフト摩耗", "軸受部の摩耗・偏摩耗"],
    treatCands: ["溶射加工にて補修", "肉盛加工にて補修", "ブッシング挿入加工にて補修"],
    symptomPick: "両側シャフトベアリング嵌合部の摩耗",
    treatPick: "溶射加工にて補修",
  },
  f33: {
    check: "固定子コイルの絶縁劣化",
    symbol: "◎",
    symptomCands: ["固定子コイルが焼損", "固定子コイルの絶縁劣化", "レアショート発生"],
    treatCands: ["コイル巻替作業の実施", "コイル部分補修", "含浸処理の実施"],
    symptomPick: "固定子コイルの絶縁劣化",
    treatPick: "コイル巻替作業の実施",
  },
};

export const MEAS = [
  { key: "res", title: "巻線抵抗値", cols: ["mgmt", "recv", "before", "after", "unit", "judge", "conf"],
    rows: [
      { name: "220V U-V", recv: "22.37", after: "23.18", unit: "mΩ", judge: "良", conf: "high" },
      { name: "220V V-W", recv: "22.47", after: "23.24", unit: "mΩ", judge: "良", conf: "high" },
      { name: "220V U-W", recv: "22.20", after: "23.25", unit: "mΩ", judge: "良", conf: "high" },
      { name: "440V u-v", recv: "90.2", after: "88.6", unit: "mΩ", judge: "良", conf: "high" },
      { name: "440V v-w", recv: "90.7", after: "88.7", unit: "mΩ", judge: "良", conf: "high" },
      { name: "440V u-w", recv: "89.5", after: "88.7", unit: "mΩ", judge: "良", conf: "high" },
    ] },
  { key: "ins", title: "絶縁抵抗値", cols: ["mgmt", "recv", "after", "unit", "judge", "conf"],
    rows: [ { name: "受入 / 500V", recv: "2000", after: "2000", unit: "MΩ", judge: "良", conf: "high" } ] },
  { key: "run", title: "軸ブレ", cols: ["mgmt", "before", "after", "unit", "judge", "conf"],
    rows: [ { name: "軸ブレ", mgmt: "≦2", before: "1", after: "1", unit: "/100mm", judge: "良", conf: "high" } ] },
  { key: "shaft", title: "シャフト寸法（ジャーナル）", cols: ["mgmt", "before", "after", "unit", "judge", "conf", "treat"],
    rows: [
      { name: "負荷側", mgmt: "φ75 +.011/+.030", before: "75.009", after: "75.020", unit: "mm", judge: "否→良", conf: "mid", treat: "溶射加工", flag: "mid" },
      { name: "反負荷側", mgmt: "φ60 +.011/+.030", before: "60.008", after: "60.020", unit: "mm", judge: "否→良", conf: "mid", treat: "溶射加工", flag: "mid" },
    ] },
  { key: "brk", title: "ブラケット寸法（ハウジング）", cols: ["mgmt", "before", "after", "unit", "judge", "conf"],
    rows: [
      { name: "負荷側", mgmt: "φ160 0/+.040", before: "160.015", after: "160.015", unit: "mm", judge: "良", conf: "high" },
      { name: "反負荷側", mgmt: "φ110 0/+.035", before: "110.015", after: "110.015", unit: "mm", judge: "良", conf: "high" },
    ] },
  { key: "rot", title: "回転試験", cols: ["mgmt", "recv", "after", "unit", "judge", "conf"],
    rows: [
      { name: "拘束 U相", recv: "179", after: "177", unit: "A", judge: "—", conf: "low", flag: "low", cands: ["177", "179"], reason: "受入179と整備177が重なり判読困難" },
      { name: "拘束 V相", recv: "162", after: "162", unit: "A", judge: "—", conf: "high" },
      { name: "無負荷 U相", recv: "—", after: "54.9", unit: "A", judge: "良", conf: "high" },
      { name: "回転方向", recv: "—", after: "CCW", unit: "", judge: "良", conf: "high" },
    ] },
  { key: "tmp", title: "温度試験", cols: ["mgmt", "before", "after", "unit", "judge", "conf"],
    rows: [
      { name: "外気温", after: "14", unit: "℃", judge: "—", conf: "high" },
      { name: "30分 負荷側", after: "26", unit: "℃", judge: "良", conf: "high" },
      { name: "30分 中央", after: "21", unit: "℃", judge: "良", conf: "high" },
    ] },
  { key: "vib", title: "振動試験（整備後）", cols: ["mgmt", "after", "unit", "judge", "conf"],
    rows: [
      { name: "変位 負荷V", after: "11", unit: "μm", judge: "良", conf: "high" },
      { name: "変位 反V", after: "2", unit: "μm", judge: "良", conf: "high" },
    ] },
];

export const MEAS_COL_LABEL = { mgmt: "管理値", recv: "受入時", before: "整備前", after: "整備後", unit: "単位", judge: "判定", conf: "信頼度", treat: "処置" };

export const SHEETS_INIT = [
  { id: "cover", name: "表紙", on: true, always: true },
  { id: "ac", name: "ページ①（交流）", on: true },
  { id: "dc", name: "ページ①（直流）", on: false },
  { id: "rewind", name: "固定子コイル巻替", on: true },
  { id: "ohPhoto", name: "写真【OH】", on: false, needsPhoto: true },
  { id: "rwPhoto", name: "写真【巻替え】", on: false, needsPhoto: true },
];

export const STEPS = [
  { id: "upload", name: "アップロード" },
  { id: "processing", name: "AI読み取り" },
  { id: "review", name: "結果確認" },
  { id: "work", name: "作業内容" },
  { id: "meas", name: "測定値" },
  { id: "preview", name: "提出プレビュー" },
  { id: "done", name: "完了" },
];
