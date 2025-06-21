import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pdfUrl = searchParams.get("url")

    if (!pdfUrl) {
      return NextResponse.json({ error: "URL do PDF é obrigatória" }, { status: 400 })
    }

    // Fetch do PDF
    const pdfResponse = await fetch(pdfUrl)
    if (!pdfResponse.ok) {
      throw new Error(`Erro ao buscar PDF: ${pdfResponse.status}`)
    }

    const pdfBuffer = await pdfResponse.arrayBuffer()

    // Usar PDF.js para converter primeira página em imagem
    // @ts-ignore
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.js")

    // Configurar worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"

    // Carregar PDF
    const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise
    const page = await pdf.getPage(1) // Primeira página

    // Configurar canvas
    const viewport = page.getViewport({ scale: 2.0 }) // Scale 2x para qualidade
    const canvas = new (await import("canvas")).Canvas(viewport.width, viewport.height)
    const context = canvas.getContext("2d")

    // Renderizar página
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise

    // Converter para PNG
    const imageBuffer = canvas.toBuffer("image/png")

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600", // Cache por 1 hora
      },
    })
  } catch (error) {
    console.error("❌ [PDF-TO-IMAGE] Erro:", error)
    return NextResponse.json(
      {
        error: "Erro ao converter PDF para imagem",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
