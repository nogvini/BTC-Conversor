"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, createSupabaseClient, type AuthSession, type UserData } from '@/lib/supabase'

type AuthContextType = {
  session: AuthSession
  signUp: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  updateProfile: (data: Partial<UserData>) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Garantir que temos uma instância do cliente Supabase
  const supabaseClient = supabase || createSupabaseClient()
  
  const [session, setSession] = useState<AuthSession>({
    user: null,
    session: null,
    error: null,
    isLoading: true,
  })

  useEffect(() => {
    // Não fazer nada se o cliente supabase não estiver disponível
    if (!supabaseClient) {
      setSession(prev => ({ ...prev, isLoading: false }))
      return
    }
    
    const fetchSession = async () => {
      try {
        setSession(prev => ({ ...prev, isLoading: true }))
        
        // Verificar se há uma sessão ativa
        const { data, error } = await supabaseClient.auth.getSession()
        
        if (error) {
          throw error
        }
        
        if (data?.session) {
          // Buscar dados adicionais do usuário se necessário
          const { data: userData } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', data.session.user.id)
            .single()
            
          setSession({
            user: {
              id: data.session.user.id,
              email: data.session.user.email || '',
              name: userData?.name || data.session.user.user_metadata?.name,
              avatar_url: userData?.avatar_url,
              created_at: data.session.user.created_at,
            },
            session: data.session,
            error: null,
            isLoading: false,
          })
        } else {
          setSession({
            user: null,
            session: null,
            error: null,
            isLoading: false,
          })
        }
      } catch (error) {
        console.error('Erro ao buscar sessão:', error)
        setSession({
          user: null,
          session: null,
          error: error as Error,
          isLoading: false,
        })
      }
    }

    // Executar ao montar o componente
    fetchSession()

    // Configurar listener para mudanças na autenticação
    const authListener = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        // Buscar dados adicionais do usuário
        const { data: userData } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        setSession({
          user: {
            id: session.user.id,
            email: session.user.email || '',
            name: userData?.name || session.user.user_metadata?.name,
            avatar_url: userData?.avatar_url,
            created_at: session.user.created_at,
          },
          session,
          error: null,
          isLoading: false,
        })
      } else {
        setSession({
          user: null,
          session: null,
          error: null,
          isLoading: false,
        })
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [supabaseClient])

  // Cadastro de usuário
  const signUp = async (email: string, password: string, name?: string) => {
    try {
      if (!supabaseClient) throw new Error('Cliente Supabase não disponível')
      
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            name
          }
        }
      })

      if (error) throw error

      // Se o cadastro for bem-sucedido, criar perfil do usuário
      if (data.user) {
        const { error: profileError } = await supabaseClient
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              name,
              email
            }
          ])

        if (profileError) throw profileError
      }

      return { error: null }
    } catch (error) {
      console.error('Erro no cadastro:', error)
      return { error: error as Error }
    }
  }

  // Login de usuário
  const signIn = async (email: string, password: string) => {
    try {
      if (!supabaseClient) throw new Error('Cliente Supabase não disponível')
      
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      return { error: null }
    } catch (error) {
      console.error('Erro no login:', error)
      return { error: error as Error }
    }
  }

  // Logout
  const signOut = async () => {
    if (supabaseClient) {
      await supabaseClient.auth.signOut()
    }
  }

  // Atualizar perfil
  const updateProfile = async (data: Partial<UserData>) => {
    try {
      if (!supabaseClient) throw new Error('Cliente Supabase não disponível')
      if (!session.user) throw new Error('Usuário não autenticado')

      const { error } = await supabaseClient
        .from('profiles')
        .update(data)
        .eq('id', session.user.id)

      if (error) throw error

      // Atualizar estado local
      setSession(prev => ({
        ...prev,
        user: prev.user ? { ...prev.user, ...data } : null
      }))

      return { error: null }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error)
      return { error: error as Error }
    }
  }

  return (
    <AuthContext.Provider value={{ session, signUp, signIn, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
} 