"use client";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, RefreshCw, LogIn } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isSessionExpired } from "@/lib/supabase";

interface ConnectionStatusProps {
  onConnected?: () => void;
}

export function ConnectionStatus({ onConnected }: ConnectionStatusProps = {}) {
  const { session, retryConnection, isConnecting, connectionRetries } = useAuth();
  const [showAlert, setShowAlert] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'connection' | 'session'>('connection');
  const router = useRouter();
  
  // Verificar o tipo de erro e mostrar alerta apropriado
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    // Verificar se sessão expirou
    const sessionExpired = isSessionExpired();
    
    // Se a sessão estiver expirada, mostrar erro de sessão
    if (sessionExpired) {
      setErrorType('session');
      setLastError("Sua sessão expirou. Por favor, faça login novamente.");
      timeoutId = setTimeout(() => {
        setShowAlert(true);
      }, 1000);
    }
    // Se houver erro na sessão, mostrar alerta após 2 segundos
    else if (session.error) {
      // Verificar o tipo de erro
      if (session.error.message.includes('expired') || 
          session.error.message.includes('expirada') ||
          session.error.message.includes('token')) {
        setErrorType('session');
        setLastError("Sua sessão expirou. Por favor, faça login novamente.");
      } else {
        setErrorType('connection');
        setLastError(session.error.message);
      }
      
      timeoutId = setTimeout(() => {
        setShowAlert(true);
      }, 2000);
    } else if (isConnecting && connectionRetries > 2) {
      // Se estiver tentando conectar por muito tempo
      setErrorType('connection');
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
    if (errorType === 'connection') {
      retryConnection();
    } else {
      // Se for erro de sessão, limpar localStorage e redirecionar para login
      localStorage.removeItem('supabase_session');
      router.push('/auth?expired=true');
    }
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in fade-in-50 duration-300">
      <Alert 
        variant="destructive" 
        className={errorType === 'connection' 
          ? "border-red-700 bg-red-900/60 text-white backdrop-blur-sm" 
          : "border-amber-700 bg-amber-900/60 text-white backdrop-blur-sm"}
      >
        <AlertCircle className="h-5 w-5" />
        <AlertTitle className="text-white font-semibold">
          {errorType === 'connection' ? 'Problema de conexão' : 'Sessão expirada'}
        </AlertTitle>
        <AlertDescription className="text-white/90 text-sm mt-1">
          <p className="mb-2">
            {lastError || 
              (errorType === 'connection' 
                ? "Não foi possível conectar ao serviço de autenticação." 
                : "Sua sessão expirou. Por favor, faça login novamente.")}
          </p>
          <div className="flex items-center justify-end gap-2 mt-2">
            {isConnecting && errorType === 'connection' ? (
              <Button size="sm" variant="outline" disabled className="h-8 bg-white/10 border-white/30 text-white">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Conectando...
              </Button>
            ) : (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleRetry} 
                className="h-8 bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                {errorType === 'connection' ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Tentar novamente
                  </>
                ) : (
                  <>
                    <LogIn className="h-3 w-3 mr-1" />
                    Fazer login
                  </>
                )}
              </Button>
            )}
            {errorType === 'connection' && (
              <small className="text-xs opacity-70">
                Tentativa {connectionRetries}/10
              </small>
            )}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
} 