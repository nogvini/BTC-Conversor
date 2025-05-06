"use client";

import { useState, useEffect, useRef } from 'react';
import { createSupabaseClient, supabase } from '@/lib/supabase';

type RetryConfig = {
  initialDelay?: number;  // Delay inicial em ms (padrão: 2000ms)
  maxRetries?: number;    // Número máximo de tentativas (padrão: 5)
  backoffFactor?: number; // Fator de multiplicação para aumentar o delay (padrão: 1.5)
  maxDelay?: number;      // Delay máximo em ms (padrão: 30000ms)
};

/**
 * Hook para gerenciar tentativas de conexão com o Supabase em intervalos definidos
 */
export function useSupabaseRetry(config?: RetryConfig) {
  // Cliente Supabase
  const [client, setClient] = useState(supabase);
  
  // Estado de conexão
  const [isConnected, setIsConnected] = useState(!!supabase);
  const [isAttemptingConnection, setIsAttemptingConnection] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Configuração de retry
  const {
    initialDelay = 2000,
    maxRetries = 5,
    backoffFactor = 1.5,
    maxDelay = 30000
  } = config || {};
  
  // Referência para o timer de retry
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Função para calcular o delay baseado no número da tentativa
  const calculateDelay = (attempt: number): number => {
    const delay = initialDelay * Math.pow(backoffFactor, attempt);
    return Math.min(delay, maxDelay);
  };
  
  // Função para tentar criar o cliente Supabase
  const attemptConnection = async () => {
    // Não fazer nada se já estiver conectado ou se não estiver no navegador
    if (isConnected || typeof window === 'undefined') return;
    
    // Marcar que estamos tentando conectar
    setIsAttemptingConnection(true);
    
    // Tentar criar o cliente
    const newClient = createSupabaseClient();
    
    if (newClient) {
      // Tentar fazer uma operação simples para verificar se a conexão está funcionando
      try {
        const { error } = await newClient.auth.getSession();
        
        if (!error) {
          // Conexão bem-sucedida
          setClient(newClient);
          setIsConnected(true);
          setIsAttemptingConnection(false);
          setRetryCount(0);
          
          // Limpar o timer se existir
          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
          }
          
          return;
        }
      } catch (error) {
        console.error('Erro ao verificar sessão do Supabase:', error);
      }
    }
    
    // Se chegamos aqui, a conexão falhou
    setIsAttemptingConnection(false);
    
    // Incrementar o contador de tentativas
    const newRetryCount = retryCount + 1;
    setRetryCount(newRetryCount);
    
    // Verificar se ainda podemos tentar novamente
    if (newRetryCount < maxRetries) {
      // Calcular o próximo delay
      const nextDelay = calculateDelay(newRetryCount);
      
      console.log(`Tentativa ${newRetryCount} falhou. Tentando novamente em ${nextDelay / 1000}s`);
      
      // Agendar a próxima tentativa
      retryTimerRef.current = setTimeout(() => {
        attemptConnection();
      }, nextDelay);
    } else {
      console.warn(`Máximo de ${maxRetries} tentativas atingido. Desistindo de conectar ao Supabase.`);
    }
  };
  
  // Efeito para limpar o timer quando o componente desmontar
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);
  
  // Iniciar tentativas de conexão se não estiver conectado
  useEffect(() => {
    if (!isConnected && !isAttemptingConnection && typeof window !== 'undefined') {
      attemptConnection();
    }
  }, [isConnected, isAttemptingConnection]);
  
  // Função para forçar uma nova tentativa manualmente
  const retryConnection = () => {
    if (!isConnected && !isAttemptingConnection) {
      // Resetar contador de tentativas
      setRetryCount(0);
      attemptConnection();
    }
  };
  
  return {
    client,
    isConnected,
    isAttemptingConnection,
    retryCount,
    retryConnection
  };
} 