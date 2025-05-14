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
  console.log('[useSupabaseRetry] Hook INICIADO'); // Log de início do hook
  const [client, setClient] = useState(() => {
    console.log('[useSupabaseRetry] useState(createSupabaseClient) CHAMADO');
    return createSupabaseClient();
  });
  const [isConnected, setIsConnected] = useState(!!client);
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
  
  const attemptConnection = useCallback(async () => { // Adicionado useCallback aqui
    if (isConnected || typeof window === 'undefined') {
      console.log('[useSupabaseRetry] attemptConnection: Já conectado ou fora do navegador. Retornando.');
      return;
    }
    
    setIsAttemptingConnection(true);
    console.log('[useSupabaseRetry] attemptConnection: Tentativa #' + (retryCount + 1));
    
    try {
      if (client) {
        try {
          console.log('[useSupabaseRetry] attemptConnection: Limpando sessão do cliente anterior existente.');
          await client.auth.signOut();
        } catch (e) {
          console.warn('[useSupabaseRetry] attemptConnection: Erro ao limpar cliente anterior:', e);
        }
      }
      
      console.log('[useSupabaseRetry] attemptConnection: Chamando createSupabaseClient() para novo cliente...');
      const newClient = createSupabaseClient();
      console.log('[useSupabaseRetry] attemptConnection: newClient recebido:', newClient ? 'Cliente Válido' : 'Cliente NULO');
      
      if (newClient) {
        try {
          console.log('[useSupabaseRetry] attemptConnection: Verificando sessão do newClient...');
          const { error: sessionError } = await newClient.auth.getSession();
          
          if (!sessionError) {
            console.log('[useSupabaseRetry] attemptConnection: Conexão BEM-SUCEDIDA! Atualizando estado.');
            setClient(newClient);
            setIsConnected(true);
            setIsAttemptingConnection(false);
            setRetryCount(0);
            setLastError(null);
            
            if (retryTimerRef.current) {
              clearTimeout(retryTimerRef.current);
              retryTimerRef.current = null;
            }
            return;
          } else {
            console.error('[useSupabaseRetry] attemptConnection: Erro ao verificar sessão do newClient:', sessionError);
            setLastError(sessionError as Error); // Guardar o erro da sessão
            // Não lançar o erro aqui para permitir o fluxo de retry
          }
        } catch (innerError) { // Erro dentro da verificação de sessão
          setLastError(innerError as Error);
          console.error('[useSupabaseRetry] attemptConnection: Erro CATCH INTERNO ao verificar sessão do newClient:', innerError);
        }
      } else {
        const err = new Error('Não foi possível criar o newClient (retornou null).');
        setLastError(err);
        console.error('[useSupabaseRetry] attemptConnection:', err.message);
      }
    } catch (outerError) { // Erro no bloco try principal de attemptConnection
      setLastError(outerError as Error);
      console.error('[useSupabaseRetry] attemptConnection: Erro CATCH EXTERNO durante tentativa:', outerError);
    }
    
    // Se chegou aqui, a conexão falhou ou newClient foi null
    setRetryCount(prev => {
      const newCount = prev + 1;
      console.log(`[useSupabaseRetry] attemptConnection: Falha na tentativa ${newCount} de ${maxRetries}`);
      
      if (newCount >= maxRetries) {
        console.error('[useSupabaseRetry] attemptConnection: Número máximo de tentativas atingido.');
        setIsAttemptingConnection(false);
      } else {
        const nextDelay = calculateBackoff(newCount);
        console.log(`[useSupabaseRetry] attemptConnection: Próxima tentativa em ${Math.round(nextDelay / 1000)}s`);
        
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
        }
        
        retryTimerRef.current = setTimeout(() => {
          attemptConnection(); // Recursão para próxima tentativa
        }, nextDelay);
      }
      return newCount;
    });
    
    setIsAttemptingConnection(false); // Certificar que paramos de tentar se não agendou retry
  }, [client, isConnected, retryCount, maxRetries, calculateBackoff]); // Adicionadas dependências ao useCallback
  
  useEffect(() => {
    console.log('[useSupabaseRetry] useEffect INICIAL CHAMADO. isConnected:', isConnected, 'client:', client ? 'Existe' : 'NULO');
    if (typeof window === 'undefined') return;

    if (client && isConnected) { // Se já temos um cliente e ele está marcado como conectado
      console.log('[useSupabaseRetry] useEffect: Cliente existente e conectado. Verificando validade da sessão...');
      client.auth.getSession().then(({ error }) => {
        if (error) {
          console.error('[useSupabaseRetry] useEffect: Erro com cliente existente que estava conectado. Iniciando reconexão.', error);
          setIsConnected(false); // Marcar como não conectado para disparar attemptConnection
          // Não chamar attemptConnection diretamente aqui, deixar que o próximo useEffect (se houver) ou uma mudança de estado o faça
        } else {
          console.log('[useSupabaseRetry] useEffect: Cliente existente e conectado está OK.');
        }
      });
    } else if (!isAttemptingConnection) { // Só tentar se não já estiver tentando
        console.log('[useSupabaseRetry] useEffect: Cliente NULO, não conectado ou conexão falhou. Chamando attemptConnection().');
        attemptConnection();
    }

    return () => {
      if (retryTimerRef.current) {
        console.log('[useSupabaseRetry] Limpando timer no unmount do useEffect.');
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [client, isConnected, attemptConnection, isAttemptingConnection]); // Adicionadas dependências corretas
  
  const retryConnection = useCallback(() => {
    console.log('[useSupabaseRetry] retryConnection: Forçando nova tentativa.');
    setRetryCount(0); // Resetar contador
    setIsConnected(false); // Garantir que tentaremos conectar
    attemptConnection();
  }, [attemptConnection]);
  
  console.log('[useSupabaseRetry] Hook RETORNANDO VALORES:', { clientExists: !!client, isConnected, isAttemptingConnection, retryCount });

  return {
    client,
    isConnected,
    isAttemptingConnection,
    retryCount,
    lastError,
    retryConnection
  };
} 