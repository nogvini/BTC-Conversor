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
    const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('supabase_url') : null;
    const storedKey = typeof window !== 'undefined' ? localStorage.getItem('supabase_key') : null;
    
    // Se temos credenciais no ambiente, usar e armazenar
    if (supabaseUrl && supabaseKey) {
      console.log('Variáveis de ambiente do Supabase detectadas, inicializando cliente');
      
      // Armazenar no localStorage para uso futuro
      if (typeof window !== 'undefined') {
        localStorage.setItem('supabase_url', supabaseUrl);
        localStorage.setItem('supabase_key', supabaseKey);
      }
      
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
      }, 100); // Reduzido o delay, talvez 500ms seja muito
      
      return () => clearTimeout(timeoutId);
    }
  }, []);

  // Durante o SSR ou a fase inicial de hidratação, renderizamos um estado de carregamento mínimo
  // para evitar renderizar children fora do provider
  if (!isMounted) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm">
        <div className="bg-black/60 p-6 rounded-lg border border-purple-800/30 flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-4" />
          <p className="text-white text-sm">Montando aplicação...</p>
        </div>
      </div>
    );
  }
  
  // Exibir estado de carregamento enquanto as credenciais são inicializadas
  if (isLoadingCredentials) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm">
        <div className="bg-black/60 p-6 rounded-lg border border-purple-800/30 flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-4" />
          <p className="text-white text-sm">Inicializando autenticação...</p>
        </div>
        {/* Não renderizar children aqui */}
      </div>
    );
  }
  
  // Se as variáveis de ambiente não estiverem disponíveis, mostrar alerta de erro
  if (!authInitialized) {
    return (
      <>
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm">
           <div className="bg-red-900/90 text-white p-6 rounded-lg shadow-lg z-50 border border-red-600/50 max-w-md text-center">
             <h3 className="font-bold text-lg mb-2">Erro Crítico de Configuração</h3>
             <p className="text-sm mb-3">{initError || "Credenciais do Supabase não encontradas."}</p>
             <p className="text-xs mb-4">Verifique as variáveis de ambiente (<code className="bg-red-800/50 px-1 rounded">.env.local</code>) ou o <code className="bg-red-800/50 px-1 rounded">localStorage</code>.</p>
             <button
               className="mt-3 px-4 py-2 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors"
               onClick={() => window.location.reload()}
             >
               Tentar Novamente
             </button>
           </div>
        </div>
        {/* Não renderizar children aqui */}
      </>
    );
  }

  // Uma vez inicializado com sucesso, usar o AuthProvider e SÓ AGORA renderizar children
  return (
    <AuthProvider>
      {children}
      <ConnectionStatus />
    </AuthProvider>
  );
} 