"use client"

import { ChevronDown, MessageCircle, CheckCircle, Mail, Phone } from "lucide-react"

export default function VouchersSection() {
  const handleWhatsAppClick = () => {
    const phoneNumber = "351910146031"
    const message = encodeURIComponent(
      "Olá! Gostaria de enviar o meu voucher MEGA para reserva de manuais escolares 2025/2026. Obrigado!",
    )
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`
    window.open(whatsappUrl, "_blank")
  }

  return (
    <section
      id="vouchers"
      className="min-h-screen bg-gradient-to-br from-green-50 via-white to-red-50 flex items-center relative pt-16 sm:pt-20"
    >
      <div className="container mx-auto px-4 py-12 sm:py-16 md:py-20">
        <div className="grid lg:grid-cols-2 gap-10 sm:gap-16 lg:gap-20 items-center">
          {/* Imagem do Voucher */}
          <div className="relative order-2 lg:order-1">
            <div className="relative w-full max-w-[600px] mx-auto">
              {/* Container da imagem com efeito de tablet */}
              <div className="relative">
                <div className="bg-gradient-to-b from-gray-200 to-gray-400 rounded-3xl p-4 sm:p-6 shadow-2xl border-2 border-gray-300">
                  <div className="bg-black rounded-2xl p-1 relative overflow-hidden">
                    <div className="relative bg-white rounded-xl shadow-lg overflow-hidden">
                      <img
                        src="/images/voucher-manuais-escolares.png"
                        alt="Voucher Manuais Escolares 2025/2026"
                        className="w-full h-auto object-contain"
                      />

                      {/* Overlay com hover effect */}
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-all duration-300 flex items-center justify-center rounded-xl">
                        <div className="opacity-0 hover:opacity-100 transition-opacity duration-300 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg">
                          <div className="flex items-center space-x-2 text-gray-800 font-medium text-sm">
                            <MessageCircle className="h-4 w-4 text-green-600" />
                            <span>Clique no botão para enviar voucher</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gray-600 rounded-full"></div>
                </div>
                <div className="absolute -bottom-4 -right-4 w-full h-full bg-gray-400/30 rounded-3xl -z-10 blur-sm"></div>
              </div>

              {/* Badge promocional - cores ajustadas para verde */}
              <div className="absolute -top-4 -left-4 bg-gradient-to-r from-green-500 to-red-500 text-white p-4 rounded-xl shadow-xl transform hover:scale-110 transition-all duration-300">
                <p className="font-bold text-lg">Manuais 2025/2026!</p>
              </div>
            </div>
          </div>

          {/* Conteúdo de texto */}
          <div className="space-y-6 sm:space-y-8 lg:space-y-10 order-1 lg:order-2">
            <div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 mb-4 sm:mb-6 lg:mb-8 leading-tight">
                <span className="text-green-600">Manuais Escolares</span>
                <br />
                <span>2025/2026</span>
              </h2>
              <div className="w-24 sm:w-32 h-1.5 sm:h-2 bg-gradient-to-r from-green-500 to-red-500 mb-4 sm:mb-6 lg:mb-8 rounded-full"></div>

              <div className="text-lg sm:text-xl md:text-2xl text-gray-700 leading-relaxed mb-6 sm:mb-8">
                <p className="mb-4">
                  <span className="text-green-600 font-semibold">Vá descansado!</span>
                  Na correria dos preparativos para o regresso às aulas, nós simplificamos a sua vida.
                </p>
              </div>
            </div>

            {/* Lista de benefícios */}
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className="bg-green-100 p-2 rounded-full flex-shrink-0 mt-1">
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">
                    Reserve já e assegure todos os livros escolares
                  </h3>
                  <p className="text-gray-600 text-base sm:text-lg">
                    Do seu educando — <span className="font-semibold text-green-600">sem stress!</span>
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className="bg-red-100 p-2 rounded-full flex-shrink-0 mt-1">
                  <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Aceitamos vouchers MEGA</h3>
                  <p className="text-gray-600 text-base sm:text-lg">Fazemos a gestão completa dos manuais escolares</p>
                </div>
              </div>
            </div>

            {/* Botão de ação principal */}
            <div className="pt-4 sm:pt-6">
              <button
                onClick={handleWhatsAppClick}
                className="inline-flex items-center space-x-3 sm:space-x-4 bg-gradient-to-r from-green-600 to-red-600 hover:from-green-700 hover:to-red-700 text-white px-8 sm:px-10 py-4 sm:py-5 rounded-xl font-bold text-lg sm:text-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" />
                <span>Enviar Voucher</span>
              </button>
              <p className="text-sm sm:text-base text-gray-600 mt-3 sm:mt-4">
                Envie o seu voucher MEGA via WhatsApp e nós tratamos de tudo!
              </p>
            </div>

            {/* Informações de contato */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-gray-200">
              <h4 className="font-bold text-gray-800 mb-3 sm:mb-4 text-base sm:text-lg">
                📍 Visite-nos ou envie os seus vouchers por:
              </h4>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 flex-shrink-0" />
                  <a
                    href="mailto:papelaria@coutyfil.pt"
                    className="text-gray-700 hover:text-red-600 transition-colors text-sm sm:text-base"
                  >
                    papelaria@coutyfil.pt
                  </a>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                  <a
                    href="https://wa.me/351910146031"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-700 hover:text-green-600 transition-colors text-sm sm:text-base"
                  >
                    WhatsApp: 910146031
                  </a>
                </div>
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
