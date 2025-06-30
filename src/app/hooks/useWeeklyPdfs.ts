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

  // Versão do cache para PDFs
  const PDF_CACHE_VERSION = "v2"
  const PDF_CACHE_KEY = `weekly_pdfs_cache_${PDF_CACHE_VERSION}`

  // Cache functions com auto-invalidação
  const getCachedPdfs = () => {
    try {
      // Limpar caches antigos automaticamente
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("weekly_pdfs_cache_") && key !== PDF_CACHE_KEY) {
          localStorage.removeItem(key)
          console.log(`🧹 Cache PDF antigo removido: ${key}`)
        }
      })

      const cached = localStorage.getItem(PDF_CACHE_KEY)
      if (!cached) return null

      const data = JSON.parse(cached)
      const age = Date.now() - data.timestamp

      // Cache válido por 10 minutos para PDFs
      if (age < 10 * 60 * 1000) {
        if (Array.isArray(data.pdfs)) {
          return { pdfs: data.pdfs || [], latest: data.latest || null }
        } else {
          console.warn("⚠️ Cache PDF corrompido, removendo...")
          localStorage.removeItem(PDF_CACHE_KEY)
          return null
        }
      }

      localStorage.removeItem(PDF_CACHE_KEY)
      return null
    } catch (error) {
      console.warn("⚠️ Erro no cache PDF, limpando...", error)
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("weekly_pdfs_cache_")) {
          localStorage.removeItem(key)
        }
      })
      return null
    }
  }

  const savePdfsToCache = (pdfs: WeeklyPdf[], latest: WeeklyPdf | null) => {
    try {
      if (!Array.isArray(pdfs)) {
        console.error("❌ Tentativa de salvar dados PDF inválidos")
        return
      }

      const cacheData = {
        pdfs: pdfs || [],
        latest: latest || null,
        timestamp: Date.now(),
        version: PDF_CACHE_VERSION,
      }
      localStorage.setItem(PDF_CACHE_KEY, JSON.stringify(cacheData))
      console.log(`✅ Cache PDF salvo: ${pdfs.length} PDFs (${PDF_CACHE_VERSION})`)
    } catch (error) {
      console.warn("⚠️ Erro ao salvar cache PDF:", error)
      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("weekly_pdfs_cache_")) {
            localStorage.removeItem(key)
          }
        })
      } catch {}
    }
  }

  const getFallbackCache = () => {
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("weekly_pdfs_cache_")) {
          const cached = localStorage.getItem(key)
          if (cached) {
            const data = JSON.parse(cached)
            if (Array.isArray(data.pdfs)) {
              console.log(`🆘 Usando cache PDF de emergência: ${key}`)
              return { pdfs: data.pdfs || [], latest: data.latest || null }
            }
          }
        }
      }
    } catch {}
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
      localStorage.removeItem(PDF_CACHE_KEY)
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
      localStorage.removeItem(PDF_CACHE_KEY)
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
      localStorage.removeItem(PDF_CACHE_KEY)
      return loadPdfs()
    },
  }
}
