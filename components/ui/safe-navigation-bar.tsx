"use client"

import { useState, useEffect } from "react"
import { NavigationBar } from "./navigation-bar"

interface SafeNavigationBarProps {
  onRefresh?: () => void
  loading?: boolean
}

export function SafeNavigationBar({ onRefresh, loading }: SafeNavigationBarProps) {
  const [isMounted, setIsMounted] = useState(false)

  // Garantir que o componente só renderiza após estar montado no cliente
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Não renderiza nada durante SSR ou antes da montagem
  if (!isMounted) {
    return (
      <div className="h-16 w-full flex items-center justify-center">
        <div className="animate-pulse h-4 w-24 bg-purple-500/20 rounded"></div>
      </div>
    )
  }

  // Renderiza o NavigationBar apenas no cliente, quando já temos acesso ao AuthProvider
  return <NavigationBar onRefresh={onRefresh} loading={loading} />
} 