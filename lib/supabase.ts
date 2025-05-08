"use client";

import { createClient } from '@supabase/supabase-js'

// Verificar se estamos no navegador
const isBrowser = typeof window !== 'undefined'

// URLs fixas para debugging - use apenas em desenvolvimento
const fallbackUrl = 'https://sqnxrzndkppbwqdmvzer.supabase.co'
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxbnhyem5ka3BwYndxZG12emVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MDA0NDMsImV4cCI6MjA2MTk3NjQ0M30.yaMQFTEWoNT3OeOCq-P05w39hpe1ppDcMp4DR7gVMRw'

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
  
  // Obter as variáveis de ambiente
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  let supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // Verificar se as variáveis de ambiente estão definidas
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Variáveis de ambiente do Supabase não detectadas, tentando valores do localStorage')
    
    // Tentar obter do localStorage 
    if (typeof window !== 'undefined') {
      const storedUrl = localStorage.getItem('supabase_url')
      const storedKey = localStorage.getItem('supabase_key')
      
      if (storedUrl && storedKey) {
        console.log('Usando credenciais do Supabase do localStorage')
        supabaseUrl = storedUrl
        supabaseKey = storedKey
      } else {
        // Em desenvolvimento, usar valores de fallback
        if (process.env.NODE_ENV === 'development') {
          console.warn('Usando valores de fallback para Supabase em desenvolvimento')
          supabaseUrl = fallbackUrl
          supabaseKey = fallbackKey
          
          // Salvar no localStorage para uso futuro
          localStorage.setItem('supabase_url', supabaseUrl)
          localStorage.setItem('supabase_key', supabaseKey)
        } else {
          console.error('Variáveis de ambiente do Supabase não estão definidas e não há valores salvos')
          
          // Alerta no navegador, mas apenas uma vez por sessão
          if (!sessionStorage.getItem('supabase_env_alert')) {
            sessionStorage.setItem('supabase_env_alert', 'true')
            console.error('Erro crítico: Variáveis de ambiente do Supabase não definidas')
          }
          
          return null
        }
      }
    } else {
      console.error('Variáveis de ambiente do Supabase não estão definidas', { 
        url: supabaseUrl || 'indefinido',
        key: supabaseKey ? 'presente mas não exibida por segurança' : 'indefinido' 
      })
      
      return null
    }
  } else {
    // Salvar as variáveis no localStorage para uso futuro
    if (typeof window !== 'undefined') {
      localStorage.setItem('supabase_url', supabaseUrl)
      localStorage.setItem('supabase_key', supabaseKey)
    }
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
    
    // Verificar se o cliente está funcionando corretamente
    client.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('Erro ao verificar sessão com cliente recém-criado:', error)
      } else {
        console.log('Cliente Supabase verificado com sucesso:', data.session ? 'Usuário autenticado' : 'Sem sessão ativa')
      }
    })
    
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