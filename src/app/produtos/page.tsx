"use client"

import { useState, useEffect } from "react"
import { Search, Filter, Star } from "lucide-react"
import Link from "next/link"
import { useProducts, type Product } from "@/app/hooks/useProducts"
import Header from "@/app/components/Header"
import Footer from "@/app/components/Footer"
import DevProtection from "@/app/components/DevProtection"

export default function ProductsPage() {
  const { products, getFeaturedProducts, loading, error } = useProducts()
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("Todas")
  const [sortBy, setSortBy] = useState("name")
  const [isMobile, setIsMobile] = useState(false)

  // Obter categorias únicas
  const categories = ["Todas", ...Array.from(new Set(products.map((product) => product.category)))]

  // Detectar tamanho da tela para ajustes responsivos
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
      // Em dispositivos muito pequenos, forçar visualização em lista
      if (window.innerWidth < 480) {
        // Placeholder for view mode change logic if needed
      }
    }

    // Verificar no carregamento inicial
    checkMobile()

    // Adicionar listener para redimensionamento
    window.addEventListener("resize", checkMobile)

    // Cleanup
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Filtrar e ordenar produtos
  useEffect(() => {
    let filtered = [...products]

    // Filtrar por categoria
    if (selectedCategory !== "Todas") {
      filtered = filtered.filter((product) => product.category === selectedCategory)
    }

    // Filtrar por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Ordenar
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name)
        case "price-low":
          return a.price - b.price
        case "price-high":
          return b.price - a.price
        case "category":
          return a.category.localeCompare(b.category)
        case "featured":
          return b.featured ? 1 : -1
        default:
          return 0
      }
    })

    setFilteredProducts(filtered)
  }, [products, searchTerm, selectedCategory, sortBy])

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-base sm:text-xl text-gray-600">Carregando produtos...</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-red-600">Erro ao carregar produtos: {error}</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  // Conteúdo da página
  const pageContent = (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-white via-red-50 to-green-50 py-6 sm:py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Produtos em Destaque */}
          {getFeaturedProducts().length > 0 && (
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-800 mb-4 flex items-center justify-center space-x-2">
                  <Star className="h-8 w-8 text-yellow-500 fill-current" />
                  <span>Produtos em Destaque</span>
                  <Star className="h-8 w-8 text-yellow-500 fill-current" />
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Descubra os nossos produtos mais populares, cuidadosamente selecionados para si
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                {getFeaturedProducts().map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-yellow-200"
                  >
                    <div className="relative">
                      <div className="h-64 bg-gray-100 flex items-center justify-center p-4">
                        <img
                          src={product.image || "/placeholder.svg?height=256&width=256"}
                          alt={product.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="absolute top-2 left-2">
                        <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                          <Star className="h-3 w-3 fill-current" />
                          <span>Destaque</span>
                        </span>
                      </div>
                      <div className="absolute top-2 right-2">
                        <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                          {product.category}
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">{product.name}</h3>
                      <p className="text-gray-600 mb-4 line-clamp-2">{product.description}</p>
                      <Link
                        href={`/produtos/${product.id}`}
                        className="inline-block bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
                      >
                        Ver Detalhes
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Todos os Produtos */}
          <div>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Todos os Produtos</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">Explore todo o nosso catálogo de produtos</p>
            </div>

            {/* Filtros e Busca */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Busca */}
                <div className="relative">
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                    Buscar
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      id="search"
                      type="text"
                      placeholder="Nome ou descrição..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Categoria */}
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria
                  </label>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select
                      id="category"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-none"
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Ordenar */}
                <div>
                  <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-2">
                    Ordenar por
                  </label>
                  <select
                    id="sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="name">Nome (A-Z)</option>
                    <option value="category">Categoria</option>
                    <option value="featured">Destaques primeiro</option>
                  </select>
                </div>
              </div>

              {/* Resultados */}
              <div className="mt-4 text-sm text-gray-600">
                {filteredProducts.length} produto{filteredProducts.length !== 1 ? "s" : ""} encontrado
                {filteredProducts.length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Grid de Produtos */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-xl text-gray-600">Nenhum produto encontrado</p>
                <p className="text-gray-500 mt-2">Tente ajustar os filtros de busca</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <div className="relative">
                      <div className="h-48 bg-gray-100 flex items-center justify-center p-4">
                        <img
                          src={product.image || "/placeholder.svg?height=192&width=192"}
                          alt={product.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="absolute top-2 right-2">
                        <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                          {product.category}
                        </span>
                      </div>
                      {product.featured && (
                        <div className="absolute top-2 left-2">
                          <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                            <Star className="h-3 w-3 fill-current" />
                            <span>Destaque</span>
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-1">{product.name}</h3>
                      <p className="text-gray-600 mb-3 text-sm line-clamp-2">{product.description}</p>
                      <Link
                        href={`/produtos/${product.id}`}
                        className="inline-block bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium w-full text-center"
                      >
                        Ver Detalhes
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )

  // Envolver o conteúdo com o componente de proteção
  return <DevProtection pageName="Produtos">{pageContent}</DevProtection>
}
