import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseReady = Boolean(url && anonKey);

if (!supabaseReady) {
  // 開発中に環境変数を入れ忘れた時にすぐ気づけるように、コンソールへ警告するだけに留める
  // （ここで例外を投げると画面が真っ白になってしまうため）
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY が設定されていません。.env.local を確認してください。"
  );
}

export const supabase = supabaseReady
  ? createClient(url, anonKey)
  : null;
