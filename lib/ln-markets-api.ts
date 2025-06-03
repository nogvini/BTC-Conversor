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
   * Utiliza paginação ampliada para buscar histórico completo
   * @param options - Opções de paginação (limit, offset)
   */
  async getTrades(options?: { limit?: number; offset?: number }): Promise<LNMarketsApiResponse<LNMarketsTrade[]>> {
    // Calcular data antiga (2 anos atrás) se não houver offset específico
    // Isso garante que busquemos o máximo de trades históricos possível
    const defaultDate = new Date();
    defaultDate.setFullYear(defaultDate.getFullYear() - 2); // 2 anos atrás
    const defaultTimestamp = defaultDate.getTime();
    
    console.log('[LN Markets API] Buscando trades com parâmetros ampliados:', {
      type: 'closed',
      limit: options?.limit || 100,
      from: options?.offset || 0,
      defaultHistoricalDate: new Date(defaultTimestamp).toISOString()
    });
    
    return this.executeWithErrorHandling(
      () => this.client.futuresGetTrades({ 
        type: 'closed',
        limit: options?.limit || 200, // Aumentado para 200 por requisição
        from: options?.offset || 0,
        // Se não tiver offset específico, usar data antiga para pegar histórico completo
        ...(options?.offset === undefined && { timestamp: defaultTimestamp })
      }),
      'getTrades (closed - ampliado)'
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
   * Busca histórico de depósitos com busca intensificada
   * Usando método da biblioteca oficial - GET /v2/user/deposit
   * Implementa paginação e busca histórica ampliada
   */
  async getDeposits(): Promise<LNMarketsApiResponse<LNMarketsDeposit[]>> {
    console.log('[LN Markets API] 🔍 BUSCA INTENSIFICADA DE DEPÓSITOS INICIADA');
    
    try {
      const allDeposits: LNMarketsDeposit[] = [];
      let currentOffset = 0;
      const limit = 100; // Máximo por requisição
      let hasMoreData = true;
      let pageCount = 0;
      const maxPages = 50; // Limite de segurança
      
      // Data histórica de 3 anos atrás para garantir busca completa
      const historicalDate = new Date();
      historicalDate.setFullYear(historicalDate.getFullYear() - 3);
      const historicalTimestamp = Math.floor(historicalDate.getTime() / 1000); // Unix timestamp
      
      console.log('[LN Markets API] Parâmetros de busca intensificada:', {
        maxPages,
        limitPerPage: limit,
        historicalDate: historicalDate.toISOString(),
        historicalTimestamp
      });
      
      while (hasMoreData && pageCount < maxPages) {
        pageCount++;
        console.log(`[LN Markets API] 📄 Página ${pageCount} - Buscando depósitos (offset: ${currentOffset}, limit: ${limit})`);
        
        try {
          // Fazer requisição com paginação e parâmetros de data
          const pageResult = await this.client.userDepositHistory({
            limit,
            offset: currentOffset,
            from: historicalTimestamp // Buscar desde data histórica
          });
          
          console.log(`[LN Markets API] Página ${pageCount} - Resultado:`, {
            hasData: !!pageResult,
            isArray: Array.isArray(pageResult),
            length: Array.isArray(pageResult) ? pageResult.length : 0,
            totalColetados: allDeposits.length
          });
          
          if (!pageResult || !Array.isArray(pageResult) || pageResult.length === 0) {
            console.log(`[LN Markets API] Página ${pageCount} - Nenhum depósito encontrado, finalizando busca`);
            hasMoreData = false;
            break;
          }
          
          // Adicionar depósitos únicos (evitar duplicatas)
          const newDeposits = pageResult.filter(deposit => 
            !allDeposits.some(existing => existing.id === deposit.id)
          );
          
          allDeposits.push(...newDeposits);
          
          console.log(`[LN Markets API] Página ${pageCount} - Depósitos processados:`, {
            novosDepósitos: newDeposits.length,
            totalAcumulado: allDeposits.length,
            temMaisDados: pageResult.length === limit
          });
          
          // Log detalhado dos primeiros depósitos da página para debug
          if (pageCount <= 2) {
            pageResult.slice(0, 3).forEach((deposit, index) => {
              console.log(`[LN Markets API] Página ${pageCount} - Depósito ${index + 1}:`, {
                id: deposit.id,
                amount: deposit.amount,
                status: deposit.status,
                created_at: deposit.created_at,
                timestamp: deposit.timestamp
              });
            });
          }
          
          // Verificar se há mais dados
          if (pageResult.length < limit) {
            console.log(`[LN Markets API] Página ${pageCount} - Menos resultados que o limite (${pageResult.length} < ${limit}), finalizando`);
            hasMoreData = false;
          } else {
            currentOffset += limit;
          }
          
        } catch (pageError: any) {
          console.error(`[LN Markets API] Erro na página ${pageCount}:`, pageError);
          
          // Se for erro 404 ou similar, pode indicar fim dos dados
          if (pageError.response?.status === 404 || pageError.message?.includes('No more data')) {
            console.log(`[LN Markets API] Fim dos dados detectado na página ${pageCount}`);
            hasMoreData = false;
          } else {
            // Para outros erros, re-lançar
            throw pageError;
          }
        }
        
        // Pequeno delay entre requisições para evitar rate limiting
        if (hasMoreData) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      // Log final detalhado
      console.log('[LN Markets API] 🎯 BUSCA INTENSIFICADA CONCLUÍDA:', {
        totalDepósitos: allDeposits.length,
        páginasPercorridas: pageCount,
        atingiuLimiteSegurança: pageCount >= maxPages,
        dataInícioBusca: historicalDate.toISOString(),
        statusDistribution: allDeposits.reduce((acc, d) => {
          acc[d.status] = (acc[d.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        primeirosDepósitos: allDeposits.slice(0, 3).map(d => ({
          id: d.id,
          amount: d.amount,
          status: d.status,
          created_at: d.created_at
        })),
        últimosDepósitos: allDeposits.slice(-3).map(d => ({
          id: d.id,
          amount: d.amount,
          status: d.status,
          created_at: d.created_at
        }))
      });
      
      return {
        success: true,
        data: allDeposits,
      };
      
    } catch (error: any) {
      console.error('[LN Markets API] ❌ ERRO NA BUSCA INTENSIFICADA:', error);
      
      // Fallback para método simples se a busca intensificada falhar
      console.log('[LN Markets API] 🔄 Tentando busca simples como fallback...');
      return this.executeWithErrorHandling(
        () => this.client.userDepositHistory(),
        'getDeposits (fallback simples)'
      );
    }
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