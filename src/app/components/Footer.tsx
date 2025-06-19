"use client"

import { MapPin, Phone, Mail } from "lucide-react"

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

          {/* Loja 1 */}
          <div>
            <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-secondary-400">Loja 1</h4>
            <div className="space-y-2 sm:space-y-3 text-gray-300 text-sm sm:text-base">
              <div className="flex items-start space-x-2 sm:space-x-3">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-secondary-400 mt-1 flex-shrink-0" />
                <div>
                  <p>Avenida São Miguel de Bustelo, 2835</p>
                  <p>4560-042 Bustelo, Penafiel</p>
                  <p>Portugal</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-primary-400 flex-shrink-0" />
                <a href="tel:255720225">255720225</a>
                <span className="text-xs text-gray-500 ml-6">(Chamada para rede fixa nacional)</span>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-secondary-400 flex-shrink-0" />
                <a href="mailto:geral@coutyfil.pt">
                  geral@coutyfil.pt
                </a>  
              </div>
            </div>
          </div>

          {/* Loja 2 */}
          <div>
            <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-primary-400">Loja 2</h4>
            <div className="space-y-2 sm:space-y-3 text-gray-300 text-sm sm:text-base">
              <div className="flex items-start space-x-2 sm:space-x-3">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary-400 mt-1 flex-shrink-0" />
                <div>
                  <p>R. Abílio Miranda, Edf. Estádio, Loja Q/R</p>
                  <p>4560-501 - Penafiel</p>
                  <p>Portugal</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-secondary-400 flex-shrink-0" />
                <a href="tel:255213418">255213418</a>
                <span className="text-xs text-gray-500 ml-6">(Chamada para rede fixa nacional)</span>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-primary-400 flex-shrink-0" />
                <a href="mailto:papelaria@coutyfil.pt">
                  papelaria@coutyfil.pt
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 mt-8 sm:mt-12 pt-6 sm:pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-300 text-xs sm:text-sm">© 2025 Papelaria Coutyfil. Todos os direitos reservados.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
