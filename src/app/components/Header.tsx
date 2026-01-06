"use client"

import { useState, useEffect } from "react"
import { Menu, X } from "lucide-react"

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Detectar scroll para adicionar sombra ao header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <header
      className={`bg-white sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "shadow-lg border-b border-primary-100" : ""
      }`}
    >
      <div className="container mx-auto px-4 py-3 md:py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <a href="/#inicio" className="transition-transform duration-300 hover:scale-110">
              <img src="/images/logo.png" alt="Papelaria Coutyfil Logo" className="h-10 md:h-12 w-auto" />
            </a>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-4 lg:space-x-8">
            {/* <a
              href="/#vouchers"
              className="text-gray-700 hover:text-primary-600 transition-colors font-medium text-sm lg:text-base"
            >
              Manuais Escolares
            </a> */}
            {/* Link para Novidades removido temporariamente */}
            {/* <a
              href="/#novidades"
              className="text-gray-700 hover:text-primary-600 transition-colors font-medium text-sm lg:text-base"
            >
              Novidades
            </a> */}
            {/* Link para Produtos removido temporariamente */}
            {/* <a
              href="/produtos"
              className="text-gray-700 hover:text-primary-600 transition-colors font-medium text-sm lg:text-base"
            >
              Produtos
            </a> */}
            {/*<a
              href="/#pauperio"
              className="text-gray-700 hover:text-primary-600 transition-colors font-medium text-sm lg:text-base"
            >
              Paupério
            </a>
}*/}
            <a
              href="/#sobre"
              className="text-gray-700 hover:text-primary-600 transition-colors font-medium text-sm lg:text-base"
            >
              Sobre Nós
            </a>
            <a
              href="/#contato"
              className="text-gray-700 hover:text-primary-600 transition-colors font-medium text-sm lg:text-base"
            >
              Contato
            </a>
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex items-center">
            <button
              className="md:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
              onClick={toggleMenu}
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="h-6 w-6 text-gray-600" /> : <Menu className="h-6 w-6 text-gray-600" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden mt-3 pb-3 border-t border-primary-100 pt-3 animate-in slide-in-from-top duration-300">
            <div className="flex flex-col space-y-4">
              {/* <a
                href="/#vouchers"
                className="text-gray-700 hover:text-primary-600 transition-colors font-medium px-2 py-1.5 rounded-md hover:bg-gray-50"
                onClick={() => setIsMenuOpen(false)}
              >
                Manuais Escolares
              </a> */}
              {/* Link para Novidades removido temporariamente */}
              {/* <a
                href="/#novidades"
                className="text-gray-700 hover:text-primary-600 transition-colors font-medium px-2 py-1.5 rounded-md hover:bg-gray-50"
                onClick={() => setIsMenuOpen(false)}
              >
                Novidades
              </a> */}
              {/* Link para Produtos removido temporariamente */}
              {/* <a
                href="/produtos"
                className="text-gray-700 hover:text-primary-600 transition-colors font-medium px-2 py-1.5 rounded-md hover:bg-gray-50"
                onClick={() => setIsMenuOpen(false)}
              >
                Produtos
              </a> */}
              <a
                href="/#pauperio"
                className="text-gray-700 hover:text-primary-600 transition-colors font-medium px-2 py-1.5 rounded-md hover:bg-gray-50"
                onClick={() => setIsMenuOpen(false)}
              >
                Paupério
              </a>
              
              <a
                href="/#sobre"
                className="text-gray-700 hover:text-primary-600 transition-colors font-medium px-2 py-1.5 rounded-md hover:bg-gray-50"
                onClick={() => setIsMenuOpen(false)}
              >
                Sobre Nós
              </a>
              <a
                href="/#contato"
                className="text-gray-700 hover:text-primary-600 transition-colors font-medium px-2 py-1.5 rounded-md hover:bg-gray-50"
                onClick={() => setIsMenuOpen(false)}
              >
                Contato
              </a>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
