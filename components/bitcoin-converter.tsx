"use client"

import { useState, useEffect, Suspense } from "react"
import { Bitcoin, Calendar, AlertTriangle, DollarSign } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toaster } from "@/components/ui/toaster"
import { toast } from "@/components/ui/use-toast"
import HistoricalRatesChart from "./historical-rates-chart"
import ProfitCalculator from "./profit-calculator"
import { fetchAllAppData } from "@/lib/client-api"
import { type AppData } from "@/lib/api"
import { ResponsiveContainer } from "@/components/ui/responsive-container"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { useActiveTab } from "@/hooks/use-active-tab"
import { NavigationBar } from "./ui/navigation-bar"
import { PageTransition } from "./page-transition"

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
  const [apiError, setApiError] = useState<boolean>(false)
  const [appData, setAppData] = useState<AppData | null>(null)
  const [activeTab, setActiveTab] = useActiveTab()

  // Adicionar detecção de dispositivo móvel
  const isMobile = useIsMobile()
  
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
      setLoading(true);
      
      // Forçar a atualização dos dados, ignorando o cache
      const data = await fetchAllAppData(true);
      setAppData(data);
      
      // Extrair as taxas de conversão dos dados
      const newRates: ConversionRates = {
        BTC_USD: data.currentPrice.usd,
        BRL_USD: data.currentPrice.brl / data.currentPrice.usd,
        lastUpdated: new Date(data.currentPrice.timestamp),
        isUsingFallback: data.isUsingCache || data.currentPrice.isUsingCache,
      };
      
      setRates(newRates);
      
      if (data.isUsingCache) {
        setApiError(true);
        toast({
          title: "Aviso",
          description: "Usando dados em cache. Os valores podem não refletir o mercado atual.",
          variant: "warning",
        });
      } else {
        setApiError(false);
        toast({
          title: "Dados atualizados",
          description: `1 BTC = ${formatCurrency(data.currentPrice.usd, "$")} USD`,
        });
      }
    } catch (error) {
      console.error("Erro ao atualizar dados:", error);
      setApiError(true);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar os dados. Usando versão em cache.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  // Renderizar os conteúdos com base na aba ativa
  const renderTabContent = () => {
    switch (activeTab) {
      case "converter":
        return (
          <PageTransition>
            <Card className="panel">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Conversor Bitcoin</CardTitle>
                <CardDescription>
                  Converta entre Bitcoin, Satoshis, USD e BRL com facilidade.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Formulário de Conversão */}
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="amount">Valor</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Digite o valor..."
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="text-lg bg-black/30 border-[hsl(var(--panel-border))]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Unidade</Label>
                    <RadioGroup
                      value={selectedUnit}
                      onValueChange={(v) => setSelectedUnit(v as CurrencyUnit)}
                      className="grid grid-cols-2 sm:grid-cols-1 lg:grid-cols-2 gap-2"
                    >
                      <div>
                        <RadioGroupItem value="BTC" id="BTC" className="peer sr-only" />
                        <Label
                          htmlFor="BTC"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-black/30 p-3 h-[4.5rem] hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                          <Bitcoin className="mb-1" />
                          BTC
                        </Label>
                      </div>
                      
                      <div>
                        <RadioGroupItem value="SATS" id="SATS" className="peer sr-only" />
                        <Label
                          htmlFor="SATS"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-black/30 p-3 h-[4.5rem] hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                          <Bitcoin className="mb-1" />
                          SATS
                        </Label>
                      </div>
                      
                      <div>
                        <RadioGroupItem value="USD" id="USD" className="peer sr-only" />
                        <Label
                          htmlFor="USD"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-black/30 p-3 h-[4.5rem] hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                          <DollarSign className="mb-1" />
                          USD
                        </Label>
                      </div>
                      
                      <div>
                        <RadioGroupItem value="BRL" id="BRL" className="peer sr-only" />
                        <Label
                          htmlFor="BRL"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-black/30 p-3 h-[4.5rem] hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                          <span className="mb-1 font-bold">R$</span>
                          BRL
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
                
                {/* Resultados da Conversão */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                  <div className="data-display flex justify-between items-center">
                    <span className="font-medium">Bitcoin:</span>
                    <span className="font-bold text-yellow-500">₿ {formatBtc(convertedValues.BTC)} </span>
                  </div>
                  <div className="data-display flex justify-between items-center">
                    <span className="font-medium">Satoshis:</span>
                    <span className="font-bold text-yellow-500">丰 {parseInt(convertedValues.SATS).toLocaleString()}</span>
                  </div>
                  <div className="data-display flex justify-between items-center">
                    <span className="font-medium">Dólares:</span>
                    <span className="font-bold text-green-500">$ {formatCurrency(convertedValues.USD)}</span>
                  </div>
                  <div className="data-display flex justify-between items-center">
                    <span className="font-medium">Reais:</span>
                    <span className="font-bold text-green-500">R$ {formatCurrency(convertedValues.BRL)}</span>
                  </div>
                </div>
                
                {apiError && (
                  <div className="bg-yellow-900/20 border border-yellow-700/50 text-yellow-300 rounded-lg p-3 flex items-start">
                    <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-sm">
                      Atenção: Usando dados em cache que podem não refletir os valores atuais de mercado.
                    </p>
                  </div>
                )}
              </CardContent>
              
              <CardFooter>
                <p className="text-sm text-muted-foreground">
                  {rates && (
                    <>
                      Atualizado em {rates.lastUpdated.toLocaleString()}
                      <span className="hidden sm:inline"> • </span>
                      <span className="block sm:inline sm:ml-2 font-medium">1 BTC = ${formatCurrency(rates.BTC_USD)}</span>
                      <span className="hidden sm:inline"> • </span>
                      <span className="block sm:inline sm:ml-0 font-medium">1 USD = R${formatCurrency(rates.BRL_USD)}</span>
                    </>
                  )}
                </p>
              </CardFooter>
            </Card>
          </PageTransition>
        );
      
      case "chart":
        return (
          <PageTransition>
            <HistoricalRatesChart historicalData={appData?.historicalData} />
          </PageTransition>
        );
      
      case "calculator":
        return (
          <PageTransition>
            <ProfitCalculator 
              btcToUsd={rates?.BTC_USD || 0} 
              brlToUsd={rates?.BRL_USD || 0} 
              appData={appData?.currentPrice && {
                currentPrice: appData.currentPrice,
                isUsingCache: appData.isUsingCache,
              }}
            />
          </PageTransition>
        );
      
      default:
        return null;
    }
  };

  return (
    <ResponsiveContainer>
      <div className="space-y-4">
        {/* Nova barra de navegação */}
        <NavigationBar onRefresh={handleRefresh} loading={loading} />
        
        {/* Conteúdo baseado na aba ativa */}
        {renderTabContent()}
      </div>

      <Toaster />
    </ResponsiveContainer>
  )
}
