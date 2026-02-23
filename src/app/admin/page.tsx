"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useProducts, type Product } from "../hooks/useProducts"
import { useAuth } from "../hooks/useAuth"
import {
  Plus,
  Trash2,
  Save,
  X,
  ArrowUp,
  ArrowDown,
  Eye,
  FileText,
  Calendar,
  Star,
  StarOff,
  Package,
  LogOut,
  Loader2,
  Edit3,
  ChevronRight,
} from "lucide-react"
import LoginForm from "./components/LoginForm"
import ImageUpload from "./components/ImageUpload"
import { useWeeklyPdfs } from "../hooks/useWeeklyPdfs"
import PdfUpload from "./components/PdfUpload"

type ActiveSection = "pdfs" | "products"

export default function AdminPage() {
  const { isAuthenticated, loading: authLoading, error: authError, login, logout } = useAuth()
  const {
    pdfs,
    latestPdf,
    loading: pdfsLoading,
    saving: pdfsSaving,
    error: pdfsError,
    addPdf,
    deletePdf,
    refreshPdfs,
  } = useWeeklyPdfs()
  const {
    products,
    getFeaturedProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    loading,
    saving,
    error,
    validateEAN13,
  } = useProducts()

  const [activeSection, setActiveSection] = useState<ActiveSection>("pdfs")
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState<Partial<Product>>({})
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const featuredProducts = getFeaturedProducts()
  const categories = ["Mercearia", "Escritorio", "Escolar", "Brinquedos", "Eletroonicos", "Outros"]

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  // Auth loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-red-600 animate-spin" />
      </div>
    )
  }

  // Not authenticated
  if (!isAuthenticated) {
    return <LoginForm onLogin={login} error={authError || undefined} loading={authLoading} />
  }

  // Loading products
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-red-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">A carregar dados...</p>
        </div>
      </div>
    )
  }

  // Product form handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.description || !formData.category) {
      showToast("error", "Preencha todos os campos obrigatorios")
      return
    }

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, formData)
        showToast("success", "Produto atualizado!")
      } else {
        const productData: Omit<Product, "id"> = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          category: formData.category,
          price: formData.price || 0,
          featured: false,
          order: 0,
          image: formData.image || "/placeholder.svg?height=300&width=300",
        }
        await addProduct(productData)
        showToast("success", "Produto adicionado!")
      }
      setFormData({})
      setEditingProduct(null)
      setShowProductModal(false)
    } catch (err) {
      showToast("error", `Erro: ${err instanceof Error ? err.message : "Erro desconhecido"}`)
    }
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setFormData(product)
    setShowProductModal(true)
  }

  const closeModal = () => {
    setShowProductModal(false)
    setEditingProduct(null)
    setFormData({})
  }

  const moveProduct = async (index: number, direction: "up" | "down") => {
    const newProducts = [...featuredProducts]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex >= 0 && targetIndex < newProducts.length) {
      ;[newProducts[index], newProducts[targetIndex]] = [newProducts[targetIndex], newProducts[index]]
      try {
        for (let i = 0; i < newProducts.length; i++) {
          await updateProduct(newProducts[i].id, { order: i + 1 })
        }
        showToast("success", "Ordem atualizada!")
      } catch {
        showToast("error", "Erro ao reordenar")
      }
    }
  }

  const handleToggleFeatured = async (productId: string) => {
    try {
      const product = products.find((p) => p.id === productId)
      if (!product) return
      if (product.featured) {
        await updateProduct(productId, { featured: false, order: 0 })
        showToast("success", "Removido dos destaques")
      } else {
        if (featuredProducts.length < 6) {
          const maxOrder = Math.max(...featuredProducts.map((p) => p.order), 0)
          await updateProduct(productId, { featured: true, order: maxOrder + 1 })
          showToast("success", "Adicionado aos destaques!")
        } else {
          showToast("error", "Maximo de 6 produtos em destaque")
        }
      }
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro")
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm("Tem certeza que deseja apagar este produto permanentemente?")) {
      try {
        setIsDeleting(productId)
        await deleteProduct(productId)
        showToast("success", "Produto apagado!")
      } catch {
        showToast("error", "Erro ao apagar produto")
      } finally {
        setIsDeleting(null)
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f8f6] flex">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
            toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 z-40 flex flex-col transition-all duration-200 ${
          sidebarOpen ? "w-56" : "w-16"
        }`}
      >
        {/* Logo area */}
        <div className="p-4 border-b border-gray-100">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center gap-2 w-full"
          >
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            {sidebarOpen && (
              <span className="text-sm font-semibold text-gray-800 truncate">Coutyfil Admin</span>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          <button
            onClick={() => setActiveSection("pdfs")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeSection === "pdfs"
                ? "bg-red-50 text-red-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
            }`}
          >
            <FileText className="h-4.5 w-4.5 flex-shrink-0" />
            {sidebarOpen && <span>Catalogos PDF</span>}
          </button>

          <button
            onClick={() => setActiveSection("products")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeSection === "products"
                ? "bg-red-50 text-red-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
            }`}
          >
            <Package className="h-4.5 w-4.5 flex-shrink-0" />
            {sidebarOpen && <span>Artigos</span>}
          </button>
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-gray-100">
          <button
            onClick={async () => {
              if (confirm("Tem certeza que deseja sair?")) {
                document.cookie = "admin-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/"
                await logout()
                window.location.href = "/admin"
              }
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4.5 w-4.5 flex-shrink-0" />
            {sidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-200 ${sidebarOpen ? "ml-56" : "ml-16"}`}>
        {/* ===================== */}
        {/* PDFs Section */}
        {/* ===================== */}
        {activeSection === "pdfs" && (
          <div className="p-6 lg:p-8 max-w-4xl">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Catalogos PDF</h1>
              <p className="text-sm text-gray-500 mt-1">Gerir os folhetos semanais que aparecem no site</p>
            </div>

            {/* Current PDF */}
            {latestPdf && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs font-medium text-green-700 uppercase tracking-wide">PDF Atual</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{latestPdf.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Semana {latestPdf.week}/{latestPdf.year}
                    </p>
                  </div>
                  <a
                    href={latestPdf.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Ver</span>
                  </a>
                </div>
              </div>
            )}

            {/* Upload */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">Enviar Novo Catalogo</h2>
              <PdfUpload
                onUpload={async (file, name) => {
                  await addPdf(file, name)
                  showToast("success", "PDF enviado com sucesso!")
                }}
                isUploading={pdfsSaving}
              />
            </div>

            {/* PDF list */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">
                Historico ({pdfs.length})
              </h2>

              {pdfsLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-5 w-5 text-gray-400 animate-spin mx-auto" />
                </div>
              ) : pdfs.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Nenhum PDF enviado</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {pdfs.map((pdf) => (
                    <div
                      key={pdf.id}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${pdf.id === latestPdf?.id ? "bg-green-50" : "bg-gray-50"}`}>
                          <FileText
                            className={`h-4 w-4 ${pdf.id === latestPdf?.id ? "text-green-600" : "text-gray-400"}`}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{pdf.name}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            Semana {pdf.week}/{pdf.year}
                            {pdf.id === latestPdf?.id && (
                              <span className="text-green-600 font-medium ml-1">ATUAL</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <a
                          href={pdf.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-50"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                        <button
                          onClick={async () => {
                            if (window.confirm(`Apagar "${pdf.name}"?`)) {
                              try {
                                await deletePdf(pdf.id)
                                showToast("success", "PDF apagado!")
                              } catch {
                                showToast("error", "Erro ao apagar PDF")
                              }
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                          disabled={pdfsSaving}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pdfsError && (
                <p className="text-sm text-red-500 mt-3">{pdfsError}</p>
              )}
            </div>
          </div>
        )}

        {/* ===================== */}
        {/* Products Section */}
        {/* ===================== */}
        {activeSection === "products" && (
          <div className="p-6 lg:p-8 max-w-6xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Artigos</h1>
                <p className="text-sm text-gray-500 mt-1">{products.length} artigos na base de dados</p>
              </div>
              <button
                onClick={() => {
                  setEditingProduct(null)
                  setFormData({})
                  setShowProductModal(true)
                }}
                disabled={saving}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:bg-gray-300"
              >
                <Plus className="h-4 w-4" />
                <span>Novo Artigo</span>
              </button>
            </div>

            {/* Featured Products */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">Destaques</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Aparecem na pagina inicial</p>
                </div>
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {featuredProducts.length}/6
                </span>
              </div>

              {featuredProducts.length === 0 ? (
                <div className="text-center py-8">
                  <Star className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Nenhum produto em destaque</p>
                  <p className="text-xs text-gray-300 mt-1">Use a estrela nos artigos abaixo para destacar</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {featuredProducts.map((product, index) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-3 bg-amber-50/50 border border-amber-100 rounded-lg"
                    >
                      <img
                        src={product.image || "/placeholder.svg?height=48&width=48"}
                        alt={product.name}
                        className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
                        <p className="text-xs text-gray-400">{product.category}</p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => moveProduct(index, "up")}
                          disabled={index === 0}
                          className="p-1.5 text-gray-400 hover:text-gray-600 disabled:text-gray-200 rounded transition-colors"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => moveProduct(index, "down")}
                          disabled={index === featuredProducts.length - 1}
                          className="p-1.5 text-gray-400 hover:text-gray-600 disabled:text-gray-200 rounded transition-colors"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleFeatured(product.id)}
                          className="p-1.5 text-amber-500 hover:text-amber-600 rounded transition-colors"
                          title="Remover dos destaques"
                        >
                          <StarOff className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* All Products */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">
                Todos os Artigos ({products.length})
              </h2>

              {products.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Nenhum artigo na base de dados</p>
                  <button
                    onClick={() => {
                      setEditingProduct(null)
                      setFormData({})
                      setShowProductModal(true)
                    }}
                    className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Adicionar primeiro artigo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className={`group border rounded-xl p-3 transition-all hover:shadow-sm ${
                        product.featured ? "border-amber-200 bg-amber-50/30" : "border-gray-100 bg-white"
                      }`}
                    >
                      <div className="relative">
                        <img
                          src={product.image || "/placeholder.svg?height=120&width=120"}
                          alt={product.name}
                          className="w-full h-28 object-cover rounded-lg mb-3"
                        />
                        {product.featured && (
                          <div className="absolute top-1.5 right-1.5 bg-amber-500 text-white p-1 rounded-md">
                            <Star className="h-3 w-3" />
                          </div>
                        )}
                      </div>

                      <h3 className="text-sm font-medium text-gray-800 truncate">{product.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5 mb-3">{product.category}</p>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => handleToggleFeatured(product.id)}
                            className={`p-1.5 rounded transition-colors ${
                              product.featured
                                ? "text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                                : "text-gray-300 hover:text-amber-500 hover:bg-amber-50"
                            }`}
                            title={product.featured ? "Remover dos destaques" : "Adicionar aos destaques"}
                            disabled={isDeleting === product.id}
                          >
                            {product.featured ? (
                              <Star className="h-4 w-4 fill-current" />
                            ) : (
                              <Star className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => openEditModal(product)}
                            className="p-1.5 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          disabled={isDeleting === product.id}
                        >
                          {isDeleting === product.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-red-400" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <p className="text-sm text-red-500 mt-3">{error}</p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ===================== */}
      {/* Product Modal */}
      {/* ===================== */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingProduct ? "Editar Artigo" : "Novo Artigo"}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome *</label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all"
                  placeholder="Nome do artigo"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoria *</label>
                <select
                  value={formData.category || ""}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all bg-white"
                  required
                >
                  <option value="">Selecionar</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Descricao *</label>
                <textarea
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all resize-none"
                  placeholder="Descricao do artigo"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Imagem</label>
                <ImageUpload
                  value={formData.image || ""}
                  onChange={(imageUrl) => setFormData({ ...formData, image: imageUrl })}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2.5 px-4 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:bg-gray-300"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>{editingProduct ? "Guardar" : "Adicionar"}</span>
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
