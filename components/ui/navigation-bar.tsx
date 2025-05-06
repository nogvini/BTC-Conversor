"use client"

import { useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ArrowRightLeft, TrendingUp, Calculator, RefreshCw, Menu, X, Bitcoin, LogIn } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { ProfileMenu } from "@/components/profile-menu"
import { useAuth } from "@/hooks/use-auth"

interface NavigationBarProps {
  onRefresh?: () => void
  loading?: boolean
}

export function NavigationBar({ onRefresh, loading }: NavigationBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { session } = useAuth()
  const { user, isLoading: authLoading } = session
  
  // Determinar qual botão está ativo com base no pathname ou parâmetro de URL
  let activeTab = "converter"
  
  // Verificar parâmetros de URL primeiro
  const tabParam = searchParams.get('tab')
  if (tabParam) {
    if (tabParam === "chart") {
      activeTab = "chart"
    } else if (tabParam === "calculator") {
      activeTab = "calculator"
    } else if (tabParam === "converter") {
      activeTab = "converter"
    }
  } else {
    // Se não tiver parâmetros, verificar pelo pathname
    if (pathname.includes("/chart")) {
      activeTab = "chart"
    } else if (pathname.includes("/calculator")) {
      activeTab = "calculator"
    } else if (pathname.includes("/converter")) {
      activeTab = "converter"
    } else if (pathname.includes("/auth")) {
      activeTab = "auth"
    }
  }

  const handleNavigate = (tab: string) => {
    router.push(`/?tab=${tab}`)
    setIsMenuOpen(false)
  }

  const handleAuthClick = () => {
    router.push("/auth")
    setIsMenuOpen(false)
  }
  
  // Renderiza a navegação para desktop
  const DesktopNavigation = () => (
    <div className="flex justify-between items-center w-full">
      <div className="flex bg-black/40 border border-purple-800/40 rounded-md p-1 shadow-md backdrop-blur-sm">
        <Button
          variant="ghost"
          size="default"
          className={cn(
            "text-sm rounded-md transition-all duration-300",
            activeTab === "converter" 
              ? "bg-gradient-to-r from-purple-800/80 to-purple-700/50 text-white shadow-sm shadow-purple-700/30"
              : "hover:bg-purple-800/20 hover:text-white"
          )}
          onClick={() => router.push("/?tab=converter")}
        >
          <ArrowRightLeft className={cn(
            "mr-2 h-4 w-4 transition-transform duration-300",
            activeTab === "converter" ? "text-purple-300" : ""
          )} />
          <span>Conversor</span>
        </Button>
        
        <Button
          variant="ghost"
          size="default"
          className={cn(
            "text-sm rounded-md transition-all duration-300",
            activeTab === "chart" 
              ? "bg-gradient-to-r from-purple-800/80 to-purple-700/50 text-white shadow-sm shadow-purple-700/30"
              : "hover:bg-purple-800/20 hover:text-white"
          )}
          onClick={() => router.push("/?tab=chart")}
        >
          <TrendingUp className={cn(
            "mr-2 h-4 w-4 transition-transform duration-300",
            activeTab === "chart" ? "text-purple-300" : ""
          )} />
          <span>Gráficos</span>
        </Button>
        
        <Button
          variant="ghost"
          size="default"
          className={cn(
            "text-sm rounded-md transition-all duration-300",
            activeTab === "calculator" 
              ? "bg-gradient-to-r from-purple-800/80 to-purple-700/50 text-white shadow-sm shadow-purple-700/30"
              : "hover:bg-purple-800/20 hover:text-white"
          )}
          onClick={() => router.push("/?tab=calculator")}
        >
          <Calculator className={cn(
            "mr-2 h-4 w-4 transition-transform duration-300",
            activeTab === "calculator" ? "text-purple-300" : ""
          )} />
          <span>Calculadora</span>
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        {onRefresh && (
          <Button 
            onClick={onRefresh} 
            variant="outline" 
            size="sm"
            disabled={loading}
            className="group flex items-center justify-center bg-purple-900/30 border border-purple-700/50 hover:bg-purple-800/50 hover:border-purple-600/70 transition-all duration-300"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4 transition-transform duration-500", loading ? "animate-spin" : "group-hover:rotate-180")} />
            {loading ? "Atualizando..." : "Atualizar"}
          </Button>
        )}
        
        {!authLoading && !user ? (
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleAuthClick} 
            className="bg-purple-700 hover:bg-purple-600 text-white"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Entrar
          </Button>
        ) : (
          <ProfileMenu />
        )}
      </div>
    </div>
  )

  // Renderiza o menu mobile
  const MobileNavigation = () => (
    <div className="flex justify-between items-center w-full">
      <div className="flex items-center">
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2 hover:bg-purple-900/20 transition-colors duration-300"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent 
            side="left" 
            className="w-4/5 p-0 border-r border-purple-700/30 backdrop-blur-md bg-gradient-to-br from-purple-900/95 via-purple-950/95 to-black/95"
          >
            <div className="flex flex-col h-full relative">
              {/* Botão de fechar posicionado no canto superior esquerdo */}
              <SheetClose asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute left-3 top-3 p-1.5 rounded-full bg-purple-900/50 border border-purple-700/30 hover:bg-purple-800/70 transition-colors duration-200 z-10"
                  aria-label="Fechar menu"
                >
                  <X className="h-4 w-4 text-white" />
                </Button>
              </SheetClose>
              
              {/* Cabeçalho com logo centralizado */}
              <div className="pt-14 pb-6 flex justify-center items-center border-b border-purple-800/30 bg-gradient-to-r from-purple-900/70 to-purple-950/70">
                <div className="flex flex-col items-center">
                  <Bitcoin className="h-10 w-10 text-purple-400 mb-2" />
                  <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-300">
                    Raid Bitcoin Toolkit
                  </h2>
                </div>
              </div>
              
              {/* Itens do menu */}
              <div className="flex-1 px-4 py-6 space-y-4 overflow-y-auto">
                <div className="mb-2 text-xs uppercase text-purple-400/70 font-semibold tracking-wider pl-2">
                  MENU PRINCIPAL
                </div>
                
                <Button
                  variant="ghost"
                  size="lg"
                  className={cn(
                    "justify-start w-full rounded-lg transition-all duration-300",
                    activeTab === "converter" 
                      ? "bg-white/10 text-white border-l-4 border-l-purple-500 pl-3" 
                      : "hover:bg-white/5 hover:text-white border-l-4 border-l-transparent pl-3"
                  )}
                  onClick={() => handleNavigate("converter")}
                >
                  <ArrowRightLeft className={cn(
                    "mr-3 h-5 w-5 transition-all duration-300",
                    activeTab === "converter" ? "text-purple-400" : "text-white/70"
                  )} />
                  <span className="font-medium">Conversor</span>
                  {activeTab === "converter" && <div className="ml-auto">
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
                  </div>}
                </Button>
                
                <Button
                  variant="ghost"
                  size="lg"
                  className={cn(
                    "justify-start w-full rounded-lg transition-all duration-300",
                    activeTab === "chart" 
                      ? "bg-white/10 text-white border-l-4 border-l-purple-500 pl-3" 
                      : "hover:bg-white/5 hover:text-white border-l-4 border-l-transparent pl-3"
                  )}
                  onClick={() => handleNavigate("chart")}
                >
                  <TrendingUp className={cn(
                    "mr-3 h-5 w-5 transition-all duration-300",
                    activeTab === "chart" ? "text-purple-400" : "text-white/70"
                  )} />
                  <span className="font-medium">Gráficos</span>
                  {activeTab === "chart" && <div className="ml-auto">
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
                  </div>}
                </Button>
                
                <Button
                  variant="ghost"
                  size="lg"
                  className={cn(
                    "justify-start w-full rounded-lg transition-all duration-300",
                    activeTab === "calculator" 
                      ? "bg-white/10 text-white border-l-4 border-l-purple-500 pl-3" 
                      : "hover:bg-white/5 hover:text-white border-l-4 border-l-transparent pl-3"
                  )}
                  onClick={() => handleNavigate("calculator")}
                >
                  <Calculator className={cn(
                    "mr-3 h-5 w-5 transition-all duration-300",
                    activeTab === "calculator" ? "text-purple-400" : "text-white/70"
                  )} />
                  <span className="font-medium">Calculadora</span>
                  {activeTab === "calculator" && <div className="ml-auto">
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
                  </div>}
                </Button>

                {!authLoading && !user && (
                  <Button
                    variant="ghost"
                    size="lg"
                    className={cn(
                      "justify-start w-full rounded-lg transition-all duration-300",
                      activeTab === "auth" 
                        ? "bg-white/10 text-white border-l-4 border-l-purple-500 pl-3" 
                        : "hover:bg-white/5 hover:text-white border-l-4 border-l-transparent pl-3"
                    )}
                    onClick={handleAuthClick}
                  >
                    <LogIn className={cn(
                      "mr-3 h-5 w-5 transition-all duration-300",
                      activeTab === "auth" ? "text-purple-400" : "text-white/70"
                    )} />
                    <span className="font-medium">Entrar</span>
                    {activeTab === "auth" && <div className="ml-auto">
                      <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
                    </div>}
                  </Button>
                )}
              </div>

              {/* Botão de atualização no rodapé */}
              <div className="p-4 border-t border-purple-800/30 bg-gradient-to-r from-purple-950/70 to-black/70">
                {onRefresh && (
                  <Button 
                    onClick={() => {
                      onRefresh()
                      setIsMenuOpen(false)
                    }} 
                    variant="outline" 
                    size="default"
                    disabled={loading}
                    className="w-full group flex items-center justify-center bg-purple-900/30 border border-purple-700/50 hover:bg-purple-800/50 hover:border-purple-600/70 transition-all duration-300 hover:shadow-md hover:shadow-purple-900/30"
                  >
                    {loading ? "Atualizando..." : "Atualizar Preços"}
                    <RefreshCw className={cn("ml-2 transition-transform duration-500", loading ? "animate-spin" : "group-hover:rotate-180")} />
                  </Button>
                )}
                
                <div className="text-center mt-4 text-xs text-purple-400/70">
                  <p>© Raid Bitcoin Toolkit</p>
                  <p className="mt-1 text-purple-400/50">v1.0</p>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Adicionar o menu de perfil à versão mobile */}
      <div className="flex items-center">
        {!authLoading && user && <ProfileMenu />}
      </div>
    </div>
  )
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-3 bg-background/80 backdrop-blur-md border-b border-purple-900/30">
      <div className="max-w-screen-xl mx-auto">
        {isMobile ? <MobileNavigation /> : <DesktopNavigation />}
      </div>
    </div>
  )
} 