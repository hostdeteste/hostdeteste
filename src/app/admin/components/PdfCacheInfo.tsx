"use client"

import { useState, useEffect } from "react"
import { useFullPdfCache } from "@/app/lib/pdf-cache-full"
import { HardDrive, Clock, Trash2, RefreshCw, Download, Zap, TrendingDown } from "lucide-react"

export default function PdfCacheInfo() {
  const { getCacheInfo, clearAllCache, getBandwidthSavings } = useFullPdfCache()
  const [cacheInfo, setCacheInfo] = useState<{
    totalPdfs: number
    totalSize: string
    pdfs: Array<{
      name: string
      size: string
      age: string
      expiresIn: string
      lastAccessed: string
    }>
  }>({ totalPdfs: 0, totalSize: "0MB", pdfs: [] })

  const [bandwidthSavings, setBandwidthSavings] = useState<{
    totalSaved: string
    requestsSaved: number
    cacheHitRate: string
  }>({ totalSaved: "0MB", requestsSaved: 0, cacheHitRate: "0%" })

  const refreshCacheInfo = () => {
    setCacheInfo(getCacheInfo())
    setBandwidthSavings(getBandwidthSavings())
  }

  useEffect(() => {
    refreshCacheInfo()

    // Atualizar a cada 30 segundos
    const interval = setInterval(refreshCacheInfo, 30000)
    return () => clearInterval(interval)
  }, [getCacheInfo, getBandwidthSavings])

  const handleClearCache = () => {
    if (
      confirm(
        "Tem certeza que deseja limpar todo o cache de PDFs? Isso irá forçar o download novamente e resetar as estatísticas de economia.",
      )
    ) {
      clearAllCache()
      refreshCacheInfo()
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <HardDrive className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Cache Completo de PDFs (7 dias)</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={refreshCacheInfo}
            className="p-2 text-blue-600 hover:text-blue-800 transition-colors"
            title="Atualizar informações"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={handleClearCache}
            className="p-2 text-red-600 hover:text-red-800 transition-colors"
            title="Limpar cache"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Estatísticas de economia de bandwidth */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingDown className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-700">Bandwidth Economizada</span>
          </div>
          <div className="text-2xl font-bold text-green-600">{bandwidthSavings.totalSaved}</div>
          <div className="text-xs text-green-600">Total poupado em downloads</div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Taxa de Cache Hit</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">{bandwidthSavings.cacheHitRate}</div>
          <div className="text-xs text-blue-600">PDFs servidos do cache</div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center space-x-2 mb-2">
            <Download className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Downloads Evitados</span>
          </div>
          <div className="text-2xl font-bold text-purple-600">{bandwidthSavings.requestsSaved}</div>
          <div className="text-xs text-purple-600">Requests poupados</div>
        </div>
      </div>

      {/* Estatísticas gerais do cache */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{cacheInfo.totalPdfs}</div>
          <div className="text-sm text-blue-700">PDFs em Cache Completo</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{cacheInfo.totalSize}</div>
          <div className="text-sm text-green-700">Espaço Usado (Máx: 50MB)</div>
        </div>
      </div>

      {/* Lista de PDFs em cache */}
      {cacheInfo.pdfs.length > 0 ? (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">PDFs Armazenados Localmente:</h4>
          {cacheInfo.pdfs.map((pdf, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex-1">
                <div className="font-medium text-gray-800 flex items-center space-x-2">
                  <span>{pdf.name}</span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">CACHED</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">{pdf.size}</span> •<span> Idade: {pdf.age}</span> •
                  <span> Último acesso: {pdf.lastAccessed}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">Expira em {pdf.expiresIn}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <HardDrive className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p>Nenhum PDF em cache completo</p>
          <p className="text-sm mt-1">Os PDFs serão baixados e cacheados automaticamente quando visualizados</p>
        </div>
      )}

      {/* Informações sobre o cache */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            <strong>🚀 Cache Completo Ativado:</strong>
          </p>
          <p>• PDFs são baixados e armazenados localmente por 7 dias</p>
          <p>• Cache máximo: 50MB (limpa automaticamente os mais antigos)</p>
          <p>
            • <strong>Economia massiva de bandwidth</strong> - PDF só é baixado uma vez
          </p>
          <p>• Carregamento instantâneo após primeira visualização</p>
          <p>• Compressão automática para PDFs grandes</p>
          <p>• Cache é específico para cada dispositivo/navegador</p>
          <p>
            • <strong>Ideal para visitantes frequentes</strong> - zero downloads repetidos
          </p>
        </div>
      </div>

      {/* Indicador de economia */}
      {Number.parseFloat(bandwidthSavings.totalSaved) > 0 && (
        <div className="mt-4 p-4 bg-gradient-to-r from-green-100 to-blue-100 rounded-lg border border-green-200">
          <div className="flex items-center space-x-2">
            <TrendingDown className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-800">
              Economia Total: {bandwidthSavings.totalSaved} de bandwidth poupada!
            </span>
          </div>
          <div className="text-sm text-green-700 mt-1">
            {bandwidthSavings.requestsSaved} downloads evitados • {bandwidthSavings.cacheHitRate} taxa de sucesso
          </div>
        </div>
      )}
    </div>
  )
}
