# Vercel デプロイガイド

## 🚀 デプロイ手順

### 1. Vercel アカウントの作成とプロジェクト接続

#### 1-1. Vercel アカウント作成
1. [Vercel](https://vercel.com) にアクセス
2. "Sign Up" をクリック
3. GitHubアカウントで認証（推奨）

#### 1-2. プロジェクトをGitHubにプッシュ
```bash
# まだGitHubリポジトリを作成していない場合
# 1. GitHubで新しいリポジトリを作成
# 2. ローカルのリポジトリをプッシュ

git remote add origin https://github.com/YOUR_USERNAME/merry-share.git
git branch -M main
git push -u origin main
```

#### 1-3. Vercelでプロジェクトをインポート
1. Vercelダッシュボードで "Add New..." → "Project" をクリック
2. GitHubリポジトリから `merry-share` を選択
3. "Import" をクリック

### 2. 環境変数の設定

Vercelのプロジェクト設定画面で以下の環境変数を設定してください：

#### 必須の環境変数

```bash
# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Next.js
NEXTAUTH_URL=https://your-project.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret-here

# Cloudflare R2 Storage
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-bucket.r2.dev

# Stripe Payment
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Application
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app

# Production
NODE_ENV=production
```

#### 環境変数の設定方法
1. Vercelプロジェクトページで "Settings" タブをクリック
2. "Environment Variables" セクションに移動
3. 各変数を追加（"Production", "Preview", "Development" 全てにチェック）

### 3. ビルド設定の確認

Vercelが自動検出するので基本的に変更不要ですが、念のため確認：

- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next` (自動)
- **Install Command**: `npm ci`

### 4. デプロイ実行

環境変数を設定後、"Deploy" ボタンをクリック

初回デプロイは5-10分程度かかります。

### 5. データベースマイグレーション

デプロイ後、Supabaseでデータベースマイグレーションを実行：

```bash
# ローカルで実行
npm run db:push

# または Supabase SQL Editorで直接実行
```

### 6. Stripe Webhookの設定

#### 6-1. Webhook URLの設定
1. [Stripe Dashboard](https://dashboard.stripe.com) → "Developers" → "Webhooks"
2. "Add endpoint" をクリック
3. Endpoint URL: `https://your-project.vercel.app/api/stripe/webhook`
4. イベント選択:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

#### 6-2. Webhook Secretの取得
1. 作成したWebhookの詳細ページで "Signing secret" をコピー
2. Vercelの環境変数 `STRIPE_WEBHOOK_SECRET` に設定
3. Vercelで再デプロイ

### 7. カスタムドメインの設定（オプション）

1. Vercelプロジェクトで "Settings" → "Domains"
2. カスタムドメインを追加
3. DNSレコードを設定（Vercelが指示を表示）

## ✅ デプロイ後の確認項目

- [ ] アプリケーションが正常に表示される
- [ ] データベース接続が正常
- [ ] Supabase認証が動作する
- [ ] 画像/動画のアップロードが動作（R2連携）
- [ ] Stripe決済が動作
- [ ] Webhookが正常に受信される

## 🔄 継続的デプロイ

GitHubの `main` ブランチにプッシュすると自動的にデプロイされます：

```bash
git add .
git commit -m "Update feature"
git push origin main
```

プルリクエストを作成すると、自動的にプレビューデプロイが作成されます。

## 🐛 トラブルシューティング

### ビルドエラーが発生する場合

1. **環境変数の確認**: すべての必須環境変数が設定されているか確認
2. **ローカルでビルドテスト**:
   ```bash
   npm run build
   ```
3. **依存関係の確認**:
   ```bash
   npm ci
   ```

### データベース接続エラー

- DATABASE_URLとDIRECT_URLが正しく設定されているか確認
- Supabaseプロジェクトが一時停止していないか確認

### Stripe Webhookが動作しない

- Webhook URLが正しいか確認
- STRIPE_WEBHOOK_SECRETが正しく設定されているか確認
- Stripeダッシュボードでイベントログを確認

## 📊 モニタリング

Vercelダッシュボードで以下を確認できます：

- デプロイ履歴
- ビルドログ
- ランタイムログ
- アナリティクス（リクエスト数、レスポンスタイムなど）

## 💰 コスト管理

無料プランの制限：
- 帯域幅: 100GB/月
- サーバーレス関数実行時間: 100時間/月
- ビルド時間: 6,000分/月

使用量は Vercel ダッシュボードの "Usage" タブで確認できます。

## 🔒 セキュリティ

### 本番環境での注意事項

1. **環境変数の保護**: 絶対にGitにコミットしない
2. **Stripe本番キー**: テストモードから本番モードに切り替え
3. **NEXTAUTH_SECRET**: 強力なランダム文字列を使用
   ```bash
   openssl rand -base64 32
   ```

## 📞 サポート

問題が発生した場合：
1. Vercelドキュメント: https://vercel.com/docs
2. Next.jsドキュメント: https://nextjs.org/docs
3. Vercel Community: https://github.com/vercel/vercel/discussions
