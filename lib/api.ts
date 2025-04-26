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
}

// Interface para os dados completos da aplicação
export interface AppData {
  currentPrice: BitcoinPrice
  historicalDataUSD: HistoricalDataPoint[]
  historicalDataBRL: HistoricalDataPoint[]
  lastFetched: number
  isUsingCache: boolean
  // Adicionar campo para compatibilidade com o código existente
  historicalData?: {
    usd: HistoricalDataPoint[]
    brl: HistoricalDataPoint[]
  }
}

// Reexportar as funções do client-api
export { fetchAllAppData, getCurrentBitcoinPrice, getHistoricalBitcoinData } from './client-api';
