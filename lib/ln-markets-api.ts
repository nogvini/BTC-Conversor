import type {
  LNMarketsCredentials,
  LNMarketsTrade,
  LNMarketsDeposit,
  LNMarketsWithdrawal,
  LNMarketsApiResponse,
  LNMarketsClientConfig
} from '@/components/types/ln-markets-types';
import CryptoJS from 'crypto-js';

/**
 * Cliente para API LN Markets
 * Implementação customizada baseada na documentação oficial: https://docs.lnmarkets.com/api/
 */
class LNMarketsClient {
  private credentials: LNMarketsCredentials;
  private baseUrl: string;

  constructor(credentials: LNMarketsCredentials) {
    this.credentials = credentials;
    // URLs atualizadas conforme documentação oficial
    this.baseUrl = credentials.network === 'testnet' 
      ? 'https://api.testnet.lnmarkets.com/v2'
      : 'https://api.lnmarkets.com/v2';
  }

  /**
   * Gera assinatura HMAC SHA256 conforme documentação
   * https://docs.lnmarkets.com/api/#signature
   */
  private generateSignature(timestamp: string, method: string, path: string, params: string): string {
    try {
      const message = timestamp + method.toUpperCase() + path + params;
      const signature = CryptoJS.HmacSHA256(message, this.credentials.secret);
      return CryptoJS.enc.Base64.stringify(signature);
    } catch (error) {
      console.error('[LN Markets] Erro ao gerar assinatura:', error);
      throw new Error('Falha na geração de assinatura HMAC');
    }
  }

  /**
   * Executa requisição autenticada para a API
   */
  private async makeAuthenticatedRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<LNMarketsApiResponse<T>> {
    try {
      const timestamp = Date.now().toString();
      const path = endpoint;
      
      let params = '';
      let body: string | undefined;

      // Processar parâmetros conforme tipo de requisição
      if (method === 'GET' || method === 'DELETE') {
        if (data) {
          const searchParams = new URLSearchParams();
          Object.keys(data).forEach(key => {
            if (data[key] !== undefined && data[key] !== null) {
              searchParams.append(key, data[key].toString());
            }
          });
          params = searchParams.toString();
        }
      } else {
        if (data) {
          params = JSON.stringify(data);
          body = params;
        }
      }

      const signature = this.generateSignature(timestamp, method, path, params);

      const headers: HeadersInit = {
        'LNM-ACCESS-KEY': this.credentials.apiKey,
        'LNM-ACCESS-SIGNATURE': signature,
        'LNM-ACCESS-PASSPHRASE': this.credentials.passphrase,
        'LNM-ACCESS-TIMESTAMP': timestamp,
      };

      if (method === 'POST' || method === 'PUT') {
        headers['Content-Type'] = 'application/json';
      }

      const finalUrl = (method === 'GET' || method === 'DELETE') && params
        ? `${this.baseUrl}${endpoint}?${params}`
        : `${this.baseUrl}${endpoint}`;

      console.log(`[LN Markets] ${method} ${endpoint}`);

      const response = await fetch(finalUrl, {
        method,
        headers,
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[LN Markets] HTTP ${response.status}:`, errorText);
        
        // Tratamento específico de erros
        switch (response.status) {
          case 401:
            throw new Error('Credenciais inválidas. Verifique sua chave de API, secret e passphrase.');
          case 403:
            throw new Error('Permissões insuficientes. Verifique os escopos da sua chave de API.');
          case 429:
            throw new Error('Limite de taxa excedido (1 req/s). Aguarde antes de tentar novamente.');
          case 500:
            throw new Error('Erro interno do servidor LN Markets. Tente novamente mais tarde.');
          case 503:
            throw new Error('Serviço LN Markets temporariamente indisponível.');
          default:
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
      }

      const responseData = await response.json();
      
      return {
        success: true,
        data: responseData,
      };
    } catch (error: any) {
      console.error('[LN Markets] Erro na requisição:', error);
      return {
        success: false,
        error: error.message || 'Erro desconhecido na API',
      };
    }
  }

  /**
   * Busca trades/operações fechadas
   */
  async getTrades(): Promise<LNMarketsApiResponse<LNMarketsTrade[]>> {
    return this.makeAuthenticatedRequest<LNMarketsTrade[]>('GET', '/futures/trades');
  }

  /**
   * Busca histórico de depósitos
   */
  async getDeposits(): Promise<LNMarketsApiResponse<LNMarketsDeposit[]>> {
    return this.makeAuthenticatedRequest<LNMarketsDeposit[]>('GET', '/user/deposits');
  }

  /**
   * Busca histórico de saques
   */
  async getWithdrawals(): Promise<LNMarketsApiResponse<LNMarketsWithdrawal[]>> {
    return this.makeAuthenticatedRequest<LNMarketsWithdrawal[]>('GET', '/user/withdrawals');
  }

  /**
   * Testa a conexão com a API
   */
  async testConnection(): Promise<LNMarketsApiResponse<any>> {
    return this.makeAuthenticatedRequest('GET', '/user');
  }

  /**
   * Busca informações do usuário
   */
  async getUserInfo(): Promise<LNMarketsApiResponse<any>> {
    return this.makeAuthenticatedRequest('GET', '/user');
  }
}

/**
 * Factory function para criar cliente LN Markets
 */
export function createLNMarketsClient(credentials: LNMarketsCredentials): LNMarketsClient {
  if (!credentials.isConfigured) {
    throw new Error('Credenciais LN Markets não configuradas');
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
 * Converte trade LN Markets para registro de lucro/perda
 */
export function convertTradeToProfit(trade: LNMarketsTrade) {
  return {
    id: `lnm_trade_${trade.id}`,
    originalId: trade.id.toString(),
    date: new Date(trade.closed_at || trade.updated_at).toISOString().split('T')[0],
    amount: Math.abs(trade.pl),
    unit: 'SATS' as const,
    isProfit: trade.pl > 0,
  };
}

/**
 * Converte depósito LN Markets para investimento
 */
export function convertDepositToInvestment(deposit: LNMarketsDeposit) {
  return {
    id: `lnm_deposit_${deposit.id}`,
    originalId: deposit.id.toString(),
    date: new Date(deposit.created_at).toISOString().split('T')[0],
    amount: deposit.amount,
    unit: 'SATS' as const,
  };
}

/**
 * Converte saque LN Markets para registro de saque
 */
export function convertWithdrawalToRecord(withdrawal: LNMarketsWithdrawal) {
  const withdrawalType = withdrawal.withdrawal_type === 'ln' ? 'lightning' : 'onchain';
  
  return {
    id: `lnm_withdrawal_${withdrawal.id}`,
    originalId: withdrawal.id.toString(),
    date: new Date(withdrawal.created_at).toISOString().split('T')[0],
    amount: withdrawal.amount,
    unit: 'SATS' as const,
    fee: withdrawal.fees || 0,
    type: withdrawalType as 'lightning' | 'onchain',
    txid: withdrawal.txid,
  };
}

/**
 * Valida credenciais LN Markets
 */
export function validateLNMarketsCredentials(credentials: LNMarketsCredentials): string[] {
  const errors: string[] = [];
  
  if (!credentials.apiKey?.trim()) {
    errors.push('API Key é obrigatória');
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