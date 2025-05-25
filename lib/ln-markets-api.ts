import type {
  LNMarketsCredentials,
  LNMarketsTrade,
  LNMarketsDeposit,
  LNMarketsWithdrawal,
  LNMarketsApiResponse,
  LNMarketsClientConfig
} from '@/components/types/ln-markets-types';

// Importar a biblioteca oficial conforme documentação
import { createRestClient, type RestClient } from '@ln-markets/api';

/**
 * Cliente para API LN Markets usando a biblioteca oficial
 * Baseado na documentação: https://context7.com/ln-markets/api-js/llms.txt
 * Referência: https://github.com/ln-markets/api-js/
 */
class LNMarketsClient {
  private credentials: LNMarketsCredentials;
  private client: RestClient; // Client da biblioteca oficial com tipagem correta

  constructor(credentials: LNMarketsCredentials) {
    this.credentials = credentials;
    
    console.log('[LN Markets] Criando cliente com biblioteca oficial:', {
      network: credentials.network,
      hasKey: !!credentials.key,
      hasSecret: !!credentials.secret,
      hasPassphrase: !!credentials.passphrase,
      isConfigured: credentials.isConfigured
    });

    try {
      // Criar cliente conforme documentação oficial
      this.client = createRestClient({
        key: credentials.key,
        secret: credentials.secret,
        passphrase: credentials.passphrase,
        network: credentials.network
      });

      console.log('[LN Markets] Cliente oficial criado com sucesso');
    } catch (error) {
      console.error('[LN Markets] Erro ao criar cliente oficial:', error);
      throw new Error('Falha na criação do cliente LN Markets');
    }
  }

  /**
   * Executa requisição com tratamento de erro padronizado
   */
  private async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<LNMarketsApiResponse<T>> {
    try {
      console.log(`[LN Markets] Executando ${operationName}...`);
      
      const result = await operation();
      
      console.log(`[LN Markets] ${operationName} executado com sucesso:`, {
        hasData: !!result,
        dataType: typeof result,
        isArray: Array.isArray(result),
        length: Array.isArray(result) ? result.length : Object.keys(result || {}).length
      });
      
      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      console.error(`[LN Markets] Erro em ${operationName}:`, error);
      
      // Tratamento específico de erros da API LN Markets
      let errorMessage = error.message || 'Erro desconhecido na API';
      
      if (error.response) {
        const status = error.response.status;
        switch (status) {
          case 401:
            errorMessage = 'Credenciais inválidas. Verifique sua chave de API, secret e passphrase.';
            break;
          case 403:
            errorMessage = 'Permissões insuficientes. Verifique os escopos da sua chave de API.';
            break;
          case 429:
            errorMessage = 'Limite de taxa excedido. Aguarde antes de tentar novamente.';
            break;
          case 500:
            errorMessage = 'Erro interno do servidor LN Markets. Tente novamente mais tarde.';
            break;
          case 503:
            errorMessage = 'Serviço LN Markets temporariamente indisponível.';
            break;
          default:
            errorMessage = `HTTP ${status}: ${error.response.data || errorMessage}`;
        }
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Busca trades/operações fechadas
   * Usando método da biblioteca oficial - GET /v2/futures
   * Parâmetro type: 'closed' para buscar apenas trades fechados
   */
  async getTrades(): Promise<LNMarketsApiResponse<LNMarketsTrade[]>> {
    return this.executeWithErrorHandling(
      () => this.client.futuresGetTrades({ type: 'closed' }),
      'getTrades (closed)'
    );
  }

  /**
   * Busca trades por tipo específico
   * @param type - Tipo de trade: 'running', 'open', ou 'closed'
   */
  async getTradesByType(type: 'running' | 'open' | 'closed'): Promise<LNMarketsApiResponse<LNMarketsTrade[]>> {
    return this.executeWithErrorHandling(
      () => this.client.futuresGetTrades({ type }),
      `getTrades (${type})`
    );
  }

  /**
   * Busca histórico de depósitos
   * Usando método da biblioteca oficial - GET /v2/user/deposit
   */
  async getDeposits(): Promise<LNMarketsApiResponse<LNMarketsDeposit[]>> {
    return this.executeWithErrorHandling(
      () => this.client.userDepositHistory(),
      'getDeposits'
    );
  }

  /**
   * Busca histórico de saques
   * Usando método da biblioteca oficial - GET /v2/user/withdraw
   */
  async getWithdrawals(): Promise<LNMarketsApiResponse<LNMarketsWithdrawal[]>> {
    return this.executeWithErrorHandling(
      () => this.client.userWithdrawHistory(),
      'getWithdrawals'
    );
  }

  /**
   * Testa a conexão com a API
   */
  async testConnection(): Promise<LNMarketsApiResponse<any>> {
    return this.executeWithErrorHandling(
      () => this.client.userGet(),
      'testConnection'
    );
  }

  /**
   * Busca informações do usuário
   */
  async getUserInfo(): Promise<LNMarketsApiResponse<any>> {
    return this.executeWithErrorHandling(
      () => this.client.userGet(),
      'getUserInfo'
    );
  }
}

/**
 * Factory function para criar cliente LN Markets
 */
export function createLNMarketsClient(credentials: LNMarketsCredentials): LNMarketsClient {
  if (!credentials.isConfigured) {
    throw new Error('Credenciais LN Markets não configuradas');
  }
  
  const errors = validateLNMarketsCredentials(credentials);
  if (errors.length > 0) {
    throw new Error(`Credenciais inválidas: ${errors.join(', ')}`);
  }
  
  return new LNMarketsClient(credentials);
}

/**
 * Função para testar credenciais
 */
export async function testLNMarketsCredentials(credentials: LNMarketsCredentials): Promise<boolean> {
  try {
    const client = createLNMarketsClient(credentials);
    const response = await client.testConnection();
    return response.success;
  } catch (error) {
    console.error('[LN Markets] Erro ao testar credenciais:', error);
    return false;
  }
}

/**
 * Valida credenciais LN Markets
 */
export function validateLNMarketsCredentials(credentials: LNMarketsCredentials): string[] {
  const errors: string[] = [];
  
  if (!credentials.key?.trim()) {
    errors.push('Key é obrigatória');
  }
  
  if (!credentials.secret?.trim()) {
    errors.push('Secret é obrigatório');
  }
  
  if (!credentials.passphrase?.trim()) {
    errors.push('Passphrase é obrigatória');
  }
  
  if (!credentials.network || !['mainnet', 'testnet'].includes(credentials.network)) {
    errors.push('Network deve ser "mainnet" ou "testnet"');
  }
  
  return errors;
} 