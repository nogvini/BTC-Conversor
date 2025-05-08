"use client";

// Página estática que renderiza uma interface simples
// Marcada como edge runtime para evitar problemas com SSR e tornar dinâmica
export const runtime = "edge";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { AuthForm } from "@/components/auth-form";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const expired = searchParams.get("expired") === "true";
  
  // Usar useState para gerenciar o estado do usuário
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Limpar qualquer sessão expirada
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Verificar se há sessão expirada no localStorage
      try {
        const sessionStr = localStorage.getItem('supabase_session');
        if (sessionStr) {
          const savedSession = JSON.parse(sessionStr);
          if (savedSession && savedSession.expires_at) {
            const expiresAt = savedSession.expires_at * 1000; // Converter para milissegundos
            // Se expirou ou vai expirar em 5 minutos
            if (Date.now() > (expiresAt - 5 * 60 * 1000)) {
              localStorage.removeItem('supabase_session');
              console.log('Sessão expirada removida na página de login');
            }
          }
        }
      } catch (e) {
        // Se houver erro ao processar, melhor remover
        localStorage.removeItem('supabase_session');
      }
    }
  }, []);

  // Usando useAuth apenas no cliente, depois que a página for montada
  useEffect(() => {
    // Código de cliente seguro
    try {
      const { session } = useAuth();
      // Redirecionar se já estiver autenticado
      if (session.user && !session.isLoading) {
        setIsLoggedIn(true);
        router.push('/');
      }
    } catch (error) {
      console.error("Erro ao verificar autenticação:", error);
    }
  }, [router]);

  return (
    <div className="flex justify-center items-center min-h-[100vh] p-4">
      <Card className="w-full max-w-md bg-black/80 border-purple-900/60">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">
            {expired ? "Sessão Expirada" : "Login / Cadastro"}
          </CardTitle>
          {expired && (
            <p className="text-center text-sm text-amber-300">
              Sua sessão expirou. Por favor, faça login novamente.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <AuthForm />
        </CardContent>
        <CardFooter>
          <p className="text-xs text-center w-full text-zinc-500">
            Acesse sua conta ou crie uma nova para continuar.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
} 