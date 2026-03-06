import { NextResponse } from "next/server"
import { loadWeeklyPdfsFromCloud, addWeeklyPdf } from "@/app/lib/storage-optimized"

export const dynamic = "force-dynamic"

const MAX_PDF_SIZE_MB = 2.5
const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024

// GET
export async function GET() {
  try {
    const pdfs = await loadWeeklyPdfsFromCloud()
    const latest = pdfs.length > 0 ? pdfs[0] : null

    return NextResponse.json(
      {
        pdfs,
        latest,
        success: true,
        timestamp: new Date().toISOString(),
        maxSizeMB: MAX_PDF_SIZE_MB,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      },
    )
  } catch (error) {
    return NextResponse.json(
      {
        pdfs: [],
        latest: null,
        success: false,
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 200 },
    )
  }
}

// POST
export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const name = formData.get("name") as string

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado", success: false }, { status: 400 })
    }
    if (!name) {
      return NextResponse.json({ error: "Nome e obrigatorio", success: false }, { status: 400 })
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Apenas arquivos PDF sao permitidos", success: false }, { status: 400 })
    }
    if (file.size > MAX_PDF_SIZE_BYTES) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
      return NextResponse.json(
        {
          error: `PDF muito grande (${fileSizeMB}MB). O limite maximo e ${MAX_PDF_SIZE_MB}MB.`,
          success: false,
        },
        { status: 400 },
      )
    }

    const newPdf = await addWeeklyPdf(file, name)

    return NextResponse.json({
      pdf: newPdf,
      success: true,
      message: `PDF enviado com sucesso (${(file.size / 1024 / 1024).toFixed(2)}MB)!`,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : String(error),
        success: false,
      },
      { status: 500 },
    )
  }
}
