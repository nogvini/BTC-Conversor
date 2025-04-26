"use client"

import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ArrowRightLeft, TrendingUp, Calculator, RefreshCw } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

interface NavigationBarProps {
  onRefresh?: () => void
  loading?: boolean
}

export function NavigationBar({ onRefresh, loading }: NavigationBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const isMobile = useIsMobile()
  
  // Determinar qual botão está ativo com base no pathname ou parâmetro de URL
  let activeTab = "converter"
  
  if (pathname.includes("chart") || pathname.includes("?tab=chart")) {
    activeTab = "chart"
  } else if (pathname.includes("calculator") || pathname.includes("?tab=calculator")) {
    activeTab = "calculator"
  }
  
  return (
    <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
      <h1 className="text-2xl md:text-3xl font-bold text-white/90">Bitcoin Calculator</h1>
      
      <div className="flex w-full sm:w-auto justify-between sm:justify-end items-center gap-2">
        <div className="flex bg-black/30 border border-purple-800/40 rounded-md p-1">
          <Button
            variant="ghost"
            size={isMobile ? "sm" : "default"}
            className={cn(
              "text-xs sm:text-sm rounded-md",
              activeTab === "converter" 
                ? "bg-purple-800/70 text-white"
                : "hover:bg-purple-800/20 hover:text-white"
            )}
            onClick={() => router.push("/?tab=converter")}
          >
            <ArrowRightLeft className="mr-0 sm:mr-2 h-4 w-4" />
            <span className="sm:inline hidden">Conversor</span>
            <span className="sm:hidden inline">C</span>
          </Button>
          
          <Button
            variant="ghost"
            size={isMobile ? "sm" : "default"}
            className={cn(
              "text-xs sm:text-sm rounded-md",
              activeTab === "chart" 
                ? "bg-purple-800/70 text-white"
                : "hover:bg-purple-800/20 hover:text-white"
            )}
            onClick={() => router.push("/?tab=chart")}
          >
            <TrendingUp className="mr-0 sm:mr-2 h-4 w-4" />
            <span className="sm:inline hidden">Gráficos</span>
            <span className="sm:hidden inline">G</span>
          </Button>
          
          <Button
            variant="ghost"
            size={isMobile ? "sm" : "default"}
            className={cn(
              "text-xs sm:text-sm rounded-md",
              activeTab === "calculator" 
                ? "bg-purple-800/70 text-white"
                : "hover:bg-purple-800/20 hover:text-white"
            )}
            onClick={() => router.push("/?tab=calculator")}
          >
            <Calculator className="mr-0 sm:mr-2 h-4 w-4" />
            <span className="sm:inline hidden">Calculadora</span>
            <span className="sm:hidden inline">$</span>
          </Button>
        </div>
        
        {onRefresh && (
          <Button 
            onClick={onRefresh} 
            variant="outline" 
            size={isMobile ? "sm" : "default"}
            disabled={loading}
            className="flex items-center bg-black/20 border border-purple-700/50 hover:bg-purple-900/20"
          >
            {loading ? "Atualizando..." : "Atualizar"}
            <RefreshCw className={cn("ml-2", loading && "animate-spin")} />
          </Button>
        )}
      </div>
    </div>
  )
} 