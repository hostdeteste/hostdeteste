import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const maxDuration = 60
export const runtime = "nodejs"

// Configurar limite maior para esta rota específica
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
}

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

// POST - Upload com compressão automática
export async function POST(request: NextRequest) {
  try {
    console.log("📄 [PDF-UPLOAD] Iniciando upload com compressão automática...")

    // Processar FormData primeiro
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (error) {
      console.error("❌ [PDF-UPLOAD] Erro ao processar FormData:", error)
      return NextResponse.json(
        {
          error: "Erro ao processar arquivo. Pode estar muito grande ou corrompido.",
          success: false,
          details: error instanceof Error ? error.message : "Erro desconhecido",
        },
        { status: 400 },
      )
    }

    const file = formData.get("file") as File
    const name = formData.get("name") as string

    // Validações básicas
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

    const originalSizeMB = file.size / (1024 * 1024)
    console.log(`📊 [PDF-UPLOAD] Arquivo recebido: ${file.name} (${originalSizeMB.toFixed(2)}MB)`)

    // Aplicar compressão automática se necessário
    let processedFile = file
    let compressionInfo = null

    try {
      // Importar compressor dinamicamente
      const { PDFCompressor } = await import("@/app/lib/pdf-compressor")

      if (PDFCompressor.needsCompression(file.size)) {
        console.log(`🔄 [PDF-UPLOAD] Aplicando compressão automática...`)

        const compressionResult = await PDFCompressor.compressPDF(file)

        if (compressionResult.wasCompressed) {
          // Criar novo File object com o buffer comprimido
          const compressedBlob = new Blob([compressionResult.compressedBuffer], {
            type: "application/pdf",
          })

          processedFile = new File([compressedBlob], file.name, {
            type: "application/pdf",
            lastModified: file.lastModified,
          })

          compressionInfo = {
            originalSize: compressionResult.originalSize,
            compressedSize: compressionResult.compressedSize,
            compressionRatio: compressionResult.compressionRatio,
            savedMB: (compressionResult.originalSize - compressionResult.compressedSize) / (1024 * 1024),
          }

          console.log(`✅ [PDF-UPLOAD] Compressão concluída:`)
          console.log(`   Original: ${originalSizeMB.toFixed(2)}MB`)
          console.log(`   Comprimido: ${(compressionResult.compressedSize / (1024 * 1024)).toFixed(2)}MB`)
          console.log(`   Economia: ${compressionInfo.savedMB.toFixed(2)}MB`)
        }
      } else {
        console.log(`✅ [PDF-UPLOAD] Arquivo já está no tamanho ideal, sem compressão necessária`)
      }
    } catch (compressionError) {
      console.error("⚠️ [PDF-UPLOAD] Erro na compressão, usando arquivo original:", compressionError)

      // Se a compressão falhar, verificar se o arquivo original ainda pode ser usado
      if (originalSizeMB > 4.5) {
        return NextResponse.json(
          {
            error: `Arquivo muito grande (${originalSizeMB.toFixed(1)}MB) e falha na compressão automática. Use uma ferramenta externa para comprimir.`,
            success: false,
            details: compressionError instanceof Error ? compressionError.message : "Erro na compressão",
          },
          { status: 413 },
        )
      }
    }

    // Verificar tamanho final
    const finalSizeMB = processedFile.size / (1024 * 1024)
    if (finalSizeMB > 4.5) {
      return NextResponse.json(
        {
          error: `PDF ainda muito grande após compressão (${finalSizeMB.toFixed(1)}MB). Use uma ferramenta externa.`,
          success: false,
        },
        { status: 413 },
      )
    }

    console.log(`📊 [PDF-UPLOAD] Processando arquivo final: ${finalSizeMB.toFixed(2)}MB`)

    // Fazer upload do arquivo processado
    const { addWeeklyPdf } = await import("@/app/lib/storage-optimized")
    const newPdf = await addWeeklyPdf(processedFile, name)

    console.log("✅ [PDF-UPLOAD] Upload concluído com sucesso")

    return NextResponse.json({
      pdf: newPdf,
      success: true,
      compression: compressionInfo,
    })
  } catch (error) {
    console.error("❌ [PDF-UPLOAD] Erro geral:", error)

    let errorMessage = "Erro ao fazer upload do PDF"
    let statusCode = 500

    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        errorMessage = "Upload demorou muito - tente um arquivo menor"
        statusCode = 408
      } else if (error.message.includes("413") || error.message.includes("Content Too Large")) {
        errorMessage = "Arquivo muito grande mesmo após compressão. Use uma ferramenta externa."
        statusCode = 413
      } else if (error.message.includes("FormData")) {
        errorMessage = "Erro ao processar arquivo - pode estar corrompido ou muito grande"
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
