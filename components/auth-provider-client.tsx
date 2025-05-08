"use client";

import React, { useEffect, useState } from "react";
import { AuthProvider } from "@/hooks/use-auth";
import { ConnectionStatus } from "./connection-status";
import { Loader2 } from "lucide-react";

export function AuthProviderClient({ children }: { children: React.ReactNode }) {
  // Estados para controlar a inicialização
  const [isMounted, setIsMounted] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  
  // Função para inicializar as credenciais no localStorage
  const initializeCredentials = () => {
    // Verificar se as variáveis de ambiente necessárias estão presentes
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    // Verificar se já temos credenciais armazenadas
    const storedUrl = localStorage.getItem('supabase_url');
    const storedKey = localStorage.getItem('supabase_key');
    
    // Se temos credenciais no ambiente, usar e armazenar
    if (supabaseUrl && supabaseKey) {
      console.log('Variáveis de ambiente do Supabase detectadas, inicializando cliente');
      
      // Armazenar no localStorage para uso futuro
      localStorage.setItem('supabase_url', supabaseUrl);
      localStorage.setItem('supabase_key', supabaseKey);
      
      setAuthInitialized(true);
      setIsLoadingCredentials(false);
      return true;
    } 
    // Se temos credenciais armazenadas, usar
    else if (storedUrl && storedKey) {
      console.log('Usando credenciais armazenadas do Supabase');
      setAuthInitialized(true);
      setIsLoadingCredentials(false);
      return true;
    }
    // Caso contrário, mostrar erro
    else {
      console.error('ERRO CRÍTICO: Credenciais do Supabase não encontradas!');
      setInitError("Credenciais do Supabase não encontradas. A aplicação não funcionará corretamente.");
      setAuthInitialized(false);
      setIsLoadingCredentials(false);
      return false;
    }
  };

  // Só renderizar o AuthProvider quando estamos no navegador
  useEffect(() => {
    setIsMounted(true);
    
    // Apenas no navegador, tentar inicializar credenciais
    if (typeof window !== 'undefined') {
      const timeoutId = setTimeout(() => {
        const success = initializeCredentials();
        if (!success) {
          console.error('Falha ao inicializar credenciais após timeout');
        }
      }, 500); // Pequeno delay para garantir que o ambiente esteja pronto
      
      return () => clearTimeout(timeoutId);
    }
  }, []);

  // Durante o SSR ou a fase inicial de hidratação, renderizamos apenas os filhos
  if (!isMounted) {
    return <>{children}</>;
  }
  
  // Exibir estado de carregamento enquanto as credenciais são inicializadas
  if (isLoadingCredentials) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm">
        <div className="bg-black/60 p-6 rounded-lg border border-purple-800/30 flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-4" />
          <p className="text-white text-sm">Inicializando autenticação...</p>
        </div>
        {children}
      </div>
    );
  }
  
  // Se as variáveis de ambiente não estiverem disponíveis, mostrar alerta de erro
  if (!authInitialized) {
    return (
      <>
        <div className="fixed bottom-4 right-4 bg-red-900/80 text-white p-4 rounded-lg shadow-lg z-50 animate-in fade-in-50 duration-300">
          <h3 className="font-bold text-lg">Erro de Configuração</h3>
          <p className="text-sm">{initError || "Credenciais do Supabase não encontradas."}</p>
          <p className="text-xs mt-2">Verifique as variáveis de ambiente no arquivo .env.local</p>
          <button 
            className="mt-3 px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors"
            onClick={() => window.location.reload()}
          >
            Tentar novamente
          </button>
        </div>
        {children}
      </>
    );
  }

  // Uma vez inicializado com sucesso, usar o AuthProvider
  return (
    <AuthProvider>
      {children}
      <ConnectionStatus />
    </AuthProvider>
  );
} 