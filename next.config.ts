/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Configuração corrigida para Next.js 15
  serverExternalPackages: ["@aws-sdk/client-s3"],
}

export default nextConfig
