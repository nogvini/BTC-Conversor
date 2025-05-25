"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { useReports } from "@/hooks/use-reports";
import { useIsMobile } from "@/hooks/use-mobile";
import { getCurrentBitcoinPrice } from "@/lib/client-api";
import { 
  TrendingUp, 
  Download, 
  Upload, 
  Wallet, 
  Zap, 
  FileSpreadsheet, 
  ChevronLeft,
  Calendar as CalendarIcon,
  BarChart2,
  PieChart as PieChartIcon,
  Filter,
  Users,
  TrendingDown,
  Minus,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts";
import { format as formatDateFn, startOfMonth, endOfMonth, subMonths, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";

// Imports dos módulos refatorados
import type { ProfitCalculatorProps } from "./types/profit-calculator-types";
import { useProfitCalculatorStates } from "./hooks/use-profit-calculator-states";
import {
  convertToBtc,
  formatCurrency,
  formatDateToUTC,
  isFutureDate,
  calculateOperationalProfitForSummary,
  calculateValuationProfitForSummary,
  calculateAverageBuyPriceForSummary
} from "./utils/profit-calculator-utils";

// Imports para LN Markets
import type { LNMarketsCredentials, LNMarketsImportStats, LNMarketsAPIConfig, LNMarketsMultipleConfig } from "./types/ln-markets-types";
import { retrieveLNMarketsCredentials, retrieveLNMarketsMultipleConfigs, getLNMarketsConfig } from "@/lib/encryption";
import { 
  convertTradeToProfit, 
  convertDepositToInvestment, 
  convertWithdrawalToRecord 
} from "@/lib/ln-markets-converters";
import { 
  fetchLNMarketsTrades,
  fetchLNMarketsDeposits,
  fetchLNMarketsWithdrawals
} from "@/lib/ln-markets-client";
import { useAuth } from "@/hooks/use-auth";

// Imports para o sistema de relatórios integrado
import { ReportManager } from "@/components/report-manager";
import { ReportsComparison } from "@/components/reports-comparison";
import { DisplayCurrency, CurrencyUnit, Investment, ProfitRecord } from "@/lib/calculator-types";
import AnimatedCounter from "./animated-counter";

// NOVOS TIPOS PARA O SISTEMA MELHORADO
interface ImportProgress {
  current: number;
  total: number;
  percentage: number;
  status: 'idle' | 'loading' | 'complete' | 'error';
  message?: string;
}

interface ImportProgressState {
  trades: ImportProgress;
  deposits: ImportProgress;
  withdrawals: ImportProgress;
}

type HistoryFilterPeriod = "1m" | "3m" | "6m" | "1y" | "all" | "custom";
type HistoryViewMode = "active" | "all";

interface ChartDataPoint {
  date: string;
  investments: number;
  profits: number;
  balance: number;
  month: string;
}

// COMPONENTE AUXILIAR PARA PROGRESSO DE IMPORTAÇÃO
function ImportProgressIndicator({ progress, type }: { progress: ImportProgress; type: string }) {
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (progress.status === 'loading' && !startTime) {
      setStartTime(Date.now());
    } else if (progress.status !== 'loading') {
      setStartTime(null);
      setEstimatedTimeRemaining(null);
    }
  }, [progress.status, startTime]);

  useEffect(() => {
    if (progress.status === 'loading' && startTime && progress.current > 0) {
      const elapsed = Date.now() - startTime;
      const rate = progress.current / elapsed;
      const remaining = (progress.total - progress.current) / rate;
      setEstimatedTimeRemaining(remaining);
    }
  }, [progress.current, progress.total, startTime, progress.status]);

  const getStatusColor = () => {
    switch (progress.status) {
      case 'loading': return 'bg-gradient-to-r from-blue-500 to-cyan-500';
      case 'complete': return 'bg-gradient-to-r from-green-500 to-emerald-500';
      case 'error': return 'bg-gradient-to-r from-red-500 to-rose-500';
      default: return 'bg-gradient-to-r from-gray-500 to-slate-500';
    }
  };

  const getStatusIcon = () => {
    switch (type) {
      case 'trades': return <TrendingUp className={cn("h-4 w-4 transition-all duration-300", 
        progress.status === 'loading' ? "animate-pulse text-blue-400" : 
        progress.status === 'complete' ? "text-green-400" : "text-gray-400")} />;
      case 'deposits': return <Download className={cn("h-4 w-4 transition-all duration-300", 
        progress.status === 'loading' ? "animate-bounce text-blue-400" : 
        progress.status === 'complete' ? "text-green-400" : "text-gray-400")} />;
      case 'withdrawals': return <Upload className={cn("h-4 w-4 transition-all duration-300", 
        progress.status === 'loading' ? "animate-pulse text-blue-400" : 
        progress.status === 'complete' ? "text-green-400" : "text-gray-400")} />;
      default: return null;
    }
  };

  const formatTimeRemaining = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s restantes`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s restantes`;
  };

  return (
    <div className="space-y-3 p-4 bg-black/20 border border-purple-700/30 rounded-lg backdrop-blur-sm transition-all duration-300 hover:bg-black/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <span className="text-sm font-medium text-white">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
          {progress.status === 'loading' && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping" style={{ animationDelay: '0.4s' }}></div>
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400">
            {progress.status === 'loading' ? `${progress.current}/${progress.total}` : ''}
          </div>
          <div className="text-sm font-medium text-white">
            {progress.percentage.toFixed(0)}%
          </div>
        </div>
      </div>
      
      <div className="relative">
        <Progress 
          value={progress.percentage} 
          className="h-3 bg-black/40"
        />
        <div 
          className={cn("absolute top-0 left-0 h-3 rounded-full transition-all duration-500 ease-out", getStatusColor())}
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        {progress.message && (
          <span className="text-gray-400 flex-1">{progress.message}</span>
        )}
        {estimatedTimeRemaining && progress.status === 'loading' && (
          <span className="text-blue-400 font-medium">
            {formatTimeRemaining(estimatedTimeRemaining)}
          </span>
        )}
        {progress.status === 'complete' && (
          <span className="text-green-400 font-medium flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Concluído
          </span>
        )}
        {progress.status === 'error' && (
          <span className="text-red-400 font-medium flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Erro
          </span>
        )}
      </div>
    </div>
  );
}

// COMPONENTE AUXILIAR PARA ESTATÍSTICAS DO HISTÓRICO
function HistoryStatsCard({ title, value, icon, change, valueColor }: {
  title: string;
  value: string;
  icon: React.ReactNode;
  change?: number;
  valueColor?: string;
}) {
  return (
    <div className="p-4 bg-black/20 border border-purple-700/30 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{title}</span>
        {icon}
      </div>
      <div className="flex items-center gap-2">
        <span className={cn("text-lg font-semibold", valueColor || "text-white")}>
          {value}
        </span>
        {change !== undefined && (
          <div className={cn("flex items-center text-xs", 
            change > 0 ? "text-green-400" : change < 0 ? "text-red-400" : "text-gray-400"
          )}>
            {change > 0 ? <ArrowUp className="h-3 w-3" /> : change < 0 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProfitCalculator({ 
  btcToUsd, 
  brlToUsd, 
  appData, 
  activeReportData,
  onInvestmentAdd,
  onProfitAdd,
  onInvestmentDelete,
  onProfitDelete,
  onInvestmentsUpdate,
  onProfitsUpdate
}: ProfitCalculatorProps) {
  // Hook de autenticação
  const { session } = useAuth();
  const { user } = session;

  // NOVO: Estado para modo de comparação (integração do MultiReportCalculator)
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  
  // NOVO: Refs para controle de sincronização (do MultiReportCalculator)
  const lastUpdateRef = useRef<number>(0);
  const lastActiveReportIdRef = useRef<string | null>(null);
  const lastActiveReportDataRef = useRef<string | null>(null);
  const forceUpdateCountRef = useRef<number>(0);
  
  // NOVO: Estado local para forçar re-renders (do MultiReportCalculator)
  const [localForceUpdate, setLocalForceUpdate] = useState(0);

  // Hook de relatórios - com controle de sincronização
  const {
    reports: allReportsFromHook,
    activeReportId: activeReportIdFromHook,
    activeReport: currentActiveReportObjectFromHook,
    isLoaded: reportsDataLoaded,
    addReport,
    selectReport,
    addInvestment,
    addProfitRecord,
    addWithdrawal,
    deleteInvestment,
    deleteProfitRecord,
    deleteWithdrawal,
    updateReportData,
    updateReport,
    importData,
    deleteAllInvestmentsFromReport,
    deleteAllProfitsFromReport,
    deleteAllWithdrawalsFromReport,
  } = useReports();

  // Hook de estados (FIXO - todos os hooks sempre no mesmo local e ordem)
  const states = useProfitCalculatorStates();

  // Estados adicionais para LN Markets
  const [lnMarketsCredentials, setLnMarketsCredentials] = useState<LNMarketsCredentials | null>(null);
  const [isImportingTrades, setIsImportingTrades] = useState(false);
  const [isImportingDeposits, setIsImportingDeposits] = useState(false);
  const [isImportingWithdrawals, setIsImportingWithdrawals] = useState(false);
  const [importStats, setImportStats] = useState<LNMarketsImportStats | null>(null);

  // NOVOS Estados para múltiplas configurações LN Markets
  const [multipleConfigs, setMultipleConfigs] = useState<LNMarketsMultipleConfig | null>(null);
  const [selectedConfigForImport, setSelectedConfigForImport] = useState<string | null>(null);
  const [showConfigSelector, setShowConfigSelector] = useState(false);

  // NOVOS Estados para sistema de progresso de importação
  const [importProgress, setImportProgress] = useState<ImportProgressState>({
    trades: { current: 0, total: 0, percentage: 0, status: 'idle' },
    deposits: { current: 0, total: 0, percentage: 0, status: 'idle' },
    withdrawals: { current: 0, total: 0, percentage: 0, status: 'idle' }
  });

  // NOVOS Estados para aba histórico
  const [historyFilterPeriod, setHistoryFilterPeriod] = useState<HistoryFilterPeriod>("3m");
  const [historyViewMode, setHistoryViewMode] = useState<HistoryViewMode>("active");
  const [historyCustomStartDate, setHistoryCustomStartDate] = useState<Date | undefined>(undefined);
  const [historyCustomEndDate, setHistoryCustomEndDate] = useState<Date | undefined>(undefined);
  const [historyActiveTab, setHistoryActiveTab] = useState<string>("overview");

  // NOVOS Estados para aba gráficos
  const [chartDisplayUnit, setChartDisplayUnit] = useState<"btc" | "usd" | "brl">("btc");
  const [chartType, setChartType] = useState<"line" | "bar" | "area">("area");
  const [chartTimeframe, setChartTimeframe] = useState<"daily" | "monthly">("monthly");
  const [chartVisibleSeries, setChartVisibleSeries] = useState({
    investments: true,
    profits: true,
    balance: true
  });

  // Estados adicionais que não estão no hook customizado
  const [pendingInvestment, setPendingInvestment] = useState<any>(null);
  const [pendingProfit, setPendingProfit] = useState<any>(null);

  // NOVO: Estado de controle de sincronização
  const [syncState, setSyncState] = useState({
    lastUpdate: Date.now(),
    isStale: false,
    forceUpdateCount: 0
  });

  // Refs para controle de sincronização
  const lastReportDataRef = useRef<string | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const internalFileInputRef = useRef<HTMLInputElement>(null);
  const investmentCsvFileInputRef = useRef<HTMLInputElement>(null);
  const backupExcelFileInputRef = useRef<HTMLInputElement>(null);

  const isMobile = useIsMobile();

  // Determinar qual fonte de dados usar (props ou hook)
  const effectiveActiveReportId = activeReportData?.id || activeReportIdFromHook;
  const effectiveActiveReport = activeReportData?.report || currentActiveReportObjectFromHook;

  // NOVO: Effect principal para sincronização de dados
  useEffect(() => {
    if (!effectiveActiveReport || !effectiveActiveReportId) {
      return;
    }

    const reportDataHash = JSON.stringify({
      id: effectiveActiveReportId,
      investments: effectiveActiveReport.investments,
      profits: effectiveActiveReport.profits,
      withdrawals: effectiveActiveReport.withdrawals,
      updatedAt: effectiveActiveReport.updatedAt,
      lastUpdated: effectiveActiveReport.lastUpdated,
      forceUpdateTrigger: activeReportData?.forceUpdateTrigger
    });

    if (lastReportDataRef.current !== reportDataHash) {
      console.log('[ProfitCalculator] Dados do relatório mudaram:', {
        reportId: effectiveActiveReportId,
        reportName: effectiveActiveReport.name,
        investmentsCount: effectiveActiveReport.investments?.length || 0,
        profitsCount: effectiveActiveReport.profits?.length || 0,
        withdrawalsCount: effectiveActiveReport.withdrawals?.length || 0,
        forceUpdateTrigger: activeReportData?.forceUpdateTrigger,
        timestamp: new Date().toISOString()
      });

      lastReportDataRef.current = reportDataHash;
      
      // Atualizar estado de sincronização
      setSyncState(prev => ({
        ...prev,
        lastUpdate: Date.now(),
        isStale: false,
        forceUpdateCount: prev.forceUpdateCount + 1
      }));

      // Limpar timeout anterior se existir
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      // Agendar uma verificação de estagnação
      syncTimeoutRef.current = setTimeout(() => {
        setSyncState(prev => ({ ...prev, isStale: true }));
      }, 5000);
    }
  }, [
    effectiveActiveReportId,
    effectiveActiveReport,
    effectiveActiveReport?.investments,
    effectiveActiveReport?.profits,
    effectiveActiveReport?.withdrawals,
    effectiveActiveReport?.updatedAt,
    effectiveActiveReport?.lastUpdated,
    activeReportData?.forceUpdateTrigger
  ]);

  // Limpeza do timeout ao desmontar
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Effect para verificar tamanho da tela
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkScreenSize = () => {
        states.setUseExportDialog(window.innerWidth < 350);
      };
      
      checkScreenSize();
      window.addEventListener('resize', checkScreenSize);
      return () => window.removeEventListener('resize', checkScreenSize);
    }
  }, []);

  // Effect para carregar credenciais LN Markets
  useEffect(() => {
    if (user?.email) {
      const credentials = retrieveLNMarketsCredentials(user.email);
      setLnMarketsCredentials(credentials);
    }
  }, [user?.email]);

  // NOVO Effect para carregar múltiplas configurações LN Markets
  useEffect(() => {
    if (user?.email) {
      const configs = retrieveLNMarketsMultipleConfigs(user.email);
      setMultipleConfigs(configs);
      
      // Se o relatório já tem uma configuração associada, verificar se ainda existe
      if (currentActiveReportObjectFromHook?.associatedLNMarketsConfigId) {
        const associatedConfig = configs?.configs.find(
          c => c.id === currentActiveReportObjectFromHook.associatedLNMarketsConfigId
        );
        if (associatedConfig) {
          setSelectedConfigForImport(associatedConfig.id);
        } else {
          // Configuração associada não existe mais, usar a padrão se disponível
          setSelectedConfigForImport(configs?.defaultConfigId || null);
        }
      } else {
        // Usar configuração padrão se disponível
        setSelectedConfigForImport(configs?.defaultConfigId || null);
      }
    }
  }, [user?.email, currentActiveReportObjectFromHook?.associatedLNMarketsConfigId]);

  // Effect para atualizar rates
  useEffect(() => {
    if (appData) {
      const newRates = {
        btcToUsd: appData.currentPrice.usd,
        brlToUsd: appData.currentPrice.brl / appData.currentPrice.usd
      };
      states.setCurrentRates(newRates);
      states.setUsingFallbackRates(appData.isUsingCache || !!appData.currentPrice.isUsingCache);
    } else {
      states.setCurrentRates({ btcToUsd, brlToUsd });
      states.setUsingFallbackRates(btcToUsd === 65000 && brlToUsd === 5.2);
    }
  }, [btcToUsd, brlToUsd, appData]);

  // Effect para displayCurrency e inicialização
  useEffect(() => {
    const savedDisplayCurrency = localStorage.getItem("bitcoinDisplayCurrency");
    if (savedDisplayCurrency) {
      try {
        states.setDisplayCurrency(JSON.parse(savedDisplayCurrency));
      } catch (e) {
        console.error("Erro ao analisar moeda de exibição salva:", e);
      }
    }

    if (reportsDataLoaded && allReportsFromHook && allReportsFromHook.length > 0) {
      if (states.selectedReportIdsForHistoryView.length === 0) {
        const initialHistorySelection = activeReportIdFromHook 
          ? [activeReportIdFromHook]
          : (allReportsFromHook.length > 0 ? [allReportsFromHook[0].id] : []);
        states.setSelectedReportIdsForHistoryView(initialHistorySelection);
      } else {
        states.setSelectedReportIdsForHistoryView(prev => 
          prev.filter(id => allReportsFromHook.some(r => r.id === id))
        );
      }
    } else if (reportsDataLoaded && (!allReportsFromHook || allReportsFromHook.length === 0)) {
      states.setSelectedReportIdsForHistoryView([]);
    }
  }, [reportsDataLoaded, allReportsFromHook, activeReportIdFromHook]);

  // Effect para salvar displayCurrency
  useEffect(() => {
    if (reportsDataLoaded) {
      localStorage.setItem("bitcoinDisplayCurrency", JSON.stringify(states.displayCurrency));
    }
  }, [states.displayCurrency, reportsDataLoaded]);

  // Funções auxiliares
  const updateRates = async () => {
    if (appData) {
      return;
    } else {
      states.setLoading(true);
      try {
        const priceData = await getCurrentBitcoinPrice();
        if (priceData) {
          states.setCurrentRates({
            btcToUsd: priceData.usd,
            brlToUsd: priceData.brl / priceData.usd,
          });
          states.setUsingFallbackRates(priceData.isUsingCache);
          
          if (!states.toastDebounce) {
            states.setToastDebounce(true);
            toast({
              title: "Cotação atualizada",
              description: `Bitcoin: ${priceData.usd.toLocaleString()} USD`,
              variant: "default",
            });
            setTimeout(() => states.setToastDebounce(false), 1000);
          }
        }
      } catch (error) {
        console.error("Erro ao atualizar cotação:", error);
        
        if (!states.toastDebounce) {
          states.setToastDebounce(true);
          toast({
            title: "Erro ao atualizar cotação",
            description: "Usando as últimas taxas disponíveis.",
            variant: "destructive",
          });
          setTimeout(() => states.setToastDebounce(false), 1000);
        }
      } finally {
        states.setLoading(false);
      }
    }
  };

  // Funções para importação LN Markets
  const handleImportTrades = async () => {
    console.log('[handleImportTrades] Iniciando importação de trades');
    
    const config = getCurrentImportConfig();
    
    console.log('[handleImportTrades] Configuração obtida:', {
      hasConfig: !!config,
      configName: config?.name,
      hasActiveReport: !!currentActiveReportObjectFromHook,
      reportName: currentActiveReportObjectFromHook?.name
    });
    
    if (!config || !currentActiveReportObjectFromHook || !user?.email) {
      console.log('[handleImportTrades] Configuração, relatório ou usuário ausente');
      toast({
        title: "Configuração necessária",
        description: "Selecione uma configuração LN Markets ativa e certifique-se de ter um relatório ativo.",
        variant: "destructive",
      });
        return;
    }

    // Inicializar progresso
    setImportProgress(prev => ({
      ...prev,
      trades: { current: 0, total: 0, percentage: 0, status: 'loading', message: 'Buscando dados...' }
    }));

    setIsImportingTrades(true);
    try {
      console.log('[handleImportTrades] Fazendo requisição com credenciais:', {
        hasKey: !!config.credentials.key,
        hasSecret: !!config.credentials.secret,
        hasPassphrase: !!config.credentials.passphrase,
        network: config.credentials.network,
        isConfigured: config.credentials.isConfigured
      });
      
      const response = await fetchLNMarketsTrades(user.email, config.id);

      console.log('[handleImportTrades] Resposta recebida:', {
        success: response.success,
        hasData: !!response.data,
        dataLength: response.data?.length,
        error: response.error
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || "Erro ao buscar trades");
      }

      const totalTrades = response.data.length;
      let imported = 0;
      let duplicated = 0;
      let errors = 0;
      let processed = 0;

      // Atualizar progresso inicial
      setImportProgress(prev => ({
        ...prev,
        trades: { 
          current: 0, 
          total: totalTrades, 
          percentage: 0, 
          status: 'loading', 
          message: `Processando ${totalTrades} trades...` 
        }
      }));

      for (const trade of response.data) {
        if (trade.closed && trade.pl !== 0) {
          const profitRecord = convertTradeToProfit(trade);
          const result = addProfitRecord(profitRecord, currentActiveReportObjectFromHook.id, { suppressToast: true });
          
          if (result.status === 'added') {
            imported++;
          } else if (result.status === 'duplicate') {
            duplicated++;
          } else {
            errors++;
          }
        }
        
        processed++;
        const percentage = (processed / totalTrades) * 100;
        
        // Atualizar progresso a cada 10 items ou no final
        if (processed % 10 === 0 || processed === totalTrades) {
          setImportProgress(prev => ({
            ...prev,
            trades: {
              current: processed,
              total: totalTrades,
              percentage,
              status: 'loading',
              message: `Processando... ${imported} importados, ${duplicated} duplicados`
            }
          }));
          
          // Pequeno delay para permitir atualização da UI
          if (processed % 50 === 0) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
      }

      // Progresso completo
      setImportProgress(prev => ({
        ...prev,
        trades: {
          current: totalTrades,
          total: totalTrades,
          percentage: 100,
          status: 'complete',
          message: `Concluído: ${imported} importados, ${duplicated} duplicados, ${errors} erros`
        }
      }));

      setImportStats(prev => ({
        trades: { total: response.data?.length || 0, imported, duplicated, errors },
        deposits: prev?.deposits || { total: 0, imported: 0, duplicated: 0, errors: 0 },
        withdrawals: prev?.withdrawals || { total: 0, imported: 0, duplicated: 0, errors: 0 },
      }));

      toast({
        title: "✅ Trades importados com sucesso!",
        description: (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>{imported} novos trades adicionados</span>
            </div>
            {duplicated > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>{duplicated} trades já existentes ignorados</span>
              </div>
            )}
            <div className="text-xs text-gray-400 mt-2">
              Configuração: "{config.name}"
            </div>
          </div>
        ),
        variant: "default",
        className: "border-green-500/50 bg-green-900/20",
      });
    } catch (error: any) {
      console.error('[handleImportTrades] Erro durante importação:', error);
      
      // Progresso com erro
      setImportProgress(prev => ({
        ...prev,
        trades: {
          ...prev.trades,
          status: 'error',
          message: error.message || 'Erro durante importação'
        }
      }));
      
      toast({
        title: "❌ Erro ao importar trades",
        description: (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span>Falha na importação dos trades</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {error.message || "Erro desconhecido"}
            </div>
          </div>
        ),
        variant: "destructive",
        className: "border-red-500/50 bg-red-900/20",
      });
    } finally {
      setIsImportingTrades(false);
    }
  };

  const handleImportDeposits = async () => {
    console.log('[handleImportDeposits] Iniciando importação de depósitos');
    
    const config = getCurrentImportConfig();
    
    console.log('[handleImportDeposits] Configuração obtida:', {
      hasConfig: !!config,
      configName: config?.name,
      hasActiveReport: !!currentActiveReportObjectFromHook,
      reportName: currentActiveReportObjectFromHook?.name,
      reportId: currentActiveReportObjectFromHook?.id
    });
    
    if (!config || !currentActiveReportObjectFromHook || !user?.email) {
      console.log('[handleImportDeposits] Configuração, relatório ou usuário ausente');
      toast({
        title: "Configuração necessária",
        description: "Selecione uma configuração LN Markets ativa e certifique-se de ter um relatório ativo.",
        variant: "destructive",
      });
      return;
    }

    // Inicializar progresso
    setImportProgress(prev => ({
      ...prev,
      deposits: { current: 0, total: 0, percentage: 0, status: 'loading', message: 'Buscando dados...' }
    }));
      
    setIsImportingDeposits(true);
    try {
      console.log('[handleImportDeposits] Fazendo requisição com credenciais:', {
        hasKey: !!config.credentials.key,
        hasSecret: !!config.credentials.secret,
        hasPassphrase: !!config.credentials.passphrase,
        network: config.credentials.network,
        isConfigured: config.credentials.isConfigured
      });
      
      const response = await fetchLNMarketsDeposits(user.email, config.id);

      console.log('[handleImportDeposits] Resposta recebida:', {
        success: response.success,
        hasData: !!response.data,
        dataLength: response.data?.length,
        error: response.error,
        fullResponse: response
      });

      if (!response.success || !response.data) {
        console.error('[handleImportDeposits] Falha na resposta da API:', response);
        throw new Error(response.error || "Erro ao buscar depósitos");
      }

      const deposits = response.data;
      const totalDeposits = deposits.length;
      
      console.log('[handleImportDeposits] Processando depósitos:', {
        totalDeposits,
        firstDeposit: deposits[0],
        depositsStructure: deposits.map(d => ({
          id: d.id,
          amount: d.amount,
          status: d.status,
          created_at: d.created_at
        }))
      });

      let imported = 0;
      let duplicated = 0;
      let errors = 0;
      let processed = 0;
      let skipped = 0; // Novos contadores para depósitos não confirmados

      // Atualizar progresso inicial
      setImportProgress(prev => ({
        ...prev,
        deposits: { 
          current: 0, 
          total: totalDeposits, 
          percentage: 0, 
          status: 'loading', 
          message: `Processando ${totalDeposits} depósitos...` 
        }
      }));

      for (const deposit of deposits) {
        console.log('[handleImportDeposits] Processando depósito:', {
          id: deposit.id,
          amount: deposit.amount,
          status: deposit.status,
          created_at: deposit.created_at,
          isConfirmed: deposit.status === 'confirmed'
        });

        if (deposit.status === 'confirmed') {
          try {
            const investment = convertDepositToInvestment(deposit);
            
            console.log('[handleImportDeposits] Investimento convertido:', {
              id: investment.id,
              originalId: investment.originalId,
              date: investment.date,
              amount: investment.amount,
              unit: investment.unit
            });
            
            const result = addInvestment(investment, currentActiveReportObjectFromHook.id, { suppressToast: true });
            
            console.log('[handleImportDeposits] Resultado da adição:', result);
            
            if (result.status === 'added') {
              imported++;
            } else if (result.status === 'duplicate') {
              duplicated++;
            } else {
              errors++;
              console.error('[handleImportDeposits] Erro ao adicionar depósito:', result);
            }
          } catch (conversionError) {
            console.error('[handleImportDeposits] Erro na conversão do depósito:', conversionError);
            errors++;
          }
        } else {
          skipped++;
          console.log('[handleImportDeposits] Depósito ignorado (não confirmado):', {
            id: deposit.id,
            status: deposit.status
          });
        }
        
        processed++;
        const percentage = (processed / totalDeposits) * 100;
        
        // Atualizar progresso a cada 5 items ou no final
        if (processed % 5 === 0 || processed === totalDeposits) {
          setImportProgress(prev => ({
            ...prev,
            deposits: {
              current: processed,
              total: totalDeposits,
              percentage,
              status: 'loading',
              message: `Processando... ${imported} importados, ${duplicated} duplicados, ${skipped} ignorados`
            }
          }));
          
          // Pequeno delay para permitir atualização da UI
          if (processed % 25 === 0) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
      }

      // Progresso completo
      setImportProgress(prev => ({
        ...prev,
        deposits: {
          current: totalDeposits,
          total: totalDeposits,
          percentage: 100,
          status: 'complete',
          message: `Concluído: ${imported} importados, ${duplicated} duplicados, ${skipped} ignorados, ${errors} erros`
        }
      }));

      setImportStats(prev => ({
        trades: prev?.trades || { total: 0, imported: 0, duplicated: 0, errors: 0 },
        deposits: { total: deposits.length, imported, duplicated, errors },
        withdrawals: prev?.withdrawals || { total: 0, imported: 0, duplicated: 0, errors: 0 },
      }));

      console.log('[handleImportDeposits] Importação concluída:', {
        totalProcessed: processed,
        imported,
        duplicated,
        skipped,
        errors,
        configName: config.name
      });

      toast({
        title: "💰 Aportes importados com sucesso!",
        description: (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>{imported} novos aportes adicionados aos investimentos</span>
            </div>
            {duplicated > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>{duplicated} aportes já existentes ignorados</span>
              </div>
            )}
            {skipped > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                <span>{skipped} depósitos não confirmados ignorados</span>
              </div>
            )}
            {errors > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>{errors} erros durante processamento</span>
              </div>
            )}
            <div className="text-xs text-gray-400 mt-2">
              Configuração: "{config.name}"
            </div>
          </div>
        ),
        variant: imported > 0 ? "default" : "destructive",
        className: imported > 0 ? "border-blue-500/50 bg-blue-900/20" : "border-yellow-500/50 bg-yellow-900/20",
      });
    } catch (error: any) {
      console.error('[handleImportDeposits] Erro durante importação:', error);
      
      // Progresso com erro
      setImportProgress(prev => ({
        ...prev,
        deposits: {
          ...prev.deposits,
          status: 'error',
          message: error.message || 'Erro durante importação'
        }
      }));
      
      toast({
        title: "❌ Erro ao importar aportes",
        description: (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span>Falha na importação dos aportes</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {error.message || "Erro desconhecido"}
            </div>
          </div>
        ),
        variant: "destructive",
        className: "border-red-500/50 bg-red-900/20",
      });
    } finally {
      setIsImportingDeposits(false);
    }
  };

  const handleImportWithdrawals = async () => {
    console.log('[handleImportWithdrawals] Iniciando importação de saques');
    
    const config = getCurrentImportConfig();
    
    console.log('[handleImportWithdrawals] Configuração obtida:', {
      hasConfig: !!config,
      configName: config?.name,
      hasActiveReport: !!currentActiveReportObjectFromHook,
      reportName: currentActiveReportObjectFromHook?.name
    });
    
    if (!config || !currentActiveReportObjectFromHook || !user?.email) {
      console.log('[handleImportWithdrawals] Configuração, relatório ou usuário ausente');
      toast({
        title: "Configuração necessária",
        description: "Selecione uma configuração LN Markets ativa e certifique-se de ter um relatório ativo.",
        variant: "destructive",
      });
      return;
    }

    // Inicializar progresso
    setImportProgress(prev => ({
      ...prev,
      withdrawals: { current: 0, total: 0, percentage: 0, status: 'loading', message: 'Buscando dados...' }
    }));

    setIsImportingWithdrawals(true);
    try {
      console.log('[handleImportWithdrawals] Fazendo requisição com credenciais:', {
        hasKey: !!config.credentials.key,
        hasSecret: !!config.credentials.secret,
        hasPassphrase: !!config.credentials.passphrase,
        network: config.credentials.network,
        isConfigured: config.credentials.isConfigured
      });
      
      const response = await fetchLNMarketsWithdrawals(user.email, config.id);

      console.log('[handleImportWithdrawals] Resposta recebida:', {
        success: response.success,
        hasData: !!response.data,
        dataLength: response.data?.length,
        error: response.error
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || "Erro ao buscar saques");
      }

      const totalWithdrawals = response.data.length;
      let imported = 0;
      let duplicated = 0;
      let errors = 0;
      let processed = 0;

      // Atualizar progresso inicial
      setImportProgress(prev => ({
        ...prev,
        withdrawals: { 
          current: 0, 
          total: totalWithdrawals, 
          percentage: 0, 
          status: 'loading', 
          message: `Processando ${totalWithdrawals} saques...` 
        }
      }));

      for (const withdrawal of response.data) {
        if (withdrawal.status === 'confirmed') {
          const withdrawalRecord = convertWithdrawalToRecord(withdrawal);
          const result = addWithdrawal(withdrawalRecord, currentActiveReportObjectFromHook.id, { suppressToast: true });
              
          if (result.status === 'added') {
            imported++;
          } else if (result.status === 'duplicate') {
            duplicated++;
          } else {
            errors++;
          }
        }
        
        processed++;
        const percentage = (processed / totalWithdrawals) * 100;
        
        // Atualizar progresso a cada 5 items ou no final
        if (processed % 5 === 0 || processed === totalWithdrawals) {
          setImportProgress(prev => ({
            ...prev,
            withdrawals: {
              current: processed,
              total: totalWithdrawals,
              percentage,
              status: 'loading',
              message: `Processando... ${imported} importados, ${duplicated} duplicados`
            }
          }));
          
          // Pequeno delay para permitir atualização da UI
          if (processed % 25 === 0) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
      }

      // Progresso completo
      setImportProgress(prev => ({
        ...prev,
        withdrawals: {
          current: totalWithdrawals,
          total: totalWithdrawals,
          percentage: 100,
          status: 'complete',
          message: `Concluído: ${imported} importados, ${duplicated} duplicados, ${errors} erros`
        }
      }));

      setImportStats(prev => ({
        trades: prev?.trades || { total: 0, imported: 0, duplicated: 0, errors: 0 },
        deposits: prev?.deposits || { total: 0, imported: 0, duplicated: 0, errors: 0 },
        withdrawals: { total: response.data?.length || 0, imported, duplicated, errors },
      }));
          
      toast({
        title: "📤 Saques importados com sucesso!",
        description: (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span>{imported} novos saques registrados</span>
            </div>
            {duplicated > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>{duplicated} saques já existentes ignorados</span>
              </div>
            )}
            <div className="text-xs text-gray-400 mt-2">
              Configuração: "{config.name}"
            </div>
          </div>
        ),
        variant: "default",
        className: "border-orange-500/50 bg-orange-900/20",
      });
    } catch (error: any) {
      console.error('[handleImportWithdrawals] Erro durante importação:', error);
      
      // Progresso com erro
      setImportProgress(prev => ({
        ...prev,
        withdrawals: {
          ...prev.withdrawals,
          status: 'error',
          message: error.message || 'Erro durante importação'
        }
      }));
      
      toast({
        title: "❌ Erro ao importar saques",
        description: (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span>Falha na importação dos saques</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {error.message || "Erro desconhecido"}
            </div>
          </div>
        ),
        variant: "destructive",
        className: "border-red-500/50 bg-red-900/20",
      });
    } finally {
      setIsImportingWithdrawals(false);
    }
  };

  // Calcular dados do resumo incluindo saques
  const reportSummaryData = useMemo(() => {
    if (!currentActiveReportObjectFromHook) return null;

    const investments = currentActiveReportObjectFromHook.investments || [];
    const profits = currentActiveReportObjectFromHook.profits || [];
    const withdrawals = currentActiveReportObjectFromHook.withdrawals || [];

    const totalInvestmentsBtc = investments.reduce((sum, inv) => sum + convertToBtc(inv.amount, inv.unit), 0);
    const totalWithdrawalsBtc = withdrawals.reduce((sum, w) => sum + convertToBtc(w.amount, w.unit), 0);
    
    const { operationalProfitBtc } = calculateOperationalProfitForSummary(profits, convertToBtc);
    const { valuationProfitUsd } = calculateValuationProfitForSummary(
      investments, 
      states.currentRates.btcToUsd, 
      states.currentRates.brlToUsd, 
      convertToBtc
    );
    const { averageBuyPriceUsd } = calculateAverageBuyPriceForSummary(
      investments, 
      states.currentRates.brlToUsd, 
      convertToBtc
    );

    // Saldo total (sem débito dos saques) e saldo atual (com débito dos saques)
    const totalBalanceBtc = totalInvestmentsBtc + operationalProfitBtc;
    const currentBalanceBtc = totalBalanceBtc - totalWithdrawalsBtc;

    return {
      totalInvestmentsBtc,
      operationalProfitBtc,
      valuationProfitUsd,
      averageBuyPriceUsd,
      totalWithdrawalsBtc,
      totalBalanceBtc,
      currentBalanceBtc,
      hasWithdrawals: withdrawals.length > 0,
    };
  }, [currentActiveReportObjectFromHook, states.currentRates, states.displayCurrency]);

  // NOVAS Funções para múltiplas configurações
  
  // Função para associar configuração ao relatório atual
  const handleAssociateConfigToReport = (configId: string) => {
    if (!currentActiveReportObjectFromHook) return;
    
    const config = multipleConfigs?.configs.find(c => c.id === configId);
    if (!config) return;

    const success = updateReport(currentActiveReportObjectFromHook.id, {
      associatedLNMarketsConfigId: configId,
      associatedLNMarketsConfigName: config.name
    });

    if (success) {
      setSelectedConfigForImport(configId);
            toast({
        title: "Configuração Associada",
        description: `Relatório agora está associado à configuração "${config.name}".`,
              variant: "default",
            });
    }
  };

  // Função para obter configuração atual para importação
  const getCurrentImportConfig = (): LNMarketsAPIConfig | null => {
    console.log('[getCurrentImportConfig] Verificando configuração:', {
      selectedConfigForImport,
      hasMultipleConfigs: !!multipleConfigs,
      configsLength: multipleConfigs?.configs?.length || 0,
      allConfigIds: multipleConfigs?.configs?.map(c => c.id) || []
    });
    
    if (!selectedConfigForImport || !multipleConfigs) {
      console.log('[getCurrentImportConfig] Faltam dados básicos');
      return null;
    }
    
    const config = multipleConfigs.configs.find(c => c.id === selectedConfigForImport && c.isActive);
    
    console.log('[getCurrentImportConfig] Resultado da busca:', {
      configFound: !!config,
      configId: config?.id,
      configName: config?.name,
      configIsActive: config?.isActive,
      hasCredentials: !!config?.credentials,
      credentialsKeys: config?.credentials ? Object.keys(config.credentials) : []
    });
    
    return config || null;
  };

  // NOVA Função de debug para verificar dados
  const debugImportData = () => {
    const config = getCurrentImportConfig();
    
    const debugInfo = {
      userEmail: user?.email,
      selectedConfigForImport,
      hasMultipleConfigs: !!multipleConfigs,
      config: config ? {
        id: config.id,
        name: config.name,
        isActive: config.isActive,
        hasCredentials: !!config.credentials,
        credentialsValid: !!(config.credentials?.key && config.credentials?.secret && config.credentials?.passphrase && config.credentials?.network),
        network: config.credentials?.network,
        isConfigured: config.credentials?.isConfigured
      } : null,
      activeReport: currentActiveReportObjectFromHook ? {
        id: currentActiveReportObjectFromHook.id,
        name: currentActiveReportObjectFromHook.name,
        investmentsCount: currentActiveReportObjectFromHook.investments?.length || 0,
        profitsCount: currentActiveReportObjectFromHook.profits?.length || 0,
        withdrawalsCount: currentActiveReportObjectFromHook.withdrawals?.length || 0,
        lastInvestments: currentActiveReportObjectFromHook.investments?.slice(-3).map(inv => ({
          id: inv.id,
          originalId: inv.originalId,
          date: inv.date,
          amount: inv.amount,
          unit: inv.unit
        })) || [],
        recentInvestmentIds: currentActiveReportObjectFromHook.investments?.slice(-5).map(inv => inv.originalId) || []
      } : null,
      allConfigs: multipleConfigs?.configs?.map(c => ({
        id: c.id,
        name: c.name,
        isActive: c.isActive,
        hasValidCredentials: !!(c.credentials?.key && c.credentials?.secret && c.credentials?.passphrase && c.credentials?.network)
      })) || [],
      importProgress: {
        trades: importProgress.trades,
        deposits: importProgress.deposits,
        withdrawals: importProgress.withdrawals
      },
      lastImportStats: importStats,
      reportsHookState: {
        allReportsCount: allReportsFromHook?.length || 0,
        activeReportIdFromHook,
        reportsDataLoaded,
        allReportIds: allReportsFromHook?.map(r => r.id) || []
      }
    };
    
    console.log('[DEBUG] Estado completo da importação:', debugInfo);
    
    // Teste específico de conexão com a API se houver configuração válida
    if (config && config.credentials?.isConfigured) {
      console.log('[DEBUG] Testando configuração selecionada...');
      
      // Simular uma requisição de teste
      fetchLNMarketsDeposits(user?.email || '', config.id)
        .then(response => {
          console.log('[DEBUG] Teste de resposta da API /deposits:', response);
          
          if (response.success && response.data) {
            console.log('[DEBUG] Primeiros 3 depósitos da API:', response.data.slice(0, 3));
            
            // Testar conversão de um depósito
            const firstConfirmedDeposit = response.data.find(d => d.status === 'confirmed');
            if (firstConfirmedDeposit) {
              try {
                const testInvestment = convertDepositToInvestment(firstConfirmedDeposit);
                console.log('[DEBUG] Teste de conversão bem-sucedido:', testInvestment);
                
                // Testar se já existe no relatório
                const isDuplicate = currentActiveReportObjectFromHook?.investments?.some(
                  inv => inv.originalId === testInvestment.originalId
                );
                console.log('[DEBUG] Depósito seria duplicado?', isDuplicate);
                
              } catch (conversionError) {
                console.error('[DEBUG] Erro na conversão de teste:', conversionError);
              }
            }
          }
        })
        .catch(error => {
          console.error('[DEBUG] Erro no teste da API /deposits:', error);
        });
    }
    
    // Verificar localStorage
    try {
      const storedCollection = localStorage.getItem('bitcoinReportsCollection');
      if (storedCollection) {
        const parsed = JSON.parse(storedCollection);
        console.log('[DEBUG] Dados no localStorage:', {
          reportsCount: parsed.reports?.length || 0,
          activeReportId: parsed.activeReportId,
          lastUpdated: parsed.lastUpdated,
          version: parsed.version
        });
      }
    } catch (error) {
      console.error('[DEBUG] Erro ao ler localStorage:', error);
    }
    
    toast({
      title: "🐛 Debug Info",
      description: (
        <div className="space-y-1 text-xs">
          <div>Config: {config?.name || 'Nenhum'}</div>
          <div>Relatório: {currentActiveReportObjectFromHook?.name || 'Nenhum'}</div>
          <div>Investimentos: {currentActiveReportObjectFromHook?.investments?.length || 0}</div>
          <div>Credenciais: {config?.credentials?.isConfigured ? '✅' : '❌'}</div>
          <div>Detalhes no console</div>
        </div>
      ),
      variant: "default",
      className: "border-purple-500/50 bg-purple-900/20",
    });
  };

  // NOVO: Função para forçar atualização (do MultiReportCalculator)
  const forceUpdate = useCallback(() => {
    forceUpdateCountRef.current += 1;
    setLocalForceUpdate(forceUpdateCountRef.current);
    console.log('[ProfitCalculator] Forçando atualização:', forceUpdateCountRef.current);
  }, []);

  // NOVO: Effect principal para detectar mudanças no relatório ativo (do MultiReportCalculator)
  useEffect(() => {
    if (!reportsDataLoaded || !currentActiveReportObjectFromHook || !activeReportIdFromHook) {
      return;
    }

    const now = Date.now();
    const reportChanged = lastActiveReportIdRef.current !== activeReportIdFromHook;
    
    // Criar hash dos dados do relatório para detectar mudanças no conteúdo
    const reportDataHash = JSON.stringify({
      investments: currentActiveReportObjectFromHook.investments,
      profits: currentActiveReportObjectFromHook.profits,
      withdrawals: currentActiveReportObjectFromHook.withdrawals,
      updatedAt: currentActiveReportObjectFromHook.updatedAt,
      lastUpdated: currentActiveReportObjectFromHook.lastUpdated
    });
    
    const dataChanged = lastActiveReportDataRef.current !== reportDataHash;
    
    // Detectar se houve mudança significativa
    if (reportChanged || dataChanged || now - lastUpdateRef.current > 1000) {
      console.log('[ProfitCalculator] Mudança detectada:', {
        reportId: activeReportIdFromHook,
        reportName: currentActiveReportObjectFromHook.name,
        reportChanged,
        dataChanged,
        investmentsCount: currentActiveReportObjectFromHook.investments?.length || 0,
        profitsCount: currentActiveReportObjectFromHook.profits?.length || 0,
        withdrawalsCount: currentActiveReportObjectFromHook.withdrawals?.length || 0,
        timestamp: new Date().toISOString()
      });
      
      // Atualizar referências
      lastUpdateRef.current = now;
      lastActiveReportIdRef.current = activeReportIdFromHook;
      lastActiveReportDataRef.current = reportDataHash;
      
      // Forçar atualização do componente
      forceUpdate();
    }
  }, [
    currentActiveReportObjectFromHook, 
    activeReportIdFromHook, 
    reportsDataLoaded,
    currentActiveReportObjectFromHook?.investments, 
    currentActiveReportObjectFromHook?.profits, 
    currentActiveReportObjectFromHook?.withdrawals,
    currentActiveReportObjectFromHook?.updatedAt,
    currentActiveReportObjectFromHook?.lastUpdated,
    forceUpdate
  ]);

  // NOVO: Handlers com sincronização automática (do MultiReportCalculator)
  const handleAddInvestmentSynced = useCallback((date: string, amount: number, unit: CurrencyUnit) => {
    const result = addInvestment({ date, amount, unit });
    // Forçar atualização após adicionar investimento
    setTimeout(forceUpdate, 100);
    return result;
  }, [addInvestment, forceUpdate]);

  const handleAddProfitRecordSynced = useCallback((
    date: string,
    amount: number,
    unit: CurrencyUnit,
    isProfit: boolean
  ) => {
    const result = addProfitRecord({ date, amount, unit, isProfit });
    // Forçar atualização após adicionar registro de lucro
    setTimeout(forceUpdate, 100);
    return result;
  }, [addProfitRecord, forceUpdate]);

  const handleDeleteInvestmentSynced = useCallback((id: string) => {
    if (!activeReportIdFromHook) return false;
    const result = deleteInvestment(activeReportIdFromHook, id);
    // Forçar atualização após deletar investimento
    setTimeout(forceUpdate, 100);
    return result;
  }, [activeReportIdFromHook, deleteInvestment, forceUpdate]);

  const handleDeleteProfitSynced = useCallback((id: string) => {
    if (!activeReportIdFromHook) return false;
    const result = deleteProfitRecord(activeReportIdFromHook, id);
    // Forçar atualização após deletar lucro
    setTimeout(forceUpdate, 100);
    return result;
  }, [activeReportIdFromHook, deleteProfitRecord, forceUpdate]);

  const handleUpdateAllInvestmentsSynced = useCallback((investments: Investment[]) => {
    if (!activeReportIdFromHook) return false;
    const result = updateReportData(activeReportIdFromHook, investments, undefined);
    // Forçar atualização após atualizar investimentos
    setTimeout(forceUpdate, 100);
    return result;
  }, [activeReportIdFromHook, updateReportData, forceUpdate]);

  const handleUpdateAllProfitsSynced = useCallback((profits: ProfitRecord[]) => {
    if (!activeReportIdFromHook) return false;
    const result = updateReportData(activeReportIdFromHook, undefined, profits);
    // Forçar atualização após atualizar lucros
    setTimeout(forceUpdate, 100);
    return result;
  }, [activeReportIdFromHook, updateReportData, forceUpdate]);

  // NOVAS FUNÇÕES PARA PROCESSAMENTO DE DADOS DO HISTÓRICO E GRÁFICOS

  // FUNÇÕES OTIMIZADAS PARA PROCESSAMENTO DE DADOS DOS GRÁFICOS COM CACHE

  // Cache para dados processados
  const chartDataCache = useRef<Map<string, ChartDataPoint[]>>(new Map());
  const filteredDataCache = useRef<Map<string, any>>(new Map());

  // Função otimizada para obter dados filtrados por período com cache
  const getFilteredHistoryData = useMemo(() => {
    const cacheKey = `${historyViewMode}-${historyFilterPeriod}-${historyCustomStartDate?.getTime()}-${historyCustomEndDate?.getTime()}-${currentActiveReportObjectFromHook?.id || 'none'}-${allReportsFromHook?.length || 0}`;
    
    if (filteredDataCache.current.has(cacheKey)) {
      return filteredDataCache.current.get(cacheKey);
    }

    if (!currentActiveReportObjectFromHook && historyViewMode === "active") {
      const emptyResult = { investments: [], profits: [], withdrawals: [] };
      filteredDataCache.current.set(cacheKey, emptyResult);
      return emptyResult;
    }

    const reportsToAnalyze = historyViewMode === "all" 
      ? allReportsFromHook || []
      : currentActiveReportObjectFromHook ? [currentActiveReportObjectFromHook] : [];

    let startDate: Date;
    let endDate = new Date();

    // Determinar período de filtro
    if (historyFilterPeriod === "custom") {
      startDate = historyCustomStartDate || new Date();
      endDate = historyCustomEndDate || new Date();
    } else {
      const today = new Date();
      switch (historyFilterPeriod) {
        case "1m":
          startDate = subMonths(today, 1);
          break;
        case "3m":
          startDate = subMonths(today, 3);
          break;
        case "6m":
          startDate = subMonths(today, 6);
          break;
        case "1y":
          startDate = subMonths(today, 12);
          break;
        default: // "all"
          startDate = new Date(0);
          break;
      }
    }

    // Filtrar dados de todos os relatórios selecionados
    const allInvestments: Investment[] = [];
    const allProfits: ProfitRecord[] = [];
    const allWithdrawals: any[] = [];

    reportsToAnalyze.forEach(report => {
      // Filtrar investimentos
      const filteredInvestments = (report.investments || []).filter(inv => {
        const invDate = new Date(inv.date);
        return invDate >= startDate && invDate <= endDate;
      });
      allInvestments.push(...filteredInvestments);

      // Filtrar lucros
      const filteredProfits = (report.profits || []).filter(profit => {
        const profitDate = new Date(profit.date);
        return profitDate >= startDate && profitDate <= endDate;
      });
      allProfits.push(...filteredProfits);

      // Filtrar saques
      const filteredWithdrawals = (report.withdrawals || []).filter(withdrawal => {
        const withdrawalDate = new Date(withdrawal.date);
        return withdrawalDate >= startDate && withdrawalDate <= endDate;
      });
      allWithdrawals.push(...filteredWithdrawals);
    });

    const result = {
      investments: allInvestments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      profits: allProfits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      withdrawals: allWithdrawals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };

    // Limitar cache para evitar memory leak
    if (filteredDataCache.current.size > 20) {
      const firstKey = filteredDataCache.current.keys().next().value;
      filteredDataCache.current.delete(firstKey);
    }
    
    filteredDataCache.current.set(cacheKey, result);
    return result;
  }, [
    currentActiveReportObjectFromHook, 
    allReportsFromHook, 
    historyViewMode, 
    historyFilterPeriod, 
    historyCustomStartDate, 
    historyCustomEndDate
  ]);

  // Função otimizada para processar dados para os gráficos com cache
  const getChartData = useMemo((): ChartDataPoint[] => {
    const cacheKey = `${currentActiveReportObjectFromHook?.id || 'none'}-${chartTimeframe}-${currentActiveReportObjectFromHook?.investments?.length || 0}-${currentActiveReportObjectFromHook?.profits?.length || 0}`;
    
    if (chartDataCache.current.has(cacheKey)) {
      return chartDataCache.current.get(cacheKey)!;
    }

    if (!currentActiveReportObjectFromHook) {
      const emptyResult: ChartDataPoint[] = [];
      chartDataCache.current.set(cacheKey, emptyResult);
      return emptyResult;
    }

    // Verificar se há dados suficientes para gerar gráfico
    const hasInvestments = currentActiveReportObjectFromHook.investments && currentActiveReportObjectFromHook.investments.length > 0;
    const hasProfits = currentActiveReportObjectFromHook.profits && currentActiveReportObjectFromHook.profits.length > 0;
    
    if (!hasInvestments && !hasProfits) {
      const emptyResult: ChartDataPoint[] = [];
      chartDataCache.current.set(cacheKey, emptyResult);
      return emptyResult;
    }

    const investments = currentActiveReportObjectFromHook.investments || [];
    const profits = currentActiveReportObjectFromHook.profits || [];

    // Usar Web Workers para processamento pesado em datasets grandes
    const shouldUseWebWorker = investments.length + profits.length > 1000;
    
    // Criar mapa de dados por mês
    const monthlyData = new Map<string, { investments: number; profits: number; }>();

    // Processar investimentos
    investments.forEach(inv => {
      const date = new Date(inv.date);
      const monthKey = chartTimeframe === "monthly" 
        ? formatDateFn(startOfMonth(date), 'yyyy-MM')
        : formatDateFn(date, 'yyyy-MM-dd');
      
      const btcAmount = inv.unit === 'SATS' ? inv.amount / 100000000 : inv.amount;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { investments: 0, profits: 0 });
      }
      const data = monthlyData.get(monthKey)!;
      data.investments += btcAmount;
    });

    // Processar lucros/perdas
    profits.forEach(profit => {
      const date = new Date(profit.date);
      const monthKey = chartTimeframe === "monthly" 
        ? formatDateFn(startOfMonth(date), 'yyyy-MM')
        : formatDateFn(date, 'yyyy-MM-dd');
      
      const btcAmount = profit.unit === 'SATS' ? profit.amount / 100000000 : profit.amount;
      const adjustedAmount = profit.isProfit ? btcAmount : -btcAmount;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { investments: 0, profits: 0 });
      }
      const data = monthlyData.get(monthKey)!;
      data.profits += adjustedAmount;
    });

    // Converter para array e calcular saldo acumulado
    const chartData: ChartDataPoint[] = [];
    let accumulatedInvestments = 0;
    let accumulatedProfits = 0;

    Array.from(monthlyData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([monthKey, data]) => {
        accumulatedInvestments += data.investments;
        accumulatedProfits += data.profits;
        
        const dateObj = chartTimeframe === "monthly" 
          ? new Date(monthKey + '-01')
          : new Date(monthKey);
        
        chartData.push({
          date: monthKey,
          month: formatDateFn(dateObj, chartTimeframe === "monthly" ? 'MMM yyyy' : 'dd/MM', { locale: ptBR }),
          investments: accumulatedInvestments,
          profits: accumulatedProfits,
          balance: accumulatedInvestments + accumulatedProfits
        });
      });

    // Limitar cache para evitar memory leak
    if (chartDataCache.current.size > 10) {
      const firstKey = chartDataCache.current.keys().next().value;
      chartDataCache.current.delete(firstKey);
    }
    
    chartDataCache.current.set(cacheKey, chartData);
    return chartData;
  }, [currentActiveReportObjectFromHook, chartTimeframe]);

  // Limpar cache quando dados importantes mudam
  useEffect(() => {
    chartDataCache.current.clear();
    filteredDataCache.current.clear();
  }, [currentActiveReportObjectFromHook?.id, currentActiveReportObjectFromHook?.updatedAt]);

  // Função para converter valores conforme unidade selecionada (otimizada)
  const convertChartValue = useCallback((btcValue: number): number => {
    switch (chartDisplayUnit) {
      case "usd":
        return btcValue * states.currentRates.btcToUsd;
      case "brl":
        return btcValue * states.currentRates.btcToUsd * states.currentRates.brlToUsd;
      default:
        return btcValue;
    }
  }, [chartDisplayUnit, states.currentRates]);

  // Função para formatar valores do gráfico (otimizada)
  const formatChartValue = useCallback((value: number): string => {
    switch (chartDisplayUnit) {
      case "usd":
        return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case "brl":
        return `R$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case "btc":
        return value >= 0.01 || value <= -0.01
          ? `₿${value.toLocaleString(undefined, { minimumFractionDigits: 8, maximumFractionDigits: 8 })}`
          : `丰${(value * 100000000).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }
  }, [chartDisplayUnit]);

    return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      {/* NOVO: Sistema integrado de gerenciamento de relatórios */}
      {isComparisonMode ? (
        <ReportsComparison 
          onBack={() => setIsComparisonMode(false)} 
          btcToUsd={btcToUsd} 
          brlToUsd={brlToUsd} 
        />
      ) : (
        <>
          {/* NOVO: Cabeçalho com gerenciador de relatórios */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-6">
            <ReportManager onCompare={() => setIsComparisonMode(true)} />
            
            <div className="flex gap-2 sm:ml-auto">
              {/* Sistema de Exportação de Relatórios Robusto */}
              {currentActiveReportObjectFromHook && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-black/30 border-green-700/50 hover:bg-green-900/20"
                    onClick={async () => {
                      if (!currentActiveReportObjectFromHook) return;
                      
                      try {
                        states.setIsExporting(true);
                        
                        // Importar ExcelJS dinamicamente
                        const ExcelJS = await import('exceljs');
                        
                        // Criar workbook
                        const workbook = new ExcelJS.Workbook();
                        workbook.creator = "Raid Bitcoin Toolkit";
                        workbook.lastModifiedBy = "Raid Bitcoin Toolkit";
                        workbook.created = new Date();
                        
                        // Obter dados do relatório
                        const investments = currentActiveReportObjectFromHook.investments || [];
                        const profits = currentActiveReportObjectFromHook.profits || [];
                        const withdrawals = currentActiveReportObjectFromHook.withdrawals || [];
                        
                        // Calcular totais
                        const totalInvestmentsBtc = investments.reduce((sum, inv) => sum + convertToBtc(inv.amount, inv.unit), 0);
                        const totalWithdrawalsBtc = withdrawals.reduce((sum, w) => sum + convertToBtc(w.amount, w.unit), 0);
                        const { operationalProfitBtc } = calculateOperationalProfitForSummary(profits, convertToBtc);
                        const totalBalanceBtc = totalInvestmentsBtc + operationalProfitBtc;
                        const currentBalanceBtc = totalBalanceBtc - totalWithdrawalsBtc;
                        
                        // Planilha de Resumo
                        const summarySheet = workbook.addWorksheet('Resumo', {
                          properties: { tabColor: { argb: 'FFD700' } }
                        });
                        
                        summarySheet.columns = [
                          { header: 'Métrica', key: 'metric', width: 35 },
                          { header: 'Valor', key: 'value', width: 20 },
                          { header: 'Valor (BTC)', key: 'btcValue', width: 20 },
                          { header: 'Valor (USD)', key: 'usdValue', width: 20 },
                          { header: 'Valor (BRL)', key: 'brlValue', width: 20 }
                        ];
                        
                        summarySheet.getRow(1).font = { bold: true };
                        summarySheet.getRow(1).fill = {
                          type: 'pattern',
                          pattern: 'solid',
                          fgColor: { argb: '4F4F6F' }
                        };
                        
                        summarySheet.addRow({
                          metric: 'Relatório',
                          value: currentActiveReportObjectFromHook.name,
                          btcValue: '-',
                          usdValue: '-',
                          brlValue: '-'
                        });
                        
                        summarySheet.addRow({
                          metric: 'Data de Exportação',
                          value: formatDateFn(new Date(), "dd/MM/yyyy HH:mm"),
                          btcValue: '-',
                          usdValue: '-',
                          brlValue: '-'
                        });
                        
                        summarySheet.addRow({});
                        
                        const investmentsRow = summarySheet.addRow({
                          metric: 'Total de Investimentos',
                          value: '-',
                          btcValue: totalInvestmentsBtc.toFixed(8),
                          usdValue: `$${(totalInvestmentsBtc * states.currentRates.btcToUsd).toFixed(2)}`,
                          brlValue: `R$${(totalInvestmentsBtc * states.currentRates.btcToUsd * states.currentRates.brlToUsd).toFixed(2)}`
                        });
                        investmentsRow.font = { bold: true };
                        
                        const profitsRow = summarySheet.addRow({
                          metric: 'Total de Lucros/Perdas',
                          value: '-',
                          btcValue: operationalProfitBtc.toFixed(8),
                          usdValue: `$${(operationalProfitBtc * states.currentRates.btcToUsd).toFixed(2)}`,
                          brlValue: `R$${(operationalProfitBtc * states.currentRates.btcToUsd * states.currentRates.brlToUsd).toFixed(2)}`
                        });
                        profitsRow.font = { bold: true, color: { argb: operationalProfitBtc >= 0 ? '00B050' : 'FF0000' } };
                        
                        if (withdrawals.length > 0) {
                          summarySheet.addRow({
                            metric: 'Total de Saques',
                            value: '-',
                            btcValue: totalWithdrawalsBtc.toFixed(8),
                            usdValue: `$${(totalWithdrawalsBtc * states.currentRates.btcToUsd).toFixed(2)}`,
                            brlValue: `R$${(totalWithdrawalsBtc * states.currentRates.btcToUsd * states.currentRates.brlToUsd).toFixed(2)}`
                          });
                          
                          const currentBalanceRow = summarySheet.addRow({
                            metric: 'Saldo Atual (após saques)',
                            value: '-',
                            btcValue: currentBalanceBtc.toFixed(8),
                            usdValue: `$${(currentBalanceBtc * states.currentRates.btcToUsd).toFixed(2)}`,
                            brlValue: `R$${(currentBalanceBtc * states.currentRates.btcToUsd * states.currentRates.brlToUsd).toFixed(2)}`
                          });
                          currentBalanceRow.font = { bold: true };
                        }
                        
                        // Planilha de Investimentos
                        if (investments.length > 0) {
                          const investmentsSheet = workbook.addWorksheet('Investimentos');
                          investmentsSheet.columns = [
                            { header: 'Data', key: 'date', width: 15 },
                            { header: 'Valor', key: 'amount', width: 15 },
                            { header: 'Unidade', key: 'unit', width: 10 },
                            { header: 'Valor (BTC)', key: 'btcAmount', width: 20 },
                            { header: 'Valor (USD)', key: 'usdAmount', width: 15 },
                            { header: 'Valor (BRL)', key: 'brlAmount', width: 15 }
                          ];
                          
                          investments.forEach(inv => {
                            const btcAmount = convertToBtc(inv.amount, inv.unit);
                            investmentsSheet.addRow({
                              date: formatDateFn(new Date(inv.date), "dd/MM/yyyy"),
                              amount: inv.amount,
                              unit: inv.unit,
                              btcAmount: btcAmount.toFixed(8),
                              usdAmount: (btcAmount * states.currentRates.btcToUsd).toFixed(2),
                              brlAmount: (btcAmount * states.currentRates.btcToUsd * states.currentRates.brlToUsd).toFixed(2)
                            });
                          });
                        }
                        
                        // Planilha de Lucros/Perdas
                        if (profits.length > 0) {
                          const profitsSheet = workbook.addWorksheet('Lucros e Perdas');
                          profitsSheet.columns = [
                            { header: 'Data', key: 'date', width: 15 },
                            { header: 'Tipo', key: 'type', width: 10 },
                            { header: 'Valor', key: 'amount', width: 15 },
                            { header: 'Unidade', key: 'unit', width: 10 },
                            { header: 'Valor (BTC)', key: 'btcAmount', width: 20 },
                            { header: 'Valor (USD)', key: 'usdAmount', width: 15 },
                            { header: 'Valor (BRL)', key: 'brlAmount', width: 15 }
                          ];
                          
                          profits.forEach(profit => {
                            const btcAmount = convertToBtc(profit.amount, profit.unit);
                            const row = profitsSheet.addRow({
                              date: formatDateFn(new Date(profit.date), "dd/MM/yyyy"),
                              type: profit.isProfit ? 'Lucro' : 'Perda',
                              amount: profit.amount,
                              unit: profit.unit,
                              btcAmount: btcAmount.toFixed(8),
                              usdAmount: (btcAmount * states.currentRates.btcToUsd).toFixed(2),
                              brlAmount: (btcAmount * states.currentRates.btcToUsd * states.currentRates.brlToUsd).toFixed(2)
                            });
                            
                            // Colorir linha baseado no tipo
                            const color = profit.isProfit ? '00B050' : 'FF0000';
                            row.getCell('type').font = { color: { argb: color } };
                            row.getCell('btcAmount').font = { color: { argb: color } };
                            row.getCell('usdAmount').font = { color: { argb: color } };
                            row.getCell('brlAmount').font = { color: { argb: color } };
                          });
                        }
                        
                        // Planilha de Saques (se houver)
                        if (withdrawals.length > 0) {
                          const withdrawalsSheet = workbook.addWorksheet('Saques');
                          withdrawalsSheet.columns = [
                            { header: 'Data', key: 'date', width: 15 },
                            { header: 'Valor', key: 'amount', width: 15 },
                            { header: 'Unidade', key: 'unit', width: 10 },
                            { header: 'Valor (BTC)', key: 'btcAmount', width: 20 },
                            { header: 'Valor (USD)', key: 'usdAmount', width: 15 },
                            { header: 'Valor (BRL)', key: 'brlAmount', width: 15 }
                          ];
                          
                          withdrawals.forEach(withdrawal => {
                            const btcAmount = convertToBtc(withdrawal.amount, withdrawal.unit);
                            withdrawalsSheet.addRow({
                              date: formatDateFn(new Date(withdrawal.date), "dd/MM/yyyy"),
                              amount: withdrawal.amount,
                              unit: withdrawal.unit,
                              btcAmount: btcAmount.toFixed(8),
                              usdAmount: (btcAmount * states.currentRates.btcToUsd).toFixed(2),
                              brlAmount: (btcAmount * states.currentRates.btcToUsd * states.currentRates.brlToUsd).toFixed(2)
                            });
                          });
                        }
                        
                        // Gerar e baixar arquivo
                        const buffer = await workbook.xlsx.writeBuffer();
                        const blob = new Blob([buffer], { 
                          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
                        });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `relatorio-completo-${currentActiveReportObjectFromHook.name.replace(/[^a-zA-Z0-9]/g, '-')}-${formatDateFn(new Date(), "yyyy-MM-dd")}.xlsx`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                        
                        toast({
                          title: "📊 Relatório Excel Exportado!",
                          description: `Relatório completo do "${currentActiveReportObjectFromHook.name}" foi exportado com múltiplas planilhas e análises detalhadas.`,
                          variant: "default",
                          className: "border-green-500/50 bg-green-900/20",
                        });
                        
                      } catch (error) {
                        console.error('Erro ao exportar Excel:', error);
                        toast({
                          title: "❌ Erro na exportação",
                          description: "Falha ao gerar arquivo Excel. Tente novamente.",
                          variant: "destructive",
                        });
                      } finally {
                        states.setIsExporting(false);
                      }
                    }}
                    disabled={states.isExporting}
                  >
                    {states.isExporting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Exportando...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Excel Completo
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-black/30 border-blue-700/50 hover:bg-blue-900/20"
                    onClick={() => {
                      if (!currentActiveReportObjectFromHook) return;
                      
                      const reportData = {
                        name: currentActiveReportObjectFromHook.name,
                        description: currentActiveReportObjectFromHook.description || '',
                        investments: currentActiveReportObjectFromHook.investments || [],
                        profits: currentActiveReportObjectFromHook.profits || [],
                        withdrawals: currentActiveReportObjectFromHook.withdrawals || [],
                        createdAt: currentActiveReportObjectFromHook.createdAt,
                        updatedAt: currentActiveReportObjectFromHook.updatedAt
                      };
                      
                      const dataStr = JSON.stringify(reportData, null, 2);
                      const dataBlob = new Blob([dataStr], { type: 'application/json' });
                      const url = URL.createObjectURL(dataBlob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `relatorio-backup-${currentActiveReportObjectFromHook.name.replace(/[^a-zA-Z0-9]/g, '-')}-${formatDateFn(new Date(), "yyyy-MM-dd")}.json`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                      
                      toast({
                        title: "💾 Backup JSON Exportado!",
                        description: `Backup completo do relatório "${currentActiveReportObjectFromHook.name}" foi salvo.`,
                        variant: "default",
                        className: "border-blue-500/50 bg-blue-900/20",
                      });
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Backup JSON
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Estatísticas de importação */}
          {importStats && selectedConfigForImport && (
            <div className="mt-6 p-4 bg-black/20 rounded-lg border border-purple-700/30">
              <h4 className="text-sm font-medium text-purple-400 mb-3">
                Última Importação ({multipleConfigs?.configs.find(c => c.id === selectedConfigForImport)?.name})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {importStats.trades && (
                  <div>
                    <div className="text-green-400 font-medium">Trades</div>
                    <div>Total: {importStats.trades.total}</div>
                    <div>Importados: {importStats.trades.imported}</div>
                    <div>Duplicados: {importStats.trades.duplicated}</div>
                  </div>
                )}
                {importStats.deposits && (
                  <div>
                    <div className="text-blue-400 font-medium">Depósitos</div>
                    <div>Total: {importStats.deposits.total}</div>
                    <div>Importados: {importStats.deposits.imported}</div>
                    <div>Duplicados: {importStats.deposits.duplicated}</div>
                  </div>
                )}
                {importStats.withdrawals && (
                  <div>
                    <div className="text-red-400 font-medium">Saques</div>
                    <div>Total: {importStats.withdrawals.total}</div>
                    <div>Importados: {importStats.withdrawals.imported}</div>
                    <div>Duplicados: {importStats.withdrawals.duplicated}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conteúdo das abas */}
          <Tabs value={states.activeTab} onValueChange={states.setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-black/40 backdrop-blur-sm">
              <TabsTrigger value="import" className="text-white data-[state=active]:bg-purple-700">
                <Zap className="mr-2 h-4 w-4" />
                Importação
              </TabsTrigger>
              <TabsTrigger value="history" className="text-white data-[state=active]:bg-purple-700">
                <BarChart2 className="mr-2 h-4 w-4" />
                Histórico
              </TabsTrigger>
              <TabsTrigger value="charts" className="text-white data-[state=active]:bg-purple-700">
                <PieChartIcon className="mr-2 h-4 w-4" />
                Gráficos
              </TabsTrigger>
            </TabsList>

            {/* ABA IMPORTAÇÃO */}
            <TabsContent value="import">
              <div className="space-y-6">
                {/* Seletor de Configuração LN Markets */}
                {multipleConfigs && multipleConfigs.configs.length > 0 && (
                  <Card className="bg-black/30 border border-purple-700/40">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Configuração LN Markets
                      </CardTitle>
                      <CardDescription>
                        Selecione qual configuração usar para importação
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Configuração Ativa</Label>
                          <Select value={selectedConfigForImport || ""} onValueChange={setSelectedConfigForImport}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma configuração" />
                            </SelectTrigger>
                            <SelectContent>
                              {multipleConfigs.configs
                                .filter(config => config.isActive)
                                .map((config) => (
                                  <SelectItem key={config.id} value={config.id}>
                                    <div className="flex items-center gap-2">
                                      <span>{config.name}</span>
                                      {config.id === multipleConfigs.defaultConfigId && (
                                        <Badge variant="outline" className="text-xs">Padrão</Badge>
                                      )}
                                      {currentActiveReportObjectFromHook?.associatedLNMarketsConfigId === config.id && (
                                        <Badge variant="default" className="text-xs">Associado</Badge>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Cards de Importação LN Markets */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card Trades */}
                  <Card className="bg-black/30 border border-green-700/40 hover:border-green-600/60 transition-colors flex flex-col min-h-[280px]">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-green-400">
                        <TrendingUp className="h-5 w-5" />
                        Trades
                      </CardTitle>
                      <CardDescription className="min-h-[2.5rem] flex items-center">
                        Importar histórico de trades fechados com lucro/prejuízo
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-1 flex flex-col justify-end">
                      {importProgress.trades.status !== 'idle' && (
                        <ImportProgressIndicator progress={importProgress.trades} type="trades" />
                      )}
                      <Button
                        onClick={handleImportTrades}
                        disabled={isImportingTrades || !selectedConfigForImport}
                        className="w-full bg-green-700 hover:bg-green-600 mt-auto"
                      >
                        {isImportingTrades ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Importando...
                          </>
                        ) : (
                          <>
                            <TrendingUp className="mr-2 h-4 w-4" />
                            Importar Trades
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Card Depósitos */}
                  <Card className="bg-black/30 border border-blue-700/40 hover:border-blue-600/60 transition-colors flex flex-col min-h-[280px]">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-blue-400">
                        <Download className="h-5 w-5" />
                        Aportes
                      </CardTitle>
                      <CardDescription className="min-h-[2.5rem] flex items-center">
                        Importar depósitos confirmados como investimentos
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-1 flex flex-col justify-end">
                      {importProgress.deposits.status !== 'idle' && (
                        <ImportProgressIndicator progress={importProgress.deposits} type="deposits" />
                      )}
                      
                      {/* DEBUG: Botões de debug apenas em desenvolvimento */}
                      {process.env.NODE_ENV === 'development' && (
                        <div className="space-y-2 mb-2">
                          <Button
                            onClick={debugImportData}
                            variant="outline"
                            size="sm"
                            className="w-full bg-purple-700/20 hover:bg-purple-600/30 border-purple-600/50"
                          >
                            🐛 Debug Info
                          </Button>
                          <Button
                            onClick={testAddInvestment}
                            variant="outline"
                            size="sm"
                            className="w-full bg-green-700/20 hover:bg-green-600/30 border-green-600/50"
                          >
                            🧪 Testar AddInvestment
                          </Button>
                        </div>
                      )}
                      
                      <Button
                        onClick={handleImportDeposits}
                        disabled={isImportingDeposits || !selectedConfigForImport}
                        className="w-full bg-blue-700 hover:bg-blue-600 mt-auto"
                      >
                        {isImportingDeposits ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Importando...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Importar Aportes
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Card Saques */}
                  <Card className="bg-black/30 border border-orange-700/40 hover:border-orange-600/60 transition-colors flex flex-col min-h-[280px]">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-orange-400">
                        <Upload className="h-5 w-5" />
                        Saques
                      </CardTitle>
                      <CardDescription className="min-h-[2.5rem] flex items-center">
                        Importar saques confirmados
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-1 flex flex-col justify-end">
                      {importProgress.withdrawals.status !== 'idle' && (
                        <ImportProgressIndicator progress={importProgress.withdrawals} type="withdrawals" />
                      )}
                      <Button
                        onClick={handleImportWithdrawals}
                        disabled={isImportingWithdrawals || !selectedConfigForImport}
                        className="w-full bg-orange-700 hover:bg-orange-600 mt-auto"
                      >
                        {isImportingWithdrawals ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Importando...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Importar Saques
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* ABA HISTÓRICO */}
            <TabsContent value="history">
              <div className="space-y-6">
                {/* Controles de Filtro */}
                <Card className="bg-black/30 border border-purple-700/40">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      Filtros e Período
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Período</Label>
                        <Select value={historyFilterPeriod} onValueChange={(value: HistoryFilterPeriod) => setHistoryFilterPeriod(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1m">Último mês</SelectItem>
                            <SelectItem value="3m">Últimos 3 meses</SelectItem>
                            <SelectItem value="6m">Últimos 6 meses</SelectItem>
                            <SelectItem value="1y">Último ano</SelectItem>
                            <SelectItem value="all">Todo período</SelectItem>
                            <SelectItem value="custom">Personalizado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Modo de Visualização</Label>
                        <Select value={historyViewMode} onValueChange={(value: HistoryViewMode) => setHistoryViewMode(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Relatório Ativo</SelectItem>
                            <SelectItem value="all">Todos os Relatórios</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Unidade de Exibição</Label>
                        <Select value={states.displayCurrency.code} onValueChange={(value) => {
                          states.setDisplayCurrency(value === "USD" ? { code: "USD", symbol: "$" } : { code: "BRL", symbol: "R$" });
                        }}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="BRL">BRL (R$)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {historyFilterPeriod === "custom" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                          <Label>Data Inicial</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {historyCustomStartDate ? formatDateFn(historyCustomStartDate, "dd/MM/yyyy") : "Selecionar data"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <CalendarComponent
                                mode="single"
                                selected={historyCustomStartDate}
                                onSelect={setHistoryCustomStartDate}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Data Final</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {historyCustomEndDate ? formatDateFn(historyCustomEndDate, "dd/MM/yyyy") : "Selecionar data"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <CalendarComponent
                                mode="single"
                                selected={historyCustomEndDate}
                                onSelect={setHistoryCustomEndDate}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Estatísticas do Período */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <HistoryStatsCard
                    title="Total Investido"
                    value={formatCurrency(getFilteredHistoryData.investments.reduce((sum, inv) => sum + convertToBtc(inv.amount, inv.unit) * states.currentRates.btcToUsd, 0), states.displayCurrency.code)}
                    icon={<TrendingDown className="h-4 w-4 text-blue-400" />}
                    valueColor="text-blue-400"
                  />
                  
                  <HistoryStatsCard
                    title="Lucros/Perdas"
                    value={formatCurrency(getFilteredHistoryData.profits.reduce((sum, profit) => {
                      const btcAmount = convertToBtc(profit.amount, profit.unit);
                      const value = profit.isProfit ? btcAmount : -btcAmount;
                      return sum + (value * states.currentRates.btcToUsd);
                    }, 0), states.displayCurrency.code)}
                    icon={<TrendingUp className="h-4 w-4 text-green-400" />}
                    valueColor={getFilteredHistoryData.profits.reduce((sum, profit) => {
                      const btcAmount = convertToBtc(profit.amount, profit.unit);
                      return sum + (profit.isProfit ? btcAmount : -btcAmount);
                    }, 0) >= 0 ? "text-green-400" : "text-red-400"}
                  />
                  
                  <HistoryStatsCard
                    title="Saques"
                    value={formatCurrency(getFilteredHistoryData.withdrawals.reduce((sum, w) => sum + convertToBtc(w.amount, w.unit) * states.currentRates.btcToUsd, 0), states.displayCurrency.code)}
                    icon={<Upload className="h-4 w-4 text-orange-400" />}
                    valueColor="text-orange-400"
                  />
                  
                  <HistoryStatsCard
                    title="Transações"
                    value={`${getFilteredHistoryData.investments.length + getFilteredHistoryData.profits.length + getFilteredHistoryData.withdrawals.length}`}
                    icon={<Users className="h-4 w-4 text-purple-400" />}
                    valueColor="text-purple-400"
                  />
                </div>

                {/* Tabelas de Dados */}
                <Tabs value={historyActiveTab} onValueChange={setHistoryActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-4 bg-black/40">
                    <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                    <TabsTrigger value="investments">Investimentos</TabsTrigger>
                    <TabsTrigger value="profits">Lucros/Perdas</TabsTrigger>
                    <TabsTrigger value="withdrawals">Saques</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-4">
                    <Card className="bg-black/30 border border-purple-700/40">
                      <CardHeader>
                        <CardTitle>Resumo do Período</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h4 className="text-sm font-medium text-gray-400 mb-2">Distribuição por Tipo</h4>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span>Investimentos:</span>
                                  <span className="text-blue-400">{getFilteredHistoryData.investments.length}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Lucros:</span>
                                  <span className="text-green-400">{getFilteredHistoryData.profits.filter(p => p.isProfit).length}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Perdas:</span>
                                  <span className="text-red-400">{getFilteredHistoryData.profits.filter(p => !p.isProfit).length}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Saques:</span>
                                  <span className="text-orange-400">{getFilteredHistoryData.withdrawals.length}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="text-sm font-medium text-gray-400 mb-2">Valores Totais (BTC)</h4>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span>Total Investido:</span>
                                  <span className="text-blue-400">
                                    ₿{getFilteredHistoryData.investments.reduce((sum, inv) => sum + convertToBtc(inv.amount, inv.unit), 0).toFixed(8)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Lucro/Perda:</span>
                                  <span className={getFilteredHistoryData.profits.reduce((sum, profit) => {
                                    const btcAmount = convertToBtc(profit.amount, profit.unit);
                                    return sum + (profit.isProfit ? btcAmount : -btcAmount);
                                  }, 0) >= 0 ? "text-green-400" : "text-red-400"}>
                                    ₿{getFilteredHistoryData.profits.reduce((sum, profit) => {
                                      const btcAmount = convertToBtc(profit.amount, profit.unit);
                                      return sum + (profit.isProfit ? btcAmount : -btcAmount);
                                    }, 0).toFixed(8)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Total Sacado:</span>
                                  <span className="text-orange-400">
                                    ₿{getFilteredHistoryData.withdrawals.reduce((sum, w) => sum + convertToBtc(w.amount, w.unit), 0).toFixed(8)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="investments" className="mt-4">
                    <Card className="bg-black/30 border border-purple-700/40">
                      <CardHeader>
                        <CardTitle>Investimentos no Período</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[400px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Unidade</TableHead>
                                <TableHead>Valor (BTC)</TableHead>
                                <TableHead>Valor ({states.displayCurrency.code})</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getFilteredHistoryData.investments.map((investment) => {
                                const btcAmount = convertToBtc(investment.amount, investment.unit);
                                const currencyValue = btcAmount * states.currentRates.btcToUsd * (states.displayCurrency.code === "BRL" ? states.currentRates.brlToUsd : 1);
                                
                                return (
                                  <TableRow key={investment.id}>
                                    <TableCell>{formatDateFn(new Date(investment.date), "dd/MM/yyyy")}</TableCell>
                                    <TableCell>{investment.amount.toLocaleString()}</TableCell>
                                    <TableCell>{investment.unit}</TableCell>
                                    <TableCell>₿{btcAmount.toFixed(8)}</TableCell>
                                    <TableCell>{states.displayCurrency.symbol}{currencyValue.toFixed(2)}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="profits" className="mt-4">
                    <Card className="bg-black/30 border border-purple-700/40">
                      <CardHeader>
                        <CardTitle>Lucros e Perdas no Período</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[400px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Unidade</TableHead>
                                <TableHead>Valor (BTC)</TableHead>
                                <TableHead>Valor ({states.displayCurrency.code})</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getFilteredHistoryData.profits.map((profit) => {
                                const btcAmount = convertToBtc(profit.amount, profit.unit);
                                const currencyValue = btcAmount * states.currentRates.btcToUsd * (states.displayCurrency.code === "BRL" ? states.currentRates.brlToUsd : 1);
                                
                                return (
                                  <TableRow key={profit.id}>
                                    <TableCell>{formatDateFn(new Date(profit.date), "dd/MM/yyyy")}</TableCell>
                                    <TableCell>
                                      <Badge variant={profit.isProfit ? "default" : "destructive"}>
                                        {profit.isProfit ? "Lucro" : "Perda"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>{profit.amount.toLocaleString()}</TableCell>
                                    <TableCell>{profit.unit}</TableCell>
                                    <TableCell className={profit.isProfit ? "text-green-400" : "text-red-400"}>
                                      ₿{btcAmount.toFixed(8)}
                                    </TableCell>
                                    <TableCell className={profit.isProfit ? "text-green-400" : "text-red-400"}>
                                      {states.displayCurrency.symbol}{currencyValue.toFixed(2)}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="withdrawals" className="mt-4">
                    <Card className="bg-black/30 border border-purple-700/40">
                      <CardHeader>
                        <CardTitle>Saques no Período</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[400px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Unidade</TableHead>
                                <TableHead>Valor (BTC)</TableHead>
                                <TableHead>Valor ({states.displayCurrency.code})</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getFilteredHistoryData.withdrawals.map((withdrawal) => {
                                const btcAmount = convertToBtc(withdrawal.amount, withdrawal.unit);
                                const currencyValue = btcAmount * states.currentRates.btcToUsd * (states.displayCurrency.code === "BRL" ? states.currentRates.brlToUsd : 1);
                                
                                return (
                                  <TableRow key={withdrawal.id}>
                                    <TableCell>{formatDateFn(new Date(withdrawal.date), "dd/MM/yyyy")}</TableCell>
                                    <TableCell>{withdrawal.amount.toLocaleString()}</TableCell>
                                    <TableCell>{withdrawal.unit}</TableCell>
                                    <TableCell className="text-orange-400">₿{btcAmount.toFixed(8)}</TableCell>
                                    <TableCell className="text-orange-400">{states.displayCurrency.symbol}{currencyValue.toFixed(2)}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </TabsContent>

            {/* ABA GRÁFICOS */}
            <TabsContent value="charts">
              <div className="space-y-6">
                {/* Controles do Gráfico */}
                <Card className="bg-black/30 border border-purple-700/40">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChartIcon className="h-5 w-5" />
                      Configurações do Gráfico
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>Tipo de Gráfico</Label>
                        <Select value={chartType} onValueChange={(value: "line" | "bar" | "area") => setChartType(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="area">Área</SelectItem>
                            <SelectItem value="line">Linha</SelectItem>
                            <SelectItem value="bar">Barras</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Unidade de Exibição</Label>
                        <Select value={chartDisplayUnit} onValueChange={(value: "btc" | "usd" | "brl") => setChartDisplayUnit(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="btc">Bitcoin (₿)</SelectItem>
                            <SelectItem value="usd">Dólares ($)</SelectItem>
                            <SelectItem value="brl">Reais (R$)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Período</Label>
                        <Select value={chartTimeframe} onValueChange={(value: "daily" | "monthly") => setChartTimeframe(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">Mensal</SelectItem>
                            <SelectItem value="daily">Diário</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Cotação Atual</Label>
                        <div className="text-sm bg-black/40 p-2 rounded border border-purple-700/30">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", 
                              states.usingFallbackRates ? "bg-yellow-400" : "bg-green-400"
                            )}></div>
                            <span>BTC/USD: ${states.currentRates.btcToUsd.toLocaleString()}</span>
                          </div>
                          <div>USD/BRL: R${states.currentRates.brlToUsd.toFixed(2)}</div>
                          {states.usingFallbackRates && (
                            <div className="text-xs text-yellow-400 mt-1">
                              Usando cotação cache
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Controles de Séries Visíveis */}
                      <div className="mt-4 pt-4 border-t border-purple-700/30">
                        <Label className="text-sm font-medium mb-3 block">Séries Visíveis</Label>
                        <div className="flex flex-wrap gap-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="show-investments"
                              checked={chartVisibleSeries.investments}
                              onCheckedChange={(checked) => 
                                setChartVisibleSeries(prev => ({ ...prev, investments: checked }))
                              }
                            />
                            <Label htmlFor="show-investments" className="text-sm flex items-center gap-2">
                              <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                              Investimentos
                            </Label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="show-profits"
                              checked={chartVisibleSeries.profits}
                              onCheckedChange={(checked) => 
                                setChartVisibleSeries(prev => ({ ...prev, profits: checked }))
                              }
                            />
                            <Label htmlFor="show-profits" className="text-sm flex items-center gap-2">
                              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                              Lucros/Perdas
                            </Label>
                          </div>
                          
                          {chartType === "line" && (
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="show-balance"
                                checked={chartVisibleSeries.balance}
                                onCheckedChange={(checked) => 
                                  setChartVisibleSeries(prev => ({ ...prev, balance: checked }))
                                }
                              />
                              <Label htmlFor="show-balance" className="text-sm flex items-center gap-2">
                                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                                Saldo Total
                              </Label>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Gráfico de Evolução */}
                <Card className="bg-black/30 border border-purple-700/40">
                  <CardHeader>
                    <CardTitle>Evolução Patrimonial</CardTitle>
                    <CardDescription>
                      Acompanhe a evolução dos seus investimentos e lucros ao longo do tempo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {getChartData.length === 0 ? (
                      <div className="h-[400px] w-full flex items-center justify-center">
                        <div className="text-center space-y-4">
                          <div className="text-gray-400 text-lg">📊</div>
                          <div className="text-gray-400">
                            Nenhum dado disponível para exibir gráficos
                          </div>
                          <div className="text-sm text-gray-500">
                            Adicione investimentos ou lucros/perdas para visualizar os gráficos
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        {chartType === "area" && (
                          <AreaChart data={getChartData.map(point => ({
                            ...point,
                            investments: convertChartValue(point.investments),
                            profits: convertChartValue(point.profits),
                            balance: convertChartValue(point.balance)
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                              dataKey="month" 
                              stroke="#9CA3AF"
                              fontSize={12}
                            />
                            <YAxis 
                              stroke="#9CA3AF"
                              fontSize={12}
                              tickFormatter={formatChartValue}
                            />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: '#1F2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                color: '#F3F4F6'
                              }}
                              formatter={(value: number, name: string) => [
                                formatChartValue(value),
                                name === 'investments' ? 'Investimentos' :
                                name === 'profits' ? 'Lucros/Perdas' : 'Saldo Total'
                              ]}
                            />
                            <Legend />
                            {chartVisibleSeries.investments && (
                              <Area 
                                type="monotone" 
                                dataKey="investments" 
                                stackId="1"
                                stroke="#3B82F6" 
                                fill="#3B82F6" 
                                fillOpacity={0.6}
                                name="Investimentos"
                              />
                            )}
                            {chartVisibleSeries.profits && (
                              <Area 
                                type="monotone" 
                                dataKey="profits" 
                                stackId="1"
                                stroke="#10B981" 
                                fill="#10B981" 
                                fillOpacity={0.6}
                                name="Lucros/Perdas"
                              />
                            )}
                          </AreaChart>
                        )}
                        
                        {chartType === "line" && (
                          <LineChart data={getChartData.map(point => ({
                            ...point,
                            investments: convertChartValue(point.investments),
                            profits: convertChartValue(point.profits),
                            balance: convertChartValue(point.balance)
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                              dataKey="month" 
                              stroke="#9CA3AF"
                              fontSize={12}
                            />
                            <YAxis 
                              stroke="#9CA3AF"
                              fontSize={12}
                              tickFormatter={formatChartValue}
                            />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: '#1F2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                color: '#F3F4F6'
                              }}
                              formatter={(value: number, name: string) => [
                                formatChartValue(value),
                                name === 'investments' ? 'Investimentos' :
                                name === 'profits' ? 'Lucros/Perdas' : 'Saldo Total'
                              ]}
                            />
                            <Legend />
                            {chartVisibleSeries.investments && (
                              <Line 
                                type="monotone" 
                                dataKey="investments" 
                                stroke="#3B82F6" 
                                strokeWidth={3}
                                name="Investimentos"
                                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                              />
                            )}
                            {chartVisibleSeries.profits && (
                              <Line 
                                type="monotone" 
                                dataKey="profits" 
                                stroke="#10B981" 
                                strokeWidth={3}
                                name="Lucros/Perdas"
                                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                              />
                            )}
                            {chartVisibleSeries.balance && (
                              <Line 
                                type="monotone" 
                                dataKey="balance" 
                                stroke="#F59E0B" 
                                strokeWidth={3}
                                name="Saldo Total"
                                dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                              />
                            )}
                          </LineChart>
                        )}
                        
                        {chartType === "bar" && (
                          <BarChart data={getChartData.map(point => ({
                            ...point,
                            investments: convertChartValue(point.investments),
                            profits: convertChartValue(point.profits),
                            balance: convertChartValue(point.balance)
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                              dataKey="month" 
                              stroke="#9CA3AF"
                              fontSize={12}
                            />
                            <YAxis 
                              stroke="#9CA3AF"
                              fontSize={12}
                              tickFormatter={formatChartValue}
                            />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: '#1F2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                color: '#F3F4F6'
                              }}
                              formatter={(value: number, name: string) => [
                                formatChartValue(value),
                                name === 'investments' ? 'Investimentos' :
                                name === 'profits' ? 'Lucros/Perdas' : 'Saldo Total'
                              ]}
                            />
                            <Legend />
                            {chartVisibleSeries.investments && (
                              <Bar 
                                dataKey="investments" 
                                fill="#3B82F6" 
                                name="Investimentos"
                                radius={[2, 2, 0, 0]}
                              />
                            )}
                            {chartVisibleSeries.profits && (
                              <Bar 
                                dataKey="profits" 
                                fill="#10B981" 
                                name="Lucros/Perdas"
                                radius={[2, 2, 0, 0]}
                              />
                            )}
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                    )}
                  </CardContent>
                </Card>

                {/* Gráficos de Pizza - Distribuição */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gráfico de Pizza - Investimentos vs Lucros */}
                  <Card className="bg-black/30 border border-purple-700/40">
                    <CardHeader>
                      <CardTitle>Composição do Patrimônio</CardTitle>
                      <CardDescription>
                        Distribuição entre investimentos e lucros/perdas
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!currentActiveReportObjectFromHook || 
                       ((!currentActiveReportObjectFromHook.investments || currentActiveReportObjectFromHook.investments.length === 0) &&
                        (!currentActiveReportObjectFromHook.profits || currentActiveReportObjectFromHook.profits.length === 0)) ? (
                        <div className="h-[300px] w-full flex items-center justify-center">
                          <div className="text-center space-y-2">
                            <div className="text-gray-400 text-lg">🥧</div>
                            <div className="text-gray-400 text-sm">
                              Sem dados para composição
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                            <Pie
                              data={[
                                {
                                  name: 'Investimentos',
                                  value: convertChartValue(
                                    (currentActiveReportObjectFromHook?.investments || [])
                                      .reduce((sum, inv) => sum + convertToBtc(inv.amount, inv.unit), 0)
                                  ),
                                  fill: '#3B82F6'
                                },
                                {
                                  name: 'Lucros/Perdas',
                                  value: Math.abs(convertChartValue(
                                    (currentActiveReportObjectFromHook?.profits || [])
                                      .reduce((sum, profit) => {
                                        const btcAmount = convertToBtc(profit.amount, profit.unit);
                                        return sum + (profit.isProfit ? btcAmount : -btcAmount);
                                      }, 0)
                                  )),
                                  fill: '#10B981'
                                }
                              ]}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                            </Pie>
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: '#1F2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                color: '#F3F4F6'
                              }}
                              formatter={(value: number) => formatChartValue(value)}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Estatísticas Resumidas */}
                  <Card className="bg-black/30 border border-purple-700/40">
                    <CardHeader>
                      <CardTitle>Estatísticas do Período</CardTitle>
                      <CardDescription>
                        Métricas principais dos investimentos
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {!reportSummaryData ? (
                          <div className="text-center py-8">
                            <div className="text-gray-400 text-sm">
                              Nenhum relatório ativo selecionado
                            </div>
                          </div>
                        ) : reportSummaryData.totalInvestmentsBtc === 0 && reportSummaryData.operationalProfitBtc === 0 ? (
                          <div className="text-center py-8">
                            <div className="text-gray-400 text-sm">
                              Adicione investimentos ou lucros/perdas para ver as estatísticas
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-400">Total Investido:</span>
                              <span className="text-blue-400 font-medium">
                                {formatChartValue(convertChartValue(reportSummaryData.totalInvestmentsBtc))}
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-400">Lucro/Perda Operacional:</span>
                              <span className={`font-medium ${reportSummaryData.operationalProfitBtc >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {formatChartValue(convertChartValue(reportSummaryData.operationalProfitBtc))}
                              </span>
                            </div>
                            
                            {reportSummaryData.hasWithdrawals && (
                              <>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-400">Total Sacado:</span>
                                  <span className="text-orange-400 font-medium">
                                    {formatChartValue(convertChartValue(reportSummaryData.totalWithdrawalsBtc))}
                                  </span>
                                </div>
                                
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-400">Saldo Atual:</span>
                                  <span className="text-purple-400 font-medium">
                                    {formatChartValue(convertChartValue(reportSummaryData.currentBalanceBtc))}
                                  </span>
                                </div>
                              </>
                            )}
                            
                            <div className="border-t border-purple-700/30 pt-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">ROI:</span>
                                <span className={`font-bold ${reportSummaryData.operationalProfitBtc >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {reportSummaryData.totalInvestmentsBtc > 0 
                                    ? `${((reportSummaryData.operationalProfitBtc / reportSummaryData.totalInvestmentsBtc) * 100).toFixed(2)}%`
                                    : '0.00%'
                                  }
                                </span>
                              </div>
                            </div>
                            
                            {reportSummaryData.averageBuyPriceUsd > 0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">Preço Médio de Compra:</span>
                                <span className="text-yellow-400 font-medium">
                                  ${reportSummaryData.averageBuyPriceUsd.toFixed(2)}
                                </span>
                              </div>
                            )}
                            
                            {reportSummaryData.valuationProfitUsd !== 0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">Lucro de Valorização:</span>
                                <span className={`font-medium ${reportSummaryData.valuationProfitUsd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  ${reportSummaryData.valuationProfitUsd.toFixed(2)}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Informações sobre os Dados */}
                <Card className="bg-black/30 border border-purple-700/40">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span>Investimentos</span>
                      <div className="w-2 h-2 bg-green-400 rounded-full ml-4"></div>
                      <span>Lucros/Perdas</span>
                      <div className="w-2 h-2 bg-yellow-400 rounded-full ml-4"></div>
                      <span>Saldo Total</span>
                      <div className="w-2 h-2 bg-orange-400 rounded-full ml-4"></div>
                      <span>Saques</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      * Valores baseados na cotação atual: ${states.currentRates.btcToUsd.toLocaleString()} USD/BTC
                      {states.usingFallbackRates && (
                        <span className="ml-2 text-yellow-400">(usando cotação cache)</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

// NOVA Função para testar manualmente o addInvestment
const testAddInvestment = () => {
  if (!currentActiveReportObjectFromHook) {
    toast({
      title: "❌ Erro no teste",
      description: "Nenhum relatório ativo encontrado",
      variant: "destructive",
    });
    return;
  }

  const testInvestment = {
    date: new Date().toISOString().split('T')[0],
    amount: 100000, // 100k sats
    unit: 'SATS' as const,
    originalId: `test_${Date.now()}`
  };

  console.log('[testAddInvestment] Testando adição de investimento:', {
    reportId: currentActiveReportObjectFromHook.id,
    reportName: currentActiveReportObjectFromHook.name,
    testInvestment,
    currentInvestmentsCount: currentActiveReportObjectFromHook.investments?.length || 0
  });

  try {
    const result = addInvestment(testInvestment, currentActiveReportObjectFromHook.id, { suppressToast: false });
    
    console.log('[testAddInvestment] Resultado do teste:', result);
    
    toast({
      title: result.status === 'added' ? "✅ Teste bem-sucedido" : "⚠️ Teste com problema",
      description: (
        <div className="space-y-1 text-xs">
          <div>Status: {result.status}</div>
          <div>ID: {result.id || 'N/A'}</div>
          <div>Mensagem: {result.message}</div>
        </div>
      ),
      variant: result.status === 'added' ? "default" : "destructive",
    });
  } catch (error) {
    console.error('[testAddInvestment] Erro durante teste:', error);
    toast({
      title: "❌ Erro no teste",
      description: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      variant: "destructive",
    });
  }
};
