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

  // Carregar PDFs - sempre direto da API, sem cache
  const loadPdfs = async (silent = false) => {
    if (loadingRef.current) return

    try {
      loadingRef.current = true
      if (!silent) setLoading(true)
      setError(null)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const response = await fetch("/api/weekly-pdfs", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
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
        const latest = data.latest || (pdfsArray.length > 0 ? pdfsArray[0] : null)
        setPdfs(pdfsArray)
        setLatestPdf(latest)
        setError(null)
      } else {
        throw new Error(data.error || "Resposta invalida")
      }
    } catch (err) {
      console.error("Erro ao carregar PDFs:", err)
      setPdfs([])
      setLatestPdf(null)
      setError("Erro ao carregar PDFs")
    } finally {
      if (!silent) setLoading(false)
      loadingRef.current = false
    }
  }

  // Adicionar PDF
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

      // Atualizar estado com o novo PDF
      if (data.pdf) {
        const newPdfs = [data.pdf, ...pdfs]
        setPdfs(newPdfs)
        setLatestPdf(data.pdf)
      } else {
        await loadPdfs()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao adicionar PDF"
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  // Deletar PDF - optimistic update, sem cache
  const deletePdf = async (pdfId: string) => {
    const previousPdfs = pdfs
    const previousLatest = latestPdf

    try {
      setSaving(true)
      setError(null)

      // Remover imediatamente da UI
      const updatedPdfs = pdfs.filter((p) => p.id !== pdfId)
      const updatedLatest = updatedPdfs.length > 0 ? updatedPdfs[0] : null
      setPdfs(updatedPdfs)
      setLatestPdf(updatedLatest)

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
    } catch (err) {
      // Rollback
      setPdfs(previousPdfs)
      setLatestPdf(previousLatest)

      const errorMessage = err instanceof Error ? err.message : "Erro ao deletar PDF"
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

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
