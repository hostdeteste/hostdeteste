"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getAuthToken } from "@/lib/auth"
import LoginForm from "./components/LoginForm"
import LogoutButton from "./components/LogoutButton"
import PdfUpload from "./components/PdfUpload"
import ImageUpload from "./components/ImageUpload"

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const token = await getAuthToken()
      setIsAuthenticated(!!token)
    }

    checkAuth()
  }, [])

  const handleLogin = () => {
    setIsAuthenticated(true)
    router.push("/admin")
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    router.push("/admin")
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Page</h1>

      {!isAuthenticated ? (
        <LoginForm onLogin={handleLogin} />
      ) : (
        <div>
          <LogoutButton onLogout={handleLogout} />
          <PdfUpload />
          <ImageUpload />
        </div>
      )}
    </div>
  )
}
