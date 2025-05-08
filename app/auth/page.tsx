"use client";

// Página estática que renderiza uma interface simples
// Marcada como edge runtime para evitar problemas com SSR
export const runtime = "edge";
export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuthPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirecionamento com um pequeno delay
    const redirectTimeout = setTimeout(() => {
      router.push('/auth/client');
    }, 500);

    // Limpar o timeout se o componente desmontar
    return () => clearTimeout(redirectTimeout);
  }, [router]);

  return (
    <main className="min-h-screen p-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-bold text-center">
              Acesso ao Raid Toolkit
            </CardTitle>
            <CardDescription className="text-center">
              Redirecionando para a página de login...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
            <div className="animate-pulse h-8 w-8 rounded-full bg-primary/20"></div>
            
            <p className="text-sm text-center text-muted-foreground mt-4">
              Se você não for redirecionado automaticamente, 
              <a href="/auth/client" className="underline font-medium ml-1">
                clique aqui
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
} 