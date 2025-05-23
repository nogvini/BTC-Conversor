"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { LogIn, Loader2, AlertTriangle, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface RequireAuthProps {
  children: React.ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const router = useRouter()
  const { session, retryConnection } = useAuth()
  const { user, isLoading, error } = session
  
  const [isBrowser, setIsBrowser] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  
  // Efeito para verificar se estamos no navegador
  useEffect(() => {
    setIsBrowser(true)
  }, [])
  
  // Verificar autenticação com timeout e retry
  useEffect(() => {
    if (!isBrowser) return;
    
    let authTimeout: NodeJS.Timeout | null = null;
    
    if (!isLoading && !authChecked) {
      setAuthChecked(true)
      
      if (!user && !error && retryCount < 3) {
        // Definir um timeout para evitar espera infinita
        authTimeout = setTimeout(() => {
          if (retryCount < 2) {
            setAuthError(`Tempo limite excedido (tentativa ${retryCount + 1}/3). Tentando novamente...`)
            setRetryCount(prev => prev + 1)
            setAuthChecked(false)
            retryConnection()
          } else {
            setAuthError("Não foi possível verificar a autenticação após várias tentativas.")
          }
        }, 8000) // 8 segundos de timeout
      }
    }
    
    return () => {
      if (authTimeout) clearTimeout(authTimeout)
    }
  }, [isLoading, user, error, authChecked, isBrowser, retryCount, retryConnection])

  // Função para tentar novamente
  const handleRetry = async () => {
    setIsRetrying(true)
    setAuthError(null)
    setAuthChecked(false)
    setRetryCount(0)
    
    try {
      await retryConnection()
    } catch (err) {
      console.error('Erro ao tentar reconectar:', err)
    } finally {
      setIsRetrying(false)
    }
  }

  // Redirecionar para login apenas se realmente não estiver autenticado
  useEffect(() => {
    if (!isBrowser) return;
    
    // Só redirecionar se tiver certeza que não está autenticado
    if (!isLoading && !user && authChecked && !error && retryCount >= 3) {
      console.log('Redirecionando para /auth - usuário não autenticado após verificações')
      router.push("/auth")
    }
  }, [isLoading, user, router, authChecked, isBrowser, error, retryCount])

  // Mostrar um fallback minimalista durante a renderização inicial no servidor
  if (!isBrowser) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="h-8 w-8 rounded-full bg-primary/20 animate-pulse" />
      </div>
    )
  }

  // Mostrar carregamento enquanto verifica a autenticação
  if (isLoading || !authChecked || retryCount > 0) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-center text-sm text-muted-foreground">
          {retryCount > 0 ? `Tentativa ${retryCount}/3 - Verificando autenticação...` : 'Verificando autenticação...'}
        </p>
        {authError && retryCount > 0 && (
          <p className="text-center text-xs text-yellow-500 mt-2">
            {authError}
          </p>
        )}
      </div>
    )
  }

  // Mostrar mensagem de erro de autenticação
  if (error || (authError && retryCount >= 3)) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Erro de Conexão
            </CardTitle>
            <CardDescription>
              Houve um problema ao conectar com o servidor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Não foi possível verificar seu login</AlertTitle>
              <AlertDescription className="text-sm">
                {error?.message || authError || "Erro de conexão com o servidor"}
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground mb-4">
              Verifique sua conexão com a internet e tente novamente. Se o problema persistir, 
              você pode acessar as funcionalidades básicas da aplicação.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button 
              onClick={handleRetry} 
              className="w-full"
              disabled={isRetrying}
            >
              {isRetrying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Tentando reconectar...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Tentar Novamente
                </>
              )}
            </Button>
            <Button 
              onClick={() => router.push("/auth")} 
              variant="outline" 
              className="w-full"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Ir para Login
            </Button>
            <Button 
              onClick={() => router.push("/")} 
              variant="ghost" 
              className="w-full text-xs"
            >
              Acessar funcionalidades básicas
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Mostrar mensagem de acesso negado se não estiver autenticado (apenas após todas as tentativas)
  if (!user && !isLoading && authChecked && retryCount >= 3) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Acesso Restrito</CardTitle>
            <CardDescription>
              Esta página requer autenticação para ser acessada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Você precisa estar logado para acessar esta página. 
              Faça login ou use as funcionalidades básicas da aplicação.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button onClick={() => router.push("/auth")} className="w-full">
              <LogIn className="mr-2 h-4 w-4" />
              Fazer Login
            </Button>
            <Button 
              onClick={() => router.push("/")} 
              variant="outline" 
              className="w-full"
            >
              Voltar ao Início
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Se estiver autenticado, mostrar o conteúdo
  return <>{children}</>
} 