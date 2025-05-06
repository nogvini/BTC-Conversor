"use client";

import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Importando o AuthForm de forma dinâmica apenas no cliente
const AuthFormClient = () => {
  // Estado para verificar se estamos no navegador
  const [isClient, setIsClient] = useState(false);
  const [AuthForm, setAuthForm] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    // Importar o componente apenas no lado do cliente
    import("@/components/auth-form").then((mod) => {
      setAuthForm(() => mod.default);
      setIsClient(true);
    });
  }, []);

  // Renderizar um loading enquanto importa ou o componente real quando está pronto
  if (!isClient || !AuthForm) {
    return (
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
  }

  return <AuthForm />;
};

export default function AuthPage() {
  return (
    <main className="min-h-screen p-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <AuthFormClient />
      </div>
      <Toaster />
    </main>
  );
} 