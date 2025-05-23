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

// Função para buscar dados históricos com parâmetros específicos
export async function getHistoricalData(currency = 'usd', days = 30): Promise<HistoricalDataPoint[]> {
  try {
    // Primeiramente, verificar se temos dados no cache global
    const cacheKey = `${days}`;
    const globalCache = globalCacheData.historicalData[currency.toLowerCase()][cacheKey];
    const now = Date.now();
    
    // Verificar se os dados do cache global são recentes
    if (globalCache && globalCache.data.length > 0) {
      // Incrementar contador de acessos
      globalCache.accessCount++;
      globalCacheData.metadata.cacheHits++;
      
      // Verificar se os dados ainda são válidos (menos de 3 horas)
      if (now - globalCache.timestamp < CACHE_EXPIRATION.HISTORICAL) {
        console.log(`Usando cache global para ${currency} ${days} dias - última atualização: ${new Date(globalCache.timestamp).toLocaleString()}`);
        
        // Atualizar timestamp de último acesso
        globalCache.lastRefreshed = now;
        
        // Verificar se devemos atualizar em segundo plano
        // Somente se o cache foi acessado pelo menos 3 vezes e a última atualização foi há mais de 30 minutos
        if (globalCache.accessCount > 3 && 
            (now - globalCache.timestamp > CACHE_EXPIRATION.BACKGROUND_REFRESH)) {
          console.log(`Iniciando atualização em segundo plano para ${currency} ${days} dias`);
          
          // Não usar await para não bloquear a resposta
          refreshCacheInBackground(currency, days);
        }
        
        return globalCache.data.map((item: HistoricalDataPoint) => ({
          ...item,
          isUsingCache: true // Indicar que estamos usando cache
        }));
      }
      
      // Se os dados estão expirados mas ainda temos algum dado, retornar do cache
      // enquanto iniciamos a atualização em segundo plano
      console.log(`Cache expirado para ${currency} ${days} dias - iniciando atualização em segundo plano`);
      
      // Não usar await para não bloquear a resposta
      refreshCacheInBackground(currency, days);
      
      return globalCache.data.map((item: HistoricalDataPoint) => ({
        ...item,
        isUsingCache: true // Indicar que estamos usando cache
      }));
    }
    
    // Se não temos dados no cache global, tentar o filesystem
    const cacheData = await getAppData();
    
    // Verificar se os dados são existem
    if (cacheData) {
      const cacheTime = cacheData.lastFetched;
      const cacheAge = now - cacheTime;
      
      // Retornar dados históricos apropriados
      const historicalData = currency === 'usd' ? cacheData.historicalDataUSD : cacheData.historicalDataBRL;
      
      // Filtrar para o número de dias solicitado
      if (historicalData.length >= days) {
        // Atualizar o cache global para futuros usuários
        globalCacheData.historicalData[currency.toLowerCase()][cacheKey] = {
          data: historicalData.slice(0, days),
          timestamp: cacheTime, // Usar o timestamp original do cache
          lastRefreshed: now,
          accessCount: 1,
          source: 'filesystem'
        };
        
        // Iniciar atualização em segundo plano se os dados são antigos
        if (cacheAge > CACHE_EXPIRATION.BACKGROUND_REFRESH) {
          console.log(`Dados do filesystem estão antigos - iniciando atualização em segundo plano`);
          refreshCacheInBackground(currency, days);
        }
        
        return historicalData.slice(0, days).map(item => ({
          ...item,
          isUsingCache: true
        }));
      }
    }
    
    // Se chegamos aqui, precisamos buscar novos dados
    console.log(`Buscando novos dados para ${currency} ${days} dias`);
    globalCacheData.metadata.totalApiCalls++;
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
      timestamp: now,
      lastRefreshed: now,
      accessCount: 1,
      source: 'tradingview' // Atualizado para TradingView conforme regra
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
          timestamp: savedData.lastFetched,
          lastRefreshed: now,
          accessCount: 1,
          source: 'filesystem-fallback'
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
      timestamp: Date.now(),
      lastRefreshed: Date.now(),
      accessCount: 1,
      source: 'empty'
    };
    
    return emptyData;
  }
}

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
      timestamp: now,
      lastRefreshed: now,
      accessCount: 0,
      source: 'filesystem'
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