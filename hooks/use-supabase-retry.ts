"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { SupabaseClient } from "@supabase/supabase-js";

interface RetryConfig {
  initialDelay?: number;
  maxRetries?: number;
  backoffFactor?: number;
  maxDelay?: number;
}

/**
 * Hook para gerenciar a conexão com o Supabase e automatizar tentativas de reconexão
 */
export function useSupabaseRetry(config?: RetryConfig) {
  console.log('[useSupabaseRetry] Hook INICIADO'); // Log de início do hook
  
  const [client, setClient] = useState<SupabaseClient | null>(() => {
    console.log('[useSupabaseRetry] useState: Chamando getSupabaseClient() para estado inicial...');
    const initialClient = getSupabaseClient();
    console.log('[useSupabaseRetry] useState: Cliente inicial obtido:', initialClient ? 'Instância Válida' : 'NULO');
    return initialClient;
  });

  const [isConnected, setIsConnected] = useState(false);
  const [isAttemptingConnection, setIsAttemptingConnection] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);
  
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const {
    initialDelay = 2000,
    maxRetries = 10,
    backoffFactor = 1.5,
    maxDelay = 30000
  } = config || {};
  
  const calculateBackoff = useCallback((retryAttempt: number) => {
    const delay = Math.min(initialDelay * Math.pow(backoffFactor, retryAttempt), maxDelay);
    return delay + (Math.random() * 1000);
  }, [initialDelay, backoffFactor, maxDelay]);
  
  const attemptConnection = useCallback(async () => {
    if (isConnected && client) {
      console.log('[useSupabaseRetry] attemptConnection: Já conectado com cliente válido. Retornando.');
      return;
    }
    if (typeof window === 'undefined') {
      console.log('[useSupabaseRetry] attemptConnection: Fora do navegador. Retornando.');
      return;
    }
    
    setIsAttemptingConnection(true);
    setLastError(null);
    console.log('[useSupabaseRetry] attemptConnection: Tentativa #' + (retryCount + 1));
    
    try {
      console.log('[useSupabaseRetry] attemptConnection: Chamando getSupabaseClient()...');
      const currentClient = getSupabaseClient();
      console.log('[useSupabaseRetry] attemptConnection: Cliente obtido de getSupabaseClient():', currentClient ? 'Instância Válida' : 'NULO');

      if (currentClient) {
        console.log('[useSupabaseRetry] attemptConnection: Verificando sessão com o cliente obtido...');
        const { error: sessionError } = await currentClient.auth.getSession();
        
        if (!sessionError) {
          console.log('[useSupabaseRetry] attemptConnection: Conexão/Sessão VERIFICADA com sucesso! Atualizando estado.');
          setClient(currentClient);
          setIsConnected(true);
          setIsAttemptingConnection(false);
          setRetryCount(0);
          
          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
          }
          return;
        } else {
          console.error('[useSupabaseRetry] attemptConnection: Erro ao verificar sessão com o cliente:', sessionError);
          setLastError(sessionError);
        }
      } else {
        const err = new Error('Falha ao obter cliente Supabase de getSupabaseClient() (retornou null).');
        console.error('[useSupabaseRetry] attemptConnection:', err.message);
        setLastError(err);
      }
    } catch (error) {
      console.error('[useSupabaseRetry] attemptConnection: Erro CATCH GERAL durante tentativa:', error);
      setLastError(error as Error);
    }
    
    setIsConnected(false);
    setClient(null);

    setRetryCount(prev => {
      const newCount = prev + 1;
      console.log(`[useSupabaseRetry] attemptConnection: Falha na tentativa ${newCount} de ${maxRetries}.`);
      
      if (newCount >= maxRetries) {
        console.error('[useSupabaseRetry] attemptConnection: Número máximo de tentativas atingido. Desistindo.');
        setIsAttemptingConnection(false);
      } else {
        const nextDelay = calculateBackoff(newCount);
        console.log(`[useSupabaseRetry] attemptConnection: Próxima tentativa em ${Math.round(nextDelay / 1000)}s`);
        
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
        }
        retryTimerRef.current = setTimeout(attemptConnection, nextDelay);
      }
      return newCount;
    });
    
    setIsAttemptingConnection(false);
  }, [isConnected, client, retryCount, maxRetries, calculateBackoff]);
  
  useEffect(() => {
    console.log('[useSupabaseRetry] useEffect INICIAL/RECONEXÃO. Client:', client ? 'Existe' : 'NULO', 'isConnected:', isConnected, 'isAttempting:', isAttemptingConnection);
    if (typeof window === 'undefined') return;

    if (!client || !isConnected) {
      if (!isAttemptingConnection) {
        console.log('[useSupabaseRetry] useEffect: Cliente NULO ou não conectado. Chamando attemptConnection().');
        attemptConnection();
      }
    } else {
        console.log('[useSupabaseRetry] useEffect: Cliente existe e está marcado como conectado. Estado estável.');
    }

    return () => {
      if (retryTimerRef.current) {
        console.log('[useSupabaseRetry] Limpando timer no unmount do useEffect.');
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [isConnected, isAttemptingConnection, attemptConnection]);
  
  const retryConnection = useCallback(() => {
    console.log('[useSupabaseRetry] retryConnection: Forçando nova tentativa de conexão manual...');
    setRetryCount(0);
    setIsConnected(false);
    setClient(null);
    attemptConnection();
  }, [attemptConnection]);
  
  console.log('[useSupabaseRetry] Hook RETORNANDO VALORES:', { clientExists: !!client, isConnected, isAttemptingConnection, retryCount, lastError: lastError ? lastError.message : null });

  return {
    client,
    isConnected,
    isAttemptingConnection,
    retryCount,
    lastError,
    retryConnection
  };
} 