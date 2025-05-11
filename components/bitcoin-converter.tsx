"use client"

import { useState, useEffect, Suspense, useRef, useCallback, useMemo } from "react"
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
import { MultiReportCalculator } from "./multi-report-calculator"
import { fetchAllAppData, getCurrentBitcoinPrice } from "@/lib/client-api"
import { type AppData } from "@/lib/api"
import { ResponsiveContainer } from "@/components/ui/responsive-container"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { useActiveTab } from "@/hooks/use-active-tab"
import { SafeNavigationBar } from "./ui/safe-navigation-bar"
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
  
  // Carregar todos os dados da aplicação de uma vez - convertido para useCallback
  const fetchData = useCallback(async () => {
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
  }, []) // Dependências vazias já que não dependemos de estado externo

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

  // Atualizar apenas o preço atual do Bitcoin - convertido para useCallback
  const updateCurrentPrice = useCallback(async () => {
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
      const priceData = await getCurrentBitcoinPrice(true)
        .catch(err => {
          console.warn("Erro ao atualizar preço, usando cache:", err);
          // Em vez de lançar erro, retornamos null para tratamento
          return null;
        });
      
      // Se não conseguimos obter nenhum dado, usar o que já temos e mostrar erro
      if (!priceData) {
        console.warn("Falha ao obter dados atualizados de preço");
        setApiError(true);
        toast({
          title: "Erro ao atualizar",
          description: "Não foi possível obter cotações atualizadas. Tentando novamente...",
          variant: "warning",
        });
        
        // Tentar novamente após 5 segundos
        setTimeout(() => {
          isUpdatingRef.current = false;
          setLoading(false);
        }, 5000);
        
        return;
      }
      
      // Se a busca de preço for bem-sucedida, precisamos atualizar todo o appData
      // para manter consistência com o restante da aplicação
      try {
        const newData = await fetchAllAppData();
        setAppData(newData);
        
        const newRates: ConversionRates = {
          BTC_USD: newData.currentPrice.usd,
          BRL_USD: newData.currentPrice.brl / newData.currentPrice.usd,
          lastUpdated: new Date(newData.currentPrice.timestamp),
          isUsingFallback: newData.isUsingCache || newData.currentPrice.isUsingCache,
        };
        
        setRates(newRates);
        setApiError(newRates.isUsingFallback);
        
        // Armazenar o timestamp da última atualização
        lastUpdateTimeRef.current = Date.now();
        
        toast({
          title: "Cotações atualizadas",
          description: `Taxas atualizadas com sucesso: BTC = $${newRates.BTC_USD.toLocaleString()}`,
        });
      } catch (error) {
        console.error("Erro ao buscar dados completos após atualização de preço:", error);
        setApiError(true);
      }
    } finally {
      // Resetar flag de atualização e loading
      isUpdatingRef.current = false;
      setLoading(false);
    }
  }, []);

  // Buscar dados quando montar o componente
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Memoize os valores convertidos para melhorar performance
  const convertedValues = useMemo(() => {
    if (!rates || !amount || isNaN(parseFloat(amount))) {
      return {
        btc: 0,
        sats: 0,
        usd: 0,
        brl: 0
      }
    }

    let btcValue = 0
    
    // Converter para BTC conforme unidade selecionada
    if (selectedUnit === "BTC") {
      btcValue = parseFloat(amount)
    } else if (selectedUnit === "SATS") {
      btcValue = parseFloat(amount) / 100000000
    } else if (selectedUnit === "USD") {
      btcValue = parseFloat(amount) / rates.BTC_USD
    } else if (selectedUnit === "BRL") {
      btcValue = parseFloat(amount) / rates.BTC_USD / rates.BRL_USD
    }
    
    return {
      btc: btcValue,
      sats: btcValue * 100000000,
      usd: btcValue * rates.BTC_USD,
      brl: btcValue * rates.BTC_USD * rates.BRL_USD
    }
  }, [amount, selectedUnit, rates])

  // Determinar se o preço precisa ser atualizado
  const shouldUpdate = useMemo(() => {
    // Se ainda não temos dados, sempre atualizar
    if (!rates) return true
    
    const now = Date.now()
    const lastUpdate = lastUpdateTimeRef.current || 0
    // Atualizar a cada 5 minutos (300000ms)
    return now - lastUpdate > 300000 || rates.isUsingFallback
  }, [rates])

  // Função para atualizar manualmente as taxas
  const handleRefresh = () => {
    // Não permitir atualizações em sequência muito rápidas
    const now = Date.now()
    const lastUpdate = lastUpdateTimeRef.current
    
    if (now - lastUpdate < 10000) { // 10 segundos
      toast({
        title: "Muitas requisições",
        description: "Aguarde alguns instantes antes de atualizar novamente.",
        variant: "warning",
      })
      return
    }
    
    updateCurrentPrice()
  }

  useEffect(() => {
    // Verificar se precisamos atualizar o preço automaticamente
    if (shouldUpdate) {
      updateCurrentPrice()
    }
  }, [shouldUpdate, updateCurrentPrice])
 
  return (
    <ResponsiveContainer>
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="mb-8"
      >
        <TabsList className="grid grid-cols-3 md:w-[400px] mx-auto mb-6">
          <TabsTrigger value="converter">Conversor</TabsTrigger>
          <TabsTrigger value="calculator">Calculadora</TabsTrigger>
          <TabsTrigger value="chart">Gráfico</TabsTrigger>
        </TabsList>
        
        <TabsContent value="converter" className="space-y-4">
          <Card className="border-purple-700/50">
            <CardHeader>
              <CardTitle>Conversor de Bitcoin</CardTitle>
              <CardDescription>
                Converta entre Bitcoin, Satoshis e moedas fiduciárias
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {apiError && (
                <div className="bg-yellow-900/20 border border-yellow-900/40 rounded-md px-4 py-3 text-sm flex items-start">
                  <AlertTriangle className="text-yellow-500 h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-500">Aviso de dados</p>
                    <p className="text-gray-300 mt-1">
                      Usando taxas de conversão em cache. Os valores podem não refletir o mercado atual.
                    </p>
                    <button
                      onClick={handleRefresh}
                      className="text-yellow-400 hover:text-yellow-300 underline mt-1"
                    >
                      Tentar atualizar
                    </button>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Digite um valor"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-gray-800/60"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <RadioGroup
                    value={selectedUnit}
                    onValueChange={(value) => setSelectedUnit(value as CurrencyUnit)}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div className="flex items-center space-x-2 bg-gray-800/40 p-3 rounded-md">
                      <RadioGroupItem value="BTC" id="unit-btc" />
                      <Label htmlFor="unit-btc" className="flex items-center">
                        <Bitcoin className="h-4 w-4 mr-2 text-purple-400" />
                        Bitcoin
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 bg-gray-800/40 p-3 rounded-md">
                      <RadioGroupItem value="SATS" id="unit-sats" />
                      <Label htmlFor="unit-sats">Satoshis</Label>
                    </div>
                    <div className="flex items-center space-x-2 bg-gray-800/40 p-3 rounded-md">
                      <RadioGroupItem value="USD" id="unit-usd" />
                      <Label htmlFor="unit-usd" className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-2 text-green-400" />
                        Dólares
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 bg-gray-800/40 p-3 rounded-md">
                      <RadioGroupItem value="BRL" id="unit-brl" />
                      <Label htmlFor="unit-brl">Reais</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <div className="w-full grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="bg-black/40 rounded-md p-4">
                  <div className="text-sm text-gray-400 mb-1">Bitcoin</div>
                  {loading ? (
                    <Skeleton className="h-6 w-full bg-gray-700/30" />
                  ) : (
                    <div className="text-purple-400 font-medium text-lg">
                      {formatBtc(convertedValues.btc)} BTC
                    </div>
                  )}
                </div>
                <div className="bg-black/40 rounded-md p-4">
                  <div className="text-sm text-gray-400 mb-1">Satoshis</div>
                  {loading ? (
                    <Skeleton className="h-6 w-full bg-gray-700/30" />
                  ) : (
                    <div className="text-purple-400 font-medium text-lg">
                      {Math.floor(convertedValues.sats).toLocaleString()} SATS
                    </div>
                  )}
                </div>
                <div className="bg-black/40 rounded-md p-4">
                  <div className="text-sm text-gray-400 mb-1">Dólares</div>
                  {loading ? (
                    <Skeleton className="h-6 w-full bg-gray-700/30" />
                  ) : (
                    <div className="text-green-400 font-medium text-lg">
                      {formatCurrency(convertedValues.usd, "$")}
                    </div>
                  )}
                </div>
                <div className="bg-black/40 rounded-md p-4">
                  <div className="text-sm text-gray-400 mb-1">Reais</div>
                  {loading ? (
                    <Skeleton className="h-6 w-full bg-gray-700/30" />
                  ) : (
                    <div className="text-green-400 font-medium text-lg">
                      {formatCurrency(convertedValues.brl, "R$")}
                    </div>
                  )}
                </div>
              </div>
              
              {rates && (
                <div className="w-full text-center">
                  <p className="text-xs text-gray-400">
                    Taxa atual: 1 BTC = ${rates.BTC_USD.toLocaleString()} = R${(rates.BTC_USD * rates.BRL_USD).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    <button 
                      onClick={handleRefresh}
                      disabled={loading}
                      className={cn(
                        "ml-2 underline text-xs",
                        loading ? "text-gray-500" : "text-purple-400 hover:text-purple-300"
                      )}
                    >
                      {loading ? "Atualizando..." : "Atualizar"}
                    </button>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Última atualização: {rates.lastUpdated.toLocaleString()}
                  </p>
                </div>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="calculator" className="space-y-4">
          {appData && rates ? (
            <Suspense fallback={<div className="text-center py-8">Carregando calculadora...</div>}>
              <MultiReportCalculator
                btcToUsd={rates.BTC_USD}
                brlToUsd={rates.BRL_USD}
                appData={appData}
              />
            </Suspense>
          ) : (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="animate-pulse h-10 w-10 rounded-full bg-purple-500/20"></div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="chart" className="space-y-4">
          <Suspense fallback={<div className="text-center py-8">Carregando gráfico...</div>}>
            <HistoricalRatesChart />
          </Suspense>
        </TabsContent>
      </Tabs>
    </ResponsiveContainer>
  );
}
