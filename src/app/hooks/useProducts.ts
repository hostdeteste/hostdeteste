"use client"

import { useState, useEffect, useRef } from "react"

export interface Product {
  id: string
  name: string
  description: string
  price: number
  image: string
  category: string
  featured: boolean
  order: number
  created_at?: string // ✅ Adicionado para corrigir o erro TypeScript
  updated_at?: string // ✅ Adicionado para corrigir o erro TypeScript
}

// Função para gerar código EAN-13 aleatório válido
function generateEAN13(): string {
  // Gerar os primeiros 12 dígitos aleatoriamente
  let code = ""
  for (let i = 0; i < 12; i++) {
    code += Math.floor(Math.random() * 10).toString()
  }

  // Calcular dígito de verificação
  let sum = 0
  for (let i = 0; i < 12; i++) {
    const digit = Number.parseInt(code[i])
    if (i % 2 === 0) {
      // Posições ímpares (1, 3, 5, 7, 9, 11) - índices pares
      sum += digit
    } else {
      // Posições pares (2, 4, 6, 8, 10, 12) - índices ímpares
      sum += digit * 3
    }
  }

  // Calcular dígito de verificação
  const checkDigit = (10 - (sum % 10)) % 10

  return code + checkDigit.toString()
}

// Função para validar se um EAN-13 é válido
function validateEAN13(ean: string): boolean {
  if (ean.length !== 13 || !/^\d{13}$/.test(ean)) {
    return false
  }

  let sum = 0
  for (let i = 0; i < 12; i++) {
    const digit = Number.parseInt(ean[i])
    if (i % 2 === 0) {
      sum += digit
    } else {
      sum += digit * 3
    }
  }

  const checkDigit = (10 - (sum % 10)) % 10
  return checkDigit === Number.parseInt(ean[12])
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now())
  const loadingRef = useRef(false)

  // Carregar produtos com cache agressivo
  const loadProducts = async (silent = false) => {
    // Evitar múltiplas chamadas
    if (loadingRef.current) return

    try {
      loadingRef.current = true
      if (!silent) setLoading(true)
      setError(null)

      // Tentar cache primeiro
      const cached = getCachedProducts()
      if (cached) {
        setProducts(cached)
        setLastUpdate(Date.now())
        if (!silent) setLoading(false)
        loadingRef.current = false

        // Verificar atualizações em background apenas se necessário
        setTimeout(() => checkForUpdates(), 1000)
        return
      }

      const response = await fetch("/api/products", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setProducts(data.products || [])
        setLastUpdate(Date.now())

        // Salvar no cache
        saveProductsToCache(data.products || [])
      } else {
        throw new Error(data.error || "Erro desconhecido")
      }
    } catch (error) {
      console.error("Erro ao carregar produtos:", error)
      setError(error instanceof Error ? error.message : "Erro ao carregar produtos")

      // Tentar cache de emergência
      const fallback = getFallbackCache()
      if (fallback) {
        setProducts(fallback)
      }
    } finally {
      if (!silent) setLoading(false)
      loadingRef.current = false
    }
  }

  // Versão do cache - incrementar quando houver mudanças estruturais
  const CACHE_VERSION = "v3"
  const CACHE_KEY = `products_cache_${CACHE_VERSION}`
  const CACHE_CHECK_KEY = `products_last_check_${CACHE_VERSION}`

  // Cache functions otimizadas com auto-invalidação
  const getCachedProducts = (): Product[] | null => {
    try {
      // Limpar caches de versões antigas automaticamente
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("products_cache_") && key !== CACHE_KEY) {
          localStorage.removeItem(key)
          console.log(`🧹 Cache antigo removido: ${key}`)
        }
        if (key.startsWith("products_last_check_") && key !== CACHE_CHECK_KEY) {
          localStorage.removeItem(key)
        }
      })

      const cached = localStorage.getItem(CACHE_KEY)
      if (!cached) return null

      const data = JSON.parse(cached)
      const age = Date.now() - data.timestamp

      // Cache válido por apenas 30 minutos para clientes
      if (age < 30 * 60 * 1000) {
        // Verificar se os dados estão íntegros
        if (Array.isArray(data.products) && data.products.length >= 0) {
          return data.products
        } else {
          console.warn("⚠️ Cache corrompido detectado, removendo...")
          localStorage.removeItem(CACHE_KEY)
          return null
        }
      }

      // Cache expirado
      localStorage.removeItem(CACHE_KEY)
      return null
    } catch (error) {
      console.warn("⚠️ Erro no cache, limpando...", error)
      // Limpar todo o cache de produtos em caso de erro
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("products_cache_")) {
          localStorage.removeItem(key)
        }
      })
      return null
    }
  }

  const saveProductsToCache = (products: Product[]) => {
    try {
      // Validar dados antes de salvar
      if (!Array.isArray(products)) {
        console.error("❌ Tentativa de salvar dados inválidos no cache")
        return
      }

      const cacheData = {
        products,
        timestamp: Date.now(),
        version: CACHE_VERSION,
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
      console.log(`✅ Cache salvo: ${products.length} produtos (${CACHE_VERSION})`)
    } catch (error) {
      console.warn("⚠️ Erro ao salvar cache:", error)
      // Se não conseguir salvar, limpar cache antigo
      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("products_cache_")) {
            localStorage.removeItem(key)
          }
        })
      } catch {}
    }
  }

  const getFallbackCache = (): Product[] | null => {
    try {
      // Tentar qualquer cache de produtos disponível como último recurso
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("products_cache_")) {
          const cached = localStorage.getItem(key)
          if (cached) {
            const data = JSON.parse(cached)
            if (Array.isArray(data.products)) {
              console.log(`🆘 Usando cache de emergência: ${key}`)
              return data.products
            }
          }
        }
      }
    } catch {
      // Ignorar erros
    }
    return null
  }

  // Verificar atualizações com mais frequência para clientes
  const checkForUpdates = async () => {
    try {
      const lastCheck = localStorage.getItem(CACHE_CHECK_KEY)
      const now = Date.now()

      // Verificar a cada 5 minutos para clientes (mais frequente)
      if (lastCheck && now - Number.parseInt(lastCheck) < 5 * 60 * 1000) {
        return
      }

      // Verificação rápida apenas do timestamp
      const response = await fetch("/api/products/last-modified", {
        cache: "no-store",
      })

      if (response.ok) {
        const data = await response.json()
        if (data.lastModified) {
          const currentCache = localStorage.getItem(CACHE_KEY)
          if (currentCache) {
            const cacheData = JSON.parse(currentCache)
            if (data.lastModified > cacheData.timestamp) {
              // Há atualizações, recarregar
              console.log("🔄 Atualizações detectadas, limpando cache...")
              localStorage.removeItem(CACHE_KEY)
              loadProducts(true)
            }
          }
        }
      }

      localStorage.setItem(CACHE_CHECK_KEY, now.toString())
    } catch (error) {
      // Em caso de erro, forçar limpeza do cache
      console.warn("⚠️ Erro na verificação, limpando cache preventivamente")
      localStorage.removeItem(CACHE_KEY)
    }
  }

  // Salvar produtos
  const saveProducts = async (newProducts: Product[]) => {
    try {
      console.log("💾 [PRODUCTS] === INICIANDO SALVAMENTO ===")
      console.log("📊 [PRODUCTS] Produtos a salvar:", newProducts.length)
      console.log(
        "📋 [PRODUCTS] Dados dos produtos:",
        newProducts.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          hasImage: !!p.image,
          featured: p.featured,
          ean13Valid: validateEAN13(p.id),
        })),
      )

      setSaving(true)
      setError(null)

      // Atualização otimista
      setProducts(newProducts)

      const requestBody = { products: newProducts }
      console.log("📤 [PRODUCTS] Enviando para API:", {
        url: "/api/products",
        method: "POST",
        bodySize: JSON.stringify(requestBody).length,
        productsCount: newProducts.length,
      })

      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      console.log("📥 [PRODUCTS] Resposta da API:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      })

      const data = await response.json()
      console.log("📋 [PRODUCTS] Dados da resposta:", data)

      if (!data.success) {
        console.error("❌ [PRODUCTS] Erro na resposta:", data)
        await loadProducts()
        throw new Error(data.error || "Erro ao salvar")
      }

      // Atualizar cache
      saveProductsToCache(newProducts)
      setLastUpdate(Date.now())

      console.log("✅ [PRODUCTS] Salvamento concluído com sucesso")
    } catch (error) {
      console.error("💥 [PRODUCTS] Erro no salvamento:", error)
      setError(error instanceof Error ? error.message : "Erro ao salvar produtos")
      // Recarregar produtos em caso de erro
      await loadProducts()
      throw error
    } finally {
      setSaving(false)
    }
  }

  // Funções de produtos otimizadas
  const getFeaturedProducts = () => {
    return products
      .filter((product) => product.featured)
      .sort((a, b) => a.order - b.order)
      .slice(0, 6)
  }

  const addProduct = async (product: Omit<Product, "id">) => {
    try {
      console.log("➕ [PRODUCTS] Adicionando produto:", product)

      // Gerar EAN-13 único (apenas o código, sem prefixos)
      let ean13: string
      let attempts = 0
      const maxAttempts = 100

      do {
        ean13 = generateEAN13() // Apenas o EAN-13, sem prefixos
        attempts++

        if (attempts > maxAttempts) {
          throw new Error("Não foi possível gerar um EAN-13 único após múltiplas tentativas")
        }
      } while (products.some((p) => p.id === ean13))

      const newProduct: Product = {
        ...product,
        id: ean13, // ID é apenas o EAN-13 puro
        price: product.price || 0,
        featured: product.featured || false,
        order: product.order || 0,
        created_at: new Date().toISOString(), // ✅ Adicionado
        updated_at: new Date().toISOString(), // ✅ Adicionado
      }

      console.log("📝 [PRODUCTS] Produto preparado com EAN-13 puro:", {
        ...newProduct,
        ean13Valid: validateEAN13(newProduct.id),
        ean13: newProduct.id,
        idLength: newProduct.id.length,
      })

      // Adicionar à lista local primeiro (otimistic update)
      const newProducts = [...products, newProduct]
      setProducts(newProducts)

      // Salvar no servidor
      await saveProducts(newProducts)

      console.log("✅ [PRODUCTS] Produto adicionado com EAN-13 puro:", newProduct.id)
    } catch (error) {
      console.error("❌ [PRODUCTS] Erro ao adicionar produto:", error)
      // Reverter mudança local em caso de erro
      await loadProducts()
      throw error
    }
  }

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const newProducts = products.map((product) =>
      product.id === id
        ? { ...product, ...updates, updated_at: new Date().toISOString() } // ✅ Atualizar timestamp
        : product,
    )
    await saveProducts(newProducts)
  }

  const deleteProduct = async (id: string) => {
    try {
      setSaving(true)
      setError(null)

      // Remover da lista local
      const newProducts = products.filter((product) => product.id !== id)
      setProducts(newProducts)

      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        await loadProducts()
        throw new Error(data.error || "Erro ao deletar produto")
      }

      // Limpar cache
      localStorage.removeItem(CACHE_KEY)
      saveProductsToCache(newProducts)
      setLastUpdate(Date.now())
      return data
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erro ao deletar produto")
      await loadProducts()
      throw error
    } finally {
      setSaving(false)
    }
  }

  const toggleFeatured = async (productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return

    const featuredProducts = getFeaturedProducts()

    if (product.featured) {
      await updateProduct(productId, { featured: false })
    } else {
      if (featuredProducts.length < 6) {
        const maxOrder = Math.max(...featuredProducts.map((p) => p.order), 0)
        await updateProduct(productId, { featured: true, order: maxOrder + 1 })
      } else {
        throw new Error("Máximo de 6 produtos em destaque permitidos")
      }
    }
  }

  const reorderFeaturedProducts = async (productIds: string[]) => {
    const newProducts = products.map((product) => {
      const newOrder = productIds.indexOf(product.id)
      return {
        ...product,
        featured: newOrder !== -1,
        order: newOrder !== -1 ? newOrder + 1 : product.order,
        updated_at: new Date().toISOString(), // ✅ Atualizar timestamp
      }
    })
    await saveProducts(newProducts)
  }

  // Carregar produtos apenas uma vez
  useEffect(() => {
    loadProducts()
  }, [])

  // Escutar atualizações do cache
  useEffect(() => {
    const handleProductsUpdated = (event: CustomEvent) => {
      setProducts(event.detail)
      setLastUpdate(Date.now())
    }

    window.addEventListener("productsUpdated", handleProductsUpdated as EventListener)

    return () => {
      window.removeEventListener("productsUpdated", handleProductsUpdated as EventListener)
    }
  }, [])

  return {
    products,
    loading,
    saving,
    error,
    lastUpdate,
    getFeaturedProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    reorderFeaturedProducts,
    toggleFeatured,
    refreshProducts: loadProducts,
    // Exportar funções utilitárias para uso externo
    generateEAN13,
    validateEAN13,
  }
}
