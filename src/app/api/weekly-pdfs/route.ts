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

// POST - Upload simplificado (arquivo já vem comprimido do cliente)
export async function POST(request: NextRequest) {
  try {
    console.log("📄 [PDF-UPLOAD] Recebendo arquivo já comprimido...")

    // Processar FormData
    const formData = await request.formData()
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

    const fileSizeMB = file.size / (1024 * 1024)
    console.log(`📊 [PDF-UPLOAD] Arquivo recebido: ${file.name} (${fileSizeMB.toFixed(2)}MB)`)

    // Verificação final de tamanho (já deve vir comprimido do cliente)
    if (fileSizeMB > 4.5) {
      return NextResponse.json(
        {
          error: `Arquivo ainda muito grande (${fileSizeMB.toFixed(1)}MB). Erro na compressão do cliente.`,
          success: false,
        },
        { status: 413 },
      )
    }

    // Fazer upload direto (arquivo já foi processado no cliente)
    const { addWeeklyPdf } = await import("@/app/lib/storage-optimized")
    const newPdf = await addWeeklyPdf(file, name)

    console.log("✅ [PDF-UPLOAD] Upload concluído com sucesso")

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
        errorMessage = "Upload demorou muito - tente novamente"
        statusCode = 408
      } else if (error.message.includes("413") || error.message.includes("Content Too Large")) {
        errorMessage = "Arquivo muito grande - erro na compressão"
        statusCode = 413
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
