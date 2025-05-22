/**
 * Tipos e interfaces para os dados de preços do Bitcoin
 */

// Tipos para os dados de preço
export interface BitcoinPrice {
  usd: number
  brl: number
  timestamp: number
  isUsingCache: boolean // Indica se estamos usando dados em cache
}

// Interface para os dados históricos
export interface HistoricalDataPoint {
  date: string
  price: number
  formattedDate: string
  timestamp: number
  isSampleData?: boolean
  isUsingCache?: boolean // Indica se estamos usando dados em cache
  source?: string // Indica a fonte dos dados (tradingview, coingecko, etc.)
}

// Tipos para a API de dados do aplicativo, incluindo preços de Bitcoin e taxas de câmbio.
// Estes tipos são usados tanto no frontend quanto no backend para consistência.

/**
 * Representa os dados de preço atuais para Bitcoin e taxas de câmbio relacionadas.
 */
export interface CurrentPriceData {
  usd: number;                  // Preço do Bitcoin em USD
  brl: number;                  // Preço do Bitcoin em BRL (calculado: btcUsd * usdToBrlExchangeRate)
  usdToBrlExchangeRate: number; // Taxa de câmbio: 1 USD = X BRL
  timestamp: string;            // Timestamp ISO da última atualização dos dados no servidor
  isUsingCache?: boolean;       // Indica se os dados retornados pelo /api/rates vieram do cache do KV ou foram buscados ao vivo
}

/**
 * Estrutura principal para os dados da aplicação buscados pelo frontend.
 */
export interface AppData {
  currentPrice: CurrentPriceData; // Dados de preço e taxas atuais
  isUsingCache: boolean;          // Pode refletir currentPrice.isUsingCache ou um status de cache mais global da AppData
  // Adicione aqui outros campos que AppData possa ter, como dados históricos, configurações do usuário, etc.
  // Por enquanto, focamos nos dados de preço.
  historicalDataUSD: HistoricalDataPoint[]
  historicalDataBRL: HistoricalDataPoint[]
  lastFetched: number
  // Adicionar campo para compatibilidade com o código existente
  historicalData?: {
    usd: HistoricalDataPoint[]
    brl: HistoricalDataPoint[]
  }
}

// Reexportar as funções do client-api
export { fetchAllAppData, getCurrentBitcoinPrice, getHistoricalBitcoinData } from './client-api';
