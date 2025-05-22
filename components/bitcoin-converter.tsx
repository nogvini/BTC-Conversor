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

interface ConverterRatesData {
  BTC_USD: number;          // Preço do BTC em USD
  USD_BRL: number;          // Taxa de câmbio: 1 USD = X BRL
  lastUpdated: Date;        // Data da última atualização
  isUsingServerCache: boolean; // Se os dados vieram do cache do servidor (KV)
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
  const [rates, setRates] = useState<ConverterRatesData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const [appData, setAppData] = useState<AppData | null>(null)
  const [activeTab, setActiveTab] = useActiveTab()
  const isUpdatingRef = useRef<boolean>(false)
  const lastUpdateTimeRef = useRef<number>(0)
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const [copiedValues, setCopiedValues] = useState<{[key in CurrencyUnit]?: boolean}>({})
  const [forceRender, setForceRender] = useState(0)
  const searchParams = useSearchParams()
  const router = useRouter()
  const isMobile = useIsMobile()

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'converter' | 'chart' | 'calculator')
    router.push(`/?tab=${value}`, { scroll: false })
  }
  
  const fetchData = useCallback(async (isTriggeredByUser: boolean = false) => {
    if (!isTriggeredByUser) {
      setLoading(true);
    }
    setApiError(null);

    try {
      const data = await fetchAllAppData();
      setAppData(data); // Armazena o AppData completo
      
      // Mapeia para o estado local 'rates' que o conversor usa
      const newConverterRates: ConverterRatesData = {
        BTC_USD: data.currentPrice.usd,
        USD_BRL: data.currentPrice.usdToBrlExchangeRate, // Usar a taxa correta
        lastUpdated: new Date(data.currentPrice.timestamp),
        isUsingServerCache: data.currentPrice.isUsingCache ?? true,
      };
      setRates(newConverterRates);

      if (newConverterRates.isUsingServerCache && isTriggeredByUser) {
        toast({
          title: "Cotações do Servidor",
          description: "Exibindo cotações mais recentes do cache do servidor.",
        });
      } else if (isTriggeredByUser) {
        toast({
          title: "Cotações Atualizadas",
          description: `Taxas atualizadas ao vivo: BTC = $${newConverterRates.BTC_USD.toLocaleString()}`,
        });
      }
      lastUpdateTimeRef.current = Date.now();

    } catch (error: any) {
      console.error("Erro ao buscar dados no BitcoinConverter:", error);
      setApiError(error.message || "Falha ao carregar dados. Verifique sua conexão.");
      // Não mostrar toast de erro aqui se a atualização em segundo plano falhar silenciosamente
      // Apenas se for uma ação do usuário ou a carga inicial.
      if (isTriggeredByUser || !rates) { // Se for ação do usuário ou não houver taxas ainda
        toast({
          title: "Erro de Conexão",
          description: error.message || "Não foi possível conectar à API. Tentando usar dados anteriores se disponíveis.",
          variant: "destructive",
        });
      }
    } finally {
      if (!isTriggeredByUser || !rates) {
         setLoading(false);
      }
      isUpdatingRef.current = false;
    }
  }, [rates]); // Adicionado rates à dependência para permitir que o toast de erro seja mostrado se não houver taxas

  useEffect(() => {
    try {
      const savedAmount = localStorage.getItem("btcConverter_lastAmount") || "";
      const savedUnit = localStorage.getItem("btcConverter_lastUnit");
      if (savedAmount) setAmount(savedAmount);
      if (savedUnit && ["BTC", "SATS", "USD", "BRL"].includes(savedUnit)) {
        setSelectedUnit(savedUnit as CurrencyUnit);
      }
    } catch (error) {
      console.warn("Não foi possível acessar o localStorage:", error);
    }
    setIsInitialized(true);
  }, []);
  
  useEffect(() => {
    if (!isInitialized) return;
    try {
      if (amount) localStorage.setItem("btcConverter_lastAmount", amount);
      localStorage.setItem("btcConverter_lastUnit", selectedUnit);
    } catch (error) {
      console.warn("Não foi possível salvar no localStorage:", error);
    }
  }, [amount, selectedUnit, isInitialized]);

  // Efeito para buscar dados na montagem e configurar atualização periódica
  useEffect(() => {
    fetchData(false); // Carga inicial
    const intervalId = setInterval(() => {
      console.log("Fetching updated rates from server (background task)...");
      fetchData(false); // Passar false para não mostrar loading em atualizações de background
    }, 5 * 60 * 1000); // A cada 5 minutos

    return () => clearInterval(intervalId);
  }, [fetchData]); // fetchData é memoizado com useCallback

  const convertedValues = useMemo(() => {
    if (!rates || !amount) {
      return { btc: 0, sats: 0, usd: 0, brl: 0 };
    }
    let processedAmountString = amount;
    if (selectedUnit === "SATS") {
      processedAmountString = amount.replace(/[.,]/g, '');
    }
    const numAmount = parseFloat(processedAmountString);
    if (isNaN(numAmount)) {
      return { btc: 0, sats: 0, usd: 0, brl: 0 };
    }

    let btc = 0, sats = 0, usd = 0, brl = 0;

    switch (selectedUnit) {
      case "BTC":
        btc = numAmount;
        sats = btc * 100000000;
        usd = btc * rates.BTC_USD;
        brl = usd * rates.USD_BRL; // Alterado para USD_BRL
        break;
      case "SATS":
        sats = numAmount;
        btc = sats / 100000000;
        usd = btc * rates.BTC_USD;
        brl = usd * rates.USD_BRL; // Alterado para USD_BRL
        break;
      case "USD":
        usd = numAmount;
        btc = usd / rates.BTC_USD;
        sats = btc * 100000000;
        brl = usd * rates.USD_BRL; // Alterado para USD_BRL
        break;
      case "BRL":
        brl = numAmount;
        usd = brl / rates.USD_BRL; // Alterado para USD_BRL
        btc = usd / rates.BTC_USD;
        sats = btc * 100000000;
        break;
    }
    return { btc, sats, usd, brl };
  }, [rates, amount, selectedUnit]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAmount = e.target.value;
    if (newAmount === "" || /^[0-9]*\.?[0-9]*$/.test(newAmount)) {
      setAmount(newAmount);
    }
  };

  const handleUnitChange = (unit: CurrencyUnit) => {
    setSelectedUnit(unit);
  };

  const handleRefresh = () => {
    const currentTime = Date.now();
    if (isUpdatingRef.current && (currentTime - lastUpdateTimeRef.current < 5000)) {
        toast({
            title: "Aguarde",
            description: "Atualização já em progresso ou muito recente.",
            variant: "warning",
        });
        return;
    }
    isUpdatingRef.current = true;
    lastUpdateTimeRef.current = currentTime; // Atualiza o tempo da última tentativa de refresh manual
    toast({ title: "Atualizando Cotações...", description: "Buscando os dados mais recentes do servidor." });
    fetchData(true); // true indica que foi uma ação do usuário
  };

  const copyToClipboard = (value: number, unit: CurrencyUnit) => {
    const formattedValue = (() => {
      switch (unit) {
        case "BTC": return formatBtc(value);
        case "SATS": return Math.round(value).toLocaleString();
        case "USD": return formatCurrency(value, "$");
        case "BRL": return formatCurrency(value, "R$");
        default: return value.toString();
      }
    })();
    const cleanValue = formattedValue.replace(/[^0-9.,]/g, '');
    navigator.clipboard.writeText(cleanValue).then(() => {
      setCopiedValues(prev => ({ ...prev, [unit]: true }));
      toast({
        title: "Valor copiado",
        description: `${formattedValue} copiado para a área de transferência.`,
        variant: "success",
      });
      setTimeout(() => {
        setCopiedValues(prev => ({ ...prev, [unit]: false }));
      }, 2000);
    }).catch(err => {
      console.error("Falha ao copiar:", err);
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o valor.",
        variant: "destructive",
      });
    });
  };

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
        case "BTC": case "SATS": return "text-amber-400 dark:text-amber-300";
        case "USD": case "BRL": return "text-green-500 dark:text-green-400";
        default: return "text-foreground";
      }
    };
    return (
      <div className="flex flex-col space-y-1">
        <div className="flex justify-between items-center">
          <Label className="text-sm font-medium flex items-center gap-1">{icon}<span>{label}</span></Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(value, unit)}>
                  {isCopied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>{isCopied ? "Copiado!" : "Copiar valor"}</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div 
          className={cn(
            "p-2 rounded border text-lg font-mono cursor-pointer",
            "bg-gray-950/70 dark:bg-black/60 border-purple-700/40",
            "hover:bg-purple-700/20 dark:hover:bg-purple-600/20 hover:border-purple-500/70 transition-colors group"
          )}
          onClick={() => copyToClipboard(value, unit)}
        >
          <span className={cn(valueColorClass(), "group-hover:text-purple-400 dark:group-hover:text-purple-300 transition-colors")}>{formattedValue}</span>
        </div>
      </div>
    );
  };

  const getTimeAgo = (date: Date): string => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return "data indisponível";
    }
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 1) return "agora mesmo";
    if (diffMin === 1) return "há 1 minuto";
    return `há ${diffMin} minutos`;
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && (tabParam === 'chart' || tabParam === 'calculator' || tabParam === 'converter')) {
      setForceRender(prev => prev + 1);
    }
  }, [searchParams]);

  useEffect(() => {
    let copyTimeoutId: NodeJS.Timeout | null = null;
    if (Object.values(copiedValues).some(v => v)) {
      copyTimeoutId = setTimeout(() => setCopiedValues({}), 2000);
    }
    return () => { if (copyTimeoutId) clearTimeout(copyTimeoutId); };
  }, [copiedValues]);

  if (loading && !rates) { // Mostrar loading apenas se não houver taxas para exibir (carga inicial)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
        <div className="sticky top-16 z-40 pt-2 pb-1 bg-background/80 dark:bg-black/70 backdrop-blur-md -mx-2 sm:-mx-4 md:-mx-6 lg:-mx-8 px-2 sm:px-4 md:px-6 lg:px-8 mb-3 border-b border-purple-700/30 shadow-sm">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3 gap-2 bg-transparent p-0 h-auto">
              <TabsTrigger value="converter" className={cn("py-2.5 text-sm font-medium transition-all duration-200 ease-in-out rounded-md", "border border-transparent text-gray-400 dark:text-gray-500", "hover:text-purple-300 hover:border-purple-700/30 hover:bg-purple-900/40", "focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-offset-black", "data-[state=active]:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-800 data-[state=active]:to-purple-900 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-900/40 data-[state=active]:border-purple-700/50", activeTab === "converter" && "data-[state=active]:animate-pulse")}><ArrowRightLeft className={cn("mr-1.5 h-4 w-4", activeTab === "converter" && "data-[state=active]:animate-pulse")} /><span className={cn(activeTab === "converter" && "data-[state=active]:animate-pulse")}>Conversor</span></TabsTrigger>
              <TabsTrigger value="chart" className={cn("py-2.5 text-sm font-medium transition-all duration-200 ease-in-out rounded-md", "border border-transparent text-gray-400 dark:text-gray-500", "hover:text-purple-300 hover:border-purple-700/30 hover:bg-purple-900/40", "focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-offset-black", "data-[state=active]:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-800 data-[state=active]:to-purple-900 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-900/40 data-[state=active]:border-purple-700/50", activeTab === "chart" && "data-[state=active]:animate-pulse")}><TrendingUp className={cn("mr-1.5 h-4 w-4", activeTab === "chart" && "data-[state=active]:animate-pulse")} /><span className={cn(activeTab === "chart" && "data-[state=active]:animate-pulse")}>Gráficos</span></TabsTrigger>
              <TabsTrigger value="calculator"  className={cn("py-2.5 text-sm font-medium transition-all duration-200 ease-in-out rounded-md", "border border-transparent text-gray-400 dark:text-gray-500", "hover:text-purple-300 hover:border-purple-700/30 hover:bg-purple-900/40", "focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-offset-black", "data-[state=active]:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-800 data-[state=active]:to-purple-900 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-900/40 data-[state=active]:border-purple-700/50", activeTab === "calculator" && "data-[state=active]:animate-pulse")}><Calculator className={cn("mr-1.5 h-4 w-4", activeTab === "calculator" && "data-[state=active]:animate-pulse")} /><span className={cn(activeTab === "calculator" && "data-[state=active]:animate-pulse")}>Calculadora</span></TabsTrigger>
            </TabsList>
            <div className="mt-4">
              <PageTransition>
                <TabsContent value="converter">
                  <Card className="bg-black/30 border border-purple-700/40 shadow-xl shadow-purple-900/10 rounded-lg">
                    <CardHeader className="flex-shrink-0">
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="mb-1.5">Conversor Bitcoin</CardTitle>
                          <CardDescription className="text-purple-500/90 dark:text-purple-400/80">Converta entre BTC, Satoshis, Dólares e Reais</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" className={cn("bg-background/30 dark:bg-black/40 border-purple-600/70 hover:bg-purple-700/20 hover:border-purple-500/90 transition-all", "p-2 sm:px-3 sm:py-1.5 sm:gap-1", (loading && isUpdatingRef.current) && "text-purple-300 border-purple-500/90 bg-purple-700/20")} onClick={handleRefresh} disabled={(loading && isUpdatingRef.current)} aria-label="Atualizar Cotações">
                          {(loading && isUpdatingRef.current) ? <RefreshCw className="h-4 w-4 animate-spin text-purple-300" /> : <RefreshCw className="h-4 w-4" />}
                          <span className={cn("hidden sm:inline-block", (loading && isUpdatingRef.current) && "text-purple-300")}>Atualizar</span>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-grow overflow-y-auto pt-4 pb-6 px-6">
                      {apiError && (
                        <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 p-3 rounded-md border border-amber-200 dark:border-amber-950 flex items-start">
                          <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium">Falha na Comunicação</p>
                            <p className="text-sm">{apiError}</p>
                          </div>
                        </div>
                      )}
                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="amount">Valor para conversão</Label>
                          <Input id="amount" type="text" inputMode="decimal" placeholder="Digite um valor..." value={amount} onChange={handleAmountChange} className="text-lg bg-background/30 dark:bg-black/40 border-purple-400/50 focus:border-purple-500 focus:ring-purple-500/50 hover:border-purple-500/70 transition-colors duration-200" />
                        </div>
                        <div className="space-y-2">
                          <Label>Unidade de origem</Label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <Button variant="outline" className={cn("w-full h-auto flex flex-col items-center justify-center rounded-lg transition-all duration-300 py-3 border-2", selectedUnit === "BTC" ? "border-purple-600 dark:border-purple-500 text-purple-300 dark:text-purple-200 bg-purple-900/20" : "bg-background/30 dark:bg-black/40 border-gray-700/50 dark:border-gray-600/40 text-muted-foreground hover:bg-purple-900/20 hover:border-purple-700/30 hover:text-purple-300")} onClick={() => handleUnitChange("BTC")}><Bitcoin className="h-5 w-5 mb-1" /> <span className="text-xs text-center">Bitcoin</span></Button>
                            <Button variant="outline" className={cn("w-full h-auto flex flex-col items-center justify-center rounded-lg transition-all duration-300 py-3 border-2", selectedUnit === "SATS" ? "border-purple-600 dark:border-purple-500 text-purple-300 dark:text-purple-200 bg-purple-900/20" : "bg-background/30 dark:bg-black/40 border-gray-700/50 dark:border-gray-600/40 text-muted-foreground hover:bg-purple-900/20 hover:border-purple-700/30 hover:text-purple-300")} onClick={() => handleUnitChange("SATS")}><Bitcoin className="h-5 w-5 mb-1" /> <span className="text-xs text-center">Satoshis</span></Button>
                            <Button variant="outline" className={cn("w-full h-auto flex flex-col items-center justify-center rounded-lg transition-all duration-300 py-3 border-2", selectedUnit === "USD" ? "border-purple-600 dark:border-purple-500 text-purple-300 dark:text-purple-200 bg-purple-900/20" : "bg-background/30 dark:bg-black/40 border-gray-700/50 dark:border-gray-600/40 text-muted-foreground hover:bg-purple-900/20 hover:border-purple-700/30 hover:text-purple-300")} onClick={() => handleUnitChange("USD")}><DollarSign className="h-5 w-5 mb-1" /> <span className="text-xs text-center">Dólar (USD)</span></Button>
                            <Button variant="outline" className={cn("w-full h-auto flex flex-col items-center justify-center rounded-lg transition-all duration-300 py-3 border-2", selectedUnit === "BRL" ? "border-purple-600 dark:border-purple-500 text-purple-300 dark:text-purple-200 bg-purple-900/20" : "bg-background/30 dark:bg-black/40 border-gray-700/50 dark:border-gray-600/40 text-muted-foreground hover:bg-purple-900/20 hover:border-purple-700/30 hover:text-purple-300")} onClick={() => handleUnitChange("BRL")}><DollarSign className="h-5 w-5 mb-1" /> <span className="text-xs text-center">Real (BRL)</span></Button>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                          <h3 className="text-lg font-medium mb-4">Valores convertidos</h3>
                          {(loading && !rates) ? (
                            <div className="space-y-4">
                              <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" />
                            </div>
                          ) : rates ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <ValueDisplay value={convertedValues.btc} unit="BTC" label="Bitcoin (BTC)" icon={<Bitcoin className="h-4 w-4" />} />
                              <ValueDisplay value={convertedValues.sats} unit="SATS" label="Satoshis (SATS)" icon={<Bitcoin className="h-4 w-4" />} />
                              <ValueDisplay value={convertedValues.usd} unit="USD" label="Dólar Americano (USD)" icon={<DollarSign className="h-4 w-4" />} />
                              <ValueDisplay value={convertedValues.brl} unit="BRL" label="Real Brasileiro (BRL)" icon={<DollarSign className="h-4 w-4" />} />
                            </div>
                          ) : null }
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
                            loading ? "Carregando cotações..." : "Cotações indisponíveis"
                          )}
                        </span>
                      </div>
                      <div className="flex flex-col items-start md:items-end gap-1 self-start md:self-center">
                        {rates ? (
                          <>
                            <div>1 BTC = <span className="font-semibold text-amber-500 dark:text-amber-400">${rates.BTC_USD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                            <div>1 USD = <span className="font-semibold text-green-500 dark:text-green-400">R$ {rates.USD_BRL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                          </>
                        ) : (
                          <span></span> // Não mostrar nada se as taxas não estiverem carregadas
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                </TabsContent>
                <TabsContent value="calculator">
                  {appData && rates ? (
                    <Suspense fallback={<div className="text-center py-8">Carregando calculadora...</div>}>
                      <Card className="bg-black/30 border border-purple-700/40 shadow-xl shadow-purple-900/10 rounded-lg">
                        <CardHeader>
                          <CardTitle className="mb-1.5">Calculadora de Lucros</CardTitle>
                          <CardDescription className="text-purple-500/90 dark:text-purple-400/80">Calcule seus lucros e perdas de operações e investimentos.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4 md:pt-6">
                          <MultiReportCalculator btcToUsd={rates.BTC_USD} brlToUsd={rates.USD_BRL} appData={appData} />
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
