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
    const originalSizeMB = originalSize / (1024 * 1024)

    console.log(`🔄 Iniciando compressão de PDF: ${originalSizeMB.toFixed(2)}MB`)

    // Se já está dentro do limite, não comprimir
    if (originalSize <= this.MAX_SIZE_BYTES) {
      console.log(`✅ PDF já está no limite: ${originalSizeMB.toFixed(2)}MB`)
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
      const { PDFDocument, rgb } = await import("pdf-lib")

      // Ler o arquivo original
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
        capNumbers: true,
      })

      console.log(`📄 PDF carregado: ${pdfDoc.getPageCount()} páginas`)

      let compressedBytes: Uint8Array
      let attempt = 1

      // ESTRATÉGIA 1: Compressão básica com otimizações
      console.log(`🔄 Tentativa ${attempt}: Compressão básica`)

      // Limpar metadados
      pdfDoc.setTitle("")
      pdfDoc.setAuthor("")
      pdfDoc.setSubject("")
      pdfDoc.setKeywords([])
      pdfDoc.setProducer("Compressed")
      pdfDoc.setCreator("Auto-Compressor")

      compressedBytes = await pdfDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
        objectsPerTick: 50,
        updateFieldAppearances: false,
      })

      let currentSize = compressedBytes.length
      let currentSizeMB = currentSize / (1024 * 1024)
      console.log(`📊 Após tentativa ${attempt}: ${currentSizeMB.toFixed(2)}MB`)

      // ESTRATÉGIA 2: Recriar PDF página por página (remove objetos órfãos)
      if (currentSize > this.MAX_SIZE_BYTES) {
        attempt++
        console.log(`🔄 Tentativa ${attempt}: Recriando PDF página por página`)

        const newPdfDoc = await PDFDocument.create()
        const pageCount = pdfDoc.getPageCount()

        // Processar páginas em lotes pequenos para evitar travamento
        const batchSize = Math.max(1, Math.floor(10 / Math.sqrt(pageCount)))

        for (let i = 0; i < pageCount; i += batchSize) {
          const endIndex = Math.min(i + batchSize, pageCount)
          const pageIndices = Array.from({ length: endIndex - i }, (_, idx) => i + idx)

          try {
            const copiedPages = await newPdfDoc.copyPages(pdfDoc, pageIndices)
            copiedPages.forEach((page) => {
              // Reduzir escala da página se muito grande
              const { width, height } = page.getSize()
              if (width > 800 || height > 1000) {
                const scale = Math.min(800 / width, 1000 / height)
                page.scale(scale, scale)
              }
              newPdfDoc.addPage(page)
            })
          } catch (pageError) {
            console.warn(`⚠️ Erro ao processar páginas ${i}-${endIndex - 1}, pulando...`)
            // Continuar com as próximas páginas
          }

          // Pequena pausa para não travar o browser
          if (i % 5 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 10))
          }
        }

        compressedBytes = await newPdfDoc.save({
          useObjectStreams: true,
          addDefaultPage: false,
          objectsPerTick: 20,
          updateFieldAppearances: false,
        })

        currentSize = compressedBytes.length
        currentSizeMB = currentSize / (1024 * 1024)
        console.log(`📊 Após tentativa ${attempt}: ${currentSizeMB.toFixed(2)}MB`)
      }

      // ESTRATÉGIA 3: Compressão mais agressiva com redução de páginas se necessário
      if (currentSize > this.MAX_SIZE_BYTES) {
        attempt++
        console.log(`🔄 Tentativa ${attempt}: Compressão agressiva`)

        const newPdfDoc = await PDFDocument.create()
        const pageCount = pdfDoc.getPageCount()

        // Se tem muitas páginas, pode ser necessário reduzir
        const maxPages = Math.min(pageCount, Math.floor(50 * (this.MAX_SIZE_BYTES / currentSize)))
        const pageStep = pageCount > maxPages ? Math.ceil(pageCount / maxPages) : 1

        console.log(`📄 Processando ${Math.min(pageCount, maxPages)} de ${pageCount} páginas (step: ${pageStep})`)

        for (let i = 0; i < pageCount && newPdfDoc.getPageCount() < maxPages; i += pageStep) {
          try {
            const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [i])

            // Reduzir escala mais agressivamente
            const { width, height } = copiedPage.getSize()
            const scale = Math.min(600 / width, 800 / height, 0.8)
            copiedPage.scale(scale, scale)

            newPdfDoc.addPage(copiedPage)
          } catch (pageError) {
            console.warn(`⚠️ Erro ao processar página ${i}, pulando...`)
          }

          // Pausa a cada 3 páginas
          if (i % 3 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 5))
          }
        }

        compressedBytes = await newPdfDoc.save({
          useObjectStreams: true,
          addDefaultPage: false,
          objectsPerTick: 10,
          updateFieldAppearances: false,
        })

        currentSize = compressedBytes.length
        currentSizeMB = currentSize / (1024 * 1024)
        console.log(`📊 Após tentativa ${attempt}: ${currentSizeMB.toFixed(2)}MB`)
      }

      // ESTRATÉGIA 4: Última tentativa - PDF mínimo
      if (currentSize > this.MAX_SIZE_BYTES) {
        attempt++
        console.log(`🔄 Tentativa ${attempt}: PDF mínimo (última tentativa)`)

        const newPdfDoc = await PDFDocument.create()
        const pageCount = pdfDoc.getPageCount()

        // Pegar apenas as primeiras páginas mais importantes
        const maxPages = Math.min(10, Math.floor(pageCount * 0.3))

        console.log(`📄 Criando PDF mínimo com ${maxPages} páginas principais`)

        for (let i = 0; i < Math.min(pageCount, maxPages); i++) {
          try {
            const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [i])

            // Escala muito reduzida
            const { width, height } = copiedPage.getSize()
            const scale = Math.min(400 / width, 600 / height, 0.6)
            copiedPage.scale(scale, scale)

            newPdfDoc.addPage(copiedPage)
          } catch (pageError) {
            console.warn(`⚠️ Erro ao processar página ${i}, pulando...`)
          }
        }

        // Adicionar página de aviso se páginas foram removidas
        if (pageCount > maxPages) {
          const page = newPdfDoc.addPage([400, 600])
          page.drawText(
            `AVISO: PDF original tinha ${pageCount} páginas.\n` +
              `Para caber no limite de 4MB, foram mantidas\n` +
              `apenas as primeiras ${maxPages} páginas.\n\n` +
              `Para ver o PDF completo, comprima-o\n` +
              `externamente antes do upload.`,
            {
              x: 50,
              y: 500,
              size: 12,
              color: rgb(0.8, 0, 0),
            },
          )
        }

        compressedBytes = await newPdfDoc.save({
          useObjectStreams: true,
          addDefaultPage: false,
          objectsPerTick: 5,
          updateFieldAppearances: false,
        })

        currentSize = compressedBytes.length
        currentSizeMB = currentSize / (1024 * 1024)
        console.log(`📊 Após tentativa ${attempt}: ${currentSizeMB.toFixed(2)}MB`)
      }

      // Verificar se conseguiu comprimir suficientemente
      if (currentSize > this.MAX_SIZE_BYTES) {
        const finalSizeMB = currentSize / (1024 * 1024)
        throw new Error(
          `PDF muito complexo para compressão automática (${finalSizeMB.toFixed(1)}MB após ${attempt} tentativas). ` +
            `Use uma ferramenta externa de compressão ou reduza o conteúdo do PDF.`,
        )
      }

      // Criar arquivo final
      const compressedFile = new File([compressedBytes], file.name, {
        type: "application/pdf",
        lastModified: Date.now(),
      })

      const compressionRatio = originalSize / currentSize
      const savedMB = (originalSize - currentSize) / (1024 * 1024)

      console.log(`✅ Compressão concluída com sucesso:`)
      console.log(`   Original: ${originalSizeMB.toFixed(2)}MB`)
      console.log(`   Comprimido: ${currentSizeMB.toFixed(2)}MB`)
      console.log(`   Economia: ${savedMB.toFixed(2)}MB (${((1 - currentSize / originalSize) * 100).toFixed(1)}%)`)
      console.log(`   Ratio: ${compressionRatio.toFixed(2)}x`)
      console.log(`   Tentativas: ${attempt}`)

      return {
        compressedFile,
        originalSize,
        compressedSize: currentSize,
        compressionRatio,
        wasCompressed: true,
      }
    } catch (error) {
      console.error("❌ Erro na compressão do PDF:", error)

      // Se o arquivo original for pequeno o suficiente (margem de 10%), tentar usar ele
      if (originalSize <= this.MAX_SIZE_BYTES * 1.1) {
        console.log(`⚠️ Usando arquivo original (${originalSizeMB.toFixed(2)}MB) - compressão falhou`)
        return {
          compressedFile: file,
          originalSize,
          compressedSize: originalSize,
          compressionRatio: 1,
          wasCompressed: false,
        }
      }

      throw new Error(
        `Falha na compressão do PDF: ${error instanceof Error ? error.message : "Erro desconhecido"}. ` +
          `Tente usar uma ferramenta externa de compressão antes do upload.`,
      )
    }
  }
}
