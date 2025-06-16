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
  // CONFIGURAÇÃO CRÍTICA PARA UPLOADS GRANDES
  experimental: {
    serverComponentsExternalPackages: ["@aws-sdk/client-s3"],
    // Aumentar limite de body para 20MB
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
}

export default nextConfig
