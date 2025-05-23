/**
 * API Client para o lado do cliente
 * Consome as APIs do servidor, eliminando a necessidade de armazenamento local
 */

import { AppData, BitcoinPrice, HistoricalDataPoint } from './api';

// URL base para as APIs do servidor
const API_BASE_URL = '/api/bitcoin';

/**
 * Buscar todos os dados necessários para a aplicação
 */
export async function fetchAllAppData(force: boolean = false): Promise<AppData> {
  try {
    const url = force 
      ? `${API_BASE_URL}/data?force=true` 
      : `${API_BASE_URL}/data`;
      
    const response = await fetch(url, {
      cache: force ? 'no-store' : 'default',
      next: force ? { revalidate: 0 } : { revalidate: 300 } // 5 minutos se não for forçado
    });
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar dados: ${response.status}`);
    }
    
    const data = await response.json() as AppData;
    
    // Adicionar o campo historicalData para compatibilidade com o código existente
    data.historicalData = {
      usd: data.historicalDataUSD,
      brl: data.historicalDataBRL
    };
    
    return data;
  } catch (error) {
    console.error('Erro ao buscar todos os dados:', error);
    throw error;
  }
}

/**
 * Buscar apenas o preço atual do Bitcoin
 * @param forceUpdate Força a atualização dos dados ignorando o cache
 * @returns Dados atualizados do preço do Bitcoin
 */
export async function getCurrentBitcoinPrice(forceUpdate: boolean = false): Promise<BitcoinPrice | null> {
  try {
    // Construir URL com parâmetro de força atualização se necessário
    const url = forceUpdate 
      ? `${API_BASE_URL}/price?force=true` 
      : `${API_BASE_URL}/price`;
    
    // Configurar opções da requisição
    const fetchOptions: RequestInit = {
      // Se forceUpdate, não usar cache
      cache: forceUpdate ? 'no-store' : 'default',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-App': 'BTCRaidToolkit',
        'X-Force-Update': forceUpdate ? 'true' : 'false'
      }
    };
    
    // Fazer a requisição com as opções adequadas
    console.log(`Buscando preço atual${forceUpdate ? ' (forçando atualização)' : ''}`);
    
    // Adicionar timeout para evitar requisições intermináveis
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos de timeout
    fetchOptions.signal = controller.signal;
    
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId); // Limpar timeout se obtiver resposta
    
    if (!response.ok) {
      console.warn(`Erro ao buscar preço: ${response.status} ${response.statusText}`);
      return null; // Retornar null em vez de lançar erro
    }
    
    // Exibir informações de diagnóstico se disponíveis
    const forceUpdateHeader = response.headers.get('X-Force-Update');
    if (forceUpdateHeader) {
      console.log(`Dados ${forceUpdateHeader === 'true' ? 'forçadamente atualizados' : 'obtidos do cache'}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar preço atual:', error);
    return null; // Retornar null em vez de lançar erro
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
    // Preparar parâmetros incluindo período para melhor cache
    const params = new URLSearchParams();
    params.append('currency', currency);
    params.append('days', days.toString());
    
    // Se período foi passado, utilizá-lo na requisição
    if (period) {
      params.append('period', period);
    }
    
    const url = `${API_BASE_URL}/historical?${params.toString()}`;
    
    // Configuração da requisição com suporte a cache
    const fetchOptions: RequestInit = {
      // Usar cache padrão do navegador para otimizar requisições repetidas
      cache: 'default',
      // Adicionar headers úteis para debugging
      headers: {
        'Content-Type': 'application/json',
        'X-Client-App': 'BTCRaidToolkit'
      }
    };
    
    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar dados históricos: ${response.status}`);
    }
    
    // Exibir informações de diagnóstico úteis
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