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
  file_size?: number
}

export function useWeeklyPdfs() {
  const [pdfs, setPdfs] = useState<WeeklyPdf[]>([])
  const [latestPdf, setLatestPdf] = useState<WeeklyPdf | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadingRef = useRef(false)

  // Carregar PDFs com fallback específico para admin
  const loadPdfs = async (silent = false) => {
    // Evitar múltiplas chamadas simultâneas
    if (loadingRef.current) return

    try {
      loadingRef.current = true
      if (!silent) setLoading(true)
      setError(null)

      console.log("🔄 [ADMIN-PDFS] Carregando PDFs para admin...")

      // Tentar cache primeiro
      const cached = getCachedPdfs()
      if (cached) {
        console.log("✅ [ADMIN-PDFS] Usando cache de PDFs")
        setPdfs(cached.pdfs)
        setLatestPdf(cached.latest)
        if (!silent) setLoading(false)
        loadingRef.current = false

        // Verificar atualizações em background
        setTimeout(() => checkForUpdates(), 2000)
        return
      }

      // Tentar carregar da API com timeout mais longo para admin
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 segundos para admin

      try {
        console.log("📡 [ADMIN-PDFS] Fazendo request para /api/weekly-pdfs...")

        const response = await fetch("/api/weekly-pdfs", {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        console.log("📊 [ADMIN-PDFS] Response status:", response.status)
        console.log("📊 [ADMIN-PDFS] Response ok:", response.ok)

        // Mesmo se não for OK, tentar ler a resposta
        let data: any = {}
        try {
          data = await response.json()
          console.log("📋 [ADMIN-PDFS] Dados recebidos:", data)
        } catch (jsonError) {
          console.error("❌ [ADMIN-PDFS] Erro ao parsear JSON:", jsonError)
          throw new Error("Resposta inválida do servidor")
        }

        // Verificar se a resposta tem dados válidos (mesmo com erro)
        if (data && typeof data === "object") {
          // Se success é false mas temos dados de fallback
          if (!data.success && data.fallback) {
            console.log("⚠️ [ADMIN-PDFS] Usando dados de fallback do servidor")
            setPdfs([])
            setLatestPdf(null)
            setError("Dados temporariamente indisponíveis")
            return
          }

          // Se temos dados válidos
          const pdfsArray = Array.isArray(data.pdfs) ? data.pdfs : []
          const latestPdf = data.latest || (pdfsArray.length > 0 ? pdfsArray[0] : null)

          console.log(`✅ [ADMIN-PDFS] Processando ${pdfsArray.length} PDFs`)

          setPdfs(pdfsArray)
          setLatestPdf(latestPdf)

          // Salvar no cache apenas se temos dados válidos ou sucesso
          if (pdfsArray.length > 0 || data.success) {
            savePdfsToCache(pdfsArray, latestPdf)
          }

          // Se não há erro mas também não há dados, mostrar mensagem apropriada
          if (pdfsArray.length === 0 && !data.error) {
            setError(null) // Sem erro, apenas sem dados
          }
        } else {
          throw new Error("Resposta inválida da API")
        }
      } catch (fetchError) {
        clearTimeout(timeoutId)
        console.error("❌ [ADMIN-PDFS] Erro no fetch:", fetchError)

        // Tratamento específico de erros
        if (fetchError instanceof Error) {
          if (fetchError.name === "AbortError") {
            console.log("⏰ [ADMIN-PDFS] Timeout - tentando cache de emergência...")
            const fallback = getFallbackCache()
            if (fallback) {
              setPdfs(fallback.pdfs)
              setLatestPdf(fallback.latest)
              setError("Dados carregados do cache (conexão lenta)")
              return
            }
            setError("Timeout na conexão - tente novamente")
            return
          }

          if (fetchError.message.includes("fetch")) {
            console.log("🌐 [ADMIN-PDFS] Erro de rede - tentando cache...")
            const fallback = getFallbackCache()
            if (fallback) {
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
        console.log("🆘 [ADMIN-PDFS] Usando cache de emergência")
        setPdfs(fallback.pdfs)
        setLatestPdf(fallback.latest)
        setError("Dados do cache (erro na conexão)")
      } else {
        // Fallback final: dados vazios mas válidos para admin
        console.log("📝 [ADMIN-PDFS] Iniciando com dados vazios para admin")
        setPdfs([])
        setLatestPdf(null)

        // Erro mais específico para admin
        if (error instanceof Error) {
          if (error.message.includes("Supabase")) {
            setError("Erro na base de dados - verifique a configuração")
          } else if (error.message.includes("fetch")) {
            setError("Erro de conexão - verifique a internet")
          } else {
            setError(`Erro: ${error.message}`)
          }
        } else {
          setError("Erro desconhecido ao carregar PDFs")
        }
      }
    } finally {
      if (!silent) setLoading(false)
      loadingRef.current = false
    }
  }

  // Verificar atualizações em background (mais conservador para admin)
  const checkForUpdates = async () => {
    try {
      const lastCheck = localStorage.getItem("admin_pdfs_last_check")
      const now = Date.now()

      // Só verificar se passou mais de 10 minutos para admin
      if (lastCheck && now - Number.parseInt(lastCheck) < 10 * 60 * 1000) {
        return
      }

      console.log("🔍 [ADMIN-PDFS] Verificando atualizações em background...")

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 segundos para background

      try {
        const response = await fetch("/api/weekly-pdfs", {
          cache: "no-store",
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          const data = await response.json()
          if (data && (data.success || Array.isArray(data.pdfs))) {
            const currentLatest = latestPdf?.id
            const newLatest = data.latest?.id

            if (currentLatest !== newLatest) {
              console.log("🔄 [ADMIN-PDFS] Atualizações encontradas, recarregando...")
              setPdfs(data.pdfs || [])
              setLatestPdf(data.latest || null)
              savePdfsToCache(data.pdfs || [], data.latest || null)
            }
          }
        }

        localStorage.setItem("admin_pdfs_last_check", now.toString())
      } catch (bgError) {
        clearTimeout(timeoutId)
        console.log("⚠️ [ADMIN-PDFS] Background check falhou (ignorado):", bgError)
      }
    } catch (error) {
      console.log("⚠️ [ADMIN-PDFS] Background check error (ignorado):", error)
    }
  }

  // Cache functions com tratamento robusto
  const getCachedPdfs = () => {
    try {
      const cached = localStorage.getItem("admin_weekly_pdfs_cache")
      if (!cached) return null

      const data = JSON.parse(cached)
      const age = Date.now() - data.timestamp

      // Cache válido por 1 hora para admin
      if (age < 60 * 60 * 1000) {
        return { pdfs: data.pdfs || [], latest: data.latest || null }
      }

      return null
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
      console.log("💾 [ADMIN-PDFS] Cache salvo com sucesso")
    } catch (error) {
      console.warn("⚠️ [ADMIN-PDFS] Erro ao salvar cache:", error)
    }
  }

  const getFallbackCache = () => {
    try {
      const cached = localStorage.getItem("admin_weekly_pdfs_cache")
      if (cached) {
        const data = JSON.parse(cached)
        return { pdfs: data.pdfs || [], latest: data.latest || null }
      }
    } catch (error) {
      console.warn("⚠️ [ADMIN-PDFS] Erro ao ler cache de emergência:", error)
    }
    return null
  }

  // Adicionar novo PDF com tratamento robusto
  const addPdf = async (file: File, name: string) => {
    try {
      setSaving(true)
      setError(null)

      console.log("📤 [ADMIN-PDFS] Adicionando PDF:", name)

      const formData = new FormData()
      formData.append("file", file)
      formData.append("name", name)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 segundos para upload

      try {
        const response = await fetch("/api/weekly-pdfs", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Erro HTTP: ${response.status}`)
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || "Erro ao fazer upload")
        }

        console.log("✅ [ADMIN-PDFS] PDF adicionado com sucesso")

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

  // Deletar PDF com tratamento robusto
  const deletePdf = async (pdfId: string) => {
    try {
      setSaving(true)
      setError(null)

      console.log("🗑️ [ADMIN-PDFS] Deletando PDF:", pdfId)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 segundos para delete

      try {
        const response = await fetch(`/api/weekly-pdfs/${pdfId}`, {
          method: "DELETE",
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Erro HTTP: ${response.status}`)
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || "Erro ao deletar PDF")
        }

        console.log("✅ [ADMIN-PDFS] PDF deletado com sucesso")

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
    console.log("🚀 [ADMIN-PDFS] Iniciando carregamento de PDFs para admin...")
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
    refreshPdfs: () => loadPdfs(),
  }
}
