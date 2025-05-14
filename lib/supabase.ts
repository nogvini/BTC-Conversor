"use client";

import { createClient } from '@supabase/supabase-js'

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

/**
 * Cria um cliente Supabase para uso no lado do cliente.
 * Prioriza variáveis de ambiente. Em desenvolvimento, pode usar fallbacks se as vars não estiverem definidas.
 * @returns Cliente Supabase ou null em caso de falha na obtenção das credenciais.
 */
export const createSupabaseClient = () => {
  if (!isBrowser) {
    // console.warn('[Supabase] Tentando criar cliente Supabase fora do navegador. Retornando null.');
    return null;
  }
  
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Supabase] Variáveis de ambiente não definidas. Usando fallbacks de DESENVOLVIMENTO.');
      supabaseUrl = fallbackUrl;
      supabaseKey = fallbackKey;
    } else {
      console.error('[Supabase] ERRO CRÍTICO: Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e/ou NEXT_PUBLIC_SUPABASE_ANON_KEY não estão definidas em produção.');
      // Alerta no navegador, mas apenas uma vez por sessão para não poluir
      if (!sessionStorage.getItem('supabase_critical_env_alert')) {
        sessionStorage.setItem('supabase_critical_env_alert', 'true');
        // alert('Erro crítico: A configuração do Supabase está ausente. Por favor, contate o suporte.');
      }
      return null; // Falha crítica em produção se as variáveis não estiverem definidas
    }
  }
  
  try {
    const client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true, // Supabase gerencia a persistência da sessão (ex: no localStorage)
      }
    });
    
    console.log('[Supabase] Cliente criado com sucesso.');
    
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
    console.error('[Supabase] Erro ao criar cliente Supabase:', error);
    if (isBrowser && !sessionStorage.getItem('supabase_creation_error_alert')) {
      sessionStorage.setItem('supabase_creation_error_alert', 'true');
      // alert('Erro crítico ao inicializar o sistema de dados. Por favor, contate o suporte.');
    }
    return null;
  }
}

// Cliente Supabase para uso no lado do cliente - inicialização na primeira chamada
// Usamos uma função para garantir que createSupabaseClient() seja chamado apenas quando necessário e no client-side
let clientInstance: ReturnType<typeof createSupabaseClient> | null = null;

export const supabase = (() => {
  if (!isBrowser) return null;
  if (!clientInstance) {
    clientInstance = createSupabaseClient();
  }
  return clientInstance;
})();

/**
 * Função para obter o cliente Supabase de forma segura.
 * Retorna a instância global ou tenta criar uma nova se necessário.
 */
export function getSupabaseClient() {
  if (!isBrowser) return null;
  if (!clientInstance) { // Se a instância global for null (ex: falha na primeira tentativa)
    clientInstance = createSupabaseClient(); // Tenta criar novamente
  }
  return clientInstance;
}

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