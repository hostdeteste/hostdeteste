import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pdfUrl = searchParams.get("url")

    if (!pdfUrl) {
      return NextResponse.json({ error: "URL do PDF é obrigatória" }, { status: 400 })
    }

    console.log("🔄 [PDF-TO-IMAGE] Processando URL:", pdfUrl)

    // Fetch do PDF
    const pdfResponse = await fetch(pdfUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PDF-to-Image/1.0)',
      }
    })
    
    if (!pdfResponse.ok) {
      console.error("❌ [PDF-TO-IMAGE] Erro no fetch:", pdfResponse.status)
      throw new Error(`Erro ao buscar PDF: ${pdfResponse.status}`)
    }

    const pdfBuffer = await pdfResponse.arrayBuffer()
    console.log("✅ [PDF-TO-IMAGE] PDF baixado, tamanho:", pdfBuffer.byteLength)

    // Abordagem alternativa: usar PDF-lib ou retornar o PDF directamente como fallback
    // Por enquanto, vamos tentar uma abordagem mais simples
    
    try {
      // Tentar usar PDF.js
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs")
      
      // Configurar worker - usar versão local se possível
      if (typeof window === 'undefined') {
        // Servidor - usar worker local
        pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve("pdfjs-dist/build/pdf.worker.js")
      }

      // Carregar PDF
      const pdf = await pdfjsLib.getDocument({ 
        data: new Uint8Array(pdfBuffer),
        standardFontDataUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/"
      }).promise
      
      const page = await pdf.getPage(1)
      console.log("✅ [PDF-TO-IMAGE] Página carregada")

      // Usar canvas do Node.js
      const { createCanvas } = await import("canvas")
      
      const viewport = page.getViewport({ scale: 1.5 })
      const canvas = createCanvas(viewport.width, viewport.height)
      const context = canvas.getContext("2d")

      // Renderizar página
      await page.render({
        canvasContext: context as any,
        viewport: viewport,
      }).promise

      console.log("✅ [PDF-TO-IMAGE] Página renderizada")

      // Converter para PNG
      const imageBuffer = canvas.toBuffer("image/png")

      return new NextResponse(imageBuffer, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=3600",
          "Content-Length": imageBuffer.length.toString(),
        },
      })

    } catch (renderError) {
      console.error("❌ [PDF-TO-IMAGE] Erro na renderização:", renderError)
      
      // Fallback: retornar uma imagem placeholder
      return generatePlaceholderImage()
    }

  } catch (error) {
    console.error("❌ [PDF-TO-IMAGE] Erro geral:", error)
    return NextResponse.json(
      {
        error: "Erro ao converter PDF para imagem",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

// Função para gerar imagem placeholder
async function generatePlaceholderImage() {
  try {
    const { createCanvas } = await import("canvas")
    
    const canvas = createCanvas(400, 600)
    const ctx = canvas.getContext("2d")

    // Fundo branco
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, 400, 600)

    // Desenhar um placeholder
    ctx.fillStyle = "#ef4444"
    ctx.fillRect(50, 50, 300, 40)

    ctx.fillStyle = "#ffffff"
    ctx.font = "20px Arial"
    ctx.textAlign = "center"
    ctx.fillText("FOLHETO", 200, 75)

    ctx.fillStyle = "#6b7280"
    ctx.font = "16px Arial"
    ctx.fillText("Preview não disponível", 200, 300)
    ctx.fillText("Clique para abrir PDF completo", 200, 330)

    const buffer = canvas.toBuffer("image/png")
    
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300", // Cache menor para placeholder
      },
    })
  } catch (err) {
    console.error("❌ [PDF-TO-IMAGE] Erro ao gerar placeholder:", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}