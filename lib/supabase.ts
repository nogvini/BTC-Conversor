"use client";

import { createClient } from '@supabase/supabase-js'

// Verificar se estamos no navegador
const isBrowser = typeof window !== 'undefined'

// Log para debugging
console.log('Ambiente Supabase:', { 
  isBrowser,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'definido' : 'indefinido',
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'definido' : 'indefinido',
});

/**
 * Cria um cliente Supabase para uso no lado do cliente
 * @returns Cliente Supabase ou null em caso de erro
 */
export const createSupabaseClient = () => {
  // Só criar o cliente no navegador
  if (!isBrowser) {
    console.warn('Tentando criar cliente Supabase fora do navegador')
    return null
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // Verificar se as variáveis de ambiente estão definidas
  if (!supabaseUrl || !supabaseKey) {
    console.error('Variáveis de ambiente do Supabase não estão definidas', { 
      url: supabaseUrl || 'indefinido',
      key: supabaseKey ? 'presente mas não exibida por segurança' : 'indefinido' 
    })
    
    // Alerta no navegador, mas apenas uma vez por sessão
    if (isBrowser && !sessionStorage.getItem('supabase_env_alert')) {
      sessionStorage.setItem('supabase_env_alert', 'true')
      console.error('Erro crítico: Variáveis de ambiente do Supabase não definidas')
    }
    
    return null
  }
  
  try {
    // Tentar criar o cliente com as configurações padrão
    const client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    })
    
    // Log de sucesso
    console.log('Cliente Supabase criado com sucesso')
    return client
  } catch (error) {
    console.error('Erro ao criar cliente Supabase:', error)
    
    // Alerta no navegador, mas apenas uma vez por sessão
    if (isBrowser && !sessionStorage.getItem('supabase_error_alert')) {
      sessionStorage.setItem('supabase_error_alert', 'true')
      console.error('Erro crítico ao inicializar Supabase')
    }
    
    return null
  }
}

// Cliente Supabase para uso no lado do cliente - inicialização preguiçosa
export const supabase = isBrowser ? createSupabaseClient() : null

/**
 * Função para obter o cliente Supabase de forma segura
 * Tenta criar um novo cliente se o cliente global não estiver disponível
 */
export function getSupabaseClient() {
  if (!isBrowser) return null
  return supabase || createSupabaseClient()
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
  session: any | null
  error: Error | null
  isLoading: boolean
} 