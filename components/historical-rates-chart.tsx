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
import { Card, CardTitle, CardHeader, CardContent } from "@/components/ui/card"
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
        
        // Mostrar feedback ao usuário sobre a atualização
        if (!data.some(item => item.isUsingCache)) {
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
    <div className="w-full">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Histórico do Bitcoin</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              className="mr-2" 
              onClick={forceUpdateData}
              disabled={loading}
            >
              <RefreshCw className={cn(
                "h-4 w-4 mr-2", 
                loading && "animate-spin"
              )} />
              Atualizar
            </Button>
          </div>
          
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex-1 space-y-2">
              <Label>Período</Label>
              <div className="flex flex-wrap gap-1">
                {(["1d", "7d", "30d", "90d", "1y"] as TimeRange[]).map((range) => (
                  <Button
                    key={range}
                    size="sm"
                    variant={timeRange === range ? "default" : "outline"}
                    onClick={() => setTimeRange(range)}
                    className="w-15"
                  >
                    {getTimeRangeLabel(range)}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="flex w-full flex-col space-y-2 sm:w-auto">
              <Label>Moeda</Label>
              <Select
                value={currency}
                onValueChange={(value) => setCurrency(value as CurrencyType)}
              >
                <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD (Dólar)</SelectItem>
                  <SelectItem value="BRL">BRL (Real)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex w-full flex-col space-y-2 sm:w-auto">
              <Label>Visualização</Label>
              <RadioGroup 
                value={chartType} 
                onValueChange={(value) => setChartType(value as ChartType)}
                className="flex"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="line" id="line" />
                  <Label htmlFor="line" className="cursor-pointer">Linha</Label>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <RadioGroupItem value="area" id="area" />
                  <Label htmlFor="area" className="cursor-pointer">Área</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          
          {/* Exibir a variação de preço */}
          {!loading && chartData.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col justify-center rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">
                  Inicial
                </div>
                <div className="text-xl font-bold">
                  {formatCurrency(chartData[0].price, true)}
                </div>
              </div>
              
              <div className="flex flex-col justify-center rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">
                  Último
                </div>
                <div className="text-xl font-bold">
                  {formatCurrency(chartData[chartData.length - 1].price, true)}
                </div>
              </div>
              
              <div className="flex flex-col justify-center rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">
                  Variação
                </div>
                <div className={cn(
                  "flex items-center text-xl font-bold",
                  priceChange.percentage > 0 ? "text-green-500" : "text-red-500"
                )}>
                  {formatCurrency(priceChange.change, true)}
                  <span className="ml-2 text-sm">
                    ({priceChange.percentage > 0 ? "+" : ""}
                    {priceChange.percentage.toFixed(2)}%)
                  </span>
                  {priceChange.percentage > 0 ? (
                    <TrendingUp className="ml-2 h-4 w-4" />
                  ) : (
                    <TrendingDown className="ml-2 h-4 w-4" />
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Informações de fonte de dados e alertas */}
          <div className="mt-2 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Fonte: {dataSource}
            </div>
            
            {error && (
              <div className="flex items-center gap-1 text-amber-500 text-xs">
                <AlertTriangle className="h-3 w-3" />
                {error}
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
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
    </div>
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
