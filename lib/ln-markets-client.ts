import type { 
  LNMarketsCredentials, 
  LNMarketsTrade, 
  LNMarketsDeposit, 
  LNMarketsWithdrawal,
  LNMarketsApiResponse,
  LNMarketsAPIConfig 
} from '@/components/types/ln-markets-types';
import { retrieveLNMarketsMultipleConfigs } from '@/lib/encryption';

/**
 * Cliente para fazer chamadas para nossas API routes (resolvendo CORS)
 * Em vez de chamar a API LN Markets diretamente do frontend
 */
export class LNMarketsAPIClient {
  private async makeRequest<T>(
    endpoint: string, 
    credentials: LNMarketsCredentials
  ): Promise<LNMarketsApiResponse<T>> {
    try {
      console.log(`[LN Markets Client] Iniciando requisição para ${endpoint}`, {
        hasKey: !!credentials.key,
        hasSecret: !!credentials.secret,
        hasPassphrase: !!credentials.passphrase,
        network: credentials.network,
        isConfigured: credentials.isConfigured
      });

      const response = await fetch(`/api/ln-markets${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credentials }),
      });

      console.log(`[LN Markets Client] Resposta HTTP recebida ${endpoint}:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      const data = await response.json();
      
      console.log(`[LN Markets Client] Dados parseados ${endpoint}:`, {
        success: data.success,
        hasData: !!data.data,
        error: data.error
      });
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return data;
    } catch (error: any) {
      console.error(`[LN Markets Client] Erro em ${endpoint}:`, error);
      return {
        success: false,
        error: error.message || 'Erro de conexão',
      };
    }
  }

  /**
   * Busca trades através da nossa API route
   */
  async getTrades(credentials: LNMarketsCredentials): Promise<LNMarketsApiResponse<LNMarketsTrade[]>> {
    return this.makeRequest<LNMarketsTrade[]>('/trades', credentials);
  }

  /**
   * Busca depósitos através da nossa API route
   */
  async getDeposits(credentials: LNMarketsCredentials): Promise<LNMarketsApiResponse<LNMarketsDeposit[]>> {
    return this.makeRequest<LNMarketsDeposit[]>('/deposits', credentials);
  }

  /**
   * Busca saques através da nossa API route
   */
  async getWithdrawals(credentials: LNMarketsCredentials): Promise<LNMarketsApiResponse<LNMarketsWithdrawal[]>> {
    return this.makeRequest<LNMarketsWithdrawal[]>('/withdrawals', credentials);
  }
}

// Instância singleton do cliente
export const lnMarketsAPIClient = new LNMarketsAPIClient();

/**
 * Busca trades da LN Markets via API route usando configuração específica
 * @param userEmail - Email do usuário
 * @param configId - ID da configuração
 * @param options - Opções de paginação (limit, offset)
 */
export async function fetchLNMarketsTrades(userEmail: string, configId: string, options?: { limit?: number; offset?: number }) {
  try {
    console.log('[LN Markets Client] Iniciando busca de trades...', { userEmail: userEmail.split('@')[0] + '@***', configId });
    
    // Buscar as credenciais no localStorage (client-side)
    const multipleConfigs = retrieveLNMarketsMultipleConfigs(userEmail);
    if (!multipleConfigs) {
      throw new Error('Nenhuma configuração LN Markets encontrada');
    }
    
    const config = multipleConfigs.configs.find(c => c.id === configId && c.isActive);
    if (!config) {
      throw new Error('Configuração LN Markets não encontrada ou inativa');
    }
    
    console.log('[LN Markets Client] Credenciais encontradas, fazendo requisição...');
    
    const response = await fetch('/api/ln-markets/trades', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        credentials: config.credentials, // Enviar credenciais completas
        options: options // Enviar opções de paginação
      }),
    });

    console.log('[LN Markets Client] Resposta recebida:', { 
      status: response.status, 
      statusText: response.statusText,
      ok: response.ok 
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[LN Markets Client] Erro HTTP /trades:', { 
        status: response.status, 
        statusText: response.statusText,
        body: errorBody 
      });
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    console.log('[LN Markets Client] Dados de trades obtidos:', { 
      success: data.success, 
      hasData: !!data.data,
      dataLength: data.data?.length,
      isEmpty: data.isEmpty,
      pagination: data.pagination
    });

    return data;
  } catch (error: any) {
    console.error('[LN Markets Client] Erro na requisição /trades:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Busca depósitos da LN Markets via API route usando configuração específica
 * @param userEmail - Email do usuário
 * @param configId - ID da configuração
 * @param debug - Modo debug para investigar depósitos perdidos
 */
export async function fetchLNMarketsDeposits(userEmail: string, configId: string, debug?: boolean) {
  try {
    console.log('[LN Markets Client] Iniciando busca de depósitos...', { 
      userEmail: userEmail.split('@')[0] + '@***', 
      configId,
      debugMode: !!debug
    });
    
    // Buscar as credenciais no localStorage (client-side)
    const multipleConfigs = retrieveLNMarketsMultipleConfigs(userEmail);
    if (!multipleConfigs) {
      throw new Error('Nenhuma configuração LN Markets encontrada');
    }
    
    const config = multipleConfigs.configs.find(c => c.id === configId && c.isActive);
    if (!config) {
      throw new Error('Configuração LN Markets não encontrada ou inativa');
    }
    
    console.log('[LN Markets Client] Credenciais encontradas, fazendo requisição...');
    
    const response = await fetch('/api/ln-markets/deposits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        credentials: config.credentials, // Enviar credenciais completas
        debug: debug // Enviar flag de debug
      }),
    });

    console.log('[LN Markets Client] Resposta recebida:', { 
      status: response.status, 
      statusText: response.statusText,
      ok: response.ok 
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[LN Markets Client] Erro HTTP /deposits:', { 
        status: response.status, 
        statusText: response.statusText,
        body: errorBody 
      });
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    
    if (debug) {
      console.log('[LN Markets Client] 🔬 RESULTADO DEBUG:', {
        success: data.success,
        hasData: !!data.data,
        hasDebugResults: !!data.debugResults,
        message: data.message
      });
    } else {
      console.log('[LN Markets Client] Dados de depósitos obtidos:', { 
        success: data.success, 
        hasData: !!data.data,
        dataLength: data.data?.length,
        superIntensiveSearch: data.superIntensiveSearch,
        message: data.message
      });
    }

    return data;
  } catch (error: any) {
    console.error('[LN Markets Client] Erro na requisição /deposits:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Busca saques da LN Markets via API route usando configuração específica
 */
export async function fetchLNMarketsWithdrawals(userEmail: string, configId: string) {
  try {
    console.log('[LN Markets Client] Iniciando busca de saques...', { userEmail: userEmail.split('@')[0] + '@***', configId });
    
    // Buscar as credenciais no localStorage (client-side)
    const multipleConfigs = retrieveLNMarketsMultipleConfigs(userEmail);
    if (!multipleConfigs) {
      throw new Error('Nenhuma configuração LN Markets encontrada');
    }
    
    const config = multipleConfigs.configs.find(c => c.id === configId && c.isActive);
    if (!config) {
      throw new Error('Configuração LN Markets não encontrada ou inativa');
    }
    
    console.log('[LN Markets Client] Credenciais encontradas, fazendo requisição...');
    
    const response = await fetch('/api/ln-markets/withdrawals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        credentials: config.credentials // Enviar credenciais completas
      }),
    });

    console.log('[LN Markets Client] Resposta recebida:', { 
      status: response.status, 
      statusText: response.statusText,
      ok: response.ok 
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[LN Markets Client] Erro HTTP /withdrawals:', { 
        status: response.status, 
        statusText: response.statusText,
        body: errorBody 
      });
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    console.log('[LN Markets Client] Dados de saques obtidos:', { 
      success: data.success, 
      hasData: !!data.data,
      dataLength: data.data?.length 
    });

    return data;
  } catch (error: any) {
    console.error('[LN Markets Client] Erro na requisição /withdrawals:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
} 