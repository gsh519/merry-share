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
}

module.exports = nextConfig