"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isTransition, setIsTransition] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Verificar se o erro está relacionado a uma transição/recarregamento
  useEffect(() => {
    // Analisar o erro para determinar se é uma transição
    const isDataRefreshError = error.message?.includes("fetch") || 
                              error.message?.includes("network") ||
                              error.message?.includes("atualizar") ||
                              error.message?.includes("carregar") ||
                              error.message?.includes("price");
    
    // Para depuração
    console.log("Tipo de erro:", error.name, "Mensagem:", error.message);
    
    setIsTransition(isDataRefreshError);
    setErrorMessage(error.message);
    
    // Se for uma transição, tentar recarregar automaticamente após 2 segundos
    if (isDataRefreshError) {
      const timer = setTimeout(() => {
        reset();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [error, reset]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 p-8 rounded-lg border border-purple-800/50 shadow-xl max-w-md mx-auto">
        {isTransition ? (
          <>
            <div className="flex items-center justify-center mb-4">
              <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
            </div>
            <h1 className="text-2xl font-medium text-white mb-4">Carregando dados</h1>
            <p className="text-gray-300 mb-6">
              Aguarde enquanto atualizamos as informações...
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-white mb-4">Algo deu errado</h1>
            <p className="text-gray-300 mb-6">
              Ocorreu um erro inesperado. Por favor, tente novamente.
            </p>
            {errorMessage && (
              <div className="bg-black/30 p-3 rounded text-xs mb-6 text-gray-400 overflow-auto max-h-24">
                {errorMessage}
              </div>
            )}
            <Button onClick={reset} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </>
        )}
      </div>
    </div>
  );
} 