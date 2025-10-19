# Cloudflare R2 セットアップガイド

このプロジェクトでは、画像・動画の保存に **Cloudflare R2** を使用しています。

## なぜCloudflare R2？

- **10GBまで完全無料**
- **転送料金（egress）が無料** - S3と違い、データ取得に課金なし
- S3互換API - 既存のツールがそのまま使える
- 高速CDN統合

## セットアップ手順

### 1. Cloudflareアカウント作成

1. [Cloudflare](https://dash.cloudflare.com/sign-up)でアカウント作成（無料）
2. ダッシュボードにログイン

### 2. R2バケット作成

1. Cloudflareダッシュボードで **R2** を選択
2. **Create bucket** をクリック
3. バケット名を入力（例: `merry-share-media`）
4. リージョンは自動選択（通常はAPAC）
5. **Create bucket** をクリック

### 3. 公開アクセスの設定

1. 作成したバケットを選択
2. **Settings** タブ → **Public access** セクション
3. **Allow Access** をクリック
4. **Custom domain** を設定するか、デフォルトの `r2.dev` URLをメモ
   - 例: `https://pub-xxxxx.r2.dev`

### 4. API トークン作成

1. Cloudflareダッシュボードで **R2** → **Manage R2 API Tokens**
2. **Create API Token** をクリック
3. Permission: **Object Read & Write**
4. Bucket: 作成したバケットを選択
5. **Create API Token** をクリック
6. 以下の情報をメモ（**1回しか表示されません**）:
   - **Access Key ID**
   - **Secret Access Key**
   - **Account ID**（R2のダッシュボードURLから取得可能）

### 5. 環境変数の設定

プロジェクトルートに `.env.local` ファイルを作成し、以下を記入:

```bash
# Database (既存の設定)
DATABASE_URL="your_database_url"
DIRECT_URL="your_direct_url"

# Supabase (既存の設定)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Cloudflare R2
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=merry-share-media
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

**重要**:
- `R2_ACCOUNT_ID`: CloudflareのアカウントID（R2ダッシュボードのURLから確認）
- `R2_PUBLIC_URL`: バケットの公開URL（`.r2.dev`で終わるURL）

### 6. データベースのマイグレーション

新しい `media_type` カラムを追加するため、マイグレーションを実行:

```bash
npm run db:push
```

または開発環境の場合:

```bash
npm run db:migrate
```

### 7. 動作確認

1. 開発サーバーを起動:
   ```bash
   npm run dev
   ```

2. ブラウザで `http://localhost:3000` を開く
3. 右下の **+ボタン** をクリック
4. 画像または動画をアップロード
5. 正常にアップロードされ、ギャラリーに表示されればOK

## トラブルシューティング

### アップロードが失敗する

- `.env.local` の環境変数が正しく設定されているか確認
- R2のAPI Tokenが有効か確認
- バケット名が正しいか確認

### 画像が表示されない

- `R2_PUBLIC_URL` が正しく設定されているか確認
- R2バケットの Public Access が有効になっているか確認
- `next.config.js` に R2 のドメインが追加されているか確認

### CORS エラーが発生する

R2バケットのCORS設定を追加:

1. R2バケットの **Settings** → **CORS policy**
2. 以下のポリシーを追加:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

## 料金について

### 無料枠（Cloudflare R2）

- **ストレージ**: 10GB/月まで無料
- **Class A操作** (書き込み): 100万回/月まで無料
- **Class B操作** (読み込み): 1000万回/月まで無料
- **データ転送（egress）**: **完全無料** ⭐️

### 無料枠を超えた場合

- ストレージ: $0.015/GB/月
- Class A操作: $4.50/100万リクエスト
- Class B操作: $0.36/100万リクエスト

## 本番環境へのデプロイ

Vercel、Railway、Renderなどにデプロイする際は、環境変数を設定してください:

```bash
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=merry-share-media
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

## セキュリティ

- **絶対に** API トークンをGitにコミットしないでください
- `.env.local` は `.gitignore` に含まれています
- 本番環境では環境変数として安全に管理してください

## 参考リンク

- [Cloudflare R2 公式ドキュメント](https://developers.cloudflare.com/r2/)
- [S3互換API](https://developers.cloudflare.com/r2/api/s3/)
- [料金](https://developers.cloudflare.com/r2/pricing/)
