import { redirect } from 'next/navigation'
import { Suspense } from 'react'

function Redirector() {
  redirect('/?tab=converter')
  return null
}

export default function ConverterPage() {
  return (
    <Suspense fallback={<div>Redirecionando...</div>}>
      <Redirector />
    </Suspense>
  )
} 