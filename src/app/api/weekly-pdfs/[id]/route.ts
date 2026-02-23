import { NextResponse } from "next/server"
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || "coutyfil-assets"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: pdfId } = await params

    if (!pdfId) {
      return NextResponse.json({ error: "ID do PDF e obrigatorio", success: false }, { status: 400 })
    }

    // Buscar o PDF
    const { data: pdf, error: fetchError } = await supabase.from("weekly_pdfs").select("*").eq("id", pdfId).single()

    if (fetchError) {
      return NextResponse.json(
        { error: "Erro ao buscar PDF", details: fetchError.message, success: false },
        { status: 500 },
      )
    }

    if (!pdf) {
      return NextResponse.json({ error: "PDF nao encontrado", success: false }, { status: 404 })
    }

    // Deletar do R2
    if (pdf.file_path) {
      try {
        await r2Client.send(
          new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: pdf.file_path,
          }),
        )
      } catch (fileError) {
        console.error("Erro ao deletar arquivo do R2:", fileError)
      }
    }

    // Deletar do Supabase
    const { error: deleteError } = await supabase.from("weekly_pdfs").delete().eq("id", pdfId)

    if (deleteError) {
      return NextResponse.json(
        { error: "Erro ao deletar PDF", details: deleteError.message, success: false },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "PDF e seu arquivo foram deletados com sucesso",
      deletedPdfId: pdfId,
      pdfName: pdf.name,
      fileDeleted: !!pdf.file_path,
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
