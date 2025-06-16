import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Configurações de produção otimizadas
  poweredByHeader: false,
  compress: true,

  // Suporte para pacotes externos no servidor (Next.js 15)
  serverExternalPackages: [
    "sharp",
    "pdf-lib", // Adicionar pdf-lib como pacote externo
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-presigned-post",
  ],

  // Configurações experimentais
  experimental: {
    // Aumentar limite de body para uploads de PDF
    serverComponentsHmrCache: false,
  },

  // Configurar limites de API
  api: {
    bodyParser: {
      sizeLimit: "10mb", // Permitir até 10MB no body parser
    },
    responseLimit: "10mb",
  },

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
    if (isServer) {
      // Configurações específicas do servidor
      config.externals = config.externals || []
      config.externals.push("pdf-lib")
    }

    return config
  },
}

export default nextConfig
