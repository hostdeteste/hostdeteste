import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    console.log("🔍 [DEBUG] === VERIFICANDO CONFIGURAÇÃO ===")

    // Verificar variáveis de ambiente
    const envVars = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      CLOUDFLARE_R2_ACCOUNT_ID: !!process.env.CLOUDFLARE_R2_ACCOUNT_ID,
      CLOUDFLARE_R2_ACCESS_KEY_ID: !!process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: !!process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      CLOUDFLARE_R2_BUCKET_NAME: !!process.env.CLOUDFLARE_R2_BUCKET_NAME,
    }

    console.log("🔍 [DEBUG] Variáveis de ambiente:", envVars)

    // Testar conexão Supabase
    const supabaseTest = { connected: false, error: null, tableExists: false }
    try {
      const { createClient } = await import("@supabase/supabase-js")
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

      // Testar conexão básica
      const { data, error } = await supabase.from("weekly_pdfs").select("count").limit(1)

      if (error) {
        supabaseTest.error = error.message
      } else {
        supabaseTest.connected = true
        supabaseTest.tableExists = true
      }
    } catch (error) {
      supabaseTest.error = error instanceof Error ? error.message : String(error)
    }

    console.log("🔍 [DEBUG] Teste Supabase:", supabaseTest)

    // Testar configuração R2
    const r2Test = { configured: false, error: null }
    try {
      const { S3Client } = await import("@aws-sdk/client-s3")

      const r2Client = new S3Client({
        region: "auto",
        endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
        },
      })

      r2Test.configured = true
    } catch (error) {
      r2Test.error = error instanceof Error ? error.message : String(error)
    }

    console.log("🔍 [DEBUG] Teste R2:", r2Test)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: envVars,
      supabase: supabaseTest,
      r2: r2Test,
      bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME || "coutyfil-assets",
      publicUrl: "https://pub-bd3bd83c1f864ad880a287c264da1ae3.r2.dev",
    })
  } catch (error) {
    console.error("❌ [DEBUG] Erro no diagnóstico:", error)

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
