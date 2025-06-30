"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useProducts, type Product } from "../hooks/useProducts"
import { useAuth } from "../hooks/useAuth"
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  ArrowUp,
  ArrowDown,
  Eye,
  RefreshCw,
  Database,
  Check,
  AlertCircle,
  Clock,
  FileText,
  Calendar,
  Star,
  StarOff,
  Barcode,
} from "lucide-react"
import LoginForm from "./components/LoginForm"
import ImageUpload from "./components/ImageUpload"
import LogoutButton from "./components/LogoutButton"
import { useWeeklyPdfs } from "../hooks/useWeeklyPdfs"
import PdfUpload from "./components/PdfUpload"

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
    toggleFeatured,
    loading,
    saving,
    refreshProducts,
    error,
    lastUpdate,
    validateEAN13,
  } = useProducts()
  const [isAddingProduct, setIsAddingProduct] = useState(false)
  const [editingProduct, setEditingProduct] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<Product>>({})
  const [operationStatus, setOperationStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  })
  const [lastUpdateFormatted, setLastUpdateFormatted] = useState<string>("")
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const featuredProducts = getFeaturedProducts()
  const nonFeaturedProducts = products.filter((product) => !product.featured)

  const categories = ["Mercearia", "Escritorio", "Escolar", "Brinquedos", "Eletrônicos", "Outros"]

  // Debug: Monitorar estado dos produtos
  useEffect(() => {
    console.log("🔍 [ADMIN-DEBUG] Estado atual:")
    console.log("- Loading:", loading)
    console.log("- Products:", products.length)
    console.log("- Featured:", featuredProducts.length)
    console.log("- Error:", error)
    console.log("- Products data:", products)

    setDebugInfo({
      loading,
      productsCount: products.length,
      featuredCount: featuredProducts.length,
      error,
      timestamp: new Date().toISOString(),
      ean13Products: products.filter((p) => validateEAN13(p.id)).length,
    })
  }, [loading, products, featuredProducts, error, validateEAN13])

  // Formatar a data da última atualização
  useEffect(() => {
    if (lastUpdate) {
      const date = new Date(lastUpdate)
      setLastUpdateFormatted(`${date.toLocaleDateString()} ${date.toLocaleTimeString()}`)
    }
  }, [lastUpdate])

  // Função para mostrar status temporário
  const showStatus = (type: "success" | "error", message: string) => {
    setOperationStatus({ type, message })
    setTimeout(() => {
      setOperationStatus({ type: null, message: "" })
    }, 3000)
  }

  // Função para limpar cache e recarregar
  const handleForceRefresh = async () => {
    try {
      console.log("🔄 [ADMIN] Limpando cache e recarregando...")

      // Limpar cache do localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("products_cache_v2")
        localStorage.removeItem("products_last_check")
        localStorage.removeItem("weekly_pdfs_cache")
      }

      // Chamar API para limpar cache do servidor
      await fetch("/api/debug/clear-cache", { method: "POST" })

      // Recarregar produtos
      await refreshProducts()

      showStatus("success", "Cache limpo e dados recarregados!")
    } catch (error) {
      showStatus("error", "Erro ao limpar cache")
    }
  }

  // Se ainda está verificando autenticação
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  // Se não estiver autenticado, mostrar formulário de login
  if (!isAuthenticated) {
    return <LoginForm onLogin={login} error={authError || undefined} loading={authLoading} />
  }

  // Loading inicial dos produtos
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Carregando dados da nuvem...</p>
          <p className="text-sm text-gray-500 mt-2">Todos os produtos são carregados da base de dados</p>
          {debugInfo && (
            <div className="mt-4 text-xs text-gray-400">
              <p>Debug: {JSON.stringify(debugInfo)}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log("📝 [ADMIN] Dados do formulário:", formData)

    if (!formData.name || !formData.description || !formData.category) {
      showStatus("error", "Por favor, preencha todos os campos obrigatórios")
      return
    }

    try {
      if (editingProduct) {
        console.log("✏️ [ADMIN] Editando produto:", editingProduct)
        await updateProduct(editingProduct, formData)
        setEditingProduct(null)
        showStatus("success", "Produto atualizado com sucesso!")
      } else {
        console.log("➕ [ADMIN] Adicionando novo produto")

        // Preparar dados completos do produto com todas as propriedades necessárias
        const productData: Omit<Product, "id"> = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          category: formData.category,
          price: formData.price || 0,
          featured: false, // Não colocar em destaque automaticamente
          order: 0,
          image: formData.image || "/placeholder.svg?height=300&width=300",
        }

        console.log("📋 [ADMIN] Dados do produto a adicionar:", productData)

        await addProduct(productData)
        setIsAddingProduct(false)
        showStatus("success", "Produto adicionado com EAN-13 gerado automaticamente!")
      }
      setFormData({})
    } catch (error) {
      console.error("❌ [ADMIN] Erro ao salvar produto:", error)
      showStatus("error", `Erro ao salvar produto: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product.id)
    setFormData(product)
    setIsAddingProduct(false)
  }

  const handleCancel = () => {
    setIsAddingProduct(false)
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
        showStatus("success", "Ordem atualizada!")
      } catch (error) {
        showStatus("error", "Erro ao reordenar produtos")
      }
    }
  }

  const handleToggleFeatured = async (productId: string) => {
    try {
      const product = products.find((p) => p.id === productId)
      if (!product) return

      if (product.featured) {
        // Remover dos destaques (mas manter na base de dados)
        await updateProduct(productId, { featured: false, order: 0 })
        showStatus("success", "Produto removido dos destaques!")
      } else {
        // Adicionar aos destaques
        if (featuredProducts.length < 6) {
          const maxOrder = Math.max(...featuredProducts.map((p) => p.order), 0)
          await updateProduct(productId, { featured: true, order: maxOrder + 1 })
          showStatus("success", "Produto adicionado aos destaques!")
        } else {
          showStatus("error", "Máximo de 6 produtos em destaque permitidos")
        }
      }
    } catch (error) {
      showStatus("error", error instanceof Error ? error.message : "Erro ao alterar destaque")
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (
      window.confirm(
        "Tem certeza que deseja APAGAR PERMANENTEMENTE este produto?\n\nEsta ação irá:\n- Remover o produto da base de dados\n- Apagar a imagem do produto do servidor\n- Remover o produto de todos os destaques\n\nEsta ação NÃO pode ser desfeita!",
      )
    ) {
      try {
        setIsDeleting(productId)
        await deleteProduct(productId)
        showStatus("success", "Produto apagado permanentemente da base de dados e do servidor!")
      } catch (error) {
        showStatus("error", "Erro ao apagar produto")
      } finally {
        setIsDeleting(null)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Status Bar */}
        {operationStatus.type && (
          <div
            className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-2 ${
              operationStatus.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
            }`}
          >
            {operationStatus.type === "success" ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span>{operationStatus.message}</span>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center space-x-3">
                <span>Painel de Administração</span>
                <Database className="h-8 w-8 text-green-600" />
              </h1>
              <p className="text-gray-600 mt-2">Gerir produtos na base de dados - Papelaria Coutyfil</p>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-1 text-sm text-green-600">
                  <Database className="h-4 w-4" />
                  <span>100% Base de Dados na Nuvem</span>
                </div>
                <div className="flex items-center space-x-1 text-sm text-blue-600">
                  <Database className="h-4 w-4" />
                  <span>{products.length} produtos na base</span>
                </div>
                <div className="flex items-center space-x-1 text-sm text-purple-600">
                  <Barcode className="h-4 w-4" />
                  <span>EAN-13 Automático</span>
                </div>
                <div className="flex items-center space-x-1 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>Última atualização: {lastUpdateFormatted}</span>
                </div>
                {saving && (
                  <div className="flex items-center space-x-1 text-sm text-orange-600">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Salvando...</span>
                  </div>
                )}
                {error && (
                  <div className="flex items-center space-x-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>Erro na sincronização</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleForceRefresh}
                className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                <span>Limpar Cache</span>
              </button>
              <button
                onClick={() => refreshProducts()}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                <span>Atualizar Agora</span>
              </button>
              <button
                onClick={() => {
                  window.location.href = "/"
                }}
                className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Eye className="h-4 w-4" />
                <span>Ver Site</span>
              </button>
              <LogoutButton onLogout={logout} />
            </div>
          </div>
        </div>

        {/* Debug Info - apenas em desenvolvimento */}
        {process.env.NODE_ENV === "development" && debugInfo && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-yellow-800 mb-2">🔧 Debug Info</h3>
            <pre className="text-xs text-yellow-700 overflow-x-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
            <div className="mt-2 flex space-x-2">
              <button
                onClick={async () => {
                  const response = await fetch("/api/debug/admin-products-debug")
                  const data = await response.json()
                  console.log("🔍 Debug completo:", data)
                  alert("Verifique o console para debug completo")
                }}
                className="bg-yellow-600 text-white px-3 py-1 rounded text-xs hover:bg-yellow-700"
              >
                Debug Completo
              </button>
              <button
                onClick={() => {
                  console.log("📊 Estado useProducts:", {
                    products,
                    loading,
                    saving,
                    error,
                    featuredProducts,
                    nonFeaturedProducts,
                  })
                }}
                className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
              >
                Log Estado
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-700">Total de Produtos</h3>
            <p className="text-3xl font-bold text-blue-600">{products.length}</p>
            <p className="text-sm text-gray-500 mt-1">Carregados da base de dados</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-700">Produtos em Destaque</h3>
            <p className="text-3xl font-bold text-green-600">{featuredProducts.length}/6</p>
            <p className="text-sm text-gray-500 mt-1">Visíveis na página inicial</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-700">PDFs Semanais</h3>
            <p className="text-3xl font-bold text-red-600">{pdfs.length}</p>
            <p className="text-sm text-gray-500 mt-1">Catálogos enviados</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-700">Status</h3>
            <p className={`text-3xl font-bold ${saving || pdfsSaving ? "text-orange-600" : "text-green-600"}`}>
              {saving || pdfsSaving ? "Salvando" : "Sincronizado"}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {saving || pdfsSaving ? "Atualizando dados..." : "Dados atualizados"}
            </p>
          </div>
        </div>

        {/* PDF Management Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Catálogos Semanais (PDF)</h2>
              <p className="text-gray-600 mt-1">Gerir os PDFs que aparecem na página principal</p>
            </div>
            <button
              onClick={() => refreshPdfs()}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              disabled={pdfsLoading}
            >
              <RefreshCw className={`h-4 w-4 ${pdfsLoading ? "animate-spin" : ""}`} />
              <span>Atualizar</span>
            </button>
          </div>

          {/* Current PDF Display */}
          {latestPdf && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">PDF Atual na Página Principal</h3>
                    <p className="text-gray-600">{latestPdf.name}</p>
                    <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Semana {latestPdf.week}/{latestPdf.year}
                      </span>
                      <span>•</span>
                      <span>Enviado em {new Date(latestPdf.upload_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <a
                    href={latestPdf.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Ver PDF</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Upload New PDF */}
          <div className="border border-gray-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Enviar Novo Catálogo Semanal</h3>
            <PdfUpload
              onUpload={async (file, name) => {
                await addPdf(file, name)
                showStatus("success", "PDF enviado com sucesso! Agora é o PDF principal.")
              }}
              isUploading={pdfsSaving}
            />
          </div>

          {/* PDF History */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Histórico de PDFs</h3>
            {pdfsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Carregando PDFs...</p>
              </div>
            ) : pdfs.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Nenhum PDF enviado ainda</p>
                <p className="text-gray-500 text-sm mt-1">Envie o primeiro catálogo semanal acima</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pdfs.map((pdf) => (
                  <div
                    key={pdf.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      pdf.id === latestPdf?.id ? "border-green-400 bg-green-50" : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${pdf.id === latestPdf?.id ? "bg-green-100" : "bg-gray-100"}`}>
                        <FileText
                          className={`h-5 w-5 ${pdf.id === latestPdf?.id ? "text-green-600" : "text-gray-600"}`}
                        />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800">{pdf.name}</h4>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Semana {pdf.week}/{pdf.year}
                          </span>
                          <span>•</span>
                          <span>{new Date(pdf.upload_date).toLocaleDateString()}</span>
                          {pdf.id === latestPdf?.id && (
                            <>
                              <span>•</span>
                              <span className="text-green-600 font-medium">ATUAL</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <a
                        href={pdf.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                        title="Ver PDF"
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                      <button
                        onClick={async () => {
                          if (window.confirm(`Tem certeza que deseja apagar "${pdf.name}"?`)) {
                            try {
                              await deletePdf(pdf.id)
                              showStatus("success", "PDF apagado com sucesso!")
                            } catch (error) {
                              showStatus("error", "Erro ao apagar PDF")
                            }
                          }
                        }}
                        className="p-2 text-red-600 hover:text-red-800 transition-colors"
                        title="Apagar PDF"
                        disabled={pdfsSaving}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PDF Error */}
          {pdfsError && (
            <div className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
              <p className="font-medium">Erro nos PDFs:</p>
              <p>{pdfsError}</p>
            </div>
          )}
        </div>

        {/* Add Product Button */}
        <div className="mb-6">
          <button
            onClick={() => setIsAddingProduct(true)}
            disabled={saving}
            className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Plus className="h-5 w-5" />
            <span>Adicionar Produto à Base de Dados</span>
            <Barcode className="h-5 w-5" />
          </button>
          <p className="text-sm text-gray-600 mt-2">
            ✨ Cada produto recebe automaticamente um código EAN-13 único válido
          </p>
        </div>

        {/* Add/Edit Product Form */}
        {(isAddingProduct || editingProduct) && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center space-x-2">
              <span>{editingProduct ? "Editar Produto" : "Adicionar Novo Produto"}</span>
              {!editingProduct && <Barcode className="h-6 w-6 text-purple-600" />}
            </h2>
            {!editingProduct && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2">
                  <Barcode className="h-5 w-5 text-purple-600" />
                  <span className="font-medium text-purple-800">EAN-13 Automático</span>
                </div>
                <p className="text-purple-700 text-sm mt-1">
                  O sistema irá gerar automaticamente um código de barras EAN-13 único e válido para este produto.
                </p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Produto *</label>
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categoria *</label>
                <select
                  value={formData.category || ""}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecionar categoria</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição *</label>
                <textarea
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Imagem do Produto</label>
                <ImageUpload
                  value={formData.image || ""}
                  onChange={(imageUrl) => setFormData({ ...formData, image: imageUrl })}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Save className="h-4 w-4" />
                  <span>{editingProduct ? "Atualizar" : "Adicionar à Base de Dados"}</span>
                  {!editingProduct && <Barcode className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center space-x-2 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                  <span>Cancelar</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Featured Products */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Produtos em Destaque (Ordem de Exibição)</h2>
            <div className="text-sm text-gray-600">
              <span className="font-medium">{featuredProducts.length}/6</span> produtos selecionados
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-6">
            Estes produtos aparecem na página inicial. Use os botões abaixo para remover dos destaques (produto fica na
            base de dados).
          </p>
          {featuredProducts.length === 0 ? (
            <div className="text-center py-8">
              <Star className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Nenhum produto em destaque</p>
              <p className="text-gray-500 text-sm mt-2">Selecione produtos da base de dados para destacar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {featuredProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg bg-green-50"
                >
                  <img
                    src={product.image || "/placeholder.svg?height=80&width=80"}
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{product.name}</h3>
                    <p className="text-sm text-gray-600">{product.category}</p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                      <Barcode className="h-3 w-3" />
                      <span className="font-mono">{product.id}</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          validateEAN13(product.id) ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {validateEAN13(product.id) ? "EAN-13 Válido" : "ID Antigo"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => moveProduct(index, "up")}
                      disabled={index === 0}
                      className="p-2 text-gray-600 hover:text-gray-800 disabled:text-gray-300 disabled:cursor-not-allowed"
                      title="Mover para cima"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => moveProduct(index, "down")}
                      disabled={index === featuredProducts.length - 1}
                      className="p-2 text-gray-600 hover:text-gray-800 disabled:text-gray-300 disabled:cursor-not-allowed"
                      title="Mover para baixo"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(product)}
                      className="p-2 text-blue-600 hover:text-blue-800"
                      title="Editar produto"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleToggleFeatured(product.id)}
                      className="p-2 text-orange-600 hover:text-orange-800"
                      title="Remover dos destaques (mantém na base de dados)"
                    >
                      <StarOff className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All Products */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Todos os Produtos na Base de Dados</h2>
          <p className="text-gray-600 text-sm mb-6">
            Todos os produtos armazenados. Use ⭐ para adicionar aos destaques ou 🗑️ para apagar PERMANENTEMENTE.
          </p>
          {products.length === 0 ? (
            <div className="text-center py-12">
              <Database className="h-24 w-24 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Base de dados vazia</h3>
              <p className="text-gray-600 mb-4">
                Não há produtos armazenados na base de dados. Adicione o primeiro produto para começar.
              </p>
              <button
                onClick={() => setIsAddingProduct(true)}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                Adicionar Primeiro Produto
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className={`border-2 rounded-lg p-4 ${product.featured ? "border-green-400 bg-green-50" : "border-gray-200 bg-white"}`}
                >
                  <img
                    src={product.image || "/placeholder.svg?height=150&width=150"}
                    alt={product.name}
                    className="w-full h-32 object-cover rounded-lg mb-3"
                  />
                  <h3 className="font-semibold text-gray-800 mb-1">{product.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{product.category}</p>
                  <div className="flex items-center space-x-1 text-xs text-gray-500 mb-3">
                    <Barcode className="h-3 w-3" />
                    <span className="font-mono text-xs">{product.id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col space-y-1">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.featured ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {product.featured ? "⭐ Em Destaque" : "Normal"}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          validateEAN13(product.id) ? "bg-purple-100 text-purple-800" : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {validateEAN13(product.id) ? "EAN-13" : "ID Antigo"}
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleToggleFeatured(product.id)}
                        className={`p-2 rounded text-xs font-medium transition-colors ${
                          product.featured
                            ? "bg-orange-100 text-orange-800 hover:bg-orange-200"
                            : "bg-green-100 text-green-800 hover:bg-green-200"
                        }`}
                        title={product.featured ? "Remover dos destaques" : "Adicionar aos destaques"}
                        disabled={isDeleting === product.id}
                      >
                        {product.featured ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-2 bg-red-100 text-red-800 hover:bg-red-200 rounded transition-colors"
                        title="Apagar PERMANENTEMENTE da base de dados e do servidor"
                        disabled={isDeleting === product.id}
                      >
                        {isDeleting === product.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
