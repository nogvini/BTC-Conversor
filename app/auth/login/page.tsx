"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

// Marcar a página como dinâmica para evitar caching
export const dynamic = "force-dynamic";

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
);

// Componente de autenticação carregado dinamicamente
const AuthForm = dynamic(() => import("@/components/auth-form"), {
  ssr: false,
  loading: AuthFormLoading,
});

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Durante a renderização do servidor, mostrar o loader estático
  if (!mounted) {
    return (
      <main className="min-h-screen p-4 flex items-center justify-center">
        <div className="w-full max-w-md">
          <AuthFormLoading />
        </div>
      </main>
    );
  }

  // No cliente, mostrar o formulário real
  return (
    <main className="min-h-screen p-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <AuthForm />
      </div>
    </main>
  );
} 