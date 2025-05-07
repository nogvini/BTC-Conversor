import { Suspense } from "react"
import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

// Importar o componente cliente de forma dinâmica para evitar a pré-renderização
const DiagnosePageClient = dynamic(
  () => import("@/components/diagnose-page-client").then(mod => ({ default: mod.DiagnosePageClient })),
  { 
    ssr: false, // Importante: desabilitar SSR
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
      </div>
    )
  }
)

// Marcar a página como dinâmica para evitar pré-renderização estática
export const dynamic = "force-dynamic"

export default function DiagnosePage() {
  return (
    <main className="p-4 pt-24 md:pt-28 pb-8 md:pb-12">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
        </div>
      }>
        <DiagnosePageClient />
      </Suspense>
    </main>
  )
} 