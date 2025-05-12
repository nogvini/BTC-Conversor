"use client"

import { useState, useEffect, Suspense, useRef, useCallback, useMemo } from "react"
import { Bitcoin, Calendar, AlertTriangle, DollarSign, Copy, CheckCircle, RefreshCw, ArrowRightLeft, Calculator, TrendingUp, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toaster } from "@/components/ui/toaster"
import { toast } from "@/components/ui/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import HistoricalRatesChart from "./historical-rates-chart"
import ProfitCalculator from "./profit-calculator"
import { MultiReportCalculator } from "./multi-report-calculator"
import { fetchAllAppData, getCurrentBitcoinPrice } from "@/lib/client-api"
import { type AppData } from "@/lib/api"
import { ResponsiveContainer } from "@/components/ui/responsive-container"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { useActiveTab } from "@/hooks/use-active-tab"
import { PageTransition } from "./page-transition"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

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
  // Estados para controlar quais valores foram copiados recentemente
  const [copiedValues, setCopiedValues] = useState<{[key in CurrencyUnit]?: boolean}>({})
  // Adicionar novo estado para forçar a renderização
  const [forceRender, setForceRender] = useState(0)
  const searchParams = useSearchParams()
  const router = useRouter()

  // Adicionar detecção de dispositivo móvel
  const isMobile = useIsMobile()
  
  // Função para atualizar a URL quando a aba é alterada
  const handleTabChange = (value: string) => {
    // Primeiro atualiza o estado local
    setActiveTab(value as 'converter' | 'chart' | 'calculator')
    
    // Depois atualiza a URL
    router.push(`/?tab=${value}`, { scroll: false })
  }
  
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
    // Se não houver taxas ou valor, retornar zero
    if (!rates || !amount) {
      return {
        btc: 0,
        sats: 0,
        usd: 0,
        brl: 0
      }
    }

    // Processar a string de entrada
    let processedAmountString = amount;
    // Se a unidade selecionada for SATS, remover pontos e vírgulas
    if (selectedUnit === "SATS") {
      processedAmountString = amount.replace(/[.,]/g, '');
    }

    // Tentar converter a string processada (ou original) para número
    const numAmount = parseFloat(processedAmountString);

    // Se a conversão falhar (resultar em NaN), retornar zero
    if (isNaN(numAmount)) {
      return {
        btc: 0,
        sats: 0,
        usd: 0,
        brl: 0
      };
    }

    // Lógica de conversão existente usando numAmount
    let btc = 0
    let sats = 0
    let usd = 0
    let brl = 0

    switch (selectedUnit) {
      case "BTC":
        btc = numAmount
        sats = btc * 100000000
        usd = btc * rates.BTC_USD
        brl = usd * rates.BRL_USD
        break
      case "SATS":
        sats = numAmount
        btc = sats / 100000000
        usd = btc * rates.BTC_USD
        brl = usd * rates.BRL_USD
        break
      case "USD":
        usd = numAmount
        btc = usd / rates.BTC_USD
        sats = btc * 100000000
        brl = usd * rates.BRL_USD
        break
      case "BRL":
        brl = numAmount
        usd = brl / rates.BRL_USD
        btc = usd / rates.BTC_USD
        sats = btc * 100000000
        break
    }

    return {
      btc,
      sats,
      usd,
      brl
    }
  }, [rates, amount, selectedUnit])

  // Função para atualizar os valores convertidos
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAmount = e.target.value
    
    // Verifica se é um número válido (incluindo separador decimal)
    if (newAmount === "" || /^[0-9]*\.?[0-9]*$/.test(newAmount)) {
      setAmount(newAmount)
    }
  }

  // Função para selecionar a unidade
  const handleUnitChange = (unit: CurrencyUnit) => {
    setSelectedUnit(unit)
  }

  // Função para atualizar as cotações
  const handleRefresh = () => {
    // Previnir atualizações muito frequentes (menos de 30 segundos)
    const currentTime = Date.now()
    const timeSinceLastUpdate = currentTime - lastUpdateTimeRef.current
    
    if (timeSinceLastUpdate < 30000 && lastUpdateTimeRef.current > 0) {
      toast({
        title: "Aguarde um momento",
        description: "As cotações só podem ser atualizadas a cada 30 segundos.",
        variant: "warning",
      })
      return
    }
    
    updateCurrentPrice()
  }

  // Função para copiar um valor para a área de transferência
  const copyToClipboard = (value: number, unit: CurrencyUnit) => {
    const formattedValue = (() => {
      switch (unit) {
        case "BTC": return formatBtc(value);
        case "SATS": return Math.round(value).toString();
        case "USD": return formatCurrency(value, "$");
        case "BRL": return formatCurrency(value, "R$");
        default: return value.toString();
      }
    })();
    
    // Remover símbolos de moeda e espaços para obter apenas o número
    const cleanValue = formattedValue.replace(/[^0-9.,]/g, '');
    
    navigator.clipboard.writeText(cleanValue).then(() => {
      // Atualizar estado para mostrar o ícone de confirmação
      setCopiedValues(prev => ({ ...prev, [unit]: true }));
      
      // Mostrar mensagem de sucesso
      toast({
        title: "Valor copiado",
        description: `${formattedValue} copiado para a área de transferência.`,
        variant: "success",
      });
      
      // Resetar após 2 segundos
      setTimeout(() => {
        setCopiedValues(prev => ({ ...prev, [unit]: false }));
      }, 2000);
    }).catch(err => {
      console.error("Falha ao copiar:", err);
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o valor para a área de transferência.",
        variant: "destructive",
      });
    });
  };

  // Componente para exibir um valor com botão de cópia
  const ValueDisplay = ({ value, unit, label, icon }: { 
    value: number, 
    unit: CurrencyUnit, 
    label: string,
    icon: React.ReactNode
  }) => {
    const formattedValue = (() => {
      switch (unit) {
        case "BTC": return formatBtc(value);
        case "SATS": return Math.round(value).toLocaleString();
        case "USD": return formatCurrency(value, "$");
        case "BRL": return formatCurrency(value, "R$");
        default: return value.toString();
      }
    })();
    
    const isCopied = copiedValues[unit];

    const valueColorClass = () => {
      switch (unit) {
        case "BTC":
        case "SATS":
          return "text-amber-400 dark:text-amber-300"; // Dourado
        case "USD":
        case "BRL":
          return "text-green-500 dark:text-green-400"; // Verde
        default:
          return "text-foreground";
      }
    };
    
    return (
      <div className="flex flex-col space-y-1">
        <div className="flex justify-between items-center">
          <Label className="text-sm font-medium flex items-center gap-1">
            {icon}
            <span>{label}</span>
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7" 
                  onClick={() => copyToClipboard(value, unit)}
                >
                  {isCopied ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isCopied ? "Copiado!" : "Copiar valor"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div 
          className={cn(
            "p-2 rounded border text-lg font-mono cursor-pointer",
            "bg-gray-950/70 dark:bg-black/60 border-purple-700/40", // Fundo mais escuro (preto/cinza escuro) e borda roxa ajustada
            "hover:bg-purple-700/20 dark:hover:bg-purple-600/20 hover:border-purple-500/70 transition-colors group" 
          )}
          onClick={() => copyToClipboard(value, unit)}
        >
          <span className={cn(valueColorClass(), "group-hover:text-purple-400 dark:group-hover:text-purple-300 transition-colors")}>{formattedValue}</span>
        </div>
      </div>
    );
  };

  // Converter time since para string "há X minutos"
  const getTimeAgo = (date: Date): string => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    
    if (diffMin < 1) return "agora mesmo"
    if (diffMin === 1) return "há 1 minuto"
    return `há ${diffMin} minutos`
  }

  // Novo efeito para detectar mudanças de tab via searchParams
  // e forçar uma re-renderização do conteúdo
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    console.log("Tab param changed:", tabParam)
    
    if (tabParam && (tabParam === 'chart' || tabParam === 'calculator' || tabParam === 'converter')) {
      // Forçar re-renderização quando a aba mudar
      setForceRender(prev => prev + 1)
    }
  }, [searchParams])

  // Efeito para limpar o estado "copiado" após um tempo (NÃO remover este)
  useEffect(() => {
    let copyTimeoutId: NodeJS.Timeout | null = null;
    if (Object.values(copiedValues).some(v => v)) {
      copyTimeoutId = setTimeout(() => {
        setCopiedValues({});
      }, 2000); // Limpar após 2 segundos
    }
    return () => {
      if (copyTimeoutId) clearTimeout(copyTimeoutId);
    };
  }, [copiedValues]);

  if (loading && !isInitialized) {
    // Mostrar um loader simples enquanto carrega inicialmente
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
        {/* Container para Tabs com efeito Sticky */}
        <div className="sticky top-16 z-40 pt-2 pb-1 bg-background/80 dark:bg-black/70 backdrop-blur-md -mx-2 sm:-mx-4 md:-mx-6 lg:-mx-8 px-2 sm:px-4 md:px-6 lg:px-8 mb-3 border-b border-purple-700/30 shadow-sm">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3 gap-2 bg-transparent p-0 h-auto">
              <TabsTrigger 
                value="converter"
                className={cn(
                  "py-2.5 text-sm font-medium transition-all duration-200 ease-in-out rounded-md",
                  "border border-transparent text-gray-400 dark:text-gray-500",
                  "hover:text-purple-300 hover:border-purple-700/30 hover:bg-purple-900/40",
                  "focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-offset-black",
                  "data-[state=active]:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-800 data-[state=active]:to-purple-900 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-900/40 data-[state=active]:border-purple-700/50",
                  activeTab === "converter" && "data-[state=active]:animate-pulse"
                )}
              >
                <ArrowRightLeft className={cn(
                  "mr-1.5 h-4 w-4",
                  activeTab === "converter" && "data-[state=active]:animate-pulse"
                )} />
                <span className={cn(
                  activeTab === "converter" && "data-[state=active]:animate-pulse"
                )}>Conversor</span>
              </TabsTrigger>
              <TabsTrigger 
                value="chart"
                className={cn(
                  "py-2.5 text-sm font-medium transition-all duration-200 ease-in-out rounded-md",
                  "border border-transparent text-gray-400 dark:text-gray-500",
                  "hover:text-purple-300 hover:border-purple-700/30 hover:bg-purple-900/40",
                  "focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-offset-black",
                  "data-[state=active]:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-800 data-[state=active]:to-purple-900 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-900/40 data-[state=active]:border-purple-700/50",
                  activeTab === "chart" && "data-[state=active]:animate-pulse"
                )}
              >
                <TrendingUp className={cn(
                  "mr-1.5 h-4 w-4",
                  activeTab === "chart" && "data-[state=active]:animate-pulse"
                )} />
                <span className={cn(
                  activeTab === "chart" && "data-[state=active]:animate-pulse"
                )}>Gráficos</span>
              </TabsTrigger>
              <TabsTrigger 
                value="calculator" 
                className={cn(
                  "py-2.5 text-sm font-medium transition-all duration-200 ease-in-out rounded-md",
                  "border border-transparent text-gray-400 dark:text-gray-500",
                  "hover:text-purple-300 hover:border-purple-700/30 hover:bg-purple-900/40",
                  "focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-offset-black",
                  "data-[state=active]:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-800 data-[state=active]:to-purple-900 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-900/40 data-[state=active]:border-purple-700/50",
                  activeTab === "calculator" && "data-[state=active]:animate-pulse"
                )}
              >
                <Calculator className={cn(
                  "mr-1.5 h-4 w-4",
                  activeTab === "calculator" && "data-[state=active]:animate-pulse"
                )} />
                <span className={cn(
                  activeTab === "calculator" && "data-[state=active]:animate-pulse"
                )}>Calculadora</span>
              </TabsTrigger>
            </TabsList>

            {/* Conteúdo das Abas com PageTransition restaurado */}
            <div className="mt-4">
              <PageTransition>
                <TabsContent value="converter">
                  <Card className="bg-black/30 border border-purple-700/40 shadow-xl shadow-purple-900/10 rounded-lg">
                    <CardHeader className="flex-shrink-0">
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="mb-1.5">Conversor Bitcoin</CardTitle>
                          <CardDescription className="text-purple-500/90 dark:text-purple-400/80">
                            Converta entre BTC, Satoshis, Dólares e Reais
                          </CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "bg-background/30 dark:bg-black/40 border-purple-600/70 hover:bg-purple-700/20 hover:border-purple-500/90 transition-all",
                            "p-2 sm:px-3 sm:py-1.5 sm:gap-1",
                            loading && "text-purple-300 border-purple-500/90 bg-purple-700/20"
                          )}
                          onClick={handleRefresh}
                          disabled={loading}
                          aria-label="Atualizar Cotações"
                        >
                          {loading ? (
                            <RefreshCw className="h-4 w-4 animate-spin text-purple-300" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          <span className={cn("hidden sm:inline-block", loading && "text-purple-300")}>Atualizar</span>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-grow overflow-y-auto pt-4 pb-6 px-6">
                      {apiError && (
                        <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 p-3 rounded-md border border-amber-200 dark:border-amber-950 flex items-start">
                          <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium">Usando dados em cache</p>
                            <p className="text-sm">
                              Não foi possível obter cotações em tempo real. Usando dados armazenados localmente.
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="amount">Valor para conversão</Label>
                          <Input
                            id="amount"
                            type="text"
                            inputMode="decimal"
                            placeholder="Digite um valor..."
                            value={amount}
                            onChange={handleAmountChange}
                            className="text-lg bg-background/30 dark:bg-black/40 border-purple-400/50 focus:border-purple-500 focus:ring-purple-500/50 hover:border-purple-500/70 transition-colors duration-200"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Unidade de origem</Label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full h-auto flex flex-col items-center justify-center rounded-lg transition-all duration-300 py-3 border-2",
                                selectedUnit === "BTC"
                                  ? "border-purple-600 dark:border-purple-500 text-purple-300 dark:text-purple-200 bg-purple-900/20"
                                  : "bg-background/30 dark:bg-black/40 border-gray-700/50 dark:border-gray-600/40 text-muted-foreground hover:bg-purple-900/20 hover:border-purple-700/30 hover:text-purple-300"
                              )}
                              onClick={() => handleUnitChange("BTC")}
                            >
                              <Bitcoin className="h-5 w-5 mb-1" /> 
                              <span className="text-xs text-center">Bitcoin</span>
                            </Button>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full h-auto flex flex-col items-center justify-center rounded-lg transition-all duration-300 py-3 border-2",
                                selectedUnit === "SATS"
                                  ? "border-purple-600 dark:border-purple-500 text-purple-300 dark:text-purple-200 bg-purple-900/20"
                                  : "bg-background/30 dark:bg-black/40 border-gray-700/50 dark:border-gray-600/40 text-muted-foreground hover:bg-purple-900/20 hover:border-purple-700/30 hover:text-purple-300"
                              )}
                              onClick={() => handleUnitChange("SATS")}
                            >
                              <Bitcoin className="h-5 w-5 mb-1" /> 
                              <span className="text-xs text-center">Satoshis</span>
                            </Button>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full h-auto flex flex-col items-center justify-center rounded-lg transition-all duration-300 py-3 border-2",
                                selectedUnit === "USD"
                                  ? "border-purple-600 dark:border-purple-500 text-purple-300 dark:text-purple-200 bg-purple-900/20"
                                  : "bg-background/30 dark:bg-black/40 border-gray-700/50 dark:border-gray-600/40 text-muted-foreground hover:bg-purple-900/20 hover:border-purple-700/30 hover:text-purple-300"
                              )}
                              onClick={() => handleUnitChange("USD")}
                            >
                              <DollarSign className="h-5 w-5 mb-1" /> 
                              <span className="text-xs text-center">Dólar (USD)</span>
                            </Button>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full h-auto flex flex-col items-center justify-center rounded-lg transition-all duration-300 py-3 border-2",
                                selectedUnit === "BRL"
                                  ? "border-purple-600 dark:border-purple-500 text-purple-300 dark:text-purple-200 bg-purple-900/20"
                                  : "bg-background/30 dark:bg-black/40 border-gray-700/50 dark:border-gray-600/40 text-muted-foreground hover:bg-purple-900/20 hover:border-purple-700/30 hover:text-purple-300"
                              )}
                              onClick={() => handleUnitChange("BRL")}
                            >
                              <DollarSign className="h-5 w-5 mb-1" /> 
                              <span className="text-xs text-center">Real (BRL)</span>
                            </Button>
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                          <h3 className="text-lg font-medium mb-4">Valores convertidos</h3>
                          
                          {loading ? (
                            <div className="space-y-4">
                              <Skeleton className="h-10 w-full" />
                              <Skeleton className="h-10 w-full" />
                              <Skeleton className="h-10 w-full" />
                              <Skeleton className="h-10 w-full" />
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <ValueDisplay 
                                value={convertedValues.btc} 
                                unit="BTC"
                                label="Bitcoin (BTC)"
                                icon={<Bitcoin className="h-4 w-4" />}
                              />
                              <ValueDisplay 
                                value={convertedValues.sats} 
                                unit="SATS"
                                label="Satoshis (SATS)"
                                icon={<Bitcoin className="h-4 w-4" />}
                              />
                              <ValueDisplay 
                                value={convertedValues.usd} 
                                unit="USD"
                                label="Dólar Americano (USD)"
                                icon={<DollarSign className="h-4 w-4" />}
                              />
                              <ValueDisplay 
                                value={convertedValues.brl} 
                                unit="BRL"
                                label="Real Brasileiro (BRL)"
                                icon={<DollarSign className="h-4 w-4" />}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="text-sm text-muted-foreground flex flex-col md:flex-row justify-between md:items-center gap-2 md:gap-4 pt-4 flex-shrink-0">
                      <div className="flex items-center text-purple-500 dark:text-purple-400 self-start md:self-center">
                        <Calendar className="h-4 w-4 mr-1.5 flex-shrink-0" />
                        <span>
                          {rates ? (
                            `Cotações atualizadas ${getTimeAgo(rates.lastUpdated)}`
                          ) : (
                            "Carregando cotações..."
                          )}
                        </span>
                      </div>
                      
                      <div className="flex flex-col items-start md:items-end gap-1 self-start md:self-center">
                        {rates ? (
                          <>
                            <div>
                              1 BTC = <span className="font-semibold text-amber-500 dark:text-amber-400">${rates.BTC_USD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div>
                              1 USD = <span className="font-semibold text-green-500 dark:text-green-400">R$ {rates.BRL_USD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          </>
                        ) : (
                          <span>Calculando cotações...</span>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                </TabsContent>
                
                <TabsContent value="calculator">
                  {appData && rates ? (
                    <Suspense fallback={<div className="text-center py-8">Carregando calculadora...</div>}>
                      <Card className="bg-black/30 shadow-xl shadow-purple-900/10 rounded-lg">
                        <CardHeader>
                          <CardTitle className="text-lg mb-1.5">Calculadora de Lucros</CardTitle>
                          <CardDescription className="text-purple-500/90 dark:text-purple-400/80">
                            Calcule seus lucros e perdas de operações e investimentos.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4 md:pt-6">
                          <MultiReportCalculator
                            btcToUsd={rates.BTC_USD} 
                            brlToUsd={rates.BRL_USD} 
                            appData={appData}
                          />
                        </CardContent>
                      </Card>
                    </Suspense>
                  ) : (
                    <div className="flex items-center justify-center min-h-[300px]">
                      <div className="animate-pulse h-10 w-10 rounded-full bg-purple-500/20"></div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="chart">
                  <Suspense fallback={<div className="text-center py-8">Carregando gráfico...</div>}>
                    <Card className="bg-black/30 border border-purple-700/40 shadow-xl shadow-purple-900/10 rounded-lg">
                      <HistoricalRatesChart />
                    </Card>
                  </Suspense>
                </TabsContent>
              </PageTransition>
            </div>
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  )
}
