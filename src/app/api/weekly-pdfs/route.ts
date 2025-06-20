import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Tipos
interface WeeklyPdf {
  id: string
  name: string
  file_path: string
  url: string
  upload_date: string
  week: number
  year: number
  file_size?: number
}

// Cache local
let pdfsCache: WeeklyPdf[] | null = null
let pdfsCacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

// Funções auxiliares
function transformSupabasePdf(data: any): WeeklyPdf {
  return {
    id: data.id,
    name: data.name || "",
    file_path: data.file_path || "",
    url: data.url || "",
    upload_date: data.upload_date || new Date().toISOString(),
    week: data.week || 1,
    year: data.year || new Date().getFullYear(),
    file_size: data.file_size || 0,
  }
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

// Função para carregar PDFs
async function loadWeeklyPdfsFromSupabase(): Promise<WeeklyPdf[]> {
  try {
    console.log("🔄 [WEEKLY-PDFS] Carregando PDFs do Supabase...")

    // Verificar cache primeiro
    if (pdfsCache && Date.now() - pdfsCacheTime < CACHE_DURATION) {
      console.log("✅ [WEEKLY-PDFS] Usando cache de PDFs")
      return pdfsCache
    }

    // Verificar variáveis de ambiente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log("🔍 [WEEKLY-PDFS] Verificando variáveis:")
    console.log("- SUPABASE_URL:", !!supabaseUrl)
    console.log("- SERVICE_KEY:", !!supabaseServiceKey)

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variáveis Supabase não configuradas")
    }

    // Importar Supabase dinamicamente para evitar erros de build
    const { createClient } = await import("@supabase/supabase-js")
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log("📡 [WEEKLY-PDFS] Fazendo query no Supabase...")

    const { data, error } = await supabase.from("weekly_pdfs").select("*").order("upload_date", { ascending: false })

    if (error) {
      console.error("❌ [WEEKLY-PDFS] Erro no Supabase:", error)
      console.error("- Code:", error.code)
      console.error("- Message:", error.message)
      console.error("- Details:", error.details)
      throw new Error(`Erro no Supabase: ${error.message}`)
    }

    console.log("📊 [WEEKLY-PDFS] Dados recebidos:", data?.length || 0, "registros")

    const pdfs = (data || []).map(transformSupabasePdf)

    // Atualizar cache
    pdfsCache = pdfs
    pdfsCacheTime = Date.now()

    console.log(`✅ [WEEKLY-PDFS] ${pdfs.length} PDFs carregados do Supabase`)
    return pdfs
  } catch (error) {
    console.error("💥 [WEEKLY-PDFS] Erro ao carregar PDFs:", error)

    // Retornar cache antigo se disponível
    if (pdfsCache) {
      console.log("⚠️ [WEEKLY-PDFS] Usando cache antigo de PDFs")
      return pdfsCache
    }

    throw error
  }
}

// Função para adicionar PDF
async function addWeeklyPdfToSupabase(file: File, name: string): Promise<WeeklyPdf> {
  try {
    console.log(`📤 [WEEKLY-PDFS] Adicionando PDF: ${name}`)

    // Verificar variáveis de ambiente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
    const r2AccessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
    const r2SecretKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY

    console.log("🔍 [WEEKLY-PDFS] Verificando variáveis de ambiente:")
    console.log("- SUPABASE_URL:", !!supabaseUrl)
    console.log("- SERVICE_KEY:", !!supabaseServiceKey)
    console.log("- R2_ACCOUNT_ID:", !!r2AccountId)
    console.log("- R2_ACCESS_KEY:", !!r2AccessKey)
    console.log("- R2_SECRET_KEY:", !!r2SecretKey)

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variáveis Supabase não configuradas")
    }

    if (!r2AccountId || !r2AccessKey || !r2SecretKey) {
      throw new Error("Variáveis Cloudflare R2 não configuradas")
    }

    // Gerar informações do arquivo
    const now = new Date()
    const week = getWeekNumber(now)
    const year = now.getFullYear()
    const fileName = `weekly-pdfs/${year}-w${week}-${Date.now()}.pdf`

    console.log(`📁 [WEEKLY-PDFS] Nome do arquivo: ${fileName}`)

    // Upload para R2
    console.log(`🔄 [WEEKLY-PDFS] Fazendo upload para R2...`)

    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3")

    const r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2AccessKey,
        secretAccessKey: r2SecretKey,
      },
    })

    const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || "coutyfil-assets"
    const R2_PUBLIC_URL = "https://pub-bd3bd83c1f864ad880a287c264da1ae3.r2.dev"

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log(`📦 [WEEKLY-PDFS] Upload para bucket: ${BUCKET_NAME}`)

    await r2Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: "application/pdf",
        ContentLength: buffer.length,
      }),
    )

    const fileUrl = `${R2_PUBLIC_URL}/${fileName}`
    console.log(`✅ [WEEKLY-PDFS] Upload concluído: ${fileUrl}`)

    // Salvar no Supabase
    const { createClient } = await import("@supabase/supabase-js")
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const pdfData = {
      name,
      file_path: fileName,
      url: fileUrl,
      upload_date: now.toISOString(),
      week,
      year,
      file_size: file.size,
    }

    console.log("💾 [WEEKLY-PDFS] Salvando no Supabase:", pdfData)

    const { data, error } = await supabase.from("weekly_pdfs").insert([pdfData]).select().single()

    if (error) {
      console.error("❌ [WEEKLY-PDFS] Erro ao salvar PDF no Supabase:", error)
      throw new Error(`Erro ao salvar PDF: ${error.message}`)
    }

    // Limpar cache
    pdfsCache = null
    pdfsCacheTime = 0

    const newPdf = transformSupabasePdf(data)
    console.log(`✅ [WEEKLY-PDFS] PDF adicionado com sucesso: ${newPdf.name}`)

    return newPdf
  } catch (error) {
    console.error("💥 [WEEKLY-PDFS] Erro ao adicionar PDF:", error)
    throw error
  }
}

// GET - Carregar PDFs semanais com cache
export async function GET() {
  try {
    console.log("🔄 [WEEKLY-PDFS] === CARREGANDO PDFs ===")

    // Verificar variáveis de ambiente primeiro
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("❌ [WEEKLY-PDFS] Variáveis Supabase não configuradas")
      console.error("- NEXT_PUBLIC_SUPABASE_URL:", !!process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.error("- SUPABASE_SERVICE_ROLE_KEY:", !!process.env.SUPABASE_SERVICE_ROLE_KEY)

      return NextResponse.json(
        {
          pdfs: [],
          latest: null,
          success: false,
          error: "Configuração Supabase incompleta - verifique as variáveis de ambiente",
          debug: {
            supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          },
        },
        { status: 500 },
      )
    }

    try {
      const pdfs = await loadWeeklyPdfsFromSupabase()
      const latest = pdfs.length > 0 ? pdfs[0] : null

      console.log(`✅ [WEEKLY-PDFS] ${pdfs.length} PDFs carregados, latest: ${latest?.name || "nenhum"}`)

      return NextResponse.json({
        pdfs,
        latest,
        success: true,
        cached: true,
        timestamp: new Date().toISOString(),
      })
    } catch (storageError) {
      console.error("💥 [WEEKLY-PDFS] Erro no storage:", storageError)

      // Retornar resposta de fallback com PDFs vazios
      return NextResponse.json(
        {
          pdfs: [],
          latest: null,
          success: false,
          error: "Erro ao carregar PDFs",
          details: storageError instanceof Error ? storageError.message : String(storageError),
          fallback: true,
        },
        { status: 200 }, // Mudança: retornar 200 em vez de 500 para não quebrar o frontend
      )
    }
  } catch (error) {
    console.error("💥 [WEEKLY-PDFS] Erro geral:", error)

    return NextResponse.json(
      {
        pdfs: [],
        latest: null,
        success: false,
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 200 }, // Mudança: retornar 200 em vez de 500 para não quebrar o frontend
    )
  }
}

// POST - Adicionar novo PDF
export async function POST(request: Request) {
  try {
    console.log("📤 [WEEKLY-PDFS] === ADICIONANDO PDF ===")

    const formData = await request.formData()
    const file = formData.get("file") as File
    const name = formData.get("name") as string

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado", success: false }, { status: 400 })
    }

    if (!name) {
      return NextResponse.json({ error: "Nome é obrigatório", success: false }, { status: 400 })
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Apenas arquivos PDF são permitidos", success: false }, { status: 400 })
    }

    // Aumentar limite para 10MB (já que temos compressão)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "PDF muito grande (máximo 10MB)", success: false }, { status: 400 })
    }

    console.log(`📄 [WEEKLY-PDFS] Processando PDF: ${name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)

    // Verificar variáveis de ambiente
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("❌ [WEEKLY-PDFS] Variáveis Supabase não configuradas")
      return NextResponse.json({ error: "Configuração Supabase incompleta", success: false }, { status: 500 })
    }

    try {
      const newPdf = await addWeeklyPdfToSupabase(file, name)

      console.log(`✅ [WEEKLY-PDFS] PDF adicionado com sucesso: ${newPdf.name}`)

      return NextResponse.json({
        pdf: newPdf,
        success: true,
      })
    } catch (storageError) {
      console.error("💥 [WEEKLY-PDFS] Erro no storage:", storageError)

      return NextResponse.json(
        {
          error: "Erro ao fazer upload do PDF",
          details: storageError instanceof Error ? storageError.message : String(storageError),
          success: false,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("💥 [WEEKLY-PDFS] Erro geral:", error)

    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : String(error),
        success: false,
      },
      { status: 500 },
    )
  }
}
