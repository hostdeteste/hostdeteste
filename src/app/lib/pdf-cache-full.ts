// Sistema de cache híbrido para PDFs - localStorage + IndexedDB
interface FullPdfCacheData {
  url: string
  name: string
  blob?: string // PDF como base64 (localStorage)
  size: number
  timestamp: number
  expiresAt: number
  lastAccessed: number
  storage: "localStorage" | "indexedDB"
}

interface CacheStats {
  totalPdfs: number
  totalSize: string
  pdfs: Array<{
    name: string
    size: string
    age: string
    expiresIn: string
    lastAccessed: string
    storage: string
  }>
}

class FullPdfCache {
  private static instance: FullPdfCache
  private readonly CACHE_PREFIX = "pdf_full_"
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 dias
  private readonly MAX_LOCALSTORAGE_SIZE = 3 * 1024 * 1024 // 3MB para localStorage
  private readonly MAX_PDF_SIZE = 20 * 1024 * 1024 // 20MB máximo total
  private readonly COMPRESSION_ENABLED = true
  private readonly DB_NAME = "PdfCacheDB"
  private readonly DB_VERSION = 1
  private readonly STORE_NAME = "pdfs"
  private db: IDBDatabase | null = null

  static getInstance(): FullPdfCache {
    if (!FullPdfCache.instance) {
      FullPdfCache.instance = new FullPdfCache()
    }
    return FullPdfCache.instance
  }

  // Verificar se estamos no navegador
  private isClient(): boolean {
    return typeof window !== "undefined" && typeof localStorage !== "undefined" && typeof indexedDB !== "undefined"
  }

  // Gerar chave única para o PDF
  private generateKey(url: string): string {
    const cleanUrl = url.replace(/[^a-zA-Z0-9]/g, "_")
    return `${this.CACHE_PREFIX}${cleanUrl.slice(-12)}`
  }

  // Verificar se o cache é válido
  private isValidCache(data: FullPdfCacheData): boolean {
    return Date.now() < data.expiresAt
  }

  // Inicializar IndexedDB
  private async initIndexedDB(): Promise<IDBDatabase> {
    if (this.db) return this.db

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)

      request.onerror = () => {
        console.error("❌ [PDF-CACHE] Erro ao abrir IndexedDB:", request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log("✅ [PDF-CACHE] IndexedDB inicializado")
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Criar object store se não existir
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: "key" })
          store.createIndex("timestamp", "timestamp", { unique: false })
          console.log("🔧 [PDF-CACHE] Object store criado no IndexedDB")
        }
      }
    })
  }

  // Salvar PDF no IndexedDB
  private async saveToIndexedDB(key: string, data: FullPdfCacheData, blob: Blob): Promise<void> {
    const db = await this.initIndexedDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], "readwrite")
      const store = transaction.objectStore(this.STORE_NAME)

      const record = {
        key,
        metadata: data,
        blob: blob,
      }

      const request = store.put(record)

      request.onsuccess = () => {
        console.log(`✅ [PDF-CACHE] PDF salvo no IndexedDB: ${data.name}`)
        resolve()
      }

      request.onerror = () => {
        console.error("❌ [PDF-CACHE] Erro ao salvar no IndexedDB:", request.error)
        reject(request.error)
      }
    })
  }

  // Recuperar PDF do IndexedDB
  private async getFromIndexedDB(key: string): Promise<{ metadata: FullPdfCacheData; blob: Blob } | null> {
    try {
      const db = await this.initIndexedDB()

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.STORE_NAME], "readonly")
        const store = transaction.objectStore(this.STORE_NAME)
        const request = store.get(key)

        request.onsuccess = () => {
          if (request.result) {
            resolve({
              metadata: request.result.metadata,
              blob: request.result.blob,
            })
          } else {
            resolve(null)
          }
        }

        request.onerror = () => {
          console.error("❌ [PDF-CACHE] Erro ao recuperar do IndexedDB:", request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.error("❌ [PDF-CACHE] Erro no IndexedDB:", error)
      return null
    }
  }

  // Limpar IndexedDB
  private async clearIndexedDB(): Promise<void> {
    try {
      const db = await this.initIndexedDB()

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.STORE_NAME], "readwrite")
        const store = transaction.objectStore(this.STORE_NAME)
        const request = store.clear()

        request.onsuccess = () => {
          console.log("🧹 [PDF-CACHE] IndexedDB limpo")
          resolve()
        }

        request.onerror = () => {
          console.error("❌ [PDF-CACHE] Erro ao limpar IndexedDB:", request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.error("❌ [PDF-CACHE] Erro ao limpar IndexedDB:", error)
    }
  }

  // Comprimir PDF usando técnicas básicas
  private async compressPdfBlob(blob: Blob): Promise<{ blob: Blob; isCompressed: boolean }> {
    if (!this.COMPRESSION_ENABLED) return { blob, isCompressed: false }

    try {
      // Comprimir PDFs maiores que 1MB
      if (blob.size < 1024 * 1024) return { blob, isCompressed: false }

      console.log(`🗜️ [PDF-CACHE] Comprimindo PDF de ${(blob.size / 1024 / 1024).toFixed(2)}MB...`)

      // Usar CompressionStream se disponível
      if ("CompressionStream" in window) {
        const stream = new CompressionStream("gzip")
        const compressedStream = blob.stream().pipeThrough(stream)
        const compressedBlob = await new Response(compressedStream).blob()

        // Usar se comprimiu pelo menos 10%
        if (compressedBlob.size < blob.size * 0.9) {
          const savedMB = (blob.size - compressedBlob.size) / 1024 / 1024
          console.log(
            `✅ [PDF-CACHE] Comprimido: ${(compressedBlob.size / 1024 / 1024).toFixed(2)}MB (economizou ${savedMB.toFixed(2)}MB)`,
          )
          return { blob: compressedBlob, isCompressed: true }
        } else {
          console.log(
            `📄 [PDF-CACHE] Compressão não eficiente (${((1 - compressedBlob.size / blob.size) * 100).toFixed(1)}%), usando original`,
          )
        }
      }

      return { blob, isCompressed: false }
    } catch (error) {
      console.warn("⚠️ [PDF-CACHE] Erro na compressão, usando original:", error)
      return { blob, isCompressed: false }
    }
  }

  // Descomprimir PDF
  private async decompressPdfBlob(blob: Blob, isCompressed: boolean): Promise<Blob> {
    if (!isCompressed || !this.COMPRESSION_ENABLED) return blob

    try {
      if ("DecompressionStream" in window) {
        const stream = new DecompressionStream("gzip")
        const decompressedStream = blob.stream().pipeThrough(stream)
        return await new Response(decompressedStream).blob()
      }
      return blob
    } catch (error) {
      console.warn("⚠️ [PDF-CACHE] Erro na descompressão:", error)
      return blob
    }
  }

  // Armazenar PDF completo no cache
  async cachePdf(url: string, name: string): Promise<string> {
    if (!this.isClient()) {
      return this.getProxyUrl(url)
    }

    try {
      // Verificar se já está em cache
      const cached = await this.getCachedPdf(url)
      if (cached) {
        console.log(`✅ [PDF-CACHE] PDF já em cache: ${name}`)
        return cached
      }

      console.log(`📥 [PDF-CACHE] Tentando cachear PDF: ${name}`)

      // Baixar o PDF
      const response = await fetch(this.getProxyUrl(url))
      if (!response.ok) {
        throw new Error(`Erro ao baixar PDF: ${response.status}`)
      }

      const originalBlob = await response.blob()
      const sizeInMB = originalBlob.size / 1024 / 1024

      console.log(`📄 [PDF-CACHE] PDF baixado: ${sizeInMB.toFixed(2)}MB`)

      // Verificar se o PDF não é muito grande
      if (originalBlob.size > this.MAX_PDF_SIZE) {
        console.log(`⚠️ [PDF-CACHE] PDF muito grande (${sizeInMB.toFixed(2)}MB), usando proxy`)
        return this.getProxyUrl(url)
      }

      // Comprimir o PDF
      const { blob: compressedBlob, isCompressed } = await this.compressPdfBlob(originalBlob)
      const finalSizeInMB = compressedBlob.size / 1024 / 1024

      const key = this.generateKey(url)

      // Decidir onde armazenar baseado no tamanho
      const useIndexedDB = compressedBlob.size > this.MAX_LOCALSTORAGE_SIZE

      console.log(
        `📊 [PDF-CACHE] Tamanho final: ${finalSizeInMB.toFixed(2)}MB - usando ${useIndexedDB ? "IndexedDB" : "localStorage"}`,
      )

      if (useIndexedDB) {
        // Usar IndexedDB para PDFs grandes
        const cacheData: FullPdfCacheData = {
          url,
          name,
          size: compressedBlob.size,
          timestamp: Date.now(),
          expiresAt: Date.now() + this.CACHE_DURATION,
          lastAccessed: Date.now(),
          storage: "indexedDB",
        }

        await this.saveToIndexedDB(key, cacheData, compressedBlob)

        // Salvar metadados no localStorage
        localStorage.setItem(key, JSON.stringify(cacheData))

        console.log(`✅ [PDF-CACHE] PDF cacheado no IndexedDB: ${name} (${finalSizeInMB.toFixed(2)}MB)`)
      } else {
        // Usar localStorage para PDFs pequenos
        const reader = new FileReader()
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
        })
        reader.readAsDataURL(compressedBlob)
        const base64Data = await base64Promise

        const cacheData: FullPdfCacheData = {
          url,
          name,
          blob: base64Data,
          size: compressedBlob.size,
          timestamp: Date.now(),
          expiresAt: Date.now() + this.CACHE_DURATION,
          lastAccessed: Date.now(),
          storage: "localStorage",
        }

        localStorage.setItem(key, JSON.stringify(cacheData))
        console.log(`✅ [PDF-CACHE] PDF cacheado no localStorage: ${name} (${finalSizeInMB.toFixed(2)}MB)`)
      }

      // Retornar URL do blob para uso imediato
      return URL.createObjectURL(await this.decompressPdfBlob(compressedBlob, isCompressed))
    } catch (error) {
      console.error("❌ [PDF-CACHE] Erro ao cachear PDF:", error)
      return this.getProxyUrl(url)
    }
  }

  // Recuperar PDF do cache
  async getCachedPdf(url: string): Promise<string | null> {
    if (!this.isClient()) return null

    try {
      const key = this.generateKey(url)
      const cached = localStorage.getItem(key)

      if (!cached) {
        return null
      }

      const cacheData: FullPdfCacheData = JSON.parse(cached)

      if (!this.isValidCache(cacheData)) {
        localStorage.removeItem(key)
        return null
      }

      // Atualizar último acesso
      cacheData.lastAccessed = Date.now()
      localStorage.setItem(key, JSON.stringify(cacheData))

      let blob: Blob

      if (cacheData.storage === "indexedDB") {
        // Recuperar do IndexedDB
        const result = await this.getFromIndexedDB(key)
        if (!result) {
          localStorage.removeItem(key)
          return null
        }
        blob = result.blob
      } else {
        // Recuperar do localStorage
        if (!cacheData.blob) {
          localStorage.removeItem(key)
          return null
        }
        const response = await fetch(cacheData.blob)
        blob = await response.blob()
      }

      // Descomprimir se necessário
      const originalBlob = await this.decompressPdfBlob(blob, this.COMPRESSION_ENABLED)

      // Criar URL do blob
      const blobUrl = URL.createObjectURL(originalBlob)

      console.log(`✅ [PDF-CACHE] PDF servido do ${cacheData.storage}: ${cacheData.name}`)
      return blobUrl
    } catch (error) {
      console.error("❌ [PDF-CACHE] Erro ao recuperar PDF do cache:", error)
      return null
    }
  }

  // Verificar se PDF está em cache
  isPdfCached(url: string): boolean {
    if (!this.isClient()) return false

    const key = this.generateKey(url)
    const cached = localStorage.getItem(key)

    if (!cached) return false

    try {
      const cacheData: FullPdfCacheData = JSON.parse(cached)
      return this.isValidCache(cacheData)
    } catch {
      return false
    }
  }

  // Gerar URL do proxy
  getProxyUrl(originalUrl: string): string {
    const encodedUrl = encodeURIComponent(originalUrl)
    return `/api/pdf-proxy?url=${encodedUrl}`
  }

  // Obter informações detalhadas do cache
  getCacheInfo(): CacheStats {
    if (!this.isClient()) {
      return { totalPdfs: 0, totalSize: "0MB", pdfs: [] }
    }

    const pdfs: Array<{
      name: string
      size: string
      age: string
      expiresIn: string
      lastAccessed: string
      storage: string
    }> = []

    let totalSize = 0

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(this.CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key)
          if (cached) {
            const cacheData: FullPdfCacheData = JSON.parse(cached)

            if (this.isValidCache(cacheData)) {
              const age = Date.now() - cacheData.timestamp
              const expiresIn = cacheData.expiresAt - Date.now()
              const lastAccessed = Date.now() - cacheData.lastAccessed

              totalSize += cacheData.size

              pdfs.push({
                name: cacheData.name,
                size: `${(cacheData.size / 1024 / 1024).toFixed(2)}MB`,
                age: this.formatTime(age),
                expiresIn: this.formatTime(expiresIn),
                lastAccessed: this.formatTime(lastAccessed),
                storage: cacheData.storage,
              })
            }
          }
        } catch {
          // Ignorar entradas corrompidas
        }
      }
    }

    return {
      totalPdfs: pdfs.length,
      totalSize: `${(totalSize / 1024 / 1024).toFixed(2)}MB`,
      pdfs: pdfs.sort((a, b) => a.name.localeCompare(b.name)),
    }
  }

  // Formatar tempo em formato legível
  private formatTime(milliseconds: number): string {
    const hours = Math.floor(milliseconds / (60 * 60 * 1000))
    const days = Math.floor(hours / 24)

    if (days > 0) {
      const remainingHours = hours % 24
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
    }
    if (hours > 0) {
      return `${hours}h`
    }
    const minutes = Math.floor(milliseconds / (60 * 1000))
    return `${minutes}m`
  }

  // Limpar todo o cache de PDFs
  clearAllCache(): void {
    if (!this.isClient()) return

    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(this.CACHE_PREFIX)) {
        keys.push(key)
      }
    }

    keys.forEach((key) => localStorage.removeItem(key))

    // Limpar IndexedDB também
    this.clearIndexedDB()

    console.log(`🧹 [PDF-CACHE] Cache completo limpo (${keys.length} PDFs removidos)`)
  }

  // Pré-carregar PDF em background
  async preloadPdf(url: string, name: string): Promise<void> {
    if (!this.isClient() || this.isPdfCached(url)) return

    try {
      console.log(`🔄 [PDF-CACHE] Pré-carregando PDF: ${name}`)
      await this.cachePdf(url, name)
    } catch (error) {
      console.log(`⚠️ [PDF-CACHE] Erro no pré-carregamento: ${error}`)
    }
  }

  // Obter estatísticas de economia de bandwidth
  getBandwidthSavings(): {
    totalSaved: string
    requestsSaved: number
    cacheHitRate: string
  } {
    if (!this.isClient()) {
      return { totalSaved: "0MB", requestsSaved: 0, cacheHitRate: "0%" }
    }

    try {
      const stats = JSON.parse(
        localStorage.getItem("pdf_cache_stats") || '{"totalSaved": 0, "requestsSaved": 0, "totalRequests": 0}',
      )

      const cacheHitRate =
        stats.totalRequests > 0 ? ((stats.requestsSaved / stats.totalRequests) * 100).toFixed(1) : "0"

      return {
        totalSaved: `${(stats.totalSaved / 1024 / 1024).toFixed(2)}MB`,
        requestsSaved: stats.requestsSaved,
        cacheHitRate: `${cacheHitRate}%`,
      }
    } catch {
      return { totalSaved: "0MB", requestsSaved: 0, cacheHitRate: "0%" }
    }
  }
}

export const fullPdfCache = FullPdfCache.getInstance()

// Hook para usar o cache completo de PDF
export function useFullPdfCache() {
  return {
    cachePdf: fullPdfCache.cachePdf.bind(fullPdfCache),
    getCachedPdf: fullPdfCache.getCachedPdf.bind(fullPdfCache),
    isPdfCached: fullPdfCache.isPdfCached.bind(fullPdfCache),
    getCacheInfo: fullPdfCache.getCacheInfo.bind(fullPdfCache),
    clearAllCache: fullPdfCache.clearAllCache.bind(fullPdfCache),
    getProxyUrl: fullPdfCache.getProxyUrl.bind(fullPdfCache),
    preloadPdf: fullPdfCache.preloadPdf.bind(fullPdfCache),
    getBandwidthSavings: fullPdfCache.getBandwidthSavings.bind(fullPdfCache),
  }
}
