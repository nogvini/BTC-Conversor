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

// Criando um cliente Supabase para uso no lado do cliente
export const createSupabaseClient = () => {
  // Só criar o cliente no navegador
  if (!isBrowser) {
    console.warn('Tentando criar cliente Supabase fora do navegador')
    return null
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Variáveis de ambiente do Supabase não estão definidas', { 
      url: supabaseUrl || 'indefinido',
      key: supabaseKey ? 'presente mas não exibida por segurança' : 'indefinido' 
    })
    if (typeof window !== 'undefined') {
      alert('Erro crítico: Variáveis de ambiente do Supabase não estão definidas. Contate o suporte.')
    }
    return null
  }
  
  try {
    return createClient(supabaseUrl, supabaseKey)
  } catch (error) {
    console.error('Erro ao criar cliente Supabase:', error)
    if (typeof window !== 'undefined') {
      alert('Erro crítico ao criar cliente Supabase. Veja o console para detalhes.')
    }
    return null
  }
}

// Cliente Supabase para uso no lado do cliente - inicialização preguiçosa
export const supabase = isBrowser ? createSupabaseClient() : null

// Função para obter o cliente Supabase de forma segura
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