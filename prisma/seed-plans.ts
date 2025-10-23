import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding pricing plans...");

  // Basic Plan
  const basicPlan = await prisma.plan.upsert({
    where: { name: "basic" },
    update: {},
    create: {
      name: "basic",
      display_name: "ベーシックプラン",
      description: "小規模な結婚式に最適なプラン",
      price: 1980,
      currency: "jpy",
      max_storage_gb: 10,
      max_media_count: 500,
      features: [
        "10GBのストレージ",
        "最大500枚の写真・動画",
        "QRコード共有",
        "基本的なギャラリー機能",
        "メールサポート",
      ],
      is_active: true,
    },
  });

  console.log("Created basic plan:", basicPlan);

  // Standard Plan
  const standardPlan = await prisma.plan.upsert({
    where: { name: "standard" },
    update: {},
    create: {
      name: "standard",
      display_name: "スタンダードプラン",
      description: "中規模な結婚式向けの充実したプラン",
      price: 3980,
      currency: "jpy",
      max_storage_gb: 50,
      max_media_count: 2000,
      features: [
        "50GBのストレージ",
        "最大2000枚の写真・動画",
        "QRコード共有",
        "高度なギャラリー機能",
        "ゲスト招待機能",
        "優先メールサポート",
        "カスタムブランディング",
      ],
      is_active: true,
    },
  });

  console.log("Created standard plan:", standardPlan);

  // Premium Plan
  const premiumPlan = await prisma.plan.upsert({
    where: { name: "premium" },
    update: {},
    create: {
      name: "premium",
      display_name: "プレミアムプラン",
      description: "大規模な結婚式向けの最上位プラン",
      price: 7980,
      currency: "jpy",
      max_storage_gb: 200,
      max_media_count: null, // Unlimited
      features: [
        "200GBのストレージ",
        "無制限の写真・動画",
        "QRコード共有",
        "プレミアムギャラリー機能",
        "無制限のゲスト招待",
        "24時間サポート",
        "フルカスタマイズ",
        "高解像度ダウンロード",
        "専用アカウントマネージャー",
      ],
      is_active: true,
    },
  });

  console.log("Created premium plan:", premiumPlan);

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error("Error seeding plans:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
