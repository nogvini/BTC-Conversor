"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Página estática com redirecionamento para a versão cliente
export const runtime = "edge";
export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirecionamento com um pequeno delay
    const redirectTimeout = setTimeout(() => {
      router.push('/settings/manage');
    }, 300);

    // Limpar o timeout se o componente desmontar
    return () => clearTimeout(redirectTimeout);
  }, [router]);

  return (
    <main className="min-h-screen p-4 pt-24 md:pt-28 pb-8 md:pb-12">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4">Configurações</h1>
        <p className="mb-4">Carregando suas configurações...</p>
        
        <div className="mt-4 flex justify-center">
          <div className="animate-pulse h-8 w-8 rounded-full bg-primary/20"></div>
        </div>
        
        <p className="text-sm text-muted-foreground mt-4">
          Se você não for redirecionado automaticamente, 
          <a href="/settings/manage" className="underline font-medium ml-1">
            clique aqui
          </a>
        </p>
      </div>
    </main>
  );
} 