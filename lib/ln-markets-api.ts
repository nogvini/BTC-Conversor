import type {
  LNMarketsCredentials,
  LNMarketsTrade,
  LNMarketsDeposit,
  LNMarketsWithdrawal,
  LNMarketsApiResponse,
  LNMarketsClientConfig
} from '@/components/types/ln-markets-types';

// Importar SDK oficial da LN Markets
let createRestClient: any;
let createWebsocketClient: any;

// Importação dinâmica para evitar problemas de SSR
async function importLNMarketsSDK() {
  if (typeof window !== 'undefined') {
    // No browser, importar dinamicamente
    try {
      const sdk = await import('@ln-markets/api');
      createRestClient = sdk.createRestClient;
      createWebsocketClient = sdk.createWebsocketClient;
      return sdk;
    } catch (error) {
      console.warn('[LN Markets] SDK oficial não disponível, usando implementação customizada');
      return null;
    }
  }
  return null;
}

/**
 * Implementação customizada de assinatura HMAC SHA256 para fallback
 * Baseada na documentação oficial: https://docs.lnmarkets.com/api/#signature
 */
function generateSignatureCustom(timestamp: string, method: string, path: string, params: string, secret: string): string {
  try {
    // Usar crypto-js para compatibilidade com browser
    const CryptoJS = require('crypto-js');
    const message = timestamp + method.toUpperCase() + path + params;
    return CryptoJS.HmacSHA256(message, secret).toString(CryptoJS.enc.Base64);
  } catch (error) {
    console.error('[LN Markets] Erro ao gerar assinatura:', error);
    throw new Error('Falha na geração de assinatura HMAC');
  }
}

/**
 * Cliente LN Markets otimizado usando SDK oficial quando disponível
 */
class LNMarketsClient {
  private credentials: LNMarketsCredentials;
  private baseUrl: string;
  private officialClient: any = null;

  constructor(credentials: LNMarketsCredentials) {
    this.credentials = credentials;
    // URLs atualizadas conforme documentação oficial
    this.baseUrl = credentials.network === 'testnet' 
      ? 'https://api.testnet.lnmarkets.com/v2'
      : 'https://api.lnmarkets.com/v2';
  }

  /**
   * Inicializa o cliente oficial se disponível
   */
  private async initializeOfficialClient() {
    if (this.officialClient) return this.officialClient;

    try {
      const sdk = await importLNMarketsSDK();
      if (sdk && createRestClient) {
        this.officialClient = createRestClient({
          key: this.credentials.apiKey,
          secret: this.credentials.secret,
          passphrase: this.credentials.passphrase,
          network: this.credentials.network
        });
        console.log('[LN Markets] SDK oficial inicializado com sucesso');
        return this.officialClient;
      }
    } catch (error) {
      console.warn('[LN Markets] Falha ao inicializar SDK oficial:', error);
    }
    return null;
  }

  /**
   * Implementação customizada de requisição para fallback
   */
  private async makeCustomRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<LNMarketsApiResponse<T>> {
    try {
      const timestamp = Date.now().toString();
      const path = endpoint;
      
      let params = '';
      let body: string | undefined;

      // Processar parâmetros conforme documentação
      if (method.match(/^(GET|DELETE)$/)) {
        if (data) {
          const searchParams = new URLSearchParams(data);
          params = searchParams.toString();
        }
      } else {
        if (data) {
          params = JSON.stringify(data);
          body = params;
        }
      }

      const signature = generateSignatureCustom(timestamp, method, path, params, this.credentials.secret);

      const headers: HeadersInit = {
        'LNM-ACCESS-KEY': this.credentials.apiKey,
        'LNM-ACCESS-SIGNATURE': signature,
        'LNM-ACCESS-PASSPHRASE': this.credentials.passphrase,
        'LNM-ACCESS-TIMESTAMP': timestamp,
      };

      if (method === 'POST' || method === 'PUT') {
        headers['Content-Type'] = 'application/json';
      }

      const finalUrl = method.match(/^(GET|DELETE)$/) && params
        ? `${this.baseUrl}${endpoint}?${params}`
        : `${this.baseUrl}${endpoint}`;

      console.log(`[LN Markets Custom] ${method} ${endpoint}`);

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
   * Executa requisição usando SDK oficial ou implementação customizada
   */
  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<LNMarketsApiResponse<T>> {
    // Tentar usar SDK oficial primeiro
    const officialClient = await this.initializeOfficialClient();
    
    if (officialClient) {
      try {
        let result;
        const endpointKey = endpoint.replace('/', '').replace(/\//g, '_');
        
        // Mapear endpoints para métodos do SDK oficial
        switch (endpoint) {
          case '/futures/trades':
            result = await officialClient.futuresGetTrades();
            break;
          case '/user/deposits':
            result = await officialClient.userGetDeposits();
            break;
          case '/user/withdrawals':
            result = await officialClient.userGetWithdrawals();
            break;
          case '/user':
            result = await officialClient.userGetUser();
            break;
          default:
            // Para endpoints não mapeados, usar implementação customizada
            return this.makeCustomRequest<T>(method, endpoint, data);
        }

        return {
          success: true,
          data: result,
        };
      } catch (error: any) {
        console.warn('[LN Markets] SDK oficial falhou, usando implementação customizada:', error.message);
        return this.makeCustomRequest<T>(method, endpoint, data);
      }
    }

    // Fallback para implementação customizada
    return this.makeCustomRequest<T>(method, endpoint, data);
  }

  /**
   * Obtém lista de trades (operações futuras)
   */
  async getTrades(): Promise<LNMarketsApiResponse<LNMarketsTrade[]>> {
    return this.makeRequest<LNMarketsTrade[]>('GET', '/futures/trades');
  }

  /**
   * Obtém lista de depósitos
   */
  async getDeposits(): Promise<LNMarketsApiResponse<LNMarketsDeposit[]>> {
    return this.makeRequest<LNMarketsDeposit[]>('GET', '/user/deposits');
  }

  /**
   * Obtém lista de saques
   */
  async getWithdrawals(): Promise<LNMarketsApiResponse<LNMarketsWithdrawal[]>> {
    return this.makeRequest<LNMarketsWithdrawal[]>('GET', '/user/withdrawals');
  }

  /**
   * Testa conexão com a API obtendo informações do usuário
   */
  async testConnection(): Promise<LNMarketsApiResponse<any>> {
    return this.makeRequest('GET', '/user');
  }

  /**
   * Obtém informações do usuário
   */
  async getUserInfo(): Promise<LNMarketsApiResponse<any>> {
    return this.makeRequest('GET', '/user');
  }
}

/**
 * Factory para criar cliente LN Markets
 */
export function createLNMarketsClient(credentials: LNMarketsCredentials): LNMarketsClient {
  // Validar credenciais antes de criar cliente
  if (!credentials.apiKey || !credentials.secret || !credentials.passphrase) {
    throw new Error('Credenciais LN Markets incompletas. Verifique apiKey, secret e passphrase.');
  }

  return new LNMarketsClient(credentials);
}

/**
 * Função para testar credenciais LN Markets
 */
export async function testLNMarketsCredentials(credentials: LNMarketsCredentials): Promise<boolean> {
  try {
    const client = createLNMarketsClient(credentials);
    const result = await client.testConnection();
    
    if (result.success) {
      console.log('[LN Markets] Credenciais validadas com sucesso');
      return true;
    } else {
      console.error('[LN Markets] Erro ao validar credenciais:', result.error);
      return false;
    }
  } catch (error: any) {
    console.error('[LN Markets] Erro ao testar credenciais:', error.message);
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
    date: new Date(trade.closed_ts * 1000).toISOString().split('T')[0], // Converter timestamp para data
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
    date: new Date(deposit.created_at * 1000).toISOString().split('T')[0], // Converter timestamp para data
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
    date: new Date(withdrawal.created_at * 1000).toISOString().split('T')[0], // Converter timestamp para data
    amount: withdrawal.amount / 100000000, // Converter de satoshis para BTC
    unit: 'BTC' as const,
    fee: withdrawal.fee ? withdrawal.fee / 100000000 : undefined,
    type: withdrawal.type,
    txid: withdrawal.txid,
  };
}

/**
 * Função utilitária para verificar se as credenciais estão configuradas corretamente
 */
export function validateLNMarketsCredentials(credentials: LNMarketsCredentials): string[] {
  const errors: string[] = [];

  if (!credentials.apiKey || credentials.apiKey.trim().length === 0) {
    errors.push('API Key é obrigatória');
  }

  if (!credentials.secret || credentials.secret.trim().length === 0) {
    errors.push('Secret é obrigatório');
  }

  if (!credentials.passphrase || credentials.passphrase.trim().length === 0) {
    errors.push('Passphrase é obrigatória');
  }

  if (!['mainnet', 'testnet'].includes(credentials.network)) {
    errors.push('Network deve ser "mainnet" ou "testnet"');
  }

  return errors;
} 