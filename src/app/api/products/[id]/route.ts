import { NextResponse } from "next/server"
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { deleteProduct, getProducts } from "@/app/lib/storage-optimized"

export const dynamic = "force-dynamic"

// Configurações do R2 (opcional)
const hasR2Config = !!(
  process.env.CLOUDFLARE_R2_ACCOUNT_ID &&
  process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
  process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
)

const r2Client = hasR2Config
  ? new S3Client({
      region: "auto",
      endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    })
  : null

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || "coutyfil-assets"
const R2_PUBLIC_URL = "https://pub-92501dd4f797413a9775e615967d81ba.r2.dev"

// DELETE - Deletar produto específico e sua imagem
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: productId } = await params

    if (!productId) {
      return NextResponse.json({ error: "ID do produto é obrigatório", success: false }, { status: 400 })
    }

    console.log(`🗑️ [PRODUCTS] Deletando produto ${productId} DEFINITIVAMENTE`)

    // 1. Buscar o produto para obter a URL da imagem
    const products = getProducts()
    const product = products.find((p) => p.id === productId)

    if (!product) {
      return NextResponse.json({ error: "Produto não encontrado", success: false }, { status: 404 })
    }

    // 2. Deletar a imagem do R2 se ela existir e for do nosso domínio
    if (r2Client && product.image && product.image.includes(R2_PUBLIC_URL)) {
      try {
        // Extrair o caminho do arquivo da URL
        const imageUrl = new URL(product.image)
        const filePath = imageUrl.pathname.startsWith("/") ? imageUrl.pathname.substring(1) : imageUrl.pathname

        console.log(`🖼️ [PRODUCTS] Deletando imagem: ${filePath} do bucket ${BUCKET_NAME}`)

        await r2Client.send(
          new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: filePath,
          }),
        )

        console.log("✅ [PRODUCTS] Imagem deletada com sucesso do R2")
      } catch (imageError) {
        console.error("⚠️ [PRODUCTS] Erro ao deletar imagem do R2:", imageError)
        // Continuamos mesmo se houver erro na deleção da imagem
      }
    } else {
      console.log("ℹ️ [PRODUCTS] Produto não tem imagem no R2 ou R2 não configurado")
    }

    // 3. Deletar o produto da memória
    const deleted = deleteProduct(productId)

    if (!deleted) {
      return NextResponse.json({ error: "Erro ao deletar produto", success: false }, { status: 500 })
    }

    console.log(`✅ [PRODUCTS] Produto ${productId} deletado com sucesso`)

    return NextResponse.json({
      success: true,
      message: "Produto e sua imagem foram deletados com sucesso",
      deletedProductId: productId,
      productName: product.name,
      imageDeleted: r2Client && product.image && product.image.includes(R2_PUBLIC_URL),
    })
  } catch (error) {
    console.error("❌ [PRODUCTS] Erro ao deletar produto:", error)
    return NextResponse.json(
      {
        error: "Erro ao deletar produto",
        details: error instanceof Error ? error.message : "Erro desconhecido",
        success: false,
      },
      { status: 500 },
    )
  }
}
