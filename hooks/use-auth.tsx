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

    // Configurar listener para mudanças na autenticação
    let authUnsubscribe: (() => void) | null = null;
    
    if (supabaseClient) {
      try {
        console.log('Configurando listener para mudanças na autenticação')
        
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
          console.log('Evento de autenticação:', event, 'Timestamp:', new Date().toISOString());
          setLastAuthEvent(event)
          
          // Log para debug
          if (session) {
            console.log('Novo estado de autenticação:', { 
              event, 
              userId: session.user.id,
              email: session.user.email
            })
          } else {
            console.log('Novo estado de autenticação: sessão nula')
          }
          
          // Definir timeout para não ficar esperando infinitamente
          const profileTimeout = setTimeout(() => {
            console.error('Timeout ao buscar perfil após mudança de estado de autenticação')
            
            if (session) {
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
          }, 5000) // 5 segundos
          
          // Quando o usuário faz login
          if (event === 'SIGNED_IN' && session) {
            try {
              setSession(prev => ({ ...prev, isLoading: true }))
              
              // Persistir a sessão no localStorage para recuperação futura
              if (typeof window !== 'undefined') {
                localStorage.setItem('supabase_session', JSON.stringify(session))
                console.log('Sessão salva no localStorage após login')
              }
              
              // Buscar dados do perfil na tabela profiles
              const { data: userData, error: profileError } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()
              
              console.log('Busca de perfil após login:', {
                sucesso: !profileError,
                perfilEncontrado: !!userData,
                userId: session.user.id
              })
              
              // Limpar o timeout pois a operação foi concluída
              clearTimeout(profileTimeout)
              
              if (profileError) {
                console.error('Erro ao buscar perfil após login:', profileError)
                
                // Verificar se é erro de perfil não encontrado
                if (profileError.message.includes('JSON object requested, multiple (or no) rows returned')) {
                  console.log('Perfil não encontrado, tentando criar automaticamente...')
                  
                  // Tentar criar o perfil automaticamente
                  const { error: insertError } = await supabaseClient
                    .from('profiles')
                    .insert([{
                      id: session.user.id,
                      name: session.user.user_metadata?.name || '',
                      email: session.user.email
                    }])
                  
                  if (insertError) {
                    console.error('Erro ao criar perfil automaticamente:', insertError)
                    // Continuar mesmo sem perfil
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
                    console.log('Perfil criado com sucesso após login')
                    
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
                    } else {
                      // Se não conseguir buscar o perfil recém-criado
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
                  }
                } else {
                  // Se for outro tipo de erro
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
                // Perfil encontrado com sucesso
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
                });
                console.log('Perfil carregado com sucesso, autenticação completa.');
              }
            } catch (profileError) {
              // Limpar o timeout se houver exceção
              clearTimeout(profileTimeout);
              
              console.error('Erro ao buscar perfil durante mudança de estado:', profileError);
              
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
              });
            }
          }
          // Se houver uma sessão mas não é um evento de login (já estava logado)
          else if (session && event !== 'SIGNED_IN') {
            console.log('Sessão ativa detectada:', event);
            
            // Limpar o timeout pois não vamos precisar buscar o perfil agora
            clearTimeout(profileTimeout);
            
            // Atualizar o estado da sessão
            setSession(prev => {
              // Se já temos os dados do usuário, manter eles
              if (prev.user) {
                return {
                  ...prev,
                  session,
                  error: null,
                  isLoading: false
                };
              }
              
              // Caso contrário, usar apenas os dados básicos do usuário
              return {
                user: {
                  id: session.user.id,
                  email: session.user.email || '',
                  name: session.user.user_metadata?.name,
                  created_at: session.user.created_at,
                },
                session,
                error: null,
                isLoading: false,
              };
            });
          }
          // Quando o usuário faz logout
          else if (event === 'SIGNED_OUT') {
            console.log('Usuário desconectado');
            
            // Limpar o timeout pois não vamos buscar o perfil
            clearTimeout(profileTimeout);
            
            // Limpar a sessão do localStorage
            if (typeof window !== 'undefined') {
              localStorage.removeItem('supabase_session');
            }
            
            // Limpar o estado da sessão
            setSession({
              user: null,
              session: null,
              error: null,
              isLoading: false,
            });
          }
        });
        
        authUnsubscribe = () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Erro ao configurar listener de autenticação:', error);
      }
    }
    
    // Limpar a inscrição no evento de autenticação ao desmontar
    return () => {
      if (authUnsubscribe) {
        console.log('Removendo listener de autenticação');
        authUnsubscribe();
      }
    };
  }, [supabaseClient, isConnected, toast]);

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
  }

  // Login de usuário
  const signIn = async (email: string, password: string) => {
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
      
      // Tentativa de login normal
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      })

      // Diagnóstico detalhado da resposta do Supabase
      console.log('Resposta de autenticação:', {
        sucesso: !error,
        temDados: !!data,
        temUsuario: !!data?.user,
        emailConfirmado: data?.user?.email_confirmed_at ? 'Sim' : 'Não',
        userData: data?.user ? {
          id: data.user.id,
          email: data.user.email,
          temMetadata: !!data.user.user_metadata,
          metadata: data.user.user_metadata || {}
        } : 'Sem dados de usuário'
      });

      // Se houver erro, analisar causas comuns
      if (error) {
        console.error('Erro na API do Supabase:', error);
        
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

      let profileNotFound = false;
      
      // Verificar se o perfil do usuário existe
      try {
        console.log('Verificando perfil do usuário:', data.user.id);
        
        const { data: profileData, error: profileError } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()
        
        // Diagnóstico do perfil  
        console.log('Resposta da busca de perfil:', {
          sucesso: !profileError,
          perfilEncontrado: !!profileData,
          perfilId: profileData?.id || 'N/A',
          mensagemErro: profileError?.message || 'Sem erro'
        });
          
        if (profileError) {
          console.error('Erro ao buscar perfil após login:', profileError)
          
          // Verificar se o erro é de perfil não encontrado
          if (profileError.message.includes('JSON object requested, multiple (or no) rows returned')) {
            console.log('Perfil não encontrado para o usuário:', email, 'Redirecionando para cadastro.');
            profileNotFound = true;
            
            // Criar perfil automaticamente em vez de fazer logout
            try {
              console.log('Tentando criar perfil automaticamente...');
              const { error: insertError } = await supabaseClient
                .from('profiles')
                .insert([{
                  id: data.user.id,
                  name: data.user.user_metadata?.name || '',
                  email: data.user.email
                }]);
                
              if (insertError) {
                console.error('Erro ao criar perfil automaticamente:', insertError);
                // Se não conseguir criar o perfil, fazer logout
                await supabaseClient.auth.signOut();
              } else {
                console.log('Perfil criado com sucesso! Continuando login');
                profileNotFound = false;
              }
            } catch (insertError) {
              console.error('Exceção ao criar perfil automaticamente:', insertError);
              // Fazer logout em caso de erro
              await supabaseClient.auth.signOut();
            }
          }
        } else {
          console.log('Perfil encontrado com sucesso:', profileData.id);
        }
      } catch (profileError) {
        console.error('Erro ao verificar perfil após login:', profileError)
      }

      return { error: null, profileNotFound }
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