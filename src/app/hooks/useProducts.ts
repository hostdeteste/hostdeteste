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

  // Cache functions otimizadas
  const getCachedProducts = (): Product[] | null => {
    try {
      const cached = localStorage.getItem("products_cache_v2")
      if (!cached) return null

      const data = JSON.parse(cached)
      const age = Date.now() - data.timestamp

      // Cache válido por 1 hora
      if (age < 60 * 60 * 1000) {
        return data.products
      }

      return null
    } catch {
      return null
    }
  }

  const saveProductsToCache = (products: Product[]) => {
    try {
      const cacheData = {
        products,
        timestamp: Date.now(),
      }
      localStorage.setItem("products_cache_v2", JSON.stringify(cacheData))
    } catch {
      // Ignorar erros de cache
    }
  }

  const getFallbackCache = (): Product[] | null => {
    try {
      const cached = localStorage.getItem("products_cache_v2")
      if (cached) {
        const data = JSON.parse(cached)
        return data.products || []
      }
    } catch {
      // Ignorar erros
    }
    return null
  }

  // Verificar atualizações apenas quando necessário
  const checkForUpdates = async () => {
    try {
      const lastCheck = localStorage.getItem("products_last_check")
      const now = Date.now()

      // Só verificar se passou mais de 10 minutos
      if (lastCheck && now - Number.parseInt(lastCheck) < 10 * 60 * 1000) {
        return
      }

      // Verificação rápida apenas do timestamp
      const response = await fetch("/api/products/last-modified", {
        cache: "no-store",
      })

      if (response.ok) {
        const data = await response.json()
        if (data.lastModified) {
          const currentCache = localStorage.getItem("products_cache_v2")
          if (currentCache) {
            const cacheData = JSON.parse(currentCache)
            if (data.lastModified > cacheData.timestamp) {
              // Há atualizações, recarregar
              localStorage.removeItem("products_cache_v2")
              loadProducts(true)
            }
          }
        }
      }

      localStorage.setItem("products_last_check", now.toString())
    } catch (error) {
      // Ignorar erros de background check
    }
  }

  // Salvar produtos
  const saveProducts = async (newProducts: Product[]) => {
    try {
      setSaving(true)
      setError(null)

      // Atualização otimista
      setProducts(newProducts)

      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ products: newProducts }),
      })

      const data = await response.json()

      if (!data.success) {
        await loadProducts()
        throw new Error(data.error || "Erro ao salvar")
      }

      // Atualizar cache
      saveProductsToCache(newProducts)
      setLastUpdate(Date.now())
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erro ao salvar produtos")
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

      const newProduct: Product = {
        ...product,
        id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // ID mais único
        price: product.price || 0,
        featured: product.featured || false,
        order: product.order || 0,
      }

      console.log("📝 [PRODUCTS] Produto preparado:", newProduct)

      // Adicionar à lista local primeiro (otimistic update)
      const newProducts = [...products, newProduct]
      setProducts(newProducts)

      // Salvar no servidor
      await saveProducts(newProducts)

      console.log("✅ [PRODUCTS] Produto adicionado com sucesso")
    } catch (error) {
      console.error("❌ [PRODUCTS] Erro ao adicionar produto:", error)
      // Reverter mudança local em caso de erro
      await loadProducts()
      throw error
    }
  }

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const newProducts = products.map((product) => (product.id === id ? { ...product, ...updates } : product))
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
      localStorage.removeItem("products_cache_v2")
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
  }
}
