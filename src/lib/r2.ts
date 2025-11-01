import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

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
 * @param buffer - アップロードするファイルのBuffer
 * @param key - R2内でのファイルキー（パス）
 * @param contentType - ファイルのMIMEタイプ
 * @param originalSize - 元のファイルサイズ（ログ用、オプション）
 * @returns アップロードされたファイルの公開URL
 */
export async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string,
  originalSize?: number
): Promise<string> {
  try {
    const logData: Record<string, unknown> = {
      key,
      contentType,
      optimizedSize: buffer.length
    };
    if (originalSize) {
      logData.originalSize = originalSize;
      logData.compressionRatio = `${((1 - buffer.length / originalSize) * 100).toFixed(1)}%`;
    }
    console.log('[R2] Starting upload:', logData);

    // 環境変数チェック
    if (!process.env.R2_BUCKET_NAME || !process.env.R2_PUBLIC_URL) {
      throw new Error('R2 environment variables are not set');
    }

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    console.log('[R2] Sending command to R2...');
    await r2Client.send(command);
    console.log('[R2] Upload successful');

    // 公開URLを生成
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    console.log('[R2] Public URL:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('[R2] Upload failed:', error);
    throw error;
  }
}

/**
 * R2からファイルを取得する
 * @param key - R2内でのファイルキー（パス）
 * @returns ファイルのBuffer
 */
export async function getFromR2(key: string): Promise<Buffer> {
  try {
    console.log('[R2] Fetching file:', key);

    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    });

    const response = await r2Client.send(command);

    if (!response.Body) {
      throw new Error('No file body returned from R2');
    }

    // ストリームをバッファに変換
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    console.log('[R2] File fetched successfully, size:', buffer.length);
    return buffer;
  } catch (error) {
    console.error('[R2] Fetch failed:', error);
    throw error;
  }
}

/**
 * R2からファイルを削除する
 * @param key - R2内でのファイルキー（パス）
 */
export async function deleteFromR2(key: string): Promise<void> {
  try {
    console.log('[R2] Deleting file:', key);

    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
    console.log('[R2] File deleted successfully');
  } catch (error) {
    console.error('[R2] Delete failed:', error);
    throw error;
  }
}

/**
 * ファイル名からユニークなキーを生成
 * @param weddingId - 結婚式ID
 * @param fileName - 元のファイル名
 * @param extension - 最適化後の拡張子（オプション、指定しない場合は元のファイルの拡張子を使用）
 * @returns R2用のユニークなキー
 */
export function generateR2Key(weddingId: string, fileName: string, extension?: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 15);
  const ext = extension || `.${fileName.split('.').pop()}`;

  // weddings/{wedding_id}/{timestamp}_{random}.{ext}
  return `weddings/${weddingId}/${timestamp}_${randomStr}${ext.startsWith('.') ? ext : '.' + ext}`;
}
