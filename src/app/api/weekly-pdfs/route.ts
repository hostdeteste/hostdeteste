import { NextResponse } from "next/server"

export const dynamic = "force_dynamic"

// Tipos - removendo file_size completamente
interface WeeklyPdf {
  id: string
  name: string
  file_path: string
  url: string
  upload_date: string
  week: number
  year: number
}

// Cache local
let pdfsCache: WeeklyPdf[] | null = null
let pdfsCacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

// Funções auxiliares - SEM file_size
function transformSupabasePdf(data: any): WeeklyPdf {
  return {
    id: data.id,
    name: data.name || "",
    file_path: data.file_path || "",
    url: data.url || "",
    // Usar apenas created_at que já existe
    upload_date: data.created_at || new Date().toISOString(),
    week: data.week || 1,
    year: data.year || new Date().getFullYear(),
    // REMOVIDO: file_size completamente
  }
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

// Função para carregar PDFs - SEM file_size
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

    // Importar Supabase dinamicamente
    const { createClient } = await import("@supabase/supabase-js")
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log("📡 [WEEKLY-PDFS] Fazendo query no Supabase...")

    // Selecionar apenas as colunas que sabemos que existem
    const { data, error } = await supabase
      .from("weekly_pdfs")
      .select("id, name, file_path, url, week, year, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("❌ [WEEKLY-PDFS] Erro no Supabase:", error)
      throw new Error(`Erro no Supabase: ${error.message}`)
    }

    console.log("📊 [WEEKLY-PDFS] Dados recebidos:", data?.length || 0, "registros")

    const pdfs = (data || []).map(transformSupabasePdf)

    // Ordenar manualmente por data se conseguimos os dados
    if (pdfs.length > 0) {
      pdfs.sort((a, b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime())
      console.log("📊 [WEEKLY-PDFS] PDFs ordenados por data")
    }

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

// Função para adicionar PDF - SEM file_size
async function addWeeklyPdfToSupabase(file: File, name: string): Promise<WeeklyPdf> {
  try {
    console.log(`📤 [WEEKLY-PDFS-STORAGE] === INICIANDO STORAGE ===`)
    console.log(`📤 [WEEKLY-PDFS-STORAGE] Nome: ${name}`)
    console.log(`📤 [WEEKLY-PDFS-STORAGE] Tamanho: ${(file.size / 1024 / 1024).toFixed(2)}MB`)

    // Gerar informações do arquivo
    const now = new Date()
    const week = getWeekNumber(now)
    const year = now.getFullYear()
    const fileName = `weekly-pdfs/${year}-w${week}-${Date.now()}.pdf`

    console.log(`📁 [WEEKLY-PDFS-STORAGE] Arquivo: ${fileName}`)
    console.log(`📅 [WEEKLY-PDFS-STORAGE] Semana: ${week}/${year}`)

    // Upload para R2
    console.log(`🔄 [WEEKLY-PDFS-STORAGE] === UPLOAD PARA R2 ===`)

    try {
      // Preparar arquivo
      console.log(`📄 [WEEKLY-PDFS-STORAGE] Convertendo arquivo para buffer...`)
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      console.log(`✅ [WEEKLY-PDFS-STORAGE] Buffer criado: ${buffer.length} bytes`)

      // Configurar R2 Client
      console.log(`🔧 [WEEKLY-PDFS-STORAGE] Configurando R2 Client...`)
      const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3")

      const r2Client = new S3Client({
        region: "auto",
        endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
        },
      })

      // Fazer upload
      console.log(`📤 [WEEKLY-PDFS-STORAGE] Enviando para R2...`)
      const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || "coutyfil-assets"

      await r2Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: fileName,
          Body: buffer,
          ContentType: "application/pdf",
          ContentLength: buffer.length,
        }),
      )

      const R2_PUBLIC_URL = "https://pub-bd3bd83c1f864ad880a287c264da1ae3.r2.dev"
      const fileUrl = `${R2_PUBLIC_URL}/${fileName}`
      console.log(`✅ [WEEKLY-PDFS-STORAGE] Upload R2 concluído: ${fileUrl}`)

      // Salvar no Supabase - SEM file_size
      console.log(`💾 [WEEKLY-PDFS-STORAGE] === SALVANDO NO SUPABASE ===`)

      const { createClient } = await import("@supabase/supabase-js")
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

      // Preparar dados - usar apenas created_at (que já existe no Supabase por padrão)
      const pdfData = {
        name,
        file_path: fileName,
        url: fileUrl,
        week,
        year,
        // Remover upload_date completamente - usar apenas created_at que já existe
      }

      console.log("💾 [WEEKLY-PDFS-STORAGE] Dados para inserção:", pdfData)

      // Inserir no Supabase
      const { data, error } = await supabase.from("weekly_pdfs").insert([pdfData]).select().single()

      if (error) {
        console.error("❌ [WEEKLY-PDFS-STORAGE] Erro Supabase:", error)
        throw new Error(`Erro Supabase: ${error.message}`)
      }

      console.log("✅ [WEEKLY-PDFS-STORAGE] Dados salvos no Supabase:", data)

      // Limpar cache
      pdfsCache = null
      pdfsCacheTime = 0

      const newPdf = transformSupabasePdf(data)
      console.log(`🎉 [WEEKLY-PDFS-STORAGE] PDF processado com sucesso: ${newPdf.name}`)

      return newPdf
    } catch (storageError) {
      console.error("❌ [WEEKLY-PDFS-STORAGE] Erro no storage:", storageError)
      throw new Error(`Erro no storage: ${storageError instanceof Error ? storageError.message : "Erro desconhecido"}`)
    }
  } catch (error) {
    console.error("💥 [WEEKLY-PDFS-STORAGE] Erro geral no storage:", error)
    throw error
  }
}

// GET - Carregar PDFs semanais
export async function GET() {
  try {
    console.log("🔄 [WEEKLY-PDFS] === CARREGANDO PDFs ===")

    // Verificar variáveis de ambiente primeiro
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("❌ [WEEKLY-PDFS] Variáveis Supabase não configuradas")

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
        { status: 200 },
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
      { status: 200 },
    )
  }
}

// POST - Adicionar novo PDF
export async function POST(request: Request) {
  try {
    console.log("📤 [WEEKLY-PDFS-API] === INICIANDO UPLOAD ===")

    // Verificar variáveis de ambiente primeiro
    const requiredEnvVars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      CLOUDFLARE_R2_ACCOUNT_ID: process.env.CLOUDFLARE_R2_ACCOUNT_ID,
      CLOUDFLARE_R2_ACCESS_KEY_ID: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    }

    console.log("🔍 [WEEKLY-PDFS-API] Verificando variáveis de ambiente:")
    for (const [key, value] of Object.entries(requiredEnvVars)) {
      console.log(`- ${key}: ${!!value}`)
      if (!value) {
        console.error(`❌ [WEEKLY-PDFS-API] Variável ${key} não configurada`)
        return NextResponse.json(
          {
            error: `Configuração incompleta: ${key} não definida`,
            success: false,
            debug: { missingVar: key },
          },
          { status: 500 },
        )
      }
    }

    let formData: FormData
    try {
      formData = await request.formData()
      console.log("📋 [WEEKLY-PDFS-API] FormData recebido")
    } catch (formError) {
      console.error("❌ [WEEKLY-PDFS-API] Erro ao ler FormData:", formError)
      return NextResponse.json(
        {
          error: "Erro ao processar dados do formulário",
          success: false,
          details: formError instanceof Error ? formError.message : String(formError),
        },
        { status: 400 },
      )
    }

    const file = formData.get("file") as File
    const name = formData.get("name") as string

    console.log("📄 [WEEKLY-PDFS-API] Dados recebidos:")
    console.log("- File:", !!file, file?.name, file?.size ? `${(file.size / 1024 / 1024).toFixed(2)}MB` : "N/A")
    console.log("- Name:", name)

    // Validações
    if (!file) {
      console.error("❌ [WEEKLY-PDFS-API] Nenhum arquivo enviado")
      return NextResponse.json({ error: "Nenhum arquivo enviado", success: false }, { status: 400 })
    }

    if (!name) {
      console.error("❌ [WEEKLY-PDFS-API] Nome não fornecido")
      return NextResponse.json({ error: "Nome é obrigatório", success: false }, { status: 400 })
    }

    if (file.type !== "application/pdf") {
      console.error("❌ [WEEKLY-PDFS-API] Tipo de arquivo inválido:", file.type)
      return NextResponse.json({ error: "Apenas arquivos PDF são permitidos", success: false }, { status: 400 })
    }

    // Aumentar limite para 10MB
    if (file.size > 10 * 1024 * 1024) {
      console.error("❌ [WEEKLY-PDFS-API] Arquivo muito grande:", file.size)
      return NextResponse.json({ error: "PDF muito grande (máximo 10MB)", success: false }, { status: 400 })
    }

    console.log(`✅ [WEEKLY-PDFS-API] Validações OK - processando PDF: ${name}`)

    try {
      const newPdf = await addWeeklyPdfToSupabase(file, name)
      console.log(`🎉 [WEEKLY-PDFS-API] PDF adicionado com sucesso: ${newPdf.name}`)

      return NextResponse.json({
        pdf: newPdf,
        success: true,
        message: "PDF enviado com sucesso!",
      })
    } catch (storageError) {
      console.error("💥 [WEEKLY-PDFS-API] Erro no storage:", storageError)

      return NextResponse.json(
        {
          error: "Erro ao fazer upload do PDF",
          details: storageError instanceof Error ? storageError.message : String(storageError),
          success: false,
          debug: {
            errorType: storageError instanceof Error ? storageError.name : typeof storageError,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("💥 [WEEKLY-PDFS-API] Erro geral:", error)

    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : String(error),
        success: false,
        debug: {
          errorType: error instanceof Error ? error.name : typeof error,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 },
    )
  }
}
