"use client"

import { useState, useEffect } from "react"
import { Menu, ArrowRightLeft, TrendingUp, Calculator, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { useSearchParams, useRouter } from "next/navigation"

export interface MobileNavigationProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function MobileNavigation({ activeTab, onTabChange }: MobileNavigationProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Função para navegar para uma aba
  const navigateToTab = (tab: string) => {
    onTabChange(tab)
    setOpen(false)
    
    // Atualizar URL
    const newParams = new URLSearchParams(searchParams.toString())
    newParams.set('tab', tab)
    router.push(`?${newParams.toString()}`)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className="sm:hidden h-9 w-9 rounded-full bg-black/20 border border-purple-700/50 hover:bg-purple-900/20 hover:border-purple-600/80 transition-all duration-300 shadow-sm hover:shadow-purple-700/30"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="bg-black/95 border-r border-purple-700/50 p-0 backdrop-blur-sm">
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-purple-700/30 bg-gradient-to-r from-purple-900/30 to-transparent">
            <h2 className="text-xl font-bold text-white/90 flex items-center">
              <span className="text-purple-500 mr-2 animate-pulse">₿</span>
              Raid Bitcoin Toolkit
            </h2>
          </div>
          
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              <NavItem 
                icon={<ArrowRightLeft className="h-5 w-5" />}
                label="Conversor"
                active={activeTab === "converter"}
                onClick={() => navigateToTab("converter")}
              />
              <NavItem 
                icon={<TrendingUp className="h-5 w-5" />}
                label="Gráficos"
                active={activeTab === "chart"}
                onClick={() => navigateToTab("chart")}
              />
              <NavItem 
                icon={<Calculator className="h-5 w-5" />}
                label="Calculadora"
                active={activeTab === "calculator"}
                onClick={() => navigateToTab("calculator")}
              />
            </ul>
          </nav>
          
          <div className="p-4 mt-auto border-t border-purple-700/30 bg-gradient-to-r from-transparent to-purple-900/30">
            <p className="text-xs text-white/50 text-center">
              Raid BTC Toolkit v1.0
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

interface NavItemProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick: () => void
}

function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <li>
      <button
        className={cn(
          "flex items-center w-full p-3 rounded-lg transition-all duration-300",
          active 
            ? "bg-gradient-to-r from-purple-800/80 to-purple-900/50 text-white shadow-md shadow-purple-900/50 border border-purple-700/50" 
            : "text-white/70 hover:bg-purple-900/30 hover:text-white border border-transparent"
        )}
        onClick={onClick}
      >
        <span className={cn(
          "mr-3 transition-transform duration-300",
          active ? "text-purple-300 scale-110" : ""
        )}>{icon}</span>
        <span className="flex-1 text-left font-medium">{label}</span>
        {active && (
          <ChevronRight className="h-4 w-4 ml-2 text-purple-400 animate-pulse" />
        )}
      </button>
    </li>
  )
} 