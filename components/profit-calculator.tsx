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
import type { LNMarketsCredentials, LNMarketsAPIConfig, LNMarketsMultipleConfig } from "./types/ln-markets-types";

// Tipo atualizado para estatísticas de importação
interface LNMarketsImportStats {
  trades?: {
    total: number;
    imported: number;
    duplicated: number;
    errors: number;
    processed?: number;
    pagesSearched?: number;
    stoppedReason?: 'emptyPages' | 'duplicates' | 'maxPages' | 'noMoreData';
  };
  deposits?: {
    total: number;
    imported: number;
    duplicated: number;
    errors: number;
    skipped?: number;
    processed?: number;
    confirmedCount?: number;
    statusDistribution?: Record<string, number>;
  };
  withdrawals?: {
    total: number;
    imported: number;
    duplicated: number;
    errors: number;
    processed?: number;
    confirmedCount?: number;
    statusDistribution?: Record<string, number>;
  };
}
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
  const [chartType, setChartType] = useState<"line" | "bar" | "area">("bar");
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
      
      // Carregar estatísticas de importação do localStorage
      try {
        const savedStats = localStorage.getItem(`importStats_${user.email}`);
        if (savedStats) {
          const parsedStats = JSON.parse(savedStats);
          // Verificar se as estatísticas não são muito antigas (24 horas)
          const statsAge = Date.now() - (parsedStats.timestamp || 0);
          if (statsAge < 24 * 60 * 60 * 1000) {
            setImportStats(parsedStats.data);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar estatísticas de importação:', error);
      }
    }
  }, [user?.email]);

  // Effect para salvar estatísticas de importação no localStorage
  useEffect(() => {
    if (user?.email && importStats) {
      try {
        const dataToSave = {
          data: importStats,
          timestamp: Date.now(),
          configId: selectedConfigForImport
        };
        localStorage.setItem(`importStats_${user.email}`, JSON.stringify(dataToSave));
      } catch (error) {
        console.error('Erro ao salvar estatísticas de importação:', error);
      }
    }
  }, [importStats, user?.email, selectedConfigForImport]);

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
    console.log('[handleImportTrades] Iniciando importação otimizada de trades');
    
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
      trades: { current: 0, total: 0, percentage: 0, status: 'loading', message: 'Iniciando busca otimizada...' }
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
      
      // CORRIGIDO: Sistema robusto de importação com detecção de parada inteligente
      let allTrades: any[] = [];
      let currentOffset = 0;
      let hasMoreData = true;
      let consecutiveEmptyPages = 0;
      let consecutiveUnproductivePages = 0; // NOVO: Páginas sem trades válidos
      let totalDuplicatesFound = 0;
      const batchSize = 100;
      const maxConsecutiveEmptyPages = 3;
      const maxConsecutiveUnproductivePages = 5; // NOVO: Máximo de páginas sem trades válidos
      const maxRetries = 3;
      const maxTotalTrades = 2000; // REDUZIDO: Limite mais conservador
      const maxOffsetLimit = 10000; // NOVO: Limite absoluto de offset
      
      console.log('[handleImportTrades] Iniciando busca paginada otimizada...');
      
      // NOVO: Criar Set com IDs existentes para verificação rápida de duplicatas
      const existingTradeIds = new Set(
        currentActiveReportObjectFromHook.profits
          ?.filter(profit => profit.originalId?.startsWith('trade_'))
          .map(profit => profit.originalId) || []
      );
      
      console.log('[handleImportTrades] IDs existentes carregados:', {
        existingCount: existingTradeIds.size,
        sampleIds: Array.from(existingTradeIds).slice(0, 5)
      });
      
      while (hasMoreData && allTrades.length < maxTotalTrades && consecutiveEmptyPages < maxConsecutiveEmptyPages && consecutiveUnproductivePages < maxConsecutiveUnproductivePages && currentOffset < maxOffsetLimit) {
        console.log(`[handleImportTrades] Buscando lote: offset=${currentOffset}, limit=${batchSize}`);
        
        // Atualizar progresso
        setImportProgress(prev => ({
          ...prev,
          trades: { 
            current: allTrades.length, 
            total: Math.max(allTrades.length + batchSize, 100), // Estimativa dinâmica
            percentage: Math.min((allTrades.length / Math.max(allTrades.length + batchSize, 100)) * 100, 95), 
            status: 'loading', 
            message: `Buscando trades... (${allTrades.length} encontrados, ${totalDuplicatesFound} duplicatas)` 
          }
        }));
        
        // NOVO: Sistema de retry para requisições
        let response: any = null;
        let retryCount = 0;
        
        while (retryCount < maxRetries && !response?.success) {
          try {
            response = await fetchLNMarketsTrades(user.email, config.id, {
              limit: batchSize,
              offset: currentOffset
            });
            
            if (!response.success && retryCount < maxRetries - 1) {
              console.warn(`[handleImportTrades] Tentativa ${retryCount + 1} falhou, tentando novamente em 2s...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
              retryCount++;
            }
          } catch (error) {
            console.error(`[handleImportTrades] Erro na tentativa ${retryCount + 1}:`, error);
            if (retryCount < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, 2000));
              retryCount++;
            } else {
              throw error;
            }
          }
        }

        console.log(`[handleImportTrades] Resposta do lote offset=${currentOffset}:`, {
          success: response?.success,
          hasData: !!response?.data,
          dataLength: response?.data?.length,
          isEmpty: response?.isEmpty,
          retryCount: retryCount
        });

        if (!response?.success || !response?.data) {
          if (currentOffset === 0) {
            throw new Error(response?.error || "Erro ao buscar trades");
          } else {
            console.log(`[handleImportTrades] Erro no offset ${currentOffset}, parando busca:`, response?.error);
            break;
          }
        }

        const pageData = response.data;
        
        // CORRIGIDO: Verificar se a página está vazia ou se a API indica fim dos dados
        const isEmpty = response.isEmpty || pageData.length === 0;
        const isLastPage = pageData.length < batchSize; // API retornou menos que o solicitado
        
        if (isEmpty) {
          consecutiveEmptyPages++;
          console.log(`[handleImportTrades] Lote offset=${currentOffset} vazio. Páginas vazias consecutivas: ${consecutiveEmptyPages}`);
          
          if (consecutiveEmptyPages >= maxConsecutiveEmptyPages) {
            console.log(`[handleImportTrades] Encontradas ${consecutiveEmptyPages} páginas vazias consecutivas. Parando busca.`);
            break;
          }
        } else {
          consecutiveEmptyPages = 0; // Reset contador se encontrou dados
        }
        
        // NOVO: Verificar se chegamos ao fim dos dados da API
        if (isLastPage) {
          console.log(`[handleImportTrades] Última página detectada: ${pageData.length} trades (menos que ${batchSize}). Parando busca.`);
          hasMoreData = false;
        }
        
                 // NOVO: Validar e filtrar trades válidos antes de adicionar
         const validTrades = pageData.filter(trade => {
           // Verificação rápida de duplicata usando Set
           const tradeId = `trade_${trade.uid || trade.id}`;
           if (existingTradeIds.has(tradeId)) {
             totalDuplicatesFound++;
             return false; // Não adicionar duplicatas à lista
           }
           
           // Validação completa do trade
           const validation = validateTradeForImport(trade);
           if (!validation.isValid) {
             console.warn(`[handleImportTrades] Trade inválido ignorado: ${validation.reason}`, { 
               id: trade.id || trade.uid, 
               closed: trade.closed, 
               pl: trade.pl 
             });
             return false;
           }
           
           return true;
         });
        
        console.log(`[handleImportTrades] Lote offset=${currentOffset}: ${pageData.length} trades brutos, ${validTrades.length} válidos, ${pageData.length - validTrades.length} filtrados`);
        
        // NOVO: Verificar se a página foi produtiva (trouxe trades válidos)
        if (validTrades.length === 0 && pageData.length > 0) {
          consecutiveUnproductivePages++;
          console.log(`[handleImportTrades] Página improdutiva (sem trades válidos). Consecutivas: ${consecutiveUnproductivePages}`);
          
          if (consecutiveUnproductivePages >= maxConsecutiveUnproductivePages) {
            console.log(`[handleImportTrades] Encontradas ${consecutiveUnproductivePages} páginas improdutivas consecutivas. Parando busca.`);
            break;
          }
        } else if (validTrades.length > 0) {
          consecutiveUnproductivePages = 0; // Reset contador se encontrou trades válidos
          
          // Adicionar apenas trades válidos
          allTrades.push(...validTrades);
          
          // Adicionar IDs ao Set para próximas verificações
          validTrades.forEach(trade => {
            const tradeId = `trade_${trade.uid || trade.id}`;
            existingTradeIds.add(tradeId);
          });
        }
        
        currentOffset += batchSize;
        
        // NOVO: Monitorar progresso da busca
        monitorSearchProgress(
          currentOffset, 
          allTrades, 
          totalDuplicatesFound, 
          consecutiveEmptyPages, 
          consecutiveUnproductivePages,
          maxOffsetLimit,
          maxTotalTrades
        );
        
        // NOVO: Verificar múltiplas condições de parada antes de continuar
        if (!hasMoreData) {
          console.log(`[handleImportTrades] Parando: hasMoreData = false`);
          break;
        }
        
        if (allTrades.length >= maxTotalTrades) {
          console.log(`[handleImportTrades] Parando: limite de trades atingido (${allTrades.length}/${maxTotalTrades})`);
          break;
        }
        
        if (currentOffset >= maxOffsetLimit) {
          console.log(`[handleImportTrades] Parando: limite de offset atingido (${currentOffset}/${maxOffsetLimit})`);
          break;
        }
        
        // Pequeno delay entre requisições para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log('[handleImportTrades] Busca paginada concluída:', {
        totalTradesFound: allTrades.length,
        totalDuplicatesSkipped: totalDuplicatesFound,
        offsetsSearched: Math.ceil(currentOffset / batchSize),
        consecutiveEmptyPages,
        consecutiveUnproductivePages,
        finalOffset: currentOffset,
        stoppedReason: consecutiveEmptyPages >= maxConsecutiveEmptyPages ? 'emptyPages' :
                      consecutiveUnproductivePages >= maxConsecutiveUnproductivePages ? 'unproductivePages' :
                      allTrades.length >= maxTotalTrades ? 'maxTradesLimit' :
                      currentOffset >= maxOffsetLimit ? 'maxOffsetLimit' :
                      !hasMoreData ? 'apiEndOfData' : 'unknown'
      });

             // Como já validamos os trades durante a busca, todos são válidos para processamento
       const tradesToProcess = allTrades;
       const totalTrades = tradesToProcess.length;
      
      console.log('[handleImportTrades] Trades para processamento:', {
        totalFound: allTrades.length,
        validForProcessing: totalTrades,
        filtered: allTrades.length - totalTrades
      });
      
      let imported = 0;
      let duplicated = totalDuplicatesFound; // Já contamos as duplicatas durante a busca
      let errors = 0;
      let processed = 0;

      // Atualizar progresso inicial do processamento
      setImportProgress(prev => ({
        ...prev,
        trades: { 
          current: 0, 
          total: totalTrades, 
          percentage: 0, 
          status: 'loading', 
          message: `Processando ${totalTrades} trades válidos...` 
        }
      }));

      // NOVO: Processamento robusto com verificação de integridade
      const processingBatchSize = 5; // Reduzido para melhor controle de integridade
      
      console.log(`[handleImportTrades] Processando ${totalTrades} trades com verificação de integridade em lotes de ${processingBatchSize}...`);
      
      for (let i = 0; i < tradesToProcess.length; i += processingBatchSize) {
        const batch = tradesToProcess.slice(i, i + processingBatchSize);
        const batchId = `trades_batch_${Math.floor(i / processingBatchSize) + 1}`;
        
        console.log(`[handleImportTrades] Processando lote ${Math.floor(i / processingBatchSize) + 1}/${Math.ceil(tradesToProcess.length / processingBatchSize)}: ${batch.length} trades`);
        
        // Usar sistema robusto de processamento em lote
        const batchResult = await processBatchWithIntegrity(
          'trade',
          batch,
          convertTradeToProfit,
          batchId
        );
        
        // Atualizar contadores
        imported += batchResult.imported;
        duplicated += batchResult.duplicated;
        errors += batchResult.errors;
        processed += batch.length;
        
        console.log(`[handleImportTrades] Lote ${batchId} concluído:`, {
          imported: batchResult.imported,
          duplicated: batchResult.duplicated,
          errors: batchResult.errors,
          totalImported: imported,
          totalDuplicated: duplicated,
          totalErrors: errors
        });
        
        // Atualizar progresso após cada lote
        const percentage = (processed / totalTrades) * 100;
        setImportProgress(prev => ({
          ...prev,
          trades: {
            current: processed,
            total: totalTrades,
            percentage,
            status: 'loading',
            message: `Processando com integridade... ${imported} importados, ${duplicated} duplicados, ${errors} erros`
          }
        }));
        
        // Delay entre lotes para permitir verificações de integridade
        if (i + processingBatchSize < tradesToProcess.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
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
        trades: { 
          total: allTrades.length, 
          imported, 
          duplicated, 
          errors,
          processed: totalTrades,
          pagesSearched: Math.ceil(currentOffset / batchSize),
          stoppedReason: consecutiveEmptyPages >= maxConsecutiveEmptyPages ? 'emptyPages' :
                        consecutiveUnproductivePages >= maxConsecutiveUnproductivePages ? 'unproductivePages' :
                        allTrades.length >= maxTotalTrades ? 'maxTradesLimit' :
                        currentOffset >= maxOffsetLimit ? 'maxOffsetLimit' :
                        !hasMoreData ? 'apiEndOfData' : 'unknown'
        },
        deposits: prev?.deposits || { total: 0, imported: 0, duplicated: 0, errors: 0 },
        withdrawals: prev?.withdrawals || { total: 0, imported: 0, duplicated: 0, errors: 0 },
      }));

      console.log('[handleImportTrades] Importação concluída:', {
        totalProcessed: processed,
        imported,
        duplicated,
        errors,
        configName: config.name
      });

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
              <div>Configuração: "{config.name}"</div>
              <div>Busca otimizada: {allTrades.length} trades analisados em {Math.ceil(currentOffset / batchSize)} páginas</div>
              <div>Processamento em lotes: {Math.ceil(totalTrades / processingBatchSize)} lotes</div>
              {consecutiveEmptyPages >= maxConsecutiveEmptyPages && (
                <div className="text-blue-400">🎯 Parou: {consecutiveEmptyPages} páginas vazias consecutivas</div>
              )}
              {consecutiveUnproductivePages >= maxConsecutiveUnproductivePages && (
                <div className="text-yellow-400">⚠️ Parou: {consecutiveUnproductivePages} páginas improdutivas consecutivas</div>
              )}
              {allTrades.length >= maxTotalTrades && (
                <div className="text-orange-400">🛑 Parou: limite de {maxTotalTrades} trades atingido</div>
              )}
              {currentOffset >= maxOffsetLimit && (
                <div className="text-red-400">🚫 Parou: limite de offset {maxOffsetLimit} atingido</div>
              )}
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

  // Função auxiliar para verificar se um depósito está confirmado
  const isDepositConfirmed = (deposit: any): boolean => {
    // Verificar diferentes atributos dependendo do tipo de depósito:
    // 1. Depósitos on-chain: is_confirmed: true
    // 2. Depósitos internos: success: true  
    // 3. Depósitos não confirmados: isConfirmed: false
    
    // Se explicitamente não confirmado
    if (deposit.isConfirmed === false) {
      return false;
    }
    
    // Se é depósito on-chain confirmado
    if (deposit.is_confirmed === true) {
      return true;
    }
    
    // Se é depósito interno bem-sucedido
    if (deposit.success === true) {
      return true;
    }
    
    // Se tem isConfirmed true (caso padrão antigo)
    if (deposit.isConfirmed === true) {
      return true;
    }
    
    // Se nenhum indicador negativo, considerar confirmado (fallback)
    return deposit.isConfirmed !== false && deposit.is_confirmed !== false && deposit.success !== false;
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

      // NOVO: Verificar estado atual do relatório antes de começar
      console.log('[handleImportDeposits] Estado do relatório antes da importação:', {
        reportId: currentActiveReportObjectFromHook.id,
        currentInvestmentsCount: currentActiveReportObjectFromHook.investments?.length || 0,
        existingInvestmentIds: currentActiveReportObjectFromHook.investments?.map(inv => inv.originalId) || [],
        lastInvestment: currentActiveReportObjectFromHook.investments?.slice(-1)[0] || null
      });

      let imported = 0;
      let duplicated = 0;
      let errors = 0;
      let processed = 0;
      let skipped = 0; // Contador para depósitos não confirmados

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

      // NOVO: Filtrar depósitos confirmados antes do processamento
      const confirmedDeposits = deposits.filter(isDepositConfirmed);
      const skippedCount = deposits.length - confirmedDeposits.length;
      
      console.log(`[handleImportDeposits] Filtragem de depósitos:`, {
        total: deposits.length,
        confirmed: confirmedDeposits.length,
        skipped: skippedCount
      });

      // NOVO: Processar depósitos confirmados com sistema robusto
      const processingBatchSize = 5; // Lotes menores para melhor controle
      
      console.log(`[handleImportDeposits] Processando ${confirmedDeposits.length} depósitos confirmados com verificação de integridade em lotes de ${processingBatchSize}...`);
      
      for (let i = 0; i < confirmedDeposits.length; i += processingBatchSize) {
        const batch = confirmedDeposits.slice(i, i + processingBatchSize);
        const batchId = `deposits_batch_${Math.floor(i / processingBatchSize) + 1}`;
        
        console.log(`[handleImportDeposits] Processando lote ${Math.floor(i / processingBatchSize) + 1}/${Math.ceil(confirmedDeposits.length / processingBatchSize)}: ${batch.length} depósitos`);
        
        // Usar sistema robusto de processamento em lote
        const batchResult = await processBatchWithIntegrity(
          'deposit',
          batch,
          convertDepositToInvestment,
          batchId
        );
        
        // Atualizar contadores
        imported += batchResult.imported;
        duplicated += batchResult.duplicated;
        errors += batchResult.errors;
        processed += batch.length;
        
        console.log(`[handleImportDeposits] Lote ${batchId} concluído:`, {
          imported: batchResult.imported,
          duplicated: batchResult.duplicated,
          errors: batchResult.errors,
          totalImported: imported,
          totalDuplicated: duplicated,
          totalErrors: errors
        });
        
        // Atualizar progresso após cada lote
        const percentage = (processed / confirmedDeposits.length) * 100;
        setImportProgress(prev => ({
          ...prev,
          deposits: {
            current: processed,
            total: confirmedDeposits.length,
            percentage,
            status: 'loading',
            message: `Processando com integridade... ${imported} importados, ${duplicated} duplicados, ${skippedCount} não confirmados`
          }
        }));
        
        // Delay entre lotes para permitir verificações de integridade
        if (i + processingBatchSize < confirmedDeposits.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Adicionar depósitos não confirmados ao contador de ignorados
      skipped = skippedCount;

      // NOVO: Verificar estado do relatório após a importação
      console.log('[handleImportDeposits] Estado do relatório após a importação:', {
        reportId: currentActiveReportObjectFromHook.id,
        finalInvestmentsCount: currentActiveReportObjectFromHook.investments?.length || 0,
        newInvestmentIds: currentActiveReportObjectFromHook.investments?.slice(-Math.max(imported, 5)).map(inv => inv.originalId) || [],
        lastInvestment: currentActiveReportObjectFromHook.investments?.slice(-1)[0] || null,
        importStats: { imported, duplicated, skipped, errors, processed }
      });

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
        deposits: { 
          total: deposits.length, 
          imported, 
          duplicated, 
          errors,
          skipped,
          processed: totalDeposits,
          confirmedCount: deposits.filter(isDepositConfirmed).length,
          statusDistribution: deposits.reduce((acc, d) => {
            acc[d.status] = (acc[d.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        },
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
            <div className="text-xs text-gray-400 mt-2">
              Lógica: is_confirmed=true (on-chain) OU success=true (interno) OU outros atributos positivos
            </div>
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

      // NOVO: Processar saques com sistema robusto de verificação de integridade
      const processingBatchSize = 5; // Lotes menores para melhor controle
      
      console.log(`[handleImportWithdrawals] Processando ${totalWithdrawals} saques com verificação de integridade em lotes de ${processingBatchSize}...`);
      
      for (let i = 0; i < response.data.length; i += processingBatchSize) {
        const batch = response.data.slice(i, i + processingBatchSize);
        const batchId = `withdrawals_batch_${Math.floor(i / processingBatchSize) + 1}`;
        
        console.log(`[handleImportWithdrawals] Processando lote ${Math.floor(i / processingBatchSize) + 1}/${Math.ceil(response.data.length / processingBatchSize)}: ${batch.length} saques`);
        
        // Usar sistema robusto de processamento em lote
        const batchResult = await processBatchWithIntegrity(
          'withdrawal',
          batch,
          convertWithdrawalToRecord,
          batchId
        );
        
        // Atualizar contadores
        imported += batchResult.imported;
        duplicated += batchResult.duplicated;
        errors += batchResult.errors;
        processed += batch.length;
        
        console.log(`[handleImportWithdrawals] Lote ${batchId} concluído:`, {
          imported: batchResult.imported,
          duplicated: batchResult.duplicated,
          errors: batchResult.errors,
          totalImported: imported,
          totalDuplicated: duplicated,
          totalErrors: errors
        });
        
        // Atualizar progresso após cada lote
        const percentage = (processed / totalWithdrawals) * 100;
        setImportProgress(prev => ({
          ...prev,
          withdrawals: {
            current: processed,
            total: totalWithdrawals,
            percentage,
            status: 'loading',
            message: `Processando com integridade... ${imported} importados, ${duplicated} duplicados, ${errors} erros`
          }
        }));
        
        // Delay entre lotes para permitir verificações de integridade
        if (i + processingBatchSize < response.data.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
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
        withdrawals: { 
          total: response.data?.length || 0, 
          imported, 
          duplicated, 
          errors,
          processed: totalWithdrawals,
          confirmedCount: response.data?.length || 0, // Todos são processados agora
          statusDistribution: response.data?.reduce((acc, w) => {
            acc[w.status] = (acc[w.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>) || {}
        },
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
              Política: Todos os saques são importados independente do status
            </div>
            <div className="text-xs text-gray-400">
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

  // NOVA: Função de diagnóstico para verificar integridade dos dados
  const runDataIntegrityDiagnostic = useCallback(async () => {
    if (!currentActiveReportObjectFromHook) {
      toast({
        title: "❌ Erro no diagnóstico",
        description: "Nenhum relatório ativo encontrado",
        variant: "destructive",
      });
      return;
    }

    console.log('[runDataIntegrityDiagnostic] Iniciando diagnóstico de integridade dos dados...');

    const report = currentActiveReportObjectFromHook;
    const diagnosticResults = {
      investments: {
        total: report.investments?.length || 0,
        withOriginalId: 0,
        withValidDates: 0,
        withValidAmounts: 0,
        duplicateOriginalIds: [] as string[],
        invalidRecords: [] as any[]
      },
      profits: {
        total: report.profits?.length || 0,
        withOriginalId: 0,
        withValidDates: 0,
        withValidAmounts: 0,
        duplicateOriginalIds: [] as string[],
        invalidRecords: [] as any[]
      },
      withdrawals: {
        total: report.withdrawals?.length || 0,
        withOriginalId: 0,
        withValidDates: 0,
        withValidAmounts: 0,
        duplicateOriginalIds: [] as string[],
        invalidRecords: [] as any[]
      }
    };

    // Verificar investimentos
    const investmentOriginalIds = new Set<string>();
    report.investments?.forEach((inv, index) => {
      if (inv.originalId) {
        diagnosticResults.investments.withOriginalId++;
        if (investmentOriginalIds.has(inv.originalId)) {
          diagnosticResults.investments.duplicateOriginalIds.push(inv.originalId);
        } else {
          investmentOriginalIds.add(inv.originalId);
        }
      }
      
      if (inv.date && /^\d{4}-\d{2}-\d{2}$/.test(inv.date)) {
        diagnosticResults.investments.withValidDates++;
      }
      
      if (typeof inv.amount === 'number' && inv.amount > 0 && isFinite(inv.amount)) {
        diagnosticResults.investments.withValidAmounts++;
      } else {
        diagnosticResults.investments.invalidRecords.push({ index, id: inv.id, amount: inv.amount });
      }
    });

    // Verificar lucros/perdas
    const profitOriginalIds = new Set<string>();
    report.profits?.forEach((profit, index) => {
      if (profit.originalId) {
        diagnosticResults.profits.withOriginalId++;
        if (profitOriginalIds.has(profit.originalId)) {
          diagnosticResults.profits.duplicateOriginalIds.push(profit.originalId);
        } else {
          profitOriginalIds.add(profit.originalId);
        }
      }
      
      if (profit.date && /^\d{4}-\d{2}-\d{2}$/.test(profit.date)) {
        diagnosticResults.profits.withValidDates++;
      }
      
      if (typeof profit.amount === 'number' && profit.amount > 0 && isFinite(profit.amount)) {
        diagnosticResults.profits.withValidAmounts++;
      } else {
        diagnosticResults.profits.invalidRecords.push({ index, id: profit.id, amount: profit.amount });
      }
    });

    // Verificar saques
    const withdrawalOriginalIds = new Set<string>();
    report.withdrawals?.forEach((withdrawal, index) => {
      if (withdrawal.originalId) {
        diagnosticResults.withdrawals.withOriginalId++;
        if (withdrawalOriginalIds.has(withdrawal.originalId)) {
          diagnosticResults.withdrawals.duplicateOriginalIds.push(withdrawal.originalId);
        } else {
          withdrawalOriginalIds.add(withdrawal.originalId);
        }
      }
      
      if (withdrawal.date && /^\d{4}-\d{2}-\d{2}$/.test(withdrawal.date)) {
        diagnosticResults.withdrawals.withValidDates++;
      }
      
      if (typeof withdrawal.amount === 'number' && withdrawal.amount > 0 && isFinite(withdrawal.amount)) {
        diagnosticResults.withdrawals.withValidAmounts++;
      } else {
        diagnosticResults.withdrawals.invalidRecords.push({ index, id: withdrawal.id, amount: withdrawal.amount });
      }
    });

    console.log('[runDataIntegrityDiagnostic] Resultados do diagnóstico:', diagnosticResults);

    // Calcular pontuação de integridade
    const totalRecords = diagnosticResults.investments.total + diagnosticResults.profits.total + diagnosticResults.withdrawals.total;
    const validRecords = 
      diagnosticResults.investments.withValidAmounts + 
      diagnosticResults.profits.withValidAmounts + 
      diagnosticResults.withdrawals.withValidAmounts;
    
    const integrityScore = totalRecords > 0 ? (validRecords / totalRecords) * 100 : 100;
    
    const totalDuplicates = 
      diagnosticResults.investments.duplicateOriginalIds.length +
      diagnosticResults.profits.duplicateOriginalIds.length +
      diagnosticResults.withdrawals.duplicateOriginalIds.length;

    const totalInvalidRecords = 
      diagnosticResults.investments.invalidRecords.length +
      diagnosticResults.profits.invalidRecords.length +
      diagnosticResults.withdrawals.invalidRecords.length;

    toast({
      title: `🔍 Diagnóstico de Integridade - ${integrityScore.toFixed(1)}%`,
      description: (
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="font-semibold">Investimentos</div>
              <div>Total: {diagnosticResults.investments.total}</div>
              <div>Válidos: {diagnosticResults.investments.withValidAmounts}</div>
            </div>
            <div>
              <div className="font-semibold">Lucros/Perdas</div>
              <div>Total: {diagnosticResults.profits.total}</div>
              <div>Válidos: {diagnosticResults.profits.withValidAmounts}</div>
            </div>
            <div>
              <div className="font-semibold">Saques</div>
              <div>Total: {diagnosticResults.withdrawals.total}</div>
              <div>Válidos: {diagnosticResults.withdrawals.withValidAmounts}</div>
            </div>
          </div>
          
          {totalDuplicates > 0 && (
            <div className="text-yellow-400">
              ⚠️ {totalDuplicates} IDs originais duplicados encontrados
            </div>
          )}
          
          {totalInvalidRecords > 0 && (
            <div className="text-red-400">
              ❌ {totalInvalidRecords} registros com valores inválidos
            </div>
          )}
          
          {integrityScore === 100 && totalDuplicates === 0 && (
            <div className="text-green-400">
              ✅ Todos os dados estão íntegros!
            </div>
          )}
        </div>
      ),
      variant: integrityScore >= 95 && totalDuplicates === 0 ? "default" : "destructive",
      className: integrityScore >= 95 && totalDuplicates === 0 ? "border-green-500/50 bg-green-900/20" : "border-yellow-500/50 bg-yellow-900/20",
    });

    return diagnosticResults;
  }, [currentActiveReportObjectFromHook]);

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

  // NOVA Função para validar trade antes do processamento
  const validateTradeForImport = (trade: any): { isValid: boolean; reason?: string } => {
    // Verificar se tem ID válido
    if (!trade.id && !trade.uid) {
      return { isValid: false, reason: 'Trade sem ID válido' };
    }
    
    // Verificar se está fechado
    if (!trade.closed) {
      return { isValid: false, reason: 'Trade não fechado' };
    }
    
    // Verificar se tem PL válido
    if (trade.pl === undefined || trade.pl === null || isNaN(trade.pl)) {
      return { isValid: false, reason: 'PL inválido ou ausente' };
    }
    
    // Verificar se PL não é zero
    if (trade.pl === 0) {
      return { isValid: false, reason: 'PL é zero' };
    }
    
    // Verificar se tem dados de data válidos
    if (!trade.closed_at && !trade.ts && !trade.updated_at && !trade.created_at) {
      return { isValid: false, reason: 'Nenhum campo de data válido' };
    }
    
    return { isValid: true };
  };

  // NOVA: Função para verificar integridade dos dados após importação
  const verifyDataIntegrity = useCallback((
    reportId: string,
    expectedData: { trades?: number; deposits?: number; withdrawals?: number },
    context: string
  ): { isValid: boolean; issues: string[]; details: any } => {
    console.log(`[verifyDataIntegrity] ${context}: Iniciando verificação de integridade`);
    
    const issues: string[] = [];
    let isValid = true;
    
    try {
      // Buscar relatório atual
      const currentReport = currentActiveReportObjectFromHook;
      if (!currentReport || currentReport.id !== reportId) {
        issues.push('Relatório ativo não corresponde ao esperado');
        isValid = false;
        return { isValid, issues, details: { currentReport: currentReport?.id, expectedReport: reportId } };
      }

      // Verificar localStorage
      const storedCollection = localStorage.getItem('bitcoinReportsCollection');
      if (!storedCollection) {
        issues.push('Dados não encontrados no localStorage');
        isValid = false;
      } else {
        try {
          const parsedCollection = JSON.parse(storedCollection);
          const storedReport = parsedCollection.reports?.find((r: any) => r.id === reportId);
          
          if (!storedReport) {
            issues.push('Relatório não encontrado no localStorage');
            isValid = false;
          } else {
            // Verificar consistência entre estado atual e localStorage
            const currentInvestmentsCount = currentReport.investments?.length || 0;
            const storedInvestmentsCount = storedReport.investments?.length || 0;
            const currentProfitsCount = currentReport.profits?.length || 0;
            const storedProfitsCount = storedReport.profits?.length || 0;

            if (currentInvestmentsCount !== storedInvestmentsCount) {
              issues.push(`Inconsistência em investimentos: estado=${currentInvestmentsCount}, localStorage=${storedInvestmentsCount}`);
              isValid = false;
            }

            if (currentProfitsCount !== storedProfitsCount) {
              issues.push(`Inconsistência em lucros: estado=${currentProfitsCount}, localStorage=${storedProfitsCount}`);
              isValid = false;
            }

            // Verificar se os dados esperados foram adicionados
            if (expectedData.deposits && currentInvestmentsCount < expectedData.deposits) {
              issues.push(`Menos investimentos que esperado: atual=${currentInvestmentsCount}, esperado=${expectedData.deposits}`);
              isValid = false;
            }

            if (expectedData.trades && currentProfitsCount < expectedData.trades) {
              issues.push(`Menos lucros que esperado: atual=${currentProfitsCount}, esperado=${expectedData.trades}`);
              isValid = false;
            }
          }
        } catch (parseError) {
          issues.push('Erro ao parsear dados do localStorage');
          isValid = false;
        }
      }

      const details = {
        reportId,
        currentInvestments: currentReport.investments?.length || 0,
        currentProfits: currentReport.profits?.length || 0,
        expectedData,
        context,
        timestamp: new Date().toISOString()
      };

      console.log(`[verifyDataIntegrity] ${context}: Verificação concluída`, {
        isValid,
        issues,
        details
      });

      return { isValid, issues, details };
    } catch (error) {
      console.error(`[verifyDataIntegrity] ${context}: Erro durante verificação:`, error);
      issues.push(`Erro durante verificação: ${error}`);
      return { isValid: false, issues, details: { error: error } };
    }
  }, [currentActiveReportObjectFromHook]);

  // NOVA: Função para tentar recuperar dados em caso de falha
  const attemptDataRecovery = useCallback(async (
    context: string,
    originalData: any[],
    conversionFunction: (item: any) => any,
    addFunction: (item: any, reportId: string, options: any) => any
  ): Promise<{ recovered: number; failed: number; errors: string[] }> => {
    console.log(`[attemptDataRecovery] ${context}: Iniciando recuperação de dados`);
    
    let recovered = 0;
    let failed = 0;
    const errors: string[] = [];

    if (!currentActiveReportObjectFromHook) {
      errors.push('Nenhum relatório ativo para recuperação');
      return { recovered, failed, errors };
    }

    for (const item of originalData) {
      try {
        const convertedItem = conversionFunction(item);
        const result = addFunction(convertedItem, currentActiveReportObjectFromHook.id, { suppressToast: true });
        
        if (result.status === 'added') {
          recovered++;
          console.log(`[attemptDataRecovery] ${context}: Item recuperado:`, result.id);
        } else if (result.status === 'duplicate') {
          // Duplicatas são esperadas na recuperação
          console.log(`[attemptDataRecovery] ${context}: Item já existe:`, result.originalId);
        } else {
          failed++;
          errors.push(`Falha ao recuperar item: ${result.message}`);
        }
      } catch (error) {
        failed++;
        errors.push(`Erro na conversão/adição: ${error}`);
        console.error(`[attemptDataRecovery] ${context}: Erro ao processar item:`, error);
      }
    }

    console.log(`[attemptDataRecovery] ${context}: Recuperação concluída`, {
      recovered,
      failed,
      errors: errors.length
    });

    return { recovered, failed, errors };
  }, [currentActiveReportObjectFromHook]);

  // NOVA Função para analisar status dos depósitos em tempo real
  const analyzeDepositStatuses = async () => {
    const config = getCurrentImportConfig();
    
    if (!config || !user?.email) {
      toast({
        title: "❌ Erro na análise",
        description: "Configuração ou usuário não encontrado",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetchLNMarketsDeposits(user.email, config.id);
      
      if (!response.success || !response.data) {
        toast({
          title: "❌ Erro na análise",
          description: response.error || "Erro ao buscar depósitos",
          variant: "destructive",
        });
        return;
      }

      const deposits = response.data;
      const statusAnalysis = deposits.reduce((acc, d) => {
        acc[d.status] = (acc[d.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const confirmationAnalysis = deposits.reduce((acc, d) => {
        let key = '';
        if (d.isConfirmed === false) key = 'isConfirmed: false';
        else if (d.is_confirmed === true) key = 'is_confirmed: true (on-chain)';
        else if (d.success === true) key = 'success: true (internal)';
        else if (d.isConfirmed === true) key = 'isConfirmed: true';
        else key = 'sem atributos de confirmação';
        
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const confirmedByOldLogic = deposits.filter(d => d.status === 'confirmed').length;
      const confirmedByNewLogic = deposits.filter(isDepositConfirmed).length;
      
      console.log('[analyzeDepositStatuses] Análise completa:', {
        totalDeposits: deposits.length,
        statusDistribution: statusAnalysis,
        confirmationDistribution: confirmationAnalysis,
        confirmedByOldLogic,
        confirmedByNewLogic,
        difference: confirmedByNewLogic - confirmedByOldLogic,
        allUniqueStatuses: Object.keys(statusAnalysis),
        sampleDeposits: deposits.slice(0, 5).map(d => ({
          id: d.id,
          type: d.type,
          status: d.status,
          amount: d.amount,
          created_at: d.created_at,
          ts: d.ts,
          isConfirmed: d.isConfirmed,
          is_confirmed: d.is_confirmed,
          success: d.success,
          isConfirmedByNewLogic: isDepositConfirmed(d)
        }))
      });

      toast({
        title: "🔍 Análise de Confirmação",
        description: (
          <div className="space-y-1 text-xs">
            <div>Total: {deposits.length} depósitos</div>
            <div>Confirmados (status='confirmed'): {confirmedByOldLogic}</div>
            <div>Confirmados (nova lógica): {confirmedByNewLogic}</div>
            <div>Diferença: +{confirmedByNewLogic - confirmedByOldLogic}</div>
            <div>Tipos: {Object.keys(confirmationAnalysis).join(', ')}</div>
            <div>Detalhes no console</div>
          </div>
        ),
        variant: "default",
        className: "border-blue-500/50 bg-blue-900/20",
      });
    } catch (error) {
      console.error('[analyzeDepositStatuses] Erro:', error);
      toast({
        title: "❌ Erro na análise",
        description: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive",
      });
    }
  };

  // NOVA Função para testar conversão de depósitos
  const testDepositConversion = () => {
    if (!currentActiveReportObjectFromHook) {
      toast({
        title: "❌ Erro no teste",
        description: "Nenhum relatório ativo encontrado",
        variant: "destructive",
      });
      return;
    }

    // Criar depósitos de teste com diferentes tipos e atributos de confirmação
    const testDeposits = [
      {
        id: `test_deposit_${Date.now()}_1`,
        amount: 69441,
        type: 'bitcoin',
        status: 'confirmed',
        is_confirmed: true, // depósito on-chain confirmado
        ts: Date.now(),
        tx_id: 'test_tx_id_1'
      },
      {
        id: `test_deposit_${Date.now()}_2`,
        amount: 24779,
        type: 'internal',
        from_username: 'test_user',
        success: true, // depósito interno bem-sucedido
        ts: Date.now()
      },
      {
        id: `test_deposit_${Date.now()}_3`,
        amount: 25000,
        type: 'lightning',
        status: 'pending',
        isConfirmed: false, // explicitamente não confirmado
        created_at: new Date().toISOString()
      },
      {
        id: `test_deposit_${Date.now()}_4`,
        amount: 15000,
        type: 'lightning',
        status: 'confirmed',
        isConfirmed: true, // confirmado tradicional
        created_at: new Date().toISOString()
      }
    ];

    console.log('[testDepositConversion] Testando conversão de depósitos:', testDeposits);

    testDeposits.forEach((deposit, index) => {
      try {
        console.log(`[testDepositConversion] Testando depósito ${index + 1}:`, deposit);
        
        const isConfirmed = isDepositConfirmed(deposit);
        
        console.log(`[testDepositConversion] Depósito ${index + 1} confirmado:`, isConfirmed);
        
        if (isConfirmed) {
          const investment = convertDepositToInvestment(deposit);
          console.log(`[testDepositConversion] Investimento convertido ${index + 1}:`, investment);
          
          const result = addInvestment(investment, currentActiveReportObjectFromHook.id, { suppressToast: true });
          console.log(`[testDepositConversion] Resultado da adição ${index + 1}:`, result);
        } else {
          console.log(`[testDepositConversion] Depósito ${index + 1} ignorado por isConfirmed:`, {
            status: deposit.status,
            isConfirmed: deposit.isConfirmed,
            reason: 'isConfirmed === false'
          });
        }
      } catch (error) {
        console.error(`[testDepositConversion] Erro no depósito ${index + 1}:`, error);
      }
    });

    toast({
      title: "🧪 Teste de Conversão",
      description: (
        <div className="space-y-1 text-xs">
          <div>Testou 4 depósitos com diferentes tipos e confirmações</div>
          <div>1: bitcoin (is_confirmed=true), 2: internal (success=true)</div>
          <div>3: lightning (isConfirmed=false), 4: lightning (isConfirmed=true)</div>
          <div>Verifique o console para detalhes</div>
        </div>
      ),
      variant: "default",
      className: "border-blue-500/50 bg-blue-900/20",
    });
  };

  // NOVA Função de debug para verificar dados
  // NOVA Função para monitorar progresso da busca
  const monitorSearchProgress = (
    currentOffset: number, 
    allTrades: any[], 
    totalDuplicates: number, 
    consecutiveEmpty: number, 
    consecutiveUnproductive: number,
    maxOffsetLimit: number,
    maxTotalTrades: number
  ) => {
    const progress = {
      offset: currentOffset,
      tradesFound: allTrades.length,
      duplicatesSkipped: totalDuplicates,
      consecutiveEmpty,
      consecutiveUnproductive,
      offsetProgress: (currentOffset / maxOffsetLimit) * 100,
      tradesProgress: (allTrades.length / maxTotalTrades) * 100
    };
    
    console.log('[monitorSearchProgress] Status da busca:', progress);
    
    // Alertar se estiver próximo dos limites
    if (progress.offsetProgress > 80) {
      console.warn('[monitorSearchProgress] ⚠️ Próximo do limite de offset!');
    }
    
    if (progress.tradesProgress > 80) {
      console.warn('[monitorSearchProgress] ⚠️ Próximo do limite de trades!');
    }
    
    if (consecutiveUnproductive >= 3) {
      console.warn('[monitorSearchProgress] ⚠️ Muitas páginas improdutivas consecutivas!');
    }
    
    return progress;
  };

  // NOVA Função para testar a importação otimizada
  const testOptimizedImport = async () => {
    if (!currentActiveReportObjectFromHook) {
      toast({
        title: "❌ Erro no teste",
        description: "Nenhum relatório ativo encontrado",
        variant: "destructive",
      });
      return;
    }

    const startTime = Date.now();
    console.log('[testOptimizedImport] Iniciando teste de performance...');
    
    // Simular dados de teste
    const mockTrades = Array.from({ length: 50 }, (_, i) => ({
      id: `test_${i}`,
      uid: `test_uid_${i}`,
      closed: true,
      pl: Math.random() > 0.5 ? Math.floor(Math.random() * 10000) : -Math.floor(Math.random() * 5000),
      side: Math.random() > 0.5 ? 'buy' : 'sell',
      quantity: Math.floor(Math.random() * 1000000),
      closed_at: Date.now() - Math.floor(Math.random() * 86400000), // Último dia
      ts: Date.now() - Math.floor(Math.random() * 86400000),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    let validCount = 0;
    let invalidCount = 0;
    const validationResults: string[] = [];

    // Testar validação
    for (const trade of mockTrades) {
      const validation = validateTradeForImport(trade);
      if (validation.isValid) {
        validCount++;
      } else {
        invalidCount++;
        validationResults.push(`Trade ${trade.id}: ${validation.reason}`);
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('[testOptimizedImport] Teste concluído:', {
      totalTrades: mockTrades.length,
      validTrades: validCount,
      invalidTrades: invalidCount,
      duration: `${duration}ms`,
      validationResults: validationResults.slice(0, 5) // Primeiros 5 erros
    });

    toast({
      title: "🧪 Teste de Performance Concluído",
      description: (
        <div className="space-y-1 text-xs">
          <div>Trades testados: {mockTrades.length}</div>
          <div>Válidos: {validCount} | Inválidos: {invalidCount}</div>
          <div>Tempo: {duration}ms</div>
          <div>Detalhes no console</div>
        </div>
      ),
      variant: "default",
      className: "border-purple-500/50 bg-purple-900/20",
    });
  };

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
              
              // NOVO: Análise detalhada dos depósitos
              const statusAnalysis = response.data.reduce((acc, d) => {
                acc[d.status] = (acc[d.status] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);

              const confirmationAnalysis = response.data.reduce((acc, d) => {
                let key = '';
                if (d.isConfirmed === false) key = 'isConfirmed: false';
                else if (d.is_confirmed === true) key = 'is_confirmed: true (on-chain)';
                else if (d.success === true) key = 'success: true (internal)';
                else if (d.isConfirmed === true) key = 'isConfirmed: true';
                else key = 'sem atributos de confirmação';
                
                acc[key] = (acc[key] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              
              const confirmedByOldLogic = response.data.filter(d => d.status === 'confirmed').length;
              const confirmedByNewLogic = response.data.filter(isDepositConfirmed).length;
              
              console.log('[DEBUG] Análise de confirmação dos depósitos:', {
                totalDeposits: response.data.length,
                statusDistribution: statusAnalysis,
                confirmationDistribution: confirmationAnalysis,
                confirmedByOldLogic,
                confirmedByNewLogic,
                difference: confirmedByNewLogic - confirmedByOldLogic,
                allUniqueStatuses: Object.keys(statusAnalysis),
                confirmedDeposits: response.data.filter(isDepositConfirmed).map(d => ({
                  id: d.id,
                  type: d.type,
                  status: d.status,
                  isConfirmed: d.isConfirmed,
                  is_confirmed: d.is_confirmed,
                  success: d.success
                })),
                pendingDeposits: response.data.filter(d => !isDepositConfirmed(d)).map(d => ({
                  id: d.id,
                  type: d.type,
                  status: d.status,
                  isConfirmed: d.isConfirmed,
                  is_confirmed: d.is_confirmed,
                  success: d.success
                }))
              });
              
              // Testar conversão de um depósito confirmado
              const firstConfirmedDeposit = response.data.find(isDepositConfirmed);
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
              } else {
                console.log('[DEBUG] Nenhum depósito confirmado encontrado para teste');
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
      default:
        return `₿${value.toLocaleString(undefined, { minimumFractionDigits: 8, maximumFractionDigits: 8 })}`;
    }
  }, [chartDisplayUnit]);

  // Função para formatar valores responsivos nos gráficos
  const formatResponsiveChartValue = useCallback((value: number): string => {
    if (isMobile) {
      // Formato mais compacto para mobile
      switch (chartDisplayUnit) {
        case "usd":
          return value >= 1000 ? `$${(value/1000).toFixed(0)}k` : `$${value.toFixed(0)}`;
        case "brl":
          return value >= 1000 ? `R$${(value/1000).toFixed(0)}k` : `R$${value.toFixed(0)}`;
        case "btc":
          return value >= 0.01 ? `₿${value.toFixed(2)}` : `${(value * 100000000).toFixed(0)}s`;
        default:
          return formatChartValue(value);
      }
    }
    return formatChartValue(value);
  }, [chartDisplayUnit, isMobile, formatChartValue]);

  // Função para formatar labels responsivos
  const formatResponsiveLabel = useCallback((value: string): string => {
    if (isMobile) {
      return value.length > 6 ? `${value.substring(0, 6)}...` : value;
    }
    return value;
  }, [isMobile]);

  // NOVA: Função para excluir investimento manualmente
  const handleDeleteInvestment = useCallback((investmentId: string, investmentDate: string, investmentAmount: number) => {
    if (!currentActiveReportObjectFromHook) {
      toast({
        title: "❌ Erro",
        description: "Nenhum relatório ativo encontrado",
        variant: "destructive",
      });
      return;
    }

    // Confirmar exclusão
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o investimento de ${investmentAmount} SATS do dia ${investmentDate}?\n\nEsta ação não pode ser desfeita.`
    );

    if (!confirmed) return;

    try {
      const success = deleteInvestment(currentActiveReportObjectFromHook.id, investmentId);
      
      if (success) {
        console.log('[handleDeleteInvestment] Investimento excluído com sucesso:', investmentId);
        
        toast({
          title: "✅ Investimento excluído",
          description: `Investimento de ${investmentAmount} SATS foi removido com sucesso`,
          variant: "default",
        });

        // Forçar atualização da UI
        forceUpdate();
      } else {
        throw new Error('Falha na exclusão do investimento');
      }
    } catch (error) {
      console.error('[handleDeleteInvestment] Erro ao excluir investimento:', error);
      toast({
        title: "❌ Erro na exclusão",
        description: "Não foi possível excluir o investimento. Tente novamente.",
        variant: "destructive",
      });
    }
  }, [currentActiveReportObjectFromHook, deleteInvestment, forceUpdate]);

  // NOVA: Função para excluir lucro/perda manualmente
  const handleDeleteProfit = useCallback((profitId: string, profitDate: string, profitAmount: number, isProfit: boolean) => {
    if (!currentActiveReportObjectFromHook) {
      toast({
        title: "❌ Erro",
        description: "Nenhum relatório ativo encontrado",
        variant: "destructive",
      });
      return;
    }

    // Confirmar exclusão
    const type = isProfit ? "lucro" : "perda";
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o ${type} de ${profitAmount} SATS do dia ${profitDate}?\n\nEsta ação não pode ser desfeita.`
    );

    if (!confirmed) return;

    try {
      const success = deleteProfitRecord(currentActiveReportObjectFromHook.id, profitId);
      
      if (success) {
        console.log('[handleDeleteProfit] Lucro/perda excluído com sucesso:', profitId);
        
        toast({
          title: `✅ ${isProfit ? 'Lucro' : 'Perda'} excluído`,
          description: `${isProfit ? 'Lucro' : 'Perda'} de ${profitAmount} SATS foi removido com sucesso`,
          variant: "default",
        });

        // Forçar atualização da UI
        forceUpdate();
      } else {
        throw new Error('Falha na exclusão do lucro/perda');
      }
    } catch (error) {
      console.error('[handleDeleteProfit] Erro ao excluir lucro/perda:', error);
      toast({
        title: "❌ Erro na exclusão",
        description: "Não foi possível excluir o registro. Tente novamente.",
        variant: "destructive",
      });
    }
  }, [currentActiveReportObjectFromHook, deleteProfitRecord, forceUpdate]);

  // NOVA: Função para excluir saque manualmente
  const handleDeleteWithdrawal = useCallback((withdrawalId: string, withdrawalDate: string, withdrawalAmount: number) => {
    if (!currentActiveReportObjectFromHook) {
      toast({
        title: "❌ Erro",
        description: "Nenhum relatório ativo encontrado",
        variant: "destructive",
      });
      return;
    }

    // Confirmar exclusão
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o saque de ${withdrawalAmount} SATS do dia ${withdrawalDate}?\n\nEsta ação não pode ser desfeita.`
    );

    if (!confirmed) return;

    try {
      const success = deleteWithdrawal(withdrawalId, currentActiveReportObjectFromHook.id);
      
      if (success) {
        console.log('[handleDeleteWithdrawal] Saque excluído com sucesso:', withdrawalId);
        
        toast({
          title: "✅ Saque excluído",
          description: `Saque de ${withdrawalAmount} SATS foi removido com sucesso`,
          variant: "default",
        });

        // Forçar atualização da UI
        forceUpdate();
      } else {
        throw new Error('Falha na exclusão do saque');
      }
    } catch (error) {
      console.error('[handleDeleteWithdrawal] Erro ao excluir saque:', error);
      toast({
        title: "❌ Erro na exclusão",
        description: "Não foi possível excluir o saque. Tente novamente.",
        variant: "destructive",
      });
    }
  }, [currentActiveReportObjectFromHook, deleteWithdrawal, forceUpdate]);

  // NOVA: Função para exclusão em lote com confirmação
  const handleBulkDelete = useCallback((type: 'investments' | 'profits' | 'withdrawals') => {
    if (!currentActiveReportObjectFromHook) {
      toast({
        title: "❌ Erro",
        description: "Nenhum relatório ativo encontrado",
        variant: "destructive",
      });
      return;
    }

    const typeLabels = {
      investments: 'investimentos',
      profits: 'lucros/perdas',
      withdrawals: 'saques'
    };

    const count = type === 'investments' ? currentActiveReportObjectFromHook.investments?.length || 0 :
                  type === 'profits' ? currentActiveReportObjectFromHook.profits?.length || 0 :
                  currentActiveReportObjectFromHook.withdrawals?.length || 0;

    if (count === 0) {
      toast({
        title: "ℹ️ Nenhum registro",
        description: `Não há ${typeLabels[type]} para excluir`,
        variant: "default",
      });
      return;
    }

    // Confirmar exclusão em lote
    const confirmed = window.confirm(
      `⚠️ ATENÇÃO: Você está prestes a excluir TODOS os ${count} ${typeLabels[type]} do relatório "${currentActiveReportObjectFromHook.name}".\n\nEsta ação NÃO PODE ser desfeita!\n\nTem certeza que deseja continuar?`
    );

    if (!confirmed) return;

    // Segunda confirmação para ações críticas
    const doubleConfirmed = window.confirm(
      `🚨 CONFIRMAÇÃO FINAL: Excluir ${count} ${typeLabels[type]}?\n\nDigite "CONFIRMAR" na próxima caixa de diálogo para prosseguir.`
    );

    if (!doubleConfirmed) return;

    const finalConfirmation = window.prompt(
      `Digite "CONFIRMAR" (em maiúsculas) para excluir todos os ${typeLabels[type]}:`
    );

    if (finalConfirmation !== "CONFIRMAR") {
      toast({
        title: "❌ Operação cancelada",
        description: "Exclusão em lote cancelada pelo usuário",
        variant: "default",
      });
      return;
    }

    try {
      let success = false;
      
      if (type === 'investments') {
        success = deleteAllInvestmentsFromReport(currentActiveReportObjectFromHook.id);
      } else if (type === 'profits') {
        success = deleteAllProfitsFromReport(currentActiveReportObjectFromHook.id);
      } else if (type === 'withdrawals') {
        success = deleteAllWithdrawalsFromReport(currentActiveReportObjectFromHook.id);
      }
      
      if (success) {
        console.log(`[handleBulkDelete] Exclusão em lote de ${type} realizada com sucesso`);
        
        toast({
          title: "✅ Exclusão em lote concluída",
          description: `Todos os ${count} ${typeLabels[type]} foram removidos com sucesso`,
          variant: "default",
        });

        // Forçar atualização da UI
        forceUpdate();
      } else {
        throw new Error(`Falha na exclusão em lote de ${type}`);
      }
    } catch (error) {
      console.error(`[handleBulkDelete] Erro na exclusão em lote de ${type}:`, error);
      toast({
        title: "❌ Erro na exclusão em lote",
        description: `Não foi possível excluir os ${typeLabels[type]}. Tente novamente.`,
        variant: "destructive",
      });
    }
  }, [currentActiveReportObjectFromHook, deleteAllInvestmentsFromReport, deleteAllProfitsFromReport, deleteAllWithdrawalsFromReport, forceUpdate]);

  // NOVO: Sistema robusto de salvamento com verificações de integridade e retry
  const saveDataWithIntegrityCheck = useCallback(async (
    dataType: 'trade' | 'deposit' | 'withdrawal',
    rawData: any,
    convertedData: any,
    maxRetries: number = 3
  ): Promise<{ success: boolean; result?: any; error?: string; retryCount: number }> => {
    const operationId = `${dataType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[saveDataWithIntegrityCheck] ${operationId}: Iniciando salvamento`, {
      dataType,
      rawDataId: rawData?.id || rawData?.uid,
      convertedId: convertedData?.id,
      originalId: convertedData?.originalId,
      timestamp: new Date().toISOString()
    });

    // Validação prévia dos dados convertidos
    const preValidation = validateConvertedData(dataType, convertedData);
    if (!preValidation.isValid) {
      console.error(`[saveDataWithIntegrityCheck] ${operationId}: Falha na validação prévia:`, preValidation.errors);
      return {
        success: false,
        error: `Validação prévia falhou: ${preValidation.errors.join(', ')}`,
        retryCount: 0
      };
    }

    // Capturar estado antes do salvamento para rollback se necessário
    const stateBefore = {
      investmentsCount: currentActiveReportObjectFromHook?.investments?.length || 0,
      profitsCount: currentActiveReportObjectFromHook?.profits?.length || 0,
      withdrawalsCount: currentActiveReportObjectFromHook?.withdrawals?.length || 0,
      timestamp: Date.now()
    };

    console.log(`[saveDataWithIntegrityCheck] ${operationId}: Estado antes do salvamento:`, stateBefore);

    let retryCount = 0;
    let lastError: string = '';

    while (retryCount < maxRetries) {
      try {
        console.log(`[saveDataWithIntegrityCheck] ${operationId}: Tentativa ${retryCount + 1}/${maxRetries}`);

        let result: any;

        // Executar operação de salvamento baseada no tipo
        switch (dataType) {
          case 'trade':
            result = addProfitRecord(convertedData, currentActiveReportObjectFromHook?.id, { suppressToast: true });
            break;
          case 'deposit':
            result = addInvestment(convertedData, currentActiveReportObjectFromHook?.id, { suppressToast: true });
            break;
          case 'withdrawal':
            result = addWithdrawal(convertedData, currentActiveReportObjectFromHook?.id, { suppressToast: true });
            break;
          default:
            throw new Error(`Tipo de dados não suportado: ${dataType}`);
        }

        console.log(`[saveDataWithIntegrityCheck] ${operationId}: Resultado da operação:`, {
          status: result.status,
          id: result.id,
          originalId: result.originalId,
          message: result.message
        });

        // Verificar se a operação foi bem-sucedida
        if (result.status === 'added') {
          // Verificação de integridade pós-salvamento
          const integrityCheck = await verifyDataIntegrity(operationId, dataType, result.id, convertedData, stateBefore);
          
          if (integrityCheck.isValid) {
            console.log(`[saveDataWithIntegrityCheck] ${operationId}: ✅ Salvamento bem-sucedido com integridade verificada`);
            return {
              success: true,
              result: result,
              retryCount: retryCount
            };
          } else {
            console.error(`[saveDataWithIntegrityCheck] ${operationId}: ❌ Falha na verificação de integridade:`, integrityCheck.errors);
            lastError = `Falha na verificação de integridade: ${integrityCheck.errors.join(', ')}`;
            
            // Tentar rollback se possível
            if (result.id) {
              await attemptRollback(dataType, result.id, operationId);
            }
          }
        } else if (result.status === 'duplicate') {
          console.log(`[saveDataWithIntegrityCheck] ${operationId}: ⚠️ Registro duplicado detectado`);
          return {
            success: true,
            result: result,
            retryCount: retryCount
          };
        } else {
          lastError = result.message || 'Erro desconhecido na operação de salvamento';
          console.error(`[saveDataWithIntegrityCheck] ${operationId}: Erro na operação:`, lastError);
        }

      } catch (error: any) {
        lastError = error.message || 'Erro inesperado durante salvamento';
        console.error(`[saveDataWithIntegrityCheck] ${operationId}: Exceção na tentativa ${retryCount + 1}:`, error);
      }

      retryCount++;

      // Se não é a última tentativa, aguardar antes de tentar novamente
      if (retryCount < maxRetries) {
        const delayMs = Math.min(1000 * Math.pow(2, retryCount), 5000); // Backoff exponencial, máximo 5s
        console.log(`[saveDataWithIntegrityCheck] ${operationId}: Aguardando ${delayMs}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    console.error(`[saveDataWithIntegrityCheck] ${operationId}: ❌ Falha após ${maxRetries} tentativas. Último erro:`, lastError);
    return {
      success: false,
      error: lastError,
      retryCount: retryCount
    };
  }, [currentActiveReportObjectFromHook, addProfitRecord, addInvestment, addWithdrawal]);

  // NOVO: Função para validar dados convertidos antes do salvamento
  const validateConvertedData = useCallback((
    dataType: 'trade' | 'deposit' | 'withdrawal',
    data: any
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Validações comuns
    if (!data) {
      errors.push('Dados ausentes');
      return { isValid: false, errors };
    }

    if (!data.id || typeof data.id !== 'string') {
      errors.push('ID inválido ou ausente');
    }

    if (!data.originalId || typeof data.originalId !== 'string') {
      errors.push('ID original inválido ou ausente');
    }

    if (!data.date || typeof data.date !== 'string') {
      errors.push('Data inválida ou ausente');
    } else {
      // Validar formato da data
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(data.date)) {
        errors.push('Formato de data inválido (esperado: YYYY-MM-DD)');
      }
    }

    if (typeof data.amount !== 'number' || data.amount < 0 || !isFinite(data.amount)) {
      errors.push('Valor inválido (deve ser número positivo finito)');
    }

    if (!data.unit || typeof data.unit !== 'string') {
      errors.push('Unidade inválida ou ausente');
    }

    // Validações específicas por tipo
    switch (dataType) {
      case 'trade':
        if (typeof data.isProfit !== 'boolean') {
          errors.push('Campo isProfit deve ser boolean');
        }
        break;
      
      case 'deposit':
        // Depósitos não têm validações específicas adicionais
        break;
      
      case 'withdrawal':
        if (data.fee !== undefined && (typeof data.fee !== 'number' || data.fee < 0 || !isFinite(data.fee))) {
          errors.push('Taxa inválida (deve ser número não-negativo finito)');
        }
        if (data.type && !['lightning', 'onchain'].includes(data.type)) {
          errors.push('Tipo de saque inválido (deve ser lightning ou onchain)');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  // NOVO: Função para verificar integridade dos dados após salvamento
  const verifyDataIntegrity = useCallback(async (
    operationId: string,
    dataType: 'trade' | 'deposit' | 'withdrawal',
    savedId: string,
    originalData: any,
    stateBefore: any
  ): Promise<{ isValid: boolean; errors: string[] }> => {
    console.log(`[verifyDataIntegrity] ${operationId}: Verificando integridade para ${dataType} ID: ${savedId}`);
    
    const errors: string[] = [];

    try {
      // Aguardar um momento para garantir que o estado foi atualizado
      await new Promise(resolve => setTimeout(resolve, 100));

      // Obter estado atual do relatório
      const currentReport = currentActiveReportObjectFromHook;
      if (!currentReport) {
        errors.push('Relatório ativo não encontrado após salvamento');
        return { isValid: false, errors };
      }

      // Verificar se o contador aumentou corretamente
      const currentCounts = {
        investmentsCount: currentReport.investments?.length || 0,
        profitsCount: currentReport.profits?.length || 0,
        withdrawalsCount: currentReport.withdrawals?.length || 0
      };

      let expectedField: keyof typeof currentCounts;
      switch (dataType) {
        case 'trade':
          expectedField = 'profitsCount';
          break;
        case 'deposit':
          expectedField = 'investmentsCount';
          break;
        case 'withdrawal':
          expectedField = 'withdrawalsCount';
          break;
      }

      const expectedCount = stateBefore[expectedField] + 1;
      const actualCount = currentCounts[expectedField];

      if (actualCount !== expectedCount) {
        errors.push(`Contador de ${dataType}s inconsistente: esperado ${expectedCount}, atual ${actualCount}`);
      }

      // Verificar se o registro específico existe
      let foundRecord: any = null;
      switch (dataType) {
        case 'trade':
          foundRecord = currentReport.profits?.find(p => p.id === savedId);
          break;
        case 'deposit':
          foundRecord = currentReport.investments?.find(i => i.id === savedId);
          break;
        case 'withdrawal':
          foundRecord = currentReport.withdrawals?.find(w => w.id === savedId);
          break;
      }

      if (!foundRecord) {
        errors.push(`Registro ${dataType} com ID ${savedId} não encontrado após salvamento`);
      } else {
        // Verificar se os dados salvos correspondem aos dados originais
        if (foundRecord.originalId !== originalData.originalId) {
          errors.push(`ID original inconsistente: esperado ${originalData.originalId}, salvo ${foundRecord.originalId}`);
        }

        if (foundRecord.amount !== originalData.amount) {
          errors.push(`Valor inconsistente: esperado ${originalData.amount}, salvo ${foundRecord.amount}`);
        }

        if (foundRecord.date !== originalData.date) {
          errors.push(`Data inconsistente: esperada ${originalData.date}, salva ${foundRecord.date}`);
        }

        if (foundRecord.unit !== originalData.unit) {
          errors.push(`Unidade inconsistente: esperada ${originalData.unit}, salva ${foundRecord.unit}`);
        }

        // Verificações específicas por tipo
        if (dataType === 'trade' && foundRecord.isProfit !== originalData.isProfit) {
          errors.push(`Campo isProfit inconsistente: esperado ${originalData.isProfit}, salvo ${foundRecord.isProfit}`);
        }
      }

      console.log(`[verifyDataIntegrity] ${operationId}: Verificação concluída`, {
        isValid: errors.length === 0,
        errorsCount: errors.length,
        expectedCount,
        actualCount,
        foundRecord: !!foundRecord
      });

    } catch (error: any) {
      console.error(`[verifyDataIntegrity] ${operationId}: Erro durante verificação:`, error);
      errors.push(`Erro durante verificação de integridade: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [currentActiveReportObjectFromHook]);

  // NOVO: Função para tentar rollback em caso de falha na verificação
  const attemptRollback = useCallback(async (
    dataType: 'trade' | 'deposit' | 'withdrawal',
    recordId: string,
    operationId: string
  ): Promise<boolean> => {
    console.log(`[attemptRollback] ${operationId}: Tentando rollback para ${dataType} ID: ${recordId}`);
    
    try {
      let success = false;
      
      switch (dataType) {
        case 'trade':
          success = deleteProfitRecord(currentActiveReportObjectFromHook?.id || '', recordId);
          break;
        case 'deposit':
          success = deleteInvestment(currentActiveReportObjectFromHook?.id || '', recordId);
          break;
        case 'withdrawal':
          success = deleteWithdrawal(recordId, currentActiveReportObjectFromHook?.id);
          break;
      }

      if (success) {
        console.log(`[attemptRollback] ${operationId}: ✅ Rollback bem-sucedido para ${dataType} ID: ${recordId}`);
      } else {
        console.error(`[attemptRollback] ${operationId}: ❌ Falha no rollback para ${dataType} ID: ${recordId}`);
      }

      return success;
    } catch (error: any) {
      console.error(`[attemptRollback] ${operationId}: Exceção durante rollback:`, error);
      return false;
    }
  }, [currentActiveReportObjectFromHook, deleteProfitRecord, deleteInvestment, deleteWithdrawal]);

  // NOVO: Função para processar dados em lotes com verificação de integridade
  const processBatchWithIntegrity = useCallback(async (
    dataType: 'trade' | 'deposit' | 'withdrawal',
    rawDataBatch: any[],
    convertFunction: (data: any) => any,
    batchId: string
  ): Promise<{
    imported: number;
    duplicated: number;
    errors: number;
    details: Array<{ id: string; status: string; error?: string; retryCount?: number }>;
  }> => {
    console.log(`[processBatchWithIntegrity] ${batchId}: Processando lote de ${rawDataBatch.length} ${dataType}s`);
    
    let imported = 0;
    let duplicated = 0;
    let errors = 0;
    const details: Array<{ id: string; status: string; error?: string; retryCount?: number }> = [];

    for (let i = 0; i < rawDataBatch.length; i++) {
      const rawData = rawDataBatch[i];
      const itemId = rawData?.id || rawData?.uid || `unknown_${i}`;
      
      try {
        console.log(`[processBatchWithIntegrity] ${batchId}: Processando item ${i + 1}/${rawDataBatch.length} - ID: ${itemId}`);
        
        // Converter dados
        const convertedData = convertFunction(rawData);
        
        // Salvar com verificação de integridade
        const saveResult = await saveDataWithIntegrityCheck(dataType, rawData, convertedData);
        
        if (saveResult.success) {
          if (saveResult.result?.status === 'added') {
            imported++;
            details.push({
              id: itemId,
              status: 'imported',
              retryCount: saveResult.retryCount
            });
            console.log(`[processBatchWithIntegrity] ${batchId}: ✅ Item ${itemId} importado com sucesso (${saveResult.retryCount} tentativas)`);
          } else if (saveResult.result?.status === 'duplicate') {
            duplicated++;
            details.push({
              id: itemId,
              status: 'duplicate'
            });
            console.log(`[processBatchWithIntegrity] ${batchId}: ⚠️ Item ${itemId} duplicado`);
          }
        } else {
          errors++;
          details.push({
            id: itemId,
            status: 'error',
            error: saveResult.error,
            retryCount: saveResult.retryCount
          });
          console.error(`[processBatchWithIntegrity] ${batchId}: ❌ Falha no item ${itemId}: ${saveResult.error} (${saveResult.retryCount} tentativas)`);
        }

      } catch (error: any) {
        errors++;
        details.push({
          id: itemId,
          status: 'error',
          error: error.message || 'Erro inesperado'
        });
        console.error(`[processBatchWithIntegrity] ${batchId}: ❌ Exceção no item ${itemId}:`, error);
      }

      // Pequeno delay entre itens para não sobrecarregar
      if (i < rawDataBatch.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    console.log(`[processBatchWithIntegrity] ${batchId}: Lote concluído`, {
      imported,
      duplicated,
      errors,
      total: rawDataBatch.length
    });

    return { imported, duplicated, errors, details };
  }, [saveDataWithIntegrityCheck]);

  // NOVO: Sistema robusto de salvamento com verificações de integridade e retry
  const saveDataWithIntegrityCheck = useCallback(async (
    dataType: 'trade' | 'deposit' | 'withdrawal',
    rawData: any,
    convertedData: any,
    maxRetries: number = 3
  ): Promise<{ success: boolean; result?: any; error?: string; retryCount: number }> => {
    const operationId = `${dataType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[saveDataWithIntegrityCheck] ${operationId}: Iniciando salvamento`, {
      dataType,
      rawDataId: rawData?.id || rawData?.uid,
      convertedId: convertedData?.id,
      originalId: convertedData?.originalId,
      timestamp: new Date().toISOString()
    });

    // Validação prévia dos dados convertidos
    const preValidation = validateConvertedData(dataType, convertedData);
    if (!preValidation.isValid) {
      console.error(`[saveDataWithIntegrityCheck] ${operationId}: Falha na validação prévia:`, preValidation.errors);
      return {
        success: false,
        error: `Validação prévia falhou: ${preValidation.errors.join(', ')}`,
        retryCount: 0
      };
    }

    // Capturar estado antes do salvamento para rollback se necessário
    const stateBefore = {
      investmentsCount: currentActiveReportObjectFromHook?.investments?.length || 0,
      profitsCount: currentActiveReportObjectFromHook?.profits?.length || 0,
      withdrawalsCount: currentActiveReportObjectFromHook?.withdrawals?.length || 0,
      timestamp: Date.now()
    };

    console.log(`[saveDataWithIntegrityCheck] ${operationId}: Estado antes do salvamento:`, stateBefore);

    let retryCount = 0;
    let lastError: string = '';

    while (retryCount < maxRetries) {
      try {
        console.log(`[saveDataWithIntegrityCheck] ${operationId}: Tentativa ${retryCount + 1}/${maxRetries}`);

        let result: any;

        // Executar operação de salvamento baseada no tipo
        switch (dataType) {
          case 'trade':
            result = addProfitRecord(convertedData, currentActiveReportObjectFromHook?.id, { suppressToast: true });
            break;
          case 'deposit':
            result = addInvestment(convertedData, currentActiveReportObjectFromHook?.id, { suppressToast: true });
            break;
          case 'withdrawal':
            result = addWithdrawal(convertedData, currentActiveReportObjectFromHook?.id, { suppressToast: true });
            break;
          default:
            throw new Error(`Tipo de dados não suportado: ${dataType}`);
        }

        console.log(`[saveDataWithIntegrityCheck] ${operationId}: Resultado da operação:`, {
          status: result.status,
          id: result.id,
          originalId: result.originalId,
          message: result.message
        });

        // Verificar se a operação foi bem-sucedida
        if (result.status === 'added') {
          // Verificação de integridade pós-salvamento
          const integrityCheck = await verifyDataIntegrity(operationId, dataType, result.id, convertedData, stateBefore);
          
          if (integrityCheck.isValid) {
            console.log(`[saveDataWithIntegrityCheck] ${operationId}: ✅ Salvamento bem-sucedido com integridade verificada`);
            return {
              success: true,
              result: result,
              retryCount: retryCount
            };
          } else {
            console.error(`[saveDataWithIntegrityCheck] ${operationId}: ❌ Falha na verificação de integridade:`, integrityCheck.errors);
            lastError = `Falha na verificação de integridade: ${integrityCheck.errors.join(', ')}`;
            
            // Tentar rollback se possível
            if (result.id) {
              await attemptRollback(dataType, result.id, operationId);
            }
          }
        } else if (result.status === 'duplicate') {
          console.log(`[saveDataWithIntegrityCheck] ${operationId}: ⚠️ Registro duplicado detectado`);
          return {
            success: true,
            result: result,
            retryCount: retryCount
          };
        } else {
          lastError = result.message || 'Erro desconhecido na operação de salvamento';
          console.error(`[saveDataWithIntegrityCheck] ${operationId}: Erro na operação:`, lastError);
        }

      } catch (error: any) {
        lastError = error.message || 'Erro inesperado durante salvamento';
        console.error(`[saveDataWithIntegrityCheck] ${operationId}: Exceção na tentativa ${retryCount + 1}:`, error);
      }

      retryCount++;

      // Se não é a última tentativa, aguardar antes de tentar novamente
      if (retryCount < maxRetries) {
        const delayMs = Math.min(1000 * Math.pow(2, retryCount), 5000); // Backoff exponencial, máximo 5s
        console.log(`[saveDataWithIntegrityCheck] ${operationId}: Aguardando ${delayMs}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    console.error(`[saveDataWithIntegrityCheck] ${operationId}: ❌ Falha após ${maxRetries} tentativas. Último erro:`, lastError);
    return {
      success: false,
      error: lastError,
      retryCount: retryCount
    };
  }, [currentActiveReportObjectFromHook, addProfitRecord, addInvestment, addWithdrawal]);

  // NOVO: Função para validar dados convertidos antes do salvamento
  const validateConvertedData = useCallback((
    dataType: 'trade' | 'deposit' | 'withdrawal',
    data: any
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Validações comuns
    if (!data) {
      errors.push('Dados ausentes');
      return { isValid: false, errors };
    }

    if (!data.id || typeof data.id !== 'string') {
      errors.push('ID inválido ou ausente');
    }

    if (!data.originalId || typeof data.originalId !== 'string') {
      errors.push('ID original inválido ou ausente');
    }

    if (!data.date || typeof data.date !== 'string') {
      errors.push('Data inválida ou ausente');
    } else {
      // Validar formato da data
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(data.date)) {
        errors.push('Formato de data inválido (esperado: YYYY-MM-DD)');
      }
    }

    if (typeof data.amount !== 'number' || data.amount < 0 || !isFinite(data.amount)) {
      errors.push('Valor inválido (deve ser número positivo finito)');
    }

    if (!data.unit || typeof data.unit !== 'string') {
      errors.push('Unidade inválida ou ausente');
    }
