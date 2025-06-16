import { NextResponse } from "next/server"

export const dynamic = "force-dynamic" // Corrigido: era "force_dynamic"
export const maxDuration = 60 // Máximo permitido no Vercel Hobby
export const runtime = "nodejs"

// GET - Carregar PDFs semanais
export async function GET() {
  try {
    const { loadWeeklyPdfsFromCloud, getLatestWeeklyPdf } = await import("@/app/lib/storage-optimized")
    const pdfs = await loadWeeklyPdfsFromCloud()
    const latest = await getLatestWeeklyPdf()

    return NextResponse.json({
      pdfs,
      latest,
      success: true,
      cached: true,
    })
  } catch (error) {
    console.error("❌ Erro ao carregar PDFs:", error)
    return NextResponse.json(
      {
        pdfs: [],
        latest: null,
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

// POST - Upload com limite do Vercel (4.5MB)
export async function POST(request: Request) {
  try {
    console.log("📄 [PDF-UPLOAD] Iniciando upload...")

    // Verificar Content-Length antes de processar
    const contentLength = request.headers.get("content-length")
    if (contentLength) {
      const sizeMB = Number.parseInt(contentLength) / (1024 * 1024)
      console.log(`📏 [PDF-UPLOAD] Tamanho: ${sizeMB.toFixed(2)}MB`)

      // Limite real do Vercel Hobby é ~4.5MB
      if (sizeMB > 4.5) {
        return NextResponse.json(
          {
            error: `Arquivo muito grande (${sizeMB.toFixed(1)}MB). Limite do Vercel: 4.5MB`,
            success: false,
            suggestion: "Comprima o PDF usando ferramentas online antes de fazer upload",
          },
          { status: 413 },
        )
      }
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const name = formData.get("name") as string

    // Validações
    if (!file) {
      return NextResponse.json(
        {
          error: "Nenhum arquivo enviado",
          success: false,
        },
        { status: 400 },
      )
    }

    if (!name) {
      return NextResponse.json(
        {
          error: "Nome é obrigatório",
          success: false,
        },
        { status: 400 },
      )
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        {
          error: "Apenas arquivos PDF são permitidos",
          success: false,
        },
        { status: 400 },
      )
    }

    // Verificar tamanho do arquivo novamente
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > 4.5) {
      return NextResponse.json(
        {
          error: `PDF muito grande (${fileSizeMB.toFixed(1)}MB). Máximo: 4.5MB`,
          success: false,
          suggestion: "Use uma ferramenta de compressão de PDF online",
        },
        { status: 413 },
      )
    }

    console.log(`📊 [PDF-UPLOAD] Arquivo válido: ${file.name} (${fileSizeMB.toFixed(2)}MB)`)

    const { addWeeklyPdf } = await import("@/app/lib/storage-optimized")
    const newPdf = await addWeeklyPdf(file, name)

    console.log("✅ [PDF-UPLOAD] Upload concluído")

    return NextResponse.json({
      pdf: newPdf,
      success: true,
    })
  } catch (error) {
    console.error("❌ [PDF-UPLOAD] Erro:", error)

    let errorMessage = "Erro ao fazer upload do PDF"
    let statusCode = 500

    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        errorMessage = "Upload demorou muito - tente um arquivo menor"
        statusCode = 408
      } else if (error.message.includes("FormData")) {
        errorMessage = "Erro ao processar arquivo - pode estar corrompido"
        statusCode = 400
      } else {
        errorMessage = error.message
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.message : "Erro desconhecido",
        success: false,
      },
      { status: statusCode },
    )
  }
}
