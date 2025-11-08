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
  // Note: App Routerでは、ボディサイズ制限は各ルートハンドラーで個別に設定します
  // Pages Routerの'api'設定はApp Routerでは使用されません
}

module.exports = nextConfig