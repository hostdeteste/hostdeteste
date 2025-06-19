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
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024 // 50MB máximo
  private readonly COMPRESSION_ENABLED = true

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
    return `${this.CACHE_PREFIX}${cleanUrl.slice(-32)}`
  }

  // Verificar se o cache é válido
  private isValidCache(data: FullPdfCacheData): boolean {
    return Date.now() < data.expiresAt
  }

  // Comprimir PDF usando técnicas básicas
  private async compressPdfBlob(blob: Blob): Promise<Blob> {
    if (!this.COMPRESSION_ENABLED) return blob

    try {
      // Para PDFs pequenos, não comprimir
      if (blob.size < 1024 * 1024) return blob // < 1MB

      console.log(`🗜️ [PDF-CACHE] Comprimindo PDF de ${(blob.size / 1024 / 1024).toFixed(2)}MB...`)

      // Usar CompressionStream se disponível (navegadores modernos)
      if ("CompressionStream" in window) {
        const stream = new CompressionStream("gzip")
        const compressedStream = blob.stream().pipeThrough(stream)
        const compressedBlob = await new Response(compressedStream).blob()

        const compressionRatio = blob.size / compressedBlob.size
        console.log(
          `✅ [PDF-CACHE] Compressão: ${(compressedBlob.size / 1024 / 1024).toFixed(2)}MB (${compressionRatio.toFixed(2)}x menor)`,
        )

        return compressedBlob
      }

      // Fallback: retornar original se não há suporte à compressão
      return blob
    } catch (error) {
      console.warn("⚠️ [PDF-CACHE] Erro na compressão, usando original:", error)
      return blob
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

  // Verificar e limpar cache se necessário
  private async cleanupCacheIfNeeded(): Promise<void> {
    if (!this.isClient()) return

    try {
      let totalSize = 0
      const cacheEntries: Array<{ key: string; data: FullPdfCacheData }> = []

      // Calcular tamanho total e coletar entradas
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(this.CACHE_PREFIX)) {
          try {
            const cached = localStorage.getItem(key)
            if (cached) {
              const data: FullPdfCacheData = JSON.parse(cached)

              // Remover entradas expiradas
              if (!this.isValidCache(data)) {
                localStorage.removeItem(key)
                console.log(`🧹 [PDF-CACHE] Removido PDF expirado: ${data.name}`)
                continue
              }

              totalSize += data.size
              cacheEntries.push({ key, data })
            }
          } catch {
            // Remover entradas corrompidas
            localStorage.removeItem(key!)
          }
        }
      }

      // Se excedeu o limite, remover os mais antigos
      if (totalSize > this.MAX_CACHE_SIZE) {
        console.log(`🧹 [PDF-CACHE] Cache muito grande (${(totalSize / 1024 / 1024).toFixed(2)}MB), limpando...`)

        // Ordenar por último acesso (mais antigos primeiro)
        cacheEntries.sort((a, b) => a.data.lastAccessed - b.data.lastAccessed)

        // Remover até ficar abaixo do limite
        for (const entry of cacheEntries) {
          if (totalSize <= this.MAX_CACHE_SIZE * 0.8) break // Deixar 20% de margem

          localStorage.removeItem(entry.key)
          totalSize -= entry.data.size
          console.log(`🧹 [PDF-CACHE] Removido PDF antigo: ${entry.data.name}`)
        }
      }
    } catch (error) {
      console.error("❌ [PDF-CACHE] Erro na limpeza do cache:", error)
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

      console.log(`📥 [PDF-CACHE] Baixando e cacheando PDF: ${name}`)

      // Baixar o PDF
      const response = await fetch(this.getProxyUrl(url))
      if (!response.ok) {
        throw new Error(`Erro ao baixar PDF: ${response.status}`)
      }

      const originalBlob = await response.blob()
      console.log(`📄 [PDF-CACHE] PDF baixado: ${(originalBlob.size / 1024 / 1024).toFixed(2)}MB`)

      // Verificar se o PDF não é muito grande
      if (originalBlob.size > 10 * 1024 * 1024) {
        // 10MB
        console.warn(`⚠️ [PDF-CACHE] PDF muito grande (${(originalBlob.size / 1024 / 1024).toFixed(2)}MB), usando proxy`)
        return this.getProxyUrl(url)
      }

      // Comprimir se necessário
      const compressedBlob = await this.compressPdfBlob(originalBlob)
      const isCompressed = compressedBlob.size < originalBlob.size

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

      // Limpar cache se necessário antes de adicionar
      await this.cleanupCacheIfNeeded()

      // Salvar no localStorage
      const key = this.generateKey(url)
      localStorage.setItem(key, JSON.stringify(cacheData))

      console.log(`✅ [PDF-CACHE] PDF cacheado com sucesso: ${name}`)
      console.log(
        `📊 [PDF-CACHE] Tamanho: ${(compressedBlob.size / 1024 / 1024).toFixed(2)}MB${isCompressed ? " (comprimido)" : ""}`,
      )

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

  // Registrar economia de bandwidth
  private recordBandwidthSaving(size: number): void {
    if (!this.isClient()) return

    try {
      const stats = JSON.parse(
        localStorage.getItem("pdf_cache_stats") || '{"totalSaved": 0, "requestsSaved": 0, "totalRequests": 0}',
      )
      stats.totalSaved += size
      stats.requestsSaved += 1
      stats.totalRequests += 1
      localStorage.setItem("pdf_cache_stats", JSON.stringify(stats))
    } catch {
      // Ignorar erros de estatísticas
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
