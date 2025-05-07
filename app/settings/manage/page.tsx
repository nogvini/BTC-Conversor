"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Página estática no Edge Runtime - zero código cliente durante o build
export const runtime = "edge";
export const dynamic = "force-dynamic";

export default function SettingsManagePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirecionamento com um pequeno delay
    const redirectTimeout = setTimeout(() => {
      router.push('/settings/client');
    }, 500);

    // Limpar o timeout se o componente desmontar
    return () => clearTimeout(redirectTimeout);
  }, [router]);

  return (
    <main className="min-h-screen p-4 pt-24 md:pt-28 pb-8 md:pb-12">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4">Configurações</h1>
        <div className="animate-pulse h-8 w-8 mx-auto rounded-full bg-primary/20"></div>
        
        <div id="settings-container" className="mt-8">
          <p className="text-muted-foreground">Carregando configurações...</p>
          
          <p className="text-sm text-muted-foreground mt-4">
            Se você não for redirecionado automaticamente, 
            <a href="/settings/client" className="underline font-medium ml-1">
              clique aqui
            </a>
          </p>
        </div>
      </div>
    </main>
  );
} 