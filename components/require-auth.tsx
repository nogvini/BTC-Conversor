"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { LogIn, Loader2, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface RequireAuthProps {
  children: React.ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  // Verificar se estamos no navegador
  const [isBrowser, setIsBrowser] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  
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
  const { session, retryConnection } = useAuth()
  const router = useRouter()
  const { user, isLoading, error } = session

  // Verificar autenticação com timeout
  useEffect(() => {
    let authTimeout: NodeJS.Timeout | null = null;
    
    if (!isLoading && !authChecked) {
      setAuthChecked(true)
      
      if (!user && !error) {
        // Definir um timeout para evitar espera infinita
        authTimeout = setTimeout(() => {
          setAuthError("Tempo limite excedido ao verificar autenticação. Tente novamente.")
        }, 5000) // 5 segundos
      }
    }
    
    return () => {
      if (authTimeout) clearTimeout(authTimeout)
    }
  }, [isLoading, user, error, authChecked])

  // Redirecionar para login se não estiver autenticado
  useEffect(() => {
    if (!isLoading && !user && authChecked) {
      router.push("/auth")
    }
  }, [isLoading, user, router, authChecked])

  // Mostrar carregamento enquanto verifica a autenticação
  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-center text-sm text-muted-foreground">
          Verificando autenticação...
        </p>
      </div>
    )
  }

  // Mostrar mensagem de erro de autenticação
  if (error || authError) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Erro de Autenticação
            </CardTitle>
            <CardDescription>
              Houve um problema ao verificar sua autenticação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Não foi possível verificar seu login</AlertTitle>
              <AlertDescription>
                {error?.message || authError || "Erro desconhecido de autenticação"}
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground mb-4">
              Tente novamente ou entre em contato com o suporte caso o problema persista.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button onClick={() => router.push("/auth")} className="w-full">
              <LogIn className="mr-2 h-4 w-4" />
              Voltar ao Login
            </Button>
            <Button 
              onClick={retryConnection} 
              variant="outline" 
              className="w-full"
            >
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Tentar Novamente
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Mostrar mensagem de acesso negado se não estiver autenticado
  if (!user && !isLoading) {
    console.error('Usuário não autenticado ou Supabase indisponível. Veja o contexto de sessão:', session)
    return (
      <div className="flex justify-center items-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Acesso Restrito</CardTitle>
            <CardDescription>
              Não foi possível conectar ao serviço de autenticação ou você não está logado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Você precisa estar autenticado para acessar esta página. 
              Por favor, faça login para continuar.
            </p>
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