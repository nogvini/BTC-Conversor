"use client";

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Verificar se estamos no navegador
const isBrowser = typeof window !== 'undefined'

// URLs e Chave de fallback para debugging - APENAS para desenvolvimento
const fallbackUrl = 'https://sqnxrzndkppbwqdmvzer.supabase.co'
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxbnhyem5ka3BwYndxZG12emVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MDA0NDMsImV4cCI6MjA2MTk3NjQ0M30.yaMQFTEWoNT3OeOCq-P05w39hpe1ppDcMp4DR7gVMRw'

// Log inicial para debugging
console.log('Ambiente Supabase:', { 
  isBrowser,
  envSupabaseUrlDefined: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  envSupabaseKeyDefined: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

let supabaseInstance: SupabaseClient | null = null;

console.log('[Supabase Singleton] Módulo lib/supabase.ts carregado.');

function initializeSupabaseClient(): SupabaseClient | null {
  if (!isBrowser) {
    console.log('[Supabase Singleton] Fora do navegador, retornando null para instância.');
    return null;
  }
  
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Supabase Singleton] Vars de ambiente não definidas. Usando fallbacks de DESENVOLVIMENTO.');
      supabaseUrl = fallbackUrl;
      supabaseKey = fallbackKey;
    } else {
      console.error('[Supabase Singleton] ERRO CRÍTICO: Vars de ambiente Supabase não definidas em produção.');
      if (!sessionStorage.getItem('supabase_critical_env_alert')) {
        sessionStorage.setItem('supabase_critical_env_alert', 'true');
      }
      return null;
    }
  }
  
  try {
    console.log('[Supabase Singleton] Tentando criar nova instância do cliente Supabase...');
    const client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true, // Supabase gerencia a persistência da sessão (ex: no localStorage)
      }
    });
    
    console.log('[Supabase Singleton] Nova instância do cliente Supabase CRIADA COM SUCESSO.');
    
    // Opcional: verificar rapidamente a conexão (pode ser removido se causar lentidão inicial)
    // client.auth.getSession().then(({ data, error }) => {
    //   if (error) {
    //     console.error('[Supabase] Erro ao verificar sessão com cliente recém-criado:', error.message);
    //   } else {
    //     console.log('[Supabase] Verificação de sessão inicial OK:', data.session ? 'Sessão ativa' : 'Sem sessão');
    //   }
    // });
    
    return client;
  } catch (error) {
    console.error('[Supabase Singleton] Erro ao criar nova instância do cliente Supabase:', error);
    if (!sessionStorage.getItem('supabase_creation_error_alert')) {
      sessionStorage.setItem('supabase_creation_error_alert', 'true');
      // alert('Erro crítico ao inicializar o sistema de dados. Por favor, contate o suporte.');
    }
    return null;
  }
}

/**
 * Retorna a instância singleton do SupabaseClient.
 * Cria a instância na primeira chamada se ainda não existir (apenas no browser).
 */
export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isBrowser) {
    // console.log('[Supabase Singleton] getSupabaseClient: Fora do navegador, retornando null.');
    return null; 
  }
  if (supabaseInstance === null) {
    console.log('[Supabase Singleton] getSupabaseClient: Instância ainda não existe ou é null. Tentando inicializar...');
    supabaseInstance = initializeSupabaseClient();
    if (supabaseInstance) {
      console.log('[Supabase Singleton] getSupabaseClient: Instância inicializada e atribuída.');
    } else {
      console.error('[Supabase Singleton] getSupabaseClient: Falha ao inicializar a instância.');
    }
  } else {
    // console.log('[Supabase Singleton] getSupabaseClient: Retornando instância existente.');
  }
  return supabaseInstance;
};

// Tipos para autenticação
export type UserData = {
  id: string
  email: string
  name?: string
  avatar_url?: string
  created_at: string
}

export type AuthSession = {
  user: UserData | null
  session: any | null // any para Session do Supabase
  error: Error | null
  isLoading: boolean
} 