"use client"

import { Star, ChevronDown, FileText } from "lucide-react"
import { useWeeklyPdfs } from "@/app/hooks/useWeeklyPdfs"
import { useFullPdfCache } from "@/app/lib/pdf-cache-full"
import { useEffect, useState } from "react"

export default function Hero() {
  const { latestPdf, loading } = useWeeklyPdfs()
  const { cachePdf, getCachedPdf, isPdfCached, preloadPdf } = useFullPdfCache()
  const [isMobile, setIsMobile] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isLoadingPdf, setIsLoadingPdf] = useState(false)

  // Detectar mobile apenas uma vez
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()

    const debouncedResize = debounce(checkMobile, 250)
    window.addEventListener("resize", debouncedResize)
    return () => window.removeEventListener("resize", debouncedResize)
  }, [])

  // Carregar PDF do cache ou baixar
  useEffect(() => {
    if (!latestPdf) return

    const loadPdf = async () => {
      try {
        setIsLoadingPdf(true)

        // Verificar se já está em cache
        if (isPdfCached(latestPdf.url)) {
          console.log("📄 [HERO] PDF encontrado no cache")
          const cachedUrl = await getCachedPdf(latestPdf.url)
          if (cachedUrl) {
            setPdfUrl(cachedUrl)
            setIsLoadingPdf(false)
            return
          }
        }

        // Se não está em cache, baixar e cachear
        console.log("📥 [HERO] Baixando e cacheando PDF...")
        const newPdfUrl = await cachePdf(latestPdf.url, latestPdf.name)
        setPdfUrl(newPdfUrl)
      } catch (error) {
        console.error("❌ [HERO] Erro ao carregar PDF:", error)
        // Fallback para proxy
        setPdfUrl(`/api/pdf-proxy?url=${encodeURIComponent(latestPdf.url)}`)
      } finally {
        setIsLoadingPdf(false)
      }
    }

    loadPdf()
  }, [latestPdf, cachePdf, getCachedPdf, isPdfCached])

  // Pré-carregar PDF em background quando disponível
  useEffect(() => {
    if (latestPdf && !isPdfCached(latestPdf.url)) {
      // Pré-carregar após 2 segundos para não interferir com o carregamento inicial
      setTimeout(() => {
        preloadPdf(latestPdf.url, latestPdf.name)
      }, 2000)
    }
  }, [latestPdf, isPdfCached, preloadPdf])

  return (
    <section
      id="inicio"
      className="min-h-screen bg-gradient-to-br from-red-100 via-pink-50 via-green-100 to-yellow-50 relative overflow-hidden flex items-center"
    >
      {/* Elementos de fundo simplificados */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-20 md:w-40 h-20 md:h-40 bg-red-400 rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 right-10 w-16 md:w-32 h-16 md:h-32 bg-green-400 rounded-full blur-2xl"></div>
      </div>

      <div className="container mx-auto px-4 relative py-16 md:py-0">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Content */}
          <div className="space-y-6 md:space-y-8 text-center md:text-left">
            {loading ? <HeroSkeleton /> : latestPdf ? <HeroContent latestPdf={latestPdf} /> : <HeroFallback />}

            {!loading && (
              <div className="flex items-center justify-center md:justify-start space-x-2">
                <div className="flex text-yellow-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 sm:h-6 sm:w-6 fill-current" />
                  ))}
                </div>
                <span className="text-gray-700 font-medium text-base sm:text-lg">
                  Mais de 1000 clientes satisfeitos
                </span>
              </div>
            )}
          </div>

          {/* PDF Preview */}
          <div className="relative flex justify-center mt-8 md:mt-0">
            {loading ? (
              <PdfPreviewSkeleton isMobile={isMobile} />
            ) : latestPdf && pdfUrl ? (
              <PdfPreview
                latestPdf={latestPdf}
                pdfUrl={pdfUrl}
                isMobile={isMobile}
                isLoadingPdf={isLoadingPdf}
                isCached={isPdfCached(latestPdf.url)}
              />
            ) : (
              <PdfPreviewFallback isMobile={isMobile} />
            )}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <ChevronDown className="h-6 w-6 sm:h-8 sm:w-8 text-gray-600" />
      </div>
    </section>
  )
}

// Componentes auxiliares para melhor performance
function HeroSkeleton() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div className="space-y-4">
        <div className="h-12 sm:h-16 md:h-20 bg-gray-200 rounded-lg animate-pulse"></div>
        <div className="h-8 sm:h-10 bg-gray-200 rounded-lg animate-pulse w-3/4"></div>
      </div>
      <div className="space-y-3">
        <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-6 bg-gray-200 rounded animate-pulse w-5/6"></div>
      </div>
    </div>
  )
}

function HeroContent({ latestPdf }: { latestPdf: any }) {
  return (
    <>
      <h1 className="text-3xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 leading-tight">
        <span>
          Conheça a nossa <span className="text-red-600">seleção</span>
        </span>
        <br />
        <span>de produtos criada a pensar em si!</span>
      </h1>
      <div className="text-xl sm:text-2xl text-gray-700 leading-relaxed">
        <p>No nosso folheto encontra:</p>
        <p>Os melhores produtos, com preços imperdíveis e descontos especiais.</p>
      </div>
    </>
  )
}

function HeroFallback() {
  return (
    <>
      <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 leading-tight">
        <span>Não perca, já na próxima semana</span>
        <br />
        <span>
          estará disponível o nosso <span className="text-red-600">folheto!</span>
        </span>
      </h1>
      <div className="text-xl sm:text-2xl text-gray-700 leading-relaxed">
        <p>Prepare-se para ofertas incríveis, descontos especiais e muitas surpresas!</p>
        <p>Fique atento e não perca!</p>
      </div>
    </>
  )
}

function PdfPreviewSkeleton({ isMobile }: { isMobile: boolean }) {
  return (
    <div
      className={`w-full max-w-[460px] ${isMobile ? "h-[400px]" : "h-[600px]"} flex items-center justify-center bg-gray-100 rounded-2xl border-8 border-gray-300 shadow-2xl`}
    >
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
        <div className="text-gray-600">Carregando catálogo...</div>
      </div>
    </div>
  )
}

function PdfPreview({
  latestPdf,
  pdfUrl,
  isMobile,
  isLoadingPdf,
  isCached,
}: {
  latestPdf: any
  pdfUrl: string
  isMobile: boolean
  isLoadingPdf: boolean
  isCached: boolean
}) {
  return (
    <div className="relative w-full max-w-[460px]">
      {/* Header com indicador de cache */}
      <div className="bg-gradient-to-r from-red-500 to-green-500 text-white p-2 sm:p-3 rounded-xl mb-4 shadow-lg relative z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            <div>
              <h3 className="font-bold text-sm sm:text-base line-clamp-1">{latestPdf.name}</h3>
              <div className="flex items-center space-x-2">
                {new Date(latestPdf.uploadDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
                  <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">NOVO!</span>
                )}
                {isCached && (
                  <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold">📱 CACHE</span>
                )}
              </div>
            </div>
          </div>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/20 hover:bg-white/30 px-2 py-1 sm:px-3 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium"
          >
            {isLoadingPdf ? "Carregando..." : "Abrir PDF"}
          </a>
        </div>
      </div>

      {/* Tablet Container */}
      <div className="relative">
        <div
          className="bg-gradient-to-b from-gray-200 to-gray-400 rounded-3xl p-3 sm:p-6 shadow-2xl border-2 border-gray-300 mx-auto"
          style={{
            width: "100%",
            maxWidth: "460px",
            height: isMobile ? "400px" : "600px",
          }}
        >
          <div className="bg-black rounded-2xl p-1 h-full w-full relative overflow-hidden">
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="block relative group h-full w-full">
              <div className="relative bg-white rounded-xl shadow-lg h-full w-full overflow-hidden">
                {isLoadingPdf ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
                      <div className="text-gray-600 text-sm">
                        {isCached ? "Carregando do cache..." : "Baixando PDF..."}
                      </div>
                    </div>
                  </div>
                ) : (
                  <iframe
                    src={`${pdfUrl}#page=1&view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
                    className="w-full h-full"
                    style={{ border: "none", pointerEvents: "none" }}
                    loading="lazy"
                  />
                )}

                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center rounded-xl">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/95 backdrop-blur-sm px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg shadow-lg">
                    <div className="flex items-center space-x-2 text-gray-800 font-medium text-xs sm:text-sm">
                      <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>{isCached ? "PDF em cache - Clique para abrir" : "Clique para abrir PDF completo"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </a>
          </div>
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-8 sm:w-12 h-1 bg-gray-600 rounded-full"></div>
        </div>
        <div className="absolute -bottom-4 -right-4 w-full h-full bg-gray-400/30 rounded-3xl -z-10 blur-sm"></div>
      </div>
    </div>
  )
}

function PdfPreviewFallback({ isMobile }: { isMobile: boolean }) {
  return (
    <div className="relative w-full max-w-[460px]">
      <div className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white p-2 sm:p-3 rounded-xl mb-4 shadow-lg">
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            <div>
              <h3 className="font-bold text-sm sm:text-base">Folheto em Preparação</h3>
              <span className="bg-orange-600 text-white px-2 py-1 rounded-full text-xs font-bold">EM BREVE!</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        <div
          className="bg-gradient-to-b from-gray-200 to-gray-400 rounded-3xl p-3 sm:p-6 shadow-2xl border-2 border-gray-300 mx-auto"
          style={{
            width: "100%",
            maxWidth: "460px",
            height: isMobile ? "400px" : "600px",
          }}
        >
          <div className="bg-black rounded-2xl p-1 h-full w-full relative overflow-hidden">
            <div className="relative bg-white rounded-xl shadow-lg h-full w-full overflow-hidden flex items-center justify-center">
              <img
                src="/images/wait.png"
                alt="Aguarde o próximo folheto"
                className="w-full h-full object-contain p-4"
                loading="lazy"
                onError={(e) => {
                  const target = e.currentTarget
                  const parent = target.parentElement
                  if (parent) {
                    target.style.display = "none"
                    parent.innerHTML = `
                      <div class="text-center p-8">
                        <div class="text-6xl mb-4">⏰</div>
                        <h3 class="text-xl font-bold text-gray-800 mb-2">Em Breve</h3>
                        <p class="text-gray-600">Novo folheto chegando!</p>
                      </div>
                    `
                  }
                }}
              />
            </div>
          </div>
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-8 sm:w-12 h-1 bg-gray-600 rounded-full"></div>
        </div>
      </div>
    </div>
  )
}

// Utility function para debounce
function debounce(func: Function, wait: number) {
  let timeout: NodeJS.Timeout
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}
