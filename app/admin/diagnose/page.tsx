import { Suspense } from "react"
import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

// Constantes para melhorar a legibilidade
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
  </div>
)

// Importação dinâmica com NoSSR
const DiagnosePageClient = dynamic(
  () => import("@/components/diagnose-page-client").then(mod => mod.DiagnosePageClient),
  { 
    ssr: false,
    loading: LoadingFallback
  }
)

// Desabilitar otimizações estáticas
export const dynamic = "force-dynamic"

export default function DiagnosePage() {
  return (
    <main className="min-h-screen p-4 pt-24 md:pt-28 pb-8 md:pb-12">
      <Suspense fallback={<LoadingFallback />}>
        <DiagnosePageClient />
      </Suspense>
    </main>
  )
} 