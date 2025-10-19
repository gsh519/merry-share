import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Cloudflare R2 クライアントの初期化
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

/**
 * R2にファイルをアップロードする
 * @param file - アップロードするファイル
 * @param key - R2内でのファイルキー（パス）
 * @returns アップロードされたファイルの公開URL
 */
export async function uploadToR2(file: File, key: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: buffer,
    ContentType: file.type,
  });

  await r2Client.send(command);

  // 公開URLを生成
  const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
  return publicUrl;
}

/**
 * ファイル名からユニークなキーを生成
 * @param weddingId - 結婚式ID
 * @param fileName - 元のファイル名
 * @returns R2用のユニークなキー
 */
export function generateR2Key(weddingId: string, fileName: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 15);
  const ext = fileName.split('.').pop();

  // weddings/{wedding_id}/{timestamp}_{random}.{ext}
  return `weddings/${weddingId}/${timestamp}_${randomStr}.${ext}`;
}
