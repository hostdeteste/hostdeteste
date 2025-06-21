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

    try {
      // Usar PDF.js com configurações específicas para fontes
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.js")
      
      // Configurar worker
      if (typeof window === 'undefined') {
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve("pdfjs-dist/build/pdf.worker.js")
        } catch (workerError) {
          console.log("⚠️ [PDF-TO-IMAGE] Worker local não encontrado, usando CDN")
          pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
        }
      }

      // Configurações melhoradas para carregar PDF
      const loadingTask = pdfjsLib.getDocument({ 
        data: new Uint8Array(pdfBuffer),
        // Configurações importantes para fontes
        useSystemFonts: true,
        disableFontFace: false,
        fontExtraProperties: true,
        // URLs para fontes padrão
        standardFontDataUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/",
        cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/",
        cMapPacked: true,
        // Reduzir verbosidade
        verbosity: 0,
      })
      
      const pdf = await loadingTask.promise
      const page = await pdf.getPage(1)
      console.log("✅ [PDF-TO-IMAGE] Página carregada")

      // Usar canvas do Node.js
      const { createCanvas } = await import("canvas")
      
      // Escala maior para melhor qualidade
      const scale = 2.0
      const viewport = page.getViewport({ scale })
      const canvas = createCanvas(viewport.width, viewport.height)
      const context = canvas.getContext("2d")

      // Configurar contexto para melhor renderização de texto
      context.textRenderingOptimization = "optimizeSpeed"
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = "high"

      console.log(`📏 [PDF-TO-IMAGE] Viewport: ${viewport.width}x${viewport.height}`)

      // Renderizar página com configurações específicas
      const renderContext = {
        canvasContext: context as any,
        viewport: viewport,
        // Configurações importantes para texto
        enableWebGL: false,
        renderInteractiveForms: false,
        // Tentar melhorar renderização de fontes
        optionalContentConfigPromise: null,
      }

      await page.render(renderContext).promise
      console.log("✅ [PDF-TO-IMAGE] Página renderizada com sucesso")

      // Converter para PNG
      const imageBuffer = canvas.toBuffer("image/png")
      console.log(`✅ [PDF-TO-IMAGE] Imagem gerada: ${imageBuffer.length} bytes`)

      return new NextResponse(imageBuffer, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=3600",
          "Content-Length": imageBuffer.length.toString(),
        },
      })

    } catch (renderError) {
      console.error("❌ [PDF-TO-IMAGE] Erro na renderização:", renderError)
      console.error("Stack trace:", renderError.stack)
      
      // Fallback melhorado
      return generatePlaceholderImage(true)
    }

  } catch (error) {
    console.error("❌ [PDF-TO-IMAGE] Erro geral:", error)
    return generatePlaceholderImage(false)
  }
}

// Função melhorada para gerar imagem placeholder
async function generatePlaceholderImage(pdfLoaded = false) {
  try {
    const { createCanvas } = await import("canvas")
    
    const canvas = createCanvas(400, 600)
    const ctx = canvas.getContext("2d")

    // Fundo gradiente
    const gradient = ctx.createLinearGradient(0, 0, 0, 600)
    gradient.addColorStop(0, "#f8fafc")
    gradient.addColorStop(1, "#e2e8f0")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 400, 600)

    // Header
    ctx.fillStyle = "#ef4444"
    ctx.fillRect(20, 20, 360, 60)
    ctx.shadowColor = "rgba(0,0,0,0.1)"
    ctx.shadowBlur = 10
    ctx.shadowOffsetY = 2

    // Texto "FOLHETO"
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 24px Arial, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("FOLHETO", 200, 50)

    // Reset shadow
    ctx.shadowColor = "transparent"
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0

    // Área do conteúdo
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(40, 120, 320, 400)
    ctx.strokeStyle = "#e5e7eb"
    ctx.lineWidth = 2
    ctx.strokeRect(40, 120, 320, 400)

    // Ícone de documento
    ctx.fillStyle = "#6b7280"
    ctx.fillRect(180, 220, 40, 60)
    ctx.fillStyle = "#ffffff"
    // Linhas do documento
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(185, 230 + (i * 8), 30, 3)
    }
    // Canto dobrado
    ctx.fillStyle = "#9ca3af"
    ctx.beginPath()
    ctx.moveTo(215, 220)
    ctx.lineTo(215, 235)
    ctx.lineTo(220, 220)
    ctx.closePath()
    ctx.fill()

    // Texto informativo
    ctx.fillStyle = "#374151"
    ctx.font = "18px Arial, sans-serif"
    ctx.textAlign = "center"
    
    if (pdfLoaded) {
      ctx.fillText("PDF carregado", 200, 320)
      ctx.fillStyle = "#6b7280"
      ctx.font = "14px Arial, sans-serif"
      ctx.fillText("Erro na renderização", 200, 345)
      ctx.fillText("Clique para abrir PDF original", 200, 365)
    } else {
      ctx.fillText("Preview não disponível", 200, 320)
      ctx.fillStyle = "#6b7280"
      ctx.font = "14px Arial, sans-serif"
      ctx.fillText("Clique para abrir PDF completo", 200, 345)
    }

    // Botão de ação visual
    ctx.fillStyle = "#10b981"
    ctx.fillRect(150, 400, 100, 35)
    ctx.fillStyle = "#ffffff"
    ctx.font = "14px Arial, sans-serif"
    ctx.fillText("Abrir PDF", 200, 420)

    const buffer = canvas.toBuffer("image/png")
    
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300",
      },
    })
  } catch (err) {
    console.error("❌ [PDF-TO-IMAGE] Erro ao gerar placeholder:", err)
    
    // Fallback final - SVG
    const svgContent = `
      <svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#f8fafc"/>
            <stop offset="100%" style="stop-color:#e2e8f0"/>
          </linearGradient>
        </defs>
        <rect width="400" height="600" fill="url(#bg)"/>
        <rect x="20" y="20" width="360" height="60" fill="#ef4444" rx="8"/>
        <text x="200" y="55" text-anchor="middle" fill="white" font-family="Arial" font-size="24" font-weight="bold">FOLHETO</text>
        <rect x="40" y="120" width="320" height="400" fill="white" stroke="#e5e7eb" stroke-width="2" rx="8"/>
        <rect x="180" y="220" width="40" height="60" fill="#6b7280"/>
        <rect x="185" y="230" width="30" height="3" fill="white"/>
        <rect x="185" y="238" width="30" height="3" fill="white"/>
        <rect x="185" y="246" width="30" height="3" fill="white"/>
        <rect x="185" y="254" width="30" height="3" fill="white"/>
        <text x="200" y="320" text-anchor="middle" fill="#374151" font-family="Arial" font-size="18">Preview indisponível</text>
        <text x="200" y="345" text-anchor="middle" fill="#6b7280" font-family="Arial" font-size="14">Clique para abrir PDF</text>
        <rect x="150" y="400" width="100" height="35" fill="#10b981" rx="4"/>
        <text x="200" y="420" text-anchor="middle" fill="white" font-family="Arial" font-size="14">Abrir PDF</text>
      </svg>
    `
    
    return new NextResponse(svgContent, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=300",
      },
    })
  }
}