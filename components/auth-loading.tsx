"use client";

import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";

export function AuthLoading() {
  const { session } = useAuth();
  const { isLoading, error } = session;
  const [showMessage, setShowMessage] = useState(false);
  const [processingTime, setProcessingTime] = useState(0);
  
  // Mostrar mensagem apropriada após um pequeno delay para evitar flashes em carregamentos rápidos
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowMessage(true);
      }, 500);
      
      // Timer para contabilizar tempo de processamento
      const processingTimer = setInterval(() => {
        setProcessingTime(prev => prev + 1);
      }, 1000);
      
      return () => {
        clearTimeout(timer);
        clearInterval(processingTimer);
      };
    } else {
      setShowMessage(false);
      setProcessingTime(0);
    }
  }, [isLoading]);

  // Se não estiver carregando, não mostrar nada
  if (!isLoading) return null;
  
  // Se tiver erro, mostrar mensagem de erro
  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm">
        <div className="bg-red-950/80 p-6 rounded-lg border border-red-800/30 flex flex-col items-center max-w-md">
          <ShieldAlert className="h-10 w-10 text-red-400 mb-4" />
          <p className="text-white text-base font-medium mb-1">Erro de autenticação</p>
          <p className="text-white/80 text-sm text-center mb-4">{error.message || "Ocorreu um erro durante a autenticação. Tente novamente."}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-800/50 hover:bg-red-700/50 text-white rounded-md text-sm transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // Processos de autenticação que ultrapassam 5 segundos
  const isLongProcess = processingTime > 5;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/20 backdrop-blur-sm">
      <div className="bg-black/60 p-6 rounded-lg border border-purple-800/30 flex flex-col items-center max-w-md">
        {showMessage ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-4" />
            <p className="text-white text-sm font-medium">
              Autenticando...
            </p>
            <p className="text-white/50 text-xs mt-1 text-center">
              {isLongProcess 
                ? "Isso está demorando mais que o esperado. Estamos tentando conectar ao servidor..."
                : "Verificando credenciais, aguarde um momento"}
            </p>
            {isLongProcess && (
              <p className="mt-3 text-amber-400/70 text-xs">
                Tempo de processamento: {processingTime}s
              </p>
            )}
          </>
        ) : (
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        )}
      </div>
    </div>
  );
} 