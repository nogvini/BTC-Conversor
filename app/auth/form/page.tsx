"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

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

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <AuthFormLoading />;
  }

  return <AuthForm />;
} 