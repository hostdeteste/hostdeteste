"use client"

import type React from "react"
import { useState, useRef } from "react"
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileArchiveIcon as Compress,
  ExternalLink,
} from "lucide-react"
import { ClientPDFCompressor } from "@/app/lib/client-pdf-compressor"

interface PdfUploadProps {
  onUploadSuccess: () => void
}

interface CompressionInfo {
  originalSize: number
  compressedSize: number
  compressionRatio: number
  savedMB: number
  wasCompressed: boolean
}

export default function PdfUpload({ onUploadSuccess }: PdfUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState("")
  const [compressionInfo, setCompressionInfo] = useState<CompressionInfo | null>(null)
  const [showCompressionTools, setShowCompressionTools] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()

    const fileInput = fileInputRef.current
    const nameInput = nameInputRef.current

    if (!fileInput?.files?.[0] || !nameInput?.value.trim()) {
      alert("Por favor, selecione um arquivo e digite um nome")
      return
    }

    const file = fileInput.files[0]
    const name = nameInput.value.trim()

    if (file.type !== "application/pdf") {
      alert("Apenas arquivos PDF são permitidos")
      return
    }

    setIsUploading(true)
    setIsCompressing(false)
    setCompressionInfo(null)
    setShowCompressionTools(false)
    setUploadProgress("Preparando upload...")

    try {
      let processedFile = file
      const originalSizeMB = file.size / (1024 * 1024)

      // Verificar se precisa de compressão
      if (ClientPDFCompressor.needsCompression(file.size)) {
        setIsCompressing(true)
        setUploadProgress(`Comprimindo PDF de ${originalSizeMB.toFixed(1)}MB... (pode demorar alguns segundos)`)

        try {
          const compressionResult = await ClientPDFCompressor.compressPDF(file)
          processedFile = compressionResult.compressedFile

          if (compressionResult.wasCompressed) {
            const savedMB = (compressionResult.originalSize - compressionResult.compressedSize) / (1024 * 1024)

            setCompressionInfo({
              originalSize: compressionResult.originalSize,
              compressedSize: compressionResult.compressedSize,
              compressionRatio: compressionResult.compressionRatio,
              savedMB,
              wasCompressed: true,
            })

            setUploadProgress(
              `PDF comprimido: ${originalSizeMB.toFixed(1)}MB → ${(compressionResult.compressedSize / (1024 * 1024)).toFixed(1)}MB`,
            )
          }
        } catch (compressionError) {
          console.error("Erro na compressão:", compressionError)
          setShowCompressionTools(true)
          throw new Error(`${compressionError instanceof Error ? compressionError.message : "Erro na compressão"}`)
        }

        setIsCompressing(false)
      }

      // Fazer upload do arquivo (comprimido ou original)
      setUploadProgress("Enviando para servidor...")

      const formData = new FormData()
      formData.append("file", processedFile)
      formData.append("name", name)

      const response = await fetch("/api/weekly-pdfs", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Erro no upload")
      }

      setUploadProgress("Upload concluído com sucesso!")

      // Limpar formulário
      if (fileInput) fileInput.value = ""
      if (nameInput) nameInput.value = ""

      // Callback de sucesso
      onUploadSuccess()

      // Limpar estado após 3 segundos
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress("")
        setCompressionInfo(null)
        setShowCompressionTools(false)
      }, 3000)
    } catch (error) {
      console.error("Erro no upload:", error)
      setUploadProgress(`Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`)

      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress("")
        setCompressionInfo(null)
      }, 8000)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Upload de PDF Semanal</h2>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Faça upload de PDFs com compressão automática inteligente. Arquivos grandes são otimizados automaticamente.
        </p>
      </div>

      {/* Content */}
      <div className="p-6">
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nome do PDF
            </label>
            <input
              id="name"
              ref={nameInputRef}
              type="text"
              placeholder="Ex: Promoções Janeiro 2024"
              disabled={isUploading}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="file" className="block text-sm font-medium text-gray-700">
              Arquivo PDF
            </label>
            <input
              id="file"
              type="file"
              accept=".pdf"
              ref={fileInputRef}
              disabled={isUploading}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {/* Informações de compressão */}
          {compressionInfo && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                <Compress className="h-4 w-4" />
                PDF Comprimido com Sucesso
              </div>
              <div className="text-sm text-green-700 space-y-1">
                <div>Original: {(compressionInfo.originalSize / (1024 * 1024)).toFixed(2)}MB</div>
                <div>Comprimido: {(compressionInfo.compressedSize / (1024 * 1024)).toFixed(2)}MB</div>
                <div>
                  Economia: {compressionInfo.savedMB.toFixed(2)}MB (
                  {((1 - compressionInfo.compressedSize / compressionInfo.originalSize) * 100).toFixed(1)}%)
                </div>
              </div>
            </div>
          )}

          {/* Status do upload */}
          {uploadProgress && (
            <div
              className={`border rounded-lg p-4 ${
                uploadProgress.includes("sucesso")
                  ? "bg-green-50 border-green-200"
                  : uploadProgress.includes("Erro")
                    ? "bg-red-50 border-red-200"
                    : "bg-blue-50 border-blue-200"
              }`}
            >
              <div className="flex items-center gap-2">
                {isCompressing ? (
                  <Compress className="h-4 w-4 text-blue-600 animate-pulse" />
                ) : isUploading ? (
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                ) : uploadProgress.includes("sucesso") ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : uploadProgress.includes("Erro") ? (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                ) : (
                  <FileText className="h-4 w-4 text-blue-600" />
                )}
                <span
                  className={`text-sm ${
                    uploadProgress.includes("sucesso")
                      ? "text-green-700"
                      : uploadProgress.includes("Erro")
                        ? "text-red-700"
                        : "text-blue-700"
                  }`}
                >
                  {uploadProgress}
                </span>
              </div>
            </div>
          )}

          {/* Ferramentas de compressão externa (mostrar quando falha) */}
          {showCompressionTools && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-orange-800 font-medium mb-3">
                <AlertCircle className="h-4 w-4" />
                PDF muito complexo - Use compressão externa
              </div>
              <p className="text-sm text-orange-700 mb-3">
                Este PDF é muito complexo para compressão automática. Use uma dessas ferramentas gratuitas:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <a
                  href="https://www.ilovepdf.com/compress_pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-orange-700 hover:text-orange-900 transition-colors p-2 bg-white rounded border"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>ILovePDF (Recomendado)</span>
                </a>
                <a
                  href="https://smallpdf.com/compress-pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-orange-700 hover:text-orange-900 transition-colors p-2 bg-white rounded border"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>SmallPDF</span>
                </a>
              </div>
              <p className="text-xs text-orange-600 mt-2">
                💡 Dica: Use "Compressão Extrema" para reduzir ao máximo o tamanho.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isUploading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
          >
            {isCompressing ? (
              <>
                <Compress className="h-4 w-4 animate-pulse" />
                Comprimindo PDF... (aguarde)
              </>
            ) : isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Fazendo Upload...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Fazer Upload
              </>
            )}
          </button>
        </form>

        {/* Informações sobre compressão inteligente */}
        <div className="mt-6 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
          <div className="font-medium mb-1">🧠 Compressão Inteligente:</div>
          <ul className="space-y-1">
            <li>• Múltiplas estratégias de compressão automática</li>
            <li>• Redução de escala e otimização de páginas</li>
            <li>• Remoção de elementos desnecessários</li>
            <li>• Fallback para ferramentas externas se necessário</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
