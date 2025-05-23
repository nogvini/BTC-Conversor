import type { 
  LNMarketsCredentials, 
  LNMarketsTrade, 
  LNMarketsDeposit, 
  LNMarketsWithdrawal,
  LNMarketsApiResponse 
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
        hasApiKey: !!credentials.apiKey,
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
 * Funções de conveniência para manter compatibilidade com o código existente
 */
export async function fetchLNMarketsTrades(credentials: LNMarketsCredentials) {
  console.log('[fetchLNMarketsTrades] Iniciando busca de trades');
  return lnMarketsAPIClient.getTrades(credentials);
}

export async function fetchLNMarketsDeposits(credentials: LNMarketsCredentials) {
  console.log('[fetchLNMarketsDeposits] Iniciando busca de depósitos');
  return lnMarketsAPIClient.getDeposits(credentials);
}

export async function fetchLNMarketsWithdrawals(credentials: LNMarketsCredentials) {
  console.log('[fetchLNMarketsWithdrawals] Iniciando busca de saques');
  return lnMarketsAPIClient.getWithdrawals(credentials);
} 