"use client";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState, useEffect } from "react";

interface ConnectionStatusProps {
  onConnected?: () => void;
}

export function ConnectionStatus({ onConnected }: ConnectionStatusProps) {
  const { isConnecting, connectionRetries, retryConnection } = useAuth();
  const [showAlert, setShowAlert] = useState(false);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);

  // Mostrar alerta apenas se houver mais de 2 tentativas
  useEffect(() => {
    if (connectionRetries > 2) {
      setShowAlert(true);
      
      // Limpar timeout existente
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    } else if (connectionRetries === 0 && !isConnecting) {
      // Esconder após sucesso com um pequeno delay
      const timeout = setTimeout(() => {
        setShowAlert(false);
        if (onConnected) onConnected();
      }, 1500);
      
      setHideTimeout(timeout);
    }
    
    return () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  }, [connectionRetries, isConnecting, onConnected]);

  // Se não tiver nada para mostrar, retorna null
  if (!showAlert) {
    return null;
  }

  return (
    <Alert 
      variant={isConnecting ? "default" : "destructive"} 
      className="fixed bottom-4 right-4 w-auto max-w-md z-50 shadow-lg animate-in fade-in duration-300"
    >
      <div className="flex items-center gap-2">
        {isConnecting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <AlertCircle className="h-4 w-4" />
        )}
        <AlertTitle>
          {isConnecting ? "Conectando..." : "Falha na conexão"}
        </AlertTitle>
      </div>
      <AlertDescription className="mt-2">
        {isConnecting ? (
          <p>Tentando conectar ao servidor (tentativa {connectionRetries + 1})...</p>
        ) : (
          <>
            <p className="mb-2">Não foi possível conectar ao servidor após {connectionRetries} tentativas.</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => retryConnection()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              Tentar novamente
            </Button>
          </>
        )}
      </AlertDescription>
    </Alert>
  );
} 