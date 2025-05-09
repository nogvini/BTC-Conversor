import { Suspense } from 'react'

export default function CalculatorPage() {
  return (
    <Suspense fallback={<div>Redirecionando...</div>}>
      <ClientRedirector />
    </Suspense>
  )
}

// Componente client-side para fazer o redirecionamento
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

function ClientRedirector() {
  const router = useRouter()
  
  useEffect(() => {
    router.push('/?tab=calculator')
  }, [router])
  
  return null
} 