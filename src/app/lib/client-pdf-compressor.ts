export class ClientPDFCompressor {
  private static readonly MAX_SIZE_BYTES = 4 * 1024 * 1024 // 4MB
  private static readonly COMPRESSION_THRESHOLD = 2 * 1024 * 1024 // 2MB

  static needsCompression(fileSize: number): boolean {
    return fileSize > this.COMPRESSION_THRESHOLD
  }

  static async compressPDF(file: File): Promise<{
    compressedFile: File
    originalSize: number
    compressedSize: number
    compressionRatio: number
    wasCompressed: boolean
  }> {
    const originalSize = file.size

    // Se já está dentro do limite, não comprimir
    if (originalSize <= this.MAX_SIZE_BYTES) {
      return {
        compressedFile: file,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1,
        wasCompressed: false,
      }
    }

    try {
      // Importar pdf-lib dinamicamente
      const { PDFDocument } = await import("pdf-lib")

      // Ler o arquivo original
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)

      // Estratégias de compressão progressiva
      let compressedBytes: Uint8Array

      // Estratégia 1: Compressão básica
      compressedBytes = await pdfDoc.save({
        useObjectStreams: false,
        addDefaultPage: false,
      })

      // Se ainda está muito grande, tentar compressão mais agressiva
      if (compressedBytes.length > this.MAX_SIZE_BYTES) {
        // Estratégia 2: Remover metadados e otimizar
        pdfDoc.setTitle("")
        pdfDoc.setAuthor("")
        pdfDoc.setSubject("")
        pdfDoc.setKeywords([])
        pdfDoc.setProducer("")
        pdfDoc.setCreator("")

        compressedBytes = await pdfDoc.save({
          useObjectStreams: false,
          addDefaultPage: false,
        })
      }

      // Se ainda está muito grande, aplicar compressão mais drástica
      if (compressedBytes.length > this.MAX_SIZE_BYTES) {
        // Estratégia 3: Recriar PDF página por página (remove objetos desnecessários)
        const newPdfDoc = await PDFDocument.create()
        const pages = await newPdfDoc.copyPages(pdfDoc, pdfDoc.getPageIndices())

        pages.forEach((page) => {
          newPdfDoc.addPage(page)
        })

        compressedBytes = await newPdfDoc.save({
          useObjectStreams: false,
          addDefaultPage: false,
        })
      }

      // Criar novo arquivo
      const compressedFile = new File([compressedBytes], file.name, {
        type: "application/pdf",
        lastModified: Date.now(),
      })

      const compressedSize = compressedFile.size
      const compressionRatio = compressedSize / originalSize

      // Verificar se a compressão foi bem-sucedida
      if (compressedSize > this.MAX_SIZE_BYTES) {
        throw new Error(
          `PDF ainda muito grande após compressão (${(compressedSize / (1024 * 1024)).toFixed(1)}MB). Limite: 4MB`,
        )
      }

      return {
        compressedFile,
        originalSize,
        compressedSize,
        compressionRatio,
        wasCompressed: true,
      }
    } catch (error) {
      console.error("Erro na compressão do PDF:", error)
      throw new Error(`Falha na compressão: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
    }
  }
}
