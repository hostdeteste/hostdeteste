import { createClient } from "@supabase/supabase-js"
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { localCache, CACHE_CONFIGS } from "./local-cache"

// Configurações com validação
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log("🔧 [STORAGE] Inicializando configurações...")
console.log("   Supabase URL:", !!supabaseUrl)
console.log("   Supabase Key:", !!supabaseServiceKey)
console.log("   R2 Account ID:", !!process.env.CLOUDFLARE_R2_ACCOUNT_ID)
console.log("   R2 Access Key:", !!process.env.CLOUDFLARE_R2_ACCESS_KEY_ID)
console.log("   R2 Secret Key:", !!process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY)

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Configurações Supabase não encontradas")
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Configuração R2 com validação
const r2Config = {
  accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID,
  accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
}

if (!r2Config.accountId || !r2Config.accessKeyId || !r2Config.secretAccessKey) {
  throw new Error("Configurações Cloudflare R2 não encontradas")
}

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: r2Config.accessKeyId,
    secretAccessKey: r2Config.secretAccessKey,
  },
})

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || "coutyfil-assets"
const R2_PUBLIC_URL = "https://pub-bd3bd83c1f864ad880a287c264da1ae3.r2.dev"

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
  url: string
  uploadDate: string
  week: string
  year: number
  file_path: string
  original_size?: number
  compressed_size?: number
  compression_ratio?: number
}

// ===== FUNÇÃO DE UPLOAD DE PDF COM DEBUG =====

export async function addWeeklyPdf(file: File, name: string): Promise<WeeklyPdf> {
  console.log("📄 [STORAGE] === INÍCIO addWeeklyPdf ===")
  console.log(`📊 [STORAGE] Parâmetros: file=${file.name} (${file.size} bytes), name="${name}"`)

  try {
    // 1. Validações iniciais
    if (!file || file.size === 0) {
      throw new Error("Arquivo inválido ou vazio")
    }

    if (!name || name.trim() === "") {
      throw new Error("Nome é obrigatório")
    }

    // 2. Preparar dados para upload
    const timestamp = Date.now()
    const fileName = `weekly-pdfs/pdf-${timestamp}.pdf`
    const now = new Date()

    console.log(`📂 [STORAGE] Preparando upload: ${fileName}`)

    // 3. Converter arquivo para buffer
    console.log("🔄 [STORAGE] Convertendo arquivo para buffer...")
    let arrayBuffer: ArrayBuffer
    try {
      arrayBuffer = await file.arrayBuffer()
      console.log(`✅ [STORAGE] Buffer criado: ${arrayBuffer.byteLength} bytes`)
    } catch (bufferError) {
      console.error("❌ [STORAGE] Erro ao criar buffer:", bufferError)
      throw new Error(
        `Erro ao processar arquivo: ${bufferError instanceof Error ? bufferError.message : "Erro desconhecido"}`,
      )
    }

    const buffer = Buffer.from(arrayBuffer)

    // 4. Upload para R2
    console.log("☁️ [STORAGE] Iniciando upload para Cloudflare R2...")
    try {
      const uploadCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: "application/pdf",
        ContentLength: buffer.length,
      })

      console.log(`📤 [STORAGE] Executando upload para bucket: ${BUCKET_NAME}`)
      await r2Client.send(uploadCommand)
      console.log("✅ [STORAGE] Upload para R2 concluído")
    } catch (r2Error) {
      console.error("❌ [STORAGE] Erro no upload R2:", r2Error)
      throw new Error(`Erro no upload para R2: ${r2Error instanceof Error ? r2Error.message : "Erro desconhecido"}`)
    }

    const pdfUrl = `${R2_PUBLIC_URL}/${fileName}`
    console.log(`🔗 [STORAGE] URL gerada: ${pdfUrl}`)

    // 5. Criar registro no Supabase
    const newPdf: WeeklyPdf = {
      id: timestamp.toString(),
      name: name.trim(),
      url: pdfUrl,
      uploadDate: now.toISOString(),
      week: `${now.getDate()}/${now.getMonth() + 1}`,
      year: now.getFullYear(),
      file_path: fileName,
      original_size: file.size,
      compressed_size: file.size,
      compression_ratio: 1,
    }

    console.log("💾 [STORAGE] Salvando registro no Supabase...")
    console.log("📋 [STORAGE] Dados do registro:", {
      id: newPdf.id,
      name: newPdf.name,
      url: newPdf.url,
      file_path: newPdf.file_path,
    })

    try {
      const { data, error } = await supabase.from("weekly_pdfs").insert([newPdf]).select().single()

      if (error) {
        console.error("❌ [STORAGE] Erro Supabase:", error)
        throw new Error(`Erro Supabase: ${error.message} (Code: ${error.code})`)
      }

      console.log("✅ [STORAGE] Registro salvo no Supabase:", data?.id)
    } catch (supabaseError) {
      console.error("❌ [STORAGE] Erro ao salvar no Supabase:", supabaseError)

      // Tentar limpar o arquivo do R2 se o Supabase falhar
      try {
        console.log("🧹 [STORAGE] Tentando limpar arquivo do R2...")
        await r2Client.send(
          new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileName,
          }),
        )
        console.log("✅ [STORAGE] Arquivo removido do R2")
      } catch (cleanupError) {
        console.error("⚠️ [STORAGE] Erro ao limpar R2:", cleanupError)
      }

      throw new Error(
        `Erro ao salvar no banco de dados: ${supabaseError instanceof Error ? supabaseError.message : "Erro desconhecido"}`,
      )
    }

    // 6. Invalidar cache
    console.log("🗑️ [STORAGE] Invalidando cache...")
    if (typeof window !== "undefined") {
      localCache.remove(CACHE_CONFIGS.WEEKLY_PDFS.key)
    }

    console.log("✅ [STORAGE] PDF processado com sucesso!")
    console.log("📄 [STORAGE] === FIM addWeeklyPdf ===")

    return newPdf
  } catch (error) {
    console.error("❌ [STORAGE] Erro geral em addWeeklyPdf:", error)
    console.log("📄 [STORAGE] === FIM addWeeklyPdf (COM ERRO) ===")
    throw error
  }
}

// Resto das funções existentes mantidas...
export async function loadProductsFromCloud(): Promise<Product[]> {
  try {
    console.log("🔄 [PRODUCTS] Verificando cache local...")

    // Verificar se estamos no navegador
    const isClient = typeof window !== "undefined"

    // SEMPRE tentar carregar da database primeiro para debug
    if (process.env.NODE_ENV === "development") {
      console.log("🔧 [PRODUCTS] Modo desenvolvimento - carregando direto da database")
      const products = await fetchProductsFromDatabase()

      // Salvar no cache para próximas vezes (apenas no cliente)
      if (products.length > 0 && isClient) {
        localCache.set(CACHE_CONFIGS.PRODUCTS, products)
      }

      return products
    }

    // Tentar carregar do cache primeiro (apenas no cliente)
    let cachedProducts = null
    if (isClient) {
      cachedProducts = localCache.get(CACHE_CONFIGS.PRODUCTS)
    }

    if (cachedProducts) {
      console.log(`✅ [PRODUCTS] ${cachedProducts.length} produtos carregados do cache`)

      // Verificar em background (apenas no cliente)
      if (isClient) {
        checkForProductUpdates()
      }

      return cachedProducts
    }

    // Se não há cache, carregar da nuvem
    console.log("☁️ [PRODUCTS] Carregando da nuvem...")
    const products = await fetchProductsFromDatabase()

    // Salvar no cache (apenas no cliente)
    if (isClient) {
      localCache.set(CACHE_CONFIGS.PRODUCTS, products)
    }

    return products
  } catch (error) {
    console.error("❌ Erro ao carregar produtos:", error)

    // Em caso de erro, tentar retornar cache mesmo que expirado (apenas no cliente)
    if (typeof window !== "undefined") {
      try {
        const fallbackCache = localStorage.getItem("coutyfil_products")
        if (fallbackCache) {
          const parsed = JSON.parse(fallbackCache)
          console.log("🆘 [PRODUCTS] Usando cache de emergência")
          return parsed.data || []
        }
      } catch {
        // Ignorar erros de fallback
      }
    }

    return []
  }
}

// Função para buscar produtos da base de dados
async function fetchProductsFromDatabase(): Promise<Product[]> {
  try {
    console.log("🔄 [PRODUCTS] Conectando com Supabase...")

    const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("❌ Erro Supabase:", error)
      throw new Error(`Supabase Error: ${error.message}`)
    }

    console.log(`✅ ${data?.length || 0} produtos carregados da nuvem`)

    // Log dos primeiros produtos para debug
    if (data && data.length > 0) {
      console.log("📋 [PRODUCTS] Primeiros produtos:", data.slice(0, 2))
    }

    return data || []
  } catch (error) {
    console.error("💥 [PRODUCTS] Erro na fetchProductsFromDatabase:", error)
    throw error
  }
}

// Verificar atualizações em background
async function checkForProductUpdates(): Promise<void> {
  try {
    // Verificar se estamos no navegador
    if (typeof window === "undefined") return

    // Buscar apenas timestamp da última modificação
    const { data } = await supabase
      .from("products")
      .select("updated_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single()

    if (data?.updated_at) {
      const lastModified = new Date(data.updated_at).getTime()
      const cacheKey = "coutyfil_products_last_check"
      const lastCheck = Number.parseInt(localStorage.getItem(cacheKey) || "0")

      if (lastModified > lastCheck) {
        console.log("🔄 [PRODUCTS] Atualizações detectadas, recarregando...")
        const freshProducts = await fetchProductsFromDatabase()
        localCache.set(CACHE_CONFIGS.PRODUCTS, freshProducts)
        localStorage.setItem(cacheKey, lastModified.toString())

        // Disparar evento para componentes React
        window.dispatchEvent(
          new CustomEvent("productsUpdated", {
            detail: freshProducts,
          }),
        )
      }
    }
  } catch (error) {
    console.log("⚠️ [PRODUCTS] Erro ao verificar atualizações:", error)
  }
}

export async function saveProductsToCloud(products: Product[]): Promise<void> {
  try {
    console.log("💾 [PRODUCTS] Salvando na nuvem...")
    console.log(`📊 [PRODUCTS] Recebidos ${products.length} produtos para salvar`)

    // Verificar se temos produtos válidos
    if (!Array.isArray(products)) {
      throw new Error("Products deve ser um array")
    }

    // Validar cada produto
    for (let i = 0; i < products.length; i++) {
      const product = products[i]
      if (!product.id || !product.name) {
        console.error(`❌ [PRODUCTS] Produto inválido no índice ${i}:`, product)
        throw new Error(`Produto inválido no índice ${i}: faltam campos obrigatórios (id, name)`)
      }
    }

    // Verificar conexão Supabase
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Credenciais Supabase não configuradas")
    }

    console.log("🔄 [PRODUCTS] Executando upsert no Supabase...")

    const { error } = await supabase.from("products").upsert(
      products.map((product) => ({
        ...product,
        updated_at: new Date().toISOString(),
      })),
    )

    if (error) {
      console.error("❌ [PRODUCTS] Erro Supabase:", error)
      throw new Error(`Erro Supabase: ${error.message}`)
    }

    console.log("✅ [PRODUCTS] Upsert concluído com sucesso")

    // Atualizar cache local (apenas no cliente)
    if (typeof window !== "undefined") {
      localCache.set(CACHE_CONFIGS.PRODUCTS, products)
      localStorage.setItem("coutyfil_products_last_check", Date.now().toString())
    }

    console.log(`✅ ${products.length} produtos salvos e cache atualizado`)
  } catch (error) {
    console.error("❌ Erro ao salvar produtos:", error)
    throw error
  }
}

// Resto das funções existentes...
export async function loadWeeklyPdfsFromCloud(): Promise<WeeklyPdf[]> {
  try {
    console.log("🔄 [PDFS] Verificando cache local...")

    const cachedPdfs = localCache.get(CACHE_CONFIGS.WEEKLY_PDFS)

    if (cachedPdfs) {
      console.log(`✅ [PDFS] ${cachedPdfs.length} PDFs carregados do cache`)
      checkForPdfUpdates()
      return cachedPdfs
    }

    console.log("☁️ [PDFS] Carregando da nuvem...")
    const pdfs = await fetchPdfsFromDatabase()

    localCache.set(CACHE_CONFIGS.WEEKLY_PDFS, pdfs)

    return pdfs
  } catch (error) {
    console.error("❌ Erro ao carregar PDFs:", error)
    return []
  }
}

async function fetchPdfsFromDatabase(): Promise<WeeklyPdf[]> {
  const { data, error } = await supabase.from("weekly_pdfs").select("*").order("uploadDate", { ascending: false })

  if (error) {
    console.error("❌ Erro Supabase PDFs:", error)
    return []
  }

  console.log(`✅ ${data?.length || 0} PDFs carregados da nuvem`)
  return data || []
}

async function checkForPdfUpdates(): Promise<void> {
  try {
    const { data } = await supabase
      .from("weekly_pdfs")
      .select("uploadDate")
      .order("uploadDate", { ascending: false })
      .limit(1)
      .single()

    if (data?.uploadDate) {
      const lastModified = new Date(data.uploadDate).getTime()
      const cacheKey = "coutyfil_pdfs_last_check"
      const lastCheck = Number.parseInt(localStorage.getItem(cacheKey) || "0")

      if (lastModified > lastCheck) {
        console.log("🔄 [PDFS] Atualizações detectadas, recarregando...")
        const freshPdfs = await fetchPdfsFromDatabase()
        localCache.set(CACHE_CONFIGS.WEEKLY_PDFS, freshPdfs)
        localStorage.setItem(cacheKey, lastModified.toString())

        window.dispatchEvent(
          new CustomEvent("pdfsUpdated", {
            detail: freshPdfs,
          }),
        )
      }
    }
  } catch (error) {
    console.log("⚠️ [PDFS] Erro ao verificar atualizações:", error)
  }
}

// ===== IMAGENS COM CACHE =====

export async function uploadImageToCloud(file: File): Promise<string> {
  try {
    console.log("📸 [R2] Iniciando upload de imagem...")

    const timestamp = Date.now()
    const extension = file.name.split(".").pop()
    const fileName = `products/image-${timestamp}.${extension}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    await r2Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
      }),
    )

    const imageUrl = `${R2_PUBLIC_URL}/${fileName}`

    // Cache da imagem localmente (como base64 para imagens pequenas)
    if (file.size < 500 * 1024) {
      // Menos de 500KB
      const reader = new FileReader()
      reader.onload = () => {
        const imageCache = JSON.parse(localStorage.getItem("coutyfil_image_cache") || "{}")
        imageCache[imageUrl] = reader.result
        localStorage.setItem("coutyfil_image_cache", JSON.stringify(imageCache))
      }
      reader.readAsDataURL(file)
    }

    console.log("✅ [R2] Upload concluído:", imageUrl)
    return imageUrl
  } catch (error) {
    console.error("💥 [R2] Erro no upload:", error)
    throw error
  }
}

// Função para obter imagem do cache ou URL
export function getOptimizedImageSrc(url: string): string {
  try {
    const imageCache = JSON.parse(localStorage.getItem("coutyfil_image_cache") || "{}")
    return imageCache[url] || url
  } catch {
    return url
  }
}

export async function deleteWeeklyPdf(pdfId: string): Promise<void> {
  try {
    console.log("🗑️ Deletando PDF...")

    const { data: pdf } = await supabase.from("weekly_pdfs").select("file_path").eq("id", pdfId).single()

    if (pdf?.file_path) {
      await r2Client.send(
        new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: pdf.file_path,
        }),
      )
    }

    const { error } = await supabase.from("weekly_pdfs").delete().eq("id", pdfId)

    if (error) throw error

    // Invalidar cache
    localCache.remove(CACHE_CONFIGS.WEEKLY_PDFS.key)

    console.log("✅ PDF deletado")
  } catch (error) {
    console.error("❌ Erro ao deletar PDF:", error)
    throw error
  }
}

export async function getLatestWeeklyPdf(): Promise<WeeklyPdf | null> {
  try {
    const { data, error } = await supabase
      .from("weekly_pdfs")
      .select("*")
      .order("uploadDate", { ascending: false })
      .limit(1)
      .single()

    if (error || !data) return null

    return data
  } catch (error) {
    return null
  }
}

// ===== UTILITÁRIOS DE CACHE =====

export function getCacheStats() {
  if (typeof window === "undefined") {
    return { totalItems: 0, totalSize: 0, items: [] }
  }
  return localCache.getStats()
}

export function clearAllCache() {
  if (typeof window === "undefined") return

  localCache.clearAll()

  // Limpar também outros caches
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.includes("coutyfil")) {
      keys.push(key)
    }
  }
  keys.forEach((key) => localStorage.removeItem(key))
  console.log(`🧹 [CACHE] ${keys.length} itens removidos do localStorage`)
}

export function preloadImages(imageUrls: string[]) {
  imageUrls.forEach((url) => {
    const img = new Image()
    img.src = getOptimizedImageSrc(url)
  })
}
