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
              supabaseClient.auth.setSession({
                access_token: savedSession.access_token,
                refresh_token: savedSession.refresh_token
              })
            } else {
              console.log('Sessão persistida expirada, removendo do localStorage')
              localStorage.removeItem('supabase_session')
            }
          } catch (e) {
            console.error('Erro ao processar sessão persistida:', e)
            localStorage.removeItem('supabase_session')
          }
        }
        
        // Verificar se há uma sessão ativa
        const { data, error } = await supabaseClient.auth.getSession()
        
        if (error) {
          throw error
        }
        
        if (data?.session) {
          try {
            // Buscar dados adicionais do usuário se necessário
            const { data: userData, error: profileError } = await supabaseClient
              .from('profiles')
              .select('*')
              .eq('id', data.session.user.id)
              .single()
              
            if (profileError) {
              console.error('Erro ao buscar perfil:', profileError)
              
              // Mostrar aviso que o perfil não existe
              if (profileError.message.includes('JSON object requested, multiple (or no) rows returned')) {
                console.log('Perfil não encontrado durante fetchSession. Tentando criar automaticamente...');
                  
                // Tentar criar o perfil automaticamente
                try {
                  const { error: insertError } = await supabaseClient
                    .from('profiles')
                    .insert([{
                      id: data.session.user.id,
                      name: data.session.user.user_metadata?.name || '',
                      email: data.session.user.email
                    }]);
                    
                  if (insertError) {
                    console.error('Erro ao criar perfil automaticamente durante fetchSession:', insertError);
                    // Mostrar mensagem de erro e fazer logout
                    toast({
                      title: "Erro ao criar perfil",
                      description: "Não foi possível criar seu perfil. Por favor, tente novamente.",
                      variant: "destructive",
                    });
                    
                    await supabaseClient.auth.signOut();
                    
                    setSession({
                      user: null,
                      session: null,
                      error: null,
                      isLoading: false,
                    });
                    return;
                  } else {
                    console.log('Perfil criado com sucesso durante fetchSession!');
                    // Continuar com os dados do usuário recém-criado
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
                    });
                    return;
                  }
                } catch (insertError) {
                  console.error('Exceção ao criar perfil automaticamente durante fetchSession:', insertError);
                  // Fazer logout em caso de erro
                  await supabaseClient.auth.signOut();
                  
                  setSession({
                    user: null,
                    session: null,
                    error: null,
                    isLoading: false,
                  });
                  return;
                }
              }
              
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
              return
            }
              
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
    let authUnsubscribe: (() => void) | null = null;
    
    if (isConnected && supabaseClient) {
      try {
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
          console.log('Evento de autenticação:', event, 'Timestamp:', new Date().toISOString());
          
          // Persistir a sessão no localStorage quando o usuário fizer login
          if (event === 'SIGNED_IN' && session) {
            console.log('Login bem-sucedido! Salvando sessão e iniciando carregamento de perfil...');
            localStorage.setItem('supabase_session', JSON.stringify(session));
            
            // Definir um timeout para evitar espera infinita
            const profileTimeout = setTimeout(() => {
              console.log('ALERTA: Timeout ao carregar perfil após autenticação');
              
              // Se ainda estiver carregando após o timeout, atualizar o estado mesmo sem perfil
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
            }, 5000); // 5 segundos de timeout
            
            try {
              // Buscar dados adicionais do usuário
              const { data: userData, error: profileError } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
              
              // Limpar o timeout porque recebemos uma resposta
              clearTimeout(profileTimeout);
              
              if (profileError) {
                console.error('Erro ao buscar perfil durante mudança de estado:', profileError)
                
                // Mostrar aviso que o perfil não existe
                if (profileError.message.includes('JSON object requested, multiple (or no) rows returned')) {
                  console.log('Perfil não encontrado durante mudança de estado. Tentando criar automaticamente...');
                  
                  // Tentar criar o perfil automaticamente
                  try {
                    const { error: insertError } = await supabaseClient
                      .from('profiles')
                      .insert([{
                        id: session.user.id,
                        name: session.user.user_metadata?.name || '',
                        email: session.user.email
                      }]);
                      
                    if (insertError) {
                      console.error('Erro ao criar perfil automaticamente durante mudança de estado:', insertError);
                      // Mostrar mensagem de erro e fazer logout
                      toast({
                        title: "Erro ao criar perfil",
                        description: "Não foi possível criar seu perfil. Por favor, tente novamente.",
                        variant: "destructive",
                      });
                      
                      await supabaseClient.auth.signOut();
                      
                      setSession({
                        user: null,
                        session: null,
                        error: null,
                        isLoading: false,
                      });
                      return;
                    } else {
                      console.log('Perfil criado com sucesso durante mudança de estado!');
                      // Continuar com os dados do usuário recém-criado
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
                      return;
                    }
                  } catch (insertError) {
                    console.error('Exceção ao criar perfil automaticamente durante mudança de estado:', insertError);
                    // Fazer logout em caso de erro
                    await supabaseClient.auth.signOut();
                    
                    setSession({
                      user: null,
                      session: null,
                      error: null,
                      isLoading: false,
                    });
                    return;
                  }
                }
                
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
            console.log('Sessão ativa detectada (usuário já logado)');
            
            // Verificar se precisamos atualizar a sessão armazenada
            setSession(prevSession => {
              // Se já temos a mesma sessão, não fazer nada
              if (prevSession.session?.access_token === session.access_token) {
                console.log('Sessão já atualizada, mantendo estado atual');
                return prevSession;
              }
              
              console.log('Atualizando estado com sessão ativa');
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
          // Quando não há sessão e não é um evento de logout (sessão expirada ou inválida)
          else if (!session && event !== 'SIGNED_OUT') {
            console.log('Evento sem sessão ativa detectado:', event);
            setSession({
              user: null,
              session: null,
              error: null,
              isLoading: false,
            });
          }
          
          // Remover a sessão do localStorage quando o usuário fizer logout
          if (event === 'SIGNED_OUT') {
            console.log('Usuário deslogado, removendo sessão do localStorage');
            localStorage.removeItem('supabase_session');
            
            // Atualizar o estado após logout
            setSession({
              user: null,
              session: null,
              error: null,
              isLoading: false,
            });
            
            // Redirecionar não é necessário aqui pois é tratado nos componentes
          }
          
          // Tratar outros eventos de autenticação
          if (event === 'USER_UPDATED') {
            console.log('Dados do usuário foram atualizados');
            // Atualizar o estado com os novos dados se necessário
          }
        })
        
        // Salvar a função de cancelamento da inscrição
        authUnsubscribe = subscription.unsubscribe
      } catch (error) {
        console.error('Erro ao configurar listener de autenticação:', error)
      }
    }

    return () => {
      if (authUnsubscribe) {
        authUnsubscribe()
      }
    }
  }, [supabaseClient, isConnected, toast])

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