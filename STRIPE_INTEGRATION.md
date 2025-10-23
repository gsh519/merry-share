# Stripe決済機能 統合ガイド

このドキュメントでは、Merry ShareアプリケーションにStripe決済機能を統合する方法を説明します。

## 📋 目次

1. [概要](#概要)
2. [セットアップ手順](#セットアップ手順)
3. [データベース構造](#データベース構造)
4. [APIエンドポイント](#apiエンドポイント)
5. [UIコンポーネント](#uiコンポーネント)
6. [使い方](#使い方)
7. [Webhook設定](#webhook設定)
8. [トラブルシューティング](#トラブルシューティング)

---

## 概要

このStripe統合により、以下の機能が提供されます:

- **サブスクリプション管理**: 月額課金プランの作成と管理
- **決済処理**: Stripe Checkoutを使用した安全な決済
- **Webhook処理**: Stripeからのイベント通知を自動処理
- **プラン管理**: 複数の料金プランの作成と管理
- **支払い履歴**: 過去の支払い記録の追跡

---

## セットアップ手順

### 1. 環境変数の設定

`.env.local`ファイルに以下の環境変数を追加してください:

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Stripe APIキーの取得方法:

1. [Stripe Dashboard](https://dashboard.stripe.com/)にログイン
2. 開発者 > APIキー に移動
3. 公開可能キー (pk_test_...) と シークレットキー (sk_test_...) をコピー
4. テスト環境では`test`キーを、本番環境では`live`キーを使用

### 2. データベースマイグレーション

新しいテーブル (plans, subscriptions, payments) を作成します:

```bash
# Prismaクライアントを生成
npm run db:generate

# データベースマイグレーションを実行
npm run db:migrate

# または直接pushする場合
npm run db:push
```

### 3. プランデータのシード

サンプルプランをデータベースに登録します:

```bash
npx tsx prisma/seed-plans.ts
```

このスクリプトは以下の3つのプランを作成します:
- **ベーシック**: ¥1,980/月
- **スタンダード**: ¥3,980/月
- **プレミアム**: ¥7,980/月

### 4. Stripeでプランを作成

Stripeダッシュボードで商品と価格を作成する必要があります:

#### 方法A: Stripeダッシュボードで手動作成

1. [Stripe Dashboard](https://dashboard.stripe.com/) にログイン
2. **商品** > **商品を追加** をクリック
3. 各プランの情報を入力:
   - 商品名: "ベーシックプラン"
   - 説明: プランの詳細
   - 価格: ¥1,980 (継続支払い: 月次)
4. 作成した価格の `price_id` (price_xxx) をコピー
5. データベースのplanテーブルの `stripe_price_id` を更新:

```sql
UPDATE plans SET stripe_price_id = 'price_xxxxx' WHERE name = 'basic';
UPDATE plans SET stripe_price_id = 'price_yyyyy' WHERE name = 'standard';
UPDATE plans SET stripe_price_id = 'price_zzzzz' WHERE name = 'premium';
```

#### 方法B: Stripe CLIで自動作成

```bash
# Stripe CLIをインストール (初回のみ)
# macOS
brew install stripe/stripe-cli/stripe

# ログイン
stripe login

# 商品と価格を作成
stripe products create --name="ベーシックプラン" --description="小規模な結婚式に最適なプラン"
stripe prices create --product=prod_xxx --currency=jpy --unit-amount=198000 --recurring[interval]=month
```

---

## データベース構造

### Planテーブル

プラン情報を格納:

```typescript
{
  plan_id: string          // プランID
  name: string             // プラン名 (basic, standard, premium)
  display_name: string     // 表示名
  description: string      // 説明
  price: Decimal           // 価格
  currency: string         // 通貨 (jpy)
  stripe_price_id: string  // StripeのPrice ID
  stripe_product_id: string // StripeのProduct ID
  max_storage_gb: number   // 最大ストレージ容量 (GB)
  max_media_count: number  // 最大メディア数
  features: JSON           // 機能一覧
  is_active: boolean       // 有効/無効
}
```

### Subscriptionテーブル

サブスクリプション状態を管理:

```typescript
{
  subscription_id: string           // サブスクリプションID
  wedding_id: string                // 結婚式ID
  plan_id: string                   // プランID
  stripe_subscription_id: string    // StripeのサブスクリプションID
  stripe_customer_id: string        // StripeのカスタマーID
  status: string                    // ステータス (active, canceled, past_due)
  current_period_start: DateTime    // 現在の期間開始日
  current_period_end: DateTime      // 現在の期間終了日
  cancel_at_period_end: boolean     // 期間終了時にキャンセル
  cancel_at: DateTime               // キャンセル予定日
  canceled_at: DateTime             // キャンセル実行日
}
```

### Paymentテーブル

支払い履歴を記録:

```typescript
{
  payment_id: string                // 支払いID
  wedding_id: string                // 結婚式ID
  stripe_payment_intent_id: string  // StripeのPaymentIntent ID
  stripe_charge_id: string          // StripeのCharge ID
  amount: Decimal                   // 金額
  currency: string                  // 通貨
  status: string                    // ステータス
  payment_method: string            // 支払い方法
  description: string               // 説明
  receipt_url: string               // 領収書URL
}
```

---

## APIエンドポイント

### 1. プラン一覧取得

```
GET /api/stripe/plans
```

**レスポンス:**
```json
{
  "plans": [
    {
      "plan_id": "xxx",
      "name": "basic",
      "display_name": "ベーシックプラン",
      "price": 1980,
      "currency": "jpy",
      "features": [...]
    }
  ]
}
```

### 2. チェックアウトセッション作成

```
POST /api/stripe/checkout
Authorization: Bearer {token}
Content-Type: application/json

{
  "planId": "plan_xxx",
  "weddingId": "wedding_uuid"
}
```

**レスポンス:**
```json
{
  "sessionId": "cs_xxx",
  "url": "https://checkout.stripe.com/..."
}
```

### 3. サブスクリプション情報取得

```
GET /api/stripe/subscription
Authorization: Bearer {token}
```

**レスポンス:**
```json
{
  "subscription": {
    "subscription_id": "xxx",
    "status": "active",
    "plan": {...},
    "current_period_end": "2025-11-23T..."
  }
}
```

### 4. サブスクリプションキャンセル

```
DELETE /api/stripe/subscription?immediate=false
Authorization: Bearer {token}
```

**パラメータ:**
- `immediate`: `true`で即座にキャンセル、`false`で期間終了時にキャンセル

### 5. サブスクリプション再開

```
PUT /api/stripe/subscription
Authorization: Bearer {token}
Content-Type: application/json

{
  "action": "reactivate"
}
```

### 6. Webhook受信

```
POST /api/stripe/webhooks
```

処理するイベント:
- `checkout.session.completed` - チェックアウト完了
- `customer.subscription.created` - サブスクリプション作成
- `customer.subscription.updated` - サブスクリプション更新
- `customer.subscription.deleted` - サブスクリプション削除
- `invoice.payment_succeeded` - 支払い成功
- `invoice.payment_failed` - 支払い失敗

---

## UIコンポーネント

### PricingPlans コンポーネント

プラン選択画面を表示:

```tsx
import PricingPlans from "@/components/subscription/PricingPlans";

<PricingPlans
  weddingId="wedding_uuid"
  onSuccess={() => console.log("Success")}
/>
```

**場所:** `/subscription/pricing`

### SubscriptionManager コンポーネント

サブスクリプション管理画面を表示:

```tsx
import SubscriptionManager from "@/components/subscription/SubscriptionManager";

<SubscriptionManager />
```

**場所:** `/subscription/manage`

---

## 使い方

### ユーザーフロー

1. **プラン選択**
   - `/subscription/pricing` にアクセス
   - 希望のプランを選択
   - 「このプランを選択」ボタンをクリック

2. **決済**
   - Stripe Checkoutページにリダイレクト
   - カード情報を入力
   - 支払いを完了

3. **成功**
   - `/subscription/success` にリダイレクト
   - サブスクリプションがアクティブに

4. **管理**
   - `/subscription/manage` でサブスクリプションを管理
   - キャンセルや再開が可能

---

## Webhook設定

### ローカル開発環境

Stripe CLIを使用してローカルでWebhookをテスト:

```bash
# Stripe CLIでWebhookリスニングを開始
stripe listen --forward-to localhost:3000/api/stripe/webhooks

# 出力される whsec_xxx を環境変数に設定
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 本番環境

1. [Stripe Dashboard](https://dashboard.stripe.com/) にログイン
2. **開発者** > **Webhook** に移動
3. **エンドポイントを追加** をクリック
4. エンドポイントURL: `https://yourdomain.com/api/stripe/webhooks`
5. リッスンするイベントを選択:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
6. 署名シークレット (whsec_xxx) を環境変数に設定

---

## トラブルシューティング

### 問題: "STRIPE_SECRET_KEY is not defined"

**解決策:**
- `.env.local`ファイルにStripe APIキーが正しく設定されているか確認
- 開発サーバーを再起動

### 問題: "このプランはStripeに登録されていません"

**解決策:**
- Stripeダッシュボードで商品と価格を作成
- データベースの`plans`テーブルの`stripe_price_id`を更新

### 問題: Webhookが動作しない

**解決策:**
- Webhook署名シークレットが正しく設定されているか確認
- ローカル開発では`stripe listen`を実行
- 本番環境ではWebhookエンドポイントが正しく設定されているか確認

### 問題: 決済後にサブスクリプションが作成されない

**解決策:**
- Webhookが正しく動作しているか確認
- Stripeダッシュボードでイベントログを確認
- サーバーログでエラーを確認

---

## テスト用カード番号

Stripeのテストモードで使用できるカード番号:

- **成功**: `4242 4242 4242 4242`
- **3Dセキュア認証が必要**: `4000 0027 6000 3184`
- **支払い失敗**: `4000 0000 0000 0002`
- **残高不足**: `4000 0000 0000 9995`

有効期限: 未来の日付
CVC: 任意の3桁
郵便番号: 任意

---

## 次のステップ

1. ✅ 環境変数を設定
2. ✅ データベースマイグレーションを実行
3. ✅ プランデータをシード
4. ✅ Stripeで商品と価格を作成
5. ✅ Webhookを設定
6. ✅ テスト決済を実行
7. 🚀 本番環境にデプロイ

---

## サポート

問題が発生した場合は、以下を確認してください:

- [Stripe公式ドキュメント](https://stripe.com/docs)
- [Next.js公式ドキュメント](https://nextjs.org/docs)
- プロジェクトのGitHub Issues

---

**実装完了日:** 2025-10-23
**Stripeバージョン:** API version 2024-12-18.acacia
