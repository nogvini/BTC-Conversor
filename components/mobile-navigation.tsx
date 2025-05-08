"use client"

import { useState, useEffect } from "react"
import { Menu, ArrowRightLeft, TrendingUp, Calculator, ChevronRight, UserCircle, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

export interface MobileNavigationProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function MobileNavigation({ activeTab, onTabChange }: MobileNavigationProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { session } = useAuth()
  const isAuthenticated = !!session.user

  // Função para navegar para uma aba
  const navigateToTab = (tab: string) => {
    onTabChange(tab)
    setOpen(false)
    
    // Atualizar URL
    const newParams = new URLSearchParams(searchParams.toString())
    newParams.set('tab', tab)
    router.push(`?${newParams.toString()}`)
  }

  // Função para navegar para uma página
  const navigateToPage = (path: string) => {
    setOpen(false)
    router.push(path)
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
          <div className="p-6 border-b border-purple-700/50 bg-gradient-to-r from-purple-900/40 to-transparent">
            <h2 className="text-2xl font-bold flex items-center gap-2 tracking-tight">
              <span className="text-purple-400 animate-pulse">₿</span>
              <div className="bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-300 drop-shadow-lg !important">
                Raid Bitcoin Toolkit
              </div>
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
              
              {isAuthenticated && (
                <>
                  <div className="pt-3 pb-2 mt-3 border-t border-purple-700/30">
                    <span className="text-xs text-purple-400/70 font-medium px-3">
                      SUA CONTA
                    </span>
                  </div>
                  
                  <NavItem 
                    icon={<UserCircle className="h-5 w-5" />}
                    label="Perfil"
                    active={false}
                    onClick={() => navigateToPage("/profile")}
                  />
                  <NavItem 
                    icon={<Settings className="h-5 w-5" />}
                    label="Configurações"
                    active={false}
                    onClick={() => navigateToPage("/settings")}
                  />
                </>
              )}
            </ul>
          </nav>
          
          <div className="p-4 mt-auto border-t border-purple-700/50 bg-gradient-to-r from-transparent to-purple-900/40">
            <p className="text-xs font-medium text-purple-300/70 text-center tracking-wider">
              Raid Bitcoin Toolkit v1.0
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