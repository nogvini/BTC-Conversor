"use client"

import { useState, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

type Tab = 'converter' | 'chart' | 'calculator'

export function useActiveTab(): [Tab, (tab: Tab) => void] {
  const [activeTab, setActiveTab] = useState<Tab>('converter')
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // Verificar parâmetros de URL primeiro
    const tabParam = searchParams.get('tab')
    if (tabParam) {
      if (tabParam === 'chart' || tabParam === 'calculator' || tabParam === 'converter') {
        setActiveTab(tabParam as Tab)
      }
    } else {
      // Se não tiver parâmetros, verificar pelo pathname
      if (pathname.includes('/chart')) {
        setActiveTab('chart')
      } else if (pathname.includes('/calculator')) {
        setActiveTab('calculator')
      } else if (pathname.includes('/converter')) {
        setActiveTab('converter')
      }
    }
  }, [pathname, searchParams])
  
  return [activeTab, setActiveTab]
} 