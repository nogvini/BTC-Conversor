"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { type AuthSession, type UserData } from '@/lib/supabase'
import { useSupabaseRetry } from './use-supabase-retry'
import { useToast } from './use-toast'

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
  const { 
    client: supabaseClient, 
    isConnected, 
    retryConnection, 
    isAttemptingConnection, 
    retryCount,
    broadcastChange 
  } = useSupabaseRetry()
  
  // Estado local de sessão
  const [session, setSession] = useState<AuthSession>({
    user: null,
    session: null,
    error: null,
    isLoading: true,
  })
  
  // Usado para exibir status de diagnóstico
  const [lastAuthEvent, setLastAuthEvent] = useState<string>('nenhum')

  // Effect para log de diagnóstico
  useEffect(() => {
    console.log('Estado atual da autenticação:', {
      usuarioLogado: !!session.user,
      userId: session.user?.id || 'nenhum',
      nomeUsuario: session.user?.name || 'não definido',
      carregando: session.isLoading,
      erro: session.error ? session.error.message : 'nenhum',
      clienteConectado: isConnected,
      ultimoEvento: lastAuthEvent
    })
  }, [session, isConnected, lastAuthEvent])
  
  // Efeito para buscar a sessão quando o cliente estiver conectado
  useEffect(() => {
    // Não fazer nada se o cliente supabase não estiver disponível
    if (!supabaseClient || !isConnected) {
      console.log('Cliente Supabase indisponível ou não conectado')
      return
    }
    
    // Verificar se a sessão expirou antes de tentar usar
    if (typeof window !== 'undefined') {
      try {
        const sessionStr = localStorage.getItem('supabase_session');
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          if (session && session.expires_at) {
            const expiresAt = session.expires_at * 1000; // Converter para milissegundos
            if (Date.now() > expiresAt) {
              console.log('Sessão expirada detectada no localStorage, limpando dados');
              localStorage.removeItem('supabase_session');
              // Definir sessão como nula sem disparar erros
              setSession({
                user: null,
                session: null,
                error: new Error('Sessão expirada'),
                isLoading: false,
              });
              setLastAuthEvent('sessão expirada');
              return; // Sair da função para evitar tentativa de usar sessão inválida
            }
          }
        }
      } catch (e) {
        console.warn('Erro ao verificar expiração de sessão:', e);
      }
    }
    
    const fetchSession = async () => {
      try {
        setSession(prev => ({ ...prev, isLoading: true }))
        console.log('Iniciando busca de sessão')
        
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
            
            // Buscar dados do perfil na tabela profiles
            const { data: userData, error: profileError } = await supabaseClient
              .from('profiles')
              .select('*')
              .eq('id', data.session.user.id)
              .single()
            
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

    // Configurar listener para mudanças na sessão de autenticação
    if (isConnected && supabaseClient) {
      const {
        data: { subscription },
      } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log(`Evento de autenticação recebido: ${event}`)
        setLastAuthEvent(`evento ${event}`)

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          // Se estiver autenticado, carregar os dados do perfil
          setSession(prev => ({ ...prev, isLoading: true }))
          
          // IMPORTANTE: Verificar se a sessão está realmente válida
          if (session) {
            try {
              // Verificar se o token está expirado
              const expiresAt = session.expires_at * 1000; // Converter para milissegundos
              if (Date.now() > expiresAt) {
                console.warn('Token expirado detectado em evento de autenticação');
                
                // Invalidar esta sessão e forçar logout
                await supabaseClient.auth.signOut();
                
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('supabase_session');
                }
                
                setSession({
                  user: null,
                  session: null,
                  error: new Error('Sessão expirada'),
                  isLoading: false,
                });
                
                setLastAuthEvent('sessão expirada detectada em evento');
                return; // Sair para evitar processamento de sessão expirada
              }
            } catch (e) {
              console.warn('Erro ao verificar expiração em evento de autenticação:', e);
            }
          }
          
          if (session) {
            try {
              // Salvar sessão no localStorage para recuperação futura
              if (typeof window !== 'undefined') {
                localStorage.setItem('supabase_session', JSON.stringify(session))
              }
              
              // Enviar evento de autenticação para outras abas
              if (broadcastChange) {
                broadcastChange('auth_state_changed', { event, sessionExists: !!session });
              }
              
              // Buscar perfil do usuário
              const { data: userData, error: profileError } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()
                
              if (profileError) {
                console.error('Erro ao buscar perfil após autenticação:', profileError)
                
                // Verificar se o perfil não existe
                if (profileError.message.includes('JSON object requested, multiple (or no) rows returned')) {
                  console.log('Perfil não encontrado após autenticação, tentando criar...')
                  
                  // Tentar criar o perfil para o usuário logado
                  const { error: insertError } = await supabaseClient
                    .from('profiles')
                    .insert([{
                      id: session.user.id,
                      name: session.user.user_metadata?.name || '',
                      email: session.user.email
                    }])
                  
                  if (insertError) {
                    console.error('Erro ao criar perfil após autenticação:', insertError)
                  } else {
                    console.log('Perfil criado com sucesso após autenticação')
                    
                    // Buscar o perfil recém-criado
                    const { data: newUserData } = await supabaseClient
                      .from('profiles')
                      .select('*')
                      .eq('id', session.user.id)
                      .single()
                    
                    if (newUserData) {
                      setSession({
                        user: {
                          id: session.user.id,
                          email: session.user.email || '',
                          name: newUserData.name || session.user.user_metadata?.name,
                          avatar_url: newUserData.avatar_url,
                          created_at: session.user.created_at,
                        },
                        session,
                        error: null,
                        isLoading: false,
                      })
                      return
                    }
                  }
                }
                
                // Continuar mesmo sem dados de perfil completos
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
              } else {
                // Perfil encontrado com sucesso
                setSession({
                  user: {
                    id: session.user.id,
                    email: session.user.email || '',
                    name: userData.name || session.user.user_metadata?.name,
                    avatar_url: userData.avatar_url,
                    created_at: session.user.created_at,
                  },
                  session,
                  error: null,
                  isLoading: false,
                })
              }
            } catch (err) {
              console.error('Erro ao processar eventos de autenticação:', err)
              setSession({
                user: session ? {
                  id: session.user.id,
                  email: session.user.email || '',
                  name: session.user.user_metadata?.name,
                  created_at: session.user.created_at,
                } : null,
                session,
                error: null,
                isLoading: false,
              })
            }
          }
        } else if (event === 'SIGNED_OUT') {
          // Limpar a sessão salva no localStorage
          if (typeof window !== 'undefined') {
            localStorage.removeItem('supabase_session')
          }
          
          // Enviar evento de logout para outras abas
          if (broadcastChange) {
            broadcastChange('auth_state_changed', { event, signedOut: true });
          }
          
          setSession({
            user: null,
            session: null,
            error: null,
            isLoading: false,
          })
        }
      })

      // Limpar subscription ao desmontar o componente
      return () => {
        subscription.unsubscribe()
      }
    }
  }, [supabaseClient, isConnected, broadcastChange])
  
  // Efeito para escutar eventos de sincronização entre abas
  useEffect(() => {
    // Verificar se o cliente tem a funcionalidade de broadcasting
    const hasCustomClient = !!(supabaseClient && isConnected && typeof window !== 'undefined');
    
    // Função para processar eventos de autenticação recebidos de outras abas
    const processAuthEvents = async (event: MessageEvent) => {
      if (event.data.type === 'supabase_data_change' && event.data.changeType === 'auth_state_changed') {
        console.log('Recebido evento de autenticação de outra aba:', event.data);
        
        // Se recebeu evento de logout, atualizar o estado local
        if (event.data.data.signedOut) {
          setSession({
            user: null,
            session: null, 
            error: null,
            isLoading: false
          });
          return;
        }
        
        // Se recebeu evento de login, recarregar a sessão
        if (event.data.data.event === 'SIGNED_IN' && hasCustomClient) {
          // Recarregar dados da sessão
          try {
            const { data, error } = await supabaseClient.auth.getSession();
            if (!error && data.session) {
              // Recarregar perfil
              const { data: userData } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', data.session.user.id)
                .single();
                
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
              });
            }
          } catch (error) {
            console.error('Erro ao sincronizar sessão entre abas:', error);
          }
        }
      }
    };
    
    // Configurar escuta para eventos de comunicação entre abas
    if (typeof window !== 'undefined') {
      window.addEventListener('message', processAuthEvents);
      
      return () => {
        window.removeEventListener('message', processAuthEvents);
      };
    }
  }, [supabaseClient, isConnected]);

  // Método para cadastro de usuário
  const signUp = async (email: string, password: string, name?: string) => {
    try {
      if (!supabaseClient) {
        throw new Error('Cliente Supabase não disponível')
      }
      
      // Opções para incluir metadados do usuário (nome)
      const options = name ? { 
        data: { name },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      } : {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
      
      // Chamar a API de cadastro
      const { error } = await supabaseClient.auth.signUp({ 
        email, 
        password,
        options
      })
      
      // Se ocorreu um erro, lançar para tratamento
      if (error) {
        console.error('Erro durante cadastro:', error)
        
        // Tratar mensagens de erro específicas
        if (error.message.includes('email already in use')) {
          toast({
            title: 'E-mail já cadastrado',
            description: 'Este e-mail já está sendo utilizado por outro usuário.',
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'Erro no cadastro',
            description: error.message,
            variant: 'destructive',
          })
        }
        
        return { error }
      }
      
      // Sucesso
      toast({
        title: 'Cadastro realizado',
        description: 'Verifique seu e-mail para confirmar o cadastro.',
        variant: 'default',
      })
      
      // Notificar outras abas
      if (broadcastChange) {
        broadcastChange('signup_completed', { email });
      }
      
      return { error: null }
    } catch (err) {
      console.error('Erro inesperado durante cadastro:', err)
      toast({
        title: 'Erro no cadastro',
        description: 'Ocorreu um erro inesperado. Por favor, tente novamente.',
        variant: 'destructive',
      })
      return { error: err as Error }
    }
  }

  // Método para login de usuário
  const signIn = async (email: string, password: string) => {
    try {
      if (!supabaseClient) {
        throw new Error('Cliente Supabase não disponível')
      }
      
      // Chamar a API de login
      const { data, error } = await supabaseClient.auth.signInWithPassword({ 
        email, 
        password 
      })
      
      // Se ocorreu um erro, lançar para tratamento
      if (error) {
        console.error('Erro durante login:', error)
        
        // Exibir toast com mensagem de erro
        toast({
          title: 'Falha no login',
          description: error.message,
          variant: 'destructive',
        })
        
        return { error }
      }
      
      // Se o login foi bem-sucedido, mas não há dados de sessão
      if (!data.session) {
        console.error('Login sem sessão retornada')
        const customError = new Error('Falha na autenticação: sessão não criada')
        return { error: customError }
      }
      
      // Se chegou aqui, o login foi bem-sucedido
      console.log('Login bem-sucedido, verificando perfil do usuário')
      
      // Verificar se o usuário tem um perfil
      try {
        const { data: profileData, error: profileError } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()
        
        // Se ocorreu erro na busca do perfil
        if (profileError) {
          console.error('Erro ao buscar perfil após login:', profileError)
          
          // Verificar se o problema é que o perfil não existe
          if (profileError.message.includes('JSON object requested, multiple (or no) rows returned')) {
            console.log('Perfil não encontrado para usuário autenticado, será necessário criar')
            return { error: null, profileNotFound: true }
          }
        }
        
        // Perfil encontrado com sucesso ou não era possível determinar
        console.log('Perfil verificado após login')
        
        // Sucesso no login
        toast({
          title: 'Login realizado',
          description: 'Bem-vindo de volta!',
          variant: 'default',
        })
        
        // Notificar outras abas
        if (broadcastChange) {
          broadcastChange('signin_completed', { userId: data.user.id });
        }
        
        return { error: null }
      } catch (profileErr) {
        console.error('Erro inesperado ao verificar perfil:', profileErr)
        
        // Mesmo com erro no perfil, o login foi realizado
        toast({
          title: 'Login realizado',
          description: 'Bem-vindo de volta!',
          variant: 'default',
        })
        
        // Notificar outras abas
        if (broadcastChange) {
          broadcastChange('signin_completed', { userId: data.user.id });
        }
        
        return { error: null }
      }
    } catch (err) {
      console.error('Erro inesperado durante login:', err)
      toast({
        title: 'Falha no login',
        description: 'Ocorreu um erro inesperado. Por favor, tente novamente.',
        variant: 'destructive',
      })
      return { error: err as Error }
    }
  }

  // Método para logout do usuário
  const signOut = async () => {
    if (!supabaseClient) return
    
    // Chamar a API de logout
    await supabaseClient.auth.signOut()
    
    // Limpar a sessão
    setSession({
      user: null,
      session: null,
      error: null,
      isLoading: false,
    })
    
    // Limpar a sessão no localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('supabase_session')
    }
    
    // Notificar outras abas
    if (broadcastChange) {
      broadcastChange('signout_completed', { time: Date.now() });
    }
    
    // Mostrar toast de sucesso
    toast({
      title: 'Logout realizado',
      description: 'Você foi desconectado com sucesso.',
      variant: 'default',
    })
  }

  // Método para atualização do perfil do usuário
  const updateProfile = async (data: Partial<UserData>) => {
    if (!supabaseClient) {
      return { error: new Error('Cliente Supabase não disponível') }
    }
    
    if (!session.user?.id) {
      return { error: new Error('Usuário não autenticado') }
    }
    
    try {
      // Atualizar os dados na tabela de perfis
      const { error } = await supabaseClient
        .from('profiles')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id)
      
      if (error) {
        console.error('Erro ao atualizar perfil:', error)
        toast({
          title: 'Erro ao atualizar perfil',
          description: error.message,
          variant: 'destructive',
        })
        return { error }
      }
      
      // Atualizar o estado local
      setSession(prev => ({
        ...prev,
        user: {
          ...prev.user!,
          ...data,
        }
      }))
      
      // Notificar outras abas
      if (broadcastChange) {
        broadcastChange('profile_updated', { userId: session.user.id, data });
      }
      
      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram atualizadas com sucesso.',
        variant: 'default',
      })
      
      return { error: null }
    } catch (err) {
      console.error('Erro inesperado ao atualizar perfil:', err)
      toast({
        title: 'Erro ao atualizar perfil',
        description: 'Ocorreu um erro inesperado. Por favor, tente novamente.',
        variant: 'destructive',
      })
      return { error: err as Error }
    }
  }
  
  // Método para reenviar email de verificação
  const resendVerificationEmail = async (email: string) => {
    if (!supabaseClient) {
      return { error: new Error('Cliente Supabase não disponível'), sent: false }
    }
    
    try {
      // Chamar a API para reenvio de email
      const { error } = await supabaseClient.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (error) {
        console.error('Erro ao reenviar email de verificação:', error)
        toast({
          title: 'Erro ao reenviar email',
          description: error.message,
          variant: 'destructive',
        })
        return { error, sent: false }
      }
      
      toast({
        title: 'Email reenviado',
        description: 'Verifique sua caixa de entrada e siga as instruções para confirmar seu cadastro.',
        variant: 'default',
      })
      
      return { error: null, sent: true }
    } catch (err) {
      console.error('Erro inesperado ao reenviar email:', err)
      toast({
        title: 'Erro ao reenviar email',
        description: 'Ocorreu um erro inesperado. Por favor, tente novamente.',
        variant: 'destructive',
      })
      return { error: err as Error, sent: false }
    }
  }

  // Valores a serem disponibilizados no contexto
  const value = {
    session,
    signUp,
    signIn,
    signOut,
    updateProfile,
    retryConnection,
    isConnecting: isAttemptingConnection,
    connectionRetries: retryCount,
    resendVerificationEmail
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook para acessar o contexto de autenticação
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
} 