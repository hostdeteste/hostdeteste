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
}

export function useWeeklyPdfs() {
  const [pdfs, setPdfs] = useState<WeeklyPdf[]>([])
  const [latestPdf, setLatestPdf] = useState<WeeklyPdf | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadingRef = useRef(false)

  // Carregar PDFs
  const loadPdfs = async (silent = false) => {
    if (loadingRef.current) {
      console.log("🔄 [PDFS] Carregamento já em andamento, ignorando...")
      return
    }

    try {
      loadingRef.current = true
      if (!silent) setLoading(true)
      setError(null)

      console.log("🚀 [PDFS] Carregando PDFs...")

      // Tentar cache primeiro
      const cached = getCachedPdfs()
      if (cached && !silent) {
        console.log("✅ [PDFS] Cache encontrado")
        setPdfs(cached.pdfs)
        setLatestPdf(cached.latest)
        setLoading(false)
        loadingRef.current = false
        return
      }

      // Carregar da API
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      try {
        const response = await fetch("/api/weekly-pdfs", {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`)
        }

        const data = await response.json()

        if (data && (data.success || Array.isArray(data.pdfs))) {
          const pdfsArray = data.pdfs || []
          const latestPdf = data.latest || (pdfsArray.length > 0 ? pdfsArray[0] : null)

          setPdfs(pdfsArray)
          setLatestPdf(latestPdf)
          setError(null)

          // Salvar no cache
          savePdfsToCache(pdfsArray, latestPdf)

          console.log(`✅ [PDFS] ${pdfsArray.length} PDFs carregados`)
        } else {
          throw new Error(data.error || "Resposta inválida")
        }
      } catch (fetchError) {
        clearTimeout(timeoutId)
        console.error("❌ [PDFS] Erro no fetch:", fetchError)

        // Tentar cache de emergência
        const fallback = getFallbackCache()
        if (fallback) {
          setPdfs(fallback.pdfs)
          setLatestPdf(fallback.latest)
          setError("Dados do cache (erro na conexão)")
        } else {
          setPdfs([])
          setLatestPdf(null)
          setError("Erro ao carregar PDFs")
        }
      }
    } catch (error) {
      console.error("💥 [PDFS] Erro geral:", error)
      setPdfs([])
      setLatestPdf(null)
      setError("Erro ao carregar PDFs")
    } finally {
      if (!silent) setLoading(false)
      loadingRef.current = false
    }
  }

  // Cache functions
  const getCachedPdfs = () => {
    try {
      const cached = localStorage.getItem("weekly_pdfs_cache")
      if (!cached) return null

      const data = JSON.parse(cached)
      const age = Date.now() - data.timestamp

      // Cache válido por 5 minutos
      if (age < 5 * 60 * 1000) {
        return { pdfs: data.pdfs || [], latest: data.latest || null }
      }
      return null
    } catch {
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
      localStorage.setItem("weekly_pdfs_cache", JSON.stringify(cacheData))
    } catch (error) {
      console.warn("⚠️ [PDFS] Erro ao salvar cache:", error)
    }
  }

  const getFallbackCache = () => {
    try {
      const cached = localStorage.getItem("weekly_pdfs_cache")
      if (cached) {
        const data = JSON.parse(cached)
        return { pdfs: data.pdfs || [], latest: data.latest || null }
      }
    } catch {
      // Ignore
    }
    return null
  }

  // Adicionar novo PDF
  const addPdf = async (file: File, name: string) => {
    try {
      setSaving(true)
      setError(null)

      const formData = new FormData()
      formData.append("file", file)
      formData.append("name", name)

      const response = await fetch("/api/weekly-pdfs", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Erro ao fazer upload")
      }

      // Limpar cache e recarregar
      localStorage.removeItem("weekly_pdfs_cache")
      await loadPdfs()
    } catch (error) {
      console.error("❌ [PDFS] Erro ao adicionar PDF:", error)
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

      const response = await fetch(`/api/weekly-pdfs/${pdfId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Erro ao deletar PDF")
      }

      // Limpar cache e recarregar
      localStorage.removeItem("weekly_pdfs_cache")
      await loadPdfs()
    } catch (error) {
      console.error("❌ [PDFS] Erro ao deletar PDF:", error)
      const errorMessage = error instanceof Error ? error.message : "Erro ao deletar PDF"
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  // Carregar PDFs ao montar
  useEffect(() => {
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
      localStorage.removeItem("weekly_pdfs_cache")
      return loadPdfs()
    },
  }
}
