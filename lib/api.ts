/**
 * API Service para obter dados de preços do Bitcoin
 */

// Tipos para os dados de preço
export interface BitcoinPrice {
  usd: number
  brl: number
  timestamp: number
  isUsingCache: boolean // Indica se estamos usando dados em cache
}

// Add the isSampleData property to the HistoricalDataPoint interface
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
}

// Taxa de conversão USD para BRL fixa como fallback
const USD_TO_BRL_FALLBACK = 5.2
// Tempo máximo de cache para considerar dados "recentes" (5 minutos para preços, 1 hora para dados históricos)
const PRICE_CACHE_MAX_AGE = 5 * 60 * 1000
const HISTORICAL_CACHE_MAX_AGE = 60 * 60 * 1000
// Tempo máximo de vida do cache antes de expirar completamente (24 horas)
const CACHE_EXPIRY = 24 * 60 * 60 * 1000
// Chave para armazenar todos os dados da aplicação
const APP_DATA_CACHE_KEY = "bitcoinAppData"

/**
 * Função para buscar todos os dados necessários para a aplicação em uma única requisição
 * Isso minimiza as chamadas de API e permite uso offline da aplicação
 */
export async function fetchAllAppData(): Promise<AppData> {
  try {
    // Verificar se temos dados recentes em cache
    const cachedData = getAppDataFromCache()
    
    // Se os dados em cache forem recentes, retorná-los imediatamente
    if (cachedData && (Date.now() - cachedData.lastFetched < PRICE_CACHE_MAX_AGE)) {
      console.log("Usando dados completos recentes do cache")
      return { ...cachedData, isUsingCache: true }
    }
    
    // Buscar preço atual do Bitcoin
    const btcUsdPrice = await fetchBitcoinUsdPrice()
    const usdToBrlRate = await fetchUsdToBrlRate()
    
    // Criar objeto de preço atual
    const currentPrice: BitcoinPrice = {
      usd: btcUsdPrice,
      brl: btcUsdPrice * usdToBrlRate,
      timestamp: Date.now(),
      isUsingCache: false
    }
    
    // Buscar dados históricos (30 dias por padrão)
    const historicalDataUSD = await fetchHistoricalData("usd", 30)
    
    // Converter dados históricos USD para BRL
    const historicalDataBRL = historicalDataUSD.map(dataPoint => ({
      ...dataPoint,
      price: dataPoint.price * usdToBrlRate
    }))
    
    // Criar objeto de dados completo
    const appData: AppData = {
      currentPrice,
      historicalDataUSD,
      historicalDataBRL,
      lastFetched: Date.now(),
      isUsingCache: false
    }
    
    // Salvar todos os dados em cache
    saveAppDataToCache(appData)
    
    return appData
  } catch (error) {
    console.error("Erro ao buscar dados completos da aplicação:", error)
    
    // Tentar recuperar dados do cache, mesmo que não sejam recentes
    const cachedData = getAppDataFromCache(true)
    if (cachedData) {
      console.log("Usando dados completos do cache como fallback")
      return { ...cachedData, isUsingCache: true }
    }
    
    // Se não houver dados em cache, criar dados de exemplo
    return createFallbackAppData()
  }
}

/**
 * Buscar apenas o preço atual do Bitcoin para atualizações rápidas
 * Útil para atualizar apenas o preço enquanto usa dados históricos do cache
 */
export async function getCurrentBitcoinPrice(): Promise<BitcoinPrice> {
  try {
    // Verificar se temos dados completos recentes em cache
    const cachedData = getAppDataFromCache()
    
    // Se tivermos dados completos recentes, retornar apenas o preço atual
    if (cachedData && (Date.now() - cachedData.lastFetched < PRICE_CACHE_MAX_AGE)) {
      console.log("Usando preço atual do cache")
      return { ...cachedData.currentPrice, isUsingCache: true }
    }
    
    // Buscar preço atual do Bitcoin
    const btcUsdPrice = await fetchBitcoinUsdPrice()
    const usdToBrlRate = await fetchUsdToBrlRate()
    
    // Criar objeto de preço atual
    const price: BitcoinPrice = {
      usd: btcUsdPrice,
      brl: btcUsdPrice * usdToBrlRate,
      timestamp: Date.now(),
      isUsingCache: false
    }
    
    // Se temos dados completos em cache, atualizar apenas o preço
    if (cachedData) {
      cachedData.currentPrice = price
      cachedData.lastFetched = Date.now()
      saveAppDataToCache(cachedData)
    }
    
    return price
  } catch (error) {
    console.error("Erro ao buscar preço atual do Bitcoin:", error)
    
    // Tentar recuperar dados do cache
    const cachedData = getAppDataFromCache(true)
    if (cachedData) {
      console.log("Usando preço do cache como fallback")
      return { ...cachedData.currentPrice, isUsingCache: true }
    }
    
    // Fallback para dados de exemplo
    const fallbackData = createFallbackAppData()
    return fallbackData.currentPrice
  }
}

/**
 * Obter dados históricos do Bitcoin
 * Se possível, usa os dados do cache para evitar novas requisições
 */
export async function getHistoricalBitcoinData(currency = "usd", days = 30): Promise<HistoricalDataPoint[]> {
  try {
    // Verificar se temos dados completos em cache
    const cachedData = getAppDataFromCache()
    
    // Se tivermos dados históricos em cache e não forem muito antigos, usá-los
    if (cachedData && (Date.now() - cachedData.lastFetched < HISTORICAL_CACHE_MAX_AGE)) {
      const historicalData = currency.toLowerCase() === "usd" 
        ? cachedData.historicalDataUSD 
        : cachedData.historicalDataBRL
      
      // Verificar se temos dados para o número de dias solicitado
      if (historicalData.length >= days) {
        console.log(`Usando dados históricos ${currency.toUpperCase()} do cache`)
        return historicalData.slice(0, days).map(item => ({ ...item, isUsingCache: true }))
      }
    }
    
    // Se não temos dados em cache ou precisamos de mais dados, buscar novos
    const data = await fetchHistoricalData(currency, days)
    
    // Se temos dados completos em cache, atualizar os dados históricos
    if (cachedData) {
      if (currency.toLowerCase() === "usd") {
        cachedData.historicalDataUSD = data
        
        // Atualizar também os dados em BRL
        if (cachedData.historicalDataBRL.length > 0) {
          const usdToBrlRate = cachedData.currentPrice.brl / cachedData.currentPrice.usd
          cachedData.historicalDataBRL = data.map(dataPoint => ({
            ...dataPoint,
            price: dataPoint.price * usdToBrlRate
          }))
        }
      } else {
        cachedData.historicalDataBRL = data
      }
      
      cachedData.lastFetched = Date.now()
      saveAppDataToCache(cachedData)
    }
    
    return data
  } catch (error) {
    console.error(`Erro ao buscar dados históricos ${currency.toUpperCase()}:`, error)
    
    // Tentar recuperar dados do cache
    const cachedData = getAppDataFromCache(true)
    if (cachedData) {
      const historicalData = currency.toLowerCase() === "usd" 
        ? cachedData.historicalDataUSD 
        : cachedData.historicalDataBRL
      
      if (historicalData.length > 0) {
        console.log(`Usando dados históricos ${currency.toUpperCase()} do cache como fallback`)
        return historicalData.slice(0, days).map(item => ({ ...item, isUsingCache: true }))
      }
    }
    
    // Gerar dados históricos de exemplo se não houver cache
    console.log(`Gerando dados históricos ${currency.toUpperCase()} de exemplo`)
    const sampleData = generateSampleHistoricalData(days, currency)
    return sampleData
  }
}

// Função para buscar o preço do Bitcoin em USD (função interna)
async function fetchBitcoinUsdPrice(): Promise<number> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    // Tentar primeiro a API do CoinGecko
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd", {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`CoinGecko API request failed with status ${response.status}`)
    }

    const data = await response.json()
    return data.bitcoin.usd
  } catch (error) {
    console.error("Error fetching Bitcoin USD price from CoinGecko:", error)

    // Tentar API alternativa (Coinbase)
    try {
      const response = await fetch("https://api.coinbase.com/v2/prices/BTC-USD/spot")

      if (!response.ok) {
        throw new Error(`Coinbase API request failed with status ${response.status}`)
      }

      const data = await response.json()
      return Number.parseFloat(data.data.amount)
    } catch (fallbackError) {
      console.error("Error fetching from fallback API:", fallbackError)
      
      // Buscar no cache completo da aplicação
      const cachedData = getAppDataFromCache(true)
      if (cachedData) {
        return cachedData.currentPrice.usd
      }
      
      // Último recurso: valor fixo
      return 65000
    }
  }
}

// Função para buscar a taxa de câmbio USD/BRL (função interna)
async function fetchUsdToBrlRate(): Promise<number> {
  try {
    // Tentar API de câmbio
    const response = await fetch("https://open.er-api.com/v6/latest/USD")

    if (!response.ok) {
      throw new Error(`Exchange rate API request failed with status ${response.status}`)
    }

    const data = await response.json()
    return data.rates.BRL
  } catch (error) {
    console.error("Error fetching USD to BRL exchange rate:", error)

    // Tentar API alternativa
    try {
      const response = await fetch("https://api.exchangerate.host/latest?base=USD&symbols=BRL")

      if (!response.ok) {
        throw new Error(`Alternative exchange rate API request failed with status ${response.status}`)
      }

      const data = await response.json()
      return data.rates.BRL
    } catch (fallbackError) {
      console.error("Error fetching from fallback exchange rate API:", fallbackError)
      
      // Buscar no cache completo da aplicação
      const cachedData = getAppDataFromCache(true)
      if (cachedData && cachedData.currentPrice.usd > 0) {
        return cachedData.currentPrice.brl / cachedData.currentPrice.usd
      }
      
      // Último recurso: valor fixo
      return USD_TO_BRL_FALLBACK
    }
  }
}

// Função para buscar dados históricos (função interna)
async function fetchHistoricalData(currency = "usd", days = 30): Promise<HistoricalDataPoint[]> {
  try {
    // Try to fetch from CoinGecko with a timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout

    // Use a more reliable endpoint or add a proxy if needed
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=${currency.toLowerCase()}&days=${days}`,
      {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`)
    }

    const data = await response.json()

    // Formatar os dados para nosso gráfico
    return data.prices.map((item: [number, number]) => {
      const date = new Date(item[0])
      return {
        date: date.toISOString().split("T")[0],
        price: item[1],
        formattedDate: formatDateForTimeRange(date, days),
        timestamp: item[0],
        isSampleData: false,
        isUsingCache: false
      }
    })
  } catch (error) {
    throw error // Deixar o tratamento de erro para a função chamadora
  }
}

// Função auxiliar para salvar todos os dados da aplicação no cache
function saveAppDataToCache(data: AppData): void {
  try {
    localStorage.setItem(APP_DATA_CACHE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error("Erro ao salvar dados completos no cache:", e)
  }
}

// Função auxiliar para recuperar todos os dados da aplicação do cache
function getAppDataFromCache(ignoreExpiry = false): AppData | null {
  try {
    const cachedData = localStorage.getItem(APP_DATA_CACHE_KEY)
    if (!cachedData) return null
    
    const data = JSON.parse(cachedData) as AppData
    
    // Verificar se o cache expirou completamente (24 horas)
    if (!ignoreExpiry && Date.now() - data.lastFetched > CACHE_EXPIRY) {
      return null
    }
    
    return data
  } catch (e) {
    console.error("Erro ao recuperar dados completos do cache:", e)
    return null
  }
}

// Função para criar dados de exemplo quando não há conexão com a API
function createFallbackAppData(): AppData {
  const timestamp = Date.now()
  const fallbackPrice: BitcoinPrice = {
    usd: 65000,
    brl: 65000 * USD_TO_BRL_FALLBACK,
    timestamp,
    isUsingCache: false
  }
  
  return {
    currentPrice: fallbackPrice,
    historicalDataUSD: generateSampleHistoricalData(30, "usd"),
    historicalDataBRL: generateSampleHistoricalData(30, "brl"),
    lastFetched: timestamp,
    isUsingCache: false
  }
}

// Função auxiliar para formatar datas com base no intervalo de tempo
function formatDateForTimeRange(date: Date, days: number): string {
  if (days <= 1) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } else if (days <= 7) {
    return date.toLocaleDateString([], { weekday: "short" })
  } else {
    return date.toLocaleDateString([], { month: "short", day: "numeric" })
  }
}

// Função para gerar dados históricos de exemplo quando não há dados disponíveis
function generateSampleHistoricalData(days: number, currency: string): HistoricalDataPoint[] {
  const data: HistoricalDataPoint[] = []
  const today = new Date()

  // Preço base e volatilidade
  let basePrice = currency.toLowerCase() === "usd" ? 65000 : 65000 * USD_TO_BRL_FALLBACK
  const volatility = 0.02 // 2% volatilidade diária

  // Fatores de tendência
  const trendFactor = 1.0005 // Leve tendência de alta

  // Gerar pontos de dados
  for (let i = days; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)

    // Adicionar aleatoriedade e tendência
    const randomFactor = 1 + (Math.random() * volatility * 2 - volatility)
    basePrice = basePrice * randomFactor * trendFactor

    // Adicionar padrões cíclicos
    const cyclicalFactor = 1 + 0.01 * Math.sin((i / 7) * Math.PI)
    const price = basePrice * cyclicalFactor

    data.push({
      date: date.toISOString().split("T")[0],
      price: Math.round(price * 100) / 100,
      formattedDate: formatDateForTimeRange(date, days),
      timestamp: date.getTime(),
      isSampleData: true,
      isUsingCache: false
    })
  }

  return data
}
