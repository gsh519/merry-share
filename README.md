# Merry Share

Next.js + Prisma + MySQL を使ったファイル共有アプリケーションの開発環境。

## 開発環境の起動

```bash
# 開発環境の起動
docker-compose -f docker-compose.dev.yml up --build

# データベースのマイグレーション
docker-compose -f docker-compose.dev.yml exec app npm run db:push

# Prisma Studioの起動（別ターミナル）
docker-compose -f docker-compose.dev.yml exec app npm run db:studio
```

## アクセス

- アプリケーション: http://localhost:3000
- MySQL: localhost:3306
- Prisma Studio: http://localhost:5555

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router)
- **スタイリング**: Tailwind CSS
- **ORM**: Prisma
- **データベース**: MySQL 8.0 (PlanetScale互換)
- **開発環境**: Docker + Docker Compose

## ディレクトリ構造

```
merry-share/
├── src/
│   ├── app/          # Next.js App Router
│   └── lib/          # ユーティリティ
├── prisma/           # Prismaスキーマ
├── mysql/            # MySQL初期化スクリプト
└── docker-compose.dev.yml  # 開発環境用
```