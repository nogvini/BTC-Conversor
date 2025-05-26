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
  ArrowDown,
  AlertTriangle,
  User,
  FileText,
  FileDown,
  Loader2,
  File
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
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useActiveTab } from "@/hooks/use-active-tab";
import { useToast } from "@/hooks/use-toast";
import * as ExcelJS from "exceljs";



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

// Tipo atualizado para estatísticas de importação com tipos mais específicos
interface LNMarketsImportStats {
  trades?: {
    total: number;
    imported: number;
    duplicated: number;
    errors: number;
    processed?: number;
    pagesSearched?: number;
    stoppedReason?: 'emptyPages' | 'duplicates' | 'maxPages' | 'noMoreData' | 'unproductivePages' | 'maxTradesLimit' | 'maxOffsetLimit' | 'apiEndOfData' | 'unknown';
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
import { useDefaultCurrency } from "@/hooks/use-default-currency";

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

  // Hook de moeda padrão
  const { defaultCurrency, formatCurrency: formatCurrencyDefault } = useDefaultCurrency();

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

  // NOVO: Efeito para sincronizar cotações do bitcoin-converter
  useEffect(() => {
    if (btcToUsd && brlToUsd) {
      // Sincronizar cotações do bitcoin-converter imediatamente
      states.setCurrentRates({
        btcToUsd: btcToUsd,
        brlToUsd: brlToUsd,
      });
      states.setUsingFallbackRates(false);
      console.log('[ProfitCalculator] Cotações sincronizadas automaticamente:', {
        btcToUsd,
        brlToUsd
      });
    } else {
      // Fallback para updateRates se as props não estiverem disponíveis
      updateRates();
    }
  }, [btcToUsd, brlToUsd, appData]);

  // Funções auxiliares
  const updateRates = async () => {
    // CORRIGIDO: Priorizar cotações do bitcoin-converter (props) sobre appData
    if (btcToUsd && brlToUsd) {
      // Usar cotações sincronizadas do bitcoin-converter
      states.setCurrentRates({
        btcToUsd: btcToUsd,
        brlToUsd: brlToUsd,
      });
      states.setUsingFallbackRates(false);
      console.log('[ProfitCalculator] Usando cotações sincronizadas do bitcoin-converter:', {
        btcToUsd,
        brlToUsd
      });
      return;
    } else if (appData) {
      // Fallback para appData se as props não estiverem disponíveis
      states.setCurrentRates({
        btcToUsd: appData.currentPrice.usd,
        brlToUsd: appData.currentPrice.brl / appData.currentPrice.usd,
      });
      states.setUsingFallbackRates(Boolean(appData.isUsingCache || appData.currentPrice.isUsingCache));
      console.log('[ProfitCalculator] Usando cotações do appData:', {
        btcToUsd: appData.currentPrice.usd,
        brlToUsd: appData.currentPrice.brl / appData.currentPrice.usd
      });
      return;
    } else {
      // Último recurso: buscar cotações diretamente
      states.setLoading(true);
      try {
        const priceData = await getCurrentBitcoinPrice();
        if (priceData) {
          states.setCurrentRates({
            btcToUsd: priceData.usd,
            brlToUsd: priceData.brl / priceData.usd,
          });
          states.setUsingFallbackRates(priceData.isUsingCache);
          
          console.log('[ProfitCalculator] Cotações obtidas diretamente da API:', {
            btcToUsd: priceData.usd,
            brlToUsd: priceData.brl / priceData.usd
          });
          
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
      
      // MELHORADO: Criar Set com IDs existentes para verificação rápida de duplicatas
      // Garantimos que apenas originalIds válidos sejam incluídos no Set
      const existingTradeIds = new Set();
      
      if (currentActiveReportObjectFromHook.profits && currentActiveReportObjectFromHook.profits.length > 0) {
        currentActiveReportObjectFromHook.profits.forEach(profit => {
          if (profit.originalId && typeof profit.originalId === 'string' && profit.originalId.startsWith('trade_')) {
            existingTradeIds.add(profit.originalId);
          }
        });
      }
      
      console.log('[handleImportTrades] IDs existentes carregados:', {
        existingCount: existingTradeIds.size,
        sampleIds: Array.from(existingTradeIds).slice(0, 5),
        totalProfits: currentActiveReportObjectFromHook.profits?.length || 0
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
        
                 // MELHORADO: Validar e filtrar trades válidos antes de adicionar
         const validTrades = [];
         
         // Processar cada trade individualmente para melhor diagnóstico
         for (const trade of pageData) {
           // Garantir que o trade tem ID
           if (!trade.id && !trade.uid) {
             console.warn('[handleImportTrades] Trade sem ID ignorado');
             continue;
           }
           
           // Criar ID consistente
           const tradeId = `trade_${trade.uid || trade.id}`;
           
           // Log detalhado para análise
           console.log(`[handleImportTrades] Analisando trade:`, {
             id: tradeId,
             pl: trade.pl,
             pl_type: typeof trade.pl,
             closed: trade.closed
           });
           
           // Verificação de duplicata
           if (existingTradeIds.has(tradeId)) {
             console.log(`[handleImportTrades] Trade duplicado: ${tradeId}`);
             totalDuplicatesFound++;
             continue;
           }
           
           // Validação completa do trade
           const validation = validateTradeForImport(trade);
           if (!validation.isValid) {
             console.warn(`[handleImportTrades] Trade inválido: ${validation.reason}`, { 
               id: tradeId, 
               closed: trade.closed, 
               pl: trade.pl 
             });
             continue;
           }
           
           // Trade válido
           console.log(`[handleImportTrades] Trade válido adicionado: ${tradeId}`);
           validTrades.push(trade);
           
           // Adicionar ao Set para evitar duplicatas na mesma importação
           existingTradeIds.add(tradeId);
         }
        
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
          validTrades.forEach((trade: any) => {
            const tradeId = `trade_${trade.uid || trade.id}`;
            existingTradeIds.add(tradeId);
          });
        }
        
        currentOffset += batchSize;
        
        // NOVO: Atualizar informações de progresso
        const percentageComplete = Math.min(100, Math.round((currentOffset / maxOffsetLimit) * 100));
        setImportProgress(prev => ({
          ...prev,
          trades: {
            ...prev.trades,
            current: currentOffset,
            total: maxOffsetLimit,
            percentage: percentageComplete,
            message: `Página ${currentOffset / batchSize} | ${allTrades.length} trades | ${totalDuplicatesFound} duplicados`
          }
        }));
        
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

             // MÁXIMA PERMISSIVIDADE: Aceitar praticamente qualquer trade
      // Baseado no critério do usuário: "closed:true e pl diferente de 0 deve ser válido"
      const tradesToProcess = allTrades.filter(trade => {
        // MÍNIMO: Precisa ter ID
        if (!trade.id && !trade.uid) {
          console.log('[handleImportTrades] Trade sem ID rejeitado');
          return false;
        }
        
        // CRITÉRIO PRINCIPAL DO USUÁRIO: closed=true e pl≠0
        const isClosed = trade.closed === true || trade.closed === 'true' || 
                        trade.closed === 1 || trade.status === 'closed' ||
                        trade.status === 'done' || trade.state === 'closed';
        
        const plValue = Number(trade.pl);
        const hasNonZeroPL = !isNaN(plValue) && plValue !== 0;
        
        // Log detalhado de cada trade
        console.log('[handleImportTrades] Avaliando trade:', {
          id: trade.id || trade.uid,
          closed: trade.closed,
          status: trade.status,
          isClosed,
          pl: trade.pl,
          plValue,
          hasNonZeroPL,
          side: trade.side,
          quantity: trade.quantity,
          hasSideQuantity: !!(trade.side && trade.quantity)
        });
        
        // Qualquer trade com ID e alguma dessas condições é aceito
        return (isClosed && hasNonZeroPL) ||  // Critério principal: closed=true e pl≠0
               isClosed ||                    // Aceitar qualquer trade fechado
               hasNonZeroPL ||               // Aceitar qualquer trade com pl≠0
               (trade.side && trade.quantity); // Aceitar qualquer trade com side e quantity
      });
      
      const totalTrades = tradesToProcess.length;
      
      console.log('[handleImportTrades] Trades para processamento:', {
        totalFound: allTrades.length,
        validForProcessing: totalTrades,
        filtered: allTrades.length - totalTrades,
        detalhes: {
          semId: allTrades.filter(t => !(t.uid || t.id)).length,
          naoFechados: allTrades.filter(t => !(t.closed || t.status === 'closed')).length,
          semPL: allTrades.filter(t => t.pl === undefined || t.pl === null).length,
          semSideQuantity: allTrades.filter(t => !(t.side && t.quantity)).length
        }
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

      // OTIMIZADO: Processamento em lotes para melhor performance
      const processingBatchSize = 10;
      
      for (let i = 0; i < tradesToProcess.length; i += processingBatchSize) {
        const batch = tradesToProcess.slice(i, i + processingBatchSize);
        
        // Processar lote
        for (const trade of batch) {
          try {
            console.log('[handleImportTrades] Processando trade:', {
              id: trade.id,
              uid: trade.uid,
              closed: trade.closed,
              pl: trade.pl,
              side: trade.side,
              quantity: trade.quantity
            });
            
            const profitRecord = convertTradeToProfit(trade);
            
            console.log('[handleImportTrades] Registro convertido:', {
              id: profitRecord.id,
              originalId: profitRecord.originalId,
              date: profitRecord.date,
              amount: profitRecord.amount,
              isProfit: profitRecord.isProfit
            });
            
            const result = addProfitRecord(profitRecord, currentActiveReportObjectFromHook.id, { suppressToast: true });
            
            if (result.status === 'added') {
              imported++;
              console.log('[handleImportTrades] ✅ Trade adicionado:', result.id);
            } else if (result.status === 'duplicate') {
              duplicated++;
              console.log('[handleImportTrades] ⚠️ Trade duplicado:', result.originalId);
            } else {
              errors++;
              console.error('[handleImportTrades] ❌ Erro ao adicionar trade:', result);
            }
          } catch (conversionError) {
            console.error('[handleImportTrades] Erro na conversão do trade:', conversionError);
            errors++;
          }
          
          processed++;
        }
        
        // Atualizar progresso após cada lote
        const percentage = (processed / totalTrades) * 100;
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
        
        // Pequeno delay entre lotes para não travar a UI
        if (i + processingBatchSize < tradesToProcess.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
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
    console.log('[isDepositConfirmed] Analisando depósito:', {
      id: deposit.id,
      type: deposit.type,
      amount: deposit.amount,
      // Todos os possíveis atributos de confirmação
      isConfirmed: deposit.isConfirmed,
      is_confirmed: deposit.is_confirmed,
      success: deposit.success,
      status: deposit.status
    });

    // Verificar diferentes atributos dependendo do tipo de depósito:
    // 1. Depósitos on-chain (bitcoin): is_confirmed: true
    // 2. Depósitos internos: success: true  
    // 3. Depósitos lightning: status específico ou outros atributos
    
    // Se explicitamente não confirmado
    if (deposit.isConfirmed === false) {
      console.log('[isDepositConfirmed] ❌ Rejeitado: isConfirmed === false');
      return false;
    }
    
    // Se é depósito on-chain confirmado (padrão para bitcoin)
    if (deposit.is_confirmed === true) {
      console.log('[isDepositConfirmed] ✅ Confirmado: is_confirmed === true (on-chain)');
      return true;
    }
    
    // Se é depósito interno bem-sucedido
    if (deposit.success === true) {
      console.log('[isDepositConfirmed] ✅ Confirmado: success === true (internal)');
      return true;
    }
    
    // Se tem isConfirmed true (caso padrão antigo)
    if (deposit.isConfirmed === true) {
      console.log('[isDepositConfirmed] ✅ Confirmado: isConfirmed === true (legacy)');
      return true;
    }
    
    // Para depósitos bitcoin sem is_confirmed explícito, verificar se tem tx_id (indica confirmação)
    if (deposit.type === 'bitcoin' && deposit.tx_id && !deposit.hasOwnProperty('is_confirmed')) {
      console.log('[isDepositConfirmed] ✅ Confirmado: depósito bitcoin com tx_id (assumindo confirmado)');
      return true;
    }
    
    // Se nenhum indicador negativo explícito, considerar confirmado (fallback conservador)
    const hasNegativeIndicator = deposit.isConfirmed === false || deposit.is_confirmed === false || deposit.success === false;
    if (!hasNegativeIndicator) {
      console.log('[isDepositConfirmed] ✅ Confirmado: sem indicadores negativos (fallback)');
      return true;
    }
    
    console.log('[isDepositConfirmed] ❌ Rejeitado: não atende critérios de confirmação');
    return false;
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
        depositsStructure: deposits.map((d: any) => ({
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

      for (const deposit of deposits) {
        console.log('[handleImportDeposits] Processando depósito:', {
          id: deposit.id,
          amount: deposit.amount,
          type: deposit.type,
          status: deposit.status,
          created_at: deposit.created_at,
          ts: deposit.ts,
          // Diferentes atributos de confirmação
          isConfirmed: deposit.isConfirmed,
          is_confirmed: deposit.is_confirmed,
          success: deposit.success,
          // Resultado da lógica
          isConfirmedByLogic: isDepositConfirmed(deposit)
        });

        // NOVO: Log detalhado do depósito antes da verificação de status
        console.log('[handleImportDeposits] Analisando depósito:', {
          id: deposit.id,
          amount: deposit.amount,
          status: deposit.status,
          created_at: deposit.created_at,
          deposit_type: deposit.deposit_type,
          txid: deposit.txid
        });

        // NOVO: Verificação mais flexível do status usando função auxiliar
        const isConfirmed = isDepositConfirmed(deposit);
        
        console.log('[handleImportDeposits] Verificação de confirmação:', {
          type: deposit.type,
          status: deposit.status,
          // Todos os atributos de confirmação
          isConfirmed: deposit.isConfirmed,
          is_confirmed: deposit.is_confirmed,
          success: deposit.success,
          // Resultado
          isConfirmedByLogic: isConfirmed,
          logic: 'is_confirmed=true OR success=true OR (isConfirmed≠false AND is_confirmed≠false AND success≠false)'
        });

        if (isConfirmed) {
          try {
            const investment = convertDepositToInvestment(deposit);
            
            console.log('[handleImportDeposits] Investimento convertido:', {
              id: investment.id,
              originalId: investment.originalId,
              date: investment.date,
              amount: investment.amount,
              unit: investment.unit
            });
            
            console.log('[handleImportDeposits] Tentando adicionar novo investimento...');
            
            const result = addInvestment(investment, currentActiveReportObjectFromHook.id, { suppressToast: true });
          
            console.log('[handleImportDeposits] Resultado da adição:', {
              status: result.status,
              id: result.id,
              originalId: result.originalId,
              message: result.message
            });
          
            if (result.status === 'added') {
              imported++;
              console.log('[handleImportDeposits] ✅ Investimento adicionado com sucesso:', result.id);
            } else if (result.status === 'duplicate') {
              duplicated++;
              console.log('[handleImportDeposits] ⚠️ Investimento duplicado detectado:', result.originalId);
            } else {
              errors++;
              console.error('[handleImportDeposits] ❌ Erro ao adicionar investimento:', result);
            }
          } catch (conversionError) {
            console.error('[handleImportDeposits] Erro na conversão do depósito:', conversionError);
            errors++;
          }
        } else {
          skipped++;
          console.log('[handleImportDeposits] Depósito ignorado (não confirmado):', {
            id: deposit.id,
            type: deposit.type,
            status: deposit.status,
            amount: deposit.amount,
            created_at: deposit.created_at,
            ts: deposit.ts,
            // Todos os atributos de confirmação
            isConfirmed: deposit.isConfirmed,
            is_confirmed: deposit.is_confirmed,
            success: deposit.success,
            reason: 'Nenhum atributo de confirmação positivo encontrado'
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
          statusDistribution: deposits.reduce((acc: Record<string, number>, d: any) => {
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

      for (const withdrawal of response.data) {
        console.log('[handleImportWithdrawals] Processando saque:', {
          id: withdrawal.id,
          amount: withdrawal.amount,
          status: withdrawal.status,
          created_at: withdrawal.created_at,
          isConfirmed: withdrawal.status === 'confirmed'
        });
        
        // NOVO: Importar todos os saques independente do status
        try {
          const withdrawalRecord = convertWithdrawalToRecord(withdrawal);
          
          console.log('[handleImportWithdrawals] Saque convertido:', {
            id: withdrawalRecord.id,
            originalId: withdrawalRecord.originalId,
            date: withdrawalRecord.date,
            amount: withdrawalRecord.amount,
            unit: withdrawalRecord.unit,
            originalStatus: withdrawal.status
          });
          
          console.log('[handleImportWithdrawals] Tentando adicionar novo saque...');
          
          const result = addWithdrawal(withdrawalRecord, currentActiveReportObjectFromHook.id, { suppressToast: true });
          
          console.log('[handleImportWithdrawals] Resultado da adição:', {
            status: result.status,
            id: result.id,
            originalId: result.originalId,
            message: result.message
          });
          
          if (result.status === 'added') {
            imported++;
            console.log('[handleImportWithdrawals] ✅ Saque adicionado com sucesso:', result.id);
          } else if (result.status === 'duplicate') {
            duplicated++;
            console.log('[handleImportWithdrawals] ⚠️ Saque duplicado detectado:', result.originalId);
          } else {
            errors++;
            console.error('[handleImportWithdrawals] ❌ Erro ao adicionar saque:', result);
          }
        } catch (conversionError) {
          console.error('[handleImportWithdrawals] Erro na conversão do saque:', conversionError);
          errors++;
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
        withdrawals: { 
          total: response.data?.length || 0, 
          imported, 
          duplicated, 
          errors,
          processed: totalWithdrawals,
          confirmedCount: response.data?.length || 0, // Todos são processados agora
          statusDistribution: response.data?.reduce((acc: Record<string, number>, w: any) => {
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



  // ULTRA SIMPLIFICADO: Função para validar trades com critérios mínimos
  const validateTradeForImport = (trade: any): { isValid: boolean; reason?: string } => {
    // Log básico do trade
    console.log('[validateTradeForImport] Validando trade:', {
      id: trade.id || trade.uid,
      closed: trade.closed,
      pl: trade.pl
    });
    
    // CRITÉRIO 1: Deve ser um objeto
    if (!trade || typeof trade !== 'object') {
      return { isValid: false, reason: 'Objeto trade inválido' };
    }
    
    // CRITÉRIO 2: Deve ter ID
    if (!trade.id && !trade.uid) {
      return { isValid: false, reason: 'Trade sem ID válido' };
    }
    
    // Critério do usuário: "closed:true e pl diferente de 0 deve ser válido"
    // Para compatibilidade, vamos aceitar diversos formatos de "closed"
    const isClosed = trade.closed === true || trade.closed === 'true' || 
                     trade.closed === 1 || trade.status === 'closed' || 
                     trade.status === 'done' || trade.state === 'closed';
    
    // Se não tiver PL, ainda podemos processar se tiver closed
    if (trade.pl === undefined || trade.pl === null) {
      if (isClosed) {
        console.log('[validateTradeForImport] Trade válido (closed=true, sem PL)');
        return { isValid: true };
      }
      if (trade.side && trade.quantity) {
        console.log('[validateTradeForImport] Trade válido (tem side e quantity)');
        return { isValid: true };
      }
      return { isValid: false, reason: 'Trade sem PL e não fechado' };
    }
    
    // Qualquer trade com PL não zero é válido (requisito do usuário)
    const plValue = Number(trade.pl);
    if (!isNaN(plValue) && plValue !== 0) {
      console.log('[validateTradeForImport] Trade válido (pl não zero)');
      return { isValid: true };
    }
    
    // Regra especial para trades com PL zero
    if (plValue === 0 && isClosed) {
      console.log('[validateTradeForImport] Trade válido (closed=true, pl=0)');
      return { isValid: true };
    }
    
    // Último critério: side e quantity
    if (trade.side && trade.quantity) {
      console.log('[validateTradeForImport] Trade válido (tem side e quantity)');
      return { isValid: true };
    }
    
    // Se chegou aqui, não atende a nenhum critério
    return { isValid: false, reason: 'Trade não atende aos critérios mínimos' };
  };

  // Funções stub vazias para as funções removidas que são referenciadas na interface
  // Estas funções serão removidas junto com suas referências na interface em breve
  const analyzeDepositStatuses = () => {};
  const verifyImportIntegrity = () => {};
  const testAddInvestment = () => {};
  const debugTradesFromAPI = () => {};
  const testTradeConversionAndSave = () => {};
  const importTestedTrades = () => {};
  const importTestedDeposits = () => {};
  const debugWithdrawalsFromAPI = () => {};
  const importTestedWithdrawals = () => {};
  
  // Stub melhorado da função antiga de monitoramento
  // Foi substituída por atualizações diretas ao estado de progresso
  const monitorSearchProgress = (
    progressType: 'trades' | 'deposits' | 'withdrawals', 
    current: number, 
    total: number, 
    message?: string
  ) => {
    // Atualiza diretamente o estado de progresso para compatibilidade com código legado
    const percentage = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
    
    setImportProgress(prev => ({
      ...prev,
      [progressType]: {
        current,
        total,
        percentage,
        status: current >= total ? 'complete' : 'loading',
        message: message || `Progresso: ${current}/${total} (${percentage}%)`
      }
    }));
    
    console.log(`[monitorSearchProgress] Atualização: ${progressType} - ${current}/${total} (${percentage}%)`);
  };

  // NOVA: Função para forçar atualização (do MultiReportCalculator)
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
      if (firstKey) {
        filteredDataCache.current.delete(firstKey);
      }
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
      if (firstKey) {
        chartDataCache.current.delete(firstKey);
      }
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

  // Estado será implementado quando o recurso de exportação for ativado

  // Função de exportação será implementada em breve



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
                    onClick={() => {
                      // Função de exportação Excel simplificada
                      console.log('Exportação Excel temporariamente desabilitada para corrigir build');
                        toast({
                        title: "🚧 Funcionalidade Temporariamente Indisponível",
                        description: "A exportação Excel será reativada em breve.",
                          variant: "default",
                      });
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

          {/* Estatísticas de importação melhoradas */}
          {importStats && selectedConfigForImport && (
            <div className="mt-6 p-4 bg-black/20 rounded-lg border border-purple-700/30">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-purple-400 flex items-center gap-2">
                  📊 Última Importação 
                  <span className="text-gray-400">({multipleConfigs?.configs.find(c => c.id === selectedConfigForImport)?.name})</span>
              </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setImportStats(null);
                    if (user?.email) {
                      localStorage.removeItem(`importStats_${user.email}`);
                    }
                    toast({
                      title: "🗑️ Estatísticas Limpas",
                      description: "Histórico de importação foi removido.",
                      variant: "default",
                    });
                  }}
                  className="text-xs text-gray-400 hover:text-white h-6 px-2"
                >
                  Limpar
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {importStats.trades && importStats.trades.total > 0 && (
                  <div className="p-3 bg-green-900/20 rounded border border-green-700/30">
                    <div className="text-green-400 font-medium mb-2 flex items-center gap-2">
                      <TrendingUp className="h-3 w-3" />
                      Trades
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Analisados:</span>
                        <span className="text-white">{importStats.trades.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Importados:</span>
                        <span className="text-green-400">{importStats.trades.imported}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Duplicados:</span>
                        <span className="text-yellow-400">{importStats.trades.duplicated}</span>
                      </div>
                      {importStats.trades.errors > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Erros:</span>
                          <span className="text-red-400">{importStats.trades.errors}</span>
                  </div>
                )}
                      {importStats.trades.pagesSearched && (
                        <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-green-700/30">
                          {importStats.trades.pagesSearched} páginas • {importStats.trades.stoppedReason === 'emptyPages' ? '🎯 Otimizado' : 
                           importStats.trades.stoppedReason === 'duplicates' ? '⚠️ Duplicatas' : 
                           importStats.trades.stoppedReason === 'maxPages' ? '📄 Limite' : '✅ Completo'}
                  </div>
                )}
                    </div>
                  </div>
                )}
                {importStats.deposits && importStats.deposits.total > 0 && (
                  <div className="p-3 bg-blue-900/20 rounded border border-blue-700/30">
                    <div className="text-blue-400 font-medium mb-2 flex items-center gap-2">
                      <Download className="h-3 w-3" />
                      Depósitos
              </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total:</span>
                        <span className="text-white">{importStats.deposits.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Confirmados:</span>
                        <span className="text-blue-400">{importStats.deposits.confirmedCount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Importados:</span>
                        <span className="text-green-400">{importStats.deposits.imported}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Duplicados:</span>
                        <span className="text-yellow-400">{importStats.deposits.duplicated}</span>
                      </div>
                      {(importStats.deposits.skipped || 0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Ignorados:</span>
                          <span className="text-gray-500">{importStats.deposits.skipped || 0}</span>
                        </div>
                      )}
                      {importStats.deposits.statusDistribution && (
                        <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-blue-700/30">
                          Status: {Object.entries(importStats.deposits.statusDistribution).map(([status, count]) => 
                            `${status}(${count})`
                          ).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {importStats.withdrawals && importStats.withdrawals.total > 0 && (
                  <div className="p-3 bg-orange-900/20 rounded border border-orange-700/30">
                    <div className="text-orange-400 font-medium mb-2 flex items-center gap-2">
                      <Upload className="h-3 w-3" />
                      Saques
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total:</span>
                        <span className="text-white">{importStats.withdrawals.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Confirmados:</span>
                        <span className="text-orange-400">{importStats.withdrawals.confirmedCount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Importados:</span>
                        <span className="text-green-400">{importStats.withdrawals.imported}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Duplicados:</span>
                        <span className="text-yellow-400">{importStats.withdrawals.duplicated}</span>
                      </div>
                      {importStats.withdrawals.errors > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Erros:</span>
                          <span className="text-red-400">{importStats.withdrawals.errors}</span>
                        </div>
                      )}
                      {importStats.withdrawals.statusDistribution && Object.keys(importStats.withdrawals.statusDistribution).length > 1 && (
                        <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-orange-700/30">
                          Status: {Object.entries(importStats.withdrawals.statusDistribution).map(([status, count]) => 
                            `${status}(${count})`
                          ).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
                            {/* Resumo geral */}
              <div className="mt-4 pt-3 border-t border-purple-700/30">
                <div className="text-xs text-gray-400 flex flex-wrap gap-4 mb-2">
                  <span>
                    ✅ Total importado: {(importStats.trades?.imported || 0) + (importStats.deposits?.imported || 0) + (importStats.withdrawals?.imported || 0)}
                  </span>
                  <span>
                    ⚠️ Total duplicado: {(importStats.trades?.duplicated || 0) + (importStats.deposits?.duplicated || 0) + (importStats.withdrawals?.duplicated || 0)}
                  </span>
                  {((importStats.trades?.errors || 0) + (importStats.deposits?.errors || 0) + (importStats.withdrawals?.errors || 0)) > 0 && (
                    <span>
                      ❌ Total erros: {(importStats.trades?.errors || 0) + (importStats.deposits?.errors || 0) + (importStats.withdrawals?.errors || 0)}
                    </span>
                  )}
                </div>
                
                {/* Timestamp da última importação */}
                {(() => {
                  try {
                    const savedStats = localStorage.getItem(`importStats_${user?.email}`);
                    if (savedStats) {
                      const parsedStats = JSON.parse(savedStats);
                      if (parsedStats.timestamp) {
                        const lastImportDate = new Date(parsedStats.timestamp);
                        const now = new Date();
                        const diffMinutes = Math.floor((now.getTime() - lastImportDate.getTime()) / (1000 * 60));
                        
                        let timeAgo = '';
                        if (diffMinutes < 1) {
                          timeAgo = 'agora mesmo';
                        } else if (diffMinutes < 60) {
                          timeAgo = `${diffMinutes} min atrás`;
                        } else if (diffMinutes < 1440) {
                          timeAgo = `${Math.floor(diffMinutes / 60)}h atrás`;
                        } else {
                          timeAgo = formatDateFn(lastImportDate, "dd/MM/yyyy HH:mm");
                        }
                        
                        return (
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            <span>🕒</span>
                            <span>Última importação: {timeAgo}</span>
                          </div>
                        );
                      }
                    }
                  } catch (error) {
                    // Ignorar erro
                  }
                  return null;
                })()}
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

                {/* Card de Aviso - Sem Configuração API */}
                {(!multipleConfigs || multipleConfigs.configs.length === 0) && (
                  <Card className="bg-yellow-900/30 border border-yellow-600/50 mb-4">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-yellow-400">
                        <AlertTriangle className="h-5 w-5" />
                        Configuração Necessária
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <p className="text-yellow-200">
                          Você ainda não tem nenhuma configuração de API LN Markets para importação de dados.
                        </p>
                        <p className="text-sm text-yellow-300/80">
                          Para usar as funcionalidades de importação, você precisa configurar suas credenciais de API no seu perfil.
                        </p>
                        <div className="flex justify-between items-center pt-2">
                          <Link href="/profile" className="flex items-center gap-2 text-white bg-yellow-700 hover:bg-yellow-600 px-4 py-2 rounded-md transition-colors">
                            <User className="h-4 w-4" />
                            Ir para meu Perfil
                          </Link>
                          <a href="https://lnmarkets.com/en/settings/api" target="_blank" rel="noopener noreferrer" className="text-sm text-yellow-400 hover:text-yellow-300 underline underline-offset-2">
                            Criar chaves API no LN Markets
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Cards de Importação LN Markets */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Botão de exportação tradicional em breve será implementado */}
                  
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
                        <Select value={states.displayCurrency} onValueChange={(value: "USD" | "BRL") => {
                          states.setDisplayCurrency(value);
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
                    value={formatCurrency(getFilteredHistoryData.investments.reduce((sum: number, inv: any) => {
                      const btcAmount = convertToBtc(inv.amount, inv.unit);
                      const usdValue = btcAmount * states.currentRates.btcToUsd;
                      return sum + (states.displayCurrency === "BRL" ? usdValue * states.currentRates.brlToUsd : usdValue);
                    }, 0), states.displayCurrency)}
                    icon={<TrendingDown className="h-4 w-4 text-blue-400" />}
                    valueColor="text-blue-400"
                  />
                  
                  <HistoryStatsCard
                    title="Lucros/Perdas"
                    value={formatCurrency(getFilteredHistoryData.profits.reduce((sum: number, profit: any) => {
                      const btcAmount = convertToBtc(profit.amount, profit.unit);
                      const value = profit.isProfit ? btcAmount : -btcAmount;
                      const usdValue = value * states.currentRates.btcToUsd;
                      return sum + (states.displayCurrency === "BRL" ? usdValue * states.currentRates.brlToUsd : usdValue);
                    }, 0), states.displayCurrency)}
                    icon={<TrendingUp className="h-4 w-4 text-green-400" />}
                    valueColor={getFilteredHistoryData.profits.reduce((sum: number, profit: any) => {
                      const btcAmount = convertToBtc(profit.amount, profit.unit);
                      return sum + (profit.isProfit ? btcAmount : -btcAmount);
                    }, 0) >= 0 ? "text-green-400" : "text-red-400"}
                  />
                  
                  <HistoryStatsCard
                    title="Saques"
                    value={formatCurrency(getFilteredHistoryData.withdrawals.reduce((sum: number, w: any) => {
                      const btcAmount = convertToBtc(w.amount, w.unit);
                      const usdValue = btcAmount * states.currentRates.btcToUsd;
                      return sum + (states.displayCurrency === "BRL" ? usdValue * states.currentRates.brlToUsd : usdValue);
                    }, 0), states.displayCurrency)}
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
                                  <span className="text-green-400">{getFilteredHistoryData.profits.filter((p: any) => p.isProfit).length}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Perdas:</span>
                                  <span className="text-red-400">{getFilteredHistoryData.profits.filter((p: any) => !p.isProfit).length}</span>
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
                                    ₿{getFilteredHistoryData.investments.reduce((sum: number, inv: any) => sum + convertToBtc(inv.amount, inv.unit), 0).toFixed(8)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Lucro/Perda:</span>
                                  <span className={getFilteredHistoryData.profits.reduce((sum: number, profit: any) => {
                                    const btcAmount = convertToBtc(profit.amount, profit.unit);
                                    return sum + (profit.isProfit ? btcAmount : -btcAmount);
                                  }, 0) >= 0 ? "text-green-400" : "text-red-400"}>
                                    ₿{getFilteredHistoryData.profits.reduce((sum: number, profit: any) => {
                                      const btcAmount = convertToBtc(profit.amount, profit.unit);
                                      return sum + (profit.isProfit ? btcAmount : -btcAmount);
                                    }, 0).toFixed(8)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Total Sacado:</span>
                                  <span className="text-orange-400">
                                    ₿{getFilteredHistoryData.withdrawals.reduce((sum: number, w: any) => sum + convertToBtc(w.amount, w.unit), 0).toFixed(8)}
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
                                <TableHead>Valor ({states.displayCurrency})</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getFilteredHistoryData.investments.map((investment: any) => {
                                const btcAmount = convertToBtc(investment.amount, investment.unit);
                                const usdValue = btcAmount * states.currentRates.btcToUsd;
                                const currencyValue = states.displayCurrency === "BRL" ? usdValue * states.currentRates.brlToUsd : usdValue;
                                
                                return (
                                  <TableRow key={investment.id}>
                                    <TableCell>{formatDateFn(new Date(investment.date), "dd/MM/yyyy")}</TableCell>
                                    <TableCell>{investment.amount.toLocaleString()}</TableCell>
                                    <TableCell>{investment.unit}</TableCell>
                                    <TableCell>₿{btcAmount.toFixed(8)}</TableCell>
                                    <TableCell>{formatCurrency(currencyValue, states.displayCurrency)}</TableCell>
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
                                <TableHead>Valor ({states.displayCurrency})</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getFilteredHistoryData.profits.map((profit: any) => {
                                const btcAmount = convertToBtc(profit.amount, profit.unit);
                                const usdValue = btcAmount * states.currentRates.btcToUsd;
                                const currencyValue = states.displayCurrency === "BRL" ? usdValue * states.currentRates.brlToUsd : usdValue;
                                
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
                                      {formatCurrency(currencyValue, states.displayCurrency)}
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
                                <TableHead>Valor ({states.displayCurrency})</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getFilteredHistoryData.withdrawals.map((withdrawal: any) => {
                                const btcAmount = convertToBtc(withdrawal.amount, withdrawal.unit);
                                const usdValue = btcAmount * states.currentRates.btcToUsd;
                                const currencyValue = states.displayCurrency === "BRL" ? usdValue * states.currentRates.brlToUsd : usdValue;
                                
                                return (
                                  <TableRow key={withdrawal.id}>
                                    <TableCell>{formatDateFn(new Date(withdrawal.date), "dd/MM/yyyy")}</TableCell>
                                    <TableCell>{withdrawal.amount.toLocaleString()}</TableCell>
                                    <TableCell>{withdrawal.unit}</TableCell>
                                    <TableCell className="text-orange-400">₿{btcAmount.toFixed(8)}</TableCell>
                                    <TableCell className="text-orange-400">{formatCurrency(currencyValue, states.displayCurrency)}</TableCell>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                      <div className="space-y-2">
                          <Label className="text-sm font-medium">Tipo de Gráfico</Label>
                        <Select value={chartType} onValueChange={(value: "line" | "bar" | "area") => setChartType(value)}>
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="area">Área</SelectItem>
                            <SelectItem value="bar">Barras Comparativas</SelectItem>
                            <SelectItem value="line">Barras Empilhadas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Unidade de Exibição</Label>
                        <Select value={chartDisplayUnit} onValueChange={(value: "btc" | "usd" | "brl") => setChartDisplayUnit(value)}>
                          <SelectTrigger className="h-10">
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
                        <Label className="text-sm font-medium">Período</Label>
                        <Select value={chartTimeframe} onValueChange={(value: "daily" | "monthly") => setChartTimeframe(value)}>
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">Mensal</SelectItem>
                            <SelectItem value="daily">Diário</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2 sm:col-span-2 xl:col-span-1">
                        <Label className="text-sm font-medium">Cotação Atual</Label>
                        <div className="text-xs bg-black/40 p-3 rounded border border-purple-700/30 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className={cn("w-2 h-2 rounded-full flex-shrink-0", 
                              states.usingFallbackRates ? "bg-yellow-400" : "bg-green-400"
                            )}></div>
                            <span className="font-medium">BTC/USD: ${states.currentRates.btcToUsd.toLocaleString()}</span>
                        </div>
                          <div className="text-gray-400">USD/BRL: R${states.currentRates.brlToUsd.toFixed(2)}</div>
                          {states.usingFallbackRates && (
                            <div className="text-yellow-400 text-xs flex items-center gap-1">
                              <span>⚠️</span>
                              <span>Usando cotação cache</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Controles de Séries Visíveis - Responsivo */}
                      <div className="mt-6 pt-4 border-t border-purple-700/30 sm:col-span-2 xl:col-span-4">
                        <Label className="text-sm font-medium mb-4 block">Séries Visíveis nos Gráficos</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="flex items-center space-x-3 p-3 bg-black/20 rounded-lg border border-blue-700/30">
                            <Switch
                              id="show-investments"
                              checked={chartVisibleSeries.investments}
                              onCheckedChange={(checked) => 
                                setChartVisibleSeries(prev => ({ ...prev, investments: checked }))
                              }
                            />
                            <Label htmlFor="show-investments" className="text-sm flex items-center gap-2 cursor-pointer flex-1">
                              <div className="w-3 h-3 bg-blue-400 rounded-full flex-shrink-0"></div>
                              <span>Investimentos</span>
                            </Label>
                          </div>
                          
                          <div className="flex items-center space-x-3 p-3 bg-black/20 rounded-lg border border-green-700/30">
                            <Switch
                              id="show-profits"
                              checked={chartVisibleSeries.profits}
                              onCheckedChange={(checked) => 
                                setChartVisibleSeries(prev => ({ ...prev, profits: checked }))
                              }
                            />
                            <Label htmlFor="show-profits" className="text-sm flex items-center gap-2 cursor-pointer flex-1">
                              <div className="w-3 h-3 bg-green-400 rounded-full flex-shrink-0"></div>
                              <span>Lucros/Perdas</span>
                            </Label>
                          </div>
                          
                          <div className="flex items-center space-x-3 p-3 bg-black/20 rounded-lg border border-yellow-700/30">
                            <Switch
                              id="show-balance"
                              checked={chartVisibleSeries.balance}
                              onCheckedChange={(checked) => 
                                setChartVisibleSeries(prev => ({ ...prev, balance: checked }))
                              }
                            />
                            <Label htmlFor="show-balance" className="text-sm flex items-center gap-2 cursor-pointer flex-1">
                              <div className="w-3 h-3 bg-yellow-400 rounded-full flex-shrink-0"></div>
                              <span>Saldo Total</span>
                            </Label>
                          </div>
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
                      <div className="h-[300px] sm:h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        {chartType === "area" ? (
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
                              fontSize={10}
                              tick={{ fontSize: 10 }}
                              interval="preserveStartEnd"
                              tickFormatter={(value) => {
                                if (isMobile) {
                                  return value.length > 6 ? `${value.substring(0, 6)}...` : value;
                                }
                                return value;
                              }}
                            />
                            <YAxis 
                              stroke="#9CA3AF"
                              fontSize={10}
                              tick={{ fontSize: 9 }}
                              width={isMobile ? 60 : 80}
                              tickFormatter={(value) => {
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
                              }}
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
                        ) : chartType === "bar" ? (
                          <BarChart data={getChartData.map(point => ({
                            ...point,
                            investments: convertChartValue(point.investments),
                            profits: convertChartValue(point.profits),
                            balance: convertChartValue(point.balance)
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                            <XAxis 
                              dataKey="month" 
                              stroke="#9CA3AF"
                              fontSize={10}
                              tick={{ fontSize: 10 }}
                              interval="preserveStartEnd"
                              tickFormatter={(value) => {
                                if (isMobile) {
                                  return value.length > 6 ? `${value.substring(0, 6)}...` : value;
                                }
                                return value;
                              }}
                            />
                            <YAxis 
                              stroke="#9CA3AF"
                              fontSize={10}
                              tick={{ fontSize: 9 }}
                              width={isMobile ? 60 : 80}
                              tickFormatter={(value) => {
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
                              }}
                            />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: '#1F2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                color: '#F3F4F6',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                              }}
                              formatter={(value: number, name: string) => {
                                const formattedValue = formatChartValue(value);
                                const formattedName = 
                                name === 'investments' ? 'Investimentos' :
                                  name === 'profits' ? 'Lucros/Perdas' : 
                                  name === 'balance' ? 'Saldo Total' : name;
                                return [formattedValue, formattedName];
                              }}
                              labelFormatter={(label) => `Período: ${label}`}
                            />
                            <Legend 
                              wrapperStyle={{ paddingTop: '20px' }}
                              iconType="rect"
                            />
                            {chartVisibleSeries.investments && (
                              <Bar 
                              dataKey="investments" 
                                fill="#3B82F6" 
                              name="Investimentos"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={60}
                            />
                            )}
                            {chartVisibleSeries.profits && (
                              <Bar 
                              dataKey="profits" 
                                fill="#10B981" 
                              name="Lucros/Perdas"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={60}
                            />
                            )}
                            {chartVisibleSeries.balance && (
                              <Bar 
                              dataKey="balance" 
                                fill="#F59E0B" 
                              name="Saldo Total"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={60}
                                opacity={0.8}
                            />
                            )}
                          </BarChart>
                        ) : (
                          <BarChart data={getChartData.map(point => ({
                            ...point,
                            investments: convertChartValue(point.investments),
                            profits: convertChartValue(point.profits),
                            balance: convertChartValue(point.balance)
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                            <XAxis 
                              dataKey="month" 
                              stroke="#9CA3AF"
                              fontSize={12}
                              tick={{ fontSize: 11 }}
                              tickFormatter={(value) => value.length > 10 ? `${value.substring(0, 10)}...` : value}
                            />
                            <YAxis 
                              stroke="#9CA3AF"
                              fontSize={12}
                              tick={{ fontSize: 10 }}
                              tickFormatter={formatChartValue}
                            />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: '#1F2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                color: '#F3F4F6',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                              }}
                              formatter={(value: number, name: string) => {
                                const formattedValue = formatChartValue(value);
                                const formattedName = 
                                name === 'investments' ? 'Investimentos' :
                                  name === 'profits' ? 'Lucros/Perdas' : 
                                  name === 'balance' ? 'Saldo Total' : name;
                                return [formattedValue, formattedName];
                              }}
                              labelFormatter={(label) => `Período: ${label}`}
                            />
                            <Legend 
                              wrapperStyle={{ paddingTop: '20px' }}
                              iconType="rect"
                            />
                            {chartVisibleSeries.investments && (
                            <Bar 
                              dataKey="investments" 
                                stackId="stack"
                              fill="#3B82F6" 
                              name="Investimentos"
                                radius={[0, 0, 0, 0]}
                                maxBarSize={60}
                            />
                            )}
                            {chartVisibleSeries.profits && (
                            <Bar 
                              dataKey="profits" 
                                stackId="stack"
                              fill="#10B981" 
                              name="Lucros/Perdas"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={60}
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
                        <div className="h-[250px] sm:h-[300px] w-full flex items-center justify-center">
                          <div className="text-center space-y-2">
                            <div className="text-gray-400 text-lg">🥧</div>
                            <div className="text-gray-400 text-sm">
                              Sem dados para composição
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-[250px] sm:h-[300px] w-full">
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
                              label={({ name, percent }) => {
                                // Responsivo: mostrar apenas porcentagem em telas pequenas
                                if (isMobile) {
                                  return `${(percent * 100).toFixed(0)}%`;
                                }
                                return `${name}: ${(percent * 100).toFixed(1)}%`;
                              }}
                              outerRadius={isMobile ? 50 : 70}
                              innerRadius={isMobile ? 20 : 30}
                              fill="#8884d8"
                              dataKey="value"
                              fontSize={isMobile ? 10 : 12}
                            >
                            </Pie>
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: '#1F2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                color: '#F3F4F6',
                                fontSize: '12px'
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

                {/* Informações sobre os Dados - Responsivo */}
                <Card className="bg-black/30 border border-purple-700/40">
                  <CardContent className="py-4">
                    {/* Legenda responsiva */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-gray-400 mb-4">
                      <div className="flex items-center gap-2 p-2 bg-black/20 rounded border border-blue-700/30">
                        <div className="w-3 h-3 bg-blue-400 rounded-full flex-shrink-0"></div>
                        <span className="truncate text-xs sm:text-sm">Investimentos</span>
                    </div>
                      <div className="flex items-center gap-2 p-2 bg-black/20 rounded border border-green-700/30">
                        <div className="w-3 h-3 bg-green-400 rounded-full flex-shrink-0"></div>
                        <span className="truncate text-xs sm:text-sm">Lucros/Perdas</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-black/20 rounded border border-yellow-700/30">
                        <div className="w-3 h-3 bg-yellow-400 rounded-full flex-shrink-0"></div>
                        <span className="truncate text-xs sm:text-sm">Saldo Total</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-black/20 rounded border border-orange-700/30">
                        <div className="w-3 h-3 bg-orange-400 rounded-full flex-shrink-0"></div>
                        <span className="truncate text-xs sm:text-sm">Saques</span>
                      </div>
                    </div>
                    
                    {/* Informações da cotação - responsivo */}
                    <div className="text-xs text-gray-500 space-y-2 bg-black/20 p-3 rounded border border-purple-700/20">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                        <span className="text-gray-400">💰 Cotação atual:</span>
                        <span className="font-medium text-white">
                          ${states.currentRates.btcToUsd.toLocaleString()} USD/BTC
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                        <span className="text-gray-400">🌎 Conversão:</span>
                        <span className="font-medium text-white">
                          R${states.currentRates.brlToUsd.toFixed(2)} BRL/USD
                        </span>
                      </div>
                      {states.usingFallbackRates && (
                        <div className="text-yellow-400 text-xs flex items-center gap-2 mt-2 p-2 bg-yellow-900/20 rounded border border-yellow-700/30">
                          <span>⚠️</span>
                          <span>Usando cotação em cache - dados podem estar desatualizados</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

             {/* Dialog para exportação será implementado em breve */}
    </div>
  );
}
