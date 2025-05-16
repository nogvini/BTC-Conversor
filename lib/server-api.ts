'use server';

/**
 * Módulo de API para o servidor
 * Gerencia requisições externas e armazenamento de dados
 */

import fs from 'fs';
import path from 'path';
import { BitcoinPrice, HistoricalDataPoint, AppData } from './api';
import { kv } from "@vercel/kv";
import { format, subDays, parseISO } from 'date-fns';

// Caminho para o arquivo de dados no servidor
const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'bitcoin-data.json');

// Adicionar um sistema de cache global no servidor
// Este cache é compartilhado entre todos os usuários
const globalCacheData: {
  historicalData: {
    [currency: string]: { // currency = 'usd' ou 'brl'
      [days: string]: { // key = "dias" (ex: "30")
        data: HistoricalDataPoint[],
        timestamp: number,
        lastRefreshed: number,
        accessCount: number,
        source: string
      }
    }
  },
  currentPrice: {
    data: BitcoinPrice | null,
    timestamp: number,
    lastRefreshed: number,
    accessCount: number
  },
  metadata: {
    totalApiCalls: number,
    cacheHits: number,
    lastFullUpdate: number
  }
} = {
  historicalData: {
    usd: {},
    brl: {}
  },
  currentPrice: {
    data: null,
    timestamp: 0,
    lastRefreshed: 0,
    accessCount: 0
  },
  metadata: {
    totalApiCalls: 0,
    cacheHits: 0,
    lastFullUpdate: 0
  }
};

// Constantes de expiração do cache
const CACHE_EXPIRATION = {
  PRICE: 5 * 60 * 1000, // 5 minutos para preço atual (reduzido de 10 para 5)
  HISTORICAL: 3 * 60 * 60 * 1000, // 3 horas para dados históricos (aumentado de 1 para 3)
  FORCE_UPDATE: 3 * 60 * 1000, // 3 minutos para força de atualização (reduzido de 5 para 3)
  BACKGROUND_REFRESH: 15 * 60 * 1000, // 15 minutos para atualização em segundo plano (reduzido de 30 para 15)
  PRE_CACHE_DURATION: 6 * 60 * 60 * 1000 // 6 horas para dados pré-carregados
};

// TTLs para Vercel KV
const DEFAULT_CACHE_TTL_SECONDS = 1 * 60 * 60; // 1 hora (padrão para ranges)
const DAILY_DATA_CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 horas (para dados de um único dia)

// Nova interface para o objeto de cache de dados históricos no Vercel KV
interface HistoricalDataCacheObject {
  data: HistoricalDataPoint[];
  lastUpdated: number; // Timestamp de quando os dados foram buscados da API fonte
  source: 'coingecko' | 'binance' | 'unknown'; // Fonte dos dados
}

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

// Buscar taxa de conversão USD para BRL - versão aprimorada com múltiplas fontes
async function fetchUsdToBrlRate(): Promise<number> {
  try {
    console.log('Obtendo taxa de câmbio USD para BRL - timestamp:', new Date().toISOString());

    // Primeira opção: Exchange Rate API (principal)
    try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD', {
      headers: { 'Accept': 'application/json' },
        cache: 'no-store',
        next: { revalidate: 0 } // Desativar cache para obter dados sempre atualizados
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Taxa obtida via ExchangeRate-API:', data.rates.BRL);
        return data.rates.BRL;
      }
      console.error(`Erro na API principal de taxas: ${response.status}`);
    } catch (primaryError) {
      console.error('Falha na API principal de taxas:', primaryError);
    }

    // Segunda opção: API alternativa - Frankfurter (fallback 1)
    try {
      const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=BRL', {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      
      if (response.ok) {
    const data = await response.json();
        console.log('Taxa obtida via Frankfurter:', data.rates.BRL);
    return data.rates.BRL;
      }
      console.error(`Erro na API alternativa de taxas: ${response.status}`);
    } catch (secondaryError) {
      console.error('Falha na API alternativa de taxas:', secondaryError);
    }

    // Terceira opção: BCB (Banco Central do Brasil) API - dados oficiais mas podem não ser do dia atual
    try {
      // Obter data de hoje formatada como YYYYMMDD
      const today = new Date();
      const formattedDate = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
      
      // URL da API do BCB para a data atual
      const bcbUrl = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${formattedDate}'&$format=json`;
      
      const response = await fetch(bcbUrl, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data = await response.json();
        // Verificar se temos dados para hoje
        if (data.value && data.value.length > 0) {
          console.log('Taxa obtida via BCB:', data.value[0].cotacaoCompra);
          return data.value[0].cotacaoCompra;
        }
        console.log('BCB não retornou dados para hoje, tentando data anterior');
        
        // Se não houver dados para hoje, tentar ontem
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayFormatted = `${yesterday.getFullYear()}${String(yesterday.getMonth() + 1).padStart(2, '0')}${String(yesterday.getDate()).padStart(2, '0')}`;
        
        const yesterdayUrl = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${yesterdayFormatted}'&$format=json`;
        
        const yesterdayResponse = await fetch(yesterdayUrl, {
          headers: { 'Accept': 'application/json' },
          cache: 'no-store'
        });
        
        if (yesterdayResponse.ok) {
          const yesterdayData = await yesterdayResponse.json();
          if (yesterdayData.value && yesterdayData.value.length > 0) {
            console.log('Taxa obtida via BCB (ontem):', yesterdayData.value[0].cotacaoCompra);
            return yesterdayData.value[0].cotacaoCompra;
          }
        }
      }
    } catch (bcbError) {
      console.error('Falha na API do Banco Central do Brasil:', bcbError);
    }

    // Tentar obter dados do cache global
    const savedData = await getAppData();
    if (savedData && savedData.currentPrice && savedData.currentPrice.usd > 0 && savedData.currentPrice.brl > 0) {
      const cachedRate = savedData.currentPrice.brl / savedData.currentPrice.usd;
      console.log('Usando taxa de câmbio do cache:', cachedRate);
      return cachedRate;
    }
    
    // Fallback final - valor aproximado
    console.log('Usando taxa de câmbio fallback: 5.2');
    return 5.2; // Taxa aproximada como último recurso
  } catch (error) {
    console.error('Erro geral ao buscar taxa de câmbio USD para BRL:', error);
    return 5.2; // Taxa aproximada como fallback
  }
}

// Buscar dados históricos do Bitcoin
async function fetchHistoricalData(
  currency = 'usd', 
  daysOrParams: number | { fromTimestamp: number; toTimestamp: number } = 30
): Promise<HistoricalDataPoint[]> {
  try {
    let apiUrl = '';
    let operationDescription = '';

    if (typeof daysOrParams === 'number') {
      const days = daysOrParams;
      operationDescription = `Moeda: ${currency}, Dias: ${days}`;
      apiUrl = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=${currency}&days=${days}`;
    } else {
      const { fromTimestamp, toTimestamp } = daysOrParams;
      operationDescription = `Moeda: ${currency}, De: ${new Date(fromTimestamp * 1000).toISOString().split('T')[0]}, Até: ${new Date(toTimestamp * 1000).toISOString().split('T')[0]}`;
      apiUrl = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=${currency}&from=${fromTimestamp}&to=${toTimestamp}`;
    }

    console.log(`[server-api] fetchHistoricalData: Buscando do CoinGecko. ${operationDescription}`);
    console.log(`[server-api] fetchHistoricalData: URL da API CoinGecko: ${apiUrl}`);

    const response = await fetch(
      apiUrl,
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
    
    // LOG ADICIONADO
    console.log(`[server-api] fetchHistoricalData: Dados recebidos do CoinGecko para ${operationDescription}:`, JSON.stringify(data).substring(0, 500) + (JSON.stringify(data).length > 500 ? '...' : ''));

    // Converter dados para o formato esperado
    if (!data.prices || !Array.isArray(data.prices)) {
      console.warn(`[server-api] fetchHistoricalData: CoinGecko retornou formato inesperado ou sem array 'prices' para ${operationDescription}. Retornando array vazio.`);
      return []; // Retorna array vazio se não houver prices
    }

    return data.prices.map(([timestamp, price]: [number, number]) => {
      const date = new Date(timestamp);
      // Para o endpoint /range, o timestamp já é diário (meia-noite UTC).
      // Para /market_chart?days=N, os timestamps podem ser mais granulares.
      // Normalizamos para YYYY-MM-DD com base no timestamp fornecido.
      const dateString = date.toISOString().split('T')[0];
      
      let formattedDisplayDate: string;
      if (typeof daysOrParams === 'number') {
        formattedDisplayDate = formatDateForTimeRange(date, daysOrParams);
      } else {
        // Para ranges, podemos simplesmente usar a data ou um formato mais curto se necessário
        formattedDisplayDate = dateString; // Ou formatar de outra forma se preferir
      }

      return {
        date: dateString,
        price,
        formattedDate: formattedDisplayDate,
        timestamp: Math.floor(timestamp / 1000), // Armazenar como Unix timestamp em segundos
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

// Atualizar o preço atual do Bitcoin - versão melhorada
export async function updateCurrentPrice(): Promise<BitcoinPrice> {
  try {
    const now = Date.now();
    const debugInfo: string[] = [];
    debugInfo.push(`Iniciando updateCurrentPrice: ${new Date(now).toISOString()}`);
    
    // Verificar se devemos forçar uma atualização
    // 1. Se o cache for muito recente, verificamos se é o primeiro acesso
    // 2. Se já houve acessos, verificamos se o cache está expirando em breve
    let forceUpdate = false;
    
    if (globalCacheData.currentPrice.data) {
      const cacheAge = now - globalCacheData.currentPrice.timestamp;
      
      if (cacheAge < CACHE_EXPIRATION.PRICE) {
        // Cache válido, mas verificar se está expirando em breve para pré-atualizar
        if (cacheAge > (CACHE_EXPIRATION.PRICE * 0.8)) {
          // Cache está nos últimos 20% da validade, atualizar em background
          debugInfo.push(`Cache expirando em breve (${Math.round(cacheAge/1000)}s), atualizando em background`);
          
          // Iniciar uma atualização em background e retornar o cache imediatamente
          setTimeout(() => {
            const updatePromise = updatePriceInBackground();
            // Não esperamos esta promise para não bloquear
          }, 100);
          
          // Retornar o cache atual, marcando como cache
          return {
            ...globalCacheData.currentPrice.data,
            isUsingCache: true
          };
        } else {
          // Cache recente e válido, usar sem problemas
          debugInfo.push(`Usando cache válido (idade: ${Math.round(cacheAge/1000)}s)`);
          
          // Incrementar contador de acesso
          globalCacheData.currentPrice.accessCount++;
          globalCacheData.metadata.cacheHits++;
          
          return {
            ...globalCacheData.currentPrice.data,
            isUsingCache: true
          };
        }
      } else {
        // Cache expirado, forçar atualização
        debugInfo.push(`Cache expirado (${Math.round(cacheAge/1000)}s), forçando atualização`);
        forceUpdate = true;
      }
    } else {
      // Não há cache, forçar atualização
      debugInfo.push('Sem cache disponível, forçando atualização');
      forceUpdate = true;
    }
    
    // Se chegamos aqui, precisamos atualizar os dados
    if (forceUpdate) {
      debugInfo.push('Buscando novos dados de preço do Bitcoin e taxa de câmbio');
      
      // Incrementar contador de chamadas de API
      globalCacheData.metadata.totalApiCalls++;
      
      // Buscar dados em paralelo para maior eficiência
      const [btcUsdPrice, usdToBrlRate] = await Promise.all([
        fetchBitcoinUsdPrice(),
        fetchUsdToBrlRate()
      ]);
      
      debugInfo.push(`BTC/USD: ${btcUsdPrice}, USD/BRL: ${usdToBrlRate}`);
      
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
        debugInfo.push('Dados salvos no sistema de arquivos');
      }
      
      // Atualizar cache global
      globalCacheData.currentPrice = {
        data: currentPrice,
        timestamp: now,
        lastRefreshed: now,
        accessCount: 1 // Iniciar com 1 porque já estamos acessando
      };
      
      debugInfo.push('Cache global atualizado');
      console.log('updateCurrentPrice:', debugInfo.join(' | '));
      
      return currentPrice;
    }

    // Se chegamos aqui sem retornar, algo deu errado - usar o cache
    console.log("Comportamento inesperado, retornando cache disponível");
    if (globalCacheData.currentPrice.data) {
      return {
        ...globalCacheData.currentPrice.data,
        isUsingCache: true
      };
    }
    
    // Sem cache, criar um valor padrão
    const currentTimestamp = Date.now();
    const fallbackPrice: BitcoinPrice = {
      usd: 65000,
      brl: 65000 * 5.2,
      timestamp: currentTimestamp,
      isUsingCache: true
    };
    
    return fallbackPrice;
  } catch (error) {
    console.error('Erro ao atualizar preço atual:', error);
    
    // Tentar usar o cache global mesmo que expirado
    if (globalCacheData.currentPrice.data) {
      console.log('Usando preço em cache global expirado após erro');
      return {
        ...globalCacheData.currentPrice.data,
        isUsingCache: true
      };
    }
    
    // Tentar usar dados salvos
    const savedData = await getAppData();
    if (savedData && savedData.currentPrice) {
      const now = Date.now();
      console.log('Usando preço salvo em arquivo após erro');
      
      // Atualizar o cache global
      globalCacheData.currentPrice = {
        data: savedData.currentPrice,
        timestamp: savedData.lastFetched,
        lastRefreshed: now,
        accessCount: 1
      };
      
      return { ...savedData.currentPrice, isUsingCache: true };
    }
    
    // Retornar dados de fallback como último recurso
    console.log('Usando preço fallback após erro');
    const now = Date.now();
    const fallbackPrice = {
      usd: 65000,
      brl: 65000 * 5.2,
      timestamp: now,
      isUsingCache: true
    };
    
    // Armazenar no cache global
    globalCacheData.currentPrice = {
      data: fallbackPrice,
      timestamp: now,
      lastRefreshed: now,
      accessCount: 1
    };
    
    return fallbackPrice;
  }
}

// Função auxiliar para atualizar o preço em background sem bloquear
async function updatePriceInBackground(): Promise<void> {
  try {
    console.log('Iniciando atualização de preço em background...');
    const now = Date.now();
    
    // Buscar novos dados
    const btcUsdPrice = await fetchBitcoinUsdPrice();
    const usdToBrlRate = await fetchUsdToBrlRate();
    
    console.log(`Dados atualizados em background: BTC/USD=${btcUsdPrice}, USD/BRL=${usdToBrlRate}`);
    
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
      timestamp: now,
      lastRefreshed: now,
      accessCount: globalCacheData.currentPrice.accessCount || 0 // Preservar contador
    };
    
    console.log('Atualização de preço em background concluída');
  } catch (error) {
    console.error('Erro na atualização de preço em background:', error);
  }
}

// Renomeada e ajustada: agora é fetchHistoricalDataFromCoinGecko
// Esta função busca diretamente da CoinGecko sem cache ou processamento especial.
async function fetchHistoricalDataFromCoinGecko(
  currency = 'usd',
  daysOrParams: number | { fromTimestamp: number; toTimestamp: number }
): Promise<{ data: HistoricalDataPoint[]; source: 'coingecko' } | null> {
  try {
    let apiUrl = '';
    let operationDescription = '';

    if (typeof daysOrParams === 'number') {
      const days = daysOrParams;
      operationDescription = `Moeda: ${currency}, Dias: ${days}`;
      apiUrl = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=${currency}&days=${days}`;
    } else {
      const { fromTimestamp, toTimestamp } = daysOrParams;
      operationDescription = `Moeda: ${currency}, De: ${new Date(fromTimestamp * 1000).toISOString().split('T')[0]}, Até: ${new Date(toTimestamp * 1000).toISOString().split('T')[0]}`;
      apiUrl = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=${currency}&from=${fromTimestamp}&to=${toTimestamp}`;
    }

    console.log(`[server-api CoinGecko] Tentando buscar dados. ${operationDescription}`);
    // console.log(`[server-api CoinGecko] URL da API: ${apiUrl}`); // Log da URL pode ser verboso demais para produção constante

    const response = await fetch(
      apiUrl,
      {
        headers: { 
          'Accept': 'application/json',
        },
        next: { revalidate: 0 } 
      }
    );
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[server-api CoinGecko] Erro ao obter dados: ${response.status} - ${response.statusText}. Body: ${errorBody}`);
      if (response.status === 429) {
        throw new Error(`[CoinGecko API] Limite de requisições atingido (429). Detalhes: ${errorBody}`);
      }
      // Para outros erros não-OK, retorna null para permitir fallback ou tratamento genérico.
      console.warn(`[server-api CoinGecko] Falha na CoinGecko (status ${response.status}).`);
      return null;
    }
    
    const jsonData = await response.json();
    
    if (!jsonData || !jsonData.prices || !Array.isArray(jsonData.prices)) {
      console.error('[server-api CoinGecko] Formato de resposta inesperado da API CoinGecko:', jsonData);
      return null;
    }

    const processedData: HistoricalDataPoint[] = jsonData.prices.map((priceEntry: [number, number]) => ({
      timestamp: Math.floor(priceEntry[0] / 1000), 
      price: priceEntry[1],
    }));
    
    console.log(`[server-api CoinGecko] Dados obtidos com sucesso da CoinGecko. ${processedData.length} pontos.`);
    return { data: processedData, source: 'coingecko' };

  } catch (error: any) {
    // Se o erro já é o nosso erro de limite de requisições, relança-o.
    if (error.message && error.message.includes("Limite de requisições")) {
      throw error;
    }
    // Para outras exceções (ex: falha de rede), loga e retorna null.
    console.error(`[server-api CoinGecko] Exceção ao buscar dados históricos da CoinGecko: ${error.message}`, error);
    return null;
  }
}

// Helper para converter data YYYY-MM-DD para timestamp Unix em segundos
function dateToUnixTimestamp(dateString: string): number {
  const date = parseISO(dateString); // parseISO lida com "YYYY-MM-DD"
  return Math.floor(date.getTime() / 1000);
}

// Função getHistoricalData modificada
export async function getHistoricalData(
  currency = 'usd',
  daysOrDateParams: number | { fromDate: string; toDate: string } = 30,
  forceUpdate = false
): Promise<HistoricalDataCacheObject | null> {
  const cacheKey = `historical_data_${currency}_${typeof daysOrDateParams === 'number' ? daysOrDateParams : `${daysOrDateParams.fromDate}_${daysOrDateParams.toDate}`}`;
  console.log(`[server-api getHistoricalData] Solicitado para key: ${cacheKey}, forceUpdate: ${forceUpdate}`);

  if (!forceUpdate) {
    try {
      const cachedData = await kv.get<HistoricalDataCacheObject>(cacheKey);
      if (cachedData) {
        const now = Date.now();
        let ttlToCheck = DEFAULT_CACHE_TTL_SECONDS * 1000;
        if (typeof daysOrDateParams !== 'number' && daysOrDateParams.fromDate === daysOrDateParams.toDate) {
          ttlToCheck = DAILY_DATA_CACHE_TTL_SECONDS * 1000;
        }

        if ((now - cachedData.lastUpdated) < ttlToCheck) {
          console.log(`[server-api getHistoricalData] Cache HIT para ${cacheKey}. Fonte: ${cachedData.source}, Última atualização: ${new Date(cachedData.lastUpdated).toISOString()}`);
          return cachedData;
        } else {
          console.log(`[server-api getHistoricalData] Cache STALE para ${cacheKey}. Dados de ${new Date(cachedData.lastUpdated).toISOString()}, Fonte original: ${cachedData.source}. Buscando novos dados.`);
          // Não retorna dados obsoletos por padrão, vai forçar atualização abaixo.
          // Para stale-while-revalidate, retornaríamos cachedData aqui e atualizaríamos em background.
        }
      } else {
        console.log(`[server-api getHistoricalData] Cache MISS para ${cacheKey}.`);
      }
    } catch (error) {
      console.error(`[server-api getHistoricalData] Erro ao ler cache KV para ${cacheKey}:`, error);
    }
  } else {
    console.log(`[server-api getHistoricalData] forceUpdate=true, pulando verificação de cache para ${cacheKey}.`);
  }

  // Se cache miss, expirado, ou forceUpdate=true
  console.log(`[server-api getHistoricalData] Tentando obter e atualizar dados para ${cacheKey} via forceUpdateHistoricalData.`);
  return forceUpdateHistoricalData(currency, daysOrDateParams);
}

export async function forceUpdateHistoricalData(
  currency = 'usd',
  daysOrParams: number | { fromDate: string; toDate: string }
): Promise<HistoricalDataCacheObject | null> {
  const cacheKey = `historical_data_${currency}_${typeof daysOrParams === 'number' ? daysOrParams : `${daysOrParams.fromDate}_${daysOrParams.toDate}`}`;
  let daysToFetch: number | { fromTimestamp: number; toTimestamp: number };

  if (typeof daysOrParams === 'number') {
    daysToFetch = daysOrParams;
  } else {
    daysToFetch = {
      fromTimestamp: dateToUnixTimestamp(daysOrParams.fromDate),
      toTimestamp: dateToUnixTimestamp(daysOrParams.toDate) + 86399, // + (24h - 1s) para incluir o dia inteiro
    };
  }

  console.log(`[server-api forceUpdateHistoricalData] Iniciando atualização para key: ${cacheKey}`);

  let fetchedResult: { data: HistoricalDataPoint[]; source: 'coingecko' | 'binance' } | null = null;
  let source: 'coingecko' | 'binance' | 'unknown' = 'unknown';
  let specificErrorMessage: string | null = null;

  // 1. Tentar CoinGecko
  try {
    fetchedResult = await fetchHistoricalDataFromCoinGecko(currency, daysToFetch);
    if (fetchedResult) {
      source = 'coingecko';
      console.log(`[server-api forceUpdateHistoricalData] Dados obtidos da CoinGecko para ${cacheKey}.`);
    } else {
      // Se fetchHistoricalDataFromCoinGecko retornou null (não por rate limit, mas outro erro)
      console.warn(`[server-api forceUpdateHistoricalData] Falha (não-específica) ao obter dados da CoinGecko para ${cacheKey}. Tentando fallback para Binance...`);
    }
  } catch (error: any) {
    if (error.message && error.message.includes("Limite de requisições")) {
      specificErrorMessage = error.message; // Captura a mensagem de rate limit da CoinGecko
      console.warn(`[server-api forceUpdateHistoricalData] CoinGecko reportou: ${specificErrorMessage}`);
    } else {
      // Outro erro inesperado da CoinGecko
      console.error(`[server-api forceUpdateHistoricalData] Erro inesperado da CoinGecko para ${cacheKey}: ${error.message}`, error);
      // Neste caso, não tentaremos Binance e relançaremos o erro para ser pego pela rota da API
      // A rota da API já tem um catch-all que pode resultar em 500 ou outra mensagem apropriada.
      // Ou poderíamos lançar um erro específico aqui se quiséssemos um tratamento diferenciado na rota.
      throw new Error(`Erro crítico ao buscar dados da CoinGecko: ${error.message}`); 
    }
  }

  // 2. Tentar Binance SE CoinGecko falhou (retornou null) E NÃO foi por um erro que já lançamos (como erro crítico)
  // E SE CoinGecko não forneceu uma mensagem de erro específica (como rate limit) que queremos propagar.
  if (!fetchedResult && !specificErrorMessage) { 
    console.log(`[server-api forceUpdateHistoricalData] Tentando Binance como fallback para ${cacheKey}.`);
    try {
      fetchedResult = await fetchHistoricalDataFromBinance(currency, daysToFetch);
      if (fetchedResult) {
        source = 'binance';
        console.log(`[server-api forceUpdateHistoricalData] Dados obtidos da BINANCE (fallback) para ${cacheKey}.`);
      } else {
         console.warn(`[server-api forceUpdateHistoricalData] Binance também falhou (retornou null) para ${cacheKey}.`);
      }
    } catch (error: any) {
      if (error.message && error.message.includes("Limite de requisições")) {
        // Se a Binance também deu rate limit, usamos essa mensagem.
        specificErrorMessage = error.message; 
        console.warn(`[server-api forceUpdateHistoricalData] Binance reportou: ${specificErrorMessage}`);
      } else {
        console.error(`[server-api forceUpdateHistoricalData] Erro inesperado da Binance para ${cacheKey}: ${error.message}`, error);
        // Não relança aqui para permitir que o fluxo chegue ao 'FALHA EM TODAS AS FONTES' se specificErrorMessage ainda for null
      }
    }
  }

  // Se houve uma mensagem de erro específica (como rate limit) e não conseguimos dados de nenhuma fonte
  if (specificErrorMessage && !fetchedResult) {
    throw new Error(specificErrorMessage); // Relança o erro (ex: "Limite de requisições...") para a rota da API.
  }

  if (!fetchedResult) {
    console.error(`[server-api forceUpdateHistoricalData] FALHA EM TODAS AS FONTES (CoinGecko, Binance) para ${cacheKey}.`);
    // Retornar null fará a rota /api/bitcoin/historical retornar 404.
    // Se specificErrorMessage tivesse sido definido e !fetchedResult, já teríamos lançado o erro acima.
    // Este caminho é para quando ambas as fontes retornam null sem um erro específico de rate limit capturado.
    return null; 
  }
  
  const dataToCache: HistoricalDataPoint[] = fetchedResult.data;

  if (dataToCache && dataToCache.length > 0) {
    const cacheObject: HistoricalDataCacheObject = {
      data: dataToCache,
      lastUpdated: Date.now(),
      source: source,
    };

    let ttl = DEFAULT_CACHE_TTL_SECONDS;
    if (typeof daysOrParams !== 'number' && daysOrParams.fromDate === daysOrParams.toDate) {
      ttl = DAILY_DATA_CACHE_TTL_SECONDS;
    }
    
    try {
      await kv.set(cacheKey, cacheObject, { ex: ttl });
      console.log(`[server-api forceUpdateHistoricalData] Cache atualizado para ${cacheKey} com dados de ${source}. TTL: ${ttl}s.`);
      return cacheObject;
    } catch (error) {
      console.error(`[server-api forceUpdateHistoricalData] Erro ao salvar no cache KV para ${cacheKey}:`, error);
      return cacheObject; 
    }
  } else {
    console.warn(`[server-api forceUpdateHistoricalData] Nenhum dado para cachear para ${cacheKey} após tentativa de busca.`);
    return null;
  }
}

// NOVA FUNÇÃO PARA BUSCAR DADOS DA BINANCE
async function fetchHistoricalDataFromBinance(
  currency: string,
  daysOrParams: number | { fromTimestamp: number; toTimestamp: number }
): Promise<{ data: HistoricalDataPoint[]; source: 'binance' } | null> {
  const symbol = currency.toUpperCase() === 'USD' ? 'BTCUSDT' : 
                 currency.toUpperCase() === 'BRL' ? 'BTCBRL' : null;

  if (!symbol) {
    console.warn(`[server-api Binance] Moeda não suportada pela Binance: ${currency}`);
    return null;
  }

  let startTime;
  let endTime = Date.now(); 
  const limit = 1000; 
  let operationDescription = `Moeda: ${currency} (Símbolo Binance: ${symbol})`;

  if (typeof daysOrParams === 'number') {
    startTime = Date.now() - (daysOrParams * 24 * 60 * 60 * 1000);
    operationDescription += `, Dias: ${daysOrParams}`;
    if (daysOrParams > limit) {
        console.warn(`[server-api Binance] Número de dias (${daysOrParams}) excede o limite de ${limit} velas. Buscando os ${limit} dias mais recentes.`);
        startTime = Date.now() - (limit * 24 * 60 * 60 * 1000);
    }
  } else {
    startTime = daysOrParams.fromTimestamp * 1000;
    endTime = daysOrParams.toTimestamp * 1000;
    operationDescription += `, De: ${new Date(startTime).toISOString().split('T')[0]}, Até: ${new Date(endTime).toISOString().split('T')[0]}`;
    
    const roughlyDaysInRange = (endTime - startTime) / (1000 * 60 * 60 * 24);
    if (roughlyDaysInRange > limit) {
        console.warn(`[server-api Binance] Range solicitado (${roughlyDaysInRange.toFixed(0)} dias) excede o limite de ${limit} velas. Ajustando startTime.`);
        startTime = endTime - (limit * 24 * 60 * 60 * 1000);
    }
  }
  
  if (endTime > Date.now()) {
    endTime = Date.now();
  }

  const apiUrl = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&startTime=${Math.floor(startTime)}&endTime=${Math.floor(endTime)}&limit=${limit}`;

  console.log(`[server-api Binance] Tentando buscar dados. ${operationDescription}`);
  // console.log(`[server-api Binance] URL da API: ${apiUrl}`);

  try {
    const response = await fetch(apiUrl, { next: { revalidate: 0 } }); 

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[server-api Binance] Erro ao obter dados: ${response.status} - ${response.statusText}. Body: ${errorBody}`);
      if (response.status === 429 || response.status === 418) { // 418 é usado pela Binance para ban de IP
        throw new Error(`[Binance API] Limite de requisições/Bloqueio atingido (${response.status}). Detalhes: ${errorBody}`);
      }
      // Para outros erros, retorna null.
      console.warn(`[server-api Binance] Falha na Binance (status ${response.status}).`);
      return null;
    }

    const klines = await response.json();

    if (!Array.isArray(klines) || klines.length === 0) {
      console.warn('[server-api Binance] Nenhum dado de klines retornado ou formato inesperado.');
      return null;
    }

    const processedData: HistoricalDataPoint[] = klines.map((kline: any[]) => {
      return {
        timestamp: Math.floor(kline[0] / 1000), 
        price: parseFloat(kline[4]), 
      };
    });
    
    const validData = processedData.filter(dp => !isNaN(dp.price));

    if (validData.length === 0 && klines.length > 0) {
        console.warn('[server-api Binance] Dados de klines recebidos, mas todos os preços eram inválidos após o processamento.');
        return null;
    }

    console.log(`[server-api Binance] Dados obtidos com sucesso da Binance. ${validData.length} pontos válidos.`);
    return { data: validData, source: 'binance' };

  } catch (error: any) {
    // Se o erro já é o nosso erro de limite de requisições/bloqueio, relança-o.
    if (error.message && (error.message.includes("Limite de requisições") || error.message.includes("Bloqueio atingido"))) {
      throw error;
    }
    // Para outras exceções (ex: falha de rede), loga e retorna null.
    console.error(`[server-api Binance] Exceção ao buscar dados históricos da Binance: ${error.message}`, error);
    return null;
  }
}

// Função de atualização de cache em segundo plano (exemplo, pode não ser diretamente usada no fluxo principal)
// ... existing code ...

// Função para atualizar cache em segundo plano
async function refreshCacheInBackground(currency = 'usd', days = 30): Promise<void> {
  // Executar em um setTimeout para não bloquear a thread principal
  setTimeout(async () => {
    try {
      console.log(`Iniciando atualização em segundo plano para ${currency} ${days} dias`);
      const cacheKey = `${days}`;
      const now = Date.now();
      globalCacheData.metadata.totalApiCalls++;
      
      // Buscar novos dados
      const historicalData = await fetchHistoricalData(currency, days);
      
      // Atualizar o cache global
      globalCacheData.historicalData[currency.toLowerCase()][cacheKey] = {
        data: historicalData,
        timestamp: now,
        lastRefreshed: now,
        accessCount: globalCacheData.historicalData[currency.toLowerCase()][cacheKey]?.accessCount || 1,
        source: 'tradingview-background' // Atualizado para TradingView conforme regra
      };
      
      // Atualizar também o cache no sistema de arquivos
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
      
      console.log(`Atualização em segundo plano concluída para ${currency} ${days} dias`);
      
      // Pré-carregar períodos adjacentes para evitar requisições repetidas
      await preloadAdjacentPeriods(currency, days);
    } catch (error) {
      console.error(`Erro na atualização em segundo plano (${currency}, ${days} dias):`, error);
    }
  }, 100); // Atraso mínimo para não bloquear
}

// Nova função para pré-carregar dados de períodos adjacentes
async function preloadAdjacentPeriods(currency = 'usd', currentDays = 30): Promise<void> {
  // Lista de períodos comuns a serem pré-carregados
  const commonPeriods = [1, 7, 30, 90, 365];
  
  // Identificar períodos adjacentes ao atual
  const currentIndex = commonPeriods.indexOf(currentDays);
  if (currentIndex === -1) return; // Período não está na lista comum
  
  // Períodos a serem pré-carregados (anterior e próximo, se existirem)
  const periodsToPreload: number[] = [];
  
  if (currentIndex > 0) {
    periodsToPreload.push(commonPeriods[currentIndex - 1]);
  }
  
  if (currentIndex < commonPeriods.length - 1) {
    periodsToPreload.push(commonPeriods[currentIndex + 1]);
  }
  
  // Pré-carregar cada período em segundo plano
  for (const days of periodsToPreload) {
    const cacheKey = `${days}`;
    const globalCache = globalCacheData.historicalData[currency.toLowerCase()][cacheKey];
    const currentTime = Date.now();
    
    // Verificar se precisa pré-carregar (se não existe no cache ou está muito antigo)
    if (!globalCache || currentTime - globalCache.timestamp > CACHE_EXPIRATION.PRE_CACHE_DURATION) {
      console.log(`Pré-carregando dados para ${currency} ${days} dias`);
      
      try {
        // Buscar dados com menor prioridade
        setTimeout(async () => {
          try {
            const data = await fetchHistoricalData(currency, days);
            
            // Salvar no cache global
            globalCacheData.historicalData[currency.toLowerCase()][cacheKey] = {
              data,
              timestamp: Date.now(),
              lastRefreshed: Date.now(),
              accessCount: 0, // Zero acessos por enquanto
              source: 'tradingview-preload'
            };
            
            console.log(`Pré-carregamento concluído para ${currency} ${days} dias`);
          } catch (error) {
            console.error(`Erro no pré-carregamento (${currency}, ${days} dias):`, error);
          }
        }, 2000); // Atraso maior para dar prioridade a outras requisições
      } catch (error) {
        console.error(`Erro ao iniciar pré-carregamento (${currency}, ${days} dias):`, error);
      }
    }
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

// Adicionar função para buscar o preço atual do Bitcoin (usada em outros lugares)
export async function getCurrentBitcoinPrice(currency = 'usd'): Promise<{ usd: number; brl: number; lastUpdated: string, source: 'cache' | 'api', isUsingCache?: boolean } | null> {
  const cacheKey = 'current_bitcoin_price';
  const now = Date.now();
  console.log('[server-api] getCurrentBitcoinPrice: Buscando preço atual.');

  try {
    const cachedData = await kv.get<{ price: { usd: number; brl: number }; lastUpdated: number }>(cacheKey);

    if (cachedData && (now - cachedData.lastUpdated) < (60 * 1000 * 5)) { // Cache de 5 minutos
      console.log('[server-api] getCurrentBitcoinPrice: Usando preço atual do cache.');
      return {
        ...cachedData.price,
        lastUpdated: new Date(cachedData.lastUpdated).toISOString(),
        source: 'cache',
        isUsingCache: true
      };
    }
  } catch (kvError: any) {
    console.error(`[server-api] getCurrentBitcoinPrice: Erro ao ler do KV (price): ${kvError.message}`);
  }
  
  console.log('[server-api] getCurrentBitcoinPrice: Buscando preço atual da API CoinGecko.');
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,brl');
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[server-api] getCurrentBitcoinPrice: Erro ${response.status} da API CoinGecko ao buscar preço atual. Body: ${errorBody}`);
      throw new Error(`Erro da API CoinGecko ao buscar preço atual: ${response.status}`);
    }
    const data = await response.json();
    const price = {
      usd: data.bitcoin.usd,
      brl: data.bitcoin.brl
    };

    try {
      await kv.set(cacheKey, { price, lastUpdated: now }, { ex: 60 * 10 }); // Cache de 10 minutos na escrita
      console.log('[server-api] getCurrentBitcoinPrice: Preço atual armazenado no cache.');
    } catch (kvError: any) {
      console.error(`[server-api] getCurrentBitcoinPrice: Erro ao escrever no KV (price): ${kvError.message}`);
    }

    return {
      ...price,
      lastUpdated: new Date(now).toISOString(),
      source: 'api',
      isUsingCache: false
    };
  } catch (error: any) {
    console.error(`[server-api] getCurrentBitcoinPrice: ERRO CRÍTICO ao buscar preço atual: ${error.message}`);
    // Tentar retornar cache antigo como fallback extremo
    try {
        const cachedData = await kv.get<{ price: { usd: number; brl: number }; lastUpdated: number }>(cacheKey);
        if (cachedData) {
            console.warn('[server-api] getCurrentBitcoinPrice: Usando cache antigo como fallback extremo após falha total da API.');
            return {
                ...cachedData.price,
                lastUpdated: new Date(cachedData.lastUpdated).toISOString(),
                source: 'cache_fallback_after_api_fail',
                isUsingCache: true
            };
        }
    } catch (kvErrorFallback: any) {
        console.error(`[server-api] getCurrentBitcoinPrice: Erro ao tentar ler cache de fallback extremo: ${kvErrorFallback.message}`);
    }
    return null;
  }
} 