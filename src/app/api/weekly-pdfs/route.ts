import { NextResponse } from "next/server"

// CONFIGURAÇÕES CRÍTICAS PARA UPLOADS GRANDES
export const dynamic = "force-dynamic"
export const maxDuration = 300 // 5 minutos para uploads grandes
export const runtime = "nodejs" // Garantir que usa Node.js runtime

// Configurar limite de body explicitamente
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb",
    },
    responseLimit: false,
  },
}

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

// POST - Adicionar novo PDF com configuração de limite
export async function POST(request: Request) {
  try {
    console.log("📄 [PDF-UPLOAD] Iniciando upload...")
    console.log("📊 [PDF-UPLOAD] Headers:", Object.fromEntries(request.headers.entries()))

    // Verificar Content-Length
    const contentLength = request.headers.get("content-length")
    if (contentLength) {
      const sizeMB = Number.parseInt(contentLength) / (1024 * 1024)
      console.log(`📏 [PDF-UPLOAD] Tamanho do request: ${sizeMB.toFixed(2)}MB`)

      if (sizeMB > 20) {
        return NextResponse.json(
          {
            error: "Arquivo muito grande - máximo 20MB permitido",
            success: false,
          },
          { status: 413 },
        )
      }
    }

    // Processar FormData com timeout maior
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Timeout ao processar FormData")), 60000) // 1 minuto
    })

    const formDataPromise = request.formData()
    const formData = (await Promise.race([formDataPromise, timeoutPromise])) as FormData

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

    // Verificar tamanho do arquivo
    if (file.size > 20 * 1024 * 1024) {
      console.log("❌ [PDF-UPLOAD] Arquivo muito grande:", file.size)
      return NextResponse.json(
        {
          error: "PDF muito grande (máximo 20MB)",
          success: false,
        },
        { status: 413 },
      )
    }

    console.log(`📊 [PDF-UPLOAD] Arquivo válido: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)

    const { addWeeklyPdf } = await import("@/app/lib/storage-optimized")

    // Upload com timeout maior
    const uploadTimeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Timeout no upload para R2")), 300000) // 5 minutos
    })

    const uploadPromise = addWeeklyPdf(file, name)
    const newPdf = await Promise.race([uploadPromise, uploadTimeoutPromise])

    console.log("✅ [PDF-UPLOAD] Upload concluído com sucesso")

    return NextResponse.json({
      pdf: newPdf,
      success: true,
    })
  } catch (error) {
    console.error("❌ [PDF-UPLOAD] Erro detalhado:", error)

    // Tratamento específico de erros
    let errorMessage = "Erro ao fazer upload do PDF"
    let statusCode = 500

    if (error instanceof Error) {
      if (error.message.includes("timeout") || error.message.includes("Timeout")) {
        errorMessage = "Upload demorou muito - tente um arquivo menor"
        statusCode = 408
      } else if (error.message.includes("FormData")) {
        errorMessage = "Erro ao processar arquivo - arquivo pode estar corrompido"
        statusCode = 400
      } else if (error.message.includes("credentials")) {
        errorMessage = "Erro de configuração do servidor"
        statusCode = 500
      } else if (error.message.includes("bucket")) {
        errorMessage = "Erro no armazenamento"
        statusCode = 500
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
