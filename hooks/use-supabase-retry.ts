"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createSupabaseClient } from "@/lib/supabase";

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
  // Cliente Supabase
  const [client, setClient] = useState(createSupabaseClient());
  const [isConnected, setIsConnected] = useState(!!client);
  const [isAttemptingConnection, setIsAttemptingConnection] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);
  
  // Referência para o timer de retry
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Configurações de retry com valores padrão
  const {
    initialDelay = 2000,
    maxRetries = 10,
    backoffFactor = 1.5,
    maxDelay = 30000
  } = config || {};
  
  // Função para calcular o delay para a próxima tentativa usando backoff exponencial
  const calculateBackoff = useCallback((retryAttempt: number) => {
    const delay = Math.min(initialDelay * Math.pow(backoffFactor, retryAttempt), maxDelay);
    // Adicionar um jitter para evitar thundering herd
    return delay + (Math.random() * 1000);
  }, [initialDelay, backoffFactor, maxDelay]);
  
  // Função para tentar criar o cliente Supabase
  const attemptConnection = async () => {
    // Não fazer nada se já estiver conectado ou se não estiver no navegador
    if (isConnected || typeof window === 'undefined') return;
    
    // Marcar que estamos tentando conectar
    setIsAttemptingConnection(true);
    console.log('[useSupabaseRetry] Tentativa #' + (retryCount + 1) + ' de conexão ao Supabase');
    
    try {
      // Limpar cliente anterior se existir
      if (client) {
        try {
          console.log('[useSupabaseRetry] Limpando sessão do cliente anterior');
          await client.auth.signOut(); // Limpar estado de autenticação
        } catch (e) {
          console.warn('[useSupabaseRetry] Erro ao limpar cliente anterior:', e);
        }
      }
      
      // Garantir que as credenciais estejam no localStorage
      const storedUrl = localStorage.getItem('supabase_url');
      const storedKey = localStorage.getItem('supabase_key');
      
      if (!storedUrl || !storedKey) {
        console.warn('[useSupabaseRetry] Credenciais não encontradas no localStorage');
      }
      
      // Tentar criar o cliente
      const newClient = createSupabaseClient();
      
      if (newClient) {
        // Tentar fazer uma operação simples para verificar se a conexão está funcionando
        try {
          console.log('[useSupabaseRetry] Cliente criado, verificando sessão...');
          const { error } = await newClient.auth.getSession();
          
          if (!error) {
            // Conexão bem-sucedida
            console.log('[useSupabaseRetry] Conexão bem-sucedida com o Supabase!');
            setClient(newClient);
            setIsConnected(true);
            setIsAttemptingConnection(false);
            setRetryCount(0);
            setLastError(null);
            
            // Limpar o timer se existir
            if (retryTimerRef.current) {
              clearTimeout(retryTimerRef.current);
              retryTimerRef.current = null;
            }
            
            return;
          } else {
            throw error;
          }
        } catch (error) {
          setLastError(error as Error);
          console.error('[useSupabaseRetry] Erro ao verificar sessão do Supabase:', error);
        }
      } else {
        const err = new Error('Não foi possível criar o cliente Supabase.');
        setLastError(err);
        console.error('[useSupabaseRetry]', err.message);
      }
    } catch (error) {
      setLastError(error as Error);
      console.error('[useSupabaseRetry] Erro durante tentativa de conexão:', error);
    }
    
    // Se chegou aqui, a conexão falhou
    // Incrementar contador de tentativas
    setRetryCount(prev => {
      const newCount = prev + 1;
      console.log(`[useSupabaseRetry] Falha na tentativa ${newCount} de ${maxRetries}`);
      
      // Se atingiu o número máximo de tentativas, parar
      if (newCount >= maxRetries) {
        console.error('[useSupabaseRetry] Número máximo de tentativas atingido. Desistindo.');
        setIsAttemptingConnection(false);
      } else {
        // Caso contrário, agendar próxima tentativa com backoff
        const nextDelay = calculateBackoff(newCount);
        console.log(`[useSupabaseRetry] Próxima tentativa em ${Math.round(nextDelay / 1000)} segundos`);
        
        // Limpar timer anterior se existir
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
        }
        
        // Agendar próxima tentativa
        retryTimerRef.current = setTimeout(() => {
          attemptConnection();
        }, nextDelay);
      }
      
      return newCount;
    });
    
    setIsAttemptingConnection(false);
  };
  
  // Efeito para tentar conexão inicial
  useEffect(() => {
    // Não tentar conectar durante SSR
    if (typeof window === 'undefined') return;
    
    // Se já tiver um cliente, verificar se ele está funcionando
    if (client) {
      client.auth.getSession().then(({ error }) => {
        if (error) {
          console.error('[useSupabaseRetry] Erro com cliente existente, tentando reconectar:', error);
          setIsConnected(false);
          attemptConnection();
        } else {
          console.log('[useSupabaseRetry] Cliente existente está funcionando');
          setIsConnected(true);
          setRetryCount(0);
          setLastError(null);
        }
      });
    } else {
      // Se não tiver cliente, tentar criar um
      console.log('[useSupabaseRetry] Nenhum cliente existente, iniciando conexão');
      attemptConnection();
    }
    
    // Limpar timer ao desmontar
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Função exposta para forçar uma nova tentativa de conexão
  const retryConnection = useCallback(() => {
    console.log('[useSupabaseRetry] Forçando nova tentativa de conexão');
    // Reiniciar contagem de tentativas
    setRetryCount(0);
    attemptConnection();
  }, []);
  
  return {
    client,
    isConnected,
    isAttemptingConnection,
    retryCount,
    lastError,
    retryConnection
  };
} 