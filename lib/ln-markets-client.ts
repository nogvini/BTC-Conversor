import type { 
  LNMarketsCredentials, 
  LNMarketsTrade, 
  LNMarketsDeposit, 
  LNMarketsWithdrawal,
  LNMarketsApiResponse,
  LNMarketsAPIConfig 
} from '@/components/types/ln-markets-types';

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
 */
export async function fetchLNMarketsTrades(userEmail: string, configId: string) {
  console.log('[LN Markets Client] Iniciando busca de trades:', { userEmail: userEmail.split('@')[0] + '@***', configId });
  
  try {
    const response = await fetch('/api/ln-markets/trades', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userEmail,
        configId
      }),
    });

    console.log('[LN Markets Client] Resposta HTTP recebida /trades:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[LN Markets Client] Erro HTTP /trades:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    console.log('[LN Markets Client] Dados parseados /trades:', {
      success: data.success,
      hasData: data.hasData,
      dataLength: data.data?.length,
      error: data.error
    });

    return data;
  } catch (error: any) {
    console.error('[LN Markets Client] Erro na requisição /trades:', error);
    return {
      success: false,
      error: error.message || 'Erro na comunicação com a API',
      hasData: false
    };
  }
}

/**
 * Busca depósitos da LN Markets via API route usando configuração específica
 */
export async function fetchLNMarketsDeposits(userEmail: string, configId: string) {
  console.log('[LN Markets Client] Iniciando busca de depósitos:', { userEmail: userEmail.split('@')[0] + '@***', configId });
  
  try {
    const response = await fetch('/api/ln-markets/deposits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userEmail,
        configId
      }),
    });

    console.log('[LN Markets Client] Resposta HTTP recebida /deposits:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[LN Markets Client] Erro HTTP /deposits:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    console.log('[LN Markets Client] Dados parseados /deposits:', {
      success: data.success,
      hasData: data.hasData,
      dataLength: data.data?.length,
      error: data.error
    });

    return data;
  } catch (error: any) {
    console.error('[LN Markets Client] Erro na requisição /deposits:', error);
    return {
      success: false,
      error: error.message || 'Erro na comunicação com a API',
      hasData: false
    };
  }
}

/**
 * Busca saques da LN Markets via API route usando configuração específica
 */
export async function fetchLNMarketsWithdrawals(userEmail: string, configId: string) {
  console.log('[LN Markets Client] Iniciando busca de saques:', { userEmail: userEmail.split('@')[0] + '@***', configId });
  
  try {
    const response = await fetch('/api/ln-markets/withdrawals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userEmail,
        configId
      }),
    });

    console.log('[LN Markets Client] Resposta HTTP recebida /withdrawals:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[LN Markets Client] Erro HTTP /withdrawals:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    console.log('[LN Markets Client] Dados parseados /withdrawals:', {
      success: data.success,
      hasData: data.hasData,
      dataLength: data.data?.length,
      error: data.error
    });

    return data;
  } catch (error: any) {
    console.error('[LN Markets Client] Erro na requisição /withdrawals:', error);
    return {
      success: false,
      error: error.message || 'Erro na comunicação com a API',
      hasData: false
    };
  }
} 