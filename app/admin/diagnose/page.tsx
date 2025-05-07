import { Suspense } from "react"
import { Loader2 } from "lucide-react"

// Constantes para melhorar a legibilidade
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
  </div>
)

// Desabilitar otimizações estáticas
export const dynamic = "force-dynamic"

export default function DiagnosePage() {
  return (
    <main className="min-h-screen p-4 pt-24 md:pt-28 pb-8 md:pb-12">
      <Suspense fallback={<LoadingFallback />}>
        {/* Usando importação dinâmica no cliente com a sintaxe @ */}
        {/* @ts-expect-error Async Server Component */}
        <ClientComponent />
      </Suspense>
    </main>
  )
}

// Componente intermediário para carregamento dinâmico no cliente
function ClientComponent() {
  return (
    <div suppressHydrationWarning>
      {typeof window === 'undefined' ? null : <DiagnoseClientLoader />}
    </div>
  )
}

// Componente que será carregado apenas no cliente com importação dinâmica
import dynamic from "next/dynamic"
const DiagnoseClientLoader = dynamic(
  () => import("@/components/diagnose-page-client").then(mod => mod.DiagnosePageClient),
  { ssr: false }
) 