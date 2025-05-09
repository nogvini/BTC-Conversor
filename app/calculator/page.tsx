// Adicionamos um comentário para o Next.js ignorar esta página durante a pré-renderização estática
export const dynamic = 'force-dynamic';

export default function CalculatorPage() {
  return <CalculatorClient />;
}

// Componente client-side separado
'use client'
import { Suspense, useEffect } from 'react'
import { useRouter } from 'next/navigation'

function CalculatorClient() {
  return (
    <Suspense fallback={<div>Redirecionando...</div>}>
      <ClientRedirector />
    </Suspense>
  )
}

function ClientRedirector() {
  const router = useRouter()
  
  useEffect(() => {
    router.push('/?tab=calculator')
  }, [router])
  
  return null
} 