"use client"

import { useState, useEffect } from "react"
import { Bitcoin, RefreshCw, Calendar, TrendingUp, ArrowRightLeft, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toaster } from "@/components/ui/toaster"
import { toast } from "@/components/ui/use-toast"
import HistoricalRatesChart from "./historical-rates-chart"
import ProfitCalculator from "./profit-calculator"
import { fetchAllAppData, getCurrentBitcoinPrice, AppData } from "@/lib/api"

type CurrencyUnit = "BTC" | "SATS" | "USD" | "BRL"

interface ConversionRates {
  BTC_USD: number
  BRL_USD: number
  lastUpdated: Date
  isUsingFallback: boolean
}

// Função para formatar valores monetários corretamente
const formatCurrency = (value: string | number, currency: string = ""): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return `${currency}0.00`;
  
  const formattedValue = numValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  // Adiciona espaço entre o símbolo e o valor
  if (currency) {
    return `${currency} ${formattedValue}`;
  }
  
  return formattedValue;
};

// Função para formatar BTC com 8 casas decimais
const formatBtc = (value: string | number): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return "0.00000000";
  
  return numValue.toFixed(8);
};

export default function BitcoinConverter() {
  const [amount, setAmount] = useState<string>("")
  const [selectedUnit, setSelectedUnit] = useState<CurrencyUnit>("SATS")
  const [rates, setRates] = useState<ConversionRates | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [activeTab, setActiveTab] = useState<string>("converter")
  const [apiError, setApiError] = useState<boolean>(false)
  const [appData, setAppData] = useState<AppData | null>(null)

  // Carregar todos os dados da aplicação de uma vez
  const fetchData = async () => {
    setLoading(true)
    setApiError(false)

    try {
      // Buscar todos os dados necessários em uma única chamada
      const data = await fetchAllAppData()
      setAppData(data)
      
      // Extrair as taxas de conversão dos dados
      const newRates: ConversionRates = {
        BTC_USD: data.currentPrice.usd,
        BRL_USD: data.currentPrice.brl / data.currentPrice.usd,
        lastUpdated: new Date(data.currentPrice.timestamp),
        isUsingFallback: data.isUsingCache || data.currentPrice.isUsingCache,
      }
      
      setRates(newRates)

      // Verificar se estamos usando dados de fallback
      if (newRates.isUsingFallback) {
        setApiError(true)
        toast({
          title: "Aviso",
          description: "Usando dados em cache. Os valores podem não refletir o mercado atual.",
          variant: "warning",
        })
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error)
      setApiError(true)
      
      toast({
        title: "Erro de conexão",
        description: "Não foi possível conectar à API. Usando dados em cache.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Atualizar apenas o preço atual do Bitcoin
  const updateCurrentPrice = async () => {
    try {
      // Buscar apenas o preço atual
      const priceData = await getCurrentBitcoinPrice()
      
      if (appData) {
        // Atualizar o appData com o novo preço
        const updatedAppData = {
          ...appData,
          currentPrice: priceData,
          lastFetched: Date.now()
        }
        setAppData(updatedAppData)
        
        // Atualizar também as taxas de conversão
        const newRates: ConversionRates = {
          BTC_USD: priceData.usd,
          BRL_USD: priceData.brl / priceData.usd,
          lastUpdated: new Date(priceData.timestamp),
          isUsingFallback: priceData.isUsingCache,
        }
        
        setRates(newRates)
        
        if (priceData.isUsingCache) {
          setApiError(true)
        } else {
          setApiError(false)
          toast({
            title: "Preços atualizados",
            description: `1 BTC = ${formatCurrency(priceData.usd, "$")} USD`,
          })
        }
      }
    } catch (error) {
      console.error("Erro ao atualizar preço:", error)
      // Não alterar o estado de erro aqui para não interferir com a interface
    }
  }

  // Carregar os dados no mount e configurar refresh periódico
  useEffect(() => {
    fetchData()

    // Refresh rates every 5 minutes
    const interval = setInterval(updateCurrentPrice, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = () => {
    updateCurrentPrice()
  }

  const convertValue = (value: number, from: CurrencyUnit, to: CurrencyUnit): number => {
    if (!rates) return 0

    // First convert to BTC
    let btcValue = 0

    switch (from) {
      case "BTC":
        btcValue = value
        break
      case "SATS":
        btcValue = value / 100000000
        break
      case "USD":
        btcValue = value / rates.BTC_USD
        break
      case "BRL":
        btcValue = value / (rates.BTC_USD * rates.BRL_USD)
        break
    }

    // Then convert from BTC to target currency
    switch (to) {
      case "BTC":
        return btcValue
      case "SATS":
        return btcValue * 100000000
      case "USD":
        return btcValue * rates.BTC_USD
      case "BRL":
        return btcValue * rates.BTC_USD * rates.BRL_USD
    }
  }

  const getConvertedValues = () => {
    if (!amount || isNaN(Number.parseFloat(amount))) {
      return {
        BTC: "0",
        SATS: "0",
        USD: "0",
        BRL: "0",
      }
    }

    const numericAmount = Number.parseFloat(amount)

    return {
      BTC: convertValue(numericAmount, selectedUnit, "BTC").toFixed(8),
      SATS: convertValue(numericAmount, selectedUnit, "SATS").toFixed(0),
      USD: convertValue(numericAmount, selectedUnit, "USD").toFixed(2),
      BRL: convertValue(numericAmount, selectedUnit, "BRL").toFixed(2),
    }
  }

  const convertedValues = getConvertedValues()
  const currentUsdPrice = rates?.BTC_USD || 0

  return (
    <div className="w-full max-w-6xl mx-auto">
      <Card className="w-full border-purple-700 bg-gray-900 text-white shadow-lg">
        <CardHeader className="bg-purple-900 rounded-t-lg">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold">Conversor de Bitcoin</CardTitle>
            <Bitcoin className="h-8 w-8 text-yellow-500" />
          </div>
          <CardDescription className="text-gray-300">Converta entre BTC, SATS, USD e BRL</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {apiError && (
            <div className="bg-yellow-900/20 border border-yellow-700 text-yellow-200 px-3 py-2 rounded-md text-sm mb-4 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Usando dados em cache. Os valores podem não refletir o mercado atual.
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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-800">
              <TabsTrigger
                value="converter"
                className="data-[state=active]:bg-purple-800 data-[state=active]:text-white"
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Conversor
              </TabsTrigger>
              <TabsTrigger
                value="historical"
                className="data-[state=active]:bg-purple-800 data-[state=active]:text-white"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Histórico
              </TabsTrigger>
              <TabsTrigger value="profits" className="data-[state=active]:bg-purple-800 data-[state=active]:text-white">
                <TrendingUp className="h-4 w-4 mr-2" />
                Lucros
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="converter" className="space-y-6">
                <div className="lg:flex lg:gap-6">
                  <div className="lg:w-1/2 space-y-6 mb-6 lg:mb-0">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="amount" className="text-lg">
                          Valor
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRefresh}
                          className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/50"
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Atualizar Taxas
                        </Button>
                      </div>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="Digite o valor"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="bg-gray-800 border-purple-700 focus:border-purple-500 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-lg">Selecione a Unidade</Label>
                      <RadioGroup
                        value={selectedUnit}
                        onValueChange={(value) => setSelectedUnit(value as CurrencyUnit)}
                        className="grid grid-cols-2 gap-2"
                      >
                        <div className="flex items-center space-x-2 bg-gray-800 p-3 rounded-md border border-purple-700 hover:bg-gray-700 transition-colors">
                          <RadioGroupItem value="SATS" id="sats" className="text-purple-500" />
                          <Label htmlFor="sats" className="cursor-pointer">
                            Satoshis (SATS)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 bg-gray-800 p-3 rounded-md border border-purple-700 hover:bg-gray-700 transition-colors">
                          <RadioGroupItem value="BTC" id="btc" className="text-purple-500" />
                          <Label htmlFor="btc" className="cursor-pointer">
                            Bitcoin (BTC)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 bg-gray-800 p-3 rounded-md border border-purple-700 hover:bg-gray-700 transition-colors">
                          <RadioGroupItem value="USD" id="usd" className="text-purple-500" />
                          <Label htmlFor="usd" className="cursor-pointer">
                            Dólar (USD)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 bg-gray-800 p-3 rounded-md border border-purple-700 hover:bg-gray-700 transition-colors">
                          <RadioGroupItem value="BRL" id="brl" className="text-purple-500" />
                          <Label htmlFor="brl" className="cursor-pointer">
                            Real (BRL)
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>

                  <div className="lg:w-1/2 space-y-4">
                    <Label className="text-lg">Resultados da Conversão</Label>
                    {loading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-full bg-gray-800" />
                        <Skeleton className="h-12 w-full bg-gray-800" />
                        <Skeleton className="h-12 w-full bg-gray-800" />
                        <Skeleton className="h-12 w-full bg-gray-800" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        <div className="flex justify-between items-center bg-gray-800 p-3 rounded-md border border-purple-700">
                          <span className="font-medium">Bitcoin:</span>
                          <span className="font-bold text-yellow-500">₿ {formatBtc(convertedValues.BTC)} </span>
                        </div>
                        <div className="flex justify-between items-center bg-gray-800 p-3 rounded-md border border-purple-700">
                          <span className="font-medium">Satoshis:</span>
                          <span className="font-bold text-yellow-500">丰 {parseInt(convertedValues.SATS).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center bg-gray-800 p-3 rounded-md border border-purple-700">
                          <span className="font-medium">Dólares:</span>
                          <span className="font-bold text-green-500">$ {formatCurrency(convertedValues.USD)}</span>
                        </div>
                        <div className="flex justify-between items-center bg-gray-800 p-3 rounded-md border border-purple-700">
                          <span className="font-medium">Reais:</span>
                          <span className="font-bold text-green-500">R$ {formatCurrency(convertedValues.BRL)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="historical">
                <HistoricalRatesChart 
                  historicalData={appData ? 
                    { usd: appData.historicalDataUSD, brl: appData.historicalDataBRL } : 
                    undefined
                  } 
                />
              </TabsContent>

              <TabsContent value="profits">
                <ProfitCalculator 
                  btcToUsd={rates?.BTC_USD || 65000} 
                  brlToUsd={rates?.BRL_USD || 5.2} 
                  appData={appData}
                />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
        <CardFooter className="text-xs text-gray-400 flex flex-wrap justify-between bg-gray-950 rounded-b-lg p-4">
          <span>Última atualização: {rates?.lastUpdated?.toLocaleTimeString() || new Date().toLocaleTimeString()}</span>
          <span>Taxa: 1 BTC = $ {rates?.BTC_USD?.toLocaleString() || "0"} USD</span>
          <span>Taxa: 1 USD = R$ {rates?.BRL_USD?.toFixed(2) || "5.20"} BRL</span>
          {apiError && (
            <span className="text-yellow-400 w-full text-center mt-1">
              (Dados em Cache)
            </span>
          )}
        </CardFooter>
      </Card>
      <Toaster />
    </div>
  )
}
