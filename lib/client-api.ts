/**
 * API Client para o lado do cliente
 * Consome as APIs do servidor, eliminando a necessidade de armazenamento local
 */

import { AppData, BitcoinPrice, HistoricalDataPoint, type CurrentPriceData } from './api';

// URL base para as APIs do servidor
const API_BASE_URL = '/api/bitcoin';

/**
 * Buscar todos os dados necessários para a aplicação
 */
export async function fetchAllAppData(): Promise<AppData> {
  try {
    const response = await fetch('/api/rates');
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || response.statusText || response.status;
      console.error("Failed to fetch from /api/rates:", response.status, errorMessage);
      // Tenta retornar uma estrutura AppData de fallback com dados mínimos ou cacheados do cliente se disponíveis
      // Por enquanto, lançamos um erro para ser tratado pelo chamador.
      throw new Error(`API Error: ${errorMessage}`);
    }
    const data: { currentPrice: CurrentPriceData, isUsingCache: boolean } = await response.json();
    
    // Para os campos não fornecidos por /api/rates, precisamos fornecer valores padrão ou buscá-los de outro lugar.
    // Por agora, vamos fornecer valores de fallback para manter a estrutura AppData.
    return {
      currentPrice: {
        usd: data.currentPrice.usd,
        brl: data.currentPrice.brl,
        usdToBrlExchangeRate: data.currentPrice.usdToBrlExchangeRate,
        timestamp: data.currentPrice.timestamp,
        isUsingCache: data.currentPrice.isUsingCache, 
      },
      isUsingCache: data.isUsingCache, 
      // Valores de fallback para campos não cobertos por /api/rates
      historicalDataUSD: [], 
      historicalDataBRL: [],
      lastFetched: Date.now(), // Ou o timestamp de data.currentPrice.timestamp
      historicalData: { usd: [], brl: [] },
    };
  } catch (error) {
    console.error("Error in fetchAllAppData:", error);
    // Em um cenário real, poderia tentar carregar de um cache do localStorage do cliente aqui
    // ou retornar uma estrutura AppData com indicadores de erro.
    // Por enquanto, relançamos o erro.
    throw error; 
  }
}

/**
 * Buscar apenas o preço atual do Bitcoin
 * @param forceUpdate Força a atualização dos dados ignorando o cache
 * @returns Dados atualizados do preço do Bitcoin
 */
export async function getCurrentBitcoinPrice(forceRefresh?: boolean): Promise<CurrentPriceData> {
  // forceRefresh não tem efeito direto no KV aqui, pois o Cron atualiza o KV.
  // Esta função agora é uma conveniência para obter apenas os dados de preço.
  try {
    const appData = await fetchAllAppData();
    return appData.currentPrice;
  } catch (error) {
    console.error("Error in getCurrentBitcoinPrice:", error);
    throw error;
  }
}

/**
 * Obter dados históricos do Bitcoin
 */
export async function getHistoricalBitcoinData(
  currency = 'usd',
  days = 30,
  period?: string
): Promise<HistoricalDataPoint[]> {
  try {
    const params = new URLSearchParams();
    params.append('currency', currency);
    params.append('days', days.toString());
    
    if (period) {
      params.append('period', period);
    }
    
    const url = `${API_BASE_URL}/historical?${params.toString()}`;
    
    const fetchOptions: RequestInit = {
      cache: 'default',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-App': 'BTCRaidToolkit'
      }
    };
    
    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
      let errorData = { message: response.statusText, error: response.statusText }; // Fallback
      try {
        errorData = await response.json();
      } catch (jsonError) {
        // Corpo não é JSON ou está vazio, usar statusText
        console.warn('[client-api getHistoricalBitcoinData] Falha ao parsear corpo do erro JSON:', jsonError);
      }

      if (response.status === 429) {
        console.warn(`[client-api getHistoricalBitcoinData] Limite de requisições (429) detectado. Mensagem: ${errorData.message || errorData.error}`);
        throw new Error(`RATE_LIMIT: ${errorData.message || errorData.error || 'Limite de requisições atingido.'}`);
      }
      console.error(`[client-api getHistoricalBitcoinData] Erro ao buscar dados históricos (${response.status}):`, errorData);
      throw new Error(`Erro ${response.status}: ${errorData.message || errorData.error || response.statusText}`);
    }
    
    const source = response.headers.get('X-Data-Source');
    const usingCache = response.headers.get('X-Using-Cache');
    const responseTime = response.headers.get('X-Response-Time');
    
    if (source || usingCache || responseTime) {
      console.log(
        `Dados históricos: fonte=${source || 'desconhecida'}, ` +
        `cache=${usingCache === 'true' ? 'sim' : 'não'}, ` +
        `tempo=${responseTime || 'n/a'}`
      );
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar dados históricos:', error);
    throw error;
  }
}

export async function getHistoricalBitcoinDataForRange(
  currency: 'usd' | 'brl',
  fromDate: string, // Formato YYYY-MM-DD
  toDate: string,   // Formato YYYY-MM-DD
  forceUpdate: boolean = false
): Promise<HistoricalDataPoint[]> {
  try {
    const params = new URLSearchParams();
    params.append('currency', currency);
    params.append('fromDate', fromDate);
    params.append('toDate', toDate);
    if (forceUpdate) {
      params.append('force', 'true');
    }

    const url = `${API_BASE_URL}/historical?${params.toString()}`;
    
    const fetchOptions: RequestInit = {
      cache: forceUpdate ? 'no-store' : 'default',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-App': 'BTCRaidToolkit',
      },
      next: forceUpdate ? { revalidate: 0 } : { revalidate: 300 }
    };

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      let errorData = { message: response.statusText, error: response.statusText }; // Fallback
      try {
        errorData = await response.json();
      } catch (jsonError) {
        // Corpo não é JSON ou está vazio, usar statusText
        console.warn('[client-api getHistoricalBitcoinDataForRange] Falha ao parsear corpo do erro JSON:', jsonError);
      }

      if (response.status === 429) {
        console.warn(`[client-api getHistoricalBitcoinDataForRange] Limite de requisições (429) detectado. Mensagem: ${errorData.message || errorData.error}`);
        throw new Error(`RATE_LIMIT: ${errorData.message || errorData.error || 'Limite de requisições atingido.'}`);
      }
      console.error(`[client-api getHistoricalBitcoinDataForRange] Erro ao buscar dados históricos por intervalo (${response.status}):`, errorData);
      // Usar errorData.message se disponível (do corpo JSON da nossa API), senão errorData.error ou statusText
      throw new Error(`Erro ${response.status}: ${errorData.message || errorData.error || response.statusText}`);
    }

    const source = response.headers.get('X-Data-Source');
    const usingCache = response.headers.get('X-Using-Cache');
    const responseTime = response.headers.get('X-Response-Time');
    console.log(
      `Dados históricos (intervalo ${fromDate}-${toDate}): fonte=${source || 'desconhecida'}, ` +
      `cache=${usingCache === 'true' ? 'sim' : 'não'}, tempo=${responseTime || 'n/a'}`
    );

    return await response.json();
  } catch (error) {
    console.error('Erro em getHistoricalBitcoinDataForRange:', error);
    throw error; // Re-lançar para ser tratado pelo chamador
  }
}

export { HistoricalDataPoint };
