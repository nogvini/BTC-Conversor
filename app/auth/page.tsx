"use client";

import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Componente de carregamento para mostrar enquanto carrega o formulário real
const AuthFormLoading = () => (
  <Card className="w-full max-w-md mx-auto">
    <CardHeader className="space-y-2">
      <CardTitle className="text-2xl font-bold text-center">
        Acesso ao Raid Bitcoin
      </CardTitle>
      <CardDescription className="text-center">
        Carregando...
      </CardDescription>
    </CardHeader>
    <CardContent className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin" />
    </CardContent>
  </Card>
);

// Componente que importa o AuthForm apenas no lado do cliente
const AuthFormClient = () => {
  const [isBrowser, setIsBrowser] = useState(false);
  const [AuthForm, setAuthForm] = useState<React.ComponentType<any> | null>(null);

  // Verificar se estamos no navegador
  useEffect(() => {
    setIsBrowser(true);
  }, []);

  // Carregar o componente apenas no lado do cliente
  useEffect(() => {
    if (isBrowser) {
      import("@/components/auth-form").then((mod) => {
        setAuthForm(() => mod.default);
      }).catch(error => {
        console.error("Erro ao carregar o formulário de autenticação:", error);
      });
    }
  }, [isBrowser]);

  // Mostrar o estado de loading enquanto importa ou até que estejamos no navegador
  if (!isBrowser || !AuthForm) {
    return <AuthFormLoading />;
  }

  // Quando o componente estiver pronto e no navegador, renderizá-lo
  return <AuthForm />;
};

export default function AuthPage() {
  const [isMounted, setIsMounted] = useState(false);
  
  // Verificar se estamos no navegador
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Durante SSR, mostrar um placeholder simples
  if (!isMounted) {
    return (
      <main className="min-h-screen p-4 flex items-center justify-center">
        <div className="w-full max-w-md">
          <AuthFormLoading />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <AuthFormClient />
      </div>
      <Toaster />
    </main>
  );
} 