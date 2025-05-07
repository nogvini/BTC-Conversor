"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

// Componente de carregamento
const AuthFormLoading = () => (
  <div className="py-8 flex flex-col items-center">
    <Loader2 className="h-8 w-8 animate-spin" />
    <p className="mt-2 text-sm text-gray-500">Carregando formulário...</p>
  </div>
);

// Componente de autenticação carregado dinamicamente
const AuthForm = dynamic(() => import("@/components/auth-form"), {
  ssr: false,
  loading: AuthFormLoading,
});

export default function AuthFormPage() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);

    // Verificar se estamos sendo carregados em um iframe
    if (window.self === window.top) {
      // Se não estamos em um iframe, redirecionar para a página principal
      router.push('/auth');
    }
  }, [router]);

  if (!mounted) {
    return <AuthFormLoading />;
  }

  return <AuthForm />;
} 