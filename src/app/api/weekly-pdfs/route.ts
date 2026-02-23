import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

interface WeeklyPdf {
  id: string
  name: string
  file_path: string
  url: string
  upload_date: string
  week: number
  year: number
}

const MAX_PDF_SIZE_MB = 2.5
const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024

function transformSupabasePdf(data: any): WeeklyPdf {
  return {
    id: data.id,
    name: data.name || "",
    file_path: data.file_path || "",
    url: data.url || "",
    upload_date: data.created_at || new Date().toISOString(),
    week: data.week || 1,
    year: data.year || new Date().getFullYear(),
  }
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

// Carregar PDFs sempre direto do Supabase - sem cache
async function loadWeeklyPdfsFromSupabase(): Promise<WeeklyPdf[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Variaveis Supabase nao configuradas")
  }

  const { createClient } = await import("@supabase/supabase-js")
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data, error } = await supabase
    .from("weekly_pdfs")
    .select("id, name, file_path, url, week, year, created_at")
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Erro no Supabase: ${error.message}`)
  }

  const pdfs = (data || []).map(transformSupabasePdf)

  if (pdfs.length > 0) {
    pdfs.sort((a, b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime())
  }

  return pdfs
}

// GET
export async function GET() {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          pdfs: [],
          latest: null,
          success: false,
          error: "Configuracao Supabase incompleta",
        },
        { status: 500 },
      )
    }

    const pdfs = await loadWeeklyPdfsFromSupabase()
    const latest = pdfs.length > 0 ? pdfs[0] : null

    return NextResponse.json(
      {
        pdfs,
        latest,
        success: true,
        timestamp: new Date().toISOString(),
        maxSizeMB: MAX_PDF_SIZE_MB,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      },
    )
  } catch (error) {
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

// POST
export async function POST(request: Request) {
  try {
    const requiredEnvVars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      CLOUDFLARE_R2_ACCOUNT_ID: process.env.CLOUDFLARE_R2_ACCOUNT_ID,
      CLOUDFLARE_R2_ACCESS_KEY_ID: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    }

    for (const [key, value] of Object.entries(requiredEnvVars)) {
      if (!value) {
        return NextResponse.json(
          { error: `Configuracao incompleta: ${key} nao definida`, success: false },
          { status: 500 },
        )
      }
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const name = formData.get("name") as string

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado", success: false }, { status: 400 })
    }
    if (!name) {
      return NextResponse.json({ error: "Nome e obrigatorio", success: false }, { status: 400 })
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Apenas arquivos PDF sao permitidos", success: false }, { status: 400 })
    }
    if (file.size > MAX_PDF_SIZE_BYTES) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
      return NextResponse.json(
        {
          error: `PDF muito grande (${fileSizeMB}MB). O limite maximo e ${MAX_PDF_SIZE_MB}MB.`,
          success: false,
        },
        { status: 400 },
      )
    }

    const now = new Date()
    const week = getWeekNumber(now)
    const year = now.getFullYear()
    const fileName = `weekly-pdfs/${year}-w${week}-${Date.now()}.pdf`

    // Upload para R2
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3")
    const r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    })

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

    const R2_PUBLIC_URL = "https://pub-92501dd4f797413a9775e615967d81ba.r2.dev"
    const fileUrl = `${R2_PUBLIC_URL}/${fileName}`

    // Salvar no Supabase
    const { createClient } = await import("@supabase/supabase-js")
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data, error } = await supabase
      .from("weekly_pdfs")
      .insert([{ name, file_path: fileName, url: fileUrl, week, year }])
      .select()
      .single()

    if (error) {
      throw new Error(`Erro Supabase: ${error.message}`)
    }

    const newPdf = transformSupabasePdf(data)

    return NextResponse.json({
      pdf: newPdf,
      success: true,
      message: `PDF enviado com sucesso (${(file.size / 1024 / 1024).toFixed(2)}MB)!`,
    })
  } catch (error) {
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
