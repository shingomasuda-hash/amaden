# 整備報告書【モータ】自動作成システム（本番構成）

Vite + React + Supabase（認証・データベース・リアルタイム同期）+ Vercel（ホスティング）構成の本番アプリです。
`../src/app.html` の単体HTML版（GitHub Pages・ブラウザ内保存のみ）とは別物です。こちらが「実際に運用する」ための本体になります。

## できるようになったこと

- **本物のログイン**（Supabase Auth・メール＋パスワード）。新規登録は管理者が権限を付与するまで「承認待ち」。
- **社内・先方でリアルタイムに同期**するチャット・案件データ（Postgresに保存、他の端末にも即座に反映）。
- **先方ポータル**は引き続きログイン不要のトークンリンク（`#/customer/<token>`）。Row Level Securityで、トークンが有効な案件の情報だけを返す仕組みです。
- 「誰がどこを触ったか」の変更履歴はSupabaseの `audit_logs` テーブルに記録され、案件チャットのタイムラインにも自動で反映されます。

## セットアップ手順

### 1. SupabaseプロジェクトでSQLを実行

Supabaseダッシュボード → 該当プロジェクト → **SQL Editor** を開き、`../supabase/schema.sql` の内容をそのまま貼り付けて実行してください。

これでテーブル（`profiles` `cases` `case_messages` `case_links` `audit_logs`）とRLSポリシー、先方ポータル用の関数、リアルタイム配信の設定が一括で作られます。再実行しても安全です。

### 2. Supabase Authの設定確認

Authentication → Providers → **Email** が有効になっていることを確認してください（Supabaseはデフォルトで有効です）。
「Confirm email」を求めるかどうかは Authentication → Settings で調整できます（社内用途なら無効化して即ログインできるようにしても構いません）。

### 3. 環境変数を設定

`web/.env.example` を `web/.env.local` にコピーし、Supabaseの **Project Settings → API** にある値を入れてください。

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=（anon / public キー。secretキーではありません）
```

### 4. ローカルで確認

```bash
cd web
npm install
npm run dev
```

### 5. 最初の管理者アカウントを作る

1. アプリを開き「アカウントをお持ちでない方はこちら」からサインアップ（自分のメールアドレスで）
2. Supabaseダッシュボード → Table Editor → `profiles` テーブルを開き、自分の行の `role` を `管理者` に変更
3. 以降は、その管理者アカウントでログインし、管理者画面の「アカウント管理」から他のスタッフを承認・権限付与できます

### 6. Vercelにデプロイ

1. Vercelダッシュボード → **Add New → Project** → このGitHubリポジトリを選択
2. **Root Directory** を `web` に設定（重要）
3. Framework Preset は Vite が自動検出されます
4. Environment Variables に `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` を追加
5. Deploy

以降は `main`（または対象ブランチ）にpushするたびに自動で再デプロイされます。

## セキュリティについて

- 先方ポータルはSECURITY DEFINER関数（`get_case_by_token` / `post_customer_message`）経由でのみアクセスでき、有効なトークンを持つ案件の情報しか返しません。
- 社内画面はSupabase Authのセッションが必須で、RLSにより `role IN ('管理者','担当者')` でないと書き込みできません。`閲覧者` は読み取り専用です。
- アカウントの完全な削除（Supabase Authユーザーの削除）はブラウザからは行えません（service_roleキーが必要なため意図的に外しています）。不要なアカウントは「停止」にしてください。本当に削除したい場合はSupabaseダッシュボードのAuthenticationから行ってください。
