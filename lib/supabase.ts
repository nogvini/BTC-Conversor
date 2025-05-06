"use client";

import { createClient } from '@supabase/supabase-js'

// Verificar se estamos no navegador
const isBrowser = typeof window !== 'undefined'

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
    console.warn('Variáveis de ambiente do Supabase não estão definidas')
    return null
  }
  
  try {
    return createClient(supabaseUrl, supabaseKey)
  } catch (error) {
    console.error('Erro ao criar cliente Supabase:', error)
    return null
  }
}

// Cliente Supabase para uso no lado do cliente - somente inicializado no navegador
export const supabase = isBrowser ? createSupabaseClient() : null

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