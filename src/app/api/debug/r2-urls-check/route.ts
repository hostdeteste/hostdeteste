import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    console.log("🔍 [R2-CHECK] === VERIFICANDO TODAS AS URLs DO R2 ===")

    // Verificar variáveis de ambiente
    const envVars = {
      CLOUDFLARE_R2_ACCOUNT_ID: process.env.CLOUDFLARE_R2_ACCOUNT_ID,
      CLOUDFLARE_R2_ACCESS_KEY_ID: !!process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: !!process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      CLOUDFLARE_R2_BUCKET_NAME: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    }

    console.log("🔍 [R2-CHECK] Variáveis de ambiente:", envVars)

    // URLs que devem ser verificadas
    const urlsToCheck = [
      "https://pub-92501dd4f797413a9775e615967d81ba.r2.dev", // URL CORRETA
      "https://pub-bd3bd83c1f864ad880a287c264da1ae3.r2.dev", // URL ANTIGA (ERRADA)
    ]

    // Testar conectividade com cada URL
    const urlTests = []
    for (const url of urlsToCheck) {
      try {
        console.log(`🌐 [R2-CHECK] Testando URL: ${url}`)

        const testResponse = await fetch(url, {
          method: "HEAD",
          signal: AbortSignal.timeout(5000),
        })

        urlTests.push({
          url,
          status: testResponse.status,
          accessible: testResponse.ok,
          headers: Object.fromEntries(testResponse.headers.entries()),
        })

        console.log(`✅ [R2-CHECK] ${url} - Status: ${testResponse.status}`)
      } catch (error) {
        urlTests.push({
          url,
          status: "ERROR",
          accessible: false,
          error: error instanceof Error ? error.message : String(error),
        })

        console.log(`❌ [R2-CHECK] ${url} - Erro: ${error}`)
      }
    }

    // Verificar PDFs existentes no Supabase
    let pdfsInDatabase = []
    try {
      const { createClient } = await import("@supabase/supabase-js")
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

      const { data, error } = await supabase
        .from("weekly_pdfs")
        .select("id, name, url, file_path")
        .order("created_at", { ascending: false })
        .limit(5)

      if (!error && data) {
        pdfsInDatabase = data.map((pdf) => ({
          id: pdf.id,
          name: pdf.name,
          url: pdf.url,
          file_path: pdf.file_path,
          urlDomain: new URL(pdf.url).hostname,
          isCorrectDomain: pdf.url.includes("pub-92501dd4f797413a9775e615967d81ba"),
        }))
      }
    } catch (dbError) {
      console.error("❌ [R2-CHECK] Erro ao verificar PDFs no banco:", dbError)
    }

    // Construir URL esperada baseada no account ID
    const expectedR2Url = envVars.CLOUDFLARE_R2_ACCOUNT_ID
      ? `https://${envVars.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : "N/A"

    const expectedPublicUrl = "https://pub-92501dd4f797413a9775e615967d81ba.r2.dev"

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: envVars,
      expectedR2Url,
      expectedPublicUrl,
      urlTests,
      pdfsInDatabase,
      recommendations: [
        "1. Verificar se a URL pública está correta em todos os arquivos",
        "2. Verificar se os PDFs no banco usam a URL correta",
        "3. Se necessário, atualizar URLs dos PDFs existentes no banco",
        "4. Confirmar que o bucket está configurado para acesso público",
      ],
      filesToCheck: [
        "src/app/api/weekly-pdfs/route.ts",
        "src/app/lib/storage-optimized.ts",
        "src/app/api/upload/route.ts",
      ],
    })
  } catch (error) {
    console.error("❌ [R2-CHECK] Erro no diagnóstico:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
