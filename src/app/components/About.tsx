"use client"

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useEffect } from "react"

export default function About() {
  const [storeImages, setStoreImages] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  // Carregar imagens automaticamente da pasta
  useEffect(() => {
    async function loadImages() {
      try {
        setIsLoading(true)
        const response = await fetch("/api/images/lojas")
        const data = await response.json()

        if (data.success && data.images.length > 0) {
          setStoreImages(data.images)
        } else {
          // Fallback para imagem padrão se não houver imagens na pasta
          setStoreImages(["/images/loja.png?height=600&width=700"])
        }
      } catch (error) {
        console.error("Erro ao carregar imagens:", error)
        // Fallback para imagem padrão em caso de erro
        setStoreImages(["/images/loja.png?height=600&width=700"])
      } finally {
        setIsLoading(false)
      }
    }

    loadImages()
  }, [])

  // Auto-play do slideshow
  useEffect(() => {
    if (!isAutoPlaying || storeImages.length <= 1) return

    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex === storeImages.length - 1 ? 0 : prevIndex + 1))
    }, 4000) // Muda a cada 4 segundos

    return () => clearInterval(interval)
  }, [isAutoPlaying, storeImages.length])

  const goToPrevious = () => {
    setCurrentImageIndex(currentImageIndex === 0 ? storeImages.length - 1 : currentImageIndex - 1)
  }

  const goToNext = () => {
    setCurrentImageIndex(currentImageIndex === storeImages.length - 1 ? 0 : currentImageIndex + 1)
  }

  const goToSlide = (index: number) => {
    setCurrentImageIndex(index)
  }

  return (
    <section
      id="sobre"
      className="min-h-screen bg-gradient-to-br from-red-50 via-white to-green-50 flex items-center relative pt-16 sm:pt-20"
    >
      <div className="container mx-auto px-4 py-12 sm:py-16 md:py-20">
        <div className="grid lg:grid-cols-2 gap-10 sm:gap-16 lg:gap-20 items-center mb-12 sm:mb-16 md:mb-20">
          {/* Content */}
          <div className="space-y-6 sm:space-y-8 lg:space-y-10">
            <div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 mb-4 sm:mb-6 lg:mb-8">
                Quem Somos ?
              </h2>
              <div className="w-24 sm:w-32 h-1.5 sm:h-2 bg-gradient-to-r from-red-500 to-green-500 mb-4 sm:mb-6 lg:mb-8 rounded-full"></div>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 leading-relaxed mb-4 sm:mb-6 lg:mb-8">
                A Coutyfil é uma empresa familiar, sediada em Penafiel e dedicada à venda ao retalho desde 1964. Ao
                longo dos mais de 60 anos mantemos o nosso compromisso, o nosso profissionalismo e a nossa vontade em
                ser a melhor alternativa no comércio tradicional de forma a garantir a satisfação dos nossos clientes
                baseada numa relação de proximidade e confiança.
              </p>
              <p className="text-base sm:text-lg md:text-xl text-gray-600 leading-relaxed">
                Procuramos diariamente estabelecer as melhores parcerias com os mais diversos fornecedores para que de
                uma forma rápida e segura possamos ir ao encontro dos gostos e necessidades dos clientes. Cada cliente
                merece o nosso melhor e é com esse foco que continuamos presentes.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
              <div className="text-center bg-white p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-red-600 mb-2 sm:mb-3">60+</div>
                <div className="text-gray-600 font-semibold text-sm sm:text-base lg:text-lg">Anos de Experiência</div>
              </div>
              <div className="text-center bg-white p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-green-600 mb-2 sm:mb-3">1000+</div>
                <div className="text-gray-600 font-semibold text-sm sm:text-base lg:text-lg">Clientes Satisfeitos</div>
              </div>
            </div>
          </div>

          {/* Slideshow das Lojas */}
          <div className="relative mt-6 lg:mt-0">
            {/* Container do Slideshow */}
            <div
              className="relative w-full max-w-[700px] mx-auto"
              onMouseEnter={() => setIsAutoPlaying(false)}
              onMouseLeave={() => setIsAutoPlaying(true)}
            >
              {/* Imagem Principal */}
              <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-3xl border-4 border-white">
                <div className="relative h-[300px] sm:h-[400px] md:h-[500px]">
                  {isLoading ? (
                    // Skeleton loader enquanto carrega
                    <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                      <div className="text-gray-400">Carregando imagens...</div>
                    </div>
                  ) : (
                    // Imagens do slideshow
                    storeImages.map((image, index) => (
                      <img
                        key={index}
                        src={image || "/placeholder.svg"}
                        alt={`Nossa loja ${index + 1}`}
                        className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-in-out ${
                          index === currentImageIndex ? "opacity-100 scale-100" : "opacity-0 scale-105"
                        }`}
                        onError={(e) => {
                          // Fallback para imagem padrão se a imagem não carregar
                          e.currentTarget.src = "/images/loja.png?height=600&width=700"
                        }}
                      />
                    ))
                  )}

                  {/* Overlay com gradiente */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
                </div>

                {/* Controles de Navegação - Mostrar apenas se tiver mais de uma imagem e não estiver carregando */}
                {!isLoading && storeImages.length > 1 && (
                  <>
                    {/* Botão Anterior */}
                    <button
                      onClick={goToPrevious}
                      className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 sm:p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 backdrop-blur-sm"
                      aria-label="Imagem anterior"
                    >
                      <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>

                    {/* Botão Próximo */}
                    <button
                      onClick={goToNext}
                      className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 sm:p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 backdrop-blur-sm"
                      aria-label="Próxima imagem"
                    >
                      <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Indicadores (Dots) - Mostrar apenas se tiver mais de uma imagem e não estiver carregando */}
              {!isLoading && storeImages.length > 1 && (
                <div className="flex justify-center space-x-2 mt-4 sm:mt-6">
                  {storeImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToSlide(index)}
                      className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                        index === currentImageIndex ? "bg-red-600 scale-125" : "bg-gray-300 hover:bg-gray-400"
                      }`}
                      aria-label={`Ir para imagem ${index + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Contador de Imagens - Mostrar apenas se tiver mais de uma imagem e não estiver carregando */}
              {!isLoading && storeImages.length > 1 && (
                <div className="absolute top-2 sm:top-4 right-2 sm:right-4 bg-black/50 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm">
                  {currentImageIndex + 1} / {storeImages.length}
                </div>
              )}

              {/* Badge "Visite as nossas lojas!" */}
              <div className="absolute -bottom-4 sm:-bottom-6 lg:-bottom-8 -right-4 sm:-right-6 lg:-right-8 bg-gradient-to-r from-red-500 to-green-500 text-white p-3 sm:p-4 lg:p-6 rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl transform hover:scale-110 transition-all duration-300">
                <p className="font-bold text-base sm:text-lg lg:text-xl">Visite as nossas lojas!</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-6 sm:bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <ChevronDown className="h-6 w-6 sm:h-8 sm:w-8 text-gray-600" />
      </div>
    </section>
  )
}
