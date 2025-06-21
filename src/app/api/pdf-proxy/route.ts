import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pdfUrl = searchParams.get("url")

    if (!pdfUrl) {
      return new NextResponse("URL do PDF é obrigatória", { status: 400 })
    }

    console.log(`🔄 [PDF-PROXY] Buscando PDF: ${pdfUrl}`)

    // Buscar o PDF do R2 com timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 segundos timeout

    try {
      const response = await fetch(pdfUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; PDF-Proxy/1.0)",
          Accept: "application/pdf,*/*",
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error(`❌ [PDF-PROXY] Erro ao buscar PDF: ${response.status} ${response.statusText}`)
        return new NextResponse(`Erro ao buscar PDF: ${response.status} ${response.statusText}`, {
          status: response.status,
        })
      }

      const contentType = response.headers.get("content-type")
      if (contentType && !contentType.includes("pdf")) {
        console.warn(`⚠️ [PDF-PROXY] Content-Type inesperado: ${contentType}`)
      }

      const pdfBuffer = await response.arrayBuffer()
      console.log(`✅ [PDF-PROXY] PDF servido com sucesso (${(pdfBuffer.byteLength / 1024 / 1024).toFixed(2)}MB)`)

      // Retornar o PDF com headers apropriados
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Length": pdfBuffer.byteLength.toString(),
          "Cache-Control": "public, max-age=86400", // Cache por 24 horas
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type",
          // Headers para resolver problemas de fullscreen
          "Permissions-Policy": "fullscreen=*",
          "X-Frame-Options": "SAMEORIGIN",
          "Content-Security-Policy": "frame-ancestors 'self'",
          // Headers para melhor compatibilidade
          "X-Content-Type-Options": "nosniff",
          "Accept-Ranges": "bytes",
        },
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)

      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        console.error("❌ [PDF-PROXY] Timeout ao buscar PDF")
        return new NextResponse("Timeout ao buscar PDF", { status: 504 })
      }

      console.error("❌ [PDF-PROXY] Erro no fetch:", fetchError)
      throw fetchError
    }
  } catch (error) {
    console.error("❌ [PDF-PROXY] Erro interno:", error)
    return new NextResponse(
      `Erro interno do servidor: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      {
        status: 500,
      },
    )
  }
}
