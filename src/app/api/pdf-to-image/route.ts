import { NextResponse } from "next/server"
import * as pdfjsLib from "pdfjs-dist"
import { createCanvas } from "canvas"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const pdfUrl = searchParams.get("url")

    if (!pdfUrl) {
      return NextResponse.json({ error: "URL do PDF é obrigatória" }, { status: 400 })
    }

    const pdfResponse = await fetch(pdfUrl)
    if (!pdfResponse.ok) {
      throw new Error(`Erro ao buscar PDF: ${pdfResponse.status}`)
    }

    const pdfBuffer = await pdfResponse.arrayBuffer()

    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

    const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise
    const page = await pdf.getPage(1)

    const viewport = page.getViewport({ scale: 2.0 })
    const canvas = createCanvas(viewport.width, viewport.height)
    const context = canvas.getContext("2d")

    // CAST para 'any' para evitar erro TS
    await page.render({
      canvasContext: context as any,
      viewport,
    }).promise

    const imageBuffer = canvas.toBuffer("image/png")

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error) {
    console.error("❌ [PDF-TO-IMAGE] Erro:", error)
    return NextResponse.json({
      error: "Erro ao converter PDF para imagem",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    }, { status: 500 })
  }
}
