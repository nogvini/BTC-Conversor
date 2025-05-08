import { createClient } from '@supabase/supabase-js'

// Função para criar o cliente Supabase para o middleware
export function createMiddlewareSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Credenciais do Supabase não disponíveis para o middleware')
    return null
  }
  
  try {
    return createClient(supabaseUrl, supabaseKey)
  } catch (error) {
    console.error('Erro ao criar cliente Supabase para o middleware:', error)
    return null
  }
} 