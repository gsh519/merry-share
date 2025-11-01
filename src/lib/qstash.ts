import { Client } from '@upstash/qstash';

if (!process.env.QSTASH_TOKEN) {
  throw new Error('QSTASH_TOKEN is not set in environment variables');
}

export const qstashClient = new Client({
  token: process.env.QSTASH_TOKEN,
});

export const QSTASH_CONFIG = {
  // QStashから呼ばれるエンドポイントのベースURL
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  // 処理のタイムアウト（秒）
  timeout: 300, // 5分
  // リトライ設定
  retries: 2,
};
