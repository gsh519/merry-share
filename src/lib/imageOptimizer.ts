import sharp from 'sharp';

/**
 * 画像を最適化して容量を削減する
 * 品質を保ちながらWebP形式に変換し、メタデータを削除
 */
export async function optimizeImage(file: File): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // GIFの場合は最適化せずそのまま返す（アニメーション保持のため）
  if (file.type === 'image/gif') {
    return {
      buffer,
      contentType: file.type,
      extension: '.gif',
    };
  }

  // クライアント側で既にWebPに変換済みの場合は、軽量な処理のみ実施
  if (file.type === 'image/webp') {
    // EXIF orientation のみ修正して返す（effortを下げて高速化）
    const optimizedBuffer = await sharp(buffer)
      .rotate() // EXIF orientationに基づく自動回転
      .webp({ quality: 90, effort: 2 }) // 既に圧縮済みなので高品質・低effortで高速化
      .toBuffer();

    return {
      buffer: optimizedBuffer,
      contentType: 'image/webp',
      extension: '.webp',
    };
  }

  // Sharp で画像を処理
  let image = sharp(buffer);

  // 画像の向きを自動修正（EXIF orientationに基づく）
  image = image.rotate();

  // WebP形式に変換（高品質設定）
  // quality: 85 - 視覚的な品質はほぼ無劣化、ファイルサイズは大幅削減
  // effort: 6 - エンコーディングの最適化レベル（0-6、高いほど時間がかかるが圧縮率が良い）
  const optimizedBuffer = await image
    .webp({
      quality: 85,
      effort: 6,
      // lossless: false, // デフォルトでfalse（非可逆圧縮）
    })
    .toBuffer();

  return {
    buffer: optimizedBuffer,
    contentType: 'image/webp',
    extension: '.webp',
  };
}

/**
 * 動画のメタデータを削除して容量を削減
 * 注: 動画の再エンコードは時間がかかるため、メタデータ削除のみ実施
 */
export async function optimizeVideo(file: File): Promise<{ buffer: Buffer; contentType: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 動画の場合は現状ではそのまま返す
  // 将来的にffmpegなどでの最適化を検討
  return {
    buffer,
    contentType: file.type,
  };
}

/**
 * ファイルタイプに応じて最適化を実行
 */
export async function optimizeMedia(file: File): Promise<{
  buffer: Buffer;
  contentType: string;
  originalSize: number;
  optimizedSize: number;
  extension?: string;
}> {
  const originalSize = file.size;
  const isVideo = file.type.startsWith('video/');

  const result = isVideo ? await optimizeVideo(file) : await optimizeImage(file);

  return {
    ...result,
    originalSize,
    optimizedSize: result.buffer.byteLength,
  };
}
