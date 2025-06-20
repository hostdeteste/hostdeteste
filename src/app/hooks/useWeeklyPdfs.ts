"use client"

import { useState, useEffect, useRef } from "react"
import type { WeeklyPdf } from "@/app/lib/storage-optimized"

export function useWeeklyPdfs() {
  const [pdfs, setPdfs] = useState<WeeklyPdf[]>([])
  const [latestPdf, setLatestPdf] = useState<WeeklyPdf | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadingRef = useRef(false)

  // Carregar PDFs com cache otimizado
  const loadPdfs = async (silent = false) => {
    // Evitar múltiplas chamadas simultâneas
    if (loadingRef.current) return

    try {
      loadingRef.current = true
      if (!silent) setLoading(true)
      setError(null)

      // Tentar cache primeiro
      const cached = getCachedPdfs()
      if (cached) {
        setPdfs(cached.pdfs)
        setLatestPdf(cached.latest)
        if (!silent) setLoading(false)
        loadingRef.current = false

        // Verificar atualizações em background
        checkForUpdates()
        return
      }

      const response = await fetch("/api/weekly-pdfs", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setPdfs(data.pdfs || [])
        setLatestPdf(data.latest || null)

        // Salvar no cache
        savePdfsToCache(data.pdfs || [], data.latest || null)
      } else {
        throw new Error(data.error || "Erro desconhecido")
      }
    } catch (error) {
      console.error("Erro ao carregar PDFs:", error)
      setError(error instanceof Error ? error.message : "Erro ao carregar PDFs")

      // Tentar cache de emergência
      const fallback = getFallbackCache()
      if (fallback) {
        setPdfs(fallback.pdfs)
        setLatestPdf(fallback.latest)
      }
    } finally {
      if (!silent) setLoading(false)
      loadingRef.current = false
    }
  }

  // Verificar atualizações em background
  const checkForUpdates = async () => {
    try {
      const lastCheck = localStorage.getItem("pdfs_last_check")
      const now = Date.now()

      // Só verificar se passou mais de 5 minutos
      if (lastCheck && now - Number.parseInt(lastCheck) < 5 * 60 * 1000) {
        return
      }

      const response = await fetch("/api/weekly-pdfs", {
        cache: "no-store",
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const currentLatest = latestPdf?.id
          const newLatest = data.latest?.id

          if (currentLatest !== newLatest) {
            setPdfs(data.pdfs || [])
            setLatestPdf(data.latest || null)
            savePdfsToCache(data.pdfs || [], data.latest || null)
          }
        }
      }

      localStorage.setItem("pdfs_last_check", now.toString())
    } catch (error) {
      // Ignorar erros de background check
      console.log("Background check falhou:", error)
    }
  }

  // Cache functions
  const getCachedPdfs = () => {
    try {
      const cached = localStorage.getItem("weekly_pdfs_cache")
      if (!cached) return null

      const data = JSON.parse(cached)
      const age = Date.now() - data.timestamp

      // Cache válido por 30 minutos
      if (age < 30 * 60 * 1000) {
        return { pdfs: data.pdfs, latest: data.latest }
      }

      return null
    } catch {
      return null
    }
  }

  const savePdfsToCache = (pdfs: WeeklyPdf[], latest: WeeklyPdf | null) => {
    try {
      const cacheData = {
        pdfs,
        latest,
        timestamp: Date.now(),
      }
      localStorage.setItem("weekly_pdfs_cache", JSON.stringify(cacheData))
    } catch {
      // Ignorar erros de cache
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
      // Ignorar erros
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

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Erro ao fazer upload")
      }

      // Limpar cache e recarregar
      localStorage.removeItem("weekly_pdfs_cache")
      await loadPdfs()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erro ao adicionar PDF")
      throw error
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

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao deletar PDF")
      }

      // Limpar cache e recarregar
      localStorage.removeItem("weekly_pdfs_cache")
      await loadPdfs()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erro ao deletar PDF")
      throw error
    } finally {
      setSaving(false)
    }
  }

  // Carregar PDFs apenas uma vez ao montar
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
    refreshPdfs: () => loadPdfs(),
  }
}
