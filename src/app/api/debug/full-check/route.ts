import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const debug = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,

    // Verificar todas as variáveis
    envVars: {
      // Supabase
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,

      // Cloudflare R2
      CLOUDFLARE_R2_ACCOUNT_ID: !!process.env.CLOUDFLARE_R2_ACCOUNT_ID,
      CLOUDFLARE_R2_ACCESS_KEY_ID: !!process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: !!process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      CLOUDFLARE_R2_BUCKET_NAME: !!process.env.CLOUDFLARE_R2_BUCKET_NAME,

      // Admin
      ADMIN_PASSWORD: !!process.env.ADMIN_PASSWORD,
      JWT_SECRET: !!process.env.JWT_SECRET,
    },

    // Valores parciais (primeiros caracteres)
    envValues: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + "...",
      CLOUDFLARE_R2_ACCOUNT_ID: process.env.CLOUDFLARE_R2_ACCOUNT_ID?.substring(0, 10) + "...",
      CLOUDFLARE_R2_BUCKET_NAME: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    },
  }

  // Teste de conexão Supabase
  const supabaseTest = { connected: false, error: null, tablesExist: false }
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { createClient } = await import("@supabase/supabase-js")
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

      // Testar conexão
      const { data, error } = await supabase.from("products").select("count", { count: "exact" }).limit(1)

      if (error) {
        supabaseTest.error = error.message
      } else {
        supabaseTest.connected = true
        supabaseTest.tablesExist = true
      }
    }
  } catch (error) {
    supabaseTest.error = error instanceof Error ? error.message : String(error)
  }

  // Teste de conexão R2
  const r2Test = { connected: false, error: null, bucketExists: false }
  try {
    if (
      process.env.CLOUDFLARE_R2_ACCOUNT_ID &&
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
    ) {
      const { S3Client, HeadBucketCommand } = await import("@aws-sdk/client-s3")

      const r2Client = new S3Client({
        region: "auto",
        endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
        },
      })

      const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || "coutyfil-assets"

      await r2Client.send(new HeadBucketCommand({ Bucket: bucketName }))
      r2Test.connected = true
      r2Test.bucketExists = true
    }
  } catch (error) {
    r2Test.error = error instanceof Error ? error.message : String(error)
  }

  // Teste de PDFs - CORRIGIDO
  const pdfTest = { count: 0, error: null, latest: null }
  try {
    // Construir URL corretamente
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"

    console.log("🔍 [DEBUG] Testando URL:", `${baseUrl}/api/weekly-pdfs`)

    const response = await fetch(`${baseUrl}/api/weekly-pdfs`, {
      cache: "no-store",
      headers: {
        "User-Agent": "Debug-Check/1.0",
      },
    })

    console.log("📊 [DEBUG] Response status:", response.status)

    const data = await response.json()
    console.log("📋 [DEBUG] Response data:", data)

    if (data.success) {
      pdfTest.count = data.pdfs?.length || 0
      pdfTest.latest = data.latest?.name || null
    } else {
      pdfTest.error = data.error
    }
  } catch (error) {
    console.error("❌ [DEBUG] PDF test error:", error)
    pdfTest.error = error instanceof Error ? error.message : String(error)
  }

  return NextResponse.json({
    debug,
    tests: {
      supabase: supabaseTest,
      r2: r2Test,
      pdfs: pdfTest,
    },
    recommendations: generateRecommendations(debug, supabaseTest, r2Test, pdfTest),
  })
}

function generateRecommendations(debug: any, supabase: any, r2: any, pdfs: any): string[] {
  const recommendations = []

  // Verificar variáveis de ambiente
  const missingVars = Object.entries(debug.envVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key)

  if (missingVars.length > 0) {
    recommendations.push(`❌ Variáveis faltando: ${missingVars.join(", ")}`)
  }

  // Verificar Supabase
  if (!supabase.connected) {
    if (supabase.error?.includes('relation "products" does not exist')) {
      recommendations.push("🔧 Execute os scripts SQL para criar as tabelas no Supabase")
    } else if (supabase.error) {
      recommendations.push(`❌ Erro Supabase: ${supabase.error}`)
    }
  }

  // Verificar R2
  if (!r2.connected) {
    if (r2.error?.includes("NoSuchBucket")) {
      recommendations.push("📦 Crie o bucket 'coutyfil-assets' no Cloudflare R2")
    } else if (r2.error?.includes("InvalidAccessKeyId")) {
      recommendations.push("🔑 Verifique as credenciais do Cloudflare R2")
    } else if (r2.error) {
      recommendations.push(`❌ Erro R2: ${r2.error}`)
    }
  }

  // Verificar PDFs
  if (pdfs.count === 0 && !pdfs.error) {
    recommendations.push("📄 Nenhum PDF encontrado - faça o primeiro upload via /admin")
  }

  if (recommendations.length === 0) {
    recommendations.push("✅ Tudo configurado corretamente!")
  }

  return recommendations
}
