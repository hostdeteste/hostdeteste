import { PDFDocument } from "pdf-lib"

interface CompressionResult {
  compressedBuffer: Buffer
  originalSize: number
  compressedSize: number
  compressionRatio: number
  wasCompressed: boolean
}

export class PDFCompressor {
  private static readonly MAX_SIZE_MB = 4.5
  private static readonly TARGET_SIZE_MB = 3.5 // Margem de segurança

  static async compressPDF(file: File): Promise<CompressionResult> {
    const originalBuffer = Buffer.from(await file.arrayBuffer())
    const originalSize = originalBuffer.length
    const originalSizeMB = originalSize / (1024 * 1024)

    console.log(`📄 [COMPRESSOR] Arquivo original: ${originalSizeMB.toFixed(2)}MB`)

    // Se já está dentro do limite, não comprimir
    if (originalSizeMB <= this.MAX_SIZE_MB) {
      console.log(`✅ [COMPRESSOR] Arquivo já está dentro do limite (${originalSizeMB.toFixed(2)}MB)`)
      return {
        compressedBuffer: originalBuffer,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1,
        wasCompressed: false,
      }
    }

    try {
      console.log(`🔄 [COMPRESSOR] Comprimindo PDF de ${originalSizeMB.toFixed(2)}MB...`)

      // Carregar o PDF
      const pdfDoc = await PDFDocument.load(originalBuffer)

      // Estratégias de compressão progressivas
      let compressedBytes: Uint8Array

      // Estratégia 1: Compressão básica
      compressedBytes = await pdfDoc.save({
        useObjectStreams: false,
        addDefaultPage: false,
        objectsPerTick: 50,
      })

      let compressedSizeMB = compressedBytes.length / (1024 * 1024)
      console.log(`📊 [COMPRESSOR] Após compressão básica: ${compressedSizeMB.toFixed(2)}MB`)

      // Estratégia 2: Se ainda muito grande, tentar compressão mais agressiva
      if (compressedSizeMB > this.MAX_SIZE_MB) {
        console.log(`🔄 [COMPRESSOR] Aplicando compressão agressiva...`)

        // Recriar PDF com configurações mais agressivas
        const newPdfDoc = await PDFDocument.create()
        const pages = await newPdfDoc.copyPages(pdfDoc, pdfDoc.getPageIndices())

        pages.forEach((page) => {
          newPdfDoc.addPage(page)
        })

        compressedBytes = await newPdfDoc.save({
          useObjectStreams: true,
          addDefaultPage: false,
          objectsPerTick: 20,
        })

        compressedSizeMB = compressedBytes.length / (1024 * 1024)
        console.log(`📊 [COMPRESSOR] Após compressão agressiva: ${compressedSizeMB.toFixed(2)}MB`)
      }

      // Estratégia 3: Se ainda muito grande, reduzir qualidade das imagens
      if (compressedSizeMB > this.MAX_SIZE_MB) {
        console.log(`🔄 [COMPRESSOR] Otimizando imagens...`)

        try {
          // Esta é uma compressão mais básica - para compressão avançada de imagens
          // seria necessário usar bibliotecas adicionais como sharp + pdf2pic
          const finalPdfDoc = await PDFDocument.create()
          const finalPages = await finalPdfDoc.copyPages(pdfDoc, pdfDoc.getPageIndices())

          finalPages.forEach((page) => {
            finalPdfDoc.addPage(page)
          })

          compressedBytes = await finalPdfDoc.save({
            useObjectStreams: true,
            addDefaultPage: false,
            objectsPerTick: 10,
          })

          compressedSizeMB = compressedBytes.length / (1024 * 1024)
          console.log(`📊 [COMPRESSOR] Após otimização final: ${compressedSizeMB.toFixed(2)}MB`)
        } catch (optimizationError) {
          console.warn(`⚠️ [COMPRESSOR] Erro na otimização de imagens:`, optimizationError)
        }
      }

      const compressedBuffer = Buffer.from(compressedBytes)
      const compressionRatio = originalSize / compressedBuffer.length

      console.log(`✅ [COMPRESSOR] Compressão concluída:`)
      console.log(`   Original: ${originalSizeMB.toFixed(2)}MB`)
      console.log(`   Comprimido: ${compressedSizeMB.toFixed(2)}MB`)
      console.log(`   Economia: ${((1 - compressedBuffer.length / originalSize) * 100).toFixed(1)}%`)

      // Verificar se ainda está muito grande
      if (compressedSizeMB > this.MAX_SIZE_MB) {
        throw new Error(
          `PDF ainda muito grande após compressão (${compressedSizeMB.toFixed(1)}MB). ` +
            `Use uma ferramenta externa para comprimir mais.`,
        )
      }

      return {
        compressedBuffer,
        originalSize,
        compressedSize: compressedBuffer.length,
        compressionRatio,
        wasCompressed: true,
      }
    } catch (error) {
      console.error(`❌ [COMPRESSOR] Erro na compressão:`, error)

      // Se a compressão falhar, verificar se o original ainda pode ser usado
      if (originalSizeMB <= this.MAX_SIZE_MB * 1.1) {
        // 10% de tolerância
        console.log(`⚠️ [COMPRESSOR] Usando arquivo original (compressão falhou)`)
        return {
          compressedBuffer: originalBuffer,
          originalSize,
          compressedSize: originalSize,
          compressionRatio: 1,
          wasCompressed: false,
        }
      }

      throw new Error(
        `Erro na compressão do PDF: ${error instanceof Error ? error.message : "Erro desconhecido"}. ` +
          `Arquivo muito grande (${originalSizeMB.toFixed(1)}MB) - use uma ferramenta externa.`,
      )
    }
  }

  // Método para estimar se um arquivo precisa de compressão
  static needsCompression(fileSizeBytes: number): boolean {
    const sizeMB = fileSizeBytes / (1024 * 1024)
    return sizeMB > this.MAX_SIZE_MB
  }

  // Método para obter informações sobre limites
  static getLimits() {
    return {
      maxSizeMB: this.MAX_SIZE_MB,
      targetSizeMB: this.TARGET_SIZE_MB,
      maxSizeBytes: this.MAX_SIZE_MB * 1024 * 1024,
    }
  }
}
