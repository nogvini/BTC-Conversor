"use client";

import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Desativar otimizações estáticas para garantir que seja renderizado apenas no cliente
export const dynamic = "force-dynamic"

// Componente de carregamento
const AuthFormLoading = () => (
  <Card className="w-full max-w-md mx-auto">
    <CardHeader className="space-y-2">
      <CardTitle className="text-2xl font-bold text-center">
        Acesso ao Raid Toolkit
      </CardTitle>
      <CardDescription className="text-center">
        Carregando...
      </CardDescription>
    </CardHeader>
    <CardContent className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin" />
    </CardContent>
  </Card>
)

// Importação dinâmica do formulário de autenticação 
const AuthFormWrapper = dynamic(
  () => import("@/components/auth-form"),
  { 
    ssr: false,
    loading: AuthFormLoading 
  }
)

export default function AuthPage() {
  return (
    <main className="min-h-screen p-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <Suspense fallback={<AuthFormLoading />}>
          <NoSsr>
            <AuthFormWrapper />
          </NoSsr>
        </Suspense>
      </div>
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