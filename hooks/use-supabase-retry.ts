"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createSupabaseClient } from "@/lib/supabase";

interface RetryConfig {
  initialDelay?: number;
  maxRetries?: number;
  backoffFactor?: number;
  maxDelay?: number;
}

// Armazenar informações e eventos de sincronização entre componentes
const BROADCAST_CHANNEL_NAME = 'btc-monitor-supabase-hook-coordination';
let broadcastChannel: BroadcastChannel | null = null;

// Inicializar canal se estiver no browser
if (typeof window !== 'undefined') {
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch (error) {
    console.warn('BroadcastChannel não suportado neste navegador para coordenação de hooks:', error);
  }
}

/**
 * Hook para gerenciar a conexão com o Supabase e automatizar tentativas de reconexão
 */
export function useSupabaseRetry(config?: RetryConfig) {
  // Cliente Supabase
  const [client, setClient] = useState(() => {
    // Obter o cliente já existente no início
    const initialClient = createSupabaseClient();
    return initialClient;
  });
  
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
  const attemptConnection = useCallback(async () => {
    // Não fazer nada se já estiver conectado ou se não estiver no navegador
    if (isConnected || typeof window === 'undefined') return;
    
    // Marcar que estamos tentando conectar
    setIsAttemptingConnection(true);
    console.log('[useSupabaseRetry] Tentativa #' + (retryCount + 1) + ' de conexão ao Supabase');
    
    try {
      // Tentar criar o cliente
      const newClient = createSupabaseClient();
      
      if (newClient) {
        // Verificar se é uma instância secundária (mock)
        const isSecondary = !!(newClient.auth && 
                             typeof newClient.auth.getSession === 'function' && 
                             !('supabaseUrl' in newClient));
        
        if (isSecondary) {
          console.log('[useSupabaseRetry] Usando instância secundária (mock)');
          setClient(newClient);
          setIsConnected(true);
          setIsAttemptingConnection(false);
          setRetryCount(0);
          setLastError(null);
          
          // Escutar eventos de mudança de dados via BroadcastChannel
          if (broadcastChannel) {
            broadcastChannel.onmessage = (event) => {
              if (event.data.type === 'supabase_data_change') {
                console.log('[useSupabaseRetry] Recebido evento de mudança de dados:', event.data.changeType);
                // Aqui você pode adicionar lógica para reagir às mudanças
              }
            };
          }
          
          return;
        }
        
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
  }, [isConnected, retryCount, maxRetries, calculateBackoff]);
  
  // Efeito para tentar conexão inicial
  useEffect(() => {
    // Não tentar conectar durante SSR
    if (typeof window === 'undefined') return;
    
    // Se já tiver um cliente, verificar se ele está funcionando
    if (client) {
      // Verificar se é uma instância secundária (mock)
      const isSecondary = !!(client.auth && 
                           typeof client.auth.getSession === 'function' && 
                           !('supabaseUrl' in client));
      
      if (isSecondary) {
        console.log('[useSupabaseRetry] Usando cliente secundário (mock)');
        setIsConnected(true);
        return;
      }
      
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
  }, []);
  
  // Receber função broadcastChange do cliente, se disponível
  const broadcastChange = useCallback((changeType: string, data: any) => {
    if (client && typeof client.broadcastChange === 'function') {
      client.broadcastChange(changeType, data);
    } else if (broadcastChannel) {
      // Fallback para o caso do cliente não ter a função
      broadcastChannel.postMessage({ 
        type: 'supabase_data_change',
        changeType,
        data
      });
    }
  }, [client]);
  
  // Função exposta para forçar uma nova tentativa de conexão
  const retryConnection = useCallback(() => {
    console.log('[useSupabaseRetry] Forçando nova tentativa de conexão');
    // Reiniciar contagem de tentativas
    setRetryCount(0);
    attemptConnection();
  }, [attemptConnection]);
  
  return {
    client,
    isConnected,
    isAttemptingConnection,
    retryCount,
    lastError,
    retryConnection,
    broadcastChange
  };
} 