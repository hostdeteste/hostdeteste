"use client"

import { MessageCircle, Phone } from 'lucide-react'

export default function PauperioSection() {
  const whatsappNumber = "351910146031"
  const phoneNumber = "351255720225"

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=Olá! Gostaria de encomendar os Fidalguinhos com chocolate.`
  const phoneUrl = `tel:+${phoneNumber}`

  return (
    <section id="pauperio" className="bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-8 md:py-44">
      <div className="container mx-auto px-4">
        <div className="flex justify-center w-full">
          <div className="grid md:grid-cols-2 gap-16 md:gap-20 items-center w-full max-w-6xl">
            {/* Foto à Esquerda */}
            <div className="flex justify-start order-2 md:order-1">
              <div className="relative w-full max-w-[500px] pl-0 md:pr-8">
                <div className="aspect-portrait bg-gradient-to-br from-yellow-100 to-orange-100 rounded-3xl overflow-hidden shadow-2xl">
                  <img
                    src="/images/pauperio.jpg?height=900&width=675"
                    alt="Fidalguinhos - Biscoito com Chocolate"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Texto à Direita */}
            <div className="space-y-6 order-1 md:order-2">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight text-balance">
                Os Fidalguinhos estão mais irresistíveis do que nunca.
              </h1>

              <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                Um dos biscoitos mais icónicos da Fábrica Paupério acaba de ganhar uma nova e deliciosa versão. Os
                Fidalguinhos, finos, crocantes e cheios de curvas, foram agora cobertos com uma película de intenso
                chocolate, rico em cacau.
              </p>

              <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                O resultado é um encontro perfeito entre a tradição e a tentação, feito para saborear devagar… ou até ao
                último biscoito.
              </p>

              <p className="text-xl md:text-2xl font-semibold text-red-700">Reserve já o seu!</p>

              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <MessageCircle className="w-5 h-5" />
                  Encomende já
                </a>

                <a
                  href={phoneUrl}
                  className="inline-flex items-center justify-center gap-3 bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <Phone className="w-5 h-5" />
                  Encomende já
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
