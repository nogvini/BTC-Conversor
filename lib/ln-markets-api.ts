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
   * Busca histórico de depósitos com busca SUPER INTENSIFICADA
   * Usando método da biblioteca oficial - GET /v2/user/deposit
   * Implementa múltiplas estratégias para garantir cobertura total
   */
  async getDeposits(): Promise<LNMarketsApiResponse<LNMarketsDeposit[]>> {
    console.log('[LN Markets API] 🔍 BUSCA SUPER INTENSIFICADA DE DEPÓSITOS INICIADA');
    
    try {
      const allDeposits: LNMarketsDeposit[] = [];
      const strategies = [
        { name: 'ESTRATÉGIA 1: Busca padrão sem parâmetros', params: {} },
        { name: 'ESTRATÉGIA 2: Busca com limite máximo', params: { limit: 1000 } },
        { name: 'ESTRATÉGIA 3: Busca histórica 5 anos', params: { limit: 100, from: Math.floor(new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).getTime() / 1000) } },
        { name: 'ESTRATÉGIA 4: Busca paginada intensiva', params: { limit: 100, offset: 0 } },
        { name: 'ESTRATÉGIA 5: Busca sem filtros de data', params: { limit: 500 } }
      ];
      
      console.log('[LN Markets API] 🎯 EXECUTANDO MÚLTIPLAS ESTRATÉGIAS DE BUSCA');
      
      for (const strategy of strategies) {
        console.log(`[LN Markets API] 🚀 ${strategy.name}`);
        console.log(`[LN Markets API] Parâmetros:`, strategy.params);
        
        try {
          let strategyDeposits: LNMarketsDeposit[] = [];
          
          if (strategy.name.includes('ESTRATÉGIA 4')) {
            // Estratégia paginada especial - múltiplas páginas
            let currentOffset = 0;
            let hasMoreData = true;
            let pageCount = 0;
            const maxPages = 100; // Aumentado para 100 páginas
            
            while (hasMoreData && pageCount < maxPages) {
              pageCount++;
              console.log(`[LN Markets API] 📄 ${strategy.name} - Página ${pageCount} (offset: ${currentOffset})`);
              
              try {
                const pageResult = await this.client.userDepositHistory({
                  limit: 100,
                  offset: currentOffset
                  // SEM parâmetro 'from' para não filtrar por data
                });
                
                console.log(`[LN Markets API] Página ${pageCount} resultado:`, {
                  hasData: !!pageResult,
                  isArray: Array.isArray(pageResult),
                  length: Array.isArray(pageResult) ? pageResult.length : 0
                });
                
                if (!pageResult || !Array.isArray(pageResult) || pageResult.length === 0) {
                  console.log(`[LN Markets API] Página ${pageCount} - Sem dados, finalizando estratégia`);
                  hasMoreData = false;
                  break;
                }
                
                strategyDeposits.push(...pageResult);
                
                // Log dos primeiros depósitos da página
                if (pageCount <= 3) {
                  pageResult.slice(0, 2).forEach((deposit, index) => {
                    console.log(`[LN Markets API] Página ${pageCount} - Sample ${index + 1}:`, {
                      id: deposit.id,
                      amount: deposit.amount,
                      status: deposit.status,
                      created_at: deposit.created_at,
                      timestamp: deposit.timestamp
                    });
                  });
                }
                
                if (pageResult.length < 100) {
                  console.log(`[LN Markets API] Página ${pageCount} - Menos que 100 resultados (${pageResult.length}), finalizando`);
                  hasMoreData = false;
                } else {
                  currentOffset += 100;
                }
                
                // Delay entre páginas
                await new Promise(resolve => setTimeout(resolve, 300));
                
              } catch (pageError: any) {
                console.error(`[LN Markets API] Erro na página ${pageCount}:`, pageError);
                hasMoreData = false;
              }
            }
            
            console.log(`[LN Markets API] ${strategy.name} CONCLUÍDA:`, {
              páginasTotais: pageCount,
              depósitosEncontrados: strategyDeposits.length
            });
            
          } else {
            // Estratégias diretas
            const result = await this.client.userDepositHistory(strategy.params);
            
            if (result && Array.isArray(result)) {
              strategyDeposits = result;
            }
            
            console.log(`[LN Markets API] ${strategy.name} resultado:`, {
              hasData: !!result,
              isArray: Array.isArray(result),
              length: Array.isArray(result) ? result.length : 0
            });
          }
          
          // Adicionar novos depósitos únicos
          const uniqueNewDeposits = strategyDeposits.filter(deposit => 
            !allDeposits.some(existing => existing.id === deposit.id)
          );
          
          allDeposits.push(...uniqueNewDeposits);
          
          console.log(`[LN Markets API] ${strategy.name} - Novos depósitos únicos adicionados:`, {
            novos: uniqueNewDeposits.length,
            totalAcumulado: allDeposits.length
          });
          
          // Log dos depósitos mais antigos encontrados nesta estratégia
          if (uniqueNewDeposits.length > 0) {
            const sortedByDate = uniqueNewDeposits.sort((a, b) => {
              const dateA = new Date(a.created_at || a.timestamp || 0).getTime();
              const dateB = new Date(b.created_at || b.timestamp || 0).getTime();
              return dateA - dateB;
            });
            
            console.log(`[LN Markets API] ${strategy.name} - Depósito mais antigo desta estratégia:`, {
              id: sortedByDate[0]?.id,
              amount: sortedByDate[0]?.amount,
              status: sortedByDate[0]?.status,
              created_at: sortedByDate[0]?.created_at,
              timestamp: sortedByDate[0]?.timestamp
            });
          }
          
          // Delay entre estratégias
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (strategyError: any) {
          console.error(`[LN Markets API] Erro na ${strategy.name}:`, strategyError);
          // Continuar com próxima estratégia
        }
      }
      
      // ANÁLISE FINAL SUPER DETALHADA
      console.log('[LN Markets API] 🎯 BUSCA SUPER INTENSIFICADA CONCLUÍDA');
      console.log('[LN Markets API] 📊 ESTATÍSTICAS FINAIS:', {
        totalDepósitosÚnicos: allDeposits.length,
        estratégiasExecutadas: strategies.length
      });
      
      if (allDeposits.length > 0) {
        // Ordenar todos os depósitos por data (do mais antigo ao mais recente)
        const sortedAllDeposits = allDeposits.sort((a, b) => {
          const dateA = new Date(a.created_at || a.timestamp || 0).getTime();
          const dateB = new Date(b.created_at || b.timestamp || 0).getTime();
          return dateA - dateB;
        });
        
        console.log('[LN Markets API] 📅 ANÁLISE CRONOLÓGICA COMPLETA:');
        console.log('[LN Markets API] 🥇 DEPÓSITO MAIS ANTIGO ENCONTRADO:', {
          id: sortedAllDeposits[0]?.id,
          amount: sortedAllDeposits[0]?.amount,
          status: sortedAllDeposits[0]?.status,
          created_at: sortedAllDeposits[0]?.created_at,
          timestamp: sortedAllDeposits[0]?.timestamp,
          dataFormatada: sortedAllDeposits[0]?.created_at ? new Date(sortedAllDeposits[0].created_at).toLocaleString('pt-BR') : 'N/A'
        });
        
        console.log('[LN Markets API] 🥈 SEGUNDO MAIS ANTIGO:', {
          id: sortedAllDeposits[1]?.id,
          amount: sortedAllDeposits[1]?.amount,
          status: sortedAllDeposits[1]?.status,
          created_at: sortedAllDeposits[1]?.created_at,
          dataFormatada: sortedAllDeposits[1]?.created_at ? new Date(sortedAllDeposits[1].created_at).toLocaleString('pt-BR') : 'N/A'
        });
        
        console.log('[LN Markets API] 🥉 TERCEIRO MAIS ANTIGO:', {
          id: sortedAllDeposits[2]?.id,
          amount: sortedAllDeposits[2]?.amount,
          status: sortedAllDeposits[2]?.status,
          created_at: sortedAllDeposits[2]?.created_at,
          dataFormatada: sortedAllDeposits[2]?.created_at ? new Date(sortedAllDeposits[2].created_at).toLocaleString('pt-BR') : 'N/A'
        });
        
        console.log('[LN Markets API] 🆕 DEPÓSITO MAIS RECENTE:', {
          id: sortedAllDeposits[sortedAllDeposits.length - 1]?.id,
          amount: sortedAllDeposits[sortedAllDeposits.length - 1]?.amount,
          status: sortedAllDeposits[sortedAllDeposits.length - 1]?.status,
          created_at: sortedAllDeposits[sortedAllDeposits.length - 1]?.created_at,
          dataFormatada: sortedAllDeposits[sortedAllDeposits.length - 1]?.created_at ? new Date(sortedAllDeposits[sortedAllDeposits.length - 1].created_at).toLocaleString('pt-BR') : 'N/A'
        });
        
        // Estatísticas de status
        const statusDistribution = sortedAllDeposits.reduce((acc, d) => {
          acc[d.status] = (acc[d.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log('[LN Markets API] 📈 DISTRIBUIÇÃO DE STATUS:', statusDistribution);
        
        // Análise temporal
        const dateRange = {
          maisAntigo: sortedAllDeposits[0]?.created_at,
          maisRecente: sortedAllDeposits[sortedAllDeposits.length - 1]?.created_at
        };
        
        if (dateRange.maisAntigo && dateRange.maisRecente) {
          const diasSpan = Math.floor((new Date(dateRange.maisRecente).getTime() - new Date(dateRange.maisAntigo).getTime()) / (1000 * 60 * 60 * 24));
          console.log('[LN Markets API] ⏱️ INTERVALO TEMPORAL:', {
            de: new Date(dateRange.maisAntigo).toLocaleString('pt-BR'),
            até: new Date(dateRange.maisRecente).toLocaleString('pt-BR'),
            diasDeIntervalo: diasSpan
          });
        }
        
        return {
          success: true,
          data: sortedAllDeposits, // Retornar ordenado cronologicamente
        };
      } else {
        console.log('[LN Markets API] ⚠️ NENHUM DEPÓSITO ENCONTRADO EM NENHUMA ESTRATÉGIA');
        return {
          success: true,
          data: [],
        };
      }
      
    } catch (error: any) {
      console.error('[LN Markets API] ❌ ERRO NA BUSCA SUPER INTENSIFICADA:', error);
      
      // Fallback para método simples
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

  /**
   * Método de DEBUG para investigar endpoints e descobrir depósitos perdidos
   * Testa diferentes métodos e endpoints disponíveis na API
   */
  async debugDepositEndpoints(): Promise<LNMarketsApiResponse<any>> {
    console.log('[LN Markets API DEBUG] 🔬 INVESTIGAÇÃO DE ENDPOINTS PARA DEPÓSITOS PERDIDOS');
    
    const debugResults: any = {
      endpoints: {},
      methods: {},
      summary: {}
    };
    
    try {
      // Teste 1: Método padrão sem parâmetros
      console.log('[DEBUG] 🧪 Teste 1: userDepositHistory() sem parâmetros');
      try {
        const result1 = await this.client.userDepositHistory();
        debugResults.endpoints.default = {
          success: true,
          count: Array.isArray(result1) ? result1.length : 0,
          data: result1
        };
        console.log('[DEBUG] Resultado 1:', { hasData: !!result1, length: Array.isArray(result1) ? result1.length : 0 });
      } catch (error) {
        debugResults.endpoints.default = { success: false, error: error.message };
        console.error('[DEBUG] Erro teste 1:', error);
      }
      
      // Teste 2: Com limite muito alto
      console.log('[DEBUG] 🧪 Teste 2: userDepositHistory() com limit 10000');
      try {
        const result2 = await this.client.userDepositHistory({ limit: 10000 });
        debugResults.endpoints.highLimit = {
          success: true,
          count: Array.isArray(result2) ? result2.length : 0,
          data: result2
        };
        console.log('[DEBUG] Resultado 2:', { hasData: !!result2, length: Array.isArray(result2) ? result2.length : 0 });
      } catch (error) {
        debugResults.endpoints.highLimit = { success: false, error: error.message };
        console.error('[DEBUG] Erro teste 2:', error);
      }
      
      // Teste 3: Diferentes offsets
      console.log('[DEBUG] 🧪 Teste 3: userDepositHistory() com diferentes offsets');
      const offsetResults = [];
      for (let offset = 0; offset <= 500; offset += 100) {
        try {
          const result = await this.client.userDepositHistory({ limit: 100, offset });
          offsetResults.push({
            offset,
            count: Array.isArray(result) ? result.length : 0,
            hasData: Array.isArray(result) && result.length > 0
          });
          console.log(`[DEBUG] Offset ${offset}: ${Array.isArray(result) ? result.length : 0} depósitos`);
          
          if (!Array.isArray(result) || result.length === 0) {
            console.log(`[DEBUG] Offset ${offset}: Fim dos dados detectado`);
            break;
          }
          
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`[DEBUG] Erro offset ${offset}:`, error);
          break;
        }
      }
      debugResults.endpoints.offsetScan = offsetResults;
      
      // Teste 4: Com timestamp muito antigo (10 anos atrás)
      console.log('[DEBUG] 🧪 Teste 4: userDepositHistory() com timestamp 10 anos atrás');
      try {
        const ancient = Math.floor(new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000).getTime() / 1000);
        const result4 = await this.client.userDepositHistory({ limit: 1000, from: ancient });
        debugResults.endpoints.ancientTimestamp = {
          success: true,
          timestamp: ancient,
          count: Array.isArray(result4) ? result4.length : 0,
          data: result4
        };
        console.log('[DEBUG] Resultado 4:', { timestamp: ancient, hasData: !!result4, length: Array.isArray(result4) ? result4.length : 0 });
      } catch (error) {
        debugResults.endpoints.ancientTimestamp = { success: false, error: error.message };
        console.error('[DEBUG] Erro teste 4:', error);
      }
      
      // Teste 5: Buscar informações do usuário para ver outros endpoints disponíveis
      console.log('[DEBUG] 🧪 Teste 5: userGet() para verificar informações e possíveis endpoints');
      try {
        const userInfo = await this.client.userGet();
        debugResults.methods.userInfo = {
          success: true,
          data: userInfo
        };
        console.log('[DEBUG] Informações do usuário obtidas:', typeof userInfo, Object.keys(userInfo || {}));
      } catch (error) {
        debugResults.methods.userInfo = { success: false, error: error.message };
        console.error('[DEBUG] Erro ao obter info do usuário:', error);
      }
      
      // Teste 6: Verificar se existem outros métodos relacionados a depósitos
      console.log('[DEBUG] 🧪 Teste 6: Investigar métodos disponíveis no cliente');
      const availableMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(this.client))
        .filter(prop => typeof this.client[prop] === 'function')
        .filter(prop => prop.toLowerCase().includes('deposit') || prop.toLowerCase().includes('history') || prop.toLowerCase().includes('transaction'));
      
      debugResults.methods.available = availableMethods;
      console.log('[DEBUG] Métodos relacionados a depósitos/histórico encontrados:', availableMethods);
      
      // Resumo comparativo
      console.log('[DEBUG] 📊 ANÁLISE COMPARATIVA DOS RESULTADOS:');
      const counts = {
        default: debugResults.endpoints.default?.count || 0,
        highLimit: debugResults.endpoints.highLimit?.count || 0,
        maxOffset: Math.max(...(debugResults.endpoints.offsetScan?.map(r => r.count) || [0])),
        ancient: debugResults.endpoints.ancientTimestamp?.count || 0
      };
      
      const maxCount = Math.max(...Object.values(counts));
      const bestMethod = Object.keys(counts).find(key => counts[key] === maxCount);
      
      debugResults.summary = {
        counts,
        maxCount,
        bestMethod,
        recommendation: maxCount > 0 ? `Melhor método: ${bestMethod} com ${maxCount} depósitos` : 'Nenhum método retornou depósitos'
      };
      
      console.log('[DEBUG] 🎯 RESUMO:', debugResults.summary);
      
      return {
        success: true,
        data: debugResults
      };
      
    } catch (error: any) {
      console.error('[DEBUG] ❌ Erro geral na investigação:', error);
      return {
        success: false,
        error: error.message,
        data: debugResults
      };
    }
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