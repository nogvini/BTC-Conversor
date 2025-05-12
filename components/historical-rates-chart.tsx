"use client"

import React, { useState, useEffect, useCallback, useMemo, Fragment, useRef } from "react"
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
  Legend,
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
} from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { RefreshCw, TrendingUp, TrendingDown, Info, AlertTriangle } from "lucide-react"
import { Card, CardTitle, CardHeader, CardContent, CardDescription } from "@/components/ui/card"
import { getHistoricalBitcoinData, type HistoricalDataPoint } from "@/lib/client-api"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"

type TimeRange = "1d" | "7d" | "30d" | "90d" | "1y"
type CurrencyType = "USD" | "BRL"
type ChartType = "line" | "area"

// Novo tipo para armazenar dados em cache por período
type ChartDataCache = {
  [key: string]: {
    data: HistoricalDataPoint[],
    timestamp: number,
    isUsingCache: boolean,
    source: string
  }
}

interface HistoricalRatesChartProps {
  // Dados históricos passados diretamente do componente pai
  historicalData?: {
    usd: HistoricalDataPoint[]
    brl: HistoricalDataPoint[]
  }
}

export default function HistoricalRatesChart({ historicalData }: HistoricalRatesChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d")
  const [currency, setCurrency] = useState<CurrencyType>("USD")
  const [chartType, setChartType] = useState<ChartType>("area")
  const [chartData, setChartData] = useState<HistoricalDataPoint[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [isUsingCachedData, setIsUsingCachedData] = useState<boolean>(false)
  const [dataSource, setDataSource] = useState<string>("CoinGecko")
  const isMobile = useIsMobile()
  
  // Cache local para armazenar dados por período e moeda
  // Usamos useRef para manter o cache entre renderizações
  const chartDataCache = useRef<ChartDataCache>({})
  
  // Função para gerar chave de cache
  const getCacheKey = useCallback((curr: string, range: string) => {
    return `${curr.toLowerCase()}_${range}`
  }, [])

  // Mover esta função para antes do fetchHistoricalData
  const getTimeRangeLabel = (range: TimeRange): string => {
    switch (range) {
      case "1d":
        return "1 Dia"
      case "7d":
        return "1 Semana"
      case "30d":
        return "1 Mês"
      case "90d":
        return "3 Meses"
      case "1y":
        return "1 Ano"
      default:
        return "1 Mês"
    }
  }

  // Modify the fetchHistoricalData function to better handle errors
  const fetchHistoricalData = useCallback(async (forceUpdate = false) => {
    setLoading(true)
    setError(null)
    
    // Gerar chave de cache
    const cacheKey = getCacheKey(currency, timeRange)
    
    try {
      let data: HistoricalDataPoint[] = []
      const days = timeRangeToDays(timeRange)
      
      // Verificar se já temos esses dados em cache local e se não estamos forçando atualização
      const cachedData = chartDataCache.current[cacheKey]
      const now = Date.now()
      const cacheMaxAge = 30 * 60 * 1000 // 30 minutos (cache local)
      
      // 1. Verificar se temos dados em cache local e se não estamos forçando atualização
      if (!forceUpdate && cachedData && now - cachedData.timestamp < cacheMaxAge) {
        console.log(`Usando cache local para ${currency} ${timeRange}`)
        setChartData(cachedData.data)
        setIsUsingCachedData(true)
        setDataSource(cachedData.source || "CoinGecko")
        setLoading(false)
        
        // Se o cache tem mais de 10 minutos, atualizar em segundo plano
        if (now - cachedData.timestamp > 10 * 60 * 1000) {
          // Iniciar atualização em background após retornar os dados do cache
          setTimeout(() => {
            updateCacheInBackground(currency, timeRange, days)
          }, 500)
        }
        
        return
      }
      
      // 2. Se forceUpdate for true ou cache expirado, buscar da API
      try {
        // Usar a nova API com suporte a período
        data = await getHistoricalBitcoinData(
          currency.toLowerCase(), 
          days,
          timeRange // Passar o período original para melhor cache
        );
        
        // Determinar a fonte dos dados (TradingView ou fallback)
        const dataSource = data.length > 0 && data[0].source 
          ? data[0].source 
          : "tradingview";
        
        setDataSource(dataSource === "tradingview" ? "TradingView" : "CoinGecko");
        setIsUsingCachedData(data.some(item => item.isUsingCache));
        
        // Atualizar o cache local com os novos dados
        chartDataCache.current[cacheKey] = {
          data,
          timestamp: now,
          isUsingCache: data.some(item => item.isUsingCache),
          source: dataSource
        };
        
        // Ordenar dados por data (mais antigos primeiro)
        data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setChartData(data);
        
        // Mostrar feedback ao usuário sobre a atualização APENAS quando for uma atualização forçada
        // e não apenas uma mudança de período ou moeda
        if (forceUpdate && !data.some(item => item.isUsingCache)) {
          toast({
            title: "Dados atualizados",
            description: `Dados de ${getTimeRangeLabel(timeRange)} obtidos em tempo real.`,
            duration: 3000,
          });
        }
      } catch (error) {
        throw error;
      }
    } catch (error) {
      console.error("Erro ao buscar dados históricos:", error)
      
      // Em caso de erro, tentar usar o cache local mesmo que expirado
      const cachedData = chartDataCache.current[cacheKey]
      if (cachedData && cachedData.data.length > 0) {
        console.log("Usando cache local expirado após erro na API")
        setChartData(cachedData.data)
        setIsUsingCachedData(true)
        setDataSource(cachedData.source || "CoinGecko")
      } else {
        setError("Não foi possível obter dados em tempo real. Por favor, tente novamente mais tarde.")
        setDataSource("Indisponível")
      }
    } finally {
      setLoading(false)
    }
  }, [timeRange, currency, getCacheKey, getTimeRangeLabel])
  
  // Função para atualizar o cache em segundo plano
  const updateCacheInBackground = useCallback(async (currencyType: CurrencyType, range: TimeRange, days: number) => {
    try {
      console.log(`Atualizando cache em segundo plano: ${currencyType} ${range} (${days} dias)`)
      const cacheKey = getCacheKey(currencyType, range)
      
      // Buscar dados da API sem forçar atualização
      const data = await getHistoricalBitcoinData(
        currencyType.toLowerCase(),
        days,
        range // Passar o período para melhor cache
      );
      
      // Determinar a fonte dos dados
      const dataSource = data.length > 0 && data[0].source
        ? data[0].source
        : "tradingview";
      
      // Atualizar o cache local
      chartDataCache.current[cacheKey] = {
        data,
        timestamp: Date.now(),
        isUsingCache: data.some(item => item.isUsingCache),
        source: dataSource
      };
      
      console.log(`Cache atualizado em segundo plano para ${currencyType} ${range}`);
      
      // Se estivermos vendo esse período de tempo/moeda agora, atualizar a tela silenciosamente
      if (currency === currencyType && timeRange === range) {
        setChartData(data);
        setIsUsingCachedData(data.some(item => item.isUsingCache));
        setDataSource(dataSource === "tradingview" ? "TradingView" : "CoinGecko");
      }
    } catch (error) {
      console.error(`Erro na atualização de cache em segundo plano:`, error)
    }
  }, [currency, timeRange, getCacheKey])

  // Forçar atualização - ignora cache
  const forceUpdateData = useCallback(() => {
    fetchHistoricalData(true)
  }, [fetchHistoricalData])

  // Atualizar dados quando o intervalo de tempo ou moeda mudar
  useEffect(() => {
    fetchHistoricalData()
    
    // Pré-carregar períodos adjacentes em segundo plano
    const preloadAdjacentPeriods = async () => {
      // Esperar um pequeno tempo para não atrapalhar o carregamento atual
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Determinar períodos adjacentes para pré-carregar
      const timeRanges: TimeRange[] = ["1d", "7d", "30d", "90d", "1y"]
      const currentIndex = timeRanges.indexOf(timeRange)
      
      // Pré-carregar o período anterior (se houver)
      if (currentIndex > 0) {
        const prevRange = timeRanges[currentIndex - 1]
        const days = timeRangeToDays(prevRange)
        updateCacheInBackground(currency, prevRange, days)
      }
      
      // Pré-carregar o próximo período (se houver)
      if (currentIndex < timeRanges.length - 1) {
        const nextRange = timeRanges[currentIndex + 1]
        const days = timeRangeToDays(nextRange)
        updateCacheInBackground(currency, nextRange, days)
      }
    }
    
    // Iniciar pré-carregamento
    preloadAdjacentPeriods()
    
  }, [fetchHistoricalData, timeRange, currency, updateCacheInBackground])

  const timeRangeToDays = (range: TimeRange): number => {
    switch (range) {
      case "1d":
        return 1
      case "7d":
        return 7
      case "30d":
        return 30
      case "90d":
        return 90
      case "1y":
        return 365
      default:
        return 30
    }
  }

  // Formatação melhorada para moedas
  const formatCurrency = (value: number, showSymbol: boolean = false): string => {
    if (currency === "USD") {
      return `${showSymbol ? '$' : ''}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    } else {
      return `${showSymbol ? 'R$' : ''}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    }
  }

  const calculatePriceChange = (): { change: number; percentage: number } => {
    if (chartData.length < 2) return { change: 0, percentage: 0 }

    const firstPrice = chartData[0].price
    const lastPrice = chartData[chartData.length - 1].price
    const priceDiff = lastPrice - firstPrice
    const priceChangePercentage = (priceDiff / firstPrice) * 100

    return {
      change: priceDiff,
      percentage: priceChangePercentage,
    }
  }

  const priceChange = useMemo(() => calculatePriceChange(), [chartData])

  const formatDateForTimeRange = (date: string): string => {
    const dateObj = new Date(date)
    const days = timeRangeToDays(timeRange)

    if (days <= 1) {
      return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (days <= 7) {
      return dateObj.toLocaleDateString([], { weekday: 'short' })
    } else {
      return dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  // Calcular volatilidade anualizada com base nos dados históricos reais
  const annualizedVolatility = useMemo(() => {
    return calculateAnnualizedVolatility(chartData)
  }, [chartData])

  // Render
  return (
    <Card className="bg-black/30 border border-purple-700/40 shadow-xl shadow-purple-900/10 rounded-lg p-4 md:p-6">
      <CardHeader className="p-0 mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-lg mb-1.5">Histórico de Cotações</CardTitle>
            <CardDescription className="text-purple-500/90 dark:text-purple-400/80">
              Fonte: {dataSource} {isUsingCachedData ? "(cache)" : ""}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Controles de Moeda e Período */}
            <div className="flex items-center space-x-2">
              <Label htmlFor="currency-select" className="text-xs">Moeda:</Label>
              <Select value={currency} onValueChange={(value) => setCurrency(value as CurrencyType)}>
                <SelectTrigger 
                  id="currency-select" 
                  className="h-8 w-[80px] text-xs bg-background/30 dark:bg-black/40 border-purple-700/50 focus:border-purple-500 focus:ring-purple-500/50 hover:border-purple-600/70"
                >
                  <SelectValue placeholder="Moeda" />
                </SelectTrigger>
                <SelectContent className="bg-black/95 border-purple-800/60">
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="BRL">BRL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="time-range-select" className="text-xs">Período:</Label>
              <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
                <SelectTrigger 
                  id="time-range-select" 
                  className="h-8 w-[90px] text-xs bg-background/30 dark:bg-black/40 border-purple-700/50 focus:border-purple-500 focus:ring-purple-500/50 hover:border-purple-600/70"
                >
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent className="bg-black/95 border-purple-800/60">
                  <SelectItem value="1d">1 Dia</SelectItem>
                  <SelectItem value="7d">1 Semana</SelectItem>
                  <SelectItem value="30d">1 Mês</SelectItem>
                  <SelectItem value="90d">3 Meses</SelectItem>
                  <SelectItem value="1y">1 Ano</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Botão de Atualizar */}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-background/30 dark:bg-black/40 border-purple-700/50 hover:bg-purple-900/20 hover:border-purple-600/70"
              onClick={forceUpdateData}
              disabled={loading}
              title="Forçar atualização dos dados"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Gráfico */}
        <div className="h-[300px] sm:h-[400px]">
          {loading ? (
            <div className="flex h-full w-full items-center justify-center">
              <Skeleton className="h-full w-full" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex h-full w-full flex-col items-center justify-center text-center">
              <Info className="h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-lg font-medium">Nenhum dado disponível</p>
              <p className="text-sm text-muted-foreground">
                Não foi possível carregar dados do Bitcoin. Tente novamente mais tarde.
              </p>
            </div>
          ) : chartType === "line" ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateForTimeRange}
                  dy={10}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  tickMargin={5}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  tickFormatter={(value) => formatCurrency(value)}
                  dx={-5}
                  orientation="right"
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  stroke="hsl(var(--muted-foreground))"
                  domain={['dataMin', 'dataMax']}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value, true), "Preço"]}
                  labelFormatter={(label) => new Date(label).toLocaleString()}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    color: "hsl(var(--foreground))"
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                <ReferenceLine 
                  y={chartData[0].price} 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeDasharray="3 3"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateForTimeRange}
                  dy={10}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  tickMargin={5}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  tickFormatter={(value) => formatCurrency(value)}
                  dx={-5}
                  orientation="right"
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  stroke="hsl(var(--muted-foreground))"
                  domain={['dataMin', 'dataMax']}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value, true), "Preço"]}
                  labelFormatter={(label) => new Date(label).toLocaleString()}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    color: "hsl(var(--foreground))"
                  }}
                />
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPrice)"
                  activeDot={{ r: 6 }}
                />
                <ReferenceLine 
                  y={chartData[0].price} 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeDasharray="3 3"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {!loading && chartData.length > 0 && (
          <div className="mt-4 flex flex-col items-center gap-1 text-xs text-muted-foreground">
            <div className="text-center">
              Volatilidade Anualizada: <span className="font-semibold">{annualizedVolatility.toFixed(2)}%</span>
            </div>
            <div className="text-center text-xs opacity-70">
              Última atualização: {new Date().toLocaleString()}
              {isUsingCachedData && <span className="ml-1 text-yellow-500">(Usando dados em cache)</span>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Função para calcular a volatilidade anualizada
function calculateAnnualizedVolatility(data: HistoricalDataPoint[]): number {
  if (data.length < 2) return 0
  
  // Calcular retornos diários
  const returns: number[] = []
  for (let i = 1; i < data.length; i++) {
    const dailyReturn = (data[i].price - data[i-1].price) / data[i-1].price
    returns.push(dailyReturn)
  }
  
  // Calcular desvio padrão dos retornos
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length
  const variance = returns.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / returns.length
  const stdDev = Math.sqrt(variance)
  
  // Anualizar (aproximadamente 252 dias de negociação em um ano)
  const annualizedVol = stdDev * Math.sqrt(252) * 100
  
  return annualizedVol
}
