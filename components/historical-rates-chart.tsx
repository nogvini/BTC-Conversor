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
import { CardTitle, CardHeader, CardContent } from "@/components/ui/card"
import { getHistoricalBitcoinData, type HistoricalDataPoint } from "@/lib/client-api"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

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
        const sourceData = currency === 'usd' ? historicalData.usd : historicalData.brl
        
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
      
      setChartData(data)

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

  useEffect(() => {
    fetchHistoricalData()
  }, [fetchHistoricalData])

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

  const formatCurrency = (value: number): string => {
    if (currency === "USD") {
      return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    } else {
      return `R${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
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

  // Calcular máximos e mínimos para o período
  const priceStats = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 0, avg: 0 }

    const prices = chartData.map((item) => item.price)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length

    return { min, max, avg }
  }, [chartData])

  // Calcular volatilidade (desvio padrão dos retornos diários)
  const volatility = useMemo(() => {
    if (chartData.length < 2) return 0

    // Calcular retornos diários
    const returns = []
    for (let i = 1; i < chartData.length; i++) {
      const dailyReturn = (chartData[i].price - chartData[i - 1].price) / chartData[i - 1].price
      returns.push(dailyReturn)
    }

    // Calcular média dos retornos
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length

    // Calcular desvio padrão
    const squaredDiffs = returns.map((ret) => Math.pow(ret - avgReturn, 2))
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / returns.length
    const stdDev = Math.sqrt(variance)

    // Anualizar a volatilidade (multiplicar pelo sqrt do número de dias de negociação em um ano)
    const annualizedVolatility = stdDev * Math.sqrt(365) * 100

    return annualizedVolatility
  }, [chartData])

  const priceChange = calculatePriceChange()
  const isPriceUp = priceChange.change >= 0

  const handleRefresh = () => {
    fetchHistoricalData()
  }

  // Preparar dados para o gráfico de velas (simulado)
  const candlestickData = useMemo(() => {
    if (chartData.length < 7) return []

    // Agrupar dados por dia ou período apropriado
    const groupedData = []
    let groupSize = 1

    // Ajustar o tamanho do grupo com base no intervalo de tempo
    if (timeRange === "30d") groupSize = 1
    else if (timeRange === "90d") groupSize = 3
    else if (timeRange === "1y") groupSize = 7

    for (let i = 0; i < chartData.length; i += groupSize) {
      const group = chartData.slice(i, i + groupSize)
      if (group.length > 0) {
        const prices = group.map((item) => item.price)
        groupedData.push({
          date: group[0].formattedDate,
          open: prices[0],
          close: prices[prices.length - 1],
          high: Math.max(...prices),
          low: Math.min(...prices),
          timestamp: group[0].timestamp,
        })
      }
    }

    return groupedData
  }, [chartData, timeRange])

  // Add a helper function to generate sample data directly in the component
  const generateSampleHistoricalData = (days: number, currency: string): HistoricalDataPoint[] => {
    const data: HistoricalDataPoint[] = []
    const today = new Date()

    // Preço base e volatilidade
    let basePrice = currency.toLowerCase() === "usd" ? 65000 : 65000 * 5.2
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
        isSampleData: true, // Marcar como dados de exemplo
      })
    }

    return data
  }

  // Helper function to format dates based on time range
  const formatDateForTimeRange = (date: Date, days: number): string => {
    if (days <= 1) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (days <= 7) {
      return date.toLocaleDateString([], { weekday: "short" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <CardTitle className="text-xl">
            Histórico de Preços do Bitcoin
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleRefresh}
              variant="outline"
              size={isMobile ? "sm" : "default"}
              disabled={loading}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              {loading ? "Atualizando..." : "Atualizar"}
            </Button>
            <Select
              value={timeRange}
              onValueChange={(value) => setTimeRange(value as TimeRange)}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">1 Dia</SelectItem>
                <SelectItem value="7d">1 Semana</SelectItem>
                <SelectItem value="30d">1 Mês</SelectItem>
                <SelectItem value="90d">3 Meses</SelectItem>
                <SelectItem value="1y">1 Ano</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={currency}
              onValueChange={(value) => setCurrency(value as CurrencyType)}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="BRL">BRL</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 sm:p-6">
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-4 mb-4">
          <Card className="border-l-4 border-l-purple-600">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Preço Atual</p>
              <p className="text-2xl font-bold">
                {chartData.length > 0
                  ? formatCurrency(chartData[chartData.length - 1].price)
                  : "Carregando..."}
              </p>
            </CardContent>
          </Card>
          <Card className={`border-l-4 ${priceChange.percentage >= 0 ? "border-l-green-500" : "border-l-red-500"}`}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Variação no Período</p>
              <p className="text-2xl font-bold">
                {priceChange.percentage >= 0 ? "+" : ""}
                {priceChange.percentage.toFixed(2)}%
              </p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Máxima no Período</p>
              <p className="text-2xl font-bold">{formatCurrency(priceStats.max)}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Mínima no Período</p>
              <p className="text-2xl font-bold">{formatCurrency(priceStats.min)}</p>
            </CardContent>
          </Card>
        </div>
        
        <Tabs value={chartType} onValueChange={(v) => setChartType(v as ChartType)} className="mb-6">
          <TabsList className="grid w-full grid-cols-2 max-w-[240px]">
            <TabsTrigger value="line">Linha</TabsTrigger>
            <TabsTrigger value="area">Área</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="w-full h-[350px]">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Carregando dados históricos...</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "area" ? (
                <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => formatDateForTimeRange(new Date(date), timeRangeToDays(timeRange))}
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--muted))" }}
                  />
                  <YAxis
                    tickFormatter={(price) => formatCurrency(price, true)}
                    domain={["auto", "auto"]}
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--muted))" }}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Preço"]}
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="hsl(var(--chart-1))"
                    fillOpacity={1}
                    fill="url(#colorPrice)"
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => formatDateForTimeRange(new Date(date), timeRangeToDays(timeRange))}
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--muted))" }}
                  />
                  <YAxis
                    tickFormatter={(price) => formatCurrency(price, true)}
                    domain={["auto", "auto"]}
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--muted))" }}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Preço"]}
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="hsl(var(--chart-1))"
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {error && (
          <div className="bg-yellow-500/10 text-yellow-500 rounded-lg p-3 mt-4 flex items-start">
            <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
