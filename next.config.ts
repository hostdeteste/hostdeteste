import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Configurações básicas otimizadas
  poweredByHeader: false,
  compress: true,

  // Suporte para pacotes externos no servidor (Next.js 15)
  serverExternalPackages: ["sharp", "pdf-lib", "@aws-sdk/client-s3", "@aws-sdk/s3-presigned-post"],

  // Headers de segurança
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ]
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Configurações de imagem
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    formats: ["image/webp", "image/avif"],
    unoptimized: true,
  },

  // Webpack config para otimizações
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Configurações para o cliente - adicionar pdf-lib
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      }
    }

    return config
  },
}

export default nextConfig
