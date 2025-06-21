import { NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

export const dynamic = "force-dynamic"

// Configurações do R2
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || "coutyfil-assets"
const R2_PUBLIC_URL = "https://pub-92501dd4f797413a9775e615967d81ba.r2.dev"

// Função para upload de imagem
async function uploadImageToR2(file: File): Promise<string> {
  try {
    console.log(`🖼️ [UPLOAD] Fazendo upload de imagem: ${file.name}`)

    const fileName = `images/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    await r2Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
        ContentLength: buffer.length,
      }),
    )

    const imageUrl = `${R2_PUBLIC_URL}/${fileName}`
    console.log(`✅ [UPLOAD] Upload de imagem concluído: ${imageUrl}`)

    return imageUrl
  } catch (error) {
    console.error("💥 [UPLOAD] Erro no upload de imagem:", error)
    throw error
  }
}

export async function POST(request: Request) {
  try {
    console.log("🔄 [UPLOAD] === INICIANDO UPLOAD ===")

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      console.log("❌ [UPLOAD] Nenhum arquivo enviado")
      return NextResponse.json({ error: "Nenhum arquivo enviado", success: false }, { status: 400 })
    }

    console.log(`📁 [UPLOAD] Arquivo: ${file.name} (${file.size} bytes, ${file.type})`)

    // Validações
    if (!file.type.startsWith("image/")) {
      console.log("❌ [UPLOAD] Tipo de arquivo inválido:", file.type)
      return NextResponse.json({ error: "Apenas imagens são permitidas", success: false }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      console.log("❌ [UPLOAD] Arquivo muito grande:", file.size)
      return NextResponse.json({ error: "Imagem muito grande (máximo 5MB)", success: false }, { status: 400 })
    }

    try {
      console.log("🚀 [UPLOAD] Iniciando upload para R2...")
      const imageUrl = await uploadImageToR2(file)

      console.log("✅ [UPLOAD] Upload concluído com sucesso:", imageUrl)

      return NextResponse.json({
        url: imageUrl,
        success: true,
        method: "cloudflare-r2",
        filename: file.name,
        size: file.size,
        cached: true,
      })
    } catch (uploadError) {
      console.error("💥 [UPLOAD] ERRO NO UPLOAD:", uploadError)

      return NextResponse.json(
        {
          error: "Erro no upload para R2",
          details: uploadError instanceof Error ? uploadError.message : "Erro desconhecido",
          success: false,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("💥 [UPLOAD] ERRO GERAL:", error)

    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
        success: false,
      },
      { status: 500 },
    )
  }
}
