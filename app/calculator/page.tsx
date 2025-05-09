import { redirect } from 'next/navigation'
import { Suspense } from 'react'

function Redirector() {
  redirect('/?tab=calculator')
  return null
}

export default function CalculatorPage() {
  return (
    <Suspense fallback={<div>Redirecionando...</div>}>
      <Redirector />
    </Suspense>
  )
} 