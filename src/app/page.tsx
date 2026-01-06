"use client"

import { Suspense } from "react"
import Header from "./components/Header"
import Hero from "./components/Hero"
// import VouchersSection from "./components/VouchersSection"
// Comentar a importação de Products para ocultar a seção de Novidades
// import Products from "./components/Products"
import About from "./components/About"
import Contact from "./components/Contact"
import Footer from "./components/Footer"
import PauperioSection from "./components/PauperioSection"

// Componentes de loading
function HeroSkeleton() {
  return (
    <section className="min-h-screen bg-gradient-to-br from-red-100 via-pink-50 to-yellow-50 flex items-center">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div className="h-16 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded-lg animate-pulse w-3/4"></div>
            <div className="space-y-3">
              <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded animate-pulse w-5/6"></div>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="w-full max-w-[460px] h-[400px] md:h-[600px] bg-gray-200 rounded-2xl animate-pulse"></div>
          </div>
        </div>
      </div>
    </section>
  )
}

function VouchersSkeleton() {
  return (
    <section className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <div className="h-16 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded-lg animate-pulse w-3/4"></div>
            <div className="space-y-3">
              <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded animate-pulse w-5/6"></div>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="w-full max-w-[600px] h-[400px] bg-gray-200 rounded-2xl animate-pulse"></div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Page() {
  // Mostrar debug panel apenas em desenvolvimento
  const showDebug =
    process.env.NODE_ENV === "development" ||
    (typeof window !== "undefined" && window.location.search.includes("debug=true"))

  return (
    <main className="min-h-screen">
      {/* <Snowfall /> */}

      <Header />

      {/* Hero com Suspense para melhor UX */}
      <Suspense fallback={<HeroSkeleton />}>
        <Hero />
      </Suspense>

      {/*<PauperioSection */}

      {/* Nova seção de Vouchers */}
      {/* <Suspense fallback={<VouchersSkeleton />}>
        <VouchersSection />
      </Suspense> */}

      {/* Comentar a seção de Products/Novidades */}
      {/* <Products /> */}

      <About />
      <Contact />
      <Footer />
    </main>
  )
}
