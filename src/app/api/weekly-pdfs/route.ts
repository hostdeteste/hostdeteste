import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const maxDuration = 60
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

// POST - Upload com debug detalhado
export async function POST(request: NextRequest) {
  console.log("📄 [PDF-UPLOAD] === INÍCIO DO UPLOAD ===")

  try {
    // 1. Verificar headers da requisição
    console.log("📋 [PDF-UPLOAD] Headers da requisição:")
    console.log("   Content-Type:", request.headers.get("content-type"))
    console.log("   Content-Length:", request.headers.get("content-length"))
    console.log("   User-Agent:", request.headers.get("user-agent"))

    // 2. Processar FormData com timeout
    console.log("🔄 [PDF-UPLOAD] Processando FormData...")
    let formData: FormData

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout ao processar FormData")), 30000),
      )

      formData = (await Promise.race([request.formData(), timeoutPromise])) as FormData
      console.log("✅ [PDF-UPLOAD] FormData processado com sucesso")
    } catch (formDataError) {
      console.error("❌ [PDF-UPLOAD] Erro ao processar FormData:", formDataError)
      return NextResponse.json(
        {
          error: "Erro ao processar arquivo enviado",
          details: formDataError instanceof Error ? formDataError.message : "Erro desconhecido",
          success: false,
        },
        { status: 400 },
      )
    }

    // 3. Extrair dados do FormData
    console.log("📂 [PDF-UPLOAD] Extraindo dados do FormData...")
    const file = formData.get("file") as File
    const name = formData.get("name") as string

    console.log("📊 [PDF-UPLOAD] Dados extraídos:")
    console.log("   File:", !!file ? `${file.name} (${file.size} bytes)` : "null")
    console.log("   Name:", name || "null")

    // 4. Validações básicas
    if (!file) {
      console.error("❌ [PDF-UPLOAD] Nenhum arquivo enviado")
      return NextResponse.json(
        {
          error: "Nenhum arquivo enviado",
          success: false,
        },
        { status: 400 },
      )
    }

    if (!name || name.trim() === "") {
      console.error("❌ [PDF-UPLOAD] Nome não fornecido")
      return NextResponse.json(
        {
          error: "Nome é obrigatório",
          success: false,
        },
        { status: 400 },
      )
    }

    if (file.type !== "application/pdf") {
      console.error("❌ [PDF-UPLOAD] Tipo de arquivo inválido:", file.type)
      return NextResponse.json(
        {
          error: "Apenas arquivos PDF são permitidos",
          success: false,
        },
        { status: 400 },
      )
    }

    const fileSizeMB = file.size / (1024 * 1024)
    console.log(`📊 [PDF-UPLOAD] Arquivo válido: ${file.name} (${fileSizeMB.toFixed(2)}MB)`)

    // 5. Verificação final de tamanho
    if (fileSizeMB > 4.5) {
      console.error(`❌ [PDF-UPLOAD] Arquivo muito grande: ${fileSizeMB.toFixed(2)}MB`)
      return NextResponse.json(
        {
          error: `Arquivo ainda muito grande (${fileSizeMB.toFixed(1)}MB). Erro na compressão do cliente.`,
          success: false,
        },
        { status: 413 },
      )
    }

    // 6. Verificar variáveis de ambiente
    console.log("🔧 [PDF-UPLOAD] Verificando configurações...")
    const requiredEnvVars = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "CLOUDFLARE_R2_ACCOUNT_ID",
      "CLOUDFLARE_R2_ACCESS_KEY_ID",
      "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
    ]

    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName])
    if (missingVars.length > 0) {
      console.error("❌ [PDF-UPLOAD] Variáveis de ambiente faltando:", missingVars)
      return NextResponse.json(
        {
          error: "Configuração do servidor incompleta",
          details: `Variáveis faltando: ${missingVars.join(", ")}`,
          success: false,
        },
        { status: 500 },
      )
    }

    console.log("✅ [PDF-UPLOAD] Todas as variáveis de ambiente estão configuradas")

    // 7. Importar e executar upload
    console.log("📤 [PDF-UPLOAD] Iniciando upload para storage...")

    try {
      const { addWeeklyPdf } = await import("@/app/lib/storage-optimized")
      console.log("✅ [PDF-UPLOAD] Módulo storage-optimized importado")

      const newPdf = await addWeeklyPdf(file, name.trim())
      console.log("✅ [PDF-UPLOAD] Upload concluído:", newPdf.id)

      return NextResponse.json({
        pdf: newPdf,
        success: true,
        message: "PDF enviado com sucesso!",
      })
    } catch (storageError) {
      console.error("❌ [PDF-UPLOAD] Erro no storage:", storageError)

      // Análise detalhada do erro de storage
      let errorMessage = "Erro ao salvar PDF no storage"
      let statusCode = 500

      if (storageError instanceof Error) {
        console.error("❌ [PDF-UPLOAD] Detalhes do erro:", {
          message: storageError.message,
          stack: storageError.stack,
          name: storageError.name,
        })

        if (storageError.message.includes("Supabase")) {
          errorMessage = "Erro na base de dados"
          statusCode = 503
        } else if (storageError.message.includes("R2") || storageError.message.includes("S3")) {
          errorMessage = "Erro no armazenamento de arquivos"
          statusCode = 503
        } else if (storageError.message.includes("timeout")) {
          errorMessage = "Timeout no upload - tente novamente"
          statusCode = 408
        } else {
          errorMessage = storageError.message
        }
      }

      return NextResponse.json(
        {
          error: errorMessage,
          details: storageError instanceof Error ? storageError.message : "Erro desconhecido no storage",
          success: false,
        },
        { status: statusCode },
      )
    }
  } catch (error) {
    console.error("❌ [PDF-UPLOAD] Erro geral não capturado:", error)

    // Log completo do erro para debug
    if (error instanceof Error) {
      console.error("❌ [PDF-UPLOAD] Stack trace:", error.stack)
    }

    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
        success: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  } finally {
    console.log("📄 [PDF-UPLOAD] === FIM DO UPLOAD ===")
  }
}
