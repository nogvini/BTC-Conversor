"use client";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState, useEffect } from "react";

interface ConnectionStatusProps {
  onConnected?: () => void;
}

export function ConnectionStatus({ onConnected }: ConnectionStatusProps = {}) {
  const { session, retryConnection, isConnecting, connectionRetries } = useAuth();
  const [showAlert, setShowAlert] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  
  // Verificar se há erros de conexão e mostrar alerta após um delay
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    // Se houver erro na sessão, mostrar alerta após 2 segundos
    if (session.error) {
      setLastError(session.error.message);
      timeoutId = setTimeout(() => {
        setShowAlert(true);
      }, 2000);
    } else if (isConnecting && connectionRetries > 2) {
      // Se estiver tentando conectar por muito tempo
      timeoutId = setTimeout(() => {
        setShowAlert(true);
      }, 5000);
    } else {
      // Se a conexão estiver ok, esconder o alerta e chamar callback
      setShowAlert(false);
      if (session.user && onConnected) {
        onConnected();
      }
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [session, isConnecting, connectionRetries, onConnected]);
  
  // Se não houver erro, não mostrar nada
  if (!showAlert) {
    return null;
  }
  
  // Tentar novamente a conexão
  const handleRetry = () => {
    setShowAlert(false);
    retryConnection();
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in fade-in-50 duration-300">
      <Alert variant="destructive" className="border-red-700 bg-red-900/60 text-white backdrop-blur-sm">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle className="text-white font-semibold">
          Problema de conexão
        </AlertTitle>
        <AlertDescription className="text-white/90 text-sm mt-1">
          <p className="mb-2">
            {lastError || "Não foi possível conectar ao serviço de autenticação."}
          </p>
          <div className="flex items-center justify-end gap-2 mt-2">
            {isConnecting ? (
              <Button size="sm" variant="outline" disabled className="h-8 bg-white/10 border-white/30 text-white">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Conectando...
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={handleRetry} className="h-8 bg-white/10 border-white/30 text-white hover:bg-white/20">
                <RefreshCw className="h-3 w-3 mr-1" />
                Tentar novamente
              </Button>
            )}
            <small className="text-xs opacity-70">
              Tentativa {connectionRetries}/10
            </small>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
} 