"use client"

import { Facebook, Instagram, MessageCircle, MapPin, Phone, Mail } from "lucide-react"

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-10 sm:py-16 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5">
        <div className="absolute top-10 right-10 w-24 sm:w-32 h-24 sm:h-32 bg-primary-500 rounded-full"></div>
        <div className="absolute bottom-10 left-10 w-16 sm:w-24 h-16 sm:h-24 bg-secondary-500 rounded-full"></div>
      </div>

      <div className="container mx-auto px-4 relative">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <img
                src="/images/logo.png"
                alt="Papelaria Logo"
                className="h-8 sm:h-10 w-auto filter brightness-0 invert"
              />
            </div>
            <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
              A sua loja de confiança há mais de 60 anos. Qualidade, variedade e atendimento excepcional.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-primary-400">Links Rápidos</h4>
            <ul className="space-y-1 sm:space-y-2">
              <li>
                <a
                  href="/#inicio"
                  className="text-gray-300 hover:text-white transition-colors hover:text-primary-400 text-sm sm:text-base"
                >
                  Início
                </a>
              </li>
              {/* <li>
                <a
                  href="/#vouchers"
                  className="text-gray-300 hover:text-white transition-colors hover:text-primary-400 text-sm sm:text-base"
                >
                  Manuais Escolares
                </a>
              </li> */}
              {/* Link para Novidades removido temporariamente */}
              {/* <li>
                <a
                  href="/#novidades"
                  className="text-gray-300 hover:text-white transition-colors hover:text-primary-400 text-sm sm:text-base"
                >
                  Novidades
                </a>
              </li> */}
              {/* Link para Produtos removido temporariamente */}
              {/* <li>
                <a
                  href="/produtos"
                  className="text-gray-300 hover:text-white transition-colors hover:text-primary-400 text-sm sm:text-base"
                >
                  Produtos
                </a>
              </li> */}
              <li>
                <a
                  href="/#sobre"
                  className="text-gray-300 hover:text-white transition-colors hover:text-primary-400 text-sm sm:text-base"
                >
                  Sobre Nós
                </a>
              </li>
              <li>
                <a
                  href="/#contato"
                  className="text-gray-300 hover:text-white transition-colors hover:text-primary-400 text-sm sm:text-base"
                >
                  Contato
                </a>
              </li>
            </ul>
          </div>

          {/* Redes Sociais */}
          <div>
            <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-secondary-400">Redes Sociais</h4>
            <div className="space-y-2 sm:space-y-3 text-gray-300 text-sm sm:text-base">
              <a
                href="https://www.facebook.com/coutyfil.lda/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 sm:space-x-3 hover:text-white transition-colors"
              >
                <Facebook className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0" />
                <span>Siga-nos no Facebook</span>
              </a>
              <a
                href="https://www.instagram.com/coutyfil_lda/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 sm:space-x-3 hover:text-white transition-colors"
              >
                <Instagram className="h-4 w-4 sm:h-5 sm:w-5 text-pink-500 flex-shrink-0" />
                <span>Siga-nos no Instagram</span>
              </a>
              <a
                href="https://api.whatsapp.com/send/?phone=351910146031&text&type=phone_number&app_absent=0"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 sm:space-x-3 hover:text-white transition-colors"
              >
                <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                <span>Fale connosco pelo WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Resolução Alternativa de Litígios */}
          <div>
            <h4 className="text-base sm:text-lg font-semibold mb-2 sm:mb-0 text-primary-400">Resolução Alternativa de Litígios</h4>
            <div className="space-y-2 text-gray-300 text-[8px]">
              <p className="leading-relaxed text-[8px]">
                Em caso de litígio o consumidor pode recorrer a uma entidade de Resolução Alternativa de Litígios de Consumo (RAL). As entidades de Resolução Alternativa de Litígios de Consumo (RAL) são as entidades autorizadas a efectuar a mediação, conciliação e arbitragem de litígios de consumo em Portugal que estejam inscritas na lista de entidades RAL prevista pela Lei n.º 144/2015.
              </p>
              <a
                href="https://www.ipai.pt/fotos/gca/i006245_1459446712.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs text-primary-400 hover:text-primary-300 underline transition-colors"
              >
                Clique aqui para mais informações
              </a>
              <div className="pt-2">
                <a
                  href="https://www.livroreclamacoes.pt/Inicio/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block"
                >
                  <img
                    src="/images/reclamacoes.png"
                    alt="Livro de Reclamações"
                    className="h-6 sm:h-12 filter brightness-0 invert"
                  />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 mt-8 sm:mt-4 pt-6 sm:pt-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-300 text-xs sm:text-sm">
              © 2025 Coutyfil-Supermercado. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
