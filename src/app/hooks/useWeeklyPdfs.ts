"use client"

import { useState, useEffect, useRef } from "react"

export interface WeeklyPdf {
  id: string
  name: string
  file_path: string
  url: string
  upload_date: string
  week: number
  year: number
  // REMOVIDO: file_size?: number
}

export function useWeeklyPdfs() {
  const [pdfs, setPdfs] = useState<WeeklyPdf[]>([])
  const [latestPdf, setLatestPdf] = useState<WeeklyPdf | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadingRef = useRef(false)

  // Carregar PDFs com logs ultra-detalhados
  const loadPdfs = async (silent = false) => {
    // Evitar múltiplas chamadas simultâneas
    if (loadingRef.current) {
      console.log("🔄 [ADMIN-PDFS] Carregamento já em andamento, ignorando...")
      return
    }

    try {
      loadingRef.current = true
      if (!silent) setLoading(true)
      setError(null)

      console.log("🚀 [ADMIN-PDFS] === INICIANDO CARREGAMENTO DE PDFs ===")
      console.log("🔧 [ADMIN-PDFS] Silent mode:", silent)

      // Tentar cache primeiro
      const cached = getCachedPdfs()
      if (cached && !silent) {
        console.log("✅ [ADMIN-PDFS] Cache encontrado:")
        console.log("📊 [ADMIN-PDFS] - PDFs no cache:", cached.pdfs.length)
        console.log("📊 [ADMIN-PDFS] - Latest PDF:", cached.latest?.name || "nenhum")

        setPdfs(cached.pdfs)
        setLatestPdf(cached.latest)
        setLoading(false)
        loadingRef.current = false

        // Verificar atualizações em background
        setTimeout(() => {
          console.log("🔍 [ADMIN-PDFS] Agendando verificação de atualizações...")
          checkForUpdates()
        }, 2000)
        return
      }

      console.log("📡 [ADMIN-PDFS] Cache não encontrado, fazendo request para API...")

      // Tentar carregar da API com timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.log("⏰ [ADMIN-PDFS] TIMEOUT! Abortando request...")
        controller.abort()
      }, 15000)

      try {
        console.log("🌐 [ADMIN-PDFS] Fazendo fetch para /api/weekly-pdfs...")

        const response = await fetch("/api/weekly-pdfs", {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        console.log("📊 [ADMIN-PDFS] Response recebida:")
        console.log("📊 [ADMIN-PDFS] - Status:", response.status)
        console.log("📊 [ADMIN-PDFS] - Status Text:", response.statusText)
        console.log("📊 [ADMIN-PDFS] - OK:", response.ok)

        // Tentar ler a resposta mesmo se não for OK
        let data: any = {}
        let responseText = ""
        try {
          responseText = await response.text()
          console.log("📄 [ADMIN-PDFS] Response text (primeiros 500 chars):", responseText.substring(0, 500))

          data = JSON.parse(responseText)
          console.log("📋 [ADMIN-PDFS] Dados parseados:")
          console.log("📋 [ADMIN-PDFS] - Success:", data.success)
          console.log("📋 [ADMIN-PDFS] - Error:", data.error)
          console.log("📋 [ADMIN-PDFS] - PDFs array:", Array.isArray(data.pdfs))
          console.log("📋 [ADMIN-PDFS] - PDFs count:", data.pdfs?.length || 0)
          console.log("📋 [ADMIN-PDFS] - Latest PDF:", data.latest?.name || "nenhum")

          // Log detalhado dos PDFs
          if (Array.isArray(data.pdfs) && data.pdfs.length > 0) {
            console.log("📄 [ADMIN-PDFS] PDFs encontrados:")
            data.pdfs.forEach((pdf: any, index: number) => {
              console.log(`📄 [ADMIN-PDFS] PDF ${index + 1}:`, {
                id: pdf.id,
                name: pdf.name,
                url: pdf.url,
                upload_date: pdf.upload_date,
                week: pdf.week,
                year: pdf.year,
              })
            })
          }
        } catch (jsonError) {
          console.error("❌ [ADMIN-PDFS] Erro ao parsear JSON:", jsonError)
          console.error("❌ [ADMIN-PDFS] Response text era:", responseText)
          throw new Error("Resposta inválida do servidor")
        }

        // ANÁLISE DETALHADA DA RESPOSTA
        if (data && typeof data === "object") {
          console.log("🔍 [ADMIN-PDFS] Analisando resposta...")

          // Caso 1: Sucesso com dados
          if (data.success && Array.isArray(data.pdfs)) {
            console.log("✅ [ADMIN-PDFS] Sucesso! Processando dados...")

            const pdfsArray = data.pdfs
            const latestPdf = data.latest || (pdfsArray.length > 0 ? pdfsArray[0] : null)

            console.log(`📊 [ADMIN-PDFS] Definindo ${pdfsArray.length} PDFs`)
            console.log(`📊 [ADMIN-PDFS] Latest PDF: ${latestPdf?.name || "nenhum"}`)

            setPdfs(pdfsArray)
            setLatestPdf(latestPdf)
            setError(null)

            // Salvar no cache
            savePdfsToCache(pdfsArray, latestPdf)

            console.log("✅ [ADMIN-PDFS] Dados carregados com sucesso!")
            return
          }

          // Caso 2: Erro mas com fallback
          if (!data.success && data.fallback) {
            console.log("⚠️ [ADMIN-PDFS] Servidor retornou fallback")
            setPdfs([])
            setLatestPdf(null)
            setError(`Erro no servidor: ${data.error || "Dados temporariamente indisponíveis"}`)
            return
          }

          // Caso 3: Erro sem fallback mas com dados
          if (!data.success && Array.isArray(data.pdfs)) {
            console.log("⚠️ [ADMIN-PDFS] Erro mas com dados - usando dados mesmo assim")

            const pdfsArray = data.pdfs
            const latestPdf = data.latest || (pdfsArray.length > 0 ? pdfsArray[0] : null)

            setPdfs(pdfsArray)
            setLatestPdf(latestPdf)
            setError(`Aviso: ${data.error || "Dados carregados com avisos"}`)

            // Salvar no cache mesmo com aviso
            savePdfsToCache(pdfsArray, latestPdf)
            return
          }

          // Caso 4: Resposta válida mas sem dados
          if (data.success && (!data.pdfs || data.pdfs.length === 0)) {
            console.log("📭 [ADMIN-PDFS] Resposta válida mas sem PDFs")
            setPdfs([])
            setLatestPdf(null)
            setError(null) // Sem erro, apenas sem dados
            return
          }

          // Caso 5: Erro com mensagem
          if (data.error) {
            console.log("❌ [ADMIN-PDFS] Servidor retornou erro:", data.error)
            throw new Error(data.error)
          }

          // Caso 6: Resposta estranha
          console.log("❓ [ADMIN-PDFS] Resposta não reconhecida:", data)
          throw new Error("Resposta inesperada do servidor")
        } else {
          console.log("❌ [ADMIN-PDFS] Resposta não é um objeto válido:", typeof data)
          throw new Error("Resposta inválida da API")
        }
      } catch (fetchError) {
        clearTimeout(timeoutId)
        console.error("💥 [ADMIN-PDFS] Erro no fetch:", fetchError)

        // Tratamento específico de erros
        if (fetchError instanceof Error) {
          if (fetchError.name === "AbortError") {
            console.log("⏰ [ADMIN-PDFS] Timeout - tentando cache de emergência...")
            const fallback = getFallbackCache()
            if (fallback) {
              console.log("🆘 [ADMIN-PDFS] Cache de emergência encontrado!")
              setPdfs(fallback.pdfs)
              setLatestPdf(fallback.latest)
              setError("Dados carregados do cache (conexão lenta)")
              return
            }
            setError("Timeout na conexão - tente atualizar a página")
            return
          }

          if (fetchError.message.includes("fetch") || fetchError.message.includes("network")) {
            console.log("🌐 [ADMIN-PDFS] Erro de rede - tentando cache...")
            const fallback = getFallbackCache()
            if (fallback) {
              console.log("🆘 [ADMIN-PDFS] Cache de emergência encontrado!")
              setPdfs(fallback.pdfs)
              setLatestPdf(fallback.latest)
              setError("Dados do cache (sem conexão)")
              return
            }
            setError("Erro de conexão - verifique a internet")
            return
          }
        }

        throw fetchError
      }
    } catch (error) {
      console.error("💥 [ADMIN-PDFS] Erro geral:", error)

      // Tentar cache de emergência
      const fallback = getFallbackCache()
      if (fallback) {
        console.log("🆘 [ADMIN-PDFS] Usando cache de emergência final")
        setPdfs(fallback.pdfs)
        setLatestPdf(fallback.latest)
        setError("Dados do cache (erro na conexão)")
      } else {
        // Fallback final: dados vazios mas válidos para admin
        console.log("📝 [ADMIN-PDFS] Nenhum cache disponível - iniciando vazio")
        setPdfs([])
        setLatestPdf(null)

        // Erro mais específico para admin
        if (error instanceof Error) {
          if (error.message.includes("Supabase")) {
            setError("❌ Erro na base de dados - verifique a configuração do Supabase")
          } else if (error.message.includes("fetch") || error.message.includes("network")) {
            setError("🌐 Erro de conexão - verifique a internet")
          } else if (error.message.includes("timeout") || error.message.includes("Timeout")) {
            setError("⏰ Timeout - servidor demorou muito a responder")
          } else {
            setError(`❌ Erro: ${error.message}`)
          }
        } else {
          setError("❌ Erro desconhecido ao carregar PDFs")
        }
      }
    } finally {
      if (!silent) setLoading(false)
      loadingRef.current = false
      console.log("🏁 [ADMIN-PDFS] === CARREGAMENTO FINALIZADO ===")
    }
  }

  // Verificar atualizações em background
  const checkForUpdates = async () => {
    try {
      const lastCheck = localStorage.getItem("admin_pdfs_last_check")
      const now = Date.now()

      // Só verificar se passou mais de 5 minutos para admin
      if (lastCheck && now - Number.parseInt(lastCheck) < 5 * 60 * 1000) {
        console.log("⏭️ [ADMIN-PDFS] Background check muito recente, pulando...")
        return
      }

      console.log("🔍 [ADMIN-PDFS] === VERIFICAÇÃO EM BACKGROUND ===")

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      try {
        const response = await fetch("/api/weekly-pdfs", {
          cache: "no-store",
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          const data = await response.json()
          console.log("🔍 [ADMIN-PDFS] Background data:", data)

          if (data && (data.success || Array.isArray(data.pdfs))) {
            const currentLatest = latestPdf?.id
            const newLatest = data.latest?.id

            console.log("🔍 [ADMIN-PDFS] Comparando latest:", { currentLatest, newLatest })

            if (currentLatest !== newLatest || (data.pdfs?.length || 0) !== pdfs.length) {
              console.log("🔄 [ADMIN-PDFS] Atualizações encontradas! Recarregando...")
              setPdfs(data.pdfs || [])
              setLatestPdf(data.latest || null)
              savePdfsToCache(data.pdfs || [], data.latest || null)

              // Limpar erro se havia
              if (error) {
                setError(null)
              }
            } else {
              console.log("✅ [ADMIN-PDFS] Nenhuma atualização necessária")
            }
          }
        } else {
          console.log("⚠️ [ADMIN-PDFS] Background check falhou:", response.status)
        }

        localStorage.setItem("admin_pdfs_last_check", now.toString())
      } catch (bgError) {
        clearTimeout(timeoutId)
        console.log("⚠️ [ADMIN-PDFS] Background check error (ignorado):", bgError)
      }
    } catch (error) {
      console.log("⚠️ [ADMIN-PDFS] Background check outer error (ignorado):", error)
    }
  }

  // Cache functions com logs detalhados
  const getCachedPdfs = () => {
    try {
      const cached = localStorage.getItem("admin_weekly_pdfs_cache")
      if (!cached) {
        console.log("💾 [ADMIN-PDFS] Nenhum cache encontrado")
        return null
      }

      const data = JSON.parse(cached)
      const age = Date.now() - data.timestamp
      const ageMinutes = Math.floor(age / (60 * 1000))

      console.log("💾 [ADMIN-PDFS] Cache encontrado:")
      console.log("💾 [ADMIN-PDFS] - Idade:", ageMinutes, "minutos")
      console.log("💾 [ADMIN-PDFS] - PDFs:", data.pdfs?.length || 0)
      console.log("💾 [ADMIN-PDFS] - Latest:", data.latest?.name || "nenhum")

      // Cache válido por 1 hora para admin
      if (age < 60 * 60 * 1000) {
        console.log("✅ [ADMIN-PDFS] Cache válido!")
        return { pdfs: data.pdfs || [], latest: data.latest || null }
      } else {
        console.log("⏰ [ADMIN-PDFS] Cache expirado")
        return null
      }
    } catch (error) {
      console.warn("⚠️ [ADMIN-PDFS] Erro ao ler cache:", error)
      return null
    }
  }

  const savePdfsToCache = (pdfs: WeeklyPdf[], latest: WeeklyPdf | null) => {
    try {
      const cacheData = {
        pdfs: pdfs || [],
        latest: latest || null,
        timestamp: Date.now(),
      }
      localStorage.setItem("admin_weekly_pdfs_cache", JSON.stringify(cacheData))
      console.log("💾 [ADMIN-PDFS] Cache salvo:")
      console.log("💾 [ADMIN-PDFS] - PDFs:", pdfs.length)
      console.log("💾 [ADMIN-PDFS] - Latest:", latest?.name || "nenhum")
    } catch (error) {
      console.warn("⚠️ [ADMIN-PDFS] Erro ao salvar cache:", error)
    }
  }

  const getFallbackCache = () => {
    try {
      const cached = localStorage.getItem("admin_weekly_pdfs_cache")
      if (cached) {
        const data = JSON.parse(cached)
        console.log("🆘 [ADMIN-PDFS] Cache de emergência:")
        console.log("🆘 [ADMIN-PDFS] - PDFs:", data.pdfs?.length || 0)
        console.log("🆘 [ADMIN-PDFS] - Latest:", data.latest?.name || "nenhum")
        return { pdfs: data.pdfs || [], latest: data.latest || null }
      }
    } catch (error) {
      console.warn("⚠️ [ADMIN-PDFS] Erro ao ler cache de emergência:", error)
    }
    return null
  }

  // Adicionar novo PDF
  const addPdf = async (file: File, name: string) => {
    try {
      setSaving(true)
      setError(null)

      console.log("📤 [ADMIN-PDFS] === ADICIONANDO PDF ===")
      console.log("📤 [ADMIN-PDFS] Nome:", name)
      console.log("📤 [ADMIN-PDFS] Tamanho:", (file.size / 1024 / 1024).toFixed(2), "MB")

      const formData = new FormData()
      formData.append("file", file)
      formData.append("name", name)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 segundos para upload

      try {
        const response = await fetch("/api/weekly-pdfs", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        console.log("📤 [ADMIN-PDFS] Upload response:", response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.error("❌ [ADMIN-PDFS] Error response body:", errorText)

          try {
            const errorData = JSON.parse(errorText)
            console.error("❌ [ADMIN-PDFS] Error data parsed:", errorData)
            throw new Error(errorData.error || `Erro HTTP: ${response.status}`)
          } catch (parseError) {
            console.error("❌ [ADMIN-PDFS] Could not parse error response:", parseError)
            throw new Error(`Erro HTTP: ${response.status} - ${errorText}`)
          }
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || "Erro ao fazer upload")
        }

        console.log("✅ [ADMIN-PDFS] PDF adicionado com sucesso!")

        // Limpar cache e recarregar
        localStorage.removeItem("admin_weekly_pdfs_cache")
        await loadPdfs()
      } catch (uploadError) {
        clearTimeout(timeoutId)
        throw uploadError
      }
    } catch (error) {
      console.error("❌ [ADMIN-PDFS] Erro ao adicionar PDF:", error)
      const errorMessage = error instanceof Error ? error.message : "Erro ao adicionar PDF"
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  // Deletar PDF
  const deletePdf = async (pdfId: string) => {
    try {
      setSaving(true)
      setError(null)

      console.log("🗑️ [ADMIN-PDFS] === DELETANDO PDF ===")
      console.log("🗑️ [ADMIN-PDFS] ID:", pdfId)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      try {
        const response = await fetch(`/api/weekly-pdfs/${pdfId}`, {
          method: "DELETE",
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        console.log("🗑️ [ADMIN-PDFS] Delete response:", response.status)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Erro HTTP: ${response.status}`)
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || "Erro ao deletar PDF")
        }

        console.log("✅ [ADMIN-PDFS] PDF deletado com sucesso!")

        // Limpar cache e recarregar
        localStorage.removeItem("admin_weekly_pdfs_cache")
        await loadPdfs()
      } catch (deleteError) {
        clearTimeout(timeoutId)
        throw deleteError
      }
    } catch (error) {
      console.error("❌ [ADMIN-PDFS] Erro ao deletar PDF:", error)
      const errorMessage = error instanceof Error ? error.message : "Erro ao deletar PDF"
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  // Carregar PDFs apenas uma vez ao montar
  useEffect(() => {
    console.log("🚀 [ADMIN-PDFS] Hook montado - iniciando carregamento...")
    loadPdfs()
  }, [])

  return {
    pdfs,
    latestPdf,
    loading,
    saving,
    error,
    addPdf,
    deletePdf,
    refreshPdfs: () => {
      console.log("🔄 [ADMIN-PDFS] Refresh manual solicitado")
      // Limpar cache antes de recarregar
      localStorage.removeItem("admin_weekly_pdfs_cache")
      return loadPdfs()
    },
  }
}
