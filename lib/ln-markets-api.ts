import type {
  LNMarketsCredentials,
  LNMarketsTrade,
  LNMarketsDeposit,
  LNMarketsWithdrawal,
  LNMarketsApiResponse,
  LNMarketsClientConfig
} from '@/components/types/ln-markets-types';

/**
 * Cliente para API LN Markets
 * Baseado na documentação: https://docs.lnmarkets.com/api/
 */
class LNMarketsClient {
  private baseUrl: string;
  private credentials: LNMarketsCredentials;

  constructor(credentials: LNMarketsCredentials) {
    this.credentials = credentials;
    this.baseUrl = credentials.network === 'testnet' 
      ? 'https://api.testnet.lnmarkets.com/v2'
      : 'https://api.lnmarkets.com/v2';
  }

  /**
   * Gera assinatura para requisições autenticadas
   */
  private generateSignature(timestamp: string, method: string, path: string, body: string = ''): string {
    const crypto = require('crypto-js');
    const message = timestamp + method.toUpperCase() + path + body;
    return crypto.HmacSHA256(message, this.credentials.apiSecret).toString();
  }

  /**
   * Executa requisição autenticada para a API
   */
  private async makeAuthenticatedRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: any
  ): Promise<LNMarketsApiResponse<T>> {
    try {
      const timestamp = Date.now().toString();
      const path = `/v2${endpoint}`;
      const bodyString = body ? JSON.stringify(body) : '';
      const signature = this.generateSignature(timestamp, method, path, bodyString);

      const headers: HeadersInit = {
        'LNM-ACCESS-KEY': this.credentials.apiKey,
        'LNM-ACCESS-SIGNATURE': signature,
        'LNM-ACCESS-PASSPHRASE': this.credentials.apiPassphrase,
        'LNM-ACCESS-TIMESTAMP': timestamp,
      };

      if (method === 'POST' || method === 'PUT') {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers,
        body: bodyString || undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('Erro na requisição LN Markets:', error);
      return {
        success: false,
        error: error.message || 'Erro desconhecido na API',
      };
    }
  }

  /**
   * Obtém lista de trades (operações)
   */
  async getTrades(): Promise<LNMarketsApiResponse<LNMarketsTrade[]>> {
    return this.makeAuthenticatedRequest<LNMarketsTrade[]>('GET', '/futures/trades');
  }

  /**
   * Obtém lista de depósitos
   */
  async getDeposits(): Promise<LNMarketsApiResponse<LNMarketsDeposit[]>> {
    return this.makeAuthenticatedRequest<LNMarketsDeposit[]>('GET', '/user/deposits');
  }

  /**
   * Obtém lista de saques
   */
  async getWithdrawals(): Promise<LNMarketsApiResponse<LNMarketsWithdrawal[]>> {
    return this.makeAuthenticatedRequest<LNMarketsWithdrawal[]>('GET', '/user/withdrawals');
  }

  /**
   * Testa conexão com a API
   */
  async testConnection(): Promise<LNMarketsApiResponse<any>> {
    return this.makeAuthenticatedRequest('GET', '/user');
  }
}

/**
 * Factory para criar cliente LN Markets
 */
export function createLNMarketsClient(credentials: LNMarketsCredentials): LNMarketsClient {
  return new LNMarketsClient(credentials);
}

/**
 * Função utilitária para testar credenciais
 */
export async function testLNMarketsCredentials(credentials: LNMarketsCredentials): Promise<boolean> {
  try {
    const client = createLNMarketsClient(credentials);
    const result = await client.testConnection();
    return result.success;
  } catch (error) {
    console.error('Erro ao testar credenciais LN Markets:', error);
    return false;
  }
}

/**
 * Converte trade LN Markets para ProfitRecord
 */
export function convertTradeToProfit(trade: LNMarketsTrade) {
  return {
    id: trade.id,
    originalId: trade.id,
    date: new Date(trade.closed_ts).toISOString().split('T')[0],
    amount: Math.abs(trade.pl) / 100000000, // Converter de satoshis para BTC
    unit: 'BTC' as const,
    isProfit: trade.pl > 0,
  };
}

/**
 * Converte depósito LN Markets para Investment
 */
export function convertDepositToInvestment(deposit: LNMarketsDeposit) {
  return {
    id: deposit.id,
    originalId: deposit.id,
    date: new Date(deposit.created_at).toISOString().split('T')[0],
    amount: deposit.amount / 100000000, // Converter de satoshis para BTC
    unit: 'BTC' as const,
  };
}

/**
 * Converte saque LN Markets para WithdrawalRecord
 */
export function convertWithdrawalToRecord(withdrawal: LNMarketsWithdrawal) {
  return {
    id: withdrawal.id,
    originalId: withdrawal.id,
    date: new Date(withdrawal.created_at).toISOString().split('T')[0],
    amount: withdrawal.amount / 100000000, // Converter de satoshis para BTC
    unit: 'BTC' as const,
    fee: withdrawal.fee ? withdrawal.fee / 100000000 : undefined,
    type: withdrawal.type,
    txid: withdrawal.txid,
  };
} 