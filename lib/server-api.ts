/**
 * Módulo de API para o servidor
 * Gerencia requisições externas e armazenamento de dados
 */

import fs from 'fs';
import path from 'path';
import { BitcoinPrice, HistoricalDataPoint, AppData } from './api';

// Caminho para o arquivo de dados no servidor
const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'bitcoin-data.json');

// Adicionar um sistema de cache global no servidor
// Este cache é compartilhado entre todos os usuários
const globalCacheData: {
  historicalData: {
    [currency: string]: { // currency = 'usd' ou 'brl'
      [days: string]: { // key = "dias" (ex: "30")
        data: HistoricalDataPoint[],
        timestamp: number
      }
    }
  },
  currentPrice: {
    data: BitcoinPrice | null,
    timestamp: number
  }
} = {
  historicalData: {
    usd: {},
    brl: {}
  },
  currentPrice: {
    data: null,
    timestamp: 0
  }
};

// Constantes de expiração do cache
const CACHE_EXPIRATION = {
  PRICE: 5 * 60 * 1000, // 5 minutos para preço atual
  HISTORICAL: 60 * 60 * 1000, // 1 hora para dados históricos
  FORCE_UPDATE: 1 * 60 * 1000 // 1 minuto para força de atualização (proteção contra muitas requisições)
};

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
    // Usar diretamente a API do CoinGecko para maior confiabilidade
    console.log(`Buscando dados históricos do CoinGecko para Bitcoin em ${currency} (${days} dias)`);
    
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
      throw new Error(`API retornou status ${response.status}`);
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
        source: 'coingecko',
        isUsingCache: false
      };
    });
  } catch (error) {
    console.error(`Erro ao buscar dados históricos (${currency}):`, error);
    throw new Error('Não foi possível obter dados históricos');
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
  // Dados mínimos em caso de erro total
  const timestamp = Date.now();
  
  const currentPrice: BitcoinPrice = {
    usd: 0,
    brl: 0,
    timestamp,
    isUsingCache: false
  };
  
  // Não gerar mais dados de exemplo
  const historicalDataUSD: HistoricalDataPoint[] = [];
  const historicalDataBRL: HistoricalDataPoint[] = [];
  
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
    
    // Verificar se houve uma atualização recente no cache global
    if (globalCacheData.currentPrice.data && 
        (now - globalCacheData.currentPrice.timestamp < CACHE_EXPIRATION.PRICE)) {
      console.log(`Usando preço em cache global - última atualização: ${new Date(globalCacheData.currentPrice.timestamp).toLocaleString()}`);
      return {
        ...globalCacheData.currentPrice.data,
        isUsingCache: true
      };
    }
    
    // Buscar novos dados
    console.log('Buscando novos dados de preço');
    const btcUsdPrice = await fetchBitcoinUsdPrice();
    const usdToBrlRate = await fetchUsdToBrlRate();
    
    // Criar objeto de preço atual
    const currentPrice: BitcoinPrice = {
      usd: btcUsdPrice,
      brl: btcUsdPrice * usdToBrlRate,
      timestamp: now,
      isUsingCache: false
    };
    
    // Atualizar dados salvos no sistema de arquivos
    const savedData = await getAppData();
    if (savedData) {
      const updatedData = {
        ...savedData,
        currentPrice,
        lastFetched: now
      };
      await saveAppData(updatedData);
    }
    
    // Atualizar cache global
    globalCacheData.currentPrice = {
      data: currentPrice,
      timestamp: now
    };
    
    return currentPrice;
  } catch (error) {
    console.error('Erro ao atualizar preço atual:', error);
    
    // Tentar usar o cache global mesmo que expirado
    if (globalCacheData.currentPrice.data) {
      console.log('Usando preço em cache global expirado');
      return {
        ...globalCacheData.currentPrice.data,
        isUsingCache: true
      };
    }
    
    // Tentar usar dados salvos
    const savedData = await getAppData();
    if (savedData) {
      // Atualizar o cache global
      globalCacheData.currentPrice = {
        data: savedData.currentPrice,
        timestamp: savedData.lastFetched
      };
      
      return { ...savedData.currentPrice, isUsingCache: true };
    }
    
    // Retornar dados de fallback como último recurso
    const fallbackPrice = {
      usd: 65000,
      brl: 65000 * 5.2,
      timestamp: Date.now(),
      isUsingCache: true
    };
    
    // Armazenar no cache global
    globalCacheData.currentPrice = {
      data: fallbackPrice,
      timestamp: Date.now()
    };
    
    return fallbackPrice;
  }
}

// Função para buscar dados históricos com parâmetros específicos
export async function getHistoricalData(currency = 'usd', days = 30): Promise<HistoricalDataPoint[]> {
  try {
    // Primeiramente, verificar se temos dados no cache global
    const cacheKey = `${days}`;
    const globalCache = globalCacheData.historicalData[currency.toLowerCase()][cacheKey];
    const now = Date.now();
    
    // Verificar se os dados do cache global são recentes (menos de 1 hora)
    if (globalCache && (now - globalCache.timestamp < CACHE_EXPIRATION.HISTORICAL)) {
      console.log(`Usando cache global para ${currency} ${days} dias - última atualização: ${new Date(globalCache.timestamp).toLocaleString()}`);
      return globalCache.data.map((item: HistoricalDataPoint) => ({
        ...item,
        isUsingCache: true // Indicar que estamos usando cache
      }));
    }
    
    // Se não temos dados no cache global ou estão desatualizados, tentar o filesystem
    const cacheData = await getAppData();
    
    // Verificar se os dados são recentes (menos de 1 hora)
    if (cacheData) {
      const cacheTime = cacheData.lastFetched;
      const cacheAge = now - cacheTime;
      
      // Se os dados foram atualizados há menos de 1 hora, retornar do cache
      if (cacheAge < CACHE_EXPIRATION.HISTORICAL) {
        // Retornar dados históricos apropriados
        const historicalData = currency === 'usd' ? cacheData.historicalDataUSD : cacheData.historicalDataBRL;
        
        // Filtrar para o número de dias solicitado
        if (historicalData.length >= days) {
          // Atualizar o cache global para futuros usuários
          globalCacheData.historicalData[currency.toLowerCase()][cacheKey] = {
            data: historicalData.slice(0, days),
            timestamp: cacheTime // Usar o timestamp original do cache
          };
          
          return historicalData.slice(0, days).map(item => ({
            ...item,
            isUsingCache: true
          }));
        }
      }
    }
    
    // Se chegamos aqui, precisamos buscar novos dados
    console.log(`Buscando novos dados para ${currency} ${days} dias`);
    const historicalData = await fetchHistoricalData(currency, days);
    
    // Atualizar o cache local
    if (cacheData) {
      if (currency === 'usd') {
        cacheData.historicalDataUSD = historicalData;
      } else {
        cacheData.historicalDataBRL = historicalData;
      }
      cacheData.lastFetched = now;
      await saveAppData(cacheData);
    }
    
    // Atualizar o cache global
    globalCacheData.historicalData[currency.toLowerCase()][cacheKey] = {
      data: historicalData,
      timestamp: now
    };
    
    return historicalData;
  } catch (error) {
    console.error(`Erro ao obter dados históricos (${currency}, ${days} dias):`, error);
    
    // Tentar usar dados do cache global mesmo que estejam expirados
    const cacheKey = `${days}`;
    const globalCache = globalCacheData.historicalData[currency.toLowerCase()][cacheKey];
    if (globalCache) {
      console.log(`Usando cache global expirado para ${currency} ${days} dias`);
      return globalCache.data.map((item: HistoricalDataPoint) => ({
        ...item,
        isUsingCache: true
      }));
    }
    
    // Tentar usar dados salvos no sistema de arquivos
    const savedData = await getAppData();
    if (savedData) {
      const historicalData = currency === 'usd' ? savedData.historicalDataUSD : savedData.historicalDataBRL;
      
      if (historicalData && historicalData.length > 0) {
        // Atualizar o cache global com dados salvos
        globalCacheData.historicalData[currency.toLowerCase()][cacheKey] = {
          data: historicalData.slice(0, days),
          timestamp: savedData.lastFetched
        };
        
        return historicalData.slice(0, days).map(item => ({
          ...item,
          isUsingCache: true
        }));
      }
    }
    
    // Se falhar completamente, retornar array vazio
    const emptyData: HistoricalDataPoint[] = [];
    
    // Armazenar os dados vazios no cache global
    globalCacheData.historicalData[currency.toLowerCase()][cacheKey] = {
      data: emptyData,
      timestamp: Date.now()
    };
    
    return emptyData;
  }
}

// Nova função para forçar a atualização dos dados históricos
export async function forceUpdateHistoricalData(currency = 'usd', days = 30): Promise<HistoricalDataPoint[]> {
  try {
    // Verificar se uma atualização forçada foi feita recentemente para evitar sobrecarga
    const cacheKey = `${days}`;
    const currentCache = globalCacheData.historicalData[currency.toLowerCase()][cacheKey];
    const now = Date.now();
    
    // Se já houve uma atualização recente (menos de 1 minuto), usar o cache para evitar sobrecarga
    if (currentCache && (now - currentCache.timestamp < CACHE_EXPIRATION.FORCE_UPDATE)) {
      console.log(`Usando cache recente para ${currency} ${days} dias - última atualização: ${new Date(currentCache.timestamp).toLocaleString()}`);
      return currentCache.data.map((item: HistoricalDataPoint) => ({
        ...item,
        isUsingCache: true // Indicar que estamos usando cache
      }));
    }
    
    // Buscar dados diretamente da fonte, ignorando o cache
    console.log(`Forçando atualização dos dados para ${currency} ${days} dias`);
    const historicalData = await fetchHistoricalData(currency, days);
    
    // Atualizar o cache após a busca
    const cacheData = await getAppData();
    if (cacheData) {
      if (currency === 'usd') {
        cacheData.historicalDataUSD = historicalData;
      } else {
        cacheData.historicalDataBRL = historicalData;
      }
      cacheData.lastFetched = now;
      await saveAppData(cacheData);
    }
    
    // Atualizar o cache global - disponível para todos os usuários
    globalCacheData.historicalData[currency.toLowerCase()][cacheKey] = {
      data: historicalData,
      timestamp: now
    };
    
    return historicalData;
  } catch (error) {
    console.error(`Erro ao forçar atualização de dados históricos (${currency}, ${days} dias):`, error);
    
    // Se falhar, ainda tentamos retornar dados em cache ou simulados
    return getHistoricalData(currency, days);
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