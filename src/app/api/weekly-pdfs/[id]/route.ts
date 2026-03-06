import { NextResponse } from "next/server"
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { deletePdf, getPdfs } from "@/app/lib/storage-optimized"

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

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: pdfId } = await params

    if (!pdfId) {
      return NextResponse.json({ error: "ID do PDF e obrigatorio", success: false }, { status: 400 })
    }

    // Buscar o PDF
    const pdfs = getPdfs()
    const pdf = pdfs.find((p) => p.id === pdfId)

    if (!pdf) {
      return NextResponse.json({ error: "PDF nao encontrado", success: false }, { status: 404 })
    }

    // Deletar do R2 se configurado
    if (r2Client && pdf.file_path) {
      try {
        await r2Client.send(
          new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: pdf.file_path,
          }),
        )
        console.log("✅ [PDFS] Arquivo deletado do R2")
      } catch (fileError) {
        console.error("Erro ao deletar arquivo do R2:", fileError)
      }
    }

    // Deletar da memória
    const deleted = deletePdf(pdfId)

    if (!deleted) {
      return NextResponse.json({ error: "Erro ao deletar PDF", success: false }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "PDF e seu arquivo foram deletados com sucesso",
      deletedPdfId: pdfId,
      pdfName: pdf.name,
      fileDeleted: r2Client && !!pdf.file_path,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Erro ao deletar PDF",
        details: error instanceof Error ? error.message : "Erro desconhecido",
        success: false,
      },
      { status: 500 },
    )
  }
}
