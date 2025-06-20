// Sistema de storage otimizado com fallbacks robustos
import { createClient } from "@supabase/supabase-js"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

// Tipos
export interface Product {
  id: string
  name: string
  description: string
  price: number
  image: string
  category: string
  featured: boolean
  order: number
  created_at?: string
  updated_at?: string
}

export interface WeeklyPdf {
  id: string
  name: string
  file_path: string
  url: string
  upload_date: string
  week: number
  year: number
  file_size?: number
}

// Configurações
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Verificar se as variáveis estão definidas
if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ [STORAGE] Variáveis Supabase não configuradas:")
  console.error("NEXT_PUBLIC_SUPABASE_URL:", !!supabaseUrl)
  console.error("SUPABASE_SERVICE_ROLE_KEY:", !!supabaseServiceKey)
  throw new Error("Configuração Supabase incompleta")
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Configurações do R2
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || "coutyfil-assets"
const R2_PUBLIC_URL = "https://pub-bd3bd83c1f864ad880a287c264da1ae3.r2.dev"

// Cache local
let productsCache: Product[] | null = null
let productsCacheTime = 0
let pdfsCache: WeeklyPdf[] | null = null
let pdfsCacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

// === PRODUTOS ===

export async function loadProductsFromCloud(): Promise<Product[]> {
  try {
    console.log("🔄 [STORAGE] Carregando produtos do Supabase...")

    // Verificar cache primeiro
    if (productsCache && Date.now() - productsCacheTime < CACHE_DURATION) {
      console.log("✅ [STORAGE] Usando cache de produtos")
      return productsCache
    }

    const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("❌ [STORAGE] Erro no Supabase:", error)
      throw new Error(`Erro no Supabase: ${error.message}`)
    }

    const products = (data || []).map(transformSupabaseProduct)

    // Atualizar cache
    productsCache = products
    productsCacheTime = Date.now()

    console.log(`✅ [STORAGE] ${products.length} produtos carregados do Supabase`)
    return products
  } catch (error) {
    console.error("💥 [STORAGE] Erro ao carregar produtos:", error)

    // Retornar cache antigo se disponível
    if (productsCache) {
      console.log("⚠️ [STORAGE] Usando cache antigo de produtos")
      return productsCache
    }

    throw error
  }
}

export async function saveProductsToCloud(products: Product[]): Promise<void> {
  try {
    console.log(`💾 [STORAGE] Salvando ${products.length} produtos no Supabase...`)

    // Limpar tabela e inserir novos dados
    const { error: deleteError } = await supabase.from("products").delete().neq("id", "impossible-id") // Deletar todos

    if (deleteError) {
      console.error("❌ [STORAGE] Erro ao limpar produtos:", deleteError)
      throw new Error(`Erro ao limpar produtos: ${deleteError.message}`)
    }

    if (products.length > 0) {
      const supabaseProducts = products.map(transformProductToSupabase)

      const { error: insertError } = await supabase.from("products").insert(supabaseProducts)

      if (insertError) {
        console.error("❌ [STORAGE] Erro ao inserir produtos:", insertError)
        throw new Error(`Erro ao inserir produtos: ${insertError.message}`)
      }
    }

    // Limpar cache
    productsCache = null
    productsCacheTime = 0

    console.log("✅ [STORAGE] Produtos salvos com sucesso no Supabase")
  } catch (error) {
    console.error("💥 [STORAGE] Erro ao salvar produtos:", error)
    throw error
  }
}

// === PDFs SEMANAIS ===

export async function loadWeeklyPdfsFromCloud(): Promise<WeeklyPdf[]> {
  try {
    console.log("🔄 [STORAGE] Carregando PDFs do Supabase...")

    // Verificar cache primeiro
    if (pdfsCache && Date.now() - pdfsCacheTime < CACHE_DURATION) {
      console.log("✅ [STORAGE] Usando cache de PDFs")
      return pdfsCache
    }

    const { data, error } = await supabase.from("weekly_pdfs").select("*").order("upload_date", { ascending: false })

    if (error) {
      console.error("❌ [STORAGE] Erro no Supabase (PDFs):", error)
      throw new Error(`Erro no Supabase: ${error.message}`)
    }

    const pdfs = (data || []).map(transformSupabasePdf)

    // Atualizar cache
    pdfsCache = pdfs
    pdfsCacheTime = Date.now()

    console.log(`✅ [STORAGE] ${pdfs.length} PDFs carregados do Supabase`)
    return pdfs
  } catch (error) {
    console.error("💥 [STORAGE] Erro ao carregar PDFs:", error)

    // Retornar cache antigo se disponível
    if (pdfsCache) {
      console.log("⚠️ [STORAGE] Usando cache antigo de PDFs")
      return pdfsCache
    }

    throw error
  }
}

export async function getLatestWeeklyPdf(): Promise<WeeklyPdf | null> {
  try {
    const pdfs = await loadWeeklyPdfsFromCloud()
    return pdfs.length > 0 ? pdfs[0] : null
  } catch (error) {
    console.error("💥 [STORAGE] Erro ao obter PDF mais recente:", error)
    return null
  }
}

export async function addWeeklyPdf(file: File, name: string): Promise<WeeklyPdf> {
  try {
    console.log(`📤 [STORAGE] Adicionando PDF: ${name}`)

    // Gerar informações do arquivo
    const now = new Date()
    const week = getWeekNumber(now)
    const year = now.getFullYear()
    const fileName = `weekly-pdfs/${year}-w${week}-${Date.now()}.pdf`

    // Upload para R2
    console.log(`🔄 [STORAGE] Fazendo upload para R2: ${fileName}`)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

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
    console.log(`✅ [STORAGE] Upload concluído: ${fileUrl}`)

    // Salvar no Supabase
    const pdfData = {
      name,
      file_path: fileName,
      url: fileUrl,
      upload_date: now.toISOString(),
      week,
      year,
      file_size: file.size,
    }

    const { data, error } = await supabase.from("weekly_pdfs").insert([pdfData]).select().single()

    if (error) {
      console.error("❌ [STORAGE] Erro ao salvar PDF no Supabase:", error)
      throw new Error(`Erro ao salvar PDF: ${error.message}`)
    }

    // Limpar cache
    pdfsCache = null
    pdfsCacheTime = 0

    const newPdf = transformSupabasePdf(data)
    console.log(`✅ [STORAGE] PDF adicionado com sucesso: ${newPdf.name}`)

    return newPdf
  } catch (error) {
    console.error("💥 [STORAGE] Erro ao adicionar PDF:", error)
    throw error
  }
}

// === UPLOAD DE IMAGENS ===

export async function uploadImageToCloud(file: File): Promise<string> {
  try {
    console.log(`🖼️ [STORAGE] Fazendo upload de imagem: ${file.name}`)

    const fileName = `images/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    await r2Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
        ContentLength: buffer.length,
      }),
    )

    const imageUrl = `${R2_PUBLIC_URL}/${fileName}`
    console.log(`✅ [STORAGE] Upload de imagem concluído: ${imageUrl}`)

    return imageUrl
  } catch (error) {
    console.error("💥 [STORAGE] Erro no upload de imagem:", error)
    throw error
  }
}

// === FUNÇÕES AUXILIARES ===

function transformSupabaseProduct(data: any): Product {
  return {
    id: data.id,
    name: data.name || "",
    description: data.description || "",
    price: data.price || 0,
    image: data.image || "",
    category: data.category || "",
    featured: data.featured || false,
    order: data.order || 0,
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}

function transformProductToSupabase(product: Product): any {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    image: product.image,
    category: product.category,
    featured: product.featured,
    order: product.order,
    created_at: product.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

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

// === CACHE MANAGEMENT ===

export function clearAllCache(): void {
  productsCache = null
  productsCacheTime = 0
  pdfsCache = null
  pdfsCacheTime = 0
  console.log("🧹 [STORAGE] Cache limpo")
}

export function getCacheStats(): any {
  return {
    products: {
      cached: !!productsCache,
      count: productsCache?.length || 0,
      age: productsCache ? Date.now() - productsCacheTime : 0,
    },
    pdfs: {
      cached: !!pdfsCache,
      count: pdfsCache?.length || 0,
      age: pdfsCache ? Date.now() - pdfsCacheTime : 0,
    },
  }
}
