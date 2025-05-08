"use client";

import { createClient } from '@supabase/supabase-js'

// Verificar se estamos no navegador
const isBrowser = typeof window !== 'undefined'

// URLs fixas para debugging - use apenas em desenvolvimento
const fallbackUrl = 'https://sqnxrzndkppbwqdmvzer.supabase.co'
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxbnhyem5ka3BwYndxZG12emVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MDA0NDMsImV4cCI6MjA2MTk3NjQ0M30.yaMQFTEWoNT3OeOCq-P05w39hpe1ppDcMp4DR7gVMRw'

// Chave para identificar o cliente Supabase no armazenamento de sessão
const SUPABASE_INSTANCE_KEY = 'BTC_MONITOR_SUPABASE_INSTANCE_ACTIVE';
const SUPABASE_INSTANCE_TIMESTAMP = 'BTC_MONITOR_SUPABASE_LAST_ACTIVE';
const BROADCAST_CHANNEL_NAME = 'btc-monitor-supabase-coordination';

// Log para debugging
console.log('Ambiente Supabase:', { 
  isBrowser,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'definido' : 'indefinido',
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'definido' : 'indefinido',
});

// Variável para armazenar a instância única do cliente Supabase
let supabaseInstance = null;
// Canal de comunicação entre abas
let broadcastChannel = null;

// Inicializar canal de comunicação entre abas se estiver no navegador
if (isBrowser) {
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    
    // Escutar mensagens de outras abas
    broadcastChannel.onmessage = (event) => {
      if (event.data.type === 'supabase_instance_check') {
        // Responder com timestamp desta instância se ela for a principal
        if (sessionStorage.getItem(SUPABASE_INSTANCE_KEY) === 'primary') {
          broadcastChannel.postMessage({
            type: 'supabase_instance_response',
            timestamp: sessionStorage.getItem(SUPABASE_INSTANCE_TIMESTAMP)
          });
        }
      }
      else if (event.data.type === 'supabase_instance_response') {
        // Se recebeu resposta e esta não é a instância principal, verificar o timestamp
        if (sessionStorage.getItem(SUPABASE_INSTANCE_KEY) !== 'primary') {
          const otherTimestamp = parseInt(event.data.timestamp);
          const myTimestamp = parseInt(sessionStorage.getItem(SUPABASE_INSTANCE_TIMESTAMP) || '0');
          
          // Se a outra instância for mais antiga, esta deve se tornar secundária
          if (otherTimestamp < myTimestamp) {
            console.log('Outra aba tem uma instância Supabase mais antiga, esta aba será secundária');
            sessionStorage.setItem(SUPABASE_INSTANCE_KEY, 'secondary');
          }
        }
      }
    };
    
    // Verificar se já existe uma instância ativa em outra aba
    broadcastChannel.postMessage({ type: 'supabase_instance_check' });
    
  } catch (error) {
    console.warn('BroadcastChannel não suportado neste navegador:', error);
  }
}

/**
 * Cria um cliente Supabase para uso no lado do cliente
 * @returns Cliente Supabase ou null em caso de erro
 */
export const createSupabaseClient = () => {
  // Se já existe uma instância, retorná-la
  if (supabaseInstance) {
    return supabaseInstance;
  }
  
  // Verificar coordenação entre abas se estiver no navegador
  if (isBrowser) {
    // Se não houver registro no sessionStorage, assumir que é a instância primária
    if (!sessionStorage.getItem(SUPABASE_INSTANCE_KEY)) {
      sessionStorage.setItem(SUPABASE_INSTANCE_KEY, 'primary');
      sessionStorage.setItem(SUPABASE_INSTANCE_TIMESTAMP, Date.now().toString());
      console.log('Esta é a instância primária do Supabase');
    }
    
    // Se for instância secundária, retornar uma implementação mínima
    if (sessionStorage.getItem(SUPABASE_INSTANCE_KEY) === 'secondary') {
      console.log('Esta é uma instância secundária do Supabase, usando implementação mínima');
      // Implementação mínima para evitar erros, mas sem criar um cliente real
      return {
        auth: {
          getSession: async () => ({ data: { session: null }, error: null }),
          onAuthStateChange: () => ({ data: null, error: null, subscription: { unsubscribe: () => {} } }),
          signOut: async () => ({ error: null }),
        },
        from: () => ({ 
          select: () => ({ 
            eq: () => ({
              single: async () => ({ data: null, error: null })
            }),
            order: () => ({
              limit: () => ({
                eq: () => ({
                  range: () => ({
                    range: () => ({
                      then: (cb) => cb({ data: [], error: null }),
                    })
                  })
                }),
                then: (cb) => cb({ data: [], error: null }),
              })
            }),
            range: () => ({
              then: (cb) => cb({ data: [], error: null }),
            }),
          }), 
          insert: () => ({ 
            select: () => ({ then: (cb) => cb({ data: null, error: null }) })
          }),
          update: () => ({
            eq: () => ({ then: (cb) => cb({ data: null, error: null }) })
          }),
          delete: () => ({
            eq: () => ({ then: (cb) => cb({ data: null, error: null }) })
          }),
        }),
        storage: { 
          from: () => ({ 
            upload: async () => ({ data: null, error: null }),
            getPublicUrl: () => ({ data: { publicUrl: '' } })
          }) 
        },
        rpc: () => ({
          then: (cb) => cb({ data: null, error: null }),
        }),
        // Esta função é para avisar outras abas sobre mudanças importantes
        broadcastChange: (changeType, data) => {
          if (broadcastChannel) {
            broadcastChannel.postMessage({ 
              type: 'supabase_data_change',
              changeType,
              data
            });
          }
        }
      };
    }
  }
  
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
        persistSession: true,
        // Usar identificador único para evitar conflitos entre abas
        storageKey: 'btc-monitor-supabase-auth-token',
      }
    })
    
    // Log de sucesso
    console.log('Cliente Supabase criado com sucesso (instância primária)')
    
    // Verificar se o cliente está funcionando corretamente
    client.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('Erro ao verificar sessão com cliente recém-criado:', error)
      } else {
        console.log('Cliente Supabase verificado com sucesso:', data.session ? 'Usuário autenticado' : 'Sem sessão ativa')
      }
    })
    
    // Adicionar método para broadcast de mudanças
    client.broadcastChange = (changeType, data) => {
      if (broadcastChannel) {
        broadcastChannel.postMessage({ 
          type: 'supabase_data_change',
          changeType,
          data
        });
      }
    };
    
    // Armazenar e retornar a instância
    supabaseInstance = client;
    return client;
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

// Adicionar evento de visibilidade para lidar com mudanças de aba
if (isBrowser) {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Ao tornar-se visível, verificar se ainda é a instância principal
      if (sessionStorage.getItem(SUPABASE_INSTANCE_KEY) === 'primary') {
        sessionStorage.setItem(SUPABASE_INSTANCE_TIMESTAMP, Date.now().toString());
        // Notificar outras abas
        if (broadcastChannel) {
          broadcastChannel.postMessage({ 
            type: 'supabase_instance_check',
          });
        }
      }
    }
  });
  
  // Antes de fechar a página, avisar outras abas
  window.addEventListener('beforeunload', () => {
    if (sessionStorage.getItem(SUPABASE_INSTANCE_KEY) === 'primary' && broadcastChannel) {
      broadcastChannel.postMessage({ 
        type: 'supabase_primary_closing',
      });
    }
  });
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

// Adicionar função para verificar se uma sessão está expirada
export function isSessionExpired(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    
    const sessionStr = localStorage.getItem('supabase_session');
    if (!sessionStr) return true;
    
    const session = JSON.parse(sessionStr);
    if (!session || !session.expires_at) return true;
    
    // Verificar expiração (com 5 minutos de margem)
    const expiresAt = session.expires_at * 1000; // Converter para milissegundos
    const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
    
    // Sessão expira nos próximos 5 minutos ou já expirou
    if (expiresAt < fiveMinutesFromNow) {
      console.log('Sessão expirada ou expirando em breve, limpando dados locais');
      localStorage.removeItem('supabase_session');
      return true;
    }
    
    return false;
  } catch (e) {
    console.error('Erro ao verificar expiração da sessão:', e);
    // Em caso de erro, assumir que a sessão está inválida
    localStorage.removeItem('supabase_session');
    return true;
  }
}

// Adicionar função que verifica e renova tokens prestes a expirar
export function configureTokenRefresh() {
  try {
    if (typeof window === 'undefined') return;
    
    // Obter cliente
    const client = getSupabaseClient();
    if (!client) return;
    
    // Verificar e renovar token a cada 5 minutos
    const refreshInterval = setInterval(async () => {
      try {
        // Verificar se há uma sessão
        const sessionStr = localStorage.getItem('supabase_session');
        if (!sessionStr) return;
        
        // Analisar a sessão
        const session = JSON.parse(sessionStr);
        if (!session || !session.expires_at) return;
        
        // Calcular quando o token expira
        const expiresAt = session.expires_at * 1000; // milissegundos
        const now = Date.now();
        
        // Se estiver a 20 minutos de expirar, renovar
        if (expiresAt - now < 20 * 60 * 1000) {
          console.log('Token expirando em breve, renovando...');
          
          // Tentar renovar a sessão
          const { data, error } = await client.auth.refreshSession();
          
          if (error) {
            console.warn('Erro ao renovar sessão:', error);
            
            // Se falhou, a sessão pode ser inválida
            if (error.message.includes('token') && error.message.includes('expired')) {
              localStorage.removeItem('supabase_session');
              console.warn('Token expirado, sessão removida');
            }
          } else if (data.session) {
            // Sessão renovada com sucesso
            console.log('Sessão renovada com sucesso');
            localStorage.setItem('supabase_session', JSON.stringify(data.session));
          }
        }
      } catch (e) {
        console.error('Erro ao verificar renovação de token:', e);
      }
    }, 5 * 60 * 1000); // Verificar a cada 5 minutos
    
    // Iniciar verificação uma vez imediatamente
    setTimeout(async () => {
      try {
        const sessionStr = localStorage.getItem('supabase_session');
        if (!sessionStr) return;
        
        const session = JSON.parse(sessionStr);
        if (!session || !session.expires_at) return;
        
        // Calcular quando o token expira
        const expiresAt = session.expires_at * 1000;
        const now = Date.now();
        
        // Se estiver a menos de 30 minutos de expirar, renovar imediatamente
        if (expiresAt - now < 30 * 60 * 1000) {
          console.log('Token prestes a expirar, renovando imediatamente...');
          const { data, error } = await client.auth.refreshSession();
          
          if (error) {
            console.warn('Falha ao renovar sessão:', error);
            
            if (error.message.includes('token') && error.message.includes('expired')) {
              localStorage.removeItem('supabase_session');
            }
          } else if (data.session) {
            localStorage.setItem('supabase_session', JSON.stringify(data.session));
            console.log('Sessão renovada com sucesso na inicialização');
          }
        }
      } catch (e) {
        console.error('Erro na verificação inicial de token:', e);
      }
    }, 1000); // Verificar 1 segundo após inicialização
    
    // Limpar intervalo ao desmontar (para hot reloading em desenvolvimento)
    if (typeof window !== 'undefined') {
      const originalOnload = window.onunload;
      window.onunload = function() {
        clearInterval(refreshInterval);
        if (originalOnload) originalOnload.apply(this, arguments);
      };
    }
    
    return refreshInterval;
  } catch (e) {
    console.error('Erro ao configurar renovação de token:', e);
    return null;
  }
}

// Executar configuração automaticamente no cliente
if (typeof window !== 'undefined') {
  configureTokenRefresh();
} 