import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import dynamic from "next/dynamic"

// Constantes para melhorar a legibilidade
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
  </div>
)

// Importação dinâmica do componente cliente (sem SSR)
const DiagnosePageClient = dynamic(
  () => import("@/components/diagnose-page-client").then(mod => mod.DiagnosePageClient),
  { ssr: false }
)

// Desabilitar otimizações estáticas
export const dynamic = "force-dynamic"

export default function DiagnosePage() {
  return (
    <main className="min-h-screen p-4 pt-24 md:pt-28 pb-8 md:pb-12">
      <Suspense fallback={<LoadingFallback />}>
        <NoSsr>
          <DiagnosePageClient />
        </NoSsr>
      </Suspense>
    </main>
  )
}

// Componente auxiliar para garantir que o código só execute no cliente
function NoSsr({ children }: { children: React.ReactNode }) {
  return (
    <div suppressHydrationWarning>
      {typeof window === 'undefined' ? null : children}
    </div>
  )
} 