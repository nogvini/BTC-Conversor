"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, AlertCircle, Info, RefreshCw } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

export default function DiagnosePage() {
  const [diagnostics, setDiagnostics] = useState<any>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isTestingAuth, setIsTestingAuth] = useState(false)
  const [authTestResult, setAuthTestResult] = useState<any>(null)
  
  // Hook de autenticação para testar
  const { session } = useAuth()

  useEffect(() => {
    const runDiagnostics = () => {
      const results = {
        // Verificar variáveis de ambiente
        environment: {
          supabaseUrl: {
            exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            value: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configurada' : 'Não encontrada',
            length: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0
          },
          supabaseKey: {
            exists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configurada' : 'Não encontrada',
            length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0
          }
        },
        
        // Verificar localStorage
        localStorage: {
          available: typeof window !== 'undefined' && typeof localStorage !== 'undefined',
          supabaseSession: typeof window !== 'undefined' ? !!localStorage.getItem('supabase_session') : false,
          converterData: typeof window !== 'undefined' ? !!localStorage.getItem('btcConverter_lastValidData') : false
        },
        
        // Verificar URLs atuais
        browser: {
          userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'N/A',
          currentUrl: typeof window !== 'undefined' ? window.location.href : 'N/A',
          origin: typeof window !== 'undefined' ? window.location.origin : 'N/A'
        },
        
        // Verificar network
        network: {
          online: typeof window !== 'undefined' ? navigator.onLine : null,
          cookiesEnabled: typeof window !== 'undefined' ? navigator.cookieEnabled : null
        },
        
        // Verificar middleware paths
        paths: {
          currentPath: typeof window !== 'undefined' ? window.location.pathname : 'N/A',
          isProtectedRoute: ['profile', 'settings', 'admin'].some(route => 
            typeof window !== 'undefined' && window.location.pathname.includes(route)
          )
        },
        
        // Verificar cookies de autenticação
        auth: {
          authCookies: typeof window !== 'undefined' ? document.cookie.includes('sb-') : false,
          cookieCount: typeof window !== 'undefined' ? document.cookie.split(';').length : 0,
          hasSupabaseTokens: typeof window !== 'undefined' ? localStorage.getItem('sb-access-token') !== null : false,
        },
      }
      
      setDiagnostics(results)
      setIsLoading(false)
      
      // Log para console
      console.log('[Diagnóstico Completo]', results)
    }

    runDiagnostics()
  }, [])

  const StatusIcon = ({ condition }: { condition: boolean | null }) => {
    if (condition === null) return <AlertCircle className="h-4 w-4 text-yellow-500" />
    return condition ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />
  }

  const StatusBadge = ({ condition, trueText = "OK", falseText = "Erro", nullText = "N/A" }: { 
    condition: boolean | null
    trueText?: string
    falseText?: string
    nullText?: string
  }) => {
    if (condition === null) return <Badge variant="secondary">{nullText}</Badge>
    return (
      <Badge variant={condition ? "default" : "destructive"}>
        {condition ? trueText : falseText}
      </Badge>
    )
  }

  // Função para testar autenticação
  const testAuthentication = async () => {
    setIsTestingAuth(true)
    try {
      const result = {
        sessionExists: !!session,
        userExists: !!session?.user,
        userEmail: session?.user?.email || null,
        isLoading: session?.isLoading || false,
        timestamp: new Date().toISOString()
      }
      setAuthTestResult(result)
      console.log('[Diagnóstico] Teste de autenticação:', result)
    } catch (error) {
      console.error('[Diagnóstico] Erro no teste de autenticação:', error)
      setAuthTestResult({ error: error instanceof Error ? error.message : 'Erro desconhecido' })
    } finally {
      setIsTestingAuth(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Executando diagnósticos...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Diagnóstico do Sistema
          </CardTitle>
          <CardDescription>
            Verificação completa de configurações e conectividade
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Variáveis de Ambiente */}
      <Card>
        <CardHeader>
          <CardTitle>Variáveis de Ambiente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon condition={diagnostics.environment?.supabaseUrl?.exists} />
              <span>NEXT_PUBLIC_SUPABASE_URL</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge condition={diagnostics.environment?.supabaseUrl?.exists} />
              <span className="text-sm text-muted-foreground">
                {diagnostics.environment?.supabaseUrl?.length} chars
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon condition={diagnostics.environment?.supabaseKey?.exists} />
              <span>NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge condition={diagnostics.environment?.supabaseKey?.exists} />
              <span className="text-sm text-muted-foreground">
                {diagnostics.environment?.supabaseKey?.length} chars
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Local Storage */}
      <Card>
        <CardHeader>
          <CardTitle>Armazenamento Local</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon condition={diagnostics.localStorage?.available} />
              <span>localStorage disponível</span>
            </div>
            <StatusBadge condition={diagnostics.localStorage?.available} />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon condition={diagnostics.localStorage?.supabaseSession} />
              <span>Sessão Supabase salva</span>
            </div>
            <StatusBadge condition={diagnostics.localStorage?.supabaseSession} trueText="Presente" falseText="Ausente" />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon condition={diagnostics.localStorage?.converterData} />
              <span>Dados do conversor</span>
            </div>
            <StatusBadge condition={diagnostics.localStorage?.converterData} trueText="Presente" falseText="Ausente" />
          </div>
        </CardContent>
      </Card>

      {/* Rede e Browser */}
      <Card>
        <CardHeader>
          <CardTitle>Rede e Navegador</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon condition={diagnostics.network?.online} />
              <span>Conexão online</span>
            </div>
            <StatusBadge condition={diagnostics.network?.online} />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon condition={diagnostics.network?.cookiesEnabled} />
              <span>Cookies habilitados</span>
            </div>
            <StatusBadge condition={diagnostics.network?.cookiesEnabled} />
          </div>
          
          <Separator />
          
          <div>
            <div className="text-sm font-medium mb-2">URL Atual</div>
            <div className="text-sm text-muted-foreground break-all">
              {diagnostics.browser?.currentUrl}
            </div>
          </div>
          
          <div>
            <div className="text-sm font-medium mb-2">Rota Protegida</div>
            <StatusBadge 
              condition={diagnostics.paths?.isProtectedRoute} 
              trueText="Sim" 
              falseText="Não" 
            />
          </div>
        </CardContent>
      </Card>

      {/* Autenticação */}
      <Card>
        <CardHeader>
          <CardTitle>Autenticação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon condition={diagnostics.auth?.authCookies} />
              <span>Cookies Supabase presentes</span>
            </div>
            <StatusBadge condition={diagnostics.auth?.authCookies} trueText="Presente" falseText="Ausente" />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon condition={diagnostics.auth?.hasSupabaseTokens} />
              <span>Tokens de acesso</span>
            </div>
            <StatusBadge condition={diagnostics.auth?.hasSupabaseTokens} trueText="Presente" falseText="Ausente" />
          </div>
          
          <div>
            <div className="text-sm font-medium mb-2">Total de Cookies</div>
            <div className="text-sm text-muted-foreground">
              {diagnostics.auth?.cookieCount || 0} cookies no navegador
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Teste de Autenticação</div>
              <Button 
                onClick={testAuthentication}
                disabled={isTestingAuth}
                size="sm"
                variant="outline"
              >
                {isTestingAuth ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Testar Agora
                  </>
                )}
              </Button>
            </div>
            
            {authTestResult && (
              <div className="p-3 bg-gray-900/50 rounded-md">
                <div className="text-xs font-mono">
                  <div><strong>Sessão:</strong> {authTestResult.sessionExists ? '✅ Presente' : '❌ Ausente'}</div>
                  <div><strong>Usuário:</strong> {authTestResult.userExists ? '✅ Presente' : '❌ Ausente'}</div>
                  {authTestResult.userEmail && (
                    <div><strong>Email:</strong> {authTestResult.userEmail}</div>
                  )}
                  <div><strong>Carregando:</strong> {authTestResult.isLoading ? 'Sim' : 'Não'}</div>
                  <div><strong>Timestamp:</strong> {authTestResult.timestamp}</div>
                  {authTestResult.error && (
                    <div className="text-red-400"><strong>Erro:</strong> {authTestResult.error}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Informações Técnicas */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Técnicas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div><strong>User Agent:</strong> {diagnostics.browser?.userAgent}</div>
            <div><strong>Origin:</strong> {diagnostics.browser?.origin}</div>
            <div><strong>Timestamp:</strong> {new Date().toISOString()}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 