"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { RefreshCw, LogIn, AlertCircle } from "lucide-react"
import { ProfileMenu } from "@/components/profile-menu"
import { MobileNavigation } from "@/components/mobile-navigation"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export function AppHeader() {
  const router = useRouter()
  const { session, retryConnection } = useAuth()
  const { user, isLoading: authLoading, error: authError } = session
  const { toast } = useToast()
  const [connectionAttempts, setConnectionAttempts] = useState(0)
  const [activeMobileTab, setActiveMobileTab] = useState("converter")

  // Efeito para tentar reconectar automaticamente em caso de erro
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    if (authError && connectionAttempts < 3) {
      const delay = 2000 * (connectionAttempts + 1); // Backoff exponencial simples
      console.log(`Tentativa automática de reconexão #${connectionAttempts + 1} em ${delay}ms`);
      timeoutId = setTimeout(() => {
        handleRetryConnection()
      }, delay)
    }
    // Função de cleanup para limpar o timeout se o componente desmontar ou as dependências mudarem
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [authError, connectionAttempts]) // Dependências corretas

  // Função para tentar reconectar manualmente ou automaticamente
  const handleRetryConnection = () => {
    setConnectionAttempts(prev => prev + 1) // Incrementar tentativas
    retryConnection() // Chamar a função de reconexão do hook useAuth
    
    // Mostrar toast apenas em tentativas manuais (ou talvez na primeira automática)
    if (connectionAttempts === 0) { // Ou alguma lógica para diferenciar manual/auto
      toast({
        title: "Reconectando...",
        description: "Tentando restabelecer a conexão com o servidor.",
        duration: 3000,
      })
    }
  }
  
  const handleAuthClick = () => {
    router.push("/auth")
  }

  const navLinkClasses = 
    "px-3 py-2 text-sm font-medium text-gray-300 hover:text-purple-300 hover:bg-purple-900/30 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black dark:focus:ring-offset-black rounded-md transition-colors duration-150 ease-in-out";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-purple-700/30 bg-gradient-to-b from-purple-950/90 to-black/90 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        {/* Botão de Menu Móvel e Nome da Aplicação */}
        <div className="flex items-center">
          {/* Mobile Navigation Trigger - Adicionado aqui, visível apenas em SM e abaixo */}
          <div className="md:hidden mr-2">
            <MobileNavigation 
              activeTab={activeMobileTab} 
              onTabChange={setActiveMobileTab} 
            />
          </div>
          <Link href="/" className="flex items-center">
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-purple-300 to-purple-400">
              RaidToolkit
            </h2>
          </Link>
        </div>

        {/* Navegação Central */}
        <nav className="hidden md:flex flex-grow justify-center space-x-4">
          <Link href="/" className={navLinkClasses}>
            Home
          </Link>
          <Link href="/about" className={navLinkClasses}>
            Sobre Nós
          </Link>
          <Link href="/partners" className={navLinkClasses}>
            Parceiros
          </Link>
        </nav>

        {/* Área de Autenticação/Perfil */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {authError ? (
            // Botão de erro/reconectar
            <Button 
              variant="destructive"
              size="sm"
              onClick={handleRetryConnection}
              className="bg-red-900/80 hover:bg-red-800/90 text-white border border-red-700/50 h-9 px-3"
              title={`Tentativas de reconexão: ${connectionAttempts}`}
            >
              <RefreshCw className="h-4 w-4 mr-1.5 animate-pulse" />
              <span className="text-xs">Erro</span>
            </Button>
          ) : authLoading ? (
            // Indicador de Carregamento
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-500/10">
              <RefreshCw className="h-5 w-5 animate-spin text-purple-400" />
            </div>
          ) : !user ? (
            // Botão Entrar
            <Button 
              variant="outline"
              size="sm" 
              onClick={handleAuthClick} 
              className="border-purple-600/70 hover:bg-purple-700/20 hover:border-purple-500/90 text-purple-300 hover:text-purple-100 h-9"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Entrar
            </Button>
          ) : (
            // Menu do Perfil
            <ProfileMenu />
          )}
        </div>
      </div>
    </header>
  )
} 