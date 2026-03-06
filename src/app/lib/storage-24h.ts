// Sistema de cache otimizado para 24 horas - sem dependência de Supabase
// Usa armazenamento em memória para desenvolvimento/produção leve

export interface CacheStatus {
  enabled: boolean
  ttl: number // em milissegundos
  strategy: string
}

export interface CacheStats {
  products: {
    cached: boolean
    count: number
    age: number
    lastUpdate: string | null
  }
  pdfs: {
    cached: boolean
    count: number
    age: number
    lastUpdate: string | null
  }
  totalHits: number
  totalMisses: number
}

// Configuração de cache 24h
const CACHE_TTL_24H = 24 * 60 * 60 * 1000 // 24 horas em milissegundos

// Estado do cache em memória
let cacheEnabled = true
let totalCacheHits = 0
let totalCacheMisses = 0
let productsCacheTime: number | null = null
let pdfsCacheTime: number | null = null
let productsCount = 0
let pdfsCount = 0

export function getCacheStatus24H(): CacheStatus {
  return {
    enabled: cacheEnabled,
    ttl: CACHE_TTL_24H,
    strategy: "memory-24h",
  }
}

export function getCacheStats24H(): CacheStats {
  const now = Date.now()
  
  return {
    products: {
      cached: productsCacheTime !== null && now - productsCacheTime < CACHE_TTL_24H,
      count: productsCount,
      age: productsCacheTime ? now - productsCacheTime : 0,
      lastUpdate: productsCacheTime ? new Date(productsCacheTime).toISOString() : null,
    },
    pdfs: {
      cached: pdfsCacheTime !== null && now - pdfsCacheTime < CACHE_TTL_24H,
      count: pdfsCount,
      age: pdfsCacheTime ? now - pdfsCacheTime : 0,
      lastUpdate: pdfsCacheTime ? new Date(pdfsCacheTime).toISOString() : null,
    },
    totalHits: totalCacheHits,
    totalMisses: totalCacheMisses,
  }
}

export function updateProductsCacheStats(count: number): void {
  productsCount = count
  productsCacheTime = Date.now()
}

export function updatePdfsCacheStats(count: number): void {
  pdfsCount = count
  pdfsCacheTime = Date.now()
}

export function recordCacheHit(): void {
  totalCacheHits++
}

export function recordCacheMiss(): void {
  totalCacheMisses++
}

export function setCacheEnabled(enabled: boolean): void {
  cacheEnabled = enabled
}

export function clearCache24H(): void {
  productsCacheTime = null
  pdfsCacheTime = null
  productsCount = 0
  pdfsCount = 0
  console.log("🧹 [CACHE-24H] Cache limpo")
}

export function isCacheValid(cacheTime: number | null): boolean {
  if (!cacheTime) return false
  return Date.now() - cacheTime < CACHE_TTL_24H
}
