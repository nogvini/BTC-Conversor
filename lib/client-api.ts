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
 */
export async function getCurrentBitcoinPrice(): Promise<BitcoinPrice> {
  try {
    const response = await fetch(`${API_BASE_URL}/price`);
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar preço: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar preço atual:', error);
    throw error;
  }
}

/**
 * Obter dados históricos do Bitcoin
 */
export async function getHistoricalBitcoinData(
  currency = 'usd',
  days = 30
): Promise<HistoricalDataPoint[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/historical?currency=${currency}&days=${days}`
    );
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar dados históricos: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar dados históricos:', error);
    throw error;
  }
} 