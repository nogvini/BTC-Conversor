"use client"

import { useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ArrowRightLeft, TrendingUp, Calculator, RefreshCw, Menu, X } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet"

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
    }
  }

  const handleNavigate = (tab: string) => {
    router.push(`/?tab=${tab}`)
    setIsMenuOpen(false)
  }
  
  // Renderiza a navegação para desktop
  const DesktopNavigation = () => (
    <div className="flex bg-black/30 border border-purple-800/40 rounded-md p-1">
      <Button
        variant="ghost"
        size="default"
        className={cn(
          "text-sm rounded-md transition-colors duration-200",
          activeTab === "converter" 
            ? "bg-purple-800/70 text-white"
            : "hover:bg-purple-800/20 hover:text-white"
        )}
        onClick={() => router.push("/?tab=converter")}
      >
        <ArrowRightLeft className="mr-2 h-4 w-4" />
        <span>Conversor</span>
      </Button>
      
      <Button
        variant="ghost"
        size="default"
        className={cn(
          "text-sm rounded-md transition-colors duration-200",
          activeTab === "chart" 
            ? "bg-purple-800/70 text-white"
            : "hover:bg-purple-800/20 hover:text-white"
        )}
        onClick={() => router.push("/?tab=chart")}
      >
        <TrendingUp className="mr-2 h-4 w-4" />
        <span>Gráficos</span>
      </Button>
      
      <Button
        variant="ghost"
        size="default"
        className={cn(
          "text-sm rounded-md transition-colors duration-200",
          activeTab === "calculator" 
            ? "bg-purple-800/70 text-white"
            : "hover:bg-purple-800/20 hover:text-white"
        )}
        onClick={() => router.push("/?tab=calculator")}
      >
        <Calculator className="mr-2 h-4 w-4" />
        <span>Calculadora</span>
      </Button>
    </div>
  )

  // Renderiza o menu mobile
  const MobileNavigation = () => (
    <div className="flex items-center">
      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="p-2">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-4/5 bg-zinc-900 border-r border-purple-800/40 p-0">
          <div className="flex flex-col h-full">
            <SheetHeader className="px-4 py-3 border-b border-purple-800/20 flex justify-between items-center">
              <SheetTitle className="text-xl font-bold text-white">Menu</SheetTitle>
              <SheetClose asChild>
                <Button variant="ghost" size="sm" className="p-1">
                  <X className="h-5 w-5" />
                </Button>
              </SheetClose>
            </SheetHeader>
            
            <div className="flex flex-col p-4 space-y-2">
              <Button
                variant="ghost"
                size="lg"
                className={cn(
                  "justify-start rounded-md transition-colors duration-200",
                  activeTab === "converter" 
                    ? "bg-purple-800/70 text-white"
                    : "hover:bg-purple-800/20 hover:text-white"
                )}
                onClick={() => handleNavigate("converter")}
              >
                <ArrowRightLeft className="mr-3 h-5 w-5" />
                <span>Conversor</span>
              </Button>
              
              <Button
                variant="ghost"
                size="lg"
                className={cn(
                  "justify-start rounded-md transition-colors duration-200",
                  activeTab === "chart" 
                    ? "bg-purple-800/70 text-white"
                    : "hover:bg-purple-800/20 hover:text-white"
                )}
                onClick={() => handleNavigate("chart")}
              >
                <TrendingUp className="mr-3 h-5 w-5" />
                <span>Gráficos</span>
              </Button>
              
              <Button
                variant="ghost"
                size="lg"
                className={cn(
                  "justify-start rounded-md transition-colors duration-200",
                  activeTab === "calculator" 
                    ? "bg-purple-800/70 text-white"
                    : "hover:bg-purple-800/20 hover:text-white"
                )}
                onClick={() => handleNavigate("calculator")}
              >
                <Calculator className="mr-3 h-5 w-5" />
                <span>Calculadora</span>
              </Button>
            </div>

            {onRefresh && (
              <div className="mt-auto p-4 border-t border-purple-800/20">
                <Button 
                  onClick={() => {
                    onRefresh()
                    setIsMenuOpen(false)
                  }} 
                  variant="outline" 
                  size="default"
                  disabled={loading}
                  className="w-full group flex items-center justify-center bg-black/20 border border-purple-700/50 hover:bg-purple-900/20 transition-colors duration-200"
                >
                  {loading ? "Atualizando..." : "Atualizar Preços"}
                  <RefreshCw className={cn("ml-2 transition-transform duration-300", loading ? "animate-spin" : "group-hover:rotate-90")} />
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
  
  return (
    <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
      <div className="flex w-full items-center justify-between">
        {/* Reorganização do layout mobile: Menu à esquerda, título no centro */}
        {isMobile && (
          <MobileNavigation />
        )}
        
        <h1 className={cn("text-2xl md:text-3xl font-bold text-white/90", isMobile && "flex-1 text-center")}>Raid Bitcoin Toolkit</h1>
        
        <div className="flex items-center gap-2">
          {/* Desktop Navigation */}
          <div className="hidden sm:flex">
            <DesktopNavigation />
          </div>
          
          {/* Desktop Refresh Button */}
          {onRefresh && !isMobile && (
            <Button 
              onClick={onRefresh} 
              variant="outline" 
              size="default"
              disabled={loading}
              className="group flex items-center bg-black/20 border border-purple-700/50 hover:bg-purple-900/20 transition-colors duration-200"
            >
              {loading ? "Atualizando..." : "Atualizar"}
              <RefreshCw className={cn("ml-2 transition-transform duration-300", loading ? "animate-spin" : "group-hover:rotate-90")} />
            </Button>
          )}
          
          {/* Mobile Refresh Button - Movido para a direita enquanto menu está à esquerda */}
          {isMobile && onRefresh && (
            <Button 
              onClick={onRefresh} 
              variant="outline" 
              size="sm"
              disabled={loading}
              className="group flex items-center bg-black/20 border border-purple-700/50 hover:bg-purple-900/20 transition-colors duration-200"
            >
              <RefreshCw className={cn("transition-transform duration-300", loading ? "animate-spin" : "group-hover:rotate-90")} />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
} 