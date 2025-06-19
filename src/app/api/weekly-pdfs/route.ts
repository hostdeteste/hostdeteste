import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

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

// POST - Adicionar novo PDF
export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const name = formData.get("name") as string

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado", success: false }, { status: 400 })
    }

    if (!name) {
      return NextResponse.json({ error: "Nome é obrigatório", success: false }, { status: 400 })
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Apenas arquivos PDF são permitidos", success: false }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "PDF muito grande (máximo 10MB)", success: false }, { status: 400 })
    }

    const { addWeeklyPdf } = await import("@/app/lib/storage-optimized")
    const newPdf = await addWeeklyPdf(file, name)

    return NextResponse.json({
      pdf: newPdf,
      success: true,
    })
  } catch (error) {
    console.error("❌ Erro ao fazer upload do PDF:", error)
    return NextResponse.json(
      {
        error: "Erro ao fazer upload do PDF",
        details: error instanceof Error ? error.message : "Erro desconhecido",
        success: false,
      },
      { status: 500 },
    )
  }
}
