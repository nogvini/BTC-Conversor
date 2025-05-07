"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Check, AlertTriangle, X, Database, RefreshCw, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { PageTransition } from "@/components/page-transition"

export function DiagnosePageClient() {
  const { session } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [dbStatus, setDbStatus] = useState<{
    profiles: boolean;
    message: string;
    details?: string;
  } | null>(null)

  // Verificar se o usuário é administrador
  useEffect(() => {
    // Verificar se o usuário atual é um administrador
    // Na implementação real, você pode verificar um campo específico no perfil ou verificar um email específico
    if (session.user?.email === "admin@example.com") {
      setIsAdmin(true)
    }
  }, [session.user])

  const checkDatabaseStructure = async () => {
    setIsChecking(true)
    
    try {
      const res = await fetch('/api/init-db')
      const data = await res.json()
      
      if (data.success) {
        setDbStatus({
          profiles: true,
          message: data.message || "Banco de dados verificado com sucesso!",
        })
      } else {
        setDbStatus({
          profiles: false,
          message: "Erro ao verificar banco de dados",
          details: data.message,
        })
      }
    } catch (error) {
      console.error("Erro ao verificar banco de dados:", error)
      setDbStatus({
        profiles: false,
        message: "Erro ao verificar banco de dados",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      })
    } finally {
      setIsChecking(false)
    }
  }

  if (!isAdmin) {
    return (
      <PageTransition>
        <Card className="max-w-lg mx-auto mt-8">
          <CardHeader>
            <CardTitle className="text-xl">Acesso Restrito</CardTitle>
            <CardDescription>
              Esta página de diagnóstico é restrita a administradores.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="bg-yellow-900/20 border border-yellow-700/50 text-yellow-300">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle>Acesso Negado</AlertTitle>
              <AlertDescription>
                Você não tem permissão para acessar esta página.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <Card className="max-w-xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-xl">Diagnóstico do Sistema</CardTitle>
          <CardDescription>
            Verifique o status do banco de dados e outras dependências do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium flex items-center">
              <Database className="mr-2 h-5 w-5" />
              Status do Banco de Dados
            </h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkDatabaseStructure}
              disabled={isChecking}
            >
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Verificar
                </>
              )}
            </Button>
          </div>

          {dbStatus ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-md border bg-card">
                <div className="flex items-center">
                  <span className="font-medium">Tabela de Perfis</span>
                </div>
                {dbStatus.profiles ? (
                  <div className="bg-green-500/20 text-green-400 p-1 rounded-full">
                    <Check className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="bg-red-500/20 text-red-400 p-1 rounded-full">
                    <X className="h-5 w-5" />
                  </div>
                )}
              </div>
              
              <Alert className={dbStatus.profiles ? "bg-green-900/20 border border-green-700/50 text-green-300" : "bg-red-900/20 border border-red-700/50 text-red-300"}>
                {dbStatus.profiles ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
                <AlertTitle>
                  {dbStatus.profiles ? "Verificação Concluída" : "Problemas Encontrados"}
                </AlertTitle>
                <AlertDescription>
                  {dbStatus.message}
                  {dbStatus.details && (
                    <div className="mt-2 text-sm">
                      <p>Detalhes: {dbStatus.details}</p>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <Alert className="bg-blue-900/20 border border-blue-700/50 text-blue-300">
              <AlertDescription>
                Clique em "Verificar" para diagnosticar a estrutura do banco de dados.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </PageTransition>
  )
} 