"use client"

import dynamic from 'next/dynamic'

// Importa o AppHeader dinamicamente com SSR desabilitado
const AppHeader = dynamic(() => 
  import('@/components/ui/app-header').then((mod) => mod.AppHeader),
  {
    ssr: false, // Garante que só renderize no cliente
    // Placeholder para evitar layout shift
    loading: () => <div className="sticky top-0 z-50 w-full h-16 border-b border-purple-700/30 bg-background/90 backdrop-blur-lg dark:bg-black/80"></div>
  }
)

// O componente wrapper simplesmente renderiza o AppHeader carregado dinamicamente
export function ClientAppHeader() {
  return <AppHeader />
} 