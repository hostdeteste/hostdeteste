import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import BrowserCompatibility from "./components/BrowserCompatibility"
import Snowflakes from "./components/Snowflakes"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Coutyfil, Lda",
  keywords: "papelaria, material escolar, escritório, cadernos, canetas, papel",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Permissions Policy para resolver violações de fullscreen */}
        <meta
          httpEquiv="Permissions-Policy"
          content="fullscreen=*, display-capture=*, camera=*, microphone=*, geolocation=*"
        />
      </head>
      <body className={inter.className}>
        <BrowserCompatibility />
        {/*<Snowflakes />*/}
        {children}
      </body>
    </html>
  )
}
