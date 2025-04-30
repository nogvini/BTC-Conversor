"use client"

import { useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ArrowRightLeft, TrendingUp, Calculator, RefreshCw, Menu, X, Bitcoin } from "lucide-react"
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
  )

  // Renderiza o menu mobile
  const MobileNavigation = () => (
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
        <SheetContent side="left" className="w-4/5 bg-black/95 border-r border-purple-800/40 p-0 backdrop-blur-sm">
          <div className="flex flex-col h-full">
            <SheetHeader className="px-4 py-4 border-b border-purple-800/30 bg-gradient-to-r from-purple-900/30 to-transparent flex justify-between items-center">
              <SheetTitle className="text-xl font-bold text-white flex items-center">
                <Bitcoin className="h-5 w-5 mr-2 text-purple-500" />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-300">
                  Raid Bitcoin Toolkit
                </span>
              </SheetTitle>
              <SheetClose asChild>
                <Button variant="ghost" size="sm" className="p-1 hover:bg-purple-900/30 transition-colors duration-200">
                  <X className="h-5 w-5" />
                </Button>
              </SheetClose>
            </SheetHeader>
            
            <div className="flex flex-col p-4 space-y-3">
              <Button
                variant="ghost"
                size="lg"
                className={cn(
                  "justify-start rounded-md transition-all duration-300",
                  activeTab === "converter" 
                    ? "bg-gradient-to-r from-purple-800/80 to-purple-900/50 text-white shadow-md shadow-purple-900/50 border border-purple-700/50" 
                    : "hover:bg-purple-900/30 hover:text-white border border-transparent"
                )}
                onClick={() => handleNavigate("converter")}
              >
                <ArrowRightLeft className={cn(
                  "mr-3 h-5 w-5 transition-all duration-300",
                  activeTab === "converter" ? "text-purple-300 scale-110" : ""
                )} />
                <span className="font-medium">Conversor</span>
                {activeTab === "converter" && <div className="ml-auto">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></div>
                </div>}
              </Button>
              
              <Button
                variant="ghost"
                size="lg"
                className={cn(
                  "justify-start rounded-md transition-all duration-300",
                  activeTab === "chart" 
                    ? "bg-gradient-to-r from-purple-800/80 to-purple-900/50 text-white shadow-md shadow-purple-900/50 border border-purple-700/50" 
                    : "hover:bg-purple-900/30 hover:text-white border border-transparent"
                )}
                onClick={() => handleNavigate("chart")}
              >
                <TrendingUp className={cn(
                  "mr-3 h-5 w-5 transition-all duration-300",
                  activeTab === "chart" ? "text-purple-300 scale-110" : ""
                )} />
                <span className="font-medium">Gráficos</span>
                {activeTab === "chart" && <div className="ml-auto">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></div>
                </div>}
              </Button>
              
              <Button
                variant="ghost"
                size="lg"
                className={cn(
                  "justify-start rounded-md transition-all duration-300",
                  activeTab === "calculator" 
                    ? "bg-gradient-to-r from-purple-800/80 to-purple-900/50 text-white shadow-md shadow-purple-900/50 border border-purple-700/50" 
                    : "hover:bg-purple-900/30 hover:text-white border border-transparent"
                )}
                onClick={() => handleNavigate("calculator")}
              >
                <Calculator className={cn(
                  "mr-3 h-5 w-5 transition-all duration-300",
                  activeTab === "calculator" ? "text-purple-300 scale-110" : ""
                )} />
                <span className="font-medium">Calculadora</span>
                {activeTab === "calculator" && <div className="ml-auto">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></div>
                </div>}
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
                  className="w-full group flex items-center justify-center bg-black/30 border border-purple-700/50 hover:bg-purple-900/30 hover:border-purple-600/70 transition-all duration-300 hover:shadow-md hover:shadow-purple-900/30"
                >
                  {loading ? "Atualizando..." : "Atualizar Preços"}
                  <RefreshCw className={cn("ml-2 transition-transform duration-500", loading ? "animate-spin" : "group-hover:rotate-180")} />
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
        
        <h1 className={cn(
          "text-2xl md:text-3xl font-bold text-white/90", 
          isMobile ? "flex-1 text-center" : "bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-300"
        )}>
          <span className="inline-flex items-center">
            {!isMobile && <Bitcoin className="h-6 w-6 mr-2 text-purple-500" />}
            Raid Bitcoin Toolkit
          </span>
        </h1>
        
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
              className="group flex items-center bg-black/30 border border-purple-700/50 hover:bg-purple-900/30 hover:border-purple-600/70 transition-all duration-300 hover:shadow-md hover:shadow-purple-900/30"
            >
              {loading ? "Atualizando..." : "Atualizar"}
              <RefreshCw className={cn("ml-2 transition-transform duration-500", loading ? "animate-spin" : "group-hover:rotate-180")} />
            </Button>
          )}
          
          {/* Mobile Refresh Button - Movido para a direita enquanto menu está à esquerda */}
          {isMobile && onRefresh && (
            <Button 
              onClick={onRefresh} 
              variant="outline" 
              size="sm"
              disabled={loading}
              className="group flex items-center bg-black/30 border border-purple-700/50 hover:bg-purple-900/30 hover:border-purple-600/70 transition-all duration-300"
            >
              <RefreshCw className={cn("transition-transform duration-500", loading ? "animate-spin" : "group-hover:rotate-180")} />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
} 