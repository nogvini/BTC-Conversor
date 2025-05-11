"use client"

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { type AuthSession, type UserData } from '@/lib/supabase'
import { useSupabaseRetry } from './use-supabase-retry'
import { useToast } from './use-toast'

// Constantes para timeout
const PROFILE_LOADING_TIMEOUT = 5000 // 5 segundos

type AuthContextType = {
  session: AuthSession
  signUp: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null, profileNotFound?: boolean }>
  signOut: () => Promise<void>
  updateProfile: (data: Partial<UserData>) => Promise<{ error: Error | null }>
  retryConnection: () => void
  isConnecting: boolean
  connectionRetries: number
  resendVerificationEmail: (email: string) => Promise<{ error: Error | null, sent: boolean }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast()
  const { client: supabaseClient, isConnected, retryConnection, isAttemptingConnection, retryCount } = useSupabaseRetry()
  
  // Estado local de sessão
  const [session, setSession] = useState<AuthSession>({
    user: null,
    session: null,
    error: null,
    isLoading: true,
  })
  
  // Usado para exibir status de diagnóstico
  const [lastAuthEvent, setLastAuthEvent] = useState<string>('nenhum')

  // Effect para log de diagnóstico - otimizado para executar menos vezes
  useEffect(() => {
    // Reduzir frequência de logs para melhorar performance
    const timeoutId = setTimeout(() => {
      console.log('Estado atual da autenticação:', {
        usuarioLogado: !!session.user,
        userId: session.user?.id || 'nenhum',
        nomeUsuario: session.user?.name || 'não definido',
        carregando: session.isLoading,
        erro: session.error ? session.error.message : 'nenhum',
        clienteConectado: isConnected,
        ultimoEvento: lastAuthEvent
      })
    }, 300) // Pequeno debounce para evitar logs excessivos
    
    return () => clearTimeout(timeoutId)
  }, [session.user?.id, session.isLoading, session.error, isConnected, lastAuthEvent])
  
  // Efeito para buscar a sessão quando o cliente estiver conectado
  useEffect(() => {
    // Não fazer nada se o cliente supabase não estiver disponível
    if (!supabaseClient || !isConnected) {
      console.log('Cliente Supabase indisponível ou não conectado')
      return
    }
    
    // Função otimizada como cache entre renderizações
    const fetchSession = async () => {
      try {
        setSession(prev => ({ ...prev, isLoading: true }))
        console.log('Iniciando busca de sessão')
        
        // Criar timer de timeout para interromper carregamento se demorar muito
        const timeoutId = setTimeout(() => {
          console.warn('Timeout atingido durante carregamento de sessão')
          setSession(prev => ({
            ...prev,
            isLoading: false,
            error: new Error('Tempo limite excedido ao carregar seu perfil. Tente novamente mais tarde.')
          }))
          setLastAuthEvent('timeout durante carregamento')
        }, PROFILE_LOADING_TIMEOUT)
        
        // Verificar se já existe uma sessão persistida no localStorage
        const persistedSession = typeof window !== 'undefined' ? localStorage.getItem('supabase_session') : null
        
        if (persistedSession) {
          try {
            const savedSession = JSON.parse(persistedSession)
            const expiresAt = savedSession.expires_at * 1000 // Converter para milissegundos
            
            // Verificar se a sessão ainda não expirou
            if (expiresAt > Date.now()) {
              console.log('Usando sessão persistida do localStorage')
              
              // Usar a sessão persistida para evitar nova autenticação
              const sessionResult = await supabaseClient.auth.setSession({
                access_token: savedSession.access_token,
                refresh_token: savedSession.refresh_token
              })
              
              if (sessionResult.error) {
                console.error('Erro ao restaurar sessão:', sessionResult.error)
                localStorage.removeItem('supabase_session')
              } else {
                console.log('Sessão restaurada com sucesso do localStorage')
              }
            } else {
              console.log('Sessão persistida expirada, removendo do localStorage')
              localStorage.removeItem('supabase_session')
            }
          } catch (e) {
            console.error('Erro ao processar sessão persistida:', e)
            localStorage.removeItem('supabase_session')
          }
        } else {
          console.log('Nenhuma sessão encontrada no localStorage')
        }
        
        // Verificar se há uma sessão ativa
        const { data, error } = await supabaseClient.auth.getSession()
        
        if (error) {
          clearTimeout(timeoutId) // Limpar o timeout em caso de erro
          throw error
        }
        
        console.log('Resultado getSession:', data.session ? 'Sessão encontrada' : 'Nenhuma sessão')
        
        // Se houver uma sessão ativa, buscar os dados do perfil
        if (data.session) {
          try {
            setLastAuthEvent('sessão encontrada')
            
            // Persisitir a sessão no localStorage para recuperação futura
            if (typeof window !== 'undefined') {
              localStorage.setItem('supabase_session', JSON.stringify(data.session))
              console.log('Sessão salva no localStorage')
            }
            
            // Buscar dados do perfil na tabela profiles com timeout
            const { data: userData, error: profileError } = await supabaseClient
              .from('profiles')
              .select('*')
              .eq('id', data.session.user.id)
              .single()
            
            // Limpar o timeout após receber resposta
            clearTimeout(timeoutId)
            
            console.log('Busca de perfil:', {
              sucesso: !profileError,
              perfilEncontrado: !!userData,
              userId: data.session.user.id
            })
            
            if (profileError) {
              console.error('Erro ao buscar perfil:', profileError)
              
              // Verificar se é erro de perfil não encontrado
              if (profileError.message.includes('JSON object requested, multiple (or no) rows returned')) {
                console.log('Perfil não encontrado, tentando criar automaticamente...')
                
                // Tentar criar o perfil automaticamente
                const { error: insertError } = await supabaseClient
                  .from('profiles')
                  .insert([{
                    id: data.session.user.id,
                    name: data.session.user.user_metadata?.name || '',
                    email: data.session.user.email
                  }])
                
                if (insertError) {
                  console.error('Erro ao criar perfil:', insertError)
                } else {
                  console.log('Perfil criado com sucesso')
                  
                  // Buscar o perfil recém-criado
                  const { data: newUserData } = await supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('id', data.session.user.id)
                    .single()
                  
                  if (newUserData) {
                    setSession({
                      user: {
                        id: data.session.user.id,
                        email: data.session.user.email || '',
                        name: newUserData.name || data.session.user.user_metadata?.name,
                        avatar_url: newUserData.avatar_url,
                        created_at: data.session.user.created_at,
                      },
                      session: data.session,
                      error: null,
                      isLoading: false,
                    })
                    setLastAuthEvent('perfil criado automaticamente')
                    return
                  }
                }
              }
              
              // Se houver erro no perfil, mas o usuário está autenticado
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
              setLastAuthEvent('sessão sem perfil completo')
            } else {
              // Perfil encontrado com sucesso
              setSession({
                user: {
                  id: data.session.user.id,
                  email: data.session.user.email || '',
                  name: userData.name || data.session.user.user_metadata?.name,
                  avatar_url: userData.avatar_url,
                  created_at: data.session.user.created_at,
                },
                session: data.session,
                error: null,
                isLoading: false,
              })
              setLastAuthEvent('perfil carregado com sucesso')
            }
          } catch (profileError) {
            // Limpar o timeout em caso de erro
            clearTimeout(timeoutId)
            
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
            setLastAuthEvent('erro ao buscar perfil')
          }
        } else {
          // Limpar o timeout se não houver sessão
          clearTimeout(timeoutId)
          
          setSession({
            user: null,
            session: null,
            error: null,
            isLoading: false,
          })
          setLastAuthEvent('nenhuma sessão encontrada')
        }
      } catch (error) {
        console.error('Erro ao buscar sessão:', error)
        setSession({
          user: null,
          session: null,
          error: error as Error,
          isLoading: false,
        })
        setLastAuthEvent('erro ao buscar sessão')
      }
    }

    // Executar ao montar o componente e quando o cliente estiver conectado
    if (isConnected) {
      fetchSession()
    }
  }, [supabaseClient, isConnected])

  // Memoizar funções de autenticação para evitar recriações a cada renderização
  const signUp = useCallback(async (email: string, password: string, name?: string) => {
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
            .upsert([
              {
                id: data.user.id,
                name: name || '',
                email: email,
                updated_at: new Date().toISOString()
              }
            ], { onConflict: 'id' })

          if (profileError) {
            console.error('Erro ao criar perfil durante cadastro:', profileError)
            // Não retornar erro aqui, para permitir que o usuário continue com o login
          } else {
            console.log('Perfil criado com sucesso durante cadastro para:', email)
          }
        } catch (profileError) {
          console.error('Erro ao criar perfil durante cadastro:', profileError)
          // Continuar mesmo sem criar o perfil
        }
      }

      return { error: null }
    } catch (error) {
      console.error('Erro no cadastro:', error)
      return { error: error as Error }
    }
  }, [supabaseClient])

  // Otimizando a função signIn para reduzir tempo de resposta
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      if (!supabaseClient) {
        console.error('ERRO CRÍTICO: Cliente Supabase não disponível. Verifique as variáveis de ambiente.');
        throw new Error('Erro de configuração do sistema. Entre em contato com o administrador.')
      }
      
      // Verificar se as variáveis de ambiente estão definidas
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('ERRO CRÍTICO: Variáveis de ambiente do Supabase não definidas:', {
          url: supabaseUrl ? 'definido' : 'indefinido',
          key: supabaseKey ? 'definido' : 'indefinido'
        });
        throw new Error('Erro de configuração do sistema. Entre em contato com o administrador.')
      }
      
      console.log('Autenticando usuário:', email);
      
      // Indicar início do carregamento 
      setSession(prev => ({ ...prev, isLoading: true }))
      
      // Verificar primeiro se temos uma sessão em cache que podemos usar
      let cachedSession = null;
      try {
        const persistedSession = localStorage.getItem('supabase_session');
        if (persistedSession) {
          const parsed = JSON.parse(persistedSession);
          // Verificar se a sessão em cache pertence ao email que está tentando logar
          if (parsed.user?.email === email && parsed.expires_at && parsed.expires_at * 1000 > Date.now()) {
            console.log('Usando sessão em cache para acelerar login');
            cachedSession = parsed;
            
            // Tentar restaurar sessão do cache
            const { error: sessionError } = await supabaseClient.auth.setSession({
              access_token: cachedSession.access_token,
              refresh_token: cachedSession.refresh_token
            });
            
            if (!sessionError) {
              // Sessão restaurada com sucesso, podemos pular o fluxo normal de login
              console.log('Sessão restaurada do cache com sucesso');
              
              // Buscar perfil separadamente, mas já permitir o login
              fetchProfileData(cachedSession.user.id)
                .catch(err => console.error('Erro ao buscar perfil após restaurar sessão:', err));
              
              // Atualizar estado de sessão com dados básicos
              setSession({
                user: {
                  id: cachedSession.user.id,
                  email: cachedSession.user.email || '',
                  name: cachedSession.user.user_metadata?.name || '',
                  created_at: cachedSession.user.created_at,
                },
                session: cachedSession,
                error: null,
                isLoading: false,
              });
              
              // Mostrar toast de boas-vindas
              toast({
                title: "Bem-vindo de volta!",
                description: "Login realizado com sucesso.",
                duration: 3000,
              });
              
              return { error: null };
            } else {
              console.log('Sessão em cache inválida, prosseguindo com login normal');
              // Continuar com o fluxo normal de login
            }
          }
        }
      } catch (cacheError) {
        console.error('Erro ao tentar restaurar sessão do cache:', cacheError);
        // Ignorar erro e continuar com login normal
      }
      
      // Tentativa de login normal
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      // Diagnóstico detalhado da resposta do Supabase
      console.log('Resposta de autenticação:', {
        sucesso: !error,
        temDados: !!data,
        temUsuario: !!data?.user,
        emailConfirmado: data?.user?.email_confirmed_at ? 'Sim' : 'Não',
      });

      // Se houver erro, analisar causas comuns
      if (error) {
        console.error('Erro na API do Supabase:', error);
        
        setSession(prev => ({
          ...prev,
          error,
          isLoading: false
        }));
        
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
        setSession(prev => ({ ...prev, isLoading: false }));
        throw new Error('Email não confirmado. Por favor, verifique seu email para ativar sua conta.')
      }

      // Persistir a sessão no localStorage para recuperação futura
      if (typeof window !== 'undefined' && data.session) {
        localStorage.setItem('supabase_session', JSON.stringify(data.session));
        console.log('Sessão salva no localStorage após login bem-sucedido');
      }
      
      // Atualizar estado básico da sessão para resposta rápida ao usuário
      setSession({
        user: {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.name || '',
          created_at: data.user.created_at,
        },
        session: data.session,
        error: null,
        isLoading: false,
      });
      
      // Mostrar toast de boas-vindas imediatamente
      toast({
        title: "Bem-vindo de volta!",
        description: "Login realizado com sucesso.",
        duration: 3000,
      });
      
      // Iniciar busca de perfil em background, sem bloquear o login
      fetchProfileData(data.user.id)
        .then(profileData => {
          if (profileData) {
            // Atualizar o estado com dados completos do perfil, se disponíveis
            setSession(prev => ({
              ...prev,
              user: {
                ...prev.user!,
                name: profileData.name || prev.user?.name || '',
                avatar_url: profileData.avatar_url
              }
            }));
          }
        })
        .catch(err => console.error('Erro ao buscar perfil em background:', err));
      
      return { error: null };
    } catch (error) {
      console.error('Erro no login:', error);
      
      setSession(prev => ({ 
        ...prev, 
        error: error as Error, 
        isLoading: false 
      }));
      
      toast({
        title: "Erro ao fazer login",
        description: (error as Error).message || "Ocorreu um erro inesperado. Tente novamente mais tarde.",
        variant: "destructive",
        duration: 5000,
      });
      
      return { error: error as Error };
    }
  }, [supabaseClient, toast])

  // Função auxiliar para buscar dados de perfil de forma assíncrona
  const fetchProfileData = useCallback(async (userId: string) => {
    if (!supabaseClient || !userId) return null;
    
    try {
      console.log('Buscando dados de perfil em background para:', userId);
      
      // Primeiro verificar se o perfil existe
      const { data: userData, error: profileError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        console.log('Perfil não encontrado, tentando criar automaticamente');
        
        if (profileError.message.includes('JSON object requested, multiple (or no) rows returned')) {
          // Tentar criar perfil automaticamente
          const { error: insertError } = await supabaseClient
            .from('profiles')
            .insert([{
              id: userId,
              name: session.user?.name || '',
              email: session.user?.email || ''
            }]);
          
          if (insertError) {
            console.error('Erro ao criar perfil automaticamente:', insertError);
            return null;
          }
          
          // Buscar perfil criado
          const { data: newProfileData } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          
          return newProfileData;
        }
      }
      
      return userData;
    } catch (error) {
      console.error('Erro ao buscar dados de perfil:', error);
      return null;
    }
  }, [supabaseClient, session.user]);

  const signOut = useCallback(async () => {
    if (supabaseClient) {
      try {
        await supabaseClient.auth.signOut()
      } catch (error) {
        console.error('Erro ao fazer logout:', error)
      }
    }
  }, [supabaseClient])

  const updateProfile = useCallback(async (data: Partial<UserData>) => {
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
  }, [supabaseClient, session.user])

  const resendVerificationEmail = useCallback(async (email: string) => {
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
  }, [supabaseClient])

  // Memoizar o valor do contexto para evitar recriações desnecessárias
  const contextValue = useMemo(() => ({
    session,
    signUp,
    signIn,
    signOut,
    updateProfile,
    retryConnection,
    isConnecting: isAttemptingConnection,
    connectionRetries: retryCount,
    resendVerificationEmail,
  }), [
    session, 
    signUp, 
    signIn, 
    signOut, 
    updateProfile, 
    retryConnection, 
    isAttemptingConnection, 
    retryCount, 
    resendVerificationEmail
  ])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  
  return context
} 