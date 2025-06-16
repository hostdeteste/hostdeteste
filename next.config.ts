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
  // Configurações para uploads grandes
  experimental: {
    serverComponentsExternalPackages: ["@aws-sdk/client-s3"],
  },
  // Aumentar limite de body
  api: {
    bodyParser: {
      sizeLimit: "15mb",
    },
  },
}

export default nextConfig
