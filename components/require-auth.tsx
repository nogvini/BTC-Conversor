"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { LogIn, Loader2 } from "lucide-react"

interface RequireAuthProps {
  children: React.ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  // Verificar se estamos no navegador
  const [isBrowser, setIsBrowser] = useState(false)
  
  useEffect(() => {
    setIsBrowser(true)
  }, [])
  
  // Se não estivermos no navegador, mostrar um fallback minimalista
  if (!isBrowser) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="h-8 w-8 rounded-full bg-primary/20" />
      </div>
    )
  }

  // Agora podemos acessar o hook de autenticação com segurança
  const { session } = useAuth()
  const router = useRouter()
  const { user, isLoading } = session

  // Redirecionar para login se não estiver autenticado
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth")
    }
  }, [isLoading, user, router])

  // Mostrar carregamento enquanto verifica a autenticação
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Mostrar mensagem de acesso negado se não estiver autenticado
  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Acesso Restrito</CardTitle>
            <CardDescription>
              Você precisa estar logado para acessar essa página.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Esta área é restrita para usuários autenticados. Por favor, faça login para continuar.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push("/auth")} className="w-full">
              <LogIn className="mr-2 h-4 w-4" />
              Fazer Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Se estiver autenticado, mostrar o conteúdo
  return <>{children}</>
} 