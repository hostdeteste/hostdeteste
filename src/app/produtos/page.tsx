"use client"

import { useState, useEffect } from "react"
import { Search, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useProducts, type Product } from "@/app/hooks/useProducts"
import Header from "@/app/components/Header"
import Footer from "@/app/components/Footer"
import DevProtection from "@/app/components/DevProtection"

export default function ProductsPage() {
  const { products, loading } = useProducts()
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("Todas")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [sortBy, setSortBy] = useState("name")
  const [isMobile, setIsMobile] = useState(false)

  const categories = ["Todas", "Escolar", "Escritório", "Escrita", "Papel", "Eletrônicos", "Brinquedos", "Diversão"]

  // Detectar tamanho da tela para ajustes responsivos
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
      // Em dispositivos muito pequenos, forçar visualização em lista
      if (window.innerWidth < 480) {
        setViewMode("list")
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
        default:
          return 0
      }
    })

    setFilteredProducts(filtered)
  }, [products, searchTerm, selectedCategory, sortBy])

  // Conteúdo da página
  const pageContent = (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-white via-red-50 to-green-50 py-6 sm:py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors mb-3 sm:mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar à página inicial</span>
            </Link>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2">Todos os Produtos</h1>
            <p className="text-sm sm:text-base text-gray-600">Explore todo o nosso catálogo de produtos</p>
          </div>

          {/* Filters and Search - Reorganizado para mobile */}
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-end">
              {/* Search */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Nome ou descrição..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Categoria</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full py-1.5 sm:py-2 px-2.5 sm:px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-xs sm:text-sm"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Ordenar por</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full py-1.5 sm:py-2 px-2.5 sm:px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-xs sm:text-sm"
                >
                  <option value="name">Nome (A-Z)</option>
                  <option value="price-low">Preço (Menor)</option>
                  <option value="price-high">Preço (Maior)</option>
                  <option value="category">Categoria</option>
                </select>
              </div>
            </div>

            {/* Results Count */}
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
              <p className="text-xs sm:text-sm text-gray-600">
                {filteredProducts.length} produto{filteredProducts.length !== 1 ? "s" : ""} encontrado
                {filteredProducts.length !== 1 ? "s" : ""}
                {selectedCategory !== "Todas" && ` em "${selectedCategory}"`}
                {searchTerm && ` para "${searchTerm}"`}
              </p>
            </div>
          </div>

          {/* Products Grid/List */}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {filteredProducts.map((product) => (
                <Link
                  href={`/produtos/${product.id}`}
                  key={product.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group border-2 border-red-500"
                >
                  <div className="relative h-32 sm:h-40 md:h-48 overflow-hidden bg-gray-50 flex items-center justify-center">
                    <img
                      src={product.image || "/placeholder.svg?height=300&width=300"}
                      alt={product.name}
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 rounded-full text-[0.6rem] sm:text-xs font-bold bg-green-600 text-white">
                        {product.category}
                      </span>
                    </div>
                    {product.featured && (
                      <div className="absolute top-2 right-2">
                        <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-[0.6rem] sm:text-xs font-bold">
                          Destaque
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 sm:p-4">
                    <h3 className="font-bold text-gray-800 mb-1 sm:mb-2 group-hover:text-red-600 transition-colors text-sm sm:text-base md:text-lg">
                      {product.name}
                    </h3>
                    <p className="text-gray-600 text-[0.7rem] sm:text-sm mb-2 sm:mb-3 line-clamp-2">
                      {product.description}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-[0.6rem] sm:text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        Ver detalhes
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredProducts.map((product) => (
                <Link
                  href={`/produtos/${product.id}`}
                  key={product.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group border-2 border-red-500"
                >
                  <div className="flex">
                    <div className="w-24 sm:w-32 h-24 sm:h-32 flex-shrink-0 bg-gray-50 flex items-center justify-center">
                      <img
                        src={product.image || "/placeholder.svg?height=300&width=300"}
                        alt={product.name}
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="flex-1 p-3 sm:p-4">
                      <div className="flex justify-between items-start mb-1 sm:mb-2">
                        <h3 className="font-bold text-gray-800 group-hover:text-red-600 transition-colors text-sm sm:text-base">
                          {product.name}
                        </h3>
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          {product.featured && (
                            <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-[0.6rem] sm:text-xs font-bold">
                              Destaque
                            </span>
                          )}
                          <span className="px-2 py-1 rounded-full text-[0.6rem] sm:text-xs font-bold bg-green-600 text-white">
                            {product.category}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-600 text-[0.7rem] sm:text-sm mb-2 sm:mb-3">{product.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-[0.7rem] sm:text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded">
                          Ver detalhes →
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* No Results */}
          {filteredProducts.length === 0 && (
            <div className="text-center py-8 sm:py-12">
              <div className="text-gray-400 mb-2 sm:mb-4">
                <Search className="h-12 w-12 sm:h-16 sm:w-16 mx-auto" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-1 sm:mb-2">Nenhum produto encontrado</h3>
              <p className="text-gray-600 mb-2 sm:mb-4">
                Tente ajustar os filtros ou termo de busca para encontrar o que procura.
              </p>
              <button
                onClick={() => {
                  setSearchTerm("")
                  setSelectedCategory("Todas")
                }}
                className="bg-red-600 text-white px-4 sm:px-6 py-1 sm:py-2 rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm"
              >
                Limpar Filtros
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )

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

  // Envolver o conteúdo com o componente de proteção
  return <DevProtection pageName="Produtos">{pageContent}</DevProtection>
}
