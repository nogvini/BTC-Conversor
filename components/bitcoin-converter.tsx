"use client"

import { useState, useEffect, Suspense, useRef } from "react"
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
import { fetchAllAppData, getCurrentBitcoinPrice } from "@/lib/client-api"
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
  // Adicionar flag para evitar chamadas simultâneas
  const isUpdatingRef = useRef<boolean>(false)
  // Adicionar timestamp da última atualização
  const lastUpdateTimeRef = useRef<number>(0)
  // Flag para controlar se o componente foi montado
  const [isInitialized, setIsInitialized] = useState<boolean>(false)

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
        // Notificação removida daqui pois o aviso visual já aparece na UI
        // e evita toast ao carregar a aplicação inicialmente
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error)
      setApiError(true)
      
      // Manter apenas essa notificação de erro crítico
      toast({
        title: "Erro de conexão",
        description: "Não foi possível conectar à API. Usando dados em cache.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Efeito para recuperar valores salvos do localStorage ao inicializar
  useEffect(() => {
    try {
      // Recuperar o último valor e unidade salvos
      const savedAmount = localStorage.getItem("btcConverter_lastAmount") || "";
      const savedUnit = localStorage.getItem("btcConverter_lastUnit");
      
      if (savedAmount) {
        setAmount(savedAmount);
      }
      
      // Verificar se a unidade salva é válida
      if (savedUnit && ["BTC", "SATS", "USD", "BRL"].includes(savedUnit)) {
        setSelectedUnit(savedUnit as CurrencyUnit);
      }
    } catch (error) {
      console.warn("Não foi possível acessar o localStorage:", error);
    }
    
    setIsInitialized(true);
  }, []);
  
  // Efeito para salvar valores quando mudarem
  useEffect(() => {
    // Só salvar após a inicialização para evitar sobrescrever com valores vazios
    if (!isInitialized) return;
    
    try {
      // Salvar o valor atual se não for vazio
      if (amount) {
        localStorage.setItem("btcConverter_lastAmount", amount);
      }
      
      // Salvar a unidade selecionada
      localStorage.setItem("btcConverter_lastUnit", selectedUnit);
    } catch (error) {
      console.warn("Não foi possível salvar no localStorage:", error);
    }
  }, [amount, selectedUnit, isInitialized]);

  // Atualizar apenas o preço atual do Bitcoin - versão melhorada
  const updateCurrentPrice = async () => {
    // Verificar se já está atualizando para evitar chamadas duplicadas
    if (isUpdatingRef.current) {
      console.log("Atualização já em andamento, ignorando chamada duplicada");
      return;
    }
    
    try {
      // Marcar como em atualização
      isUpdatingRef.current = true;
      setLoading(true);
      
      // Usar a nova função específica para atualizar preço, forçando atualização
      const priceData = await getCurrentBitcoinPrice(true);
      
      if (!priceData) {
        throw new Error("Falha ao obter dados atualizados de preço");
      }
      
      // Se a busca de preço for bem-sucedida, precisamos atualizar todo o appData
      // mas já temos os dados de preço atualizados
      if (appData) {
        // Criar versão atualizada dos dados do app
        const updatedAppData = {
          ...appData,
          currentPrice: priceData,
          lastFetched: Date.now(),
          isUsingCache: false
        };
        
        setAppData(updatedAppData);
      } else {
        // Se não tivermos dados do app ainda, buscar tudo
        const fullData = await fetchAllAppData(true);
        setAppData(fullData);
      }
      
      // Extrair as taxas de conversão dos dados
      const newRates: ConversionRates = {
        BTC_USD: priceData.usd,
        BRL_USD: priceData.brl / priceData.usd,
        lastUpdated: new Date(priceData.timestamp),
        isUsingFallback: priceData.isUsingCache,
      };
      
      // Verificar se o preço mudou significativamente em relação ao anterior
      const oldUsdPrice = rates?.BTC_USD || 0;
      const newUsdPrice = newRates.BTC_USD;
      const priceChangePercent = oldUsdPrice > 0 ? Math.abs((newUsdPrice - oldUsdPrice) / oldUsdPrice * 100) : 0;
      const significantPriceChange = priceChangePercent > 0.1; // Mudança maior que 0.1%
      
      // Atualizar as taxas na interface
      setRates(newRates);
      
      // Status de erro/sucesso e notificações
      if (priceData.isUsingCache) {
        setApiError(true);
        // Notificação simplificada
        toast({
          title: "Dados em cache",
          description: "Alguns valores podem não estar atualizados",
          variant: "warning",
          duration: 3000,
        });
      } else {
        setApiError(false);
        
        // Mostrar uma mensagem diferente dependendo da taxa USD/BRL, destacando mudanças
        const oldRate = rates?.BRL_USD || 0;
        const newRate = newRates.BRL_USD;
        let rateChangeMsg = "";
        
        if (oldRate > 0 && Math.abs(newRate - oldRate) > 0.01) {
          const isRateUp = newRate > oldRate;
          const change = ((newRate - oldRate) / oldRate * 100).toFixed(2);
          rateChangeMsg = ` • USD/BRL ${isRateUp ? '↑' : '↓'} ${change}%`;
        }
        
        // Mostrar notificação apenas se o preço mudou significativamente ou se é a primeira carga
        if (significantPriceChange || oldUsdPrice === 0) {
          toast({
            title: "Preços atualizados",
            description: `1 BTC = ${formatCurrency(priceData.usd, "$")} USD${rateChangeMsg}`,
            variant: "success",
            duration: 3000
          });
        }
      }
    } catch (error) {
      console.error("Erro ao atualizar dados:", error);
      setApiError(true);
      toast({
        title: "Erro ao atualizar preços",
        description: "Usando última versão disponível.",
        variant: "destructive",
        duration: 4000
      });
      
      // Tentar atualizar com fetchAllAppData normal como fallback
      try {
        const fallbackData = await fetchAllAppData(false);
        if (fallbackData) {
          setAppData(fallbackData);
          
          // Criar taxas a partir dos dados de fallback
          const fallbackRates: ConversionRates = {
            BTC_USD: fallbackData.currentPrice.usd,
            BRL_USD: fallbackData.currentPrice.brl / fallbackData.currentPrice.usd,
            lastUpdated: new Date(fallbackData.currentPrice.timestamp),
            isUsingFallback: true,
          };
          
          setRates(fallbackRates);
        }
      } catch (fallbackError) {
        console.error("Erro também no fallback:", fallbackError);
      }
    } finally {
      setLoading(false);
      // Marcar como não atualizando
      isUpdatingRef.current = false;
      // Registrar timestamp desta atualização
      lastUpdateTimeRef.current = Date.now();
    }
  }

  // Carregar os dados no mount e configurar refresh periódico
  useEffect(() => {
    // Registrar tempo inicial
    lastUpdateTimeRef.current = Date.now();
    fetchData()

    // Refresh rates every 5 minutes
    const interval = setInterval(() => {
      // Registrar timestamp da atualização automática
      lastUpdateTimeRef.current = Date.now();
      updateCurrentPrice();
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = () => {
    // Verificar se passou tempo suficiente desde a última atualização (2 segundos)
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
    const MIN_UPDATE_INTERVAL = 2000; // 2 segundos
    
    if (timeSinceLastUpdate < MIN_UPDATE_INTERVAL) {
      // Se a última atualização foi muito recente, mostrar mensagem e abortar
      console.log(`Atualização muito recente (${Math.floor(timeSinceLastUpdate)}ms), ignorando`);
      return;
    }
    
    // Registrar timestamp desta atualização
    lastUpdateTimeRef.current = now;
    
    // Chamar a atualização
    updateCurrentPrice();
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
                      onValueChange={(v: string) => setSelectedUnit(v as CurrencyUnit)}
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
