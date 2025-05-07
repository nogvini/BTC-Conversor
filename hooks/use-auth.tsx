"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { type AuthSession, type UserData } from '@/lib/supabase'
import { useSupabaseRetry } from './use-supabase-retry'

type AuthContextType = {
  session: AuthSession
  signUp: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  updateProfile: (data: Partial<UserData>) => Promise<{ error: Error | null }>
  retryConnection: () => void
  isConnecting: boolean
  connectionRetries: number
  resendVerificationEmail: (email: string) => Promise<{ error: Error | null, sent: boolean }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Usar o sistema de retry para o Supabase
  const { 
    client: supabaseClient, 
    isConnected, 
    isAttemptingConnection, 
    retryCount,
    retryConnection 
  } = useSupabaseRetry({
    initialDelay: 2000,    // 2 segundos
    maxRetries: 10,        // 10 tentativas
    backoffFactor: 1.5,    // Cada tentativa aumenta 1.5x o tempo de espera
    maxDelay: 30000        // Máximo de 30 segundos entre tentativas
  })
  
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
          try {
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
          } catch (profileError) {
            console.error('Erro ao buscar perfil:', profileError)
            
            // Continuar mesmo sem os dados do perfil
            setSession({
              user: {
                id: data.session.user.id,
                email: data.session.user.email || '',
                name: data.session.user.user_metadata?.name,
                created_at: data.session.user.created_at,
              },
              session: data.session,
              error: null,
              isLoading: false,
            })
          }
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

    // Executar ao montar o componente e quando o cliente estiver conectado
    if (isConnected) {
      fetchSession()
    }

    // Configurar listener para mudanças na autenticação
    let authListener: { subscription: { unsubscribe: () => void } } | null = null;
    
    if (isConnected && supabaseClient) {
      try {
        authListener = supabaseClient.auth.onAuthStateChange(async (event, session) => {
          if (session) {
            try {
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
            } catch (profileError) {
              console.error('Erro ao buscar perfil durante mudança de estado:', profileError)
              
              // Continuar mesmo sem os dados do perfil
              setSession({
                user: {
                  id: session.user.id,
                  email: session.user.email || '',
                  name: session.user.user_metadata?.name,
                  created_at: session.user.created_at,
                },
                session,
                error: null,
                isLoading: false,
              })
            }
          } else {
            setSession({
              user: null,
              session: null,
              error: null,
              isLoading: false,
            })
          }
        })
      } catch (error) {
        console.error('Erro ao configurar listener de autenticação:', error)
      }
    }

    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe()
      }
    }
  }, [supabaseClient, isConnected])

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
        try {
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
        } catch (profileError) {
          console.error('Erro ao criar perfil:', profileError)
          // Continuar mesmo sem criar o perfil
        }
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
      
      // Tentativa de login normal
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      })

      // Se houver erro, analisar causas comuns
      if (error) {
        if (error.message.includes('Invalid login') || 
            error.message.includes('Invalid email') ||
            error.message.includes('Invalid credentials')) {
          throw new Error('Email ou senha incorretos.')
        }
        
        if (error.message.includes('Email not confirmed') ||
            error.message.includes('not verified')) {
          throw new Error('Email não confirmado. Por favor, verifique seu email para ativar sua conta.')
        }

        // Erro genérico
        throw error
      }
      
      // Verificar se o usuário tem email confirmado
      if (data?.user && !data.user.email_confirmed_at) {
        throw new Error('Email não confirmado. Por favor, verifique seu email para ativar sua conta.')
      }

      return { error: null }
    } catch (error) {
      console.error('Erro no login:', error)
      return { error: error as Error }
    }
  }

  // Logout
  const signOut = async () => {
    if (supabaseClient) {
      try {
        await supabaseClient.auth.signOut()
      } catch (error) {
        console.error('Erro ao fazer logout:', error)
      }
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

  // Resend verification email
  const resendVerificationEmail = async (email: string) => {
    try {
      if (!supabaseClient) throw new Error('Cliente Supabase não disponível')
      
      // O método correto na API atual do Supabase
      const { error } = await supabaseClient.auth.resend({
        type: 'signup',
        email: email
      })

      if (error) throw error

      return { error: null, sent: true }
    } catch (error) {
      console.error('Erro ao reenviar email de verificação:', error)
      return { error: error as Error, sent: false }
    }
  }

  return (
    <AuthContext.Provider value={{ 
      session, 
      signUp, 
      signIn, 
      signOut, 
      updateProfile,
      retryConnection,
      isConnecting: isAttemptingConnection,
      connectionRetries: retryCount,
      resendVerificationEmail
    }}>
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