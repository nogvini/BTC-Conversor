"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
type ChartType = "line" | "area" | "candlestick"

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
  const [usingFallbackData, setUsingFallbackData] = useState<boolean>(false)
  const [isUsingCachedData, setIsUsingCachedData] = useState<boolean>(false)
  const isMobile = useIsMobile()

  // Modify the fetchHistoricalData function to better handle errors
  const fetchHistoricalData = useCallback(async () => {
    setLoading(true)
    setError(null)
    setUsingFallbackData(false)

    try {
      let data: HistoricalDataPoint[] = []
      const days = timeRangeToDays(timeRange)
      
      // Se temos dados históricos disponíveis via props, usar eles
      if (historicalData) {
        const sourceData = currency.toLowerCase() === 'usd' ? historicalData.usd : historicalData.brl
        
        // Verificar se temos o número necessário de dias
        if (sourceData && sourceData.length >= days) {
          // Filtrar para obter apenas o número de dias desejado
          data = sourceData.slice(0, days + 1)
          setIsUsingCachedData(sourceData.some(item => item.isUsingCache))
        } else {
          // Se não tivermos dias suficientes, buscar da API
          data = await getHistoricalBitcoinData(currency.toLowerCase(), days)
          setIsUsingCachedData(data.some(item => item.isUsingCache || item.isSampleData))
        }
      } else {
        // Se não tivermos dados históricos, buscar da API
        data = await getHistoricalBitcoinData(currency.toLowerCase(), days)
        setIsUsingCachedData(data.some(item => item.isUsingCache || item.isSampleData))
      }
      
      // Ordenar dados por data (mais antigos primeiro)
      data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      setChartData(data)

      // Mostrar feedback ao usuário
      toast({
        title: "Dados atualizados",
        description: `Dados históricos de ${days} dias em ${currency} carregados.`,
      })

      // Verificar se estamos usando dados de fallback gerados
      if (data.some((item) => item.isSampleData === true)) {
        setUsingFallbackData(true)
        setError("Usando dados simulados. A API pode estar indisponível ou com limite de requisições excedido.")
      }

      // Verificar se estamos usando dados de cache
      const cacheTime = localStorage.getItem(`bitcoinHistoricalData_${currency.toLowerCase()}_${days}_timestamp`)
      if (cacheTime) {
        const cacheAge = Date.now() - Number.parseInt(cacheTime)
        if (cacheAge > 3600000) {
          // Mais de 1 hora
          setUsingFallbackData(true)
          setError("Usando dados em cache. Não foi possível atualizar os dados em tempo real.")
        }
      }
    } catch (error) {
      console.error("Erro ao buscar dados históricos:", error)
      setError("Não foi possível obter dados em tempo real. Usando dados simulados.")
      setUsingFallbackData(true)

      // Gerar dados de exemplo como último recurso
      const days = timeRangeToDays(timeRange)
      const sampleData = generateSampleHistoricalData(days, currency.toLowerCase())
      setChartData(sampleData)
    } finally {
      setLoading(false)
    }
  }, [timeRange, currency, historicalData])

  // Atualizar dados quando o intervalo de tempo ou moeda mudar
  useEffect(() => {
    fetchHistoricalData()
  }, [fetchHistoricalData, timeRange, currency])

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

  const calculatePriceChange = (): { change: number; percentage: number } => {
    if (chartData.length < 2) return { change: 0, percentage: 0 }

    const firstPrice = chartData[0].price
    const lastPrice = chartData[chartData.length - 1].price
    const change = lastPrice - firstPrice
    const percentage = (change / firstPrice) * 100

    return { change, percentage }
  }

  const priceChange = calculatePriceChange()
  const isPriceUp = priceChange.change >= 0

  // Preparar dados para o gráfico de velas (simulado)
  const candlestickData = useMemo(() => {
    if (chartData.length === 0) return []
    return prepareCandlestickData(chartData)
  }, [chartData])

  // Calcular a volatilidade anualizada
  const annualizedVolatility = useMemo(() => {
    return calculateAnnualizedVolatility(chartData)
  }, [chartData])

  const formatDateForTimeRange = (date: string): string => {
    const d = new Date(date)
    
    switch (timeRange) {
      case "1d":
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      case "7d":
        return d.toLocaleDateString([], { weekday: 'short', day: 'numeric' })
      case "30d":
      case "90d":
        return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
      case "1y":
        return d.toLocaleDateString([], { month: 'short', year: '2-digit' })
      default:
        return d.toLocaleDateString()
    }
  }

  // Encontrar o preço máximo e mínimo
  const priceStats = useMemo(() => {
    if (chartData.length === 0) return { max: 0, min: 0, maxDate: '', minDate: '' }
    
    let max = chartData[0].price
    let min = chartData[0].price
    let maxDate = chartData[0].date
    let minDate = chartData[0].date
    
    chartData.forEach(item => {
      if (item.price > max) {
        max = item.price
        maxDate = item.date
      }
      if (item.price < min) {
        min = item.price
        minDate = item.date
      }
    })
    
    return { max, min, maxDate, minDate }
  }, [chartData])

  return (
    <div className="w-full">
      <Card className="bg-background/60 backdrop-blur-sm border border-border/50 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg font-medium">Histórico de Preços do Bitcoin</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={fetchHistoricalData}
                variant="outline"
                size={isMobile ? "sm" : "default"}
                disabled={loading}
                className="h-8"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-1 h-4 w-4 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-1 h-4 w-4" />
                    Atualizar Gráfico
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-md flex items-center gap-2 text-yellow-500">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="mb-4 space-y-2">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                    <span>Preço Atual</span>
                  </div>
                  {loading ? (
                    <Skeleton className="h-9 w-48" />
                  ) : (
                    <div className="text-2xl font-bold">
                      {chartData.length > 0
                        ? `${currency === 'USD' ? '$' : 'R$'} ${formatCurrency(chartData[chartData.length - 1].price)}`
                        : `${currency === 'USD' ? '$' : 'R$'} 0.00`}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-4">
                  <div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                      <span>Variação</span>
                    </div>
                    {loading ? (
                      <Skeleton className="h-6 w-24" />
                    ) : (
                      <div className={`flex items-center ${isPriceUp ? 'text-green-500' : 'text-red-500'}`}>
                        {isPriceUp ? <TrendingUp className="mr-1 h-4 w-4" /> : <TrendingDown className="mr-1 h-4 w-4" />}
                        <span className="font-medium">
                          {formatCurrency(Math.abs(priceChange.change), true)} ({priceChange.percentage.toFixed(2)}%)
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                      <span>Máximo</span>
                    </div>
                    {loading ? (
                      <Skeleton className="h-6 w-24" />
                    ) : (
                      <div className="font-medium">
                        {formatCurrency(priceStats.max, true)}
                        <span className="ml-1 text-xs text-muted-foreground">
                          {formatDateForTimeRange(priceStats.maxDate)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                      <span>Mínimo</span>
                    </div>
                    {loading ? (
                      <Skeleton className="h-6 w-24" />
                    ) : (
                      <div className="font-medium">
                        {formatCurrency(priceStats.min, true)}
                        <span className="ml-1 text-xs text-muted-foreground">
                          {formatDateForTimeRange(priceStats.minDate)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 items-start">
                <div className="space-y-1">
                  <Label htmlFor="timeRange" className="text-sm">Período</Label>
                  <Select
                    value={timeRange}
                    onValueChange={(value) => setTimeRange(value as TimeRange)}
                    disabled={loading}
                  >
                    <SelectTrigger id="timeRange" className="w-32 h-8">
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1d">{getTimeRangeLabel("1d")}</SelectItem>
                      <SelectItem value="7d">{getTimeRangeLabel("7d")}</SelectItem>
                      <SelectItem value="30d">{getTimeRangeLabel("30d")}</SelectItem>
                      <SelectItem value="90d">{getTimeRangeLabel("90d")}</SelectItem>
                      <SelectItem value="1y">{getTimeRangeLabel("1y")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="currency" className="text-sm">Moeda</Label>
                  <Select value={currency} onValueChange={(value) => setCurrency(value as CurrencyType)} disabled={loading}>
                    <SelectTrigger id="currency" className="w-32 h-8">
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="BRL">BRL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm">Tipo de Gráfico</Label>
                  <RadioGroup
                    value={chartType}
                    onValueChange={(value) => setChartType(value as ChartType)}
                    className="flex gap-2"
                    disabled={loading}
                  >
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="line" id="line" className="h-3 w-3" />
                      <Label htmlFor="line" className="text-xs cursor-pointer">Linha</Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="area" id="area" className="h-3 w-3" />
                      <Label htmlFor="area" className="text-xs cursor-pointer">Área</Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="candlestick" id="candlestick" className="h-3 w-3" />
                      <Label htmlFor="candlestick" className="text-xs cursor-pointer">Candlestick</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full h-[350px]">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Carregando dados históricos...</span>
                </div>
              </div>
            ) : chartData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center border border-dashed rounded-lg">
                <div className="text-center text-muted-foreground">
                  <Info className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>Nenhum dado histórico disponível</p>
                  <Button onClick={fetchHistoricalData} variant="link" size="sm" className="mt-2">
                    Tentar novamente
                  </Button>
                </div>
              </div>
            ) : chartType === "area" ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
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
                  />
                  <Tooltip
                    formatter={(value: number) => [`${formatCurrency(value, true)}`, 'Preço']}
                    labelFormatter={(label) => new Date(label).toLocaleString()}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPrice)"
                    activeDot={{ r: 6, fill: "#8b5cf6" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : chartType === "line" ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
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
                  />
                  <Tooltip
                    formatter={(value: number) => [`${formatCurrency(value, true)}`, 'Preço']}
                    labelFormatter={(label) => new Date(label).toLocaleString()}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, fill: "#8b5cf6" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full"> 
                {/* Implementação do gráfico de candlestick vem aqui */}
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={candlestickData}
                    margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
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
                    />
                    <Tooltip
                      formatter={(value: number) => [`${formatCurrency(value, true)}`, 'Preço']}
                      labelFormatter={(label) => new Date(label).toLocaleString()}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="close"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6, fill: "#8b5cf6" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
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

// Função para preparar dados no formato de candlestick
function prepareCandlestickData(data: HistoricalDataPoint[]): any[] {
  if (data.length === 0) return []
  
  // Para um gráfico de candlestick real, precisaríamos de dados OHLC
  // Aqui estamos simulando com base nos dados disponíveis
  const result = []
  const step = Math.max(1, Math.floor(data.length / 20)) // Agrupar para reduzir número de candles
  
  for (let i = 0; i < data.length; i += step) {
    const chunk = data.slice(i, Math.min(i + step, data.length))
    if (chunk.length > 0) {
      const open = chunk[0].price
      const close = chunk[chunk.length-1].price
      const high = Math.max(...chunk.map(item => item.price))
      const low = Math.min(...chunk.map(item => item.price))
      
      result.push({
        date: chunk[0].date,
        open,
        high,
        low,
        close,
        volume: Math.random() * 1000 // Simulado, não temos dados de volume
      })
    }
  }
  
  return result
}

// Função para gerar dados históricos de exemplo
function generateSampleHistoricalData(days: number, currency: string): HistoricalDataPoint[] {
  const data: HistoricalDataPoint[] = []
  const today = new Date()
  let basePrice = currency === 'usd' ? 45000 : 225000 // Preço base aproximado em USD e BRL
  
  // Adicionar variação aleatória com tendência
  const trend = (Math.random() - 0.3) * 0.0015 // Leve tendência de alta
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    
    // Variação diária com alguma volatilidade
    const dailyChange = (Math.random() - 0.5) * 0.03 + trend
    
    // Ajustar preço
    basePrice = basePrice * (1 + dailyChange)
    
    data.push({
      date: date.toISOString(),
      price: basePrice,
      volume: Math.random() * 10000,
      isSampleData: true
    })
  }
  
  return data
}
