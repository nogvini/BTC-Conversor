"use client"

import { useState, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

type Tab = 'converter' | 'chart' | 'calculator'

export function useActiveTab(): [Tab, (tab: Tab) => void] {
  const [activeTab, setActiveTab] = useState<Tab>('converter')
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // Verifica o pathname
    if (pathname.includes('/chart')) {
      setActiveTab('chart')
    } else if (pathname.includes('/calculator')) {
      setActiveTab('calculator')
    } else if (pathname.includes('/converter')) {
      setActiveTab('converter')
    } else {
      // Verifica os parâmetros de URL
      const tabParam = searchParams.get('tab')
      if (tabParam && ['converter', 'chart', 'calculator'].includes(tabParam)) {
        setActiveTab(tabParam as Tab)
      }
    }
  }, [pathname, searchParams])
  
  return [activeTab, setActiveTab]
} 