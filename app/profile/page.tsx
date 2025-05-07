"use client"

import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import dynamic from "next/dynamic"
import { PageTransition } from "@/components/page-transition"

// Componente de carregamento
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
  </div>
)

// Importação dinâmica dos componentes client-side
const RequireAuth = dynamic(() => import("@/components/require-auth").then(mod => mod.RequireAuth), { ssr: false })
const UserProfileWrapper = dynamic(() => import("@/components/user-profile").then(mod => ({ default: mod })), { ssr: false })

// Marcar a página como dinâmica para evitar pré-renderização estática
export const dynamic = "force-dynamic"

export default function ProfilePage() {
  return (
    <main className="min-h-screen p-4 pt-24 md:pt-28 pb-8 md:pb-12">
      <Suspense fallback={<LoadingFallback />}>
        <NoSsr>
          <RequireAuth>
            <PageTransition>
              <UserProfileWrapper />
            </PageTransition>
          </RequireAuth>
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