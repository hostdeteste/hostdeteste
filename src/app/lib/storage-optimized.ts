// Sistema de storage otimizado com armazenamento em memória
// Sem dependência de Supabase - usa dados locais

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

// Armazenamento em memória (substitui Supabase)
let inMemoryProducts: Product[] = []
let inMemoryPdfs: WeeklyPdf[] = []

// Configurações do R2 (opcional - só se tiver as variáveis)
const hasR2Config = !!(
  process.env.CLOUDFLARE_R2_ACCOUNT_ID &&
  process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
  process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
)

const r2Client = hasR2Config
  ? new S3Client({
      region: "auto",
      endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    })
  : null

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || "coutyfil-assets"
const R2_PUBLIC_URL = "https://pub-92501dd4f797413a9775e615967d81ba.r2.dev"

// Cache local
let productsCache: Product[] | null = null
let productsCacheTime = 0
let pdfsCache: WeeklyPdf[] | null = null
let pdfsCacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

// === PRODUTOS ===

export async function loadProductsFromCloud(): Promise<Product[]> {
  try {
    console.log("🔄 [STORAGE] Carregando produtos da memória...")

    // Verificar cache primeiro
    if (productsCache && Date.now() - productsCacheTime < CACHE_DURATION) {
      console.log("✅ [STORAGE] Usando cache de produtos")
      return productsCache
    }

    // Retorna produtos da memória
    const products = [...inMemoryProducts]

    // Atualizar cache
    productsCache = products
    productsCacheTime = Date.now()

    console.log(`✅ [STORAGE] ${products.length} produtos carregados da memória`)
    return products
  } catch (error) {
    console.error("💥 [STORAGE] Erro ao carregar produtos:", error)

    // Retornar cache antigo se disponível
    if (productsCache) {
      console.log("⚠️ [STORAGE] Usando cache antigo de produtos")
      return productsCache
    }

    return []
  }
}

export async function saveProductsToCloud(products: Product[]): Promise<void> {
  try {
    console.log(`💾 [STORAGE] Salvando ${products.length} produtos na memória...`)

    // Salvar na memória
    inMemoryProducts = products.map((p) => ({
      ...p,
      updated_at: new Date().toISOString(),
    }))

    // Limpar cache
    productsCache = null
    productsCacheTime = 0

    console.log("✅ [STORAGE] Produtos salvos com sucesso na memória")
  } catch (error) {
    console.error("💥 [STORAGE] Erro ao salvar produtos:", error)
    throw error
  }
}

// === PDFs SEMANAIS ===

export async function loadWeeklyPdfsFromCloud(): Promise<WeeklyPdf[]> {
  try {
    console.log("🔄 [STORAGE] Carregando PDFs da memória...")

    // Verificar cache primeiro
    if (pdfsCache && Date.now() - pdfsCacheTime < CACHE_DURATION) {
      console.log("✅ [STORAGE] Usando cache de PDFs")
      return pdfsCache
    }

    // Retorna PDFs da memória
    const pdfs = [...inMemoryPdfs]

    // Atualizar cache
    pdfsCache = pdfs
    pdfsCacheTime = Date.now()

    console.log(`✅ [STORAGE] ${pdfs.length} PDFs carregados da memória`)
    return pdfs
  } catch (error) {
    console.error("💥 [STORAGE] Erro ao carregar PDFs:", error)

    // Retornar cache antigo se disponível
    if (pdfsCache) {
      console.log("⚠️ [STORAGE] Usando cache antigo de PDFs")
      return pdfsCache
    }

    return []
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

    let fileUrl = ""

    // Upload para R2 se configurado
    if (r2Client) {
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

      fileUrl = `${R2_PUBLIC_URL}/${fileName}`
      console.log(`✅ [STORAGE] Upload concluído: ${fileUrl}`)
    } else {
      // Sem R2, usar URL local placeholder
      fileUrl = `/uploads/${fileName}`
      console.log("⚠️ [STORAGE] R2 não configurado, usando URL local")
    }

    // Criar novo PDF
    const newPdf: WeeklyPdf = {
      id: `pdf-${Date.now()}`,
      name,
      file_path: fileName,
      url: fileUrl,
      upload_date: now.toISOString(),
      week,
      year,
      file_size: file.size,
    }

    // Adicionar à memória
    inMemoryPdfs.unshift(newPdf)

    // Limpar cache
    pdfsCache = null
    pdfsCacheTime = 0

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

    if (r2Client) {
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
    } else {
      // Sem R2, retornar URL local placeholder
      console.log("⚠️ [STORAGE] R2 não configurado, usando URL local")
      return `/uploads/${fileName}`
    }
  } catch (error) {
    console.error("💥 [STORAGE] Erro no upload de imagem:", error)
    throw error
  }
}

// === FUNÇÕES AUXILIARES ===

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

export function getCacheStats(): {
  products: { cached: boolean; count: number; age: number }
  pdfs: { cached: boolean; count: number; age: number }
} {
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

// === FUNÇÕES PARA MANIPULAÇÃO DIRETA ===

export function getProducts(): Product[] {
  return [...inMemoryProducts]
}

export function setProducts(products: Product[]): void {
  inMemoryProducts = [...products]
  productsCache = null
  productsCacheTime = 0
}

export function addProduct(product: Product): void {
  inMemoryProducts.push(product)
  productsCache = null
  productsCacheTime = 0
}

export function updateProduct(id: string, updates: Partial<Product>): boolean {
  const index = inMemoryProducts.findIndex((p) => p.id === id)
  if (index === -1) return false

  inMemoryProducts[index] = {
    ...inMemoryProducts[index],
    ...updates,
    updated_at: new Date().toISOString(),
  }
  productsCache = null
  productsCacheTime = 0
  return true
}

export function deleteProduct(id: string): boolean {
  const index = inMemoryProducts.findIndex((p) => p.id === id)
  if (index === -1) return false

  inMemoryProducts.splice(index, 1)
  productsCache = null
  productsCacheTime = 0
  return true
}

export function getPdfs(): WeeklyPdf[] {
  return [...inMemoryPdfs]
}

export function deletePdf(id: string): boolean {
  const index = inMemoryPdfs.findIndex((p) => p.id === id)
  if (index === -1) return false

  inMemoryPdfs.splice(index, 1)
  pdfsCache = null
  pdfsCacheTime = 0
  return true
}
