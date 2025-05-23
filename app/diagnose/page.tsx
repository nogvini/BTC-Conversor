"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react";

export default function DiagnosePage() {
  const { session, retryConnection } = useAuth();
  const { user, isLoading, error } = session;
  const [envCheck, setEnvCheck] = useState<any>(null);
  const [manifestCheck, setManifestCheck] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    // Verificar variáveis de ambiente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    setEnvCheck({
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlValue: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'UNDEFINED',
      keyValue: supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'UNDEFINED',
    });

    // Verificar manifesto
    fetch('/site.webmanifest')
      .then(response => {
        if (response.ok) {
          setManifestCheck('success');
        } else {
          setManifestCheck('error');
        }
      })
      .catch(() => {
        setManifestCheck('error');
      });
  }, []);

  const StatusIcon = ({ status }: { status: 'success' | 'error' | 'warning' | 'loading' }) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <RefreshCw className="h-5 w-5 text-gray-500 animate-spin" />;
    }
  };

  return (
    <div className="min-h-screen p-4 pt-24">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">🔍 Diagnóstico do Sistema</h1>
          <p className="text-muted-foreground">
            Verificação completa do ambiente e conectividade
          </p>
        </div>

        {/* Verificação de Variáveis de Ambiente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StatusIcon status={envCheck?.hasUrl && envCheck?.hasKey ? 'success' : 'error'} />
              Variáveis de Ambiente
            </CardTitle>
            <CardDescription>
              Configurações necessárias para conectar com o Supabase
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">NEXT_PUBLIC_SUPABASE_URL</span>
                  <Badge variant={envCheck?.hasUrl ? 'default' : 'destructive'}>
                    {envCheck?.hasUrl ? 'OK' : 'MISSING'}
                  </Badge>
                </div>
                <code className="text-xs text-muted-foreground">
                  {envCheck?.urlValue || 'Carregando...'}
                </code>
              </div>
              
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
                  <Badge variant={envCheck?.hasKey ? 'default' : 'destructive'}>
                    {envCheck?.hasKey ? 'OK' : 'MISSING'}
                  </Badge>
                </div>
                <code className="text-xs text-muted-foreground">
                  {envCheck?.keyValue || 'Carregando...'}
                </code>
              </div>
            </div>

            {(!envCheck?.hasUrl || !envCheck?.hasKey) && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Configuração Incompleta</AlertTitle>
                <AlertDescription>
                  As variáveis de ambiente do Supabase não estão configuradas corretamente.
                  Isso causa os erros 401 que vocês estão vendo.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Estado de Autenticação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StatusIcon status={
                isLoading ? 'loading' : 
                user ? 'success' : 
                error ? 'error' : 'warning'
              } />
              Estado de Autenticação
            </CardTitle>
            <CardDescription>
              Status atual da sessão do usuário
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 border rounded-lg text-center">
                <div className="font-medium mb-1">Carregando</div>
                <Badge variant={isLoading ? 'secondary' : 'outline'}>
                  {isLoading ? 'SIM' : 'NÃO'}
                </Badge>
              </div>
              
              <div className="p-3 border rounded-lg text-center">
                <div className="font-medium mb-1">Usuário Logado</div>
                <Badge variant={user ? 'default' : 'secondary'}>
                  {user ? 'SIM' : 'NÃO'}
                </Badge>
              </div>
              
              <div className="p-3 border rounded-lg text-center">
                <div className="font-medium mb-1">Erro</div>
                <Badge variant={error ? 'destructive' : 'outline'}>
                  {error ? 'SIM' : 'NÃO'}
                </Badge>
              </div>
            </div>

            {user && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Dados do Usuário:</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li><strong>ID:</strong> {user.id}</li>
                  <li><strong>Nome:</strong> {user.name || 'Não definido'}</li>
                  <li><strong>Email:</strong> {user.email}</li>
                </ul>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Erro de Autenticação</AlertTitle>
                <AlertDescription>
                  {error.message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Verificação de Recursos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StatusIcon status={manifestCheck === 'success' ? 'success' : manifestCheck === 'error' ? 'error' : 'loading'} />
              Recursos Estáticos
            </CardTitle>
            <CardDescription>
              Verificação de acesso a arquivos estáticos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span>Manifesto (site.webmanifest)</span>
                <Badge variant={
                  manifestCheck === 'success' ? 'default' : 
                  manifestCheck === 'error' ? 'destructive' : 'secondary'
                }>
                  {manifestCheck === 'success' ? 'OK' : 
                   manifestCheck === 'error' ? 'ERRO 401' : 'VERIFICANDO'}
                </Badge>
              </div>

              {manifestCheck === 'error' && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Erro no Manifesto</AlertTitle>
                  <AlertDescription>
                    O arquivo site.webmanifest está retornando erro 401. 
                    Isso indica que o middleware está interceptando arquivos estáticos.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ações */}
        <Card>
          <CardHeader>
            <CardTitle>🛠️ Ações de Correção</CardTitle>
            <CardDescription>
              Comandos para resolver os problemas identificados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={retryConnection} 
              variant="outline" 
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar Reconectar Supabase
            </Button>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Para resolver os erros 401:</AlertTitle>
              <AlertDescription className="mt-2">
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Acesse o Dashboard do Vercel</li>
                  <li>Vá em Settings → Environment Variables</li>
                  <li>Adicione as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
                  <li>Faça redeploy do projeto</li>
                </ol>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 