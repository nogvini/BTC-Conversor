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
import { CardTitle } from "@/components/ui/card"
import { getHistoricalBitcoinData, type HistoricalDataPoint } from "@/lib/api"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
    <div className="space-y-4">
      <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:space-y-0 sm:space-x-4">
        <div className="space-y-2">
          <Label htmlFor="timeRange">Período</Label>
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
            <SelectTrigger
              id="timeRange"
              className="bg-gray-800 border-purple-700 focus:border-purple-500 text-white w-full sm:w-32"
            >
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-purple-700 text-white">
              <SelectItem value="1d">1 Dia</SelectItem>
              <SelectItem value="7d">1 Semana</SelectItem>
              <SelectItem value="30d">1 Mês</SelectItem>
              <SelectItem value="90d">3 Meses</SelectItem>
              <SelectItem value="1y">1 Ano</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Moeda</Label>
          <RadioGroup
            value={currency}
            onValueChange={(value) => setCurrency(value as CurrencyType)}
            className="flex space-x-2"
          >
            <div className="flex items-center space-x-1 bg-gray-800 px-3 py-2 rounded-md border border-purple-700">
              <RadioGroupItem value="USD" id="usd-chart" className="text-purple-500" />
              <Label htmlFor="usd-chart" className="cursor-pointer">
                USD
              </Label>
            </div>
            <div className="flex items-center space-x-1 bg-gray-800 px-3 py-2 rounded-md border border-purple-700">
              <RadioGroupItem value="BRL" id="brl-chart" className="text-purple-500" />
              <Label htmlFor="brl-chart" className="cursor-pointer">
                BRL
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label>Tipo de Gráfico</Label>
          <Select value={chartType} onValueChange={(value) => setChartType(value as ChartType)}>
            <SelectTrigger className="bg-gray-800 border-purple-700 focus:border-purple-500 text-white w-full sm:w-32">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-purple-700 text-white">
              <SelectItem value="line">Linha</SelectItem>
              <SelectItem value="area">Área</SelectItem>
              <SelectItem value="candlestick">Candles</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="w-full h-64">
          <Skeleton className="h-full w-full bg-gray-800" />
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg">Preço do Bitcoin</CardTitle>
              <p className="text-sm text-gray-400">
                Últimos {getTimeRangeLabel(timeRange)}
                {usingFallbackData && " (Dados Simulados)"}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-right">
                <p className="text-lg font-bold">
                  {currency === "USD" ? "$" : "R$"}
                  {formatCurrency(chartData[chartData.length - 1]?.price || 0)}
                </p>
                <p className={`text-sm ${isPriceUp ? "text-green-500" : "text-red-500"}`}>
                  {isPriceUp ? "↑" : "↓"} {currency === "USD" ? "$" : "R$"}
                  {formatCurrency(Math.abs(priceChange.change))} ({priceChange.percentage.toFixed(2)}%)
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/50"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-yellow-900/20 border border-yellow-700 text-yellow-200 px-3 py-2 rounded-md text-sm mb-2 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              {error}
              <Button
                variant="link"
                size="sm"
                onClick={handleRefresh}
                className="text-yellow-200 hover:text-yellow-100 ml-2 p-0 h-auto"
              >
                Tentar novamente
              </Button>
            </div>
          )}

          <Tabs defaultValue="chart" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-800">
              <TabsTrigger value="chart" className="data-[state=active]:bg-purple-800 data-[state=active]:text-white">
                <TrendingUp className="h-4 w-4 mr-2" />
                Gráfico
              </TabsTrigger>
              <TabsTrigger value="stats" className="data-[state=active]:bg-purple-800 data-[state=active]:text-white">
                <Info className="h-4 w-4 mr-2" />
                Estatísticas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chart" className="mt-4">
              <div className="w-full h-64 bg-gray-800 rounded-md border border-purple-700 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "line" ? (
                    <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis
                        dataKey="formattedDate"
                        tick={{ fill: "#aaa", fontSize: 12 }}
                        axisLine={{ stroke: "#555" }}
                        tickLine={{ stroke: "#555" }}
                      />
                      <YAxis
                        domain={["auto", "auto"]}
                        tick={{ fill: "#aaa", fontSize: 12 }}
                        axisLine={{ stroke: "#555" }}
                        tickLine={{ stroke: "#555" }}
                        tickFormatter={(value) =>
                          currency === "USD"
                            ? `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                            : `R${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        }
                      />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), "Preço"]}
                        labelFormatter={(label) => `Data: ${label}`}
                        contentStyle={{ backgroundColor: "#333", borderColor: "#7e22ce", color: "white" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#a855f7"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6, fill: "#a855f7", stroke: "#fff" }}
                      />
                    </LineChart>
                  ) : chartType === "area" ? (
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis
                        dataKey="formattedDate"
                        tick={{ fill: "#aaa", fontSize: 12 }}
                        axisLine={{ stroke: "#555" }}
                        tickLine={{ stroke: "#555" }}
                      />
                      <YAxis
                        domain={["auto", "auto"]}
                        tick={{ fill: "#aaa", fontSize: 12 }}
                        axisLine={{ stroke: "#555" }}
                        tickLine={{ stroke: "#555" }}
                        tickFormatter={(value) =>
                          currency === "USD"
                            ? `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                            : `R${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        }
                      />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), "Preço"]}
                        labelFormatter={(label) => `Data: ${label}`}
                        contentStyle={{ backgroundColor: "#333", borderColor: "#7e22ce", color: "white" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="#a855f7"
                        fill="url(#colorPrice)"
                        strokeWidth={2}
                        activeDot={{ r: 6, fill: "#a855f7", stroke: "#fff" }}
                      />
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                    </AreaChart>
                  ) : (
                    <LineChart data={candlestickData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#aaa", fontSize: 12 }}
                        axisLine={{ stroke: "#555" }}
                        tickLine={{ stroke: "#555" }}
                      />
                      <YAxis
                        domain={["auto", "auto"]}
                        tick={{ fill: "#aaa", fontSize: 12 }}
                        axisLine={{ stroke: "#555" }}
                        tickLine={{ stroke: "#555" }}
                        tickFormatter={(value) =>
                          currency === "USD"
                            ? `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                            : `R${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        }
                      />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), ""]}
                        labelFormatter={(label) => `Data: ${label}`}
                        contentStyle={{ backgroundColor: "#333", borderColor: "#7e22ce", color: "white" }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="high" name="Máxima" stroke="#22c55e" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="low" name="Mínima" stroke="#ef4444" dot={false} strokeWidth={2} />
                      <Line
                        type="monotone"
                        dataKey="close"
                        name="Fechamento"
                        stroke="#a855f7"
                        dot={true}
                        strokeWidth={2}
                        activeDot={{ r: 6, fill: "#a855f7", stroke: "#fff" }}
                      />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="stats" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-800 p-4 rounded-md border border-purple-700">
                  <div className="text-sm text-gray-400">Preço Atual</div>
                  <div className="text-xl font-bold text-white">
                    {currency === "USD" ? "$" : "R$"}
                    {formatCurrency(chartData[chartData.length - 1]?.price || 0)}
                  </div>
                </div>

                <div className="bg-gray-800 p-4 rounded-md border border-purple-700">
                  <div className="text-sm text-gray-400">Preço Máximo</div>
                  <div className="text-xl font-bold text-green-500">
                    {currency === "USD" ? "$" : "R$"}
                    {formatCurrency(priceStats.max)}
                  </div>
                </div>

                <div className="bg-gray-800 p-4 rounded-md border border-purple-700">
                  <div className="text-sm text-gray-400">Preço Mínimo</div>
                  <div className="text-xl font-bold text-red-500">
                    {currency === "USD" ? "$" : "R$"}
                    {formatCurrency(priceStats.min)}
                  </div>
                </div>

                <div className="bg-gray-800 p-4 rounded-md border border-purple-700">
                  <div className="text-sm text-gray-400">Preço Médio</div>
                  <div className="text-xl font-bold text-blue-400">
                    {currency === "USD" ? "$" : "R$"}
                    {formatCurrency(priceStats.avg)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="bg-gray-800 p-4 rounded-md border border-purple-700">
                  <div className="text-sm text-gray-400">Variação no Período</div>
                  <div className={`text-xl font-bold ${isPriceUp ? "text-green-500" : "text-red-500"}`}>
                    {isPriceUp ? (
                      <TrendingUp className="inline h-5 w-5 mr-1" />
                    ) : (
                      <TrendingDown className="inline h-5 w-5 mr-1" />
                    )}
                    {priceChange.percentage.toFixed(2)}%
                    <span className="text-sm ml-1">
                      ({currency === "USD" ? "$" : "R$"}
                      {formatCurrency(Math.abs(priceChange.change))})
                    </span>
                  </div>
                </div>

                <div className="bg-gray-800 p-4 rounded-md border border-purple-700">
                  <div className="text-sm text-gray-400">Volatilidade Anualizada</div>
                  <div className="text-xl font-bold text-purple-400">{volatility.toFixed(2)}%</div>
                  <div className="text-xs text-gray-400 mt-1">Baseada no desvio padrão dos retornos diários</div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
