import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  console.log("🔍 [API-TEST] === TESTANDO API WEEKLY-PDFS ===")

  try {
    // Teste 1: Verificar variáveis de ambiente
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NODE_ENV: process.env.NODE_ENV,
    }

    console.log("🔧 [API-TEST] Variáveis:", envCheck)

    // Teste 2: Tentar importar Supabase
    const supabaseTest = { success: false, error: null }
    try {
      const { createClient } = await import("@supabase/supabase-js")
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

      // Teste simples
      const { data, error } = await supabase.from("weekly_pdfs").select("count", { count: "exact" }).limit(1)

      if (error) {
        supabaseTest.error = error.message
        console.log("❌ [API-TEST] Erro Supabase:", error.message)
      } else {
        supabaseTest.success = true
        console.log("✅ [API-TEST] Supabase OK")
      }
    } catch (error) {
      supabaseTest.error = error instanceof Error ? error.message : String(error)
      console.log("💥 [API-TEST] Erro ao conectar Supabase:", supabaseTest.error)
    }

    // Teste 3: Simular o que a API weekly-pdfs faz
    const apiSimulation = { success: false, error: null, pdfs: [] }
    try {
      if (supabaseTest.success) {
        const { createClient } = await import("@supabase/supabase-js")
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

        const { data, error } = await supabase
          .from("weekly_pdfs")
          .select("id, name, file_path, url, week, year, created_at")
          .order("created_at", { ascending: false })

        if (error) {
          apiSimulation.error = error.message
        } else {
          apiSimulation.success = true
          apiSimulation.pdfs = data || []
        }
      }
    } catch (error) {
      apiSimulation.error = error instanceof Error ? error.message : String(error)
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: envCheck,
      supabaseTest,
      apiSimulation,
      recommendations: [
        supabaseTest.success ? "✅ Supabase conectado" : "❌ Problema no Supabase",
        apiSimulation.success ? "✅ Query funcionando" : "❌ Problema na query",
        apiSimulation.pdfs.length > 0 ? `📄 ${apiSimulation.pdfs.length} PDFs encontrados` : "📭 Nenhum PDF na base",
      ],
    })
  } catch (error) {
    console.error("💥 [API-TEST] Erro geral:", error)

    return NextResponse.json(
      {
        error: "Erro no teste da API",
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null,
      },
      { status: 500 },
    )
  }
}
