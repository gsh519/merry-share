import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // ウェディングデータの作成
  const wedding = await prisma.wedding.create({
    data: {
      wedding_date: new Date('2025-06-15'),
      qr_code_path: '/qr-codes/sample-wedding.png',
    },
  });

  console.log(`Created wedding with id: ${wedding.wedding_id}`);

  // ユーザーデータの作成
  const user1 = await prisma.user.create({
    data: {
      wedding_id: wedding.wedding_id,
      user_name: '山田太郎',
      email: 'yamada@example.com',
      password: '$2a$10$dummyhashedpassword1234567890',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      wedding_id: wedding.wedding_id,
      user_name: '佐藤花子',
      email: 'sato@example.com',
      password: '$2a$10$dummyhashedpassword1234567890',
    },
  });

  console.log(`Created users: ${user1.user_name}, ${user2.user_name}`);

  // メディアデータの作成
  const mediaData = [
    {
      wedding_id: wedding.wedding_id,
      posted_user_name: '田中一郎',
      media_path: '/uploads/photo1.jpg',
    },
    {
      wedding_id: wedding.wedding_id,
      posted_user_name: '鈴木美咲',
      media_path: '/uploads/photo2.jpg',
    },
    {
      wedding_id: wedding.wedding_id,
      posted_user_name: '高橋健太',
      media_path: '/uploads/photo3.jpg',
    },
    {
      wedding_id: wedding.wedding_id,
      posted_user_name: '渡辺梨花',
      media_path: '/uploads/video1.mp4',
    },
    {
      wedding_id: wedding.wedding_id,
      posted_user_name: '伊藤大輔',
      media_path: '/uploads/photo4.jpg',
    },
    {
      wedding_id: wedding.wedding_id,
      posted_user_name: '中村優子',
      media_path: '/uploads/photo5.jpg',
    },
    {
      wedding_id: wedding.wedding_id,
      posted_user_name: '小林翔太',
      media_path: '/uploads/photo6.jpg',
    },
    {
      wedding_id: wedding.wedding_id,
      posted_user_name: '加藤あかり',
      media_path: '/uploads/photo7.jpg',
    },
    {
      wedding_id: wedding.wedding_id,
      posted_user_name: '吉田拓也',
      media_path: '/uploads/video2.mp4',
    },
    {
      wedding_id: wedding.wedding_id,
      posted_user_name: '山本舞',
      media_path: '/uploads/photo8.jpg',
    },
    {
      wedding_id: wedding.wedding_id,
      posted_user_name: '佐々木翼',
      media_path: '/uploads/photo9.jpg',
    },
    {
      wedding_id: wedding.wedding_id,
      posted_user_name: '松本彩香',
      media_path: '/uploads/photo10.jpg',
    },
    {
      wedding_id: wedding.wedding_id,
      posted_user_name: '井上蓮',
      media_path: '/uploads/photo11.jpg',
    },
    {
      wedding_id: wedding.wedding_id,
      posted_user_name: '木村萌',
      media_path: '/uploads/video3.mp4',
    },
    {
      wedding_id: wedding.wedding_id,
      posted_user_name: '林龍之介',
      media_path: '/uploads/photo12.jpg',
    },
    {
      wedding_id: wedding.wedding_id,
      posted_user_name: '斎藤結衣',
      media_path: '/uploads/photo13.jpg',
    },
    {
      wedding_id: wedding.wedding_id,
      posted_user_name: '清水颯',
      media_path: '/uploads/photo14.jpg',
    },
    {
      wedding_id: wedding.wedding_id,
      posted_user_name: '山口葵',
      media_path: '/uploads/photo15.jpg',
    },
    {
      wedding_id: wedding.wedding_id,
      posted_user_name: '森田陽菜',
      media_path: '/uploads/video4.mp4',
    },
    {
      wedding_id: wedding.wedding_id,
      posted_user_name: '池田航',
      media_path: '/uploads/photo16.jpg',
    },
  ];

  for (const data of mediaData) {
    const media = await prisma.media.create({
      data,
    });
    console.log(`Created media with id: ${media.media_id}`);
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
