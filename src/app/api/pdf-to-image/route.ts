// app/api/pdf-to-image/route.ts
export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pdfUrl = searchParams.get("url")

    if (!pdfUrl) {
      return NextResponse.json(
        { error: "URL do PDF é obrigatória" },
        { status: 400 }
      )
    }

    // 1) Fetch do PDF
    const pdfResponse = await fetch(pdfUrl)
    if (!pdfResponse.ok) {
      throw new Error(`Erro ao buscar PDF: ${pdfResponse.status}`)
    }
    const pdfBuffer = await pdfResponse.arrayBuffer()

    // 2) Importar PDF.js (modo legacy)
    // @ts-ignore – as declarações de tipo não existem neste caminho
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.js")

    // 3) Carregar o PDF e obter a 1ª página
    const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise
    const page = await pdf.getPage(1)

    // 4) Criar canvas no Node
    const viewport = page.getViewport({ scale: 2.0 })
    const { createCanvas } = await import("canvas")
    const canvas = createCanvas(viewport.width, viewport.height)
    const context = canvas.getContext("2d")

    // 5) Renderizar página no canvas
    await page.render({
      canvasContext: context,
      viewport,
    }).promise

    // 6) Exportar como PNG
    const imageBuffer = canvas.toBuffer("image/png")

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600", // 1 hora
      },
    })
  } catch (error) {
    console.error("❌ [PDF-TO-IMAGE] Erro:", error)
    return NextResponse.json(
      {
        error: "Erro ao converter PDF para imagem",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    )
  }
}
