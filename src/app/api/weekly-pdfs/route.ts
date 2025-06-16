import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const maxDuration = 60 // 60 segundos para uploads grandes

// GET - Carregar PDFs semanais com cache
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

// POST - Adicionar novo PDF com melhor tratamento
export async function POST(request: Request) {
  try {
    console.log("📄 [PDF-UPLOAD] Iniciando upload...")

    const formData = await request.formData()
    const file = formData.get("file") as File
    const name = formData.get("name") as string

    // Validações detalhadas
    if (!file) {
      console.log("❌ [PDF-UPLOAD] Nenhum arquivo enviado")
      return NextResponse.json(
        {
          error: "Nenhum arquivo enviado",
          success: false,
        },
        { status: 400 },
      )
    }

    if (!name) {
      console.log("❌ [PDF-UPLOAD] Nome é obrigatório")
      return NextResponse.json(
        {
          error: "Nome é obrigatório",
          success: false,
        },
        { status: 400 },
      )
    }

    if (file.type !== "application/pdf") {
      console.log("❌ [PDF-UPLOAD] Tipo de arquivo inválido:", file.type)
      return NextResponse.json(
        {
          error: "Apenas arquivos PDF são permitidos",
          success: false,
        },
        { status: 400 },
      )
    }

    // Aumentar limite para 15MB
    if (file.size > 15 * 1024 * 1024) {
      console.log("❌ [PDF-UPLOAD] Arquivo muito grande:", file.size)
      return NextResponse.json(
        {
          error: "PDF muito grande (máximo 15MB)",
          success: false,
        },
        { status: 400 },
      )
    }

    console.log(`📊 [PDF-UPLOAD] Arquivo válido: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)

    const { addWeeklyPdf } = await import("@/app/lib/storage-optimized")
    const newPdf = await addWeeklyPdf(file, name)

    console.log("✅ [PDF-UPLOAD] Upload concluído com sucesso")

    return NextResponse.json({
      pdf: newPdf,
      success: true,
    })
  } catch (error) {
    console.error("❌ [PDF-UPLOAD] Erro detalhado:", error)

    // Tratamento específico de erros
    let errorMessage = "Erro ao fazer upload do PDF"

    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        errorMessage = "Timeout no upload - arquivo muito grande ou conexão lenta"
      } else if (error.message.includes("credentials")) {
        errorMessage = "Erro de credenciais R2"
      } else if (error.message.includes("bucket")) {
        errorMessage = "Erro no bucket R2"
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
      { status: 500 },
    )
  }
}
