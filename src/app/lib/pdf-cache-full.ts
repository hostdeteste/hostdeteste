// Sistema de cache completo para PDFs - armazena o arquivo inteiro
interface FullPdfCacheData {
  url: string
  name: string
  blob: string // PDF como base64
  size: number
  timestamp: number
  expiresAt: number
  lastAccessed: number
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
  }>
}

class FullPdfCache {
  private static instance: FullPdfCache
  private readonly CACHE_PREFIX = "pdf_full_"
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 dias
  private readonly MAX_CACHE_SIZE = 15 * 1024 * 1024 // 15MB máximo (mais generoso)
  private readonly MAX_PDF_SIZE = 8 * 1024 * 1024 // 8MB por PDF (bem generoso)
  private readonly COMPRESSION_ENABLED = true
  private storageCapacity: number | null = null

  static getInstance(): FullPdfCache {
    if (!FullPdfCache.instance) {
      FullPdfCache.instance = new FullPdfCache()
    }
    return FullPdfCache.instance
  }

  // Verificar se estamos no navegador
  private isClient(): boolean {
    return typeof window !== "undefined" && typeof localStorage !== "undefined"
  }

  // Gerar chave única para o PDF
  private generateKey(url: string): string {
    const cleanUrl = url.replace(/[^a-zA-Z0-9]/g, "_")
    return `${this.CACHE_PREFIX}${cleanUrl.slice(-12)}` // Chave bem curta
  }

  // Verificar se o cache é válido
  private isValidCache(data: FullPdfCacheData): boolean {
    return Date.now() < data.expiresAt
  }

  // Detectar capacidade real do localStorage
  private async detectStorageCapacity(): Promise<number> {
    if (!this.isClient()) return 0
    if (this.storageCapacity !== null) return this.storageCapacity

    console.log("🔍 [PDF-CACHE] Detectando capacidade do localStorage...")

    try {
      const testKey = "capacity_test"
      let capacity = 0
      const chunkSize = 100 * 1024 // 100KB chunks

      // Limpar qualquer teste anterior
      localStorage.removeItem(testKey)

      // Testar incrementalmente
      for (let size = chunkSize; size <= 50 * 1024 * 1024; size += chunkSize) {
        try {
          const testData = "x".repeat(size)
          localStorage.setItem(testKey, testData)
          capacity = size
        } catch (e) {
          // Atingiu o limite
          break
        }
      }

      // Limpar teste
      localStorage.removeItem(testKey)

      // Converter para bytes (considerando UTF-16)
      this.storageCapacity = capacity * 2
      console.log(`✅ [PDF-CACHE] Capacidade detectada: ${(this.storageCapacity / 1024 / 1024).toFixed(2)}MB`)

      return this.storageCapacity
    } catch (error) {
      console.warn("⚠️ [PDF-CACHE] Erro ao detectar capacidade, usando padrão:", error)
      this.storageCapacity = 5 * 1024 * 1024 // 5MB padrão
      return this.storageCapacity
    }
  }

  // Calcular uso real do localStorage
  private async getStorageUsage(): Promise<{ used: number; available: number; total: number }> {
    if (!this.isClient()) return { used: 0, available: 0, total: 0 }

    const total = await this.detectStorageCapacity()
    let used = 0

    try {
      // Calcular uso real
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          const value = localStorage.getItem(key)
          if (value) {
            used += (key.length + value.length) * 2 // UTF-16 = 2 bytes por char
          }
        }
      }
    } catch (error) {
      console.warn("⚠️ [PDF-CACHE] Erro ao calcular uso do storage:", error)
    }

    const available = Math.max(0, total - used)

    console.log(
      `📊 [PDF-CACHE] Storage: ${(used / 1024 / 1024).toFixed(2)}MB usado / ${(total / 1024 / 1024).toFixed(2)}MB total = ${(available / 1024 / 1024).toFixed(2)}MB disponível`,
    )

    return { used, available, total }
  }

  // Comprimir PDF usando técnicas básicas
  private async compressPdfBlob(blob: Blob): Promise<{ blob: Blob; isCompressed: boolean }> {
    if (!this.COMPRESSION_ENABLED) return { blob, isCompressed: false }

    try {
      // Comprimir PDFs maiores que 1MB
      if (blob.size < 1024 * 1024) return { blob, isCompressed: false }

      console.log(`🗜️ [PDF-CACHE] Comprimindo PDF de ${(blob.size / 1024 / 1024).toFixed(2)}MB...`)

      // Usar CompressionStream se disponível (navegadores modernos)
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

  // Limpar cache completamente
  private async totalCleanup(): Promise<number> {
    if (!this.isClient()) return 0

    let freedSpace = 0
    const keys: string[] = []

    // Coletar todas as chaves de cache
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(this.CACHE_PREFIX)) {
        keys.push(key)
      }
    }

    // Remover tudo
    for (const key of keys) {
      try {
        const value = localStorage.getItem(key)
        if (value) {
          freedSpace += (key.length + value.length) * 2
        }
        localStorage.removeItem(key)
      } catch (error) {
        console.warn(`⚠️ [PDF-CACHE] Erro ao remover ${key}:`, error)
      }
    }

    console.log(
      `🧹 [PDF-CACHE] Limpeza total: ${keys.length} PDFs removidos, ${(freedSpace / 1024 / 1024).toFixed(2)}MB liberados`,
    )
    return freedSpace
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

      // Verificar se o PDF não é muito grande para cachear
      if (originalBlob.size > this.MAX_PDF_SIZE) {
        console.log(
          `⚠️ [PDF-CACHE] PDF muito grande (${sizeInMB.toFixed(2)}MB > ${(this.MAX_PDF_SIZE / 1024 / 1024).toFixed(1)}MB), usando proxy`,
        )
        return this.getProxyUrl(url)
      }

      // Comprimir o PDF
      const { blob: compressedBlob, isCompressed } = await this.compressPdfBlob(originalBlob)

      // Converter para base64
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
      })
      reader.readAsDataURL(compressedBlob)
      const base64Data = await base64Promise

      // Preparar dados do cache
      const cacheData: FullPdfCacheData = {
        url,
        name,
        blob: base64Data,
        size: compressedBlob.size,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.CACHE_DURATION,
        lastAccessed: Date.now(),
      }

      const key = this.generateKey(url)
      const finalSize = (key.length + JSON.stringify(cacheData).length) * 2 // UTF-16

      console.log(`📊 [PDF-CACHE] Tamanho final para armazenar: ${(finalSize / 1024 / 1024).toFixed(2)}MB`)

      // Verificar espaço disponível
      const { available } = await this.getStorageUsage()

      // Se não há espaço suficiente, fazer limpeza total
      if (available < finalSize) {
        console.log(
          `🧹 [PDF-CACHE] Espaço insuficiente (${(available / 1024 / 1024).toFixed(2)}MB < ${(finalSize / 1024 / 1024).toFixed(2)}MB), fazendo limpeza total...`,
        )

        await this.totalCleanup()

        // Verificar novamente após limpeza
        const { available: newAvailable } = await this.getStorageUsage()
        console.log(`📊 [PDF-CACHE] Após limpeza total: ${(newAvailable / 1024 / 1024).toFixed(2)}MB disponível`)

        if (newAvailable < finalSize) {
          console.warn(
            `⚠️ [PDF-CACHE] Ainda sem espaço após limpeza total (${(newAvailable / 1024 / 1024).toFixed(2)}MB < ${(finalSize / 1024 / 1024).toFixed(2)}MB), usando proxy`,
          )
          return this.getProxyUrl(url)
        }
      }

      // Tentar salvar no localStorage
      try {
        localStorage.setItem(key, JSON.stringify(cacheData))
        console.log(
          `✅ [PDF-CACHE] PDF cacheado com sucesso: ${name} (${(compressedBlob.size / 1024 / 1024).toFixed(2)}MB${isCompressed ? " comprimido" : ""})`,
        )

        // Verificar se realmente foi salvo
        const verification = localStorage.getItem(key)
        if (!verification) {
          throw new Error("PDF não foi salvo corretamente")
        }

        // Retornar URL do blob para uso imediato
        return URL.createObjectURL(await this.decompressPdfBlob(compressedBlob, isCompressed))
      } catch (quotaError) {
        console.error(`❌ [PDF-CACHE] Erro de quota mesmo após limpeza:`, quotaError)
        return this.getProxyUrl(url)
      }
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

      // Converter base64 de volta para blob
      const response = await fetch(cacheData.blob)
      const compressedBlob = await response.blob()

      // Descomprimir se necessário
      const originalBlob = await this.decompressPdfBlob(compressedBlob, this.COMPRESSION_ENABLED)

      // Criar URL do blob
      const blobUrl = URL.createObjectURL(originalBlob)

      console.log(`✅ [PDF-CACHE] PDF servido do cache: ${cacheData.name}`)
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
