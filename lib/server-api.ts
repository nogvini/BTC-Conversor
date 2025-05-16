'use server';

/**
 * Módulo de API para o servidor
 * Gerencia requisições externas e armazenamento de dados
 */

import { BitcoinPrice, HistoricalDataPoint, AppData } from './api';
import { kv } from "@vercel/kv";
import { format, subDays, parseISO } from 'date-fns';
import { RateLimitError, ExternalApiError, DataNotFoundError, ApiError } from './errors';

// Caminho para o arquivo de dados no servidor
// const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'bitcoin-data.json');

// Chave para armazenar AppData no Vercel KV
const APP_DATA_KV_KEY = 'appDataStore';

// Adicionar um sistema de cache global no servidor
// Este cache é compartilhado entre todos os usuários
// ESTE CACHE EM MEMÓRIA PODE SER ÚTIL PARA ACESSOS MUITO FREQUENTES,
// MAS PRECISA SER SINCRONIZADO COM O KV OU SER CONSIDERADO UM CACHE DE CURTA DURAÇÃO.
// POR AGORA, VAMOS PRIORIZAR O KV PARA PERSISTÊNCIA E CONSISTÊNCIA.
const globalCacheData: any = {
  historicalData: { usd: {}, brl: {} },
  currentPrice: { data: null, timestamp: 0, lastRefreshed: 0, accessCount: 0 },
  metadata: { totalApiCalls: 0, cacheHits: 0, lastFullUpdate: 0 }
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
const APP_DATA_TTL_SECONDS = 24 * 60 * 60; // 24 horas para o AppData principal
const DEFAULT_CACHE_TTL_SECONDS = 1 * 60 * 60; // 1 hora (padrão para ranges)
const DAILY_DATA_CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 horas (para dados de um único dia)

// Nova interface para o objeto de cache de dados históricos no Vercel KV
interface HistoricalDataCacheObject {
  data: HistoricalDataPoint[];
  lastUpdated: number; // Timestamp de quando os dados foram buscados da API fonte
  source: 'coingecko' | 'binance' | 'unknown' | 'fallback'; // Fonte dos dados
}

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
  // Esta função parece ser a versão antiga, que pode ser obsoleta agora
  // com fetchHistoricalDataFromCoinGecko e fetchHistoricalDataFromBinance
  // Se não estiver sendo usada, pode ser removida para evitar confusão.
  console.warn('[server-api] A função fetchHistoricalData (original) foi chamada. Considerar refatoração para usar getHistoricalData ou forceUpdateHistoricalData.');
  let apiUrl = '';
  if (typeof daysOrParams === 'number') {
    apiUrl = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=${currency}&days=${daysOrParams}`;
  } else {
    apiUrl = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=${currency}&from=${daysOrParams.fromTimestamp}&to=${daysOrParams.toTimestamp}`;
  }
  const response = await fetch(apiUrl, { headers: { 'Accept': 'application/json' }});
  if (!response.ok) throw new Error(`API retornou status ${response.status}`);
  const data = await response.json();
  if (!data.prices || !Array.isArray(data.prices)) return [];
  return data.prices.map(([timestamp, price]: [number, number]) => ({ 
    timestamp: Math.floor(timestamp / 1000), price, date: new Date(timestamp).toISOString().split('T')[0],
    formattedDate: new Date(timestamp).toLocaleDateString(), source:'coingecko', isUsingCache: false
  }));
}

// Formatar data conforme o intervalo de tempo
function formatDateForTimeRange(date: Date, days: number): string {
  if (days <= 1) { return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  else if (days <= 7) { return date.toLocaleDateString([], { weekday: 'short' }); }
  else { return date.toLocaleDateString([], { month: 'short', day: 'numeric' }); }
}

// Salvar dados no arquivo
export async function saveAppData(data: AppData): Promise<void> {
  try {
    // ensureDataDir(); // REMOVIDO - Não usar mais o sistema de arquivos
    // fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2)); // REMOVIDO
    console.log('[server-api] Salvando AppData no Vercel KV...');
    await kv.set(APP_DATA_KV_KEY, data, { ex: APP_DATA_TTL_SECONDS });
    console.log('[server-api] AppData salvo no Vercel KV com sucesso.');
    
    // Atualizar o cache em memória, se ainda for usado
    // globalCacheData.currentPrice = { data: data.currentPrice, timestamp: Date.now(), lastRefreshed: Date.now(), accessCount: 0 };
    // globalCacheData.historicalData = data.historicalData; // Precisa de uma estrutura mais granular
    // globalCacheData.metadata.lastFullUpdate = Date.now();

  } catch (error) {
    console.error('[server-api] Erro ao salvar AppData no Vercel KV:', error);
    // Considerar se um erro aqui deve ser propagado
  }
}

// Obter dados do arquivo
export async function getAppData(): Promise<AppData | null> {
  try {
    console.log('[server-api] Buscando AppData do Vercel KV...');
    const data = await kv.get<AppData>(APP_DATA_KV_KEY);
    if (data) {
      console.log('[server-api] AppData obtido do Vercel KV.');
      return data;
    }
    console.log('[server-api] Nenhum AppData encontrado no Vercel KV.');
    return null;
  } catch (error) {
    console.error('[server-api] Erro ao buscar AppData do Vercel KV:', error);
    return null;
  }
  // Lógica antiga de arquivo - REMOVIDO
  /*
  if (fs.existsSync(DATA_FILE_PATH)) {
    try {
      const fileContent = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      const parsedData = JSON.parse(fileContent) as AppData;
      console.log('[server-api] AppData carregado do arquivo JSON local.');
      return parsedData;
    } catch (error) {
      console.error('[server-api] Erro ao ler ou parsear AppData do arquivo JSON local:', error);
      // Se o arquivo estiver corrompido, deletar para evitar problemas futuros? Ou tentar recuperar?
      // fs.unlinkSync(DATA_FILE_PATH); // Cuidado com isso
      return null;
    }
  }
  console.log('[server-api] Arquivo de dados local não encontrado.');
  return null;
  */
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
  // Tentar obter do Vercel KV
  let appData = await getAppData();
  globalCacheData.metadata.totalApiCalls++; // Incrementar aqui ou dentro de getAppData?

  if (appData) {
    console.log('[server-api] fetchAllAppData: Dados carregados do Vercel KV.');
    globalCacheData.metadata.cacheHits++;
    
    // Verificar a idade dos dados e se precisam ser atualizados
    const now = Date.now();
    const priceIsStale = !appData.currentPrice?.lastUpdated || (now - new Date(appData.currentPrice.lastUpdated).getTime()) > CACHE_EXPIRATION.PRICE;
    
    // A verificação de "staleness" para dados históricos é mais complexa
    // pois são vários períodos e moedas.
    // Poderíamos ter um timestamp geral de "lastHistoricalUpdate" no AppData.

    if (priceIsStale) {
      console.log('[server-api] fetchAllAppData: Preço atual está obsoleto, atualizando em segundo plano...');
      // Não esperar por esta atualização para retornar os dados cacheados rapidamente
      updateCurrentPrice().then(updatedPrice => {
        if (appData && updatedPrice) { // Verifica se appData ainda é válido
          const newAppData = { ...appData, currentPrice: updatedPrice };
          saveAppData(newAppData); // Salva no KV (e atualiza cache em memória se implementado)
        }
      }).catch(err => console.error('[server-api] Erro ao atualizar preço em segundo plano:', err));
    }
    // Adicionar lógica similar para dados históricos se necessário,
    // ou confiar que `getHistoricalData` já tem sua própria lógica de expiração e atualização.

    return appData;
  }

  console.log('[server-api] fetchAllAppData: Nenhum dado no Vercel KV. Buscando dados frescos e populando o cache.');
  // Se não houver dados no KV, buscar tudo, salvar e retornar
  try {
    const currentPrice = await updateCurrentPrice(); // Já usa KV internamente se configurado
    
    // Para dados históricos, precisamos decidir quais períodos padrão carregar.
    // Exemplo: carregar USD 30 dias e BRL 30 dias.
    const historicalUsd30d = await getHistoricalData('usd', 30, true); // true para forçar busca e salvar no KV
    const historicalBrl30d = await getHistoricalData('brl', 30, true);

    appData = {
      currentPrice: currentPrice,
      historicalData: {
        usd: {
          '30d': historicalUsd30d || createFallbackHistoricalData('usd', 30)
        },
        brl: {
          '30d': historicalBrl30d || createFallbackHistoricalData('brl', 30)
        }
        // Adicionar outros períodos/moedas padrão se necessário
      },
      metadata: {
        lastFullUpdate: new Date().toISOString(),
        totalApiCalls: globalCacheData.metadata.totalApiCalls, // já incrementado
        cacheHits: globalCacheData.metadata.cacheHits, // já incrementado
        // Outros metadados relevantes
      }
    };

    await saveAppData(appData);
    return appData;

  } catch (error) {
    console.error('[server-api] fetchAllAppData: Erro crítico ao buscar todos os dados pela primeira vez:', error);
    // Em caso de falha total, retornar dados de fallback para não quebrar a aplicação
    return createFallbackAppData();
  }
}

// Função auxiliar para criar dados históricos de fallback
function createFallbackHistoricalData(currency: string, days: number): HistoricalDataCacheObject {
  console.warn(`[server-api] Criando dados históricos de fallback para ${currency} - ${days} dias.`);
  return {
    data: Array(days).fill(null).map((_, i) => ({
      timestamp: subDays(new Date(), days - 1 - i).getTime(),
      price: 60000 + Math.random() * 5000 * (currency === 'brl' ? 5 : 1), // Preço de fallback
    })),
    lastUpdated: Date.now(),
    source: 'fallback',
  };
}

// Atualizar o preço atual do Bitcoin - versão melhorada
export async function updateCurrentPrice(): Promise<BitcoinPrice | null > {
  const priceData = await kv.get<{price: BitcoinPrice, lastUpdated: number}>('current_price_v2');
  if (priceData && (Date.now() - priceData.lastUpdated < CACHE_EXPIRATION.PRICE)) return {...priceData.price, isUsingCache:true, lastUpdated: new Date(priceData.lastUpdated).toISOString()};
  const usd = await fetchBitcoinUsdPrice(); const brlRate = await fetchUsdToBrlRate(); const now = Date.now();
  const newPrice = { usd, brl: usd * brlRate, timestamp: now, lastUpdated: new Date(now).toISOString()};
  await kv.set('current_price_v2', {price: newPrice, lastUpdated: now}, {ex: DEFAULT_CACHE_TTL_SECONDS });
  return {...newPrice, isUsingCache: false};
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
  globalCacheData.metadata.totalApiCalls++;
  let apiUrl: string;
  if (typeof daysOrParams === 'number') {
    apiUrl = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=${currency}&days=${daysOrParams}&interval=daily`;
  } else {
    apiUrl = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=${currency}&from=${daysOrParams.fromTimestamp}&to=${daysOrParams.toTimestamp}`;
  }
  console.log(`[CoinGecko] Fetching: ${apiUrl}`);
  try {
    const response = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
    if (!response.ok) {
      const errorBody = await response.text();
      if (response.status === 429) throw new RateLimitError('CoinGecko', response.status, errorBody);
      throw new ExternalApiError('CoinGecko', `Status: ${response.status}. Body: ${errorBody}`, response.status);
    }
    const rawData = await response.json();
    if (!rawData || !rawData.prices || !Array.isArray(rawData.prices)) throw new ExternalApiError('CoinGecko', 'Formato de resposta inesperado.');
    const processedData: HistoricalDataPoint[] = rawData.prices.map((p: [number, number]) => ({ timestamp: Math.floor(p[0] / 1000), price: p[1] }));
    return { data: processedData, source: 'coingecko' };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ExternalApiError('CoinGecko', error instanceof Error ? error.message : String(error));
  }
}

// Helper para converter data YYYY-MM-DD para timestamp Unix em segundos
function dateToUnixTimestamp(dateString: string): number {
  const date = parseISO(dateString); return Math.floor(date.getTime() / 1000);
}

// Função getHistoricalData modificada
export async function getHistoricalData(
  currency = 'usd',
  daysOrDateParams: number | { fromDate: string; toDate: string } = 30,
  forceUpdate = false
): Promise<HistoricalDataCacheObject | null> {
  const cacheKeySuffix = typeof daysOrDateParams === 'number' 
    ? `${daysOrDateParams}d` 
    : `${daysOrDateParams.fromDate}_to_${daysOrDateParams.toDate}`;
  const cacheKey = `historical_data_v2_${currency}_${cacheKeySuffix}`;
  console.log(`[API getHistoricalData] Solicitado para key: ${cacheKey}, forceUpdate: ${forceUpdate}`);

  if (!forceUpdate) {
    try {
      const cachedData = await kv.get<HistoricalDataCacheObject>(cacheKey);
      if (cachedData) {
        const now = Date.now();
        let ttlToCheck = (typeof daysOrDateParams !== 'number' && daysOrDateParams.fromDate === daysOrDateParams.toDate 
                          ? DAILY_DATA_CACHE_TTL_SECONDS 
                          : DEFAULT_CACHE_TTL_SECONDS) * 1000;

        if ((now - cachedData.lastUpdated) < ttlToCheck) {
          console.log(`[API getHistoricalData] Cache HIT para ${cacheKey}. Fonte: ${cachedData.source}, Atualizado em: ${new Date(cachedData.lastUpdated).toISOString()}`);
          return cachedData;
        } else {
          console.log(`[API getHistoricalData] Cache STALE para ${cacheKey}. Fonte: ${cachedData.source}, Atualizado em: ${new Date(cachedData.lastUpdated).toISOString()}. Implementando SWR.`);
          // Stale-While-Revalidate: retorna dados obsoletos e atualiza em background (sem await).
          // Não bloquear a resposta atual com a atualização em background.
          forceUpdateHistoricalData(currency, daysOrDateParams)
            .then(updatedData => {
              if (updatedData) {
                console.log(`[SWR] Cache para ${cacheKey} ATUALIZADO em background via SWR.`);
              } else {
                console.warn(`[SWR] Falha ao ATUALIZAR cache em background para ${cacheKey} via SWR (nenhum dado retornado).`);
              }
            })
            .catch(error => {
              console.error(`[SWR] ERRO ao ATUALIZAR cache em background para ${cacheKey} via SWR:`, error);
            });
          return cachedData; // Retorna dados obsoletos imediatamente.
        }
      } else {
        console.log(`[API getHistoricalData] Cache MISS para ${cacheKey}.`);
      }
    } catch (error) {
      console.error(`[API getHistoricalData] Erro ao LER cache do KV para ${cacheKey}:`, error);
      // Não relançar; prosseguir para buscar da API como se fosse cache miss.
    }
  } else {
    console.log(`[API getHistoricalData] forceUpdate=true, pulando verificação de cache para ${cacheKey}.`);
  }

  // Se cache miss, erro no KV, ou forceUpdate=true, buscar (e potencialmente atualizar) dados.
  console.log(`[API getHistoricalData] Buscando/Atualizando dados para ${cacheKey} via forceUpdateHistoricalData.`);
  return forceUpdateHistoricalData(currency, daysOrDateParams);
}

export async function forceUpdateHistoricalData(
  currency = 'usd',
  daysOrParams: number | { fromDate: string; toDate: string }
): Promise<HistoricalDataCacheObject | null> {
  const cacheKeySuffix = typeof daysOrParams === 'number' ? `${daysOrParams}d` : `${daysOrParams.fromDate}_to_${daysOrParams.toDate}`;
  const cacheKey = `historical_data_v2_${currency}_${cacheKeySuffix}`;
  
  let apiParams: number | { fromTimestamp: number; toTimestamp: number };
  if (typeof daysOrParams === 'number') {
    apiParams = daysOrParams;
  } else {
    apiParams = { fromTimestamp: dateToUnixTimestamp(daysOrParams.fromDate), toTimestamp: dateToUnixTimestamp(daysOrParams.toDate) + (24 * 60 * 60 - 1) }; // Inclui todo o dia final
  }
  console.log(`[API forceUpdateHistoricalData] Iniciando para key: ${cacheKey}, Params para API: ${JSON.stringify(apiParams)}`);

  let result: { data: HistoricalDataPoint[]; source: 'coingecko' | 'binance' } | null = null;
  let lastError: Error | null = null;

  // 1. Tentar CoinGecko
  try {
    console.log(`[API forceUpdateHistoricalData] Tentando CoinGecko para ${cacheKey}...`);
    result = await fetchHistoricalDataFromCoinGecko(currency, apiParams);
    if (result && result.data.length > 0) {
      console.log(`[API forceUpdateHistoricalData] SUCESSO com CoinGecko para ${cacheKey}. Pontos: ${result.data.length}`);
    } else {
      // Se CoinGecko retornou null ou dados vazios, mas sem lançar erro, registramos e tentaremos Binance.
      console.warn(`[API forceUpdateHistoricalData] CoinGecko não retornou dados (ou retornou vazio) para ${cacheKey}.`);
      result = null; // Garantir que está null para tentar Binance
    }
  } catch (error) {
    console.warn(`[API forceUpdateHistoricalData] FALHA com CoinGecko para ${cacheKey}:`, error);
    lastError = error instanceof Error ? error : new Error(String(error));
    result = null; // Garantir que result é null para tentar Binance
  }

  // 2. Tentar Binance SE CoinGecko falhou (result é null)
  if (!result) {
    console.log(`[API forceUpdateHistoricalData] CoinGecko falhou ou retornou vazio. Tentando Binance para ${cacheKey}. Erro anterior (se houver): ${lastError?.message}`);
    try {
      result = await fetchHistoricalDataFromBinance(currency, apiParams);
      if (result && result.data.length > 0) {
        console.log(`[API forceUpdateHistoricalData] SUCESSO com Binance (fallback) para ${cacheKey}. Pontos: ${result.data.length}`);
        lastError = null; // Sucesso com Binance, limpar erro da CoinGecko.
      } else {
        console.warn(`[API forceUpdateHistoricalData] Binance também não retornou dados (ou retornou vazio) para ${cacheKey}.`);
        // Se não havia erro da CoinGecko, definir um erro para Binance. Se havia, manter o da CoinGecko.
        if (!lastError) lastError = new ExternalApiError('Binance', 'Binance não retornou dados ou retornou vazio após tentativa de fallback.', 500);
        result = null; // Garantir que está null
      }
    } catch (error) {
      console.warn(`[API forceUpdateHistoricalData] FALHA com Binance (fallback) para ${cacheKey}:`, error);
      // Se CoinGecko já tinha um erro, ele prevalece. Se não, usamos o erro da Binance.
      if (!lastError) {
        lastError = error instanceof Error ? error : new Error(String(error));
      } else {
        // Ambas falharam, logar o erro da Binance mas manter o erro da CoinGecko como o "lastError" principal.
         console.warn(`Erro da Binance (${error instanceof Error ? error.message : String(error)}) ocorrido após falha da CoinGecko (${lastError.message}). O erro da CoinGecko será priorizado se for lançado.`);
      }
      result = null; // Garantir que result é null
    }
  }

  // 3. Processar o resultado ou lançar erro
  if (result && result.data.length > 0) {
    const cacheObject: HistoricalDataCacheObject = {
      data: result.data,
      lastUpdated: Date.now(),
      source: result.source,
    };

    let ttl = (typeof daysOrParams !== 'number' && daysOrParams.fromDate === daysOrParams.toDate) ? DAILY_DATA_CACHE_TTL_SECONDS : DEFAULT_CACHE_TTL_SECONDS;
    
    try {
      await kv.set(cacheKey, cacheObject, { ex: ttl });
      console.log(`[API forceUpdateHistoricalData] Cache ATUALIZADO para ${cacheKey} com dados de ${result.source}. TTL: ${ttl}s.`);
      return cacheObject;
    } catch (kvError) {
      console.error(`[API forceUpdateHistoricalData] Erro ao SALVAR no cache KV para ${cacheKey}:`, kvError);
      return cacheObject; // Retornar dados mesmo se o salvamento no KV falhar para a requisição atual
    }
  } else {
    // Se não houver dados de nenhuma fonte
    console.error(`[API forceUpdateHistoricalData] NENHUM DADO OBTIDO de nenhuma fonte para ${cacheKey}.`);
    if (lastError) {
      // Se o erro capturado não for uma de nossas classes de erro customizadas, encapsulá-lo.
      if (!(lastError instanceof ApiError)) {
        // Usar um status mais genérico como 503 Service Unavailable se ambas as fontes falharam.
        throw new ExternalApiError('MultiSourceFetch', `Falha ao buscar dados de todas as fontes. Último erro: ${lastError.message}`, (lastError as any).status || 503);
      }
      throw lastError; // Lançar o ApiError (RateLimitError, ExternalApiError) capturado.
    }
    // Se não houve erro explícito (ambas retornaram null/vazio sem erro), lançar DataNotFoundError.
    throw new DataNotFoundError(`Não foi possível obter dados históricos para ${cacheKey} de nenhuma fonte após tentativas.`);
  }
}

// fetchHistoricalDataFromBinance (permanece como na última versão funcional, já lança RateLimitError/ExternalApiError)
async function fetchHistoricalDataFromBinance( currency: string, daysOrParams: number | { fromTimestamp: number; toTimestamp: number }): Promise<{ data: HistoricalDataPoint[]; source: 'binance' } | null> {
  globalCacheData.metadata.totalApiCalls++;
  let symbol: string;
  let apiParamsUsed = JSON.stringify(daysOrParams);
  if (currency.toLowerCase() === 'usd') symbol = 'BTCUSDT';
  else if (currency.toLowerCase() === 'brl') { symbol = 'BTCUSDT'; console.warn('[Binance] Para BRL, usando BTCUSDT.'); }
  else throw new ExternalApiError('Binance', `Moeda ${currency} não suportada.`, 400);

  let startTime, endTime, limit;
  if (typeof daysOrParams === 'number') {
    limit = daysOrParams > 0 ? daysOrParams : 1;
    endTime = Date.now();
    startTime = subDays(new Date(), limit).getTime();
  } else {
    startTime = daysOrParams.fromTimestamp * 1000;
    endTime = daysOrParams.toTimestamp * 1000;
    // Calcular limite aproximado para Binance (max 1000)
    const durationDays = Math.max(1, Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24)));
    limit = Math.min(durationDays, 1000);
  }
  const apiUrl = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&startTime=${startTime}&endTime=${endTime}&limit=${limit}`;
  console.log(`[Binance] Fetching: ${apiUrl} (Params Originais: ${apiParamsUsed})`);

  try {
    const response = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
    if (!response.ok) {
      const errorBody = await response.text();
      if (response.status === 429 || response.status === 418) throw new RateLimitError('Binance', response.status, errorBody);
      throw new ExternalApiError('Binance', `Status: ${response.status}. Body: ${errorBody}`, response.status);
    }
    const klines = await response.json();
    if (!Array.isArray(klines)) throw new ExternalApiError('Binance', 'Formato de resposta inesperado (não array).');
    if (klines.length === 0) { console.warn('[Binance] Retornou array vazio.'); return { data: [], source: 'binance' }; }
    
    const validData: HistoricalDataPoint[] = [];
    for (const k of klines) {
      if (Array.isArray(k) && k.length >= 5) {
        const ts = Math.floor(k[0] / 1000);
        const price = parseFloat(k[4]);
        if (!isNaN(price)) validData.push({ timestamp: ts, price });
      }
    }
    if (validData.length === 0 && klines.length > 0) throw new ExternalApiError('Binance', 'Dados klines recebidos, mas processamento resultou em zero pontos válidos.');
    return { data: validData, source: 'binance' };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ExternalApiError('Binance', error instanceof Error ? error.message : String(error));
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
export async function getCurrentBitcoinPrice(currency = 'usd'): Promise<BitcoinPrice | null > { 
    return updateCurrentPrice(); // Simplificado para usar a mesma lógica de updateCurrentPrice
}