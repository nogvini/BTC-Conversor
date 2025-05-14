"use client"

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { type AuthSession, type UserData } from '@/lib/supabase'
import { useSupabaseRetry } from './use-supabase-retry'
import { useToast } from './use-toast'
import { useRouter, usePathname } from 'next/navigation'

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
  const router = useRouter()
  const pathname = usePathname()
  
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
        
        // Verificar se já existe uma sessão persistida no localStorage
        const persistedSession = typeof window !== 'undefined' ? localStorage.getItem('supabase_session') : null
        
        if (persistedSession) {
          try {
            // Adicionar verificação para garantir que persistedSession não é "null" ou "undefined" como string literal
            if (persistedSession && persistedSession !== "null" && persistedSession !== "undefined") {
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
                  if (typeof window !== 'undefined') localStorage.removeItem('supabase_session')
                } else {
                  console.log('Sessão restaurada com sucesso do localStorage')
                }
              } else {
                console.log('Sessão persistida expirada, removendo do localStorage')
                if (typeof window !== 'undefined') localStorage.removeItem('supabase_session')
              }
            } else {
              console.log('Sessão persistida encontrada, mas era uma string "null" ou "undefined", removendo.');
              if (typeof window !== 'undefined') localStorage.removeItem('supabase_session');
            }
          } catch (e) {
            console.error('Erro crítico ao processar sessão persistida (JSON.parse falhou ou estrutura inesperada):', e)
            if (typeof window !== 'undefined') localStorage.removeItem('supabase_session')
            // Considerar não prosseguir com a lógica de sessão aqui e talvez
            // forçar um estado de "nenhuma sessão" para evitar mais erros.
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
            
            // Buscar dados do perfil na tabela profiles com timeout
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
          // Limpar o timeout se não houver sessão
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
        console.error('[signIn] ERRO CRÍTICO: Cliente Supabase não disponível.');
        throw new Error('Erro de configuração do sistema. Entre em contato com o administrador.')
      }
      
      // Verificar se as variáveis de ambiente estão definidas
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('[signIn] ERRO CRÍTICO: Variáveis de ambiente do Supabase não definidas.');
        throw new Error('Erro de configuração do sistema. Entre em contato com o administrador.')
      }
      
      // Verificar se temos uma sessão em cache que podemos usar
      let cachedSession = null;
      try {
        console.log('[signIn] Verificando sessão no localStorage...');
        const persistedSession = localStorage.getItem('supabase_session');
        if (persistedSession) {
          const parsed = JSON.parse(persistedSession);
          if (parsed.user?.email === email && parsed.expires_at && parsed.expires_at * 1000 > Date.now()) {
            console.log('[signIn] Usando sessão em cache para acelerar login.');
            cachedSession = parsed;
            
            console.log('[signIn] Tentando restaurar sessão do cache via supabaseClient.auth.setSession...');
            const { error: sessionError } = await supabaseClient.auth.setSession({
              access_token: cachedSession.access_token,
              refresh_token: cachedSession.refresh_token
            });
            console.log('[signIn] Resultado de supabaseClient.auth.setSession:', { sessionError });
            
            if (!sessionError) {
              console.log('[signIn] Sessão restaurada do cache com sucesso.');
              
              console.log('[signIn] Chamando fetchProfileData AGORA (await) após restaurar sessão do cache...');
              await fetchProfileData(cachedSession.user.id);
              
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
              console.log('[signIn] Estado da sessão atualizado com dados do cache.');
              
              toast({
                title: "Bem-vindo de volta!",
                description: "Login realizado com sucesso.",
                duration: 3000,
              });
              
              console.log('[signIn] Login via cache bem-sucedido. Retornando...');
              return { error: null };
            } else {
              console.log('[signIn] Sessão em cache inválida, prosseguindo com login normal.');
            }
          }
        }
      } catch (cacheError) {
        console.error('[signIn] Erro ao tentar restaurar sessão do cache:', cacheError);
      }
      
      console.log('[signIn] Tentativa de login normal via supabaseClient.auth.signInWithPassword...');
      
      // LOG DETALHADO DO CLIENTE SUPABASE
      console.log('[signIn] Detalhes do supabaseClient ANTES de signInWithPassword:', supabaseClient);
      if (supabaseClient && supabaseClient.auth) {
        console.log('[signIn] supabaseClient.auth existe.');
        console.log('[signIn] typeof supabaseClient.auth.signInWithPassword:', typeof supabaseClient.auth.signInWithPassword);
      } else {
        console.error('[signIn] ERRO CRÍTICO: supabaseClient ou supabaseClient.auth não está definido ANTES de signInWithPassword!');
      }
      // FIM DO LOG DETALHADO

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
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
      console.log('[signIn] Iniciando busca de perfil AGORA (await)...');
      
      const profileData = await fetchProfileData(data.user.id);
      if (profileData) {
        setSession(prev => ({
          ...prev,
          user: {
            ...prev.user!,
            name: profileData.name || prev.user?.name || '',
            avatar_url: profileData.avatar_url
          }
        }));
        console.log('[signIn] Estado da sessão atualizado com dados completos do perfil.');
      }
      
      console.log('[signIn] Login normal bem-sucedido. Retornando...');
      return { error: null };
    } catch (error) {
      console.error('[signIn] Erro no bloco catch principal:', error);
      
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
    console.log('[fetchProfileData] Iniciando para userId:', userId);
    if (!supabaseClient || !userId) {
      console.log('[fetchProfileData] Cliente Supabase ou userId ausente. Retornando null.', { supabaseClientExists: !!supabaseClient, userId });
      return null;
    }
    
    try {
      console.log('[fetchProfileData] Buscando dados de perfil via supabaseClient.from(\'profiles\').select...');
      const { data: userData, error: profileError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      console.log('[fetchProfileData] Resultado de supabaseClient.from(\'profiles\').select:', { userData, profileError });
      
      if (profileError) {
        console.log('[fetchProfileData] Perfil não encontrado ou erro na busca. Tentando criar automaticamente...', profileError.message);
        
        if (profileError.message.includes('JSON object requested, multiple (or no) rows returned')) {
          console.log('[fetchProfileData] Tentando criar perfil via supabaseClient.from(\'profiles\').insert...');
          const { error: insertError } = await supabaseClient
            .from('profiles')
            .insert([{
              id: userId,
              name: session.user?.name || '',
              email: session.user?.email || ''
            }]);
          console.log('[fetchProfileData] Resultado de supabaseClient.from(\'profiles\').insert:', { insertError });
          
          if (insertError) {
            console.error('[fetchProfileData] Erro ao criar perfil automaticamente:', insertError);
            return null;
          }
          
          console.log('[fetchProfileData] Perfil criado. Buscando perfil recém-criado...');
          const { data: newProfileData } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          console.log('[fetchProfileData] Resultado da busca do novo perfil:', { newProfileData });
          
          return newProfileData;
        }
      }
      
      console.log('[fetchProfileData] Perfil encontrado. Retornando userData.', userData);
      return userData;
    } catch (error) {
      console.error('[fetchProfileData] Erro no bloco catch:', error);
      return null;
    }
  }, [supabaseClient, session.user]);

  const signOut = useCallback(async () => {
    console.log('[signOut] Iniciando processo de logout...');
    if (supabaseClient) {
      try {
        const { error } = await supabaseClient.auth.signOut();

        if (error) {
          console.error('Erro na API do Supabase ao fazer logout:', error);
          toast({
            title: "Erro ao sair",
            description: error.message || "Não foi possível encerrar a sessão. Tente novamente.",
            variant: "destructive",
          });
          // Mesmo com erro na API, tentar limpar o estado local
        }
        
        console.log('[signOut] Sessão encerrada no Supabase.');

      } catch (error: any) {
        console.error('Exceção ao tentar supabaseClient.auth.signOut():', error);
        toast({
          title: "Erro inesperado ao sair",
          description: error.message || "Ocorreu um problema ao tentar encerrar a sessão.",
          variant: "destructive",
        });
        // Mesmo com exceção, tentar limpar o estado local
      }
    }

    // Limpar estado da sessão local independentemente do resultado da API (para garantir que o UI reaja)
    setSession({
      user: null,
      session: null,
      error: null,
      isLoading: false, // Parar o loading, pois o usuário está deslogado
    });
    setLastAuthEvent('logout efetuado');
    console.log('[signOut] Estado da sessão local limpo.');

    // Remover sessão do localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('supabase_session');
      console.log('[signOut] Sessão removida do localStorage.');
    }

    // Redirecionar para a página de autenticação
    // Usar um pequeno timeout para dar tempo ao toast de ser exibido antes do redirecionamento
    toast({
      title: "Você saiu!",
      description: "Sessão encerrada com sucesso.",
      variant: "default", // Usar default ou success
    });
    
    // A lógica de redirecionamento no useEffect principal do AuthProvider
    // deve pegar a mudança de estado (session.user se tornando null)
    // e redirecionar para /auth se o usuário estiver em uma página protegida.
    // Se o usuário já estiver em uma página pública, ele permanecerá lá, o que é aceitável.
    // Para forçar um redirecionamento para /auth sempre após o logout, podemos adicionar:
    if (pathname !== '/auth') {
        router.push('/auth');
        console.log('[signOut] Redirecionando para /auth após logout.');
    }

  }, [supabaseClient, toast, router, pathname]); // Adicionado router e pathname às dependências

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

  // LOGS PARA DEBUG
  useEffect(() => {
    console.log("[AuthContext Debug] Context Value:", {
      sessionExists: !!contextValue.session,
      isSessionLoading: contextValue.session.isLoading,
      signInType: typeof contextValue.signIn,
      signUpType: typeof contextValue.signUp,
      signOutType: typeof contextValue.signOut,
      updateProfileType: typeof contextValue.updateProfile,
      retryConnectionType: typeof contextValue.retryConnection,
      isConnectingValue: contextValue.isConnecting,
      resendVerificationEmailType: typeof contextValue.resendVerificationEmail,
    });
    console.log("[AuthContext Debug] Supabase Client Status:", {
      supabaseClientExists: !!supabaseClient,
      isConnectedValue: isConnected,
      isAttemptingConnectionValue: isAttemptingConnection
    });
  }, [contextValue, supabaseClient, isConnected, isAttemptingConnection]);

  // Efeito para redirecionamento baseado no estado da sessão e rota atual
  useEffect(() => {
    const publicRoutes = ['/auth', '/login', '/register'];
    const isLoading = typeof session.isLoading === 'boolean' ? session.isLoading : true;

    if (!isLoading) {
      // Se o usuário ESTÁ logado E está tentando acessar uma rota PÚBLICA (como /auth, /login)
      if (session.user && publicRoutes.includes(pathname)) {
        // Então redireciona para a página inicial (ou dashboard)
        console.log(`[AuthGuard] Usuário autenticado acessando rota pública '${pathname}'. Redirecionando para '/'.`);
        if (pathname !== '/') { // Evitar redirecionamento para si mesmo se já estiver em /
            router.push('/');
        }
      }
      // Se o usuário NÃO está logado E está tentando acessar uma rota que NÃO é pública
      else if (!session.user && !publicRoutes.includes(pathname)) {
        // Então redireciona para a página de autenticação
        console.log(`[AuthGuard] Acesso não autenticado a '${pathname}'. Redirecionando para '/auth'.`);
        if (pathname !== '/auth') { // Evitar redirecionamento para si mesmo se já estiver em /auth
          router.push('/auth');
        }
      }
    }
  }, [session.user, session.isLoading, pathname, router]);

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