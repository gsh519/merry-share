/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use 'standalone' output for Docker, but not for Vercel
  // Vercel automatically handles build optimization
  ...(process.env.VERCEL !== '1' && { output: 'standalone' }),
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'sharp'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
    ],
  },
  // API Routeのボディサイズ制限を設定（スマホからの大容量アップロードに対応）
  api: {
    bodyParser: {
      sizeLimit: '150mb',
    },
  },
}

module.exports = nextConfig