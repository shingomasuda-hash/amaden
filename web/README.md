# 整備報告書【モータ】自動作成システム（本番構成）

Vite + React + **Firebase**（認証・Firestore・リアルタイム同期）+ **Vercel**（ホスティング）構成の本番アプリです。
`../src/app.html` の単体HTML版（GitHub Pages・ブラウザ内保存のみ）とは別物です。こちらが「実際に運用する」ための本体になります。

Cloud Functions（有料のBlazeプラン相当）は使わず、**無料のSparkプランの範囲内**で動くように設計しています。認可の仕組みはすべて Firestore セキュリティルール（`../firebase/firestore.rules`）で実現しています。

## できるようになったこと

- **本物のログイン**（Firebase Authentication・メール＋パスワード）。新規登録は管理者が権限を付与するまで「承認待ち」。
- **社内・先方でリアルタイムに同期**するチャット・案件データ（Firestoreに保存、他の端末にも即座に反映）。
- **先方ポータル**は引き続きログイン不要のトークンリンク（`#/customer/<token>`）。トークンをドキュメントIDにすることで、知らない人は他の案件のリンクに辿り着けない仕組みです。
- 「誰がどこを触ったか」の変更履歴は `auditLogs` コレクションに記録され、案件チャットのタイムラインにも自動で反映されます。

## セットアップ手順

### 1. Firebaseプロジェクトを作成

[Firebaseコンソール](https://console.firebase.google.com/) → 「プロジェクトを追加」。Googleアナリティクスは無効のままで構いません。

### 2. Authentication（メール/パスワード）を有効化

Build → Authentication → Sign-in method → 「メール/パスワード」を有効化。

### 3. Firestore Database を作成

Build → Firestore Database → 「データベースの作成」→ 本番モード（ロケーションは `asia-northeast1` など任意）。

### 4. セキュリティルールを設定

Firestore Database → **ルール** タブを開き、`../firebase/firestore.rules` の中身をそのまま貼り付けて「公開」してください。

### 5. Webアプリを登録し、設定値を取得

プロジェクトの概要 → 「</> (Web)」アイコン → アプリを登録（Firebase Hostingの設定は不要、スキップでOK）。表示される `firebaseConfig` の値を使います。

### 6. 環境変数を設定

`web/.env.example` を `web/.env.local` にコピーし、上記の値を入れてください。

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

これらの値はFirebaseの設計上、クライアント（ブラウザ）に埋め込まれる前提の公開情報です（アクセス制御はFirestoreルールが担います）。

### 7. ローカルで確認

```bash
cd web
npm install
npm run dev
```

### 8. 最初の管理者アカウントを作る

1. アプリを開き「アカウントをお持ちでない方はこちら」からサインアップ（自分のメールアドレスで）
2. Firebaseコンソール → Firestore Database → データ → `profiles` コレクション → 自分のドキュメント（UIDが名前になっています）を開き、`role` フィールドを `管理者` に変更
3. 以降は、その管理者アカウントでログインし、管理者画面の「アカウント管理」から他のスタッフを承認・権限付与できます

### 9. Vercelにデプロイ

1. Vercelダッシュボード → **Add New → Project** → このGitHubリポジトリを選択
2. **Root Directory** を `web` に設定（重要）
3. Framework Preset は Vite が自動検出されます
4. Environment Variables に手順6の6つの値をすべて追加
5. Deploy

以降は対象ブランチにpushするたびに自動で再デプロイされます。

## セキュリティについて

- 先方ポータルは `caseLinks/{token}` ドキュメント（IDそのものがランダムなトークン）経由でのみアクセスでき、`list`（一覧取得）は禁止しているため、トークンを知らない限り他の案件へは辿り着けません。
- 社内画面はFirebase Authのセッションが必須で、Firestoreルールにより `role IN ['管理者','担当者']` でないと書き込みできません。`閲覧者` は読み取り専用です。
- 新規サインアップ直後は必ず `role='pending'` になるようルールで強制しており、クライアント側の改ざんで自分に管理者権限を付与することはできません。
- アカウントの完全な削除（Firebase Authユーザーの削除）はブラウザからは行えません（Admin SDK/Cloud Functionsが必要なため意図的に外しています）。不要なアカウントは「停止」にしてください。本当に削除したい場合はFirebaseコンソールのAuthenticationから行ってください。
