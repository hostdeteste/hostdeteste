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
    // Tentar diferentes nomes de coluna para a data
    upload_date: data.upload_date || data.uploaded_at || data.created_at || new Date().toISOString(),
    week: data.week || 1,
    year: data.year || new Date().getFullYear(),
    // file_size é opcional - só incluir se existir
    ...(data.file_size !== undefined && { file_size: data.file_size }),
  }
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

// Função para carregar PDFs com detecção automática de colunas
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

    // Primeiro, vamos descobrir quais colunas existem na tabela
    console.log("🔍 [WEEKLY-PDFS] Verificando estrutura da tabela...")

    try {
      // Tentar buscar um registro para ver a estrutura
      const { data: sampleData, error: sampleError } = await supabase.from("weekly_pdfs").select("*").limit(1)

      if (sampleError) {
        console.error("❌ [WEEKLY-PDFS] Erro ao verificar estrutura:", sampleError)
      } else if (sampleData && sampleData.length > 0) {
        console.log("📊 [WEEKLY-PDFS] Estrutura da tabela (primeiro registro):")
        console.log("📊 [WEEKLY-PDFS] Colunas disponíveis:", Object.keys(sampleData[0]))
      }
    } catch (structureError) {
      console.warn("⚠️ [WEEKLY-PDFS] Não foi possível verificar estrutura:", structureError)
    }

    // Agora vamos tentar diferentes ordenações baseadas nas colunas que podem existir
    let data: any[] = []
    let queryError: Error | null = null

    // Tentativa 1: upload_date
    try {
      console.log("🔄 [WEEKLY-PDFS] Tentativa 1: ordenar por upload_date...")
      const result = await supabase.from("weekly_pdfs").select("*").order("upload_date", { ascending: false })

      if (result.error) {
        throw new Error(result.error.message)
      }
      data = result.data || []
      console.log("✅ [WEEKLY-PDFS] Sucesso com upload_date!")
    } catch (error1) {
      const errorMessage = error1 instanceof Error ? error1.message : String(error1)
      console.log("❌ [WEEKLY-PDFS] Falhou com upload_date:", errorMessage)
      queryError = new Error(errorMessage)

      // Tentativa 2: created_at
      try {
        console.log("🔄 [WEEKLY-PDFS] Tentativa 2: ordenar por created_at...")
        const result = await supabase.from("weekly_pdfs").select("*").order("created_at", { ascending: false })

        if (result.error) {
          throw new Error(result.error.message)
        }
        data = result.data || []
        console.log("✅ [WEEKLY-PDFS] Sucesso com created_at!")
        queryError = null
      } catch (error2) {
        const errorMessage2 = error2 instanceof Error ? error2.message : String(error2)
        console.log("❌ [WEEKLY-PDFS] Falhou com created_at:", errorMessage2)

        // Tentativa 3: uploaded_at
        try {
          console.log("🔄 [WEEKLY-PDFS] Tentativa 3: ordenar por uploaded_at...")
          const result = await supabase.from("weekly_pdfs").select("*").order("uploaded_at", { ascending: false })

          if (result.error) {
            throw new Error(result.error.message)
          }
          data = result.data || []
          console.log("✅ [WEEKLY-PDFS] Sucesso com uploaded_at!")
          queryError = null
        } catch (error3) {
          const errorMessage3 = error3 instanceof Error ? error3.message : String(error3)
          console.log("❌ [WEEKLY-PDFS] Falhou com uploaded_at:", errorMessage3)

          // Tentativa 4: sem ordenação específica
          try {
            console.log("🔄 [WEEKLY-PDFS] Tentativa 4: sem ordenação por data...")
            const result = await supabase.from("weekly_pdfs").select("*")

            if (result.error) {
              throw new Error(result.error.message)
            }
            data = result.data || []
            console.log("✅ [WEEKLY-PDFS] Sucesso sem ordenação específica!")
            queryError = null
          } catch (error4) {
            const errorMessage4 = error4 instanceof Error ? error4.message : String(error4)
            console.log("❌ [WEEKLY-PDFS] Todas as tentativas falharam")
            queryError = new Error(errorMessage4)
          }
        }
      }
    }

    if (queryError) {
      console.error("❌ [WEEKLY-PDFS] Erro final no Supabase:", queryError)
      throw new Error(`Erro no Supabase: ${queryError.message}`)
    }

    console.log("📊 [WEEKLY-PDFS] Dados recebidos:", data?.length || 0, "registros")

    // Log detalhado dos dados brutos
    if (data && data.length > 0) {
      console.log("📄 [WEEKLY-PDFS] Primeiro registro bruto:")
      console.log(data[0])
    }

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

// Função para adicionar PDF com logs ultra-detalhados
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

    let r2Client: any
    let arrayBuffer: ArrayBuffer
    let buffer: Buffer

    try {
      // Preparar arquivo
      console.log(`📄 [WEEKLY-PDFS-STORAGE] Convertendo arquivo para buffer...`)
      arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
      console.log(`✅ [WEEKLY-PDFS-STORAGE] Buffer criado: ${buffer.length} bytes`)
    } catch (bufferError) {
      console.error("❌ [WEEKLY-PDFS-STORAGE] Erro ao criar buffer:", bufferError)
      throw new Error(
        `Erro ao processar arquivo: ${bufferError instanceof Error ? bufferError.message : "Erro desconhecido"}`,
      )
    }

    try {
      // Configurar R2 Client
      console.log(`🔧 [WEEKLY-PDFS-STORAGE] Configurando R2 Client...`)
      const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3")

      const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID!
      const r2AccessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!
      const r2SecretKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!

      r2Client = new S3Client({
        region: "auto",
        endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: r2AccessKey,
          secretAccessKey: r2SecretKey,
        },
      })

      console.log(`✅ [WEEKLY-PDFS-STORAGE] R2 Client configurado`)
    } catch (r2ConfigError) {
      console.error("❌ [WEEKLY-PDFS-STORAGE] Erro ao configurar R2:", r2ConfigError)
      throw new Error(
        `Erro na configuração R2: ${r2ConfigError instanceof Error ? r2ConfigError.message : "Erro desconhecido"}`,
      )
    }

    try {
      // Fazer upload
      console.log(`📤 [WEEKLY-PDFS-STORAGE] Enviando para R2...`)
      const { PutObjectCommand } = await import("@aws-sdk/client-s3")
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
    } catch (r2UploadError) {
      console.error("❌ [WEEKLY-PDFS-STORAGE] Erro no upload R2:", r2UploadError)
      throw new Error(
        `Erro no upload R2: ${r2UploadError instanceof Error ? r2UploadError.message : "Erro desconhecido"}`,
      )
    }

    // Salvar no Supabase
    console.log(`💾 [WEEKLY-PDFS-STORAGE] === SALVANDO NO SUPABASE ===`)

    try {
      const { createClient } = await import("@supabase/supabase-js")
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

      console.log(`🔧 [WEEKLY-PDFS-STORAGE] Supabase client criado`)

      // Descobrir estrutura da tabela
      console.log("🔍 [WEEKLY-PDFS-STORAGE] Descobrindo estrutura da tabela...")

      let dateColumn = "upload_date" // padrão
      let hasFileSizeColumn = false

      try {
        const { data: sampleData } = await supabase.from("weekly_pdfs").select("*").limit(1)

        if (sampleData && sampleData.length > 0) {
          const columns = Object.keys(sampleData[0])
          console.log("📊 [WEEKLY-PDFS-STORAGE] Colunas disponíveis:", columns)

          // Detectar coluna de data
          if (columns.includes("created_at")) {
            dateColumn = "created_at"
          } else if (columns.includes("uploaded_at")) {
            dateColumn = "uploaded_at"
          } else if (columns.includes("upload_date")) {
            dateColumn = "upload_date"
          }

          // Verificar se tem coluna file_size
          hasFileSizeColumn = columns.includes("file_size")
        }
      } catch (error) {
        console.warn("⚠️ [WEEKLY-PDFS-STORAGE] Não foi possível detectar colunas, usando padrão")
      }

      console.log("📅 [WEEKLY-PDFS-STORAGE] Usando coluna de data:", dateColumn)
      console.log("📊 [WEEKLY-PDFS-STORAGE] Coluna file_size disponível:", hasFileSizeColumn)

      // Preparar dados
      const R2_PUBLIC_URL = "https://pub-bd3bd83c1f864ad880a287c264da1ae3.r2.dev"
      const fileUrl = `${R2_PUBLIC_URL}/${fileName}`

      const pdfData: any = {
        name,
        file_path: fileName,
        url: fileUrl,
        week,
        year,
      }

      // Adicionar data
      pdfData[dateColumn] = now.toISOString()

      // Só adicionar file_size se a coluna existir
      if (hasFileSizeColumn) {
        pdfData.file_size = file.size
        console.log("📊 [WEEKLY-PDFS-STORAGE] Incluindo file_size:", file.size)
      } else {
        console.log("⚠️ [WEEKLY-PDFS-STORAGE] Coluna file_size não existe, pulando...")
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
    } catch (supabaseError) {
      console.error("❌ [WEEKLY-PDFS-STORAGE] Erro no Supabase:", supabaseError)
      throw new Error(
        `Erro no Supabase: ${supabaseError instanceof Error ? supabaseError.message : "Erro desconhecido"}`,
      )
    }
  } catch (error) {
    console.error("💥 [WEEKLY-PDFS-STORAGE] Erro geral no storage:", error)
    throw error
  }
}

// GET - Carregar PDFs semanais com detecção automática
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

// POST - Adicionar novo PDF com logs detalhados
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

      // Log mais detalhado do erro
      if (storageError instanceof Error) {
        console.error("💥 [WEEKLY-PDFS-API] Error name:", storageError.name)
        console.error("💥 [WEEKLY-PDFS-API] Error message:", storageError.message)
        console.error("💥 [WEEKLY-PDFS-API] Error stack:", storageError.stack)
      }

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

    // Log mais detalhado do erro geral
    if (error instanceof Error) {
      console.error("💥 [WEEKLY-PDFS-API] General error name:", error.name)
      console.error("💥 [WEEKLY-PDFS-API] General error message:", error.message)
      console.error("💥 [WEEKLY-PDFS-API] General error stack:", error.stack)
    }

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
