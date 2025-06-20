"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Upload, FileText, Loader2, Calendar, Zap, AlertTriangle, CheckCircle } from "lucide-react"
import { ClientPDFCompressor } from "@/app/lib/client-pdf-compressor"

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
  const [isCompressing, setIsCompressing] = useState(false)
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: number
    compressedSize: number
    compressionRatio: number
    wasCompressed: boolean
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Gerar nome automático baseado na data
  const generateWeeklyName = () => {
    const now = new Date()
    const day = now.getDate()
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    return `Folheto ${day}/${month} a ${day + 7}/${month}`
  }

  const formatFileSize = (bytes: number): string => {
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`
  }

  const handleFileSelect = async (file: File) => {
    // Validar tipo de arquivo
    if (file.type !== "application/pdf") {
      setUploadError("Por favor, selecione apenas arquivos PDF")
      return
    }

    // Validar tamanho máximo (20MB)
    if (file.size > 20 * 1024 * 1024) {
      setUploadError("O PDF deve ter no máximo 20MB")
      return
    }

    setUploadError(null)
    setCompressionInfo(null)

    // Se não há nome, gerar automaticamente
    if (!pdfName) {
      setPdfName(generateWeeklyName())
    }

    // Verificar se precisa de compressão
    const needsCompression = ClientPDFCompressor.needsCompression(file.size)

    if (needsCompression) {
      console.log(`📄 PDF de ${formatFileSize(file.size)} precisa de compressão`)

      try {
        setIsCompressing(true)
        setUploadError(null)

        const result = await ClientPDFCompressor.compressPDF(file)

        setSelectedFile(result.compressedFile)
        setCompressionInfo({
          originalSize: result.originalSize,
          compressedSize: result.compressedSize,
          compressionRatio: result.compressionRatio,
          wasCompressed: result.wasCompressed,
        })

        console.log(
          `✅ Compressão concluída: ${formatFileSize(result.originalSize)} → ${formatFileSize(result.compressedSize)}`,
        )
      } catch (compressionError) {
        console.error("❌ Erro na compressão:", compressionError)
        setUploadError(
          compressionError instanceof Error
            ? compressionError.message
            : "Erro na compressão do PDF. Tente usar uma ferramenta externa.",
        )
        setSelectedFile(null)
      } finally {
        setIsCompressing(false)
      }
    } else {
      console.log(`✅ PDF de ${formatFileSize(file.size)} não precisa de compressão`)
      setSelectedFile(file)
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
      await onUpload(selectedFile, pdfName.trim())

      // Limpar formulário após sucesso
      setSelectedFile(null)
      setPdfName("")
      setCompressionInfo(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Erro ao fazer upload")
    }
  }

  const clearSelection = () => {
    setSelectedFile(null)
    setPdfName("")
    setUploadError(null)
    setCompressionInfo(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
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
            disabled={isUploading || isCompressing}
          />
          <button
            type="button"
            onClick={() => setPdfName(generateWeeklyName())}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            disabled={isUploading || isCompressing}
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
          disabled={isUploading || isCompressing}
        />
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isUploading || isCompressing
              ? "border-blue-400 bg-blue-50"
              : dragActive
                ? "border-green-500 bg-green-50"
                : selectedFile
                  ? "border-green-400 bg-green-50"
                  : "border-gray-400 bg-gray-50 hover:border-green-500 hover:bg-green-50 cursor-pointer"
          }`}
          onClick={() => !isUploading && !isCompressing && fileInputRef.current?.click()}
        >
          <div className="space-y-4">
            {isCompressing ? (
              <div className="space-y-3">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Zap className="h-8 w-8 text-blue-600 animate-pulse" />
                </div>
                <p className="text-lg font-medium text-gray-700">Comprimindo PDF...</p>
                <p className="text-sm text-gray-500">Isso pode levar alguns segundos</p>
              </div>
            ) : isUploading ? (
              <div className="space-y-3">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                </div>
                <p className="text-lg font-medium text-gray-700">Fazendo upload...</p>
              </div>
            ) : selectedFile ? (
              <div className="space-y-3">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <FileText className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-700">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>

                  {/* Informações de compressão */}
                  {compressionInfo && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                          {compressionInfo.wasCompressed ? "PDF Comprimido com Sucesso!" : "PDF Otimizado"}
                        </span>
                      </div>
                      {compressionInfo.wasCompressed && (
                        <div className="text-xs text-green-700 space-y-1">
                          <div className="flex justify-between">
                            <span>Tamanho original:</span>
                            <span className="font-medium">{formatFileSize(compressionInfo.originalSize)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tamanho final:</span>
                            <span className="font-medium">{formatFileSize(compressionInfo.compressedSize)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Economia:</span>
                            <span className="font-medium text-green-600">
                              {((1 - compressionInfo.compressedSize / compressionInfo.originalSize) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
                  <p className="text-sm text-gray-500 mt-1">PDF até 20MB (compressão automática se necessário)</p>
                  <div className="mt-2 flex items-center justify-center space-x-2 text-xs text-blue-600">
                    <Zap className="h-3 w-3" />
                    <span>Compressão automática para PDFs grandes</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Error message */}
        {uploadError && (
          <div className="mt-3 text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Erro:</p>
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
          disabled={isUploading || isCompressing}
          className="w-full bg-green-600 text-white py-4 px-6 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-lg flex items-center justify-center space-x-2"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Fazendo Upload...</span>
            </>
          ) : (
            <>
              <Upload className="h-5 w-5" />
              <span>Fazer Upload do Catálogo</span>
            </>
          )}
        </button>
      )}

      {/* Info sobre compressão */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Zap className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Compressão Automática</p>
            <ul className="space-y-1 text-xs">
              <li>• PDFs maiores que 2MB são automaticamente comprimidos</li>
              <li>• Limite máximo: 20MB (antes da compressão)</li>
              <li>• Compressão inteligente preserva a qualidade</li>
              <li>• Processo realizado no seu navegador (seguro)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
