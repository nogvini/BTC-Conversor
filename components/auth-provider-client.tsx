"use client";

import React, { useEffect, useState } from "react";
import { AuthProvider } from "@/hooks/use-auth";
import { ConnectionStatus } from "./connection-status";

export function AuthProviderClient({ children }: { children: React.ReactNode }) {
  // Estado para verificar se estamos no navegador
  const [isMounted, setIsMounted] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Só renderizar o AuthProvider quando estamos no navegador
  useEffect(() => {
    setIsMounted(true);
    
    // Verificar se as variáveis de ambiente necessárias estão presentes
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      console.log('Variáveis de ambiente do Supabase detectadas:', {
        url: supabaseUrl.substring(0, 25) + '...',
        key: supabaseKey.substring(0, 10) + '...'
      });
      setAuthInitialized(true);
    } else {
      console.error('ERRO CRÍTICO: Variáveis de ambiente do Supabase não encontradas!');
      setAuthInitialized(false);
    }
  }, []);

  // Durante o SSR ou a fase inicial de hidratação, renderizamos apenas os filhos
  if (!isMounted) {
    return <>{children}</>;
  }
  
  // Se as variáveis de ambiente não estiverem disponíveis, mostrar alerta
  if (!authInitialized) {
    return (
      <>
        <div className="fixed bottom-4 right-4 bg-red-900/80 text-white p-4 rounded-lg shadow-lg z-50">
          <h3 className="font-bold text-lg">Erro de Configuração</h3>
          <p className="text-sm">Credenciais do Supabase não encontradas.</p>
          <p className="text-xs mt-2">Verifique as variáveis de ambiente no arquivo .env.local</p>
        </div>
        {children}
      </>
    );
  }

  // Uma vez no navegador, usamos o AuthProvider
  return (
    <AuthProvider>
      {children}
      <ConnectionStatus />
    </AuthProvider>
  );
} 