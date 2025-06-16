"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Upload, FileText, Loader2, Calendar, AlertCircle, ExternalLink, Zap } from "lucide-react"

interface PdfUploadProps {
  onUpload: (file: File, name: string) => Promise<void>
  isUploading?: boolean
  className?: string
}

export default function PdfUpload({ onUpload, isUploading = false, className = "" }: PdfUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [pdfName, setPdfName] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Gerar nome automático baseado na data
  const generateWeeklyName = () => {
    const now = new Date()
    const day = now.getDate()
    const month = now.getMonth() + 1
    return `Folheto ${day}/${month} a ${day + 7}/${month}`
  }

  const handleFileSelect = (file: File) => {
    // Validar tipo de arquivo
    if (file.type !== "application/pdf") {
      setUploadError("Por favor, selecione apenas arquivos PDF")
      return
    }

    // Mostrar informação sobre compressão automática
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > 4.5) {
      setCompressionInfo(
        `📄 Arquivo grande detectado (${sizeMB.toFixed(1)}MB). Será comprimido automaticamente para caber no limite de 4.5MB do Vercel.`,
      )
    } else if (sizeMB > 2) {
      setCompressionInfo(
        `📄 Arquivo de tamanho médio (${sizeMB.toFixed(1)}MB). Pode ser otimizado automaticamente para melhor performance.`,
      )
    } else {
      setCompressionInfo(`✅ Arquivo de tamanho ideal (${sizeMB.toFixed(1)}MB). Não precisará de compressão.`)
    }

    setSelectedFile(file)
    setUploadError(null)

    // Se não há nome, gerar automaticamente
    if (!pdfName) {
      setPdfName(generateWeeklyName())
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !pdfName.trim()) {
      setUploadError("Selecione um arquivo PDF e digite um nome")
      return
    }

    try {
      setUploadError(null)
      setUploadProgress(0)
      setCompressionInfo("🔄 Processando e comprimindo PDF automaticamente...")

      // Simular progresso
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      await onUpload(selectedFile, pdfName.trim())

      // Limpar formulário após sucesso
      setSelectedFile(null)
      setPdfName("")
      setUploadProgress(0)
      setCompressionInfo(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      setUploadProgress(0)
      setCompressionInfo(null)
      if (error instanceof Error) {
        if (error.message.includes("413") || error.message.includes("Content Too Large")) {
          setUploadError(
            "Arquivo muito grande mesmo após compressão automática. Use uma ferramenta externa para comprimir mais.",
          )
        } else if (error.message.includes("compressão")) {
          setUploadError(`Erro na compressão automática: ${error.message}`)
        } else {
          setUploadError(error.message)
        }
      } else {
        setUploadError("Erro ao fazer upload")
      }
    }
  }

  const clearSelection = () => {
    setSelectedFile(null)
    setPdfName("")
    setUploadError(null)
    setUploadProgress(0)
    setCompressionInfo(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const getFileSizeStatus = (size: number) => {
    const sizeMB = size / (1024 * 1024)
    if (sizeMB > 10) {
      return { color: "text-red-600", message: "❌ Muito grande - será comprimido automaticamente" }
    } else if (sizeMB > 4.5) {
      return { color: "text-orange-600", message: "🔄 Será comprimido automaticamente" }
    } else if (sizeMB > 2) {
      return { color: "text-blue-600", message: "⚡ Pode ser otimizado automaticamente" }
    }
    return { color: "text-green-600", message: "✅ Tamanho ideal - sem compressão necessária" }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Novo aviso sobre compressão automática */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Zap className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-blue-800">🚀 Compressão Automática Ativada!</p>
            <p className="text-blue-700 mt-1">
              PDFs grandes são automaticamente comprimidos no servidor para caber no limite de 4.5MB do Vercel. Você
              pode fazer upload de arquivos maiores sem se preocupar!
            </p>
          </div>
        </div>
      </div>

      {/* Nome do PDF */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Catálogo Semanal *</label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={pdfName}
            onChange={(e) => setPdfName(e.target.value)}
            placeholder="Ex: Folheto de 15/1 a 22/1"
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            disabled={isUploading}
          />
          <button
            type="button"
            onClick={() => setPdfName(generateWeeklyName())}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            disabled={isUploading}
          >
            <Calendar className="h-4 w-4" />
            <span>Auto</span>
          </button>
        </div>
      </div>

      {/* File Upload Area */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileInput}
          className="hidden"
          id="pdf-upload"
          disabled={isUploading}
        />
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isUploading
              ? "border-blue-400 bg-blue-50"
              : dragActive
                ? "border-green-500 bg-green-50"
                : selectedFile
                  ? "border-green-400 bg-green-50"
                  : "border-gray-400 bg-gray-50 hover:border-green-500 hover:bg-green-50 cursor-pointer"
          }`}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <div className="space-y-4">
            {isUploading ? (
              <div className="space-y-3">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                </div>
                <p className="text-lg font-medium text-gray-700">Processando PDF...</p>
                <p className="text-sm text-blue-600">Comprimindo automaticamente se necessário</p>
                {uploadProgress > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            ) : selectedFile ? (
              <div className="space-y-3">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <FileText className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-700">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                  {(() => {
                    const status = getFileSizeStatus(selectedFile.size)
                    return <p className={`text-xs font-medium mt-1 ${status.color}`}>{status.message}</p>
                  })()}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    clearSelection()
                  }}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Remover arquivo
                </button>
              </div>
            ) : (
              <>
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <FileText className="h-8 w-8 text-red-600" />
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-700">Clique ou arraste um arquivo PDF</p>
                  <p className="text-sm text-gray-500 mt-1">Qualquer tamanho - compressão automática ativada!</p>
                  <p className="text-xs text-blue-600 mt-1">⚡ PDFs grandes são otimizados automaticamente</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Compression info */}
        {compressionInfo && (
          <div className="mt-3 text-sm text-blue-600 bg-blue-50 p-3 rounded-md border border-blue-200">
            <div className="flex items-start space-x-2">
              <Zap className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>{compressionInfo}</p>
            </div>
          </div>
        )}

        {/* Error message */}
        {uploadError && (
          <div className="mt-3 text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Erro no upload:</p>
                <p>{uploadError}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Button */}
      {selectedFile && pdfName && (
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className="w-full bg-green-600 text-white py-4 px-6 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-lg flex items-center justify-center space-x-2"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Processando... {uploadProgress > 0 && `${uploadProgress}%`}</span>
            </>
          ) : (
            <>
              <Upload className="h-5 w-5" />
              <span>Fazer Upload (com Compressão Automática)</span>
            </>
          )}
        </button>
      )}

      {/* Ferramentas de Compressão - Agora opcional */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-700 mb-3">🛠️ Ferramentas Externas (Opcional)</h4>
        <p className="text-sm text-gray-600 mb-3">
          Com a compressão automática ativada, estas ferramentas são opcionais. Use apenas se quiser pré-comprimir:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <a
            href="https://www.ilovepdf.com/compress_pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            <span>ILovePDF</span>
          </a>
          <a
            href="https://smallpdf.com/compress-pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            <span>SmallPDF</span>
          </a>
        </div>
      </div>

      {/* Info sobre compressão automática */}
      <div className="text-xs text-gray-500 bg-green-50 p-3 rounded-lg border border-green-200">
        <p>
          <strong>🚀 Compressão Automática:</strong>
        </p>
        <p>• PDFs grandes são automaticamente otimizados no servidor</p>
        <p>• Reduz tamanho mantendo qualidade visual</p>
        <p>• Funciona com qualquer tamanho de arquivo inicial</p>
        <p>• Processo transparente - você só faz upload normalmente</p>
      </div>
    </div>
  )
}
