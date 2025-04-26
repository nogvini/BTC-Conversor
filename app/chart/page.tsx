import { redirect } from 'next/navigation'
import { Suspense } from 'react'

function Redirector() {
  redirect('/?tab=chart')
  return null
}

export default function ChartPage() {
  return (
    <Suspense fallback={<div>Redirecionando...</div>}>
      <Redirector />
    </Suspense>
  )
} 