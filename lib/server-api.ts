/**
 * Módulo de API para o servidor
 * Gerencia requisições externas e armazenamento de dados
 */

import fs from 'fs';
import path from 'path';
import { BitcoinPrice, HistoricalDataPoint, AppData } from './api';

// Caminho para o arquivo de dados no servidor
const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'bitcoin-data.json');

// Garantir que o diretório data existe
const ensureDataDir = () => {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Buscar preço atual do Bitcoin em USD
async function fetchBitcoinUsdPrice(): Promise<number> {
  try {
    // Usando CoinGecko API - gratuita e confiável
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 } // Cache de 5 minutos
    });
    
    if (!response.ok) {
      console.error(`Erro ao obter preço do Bitcoin: ${response.status}`);
      return 65000; // Valor de fallback
    }
    
    const data = await response.json();
    return data.bitcoin.usd;
  } catch (error) {
    console.error('Erro ao buscar preço do Bitcoin:', error);
    return 65000; // Valor de fallback
  }
}

// Buscar taxa de conversão USD para BRL
async function fetchUsdToBrlRate(): Promise<number> {
  try {
    // Usando API de câmbio - Exchange Rate API
    const response = await fetch('https://open.er-api.com/v6/latest/USD', {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 } // Cache de 1 hora
    });
    
    if (!response.ok) {
      console.error(`Erro ao obter taxa de câmbio: ${response.status}`);
      return 5.2; // Taxa aproximada como fallback
    }
    
    const data = await response.json();
    return data.rates.BRL;
  } catch (error) {
    console.error('Erro ao buscar taxa de câmbio USD para BRL:', error);
    // Retornar taxa aproximada como fallback
    return 5.2;
  }
}

// Buscar dados históricos do Bitcoin
async function fetchHistoricalData(currency = 'usd', days = 30): Promise<HistoricalDataPoint[]> {
  try {
    // Usando CoinGecko API para dados históricos
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=${currency}&days=${days}`,
      {
        headers: { 
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store', // Não usar cache
        next: { revalidate: 0 } // Não reutilizar cache
      }
    );
    
    if (!response.ok) {
      console.error(`Erro ao obter dados históricos: ${response.status}`);
      // Usar dados de exemplo como fallback
      return generateSampleHistoricalData(days, currency);
    }
    
    const data = await response.json();
    
    // Converter dados para o formato esperado
    return data.prices.map(([timestamp, price]: [number, number]) => {
      const date = new Date(timestamp);
      return {
        date: date.toISOString().split('T')[0],
        price,
        formattedDate: formatDateForTimeRange(date, days),
        timestamp,
        isUsingCache: false
      };
    });
  } catch (error) {
    console.error(`Erro ao buscar dados históricos (${currency}):`, error);
    // Usar dados de exemplo como fallback
    return generateSampleHistoricalData(days, currency);
  }
}

// Formatar data conforme o intervalo de tempo
function formatDateForTimeRange(date: Date, days: number): string {
  if (days <= 1) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (days <= 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

// Gerar dados de exemplo como fallback (apenas se todas as alternativas falharem)
function generateSampleHistoricalData(days: number, currency: string): HistoricalDataPoint[] {
  const data: HistoricalDataPoint[] = [];
  const today = new Date();
  
  // Preço base e volatilidade
  let basePrice = currency.toLowerCase() === 'usd' ? 65000 : 65000 * 5.2;
  const volatility = 0.02; // 2% volatilidade diária
  
  // Fatores de tendência
  const trendFactor = 1.0005; // Leve tendência de alta
  
  // Gerar pontos de dados
  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Adicionar aleatoriedade e tendência
    const randomFactor = 1 + (Math.random() * volatility * 2 - volatility);
    basePrice = basePrice * randomFactor * trendFactor;
    
    // Adicionar padrões cíclicos
    const cyclicalFactor = 1 + 0.01 * Math.sin((i / 7) * Math.PI);
    const price = basePrice * cyclicalFactor;
    
    data.push({
      date: date.toISOString().split('T')[0],
      price: Math.round(price * 100) / 100,
      formattedDate: formatDateForTimeRange(date, days),
      timestamp: date.getTime(),
      isSampleData: true // Marcar como dados de exemplo
    });
  }
  
  return data;
}

// Salvar dados no arquivo
export async function saveAppData(data: AppData): Promise<void> {
  try {
    ensureDataDir();
    await fs.promises.writeFile(DATA_FILE_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Erro ao salvar dados:', error);
  }
}

// Obter dados do arquivo
export async function getAppData(): Promise<AppData | null> {
  try {
    ensureDataDir();
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(DATA_FILE_PATH)) {
      return null;
    }
    
    const fileData = await fs.promises.readFile(DATA_FILE_PATH, 'utf8');
    return JSON.parse(fileData) as AppData;
  } catch (error) {
    console.error('Erro ao ler dados:', error);
    return null;
  }
}

// Criar dados de fallback
function createFallbackAppData(): AppData {
  // Dados de exemplo para uso offline
  const timestamp = Date.now();
  
  const currentPrice: BitcoinPrice = {
    usd: 65000,
    brl: 65000 * 5.2,
    timestamp,
    isUsingCache: false
  };
  
  const historicalDataUSD = generateSampleHistoricalData(30, 'usd');
  const historicalDataBRL = generateSampleHistoricalData(30, 'brl');
  
  return {
    currentPrice,
    historicalDataUSD,
    historicalDataBRL,
    lastFetched: timestamp,
    isUsingCache: false,
    historicalData: {
      usd: historicalDataUSD,
      brl: historicalDataBRL
    }
  };
}

// Atualizar a função fetchAllAppData para adicionar o campo historicalData
export async function fetchAllAppData(): Promise<AppData> {
  try {
    // Verificar se temos dados recentes salvos
    const savedData = await getAppData();
    const now = Date.now();
    
    // Verificar se os dados salvos são recentes (menos de 5 minutos)
    if (savedData && (now - savedData.lastFetched < 5 * 60 * 1000)) {
      // Adicionar campo historicalData
      if (!savedData.historicalData) {
        savedData.historicalData = {
          usd: savedData.historicalDataUSD,
          brl: savedData.historicalDataBRL
        };
      }
      return { ...savedData, isUsingCache: true };
    }
    
    // Buscar novos dados
    let btcUsdPrice = 0;
    let usdToBrlRate = 0;
    let historicalDataUSD: HistoricalDataPoint[] = [];
    let historicalDataBRL: HistoricalDataPoint[] = [];
    let isUsingFallback = false;
    
    try {
      btcUsdPrice = await fetchBitcoinUsdPrice();
      usdToBrlRate = await fetchUsdToBrlRate();
      
      // Buscar dados históricos
      historicalDataUSD = await fetchHistoricalData('usd', 30);
      
      // Converter dados históricos USD para BRL
      historicalDataBRL = historicalDataUSD.map(dataPoint => ({
        ...dataPoint,
        price: dataPoint.price * usdToBrlRate
      }));
    } catch (error) {
      console.error("Erro ao buscar dados externos:", error);
      isUsingFallback = true;
      
      // Verificar se temos dados salvos para usar como cache
      if (savedData) {
        btcUsdPrice = savedData.currentPrice.usd;
        usdToBrlRate = savedData.currentPrice.brl / savedData.currentPrice.usd;
        historicalDataUSD = savedData.historicalDataUSD;
        historicalDataBRL = savedData.historicalDataBRL;
      } else {
        // Criar dados de fallback se não houver nada salvo
        const fallbackData = createFallbackAppData();
        btcUsdPrice = fallbackData.currentPrice.usd;
        usdToBrlRate = fallbackData.currentPrice.brl / fallbackData.currentPrice.usd;
        historicalDataUSD = fallbackData.historicalDataUSD;
        historicalDataBRL = fallbackData.historicalDataBRL;
      }
    }
    
    // Criar objeto de preço atual
    const currentPrice: BitcoinPrice = {
      usd: btcUsdPrice,
      brl: btcUsdPrice * usdToBrlRate,
      timestamp: now,
      isUsingCache: isUsingFallback
    };
    
    // Criar objeto de dados completo
    const appData: AppData = {
      currentPrice,
      historicalDataUSD,
      historicalDataBRL,
      lastFetched: now,
      isUsingCache: isUsingFallback,
      historicalData: {
        usd: historicalDataUSD,
        brl: historicalDataBRL
      }
    };
    
    // Salvar dados para uso futuro
    await saveAppData(appData);
    
    return appData;
  } catch (error) {
    console.error('Erro ao buscar todos os dados:', error);
    
    // Tentar usar dados salvos
    const savedData = await getAppData();
    if (savedData) {
      // Garantir que o campo historicalData existe
      if (!savedData.historicalData) {
        savedData.historicalData = {
          usd: savedData.historicalDataUSD,
          brl: savedData.historicalDataBRL
        };
      }
      return { ...savedData, isUsingCache: true };
    }
    
    // Criar e retornar dados de fallback como último recurso
    return createFallbackAppData();
  }
}

// Atualizar apenas o preço atual do Bitcoin
export async function updateCurrentPrice(): Promise<BitcoinPrice> {
  try {
    const now = Date.now();
    
    // Buscar novos dados
    const btcUsdPrice = await fetchBitcoinUsdPrice();
    const usdToBrlRate = await fetchUsdToBrlRate();
    
    // Criar objeto de preço atual
    const currentPrice: BitcoinPrice = {
      usd: btcUsdPrice,
      brl: btcUsdPrice * usdToBrlRate,
      timestamp: now,
      isUsingCache: false
    };
    
    // Atualizar dados salvos
    const savedData = await getAppData();
    if (savedData) {
      const updatedData = {
        ...savedData,
        currentPrice,
        lastFetched: now
      };
      await saveAppData(updatedData);
    }
    
    return currentPrice;
  } catch (error) {
    console.error('Erro ao atualizar preço atual:', error);
    
    // Tentar usar dados salvos
    const savedData = await getAppData();
    if (savedData) {
      return { ...savedData.currentPrice, isUsingCache: true };
    }
    
    // Retornar dados de fallback como último recurso
    return {
      usd: 65000,
      brl: 65000 * 5.2,
      timestamp: Date.now(),
      isUsingCache: true
    };
  }
}

// Buscar dados históricos específicos
export async function getHistoricalData(currency = 'usd', days = 30): Promise<HistoricalDataPoint[]> {
  try {
    // Tentar buscar novos dados históricos
    const historicalData = await fetchHistoricalData(currency, days);
    return historicalData;
  } catch (error) {
    console.error(`Erro ao obter dados históricos (${currency}):`, error);
    
    // Tentar usar dados salvos
    const savedData = await getAppData();
    if (savedData) {
      const cachedData = currency.toLowerCase() === 'usd' 
        ? savedData.historicalDataUSD 
        : savedData.historicalDataBRL;
      
      // Marcar dados como cache
      return cachedData.map(item => ({
        ...item,
        isUsingCache: true
      }));
    }
    
    // Usar dados de exemplo como último recurso
    return generateSampleHistoricalData(days, currency);
  }
}

// Adicionar nova função para forçar atualização sem respeitar cache
export async function forceUpdateAllData(): Promise<AppData> {
  try {
    const now = Date.now();
    
    // Buscar novos dados diretamente das APIs, ignorando o cache
    let btcUsdPrice = 0;
    let usdToBrlRate = 0;
    let historicalDataUSD: HistoricalDataPoint[] = [];
    let historicalDataBRL: HistoricalDataPoint[] = [];
    let isUsingFallback = false;
    
    try {
      btcUsdPrice = await fetchBitcoinUsdPrice();
      usdToBrlRate = await fetchUsdToBrlRate();
      
      // Buscar dados históricos
      historicalDataUSD = await fetchHistoricalData('usd', 30);
      
      // Converter dados históricos USD para BRL
      historicalDataBRL = historicalDataUSD.map(dataPoint => ({
        ...dataPoint,
        price: dataPoint.price * usdToBrlRate
      }));
    } catch (error) {
      console.error("Erro ao buscar dados externos:", error);
      isUsingFallback = true;
      
      // Se falhar, tentar usar dados salvos
      const savedData = await getAppData();
      if (savedData) {
        btcUsdPrice = savedData.currentPrice.usd;
        usdToBrlRate = savedData.currentPrice.brl / savedData.currentPrice.usd;
        historicalDataUSD = savedData.historicalDataUSD;
        historicalDataBRL = savedData.historicalDataBRL;
      } else {
        // Criar dados de fallback se não houver nada salvo
        const fallbackData = createFallbackAppData();
        btcUsdPrice = fallbackData.currentPrice.usd;
        usdToBrlRate = fallbackData.currentPrice.brl / fallbackData.currentPrice.usd;
        historicalDataUSD = fallbackData.historicalDataUSD;
        historicalDataBRL = fallbackData.historicalDataBRL;
      }
    }
    
    // Criar objeto de preço atual
    const currentPrice: BitcoinPrice = {
      usd: btcUsdPrice,
      brl: btcUsdPrice * usdToBrlRate,
      timestamp: now,
      isUsingCache: isUsingFallback
    };
    
    // Criar objeto de dados completo
    const appData: AppData = {
      currentPrice,
      historicalDataUSD,
      historicalDataBRL,
      lastFetched: now,
      isUsingCache: isUsingFallback,
      historicalData: {
        usd: historicalDataUSD,
        brl: historicalDataBRL
      }
    };
    
    // Salvar dados para uso futuro
    await saveAppData(appData);
    
    return appData;
  } catch (error) {
    console.error('Erro ao forçar atualização de todos os dados:', error);
    
    // Se tudo falhar, usar dados de fallback
    return createFallbackAppData();
  }
} 