"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useReportEvents } from "@/contexts/report-events-context";
import { useReportSync } from "@/contexts/report-sync-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { useReports } from "@/hooks/use-reports";
import { useIsMobile } from "@/hooks/use-mobile";
import { getCurrentBitcoinPrice, exportReportToPdf, exportReportToPdfWithRates } from "@/lib/client-api";
import { format } from "date-fns";
import { generateExcelReport, ExcelExportOptions } from "@/lib/excel-export";
import ExportOptionsDialog, { PDFExportOptions } from "@/components/export-options-dialog";
import { 
  AlertCircle,
  TrendingUp, 
  Download, 
  Upload, 
  Wallet, 
  Zap, 
  FileSpreadsheet, 
  FileText,
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
  FileDown,
  Loader2,
  RefreshCw,
  File,
  Calculator,
  Import as ImportIcon
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
import { captureProfitCalculatorCharts, waitForChartsToRender, CapturedChart } from "@/lib/chart-capture";



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
import { DisplayCurrency, CurrencyUnit, Investment, ProfitRecord, WithdrawalRecord, Report, STORAGE_KEYS, getLastUsedConfigId as getLastUsedConfigIdFromLib } from "@/lib/calculator-types";
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
        progress.status === 'complete' ? "text-green-400" : 
        progress.status === 'error' ? "text-red-400" : "text-gray-400")} />;
      case 'deposits': return <Download className={cn("h-4 w-4 transition-all duration-300", 
        progress.status === 'loading' ? "animate-bounce text-blue-400" : 
        progress.status === 'complete' ? "text-green-400" : 
        progress.status === 'error' ? "text-red-400" : "text-gray-400")} />;
      case 'withdrawals': return <Upload className={cn("h-4 w-4 transition-all duration-300", 
        progress.status === 'loading' ? "animate-pulse text-blue-400" : 
        progress.status === 'complete' ? "text-green-400" : 
        progress.status === 'error' ? "text-red-400" : "text-gray-400")} />;
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
function HistoryStatsCard({ title, value, icon, change, valueColor, isROI, hasBackground }: {
  title: string;
  value: string;
  icon: React.ReactNode;
  change?: number;
  valueColor?: string;
  isROI?: boolean;
  hasBackground?: boolean;
}) {
  return (
    <div className={cn("p-4 border rounded-lg", 
      isROI ? "bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-500/50" :
      hasBackground ? "bg-black/30 border-purple-700/40" : "bg-black/20 border-purple-700/30"
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className={cn("text-sm", isROI ? "text-purple-200 font-medium" : "text-gray-400")}>
          {title}
        </span>
        <div className={cn("p-1 rounded", isROI ? "bg-purple-500/20" : "")}>
          {icon}
        </div>
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
      {isROI && change !== undefined && change !== 0 && (
        <div className="mt-2 text-xs text-gray-400">
          Anualizado: {change >= 0 ? '+' : ''}{change.toFixed(2)}%
        </div>
      )}
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

  // Hooks para relatórios
  const { 
    reports: reportsCollection, 
    activeReport: currentActiveReportObjectFromHook,
    activeReportId: activeReportIdFromHook,
    isLoaded: reportsDataLoaded,
    addReport,
    deleteReport,
    addInvestment,
    addProfitRecord,
    addWithdrawal,
    deleteInvestment,
    deleteProfitRecord,
    deleteWithdrawal,
    updateReport,
    updateReportData,
    selectReport,
    deleteAllInvestmentsFromReport,
    deleteAllProfitsFromReport,
    deleteAllWithdrawalsFromReport,
    // Novas funções para múltiplas APIs
    associateAPIToReport,
    getReportAssociatedAPIs,
    hasMultipleAPIs,
    updateRecordSource
  } = useReports();
  
  // Obter a lista completa de relatórios para uso em visualizações múltiplas
  const allReportsFromHook = reportsCollection;

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
  const [chartViewMode, setChartViewMode] = useState<HistoryViewMode>("active"); // NOVO: Estado para controlar visualização do gráfico
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

  // NOVO: Estado para controle de recarregamento do componente
  const [componentKey, setComponentKey] = useState(0);
  const [lastActiveReportId, setLastActiveReportId] = useState<string | null>(null);

  // Estados para diálogos de confirmação de exclusão em massa
  const [showConfirmDeleteInvestments, setShowConfirmDeleteInvestments] = useState(false);
  const [showConfirmDeleteProfits, setShowConfirmDeleteProfits] = useState(false);
  const [showConfirmDeleteWithdrawals, setShowConfirmDeleteWithdrawals] = useState(false);

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
  const effectiveActiveReportId = activeReportData?.id || currentActiveReportObjectFromHook?.id;
  const effectiveActiveReport = activeReportData?.report || currentActiveReportObjectFromHook;

  // NOVO: Effect para detectar mudança do relatório ativo e forçar recarregamento
  useEffect(() => {
    console.log('[ProfitCalculator - DEBUG] Effect de mudança executado:', {
      effectiveActiveReportId,
      currentActiveReportIdFromHook: currentActiveReportObjectFromHook?.id,
      activeReportIdFromHook,
      lastActiveReportId,
      mudanca: effectiveActiveReportId !== lastActiveReportId,
      reportName: effectiveActiveReport?.name
    });

    if (effectiveActiveReportId && effectiveActiveReportId !== lastActiveReportId) {
      console.log('[ProfitCalculator] Relatório ativo mudou:', {
        de: lastActiveReportId,
        para: effectiveActiveReportId,
        nomeRelatorio: effectiveActiveReport?.name || 'Relatório'
      });

      // Limpar todos os caches quando o relatório ativo mudar
      chartDataCache.current.clear();
      filteredDataCache.current.clear();
      
      // Forçar recarregamento do componente
      setComponentKey(prev => prev + 1);
      setLocalForceUpdate(prev => prev + 1);
      
      // Resetar estados de filtros e visualização para valores padrão
      setHistoryFilterPeriod("3m");
      setHistoryViewMode("active");
      setHistoryActiveTab("overview");
      setChartViewMode("active");
      setChartDisplayUnit("btc");
      setChartType("bar");
      setChartTimeframe("monthly");
      
      // Atualizar estado de sincronização
      setSyncState(prev => ({
        ...prev,
        lastUpdate: Date.now(),
        isStale: false,
        forceUpdateCount: prev.forceUpdateCount + 1
      }));

      // Atualizar o último relatório ativo
      setLastActiveReportId(effectiveActiveReportId);

      // Mostrar notificação de mudança
      toast({
        title: "Relatório alterado",
        description: `Agora visualizando: ${effectiveActiveReport?.name || 'Relatório'}`,
        duration: 3000,
      });
    }
  }, [
    effectiveActiveReportId, 
    currentActiveReportObjectFromHook?.id,
    activeReportIdFromHook,
    lastActiveReportId, 
    effectiveActiveReport?.name, 
    toast
  ]);

  // NOVO: Effect de inicialização para definir o relatório ativo inicial
  useEffect(() => {
    if (effectiveActiveReportId && lastActiveReportId === null) {
      setLastActiveReportId(effectiveActiveReportId);
      console.log('[ProfitCalculator] Relatório ativo inicial definido:', {
        reportId: effectiveActiveReportId,
        reportName: effectiveActiveReport?.name
      });
    }
  }, [
    effectiveActiveReportId, 
    currentActiveReportObjectFromHook?.id,
    activeReportIdFromHook,
    lastActiveReportId, 
    effectiveActiveReport?.name
  ]);

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

    if (reportsDataLoaded && reportsCollection && reportsCollection.length > 0) {
      if (states.selectedReportIdsForHistoryView.length === 0) {
        const initialHistorySelection = currentActiveReportObjectFromHook 
          ? [currentActiveReportObjectFromHook.id]
          : (reportsCollection.length > 0 ? [reportsCollection[0].id] : []);
        states.setSelectedReportIdsForHistoryView(initialHistorySelection);
      } else {
        states.setSelectedReportIdsForHistoryView(prev => 
          prev.filter(id => reportsCollection.some((r: Report) => r.id === id))
        );
      }
    } else if (reportsDataLoaded && (!reportsCollection || reportsCollection.length === 0)) {
      states.setSelectedReportIdsForHistoryView([]);
    }
  }, [reportsDataLoaded, reportsCollection, currentActiveReportObjectFromHook]);

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
      const batchSize = 200; // AUMENTADO: Buscar mais trades por requisição (dobrado)
      const maxConsecutiveEmptyPages = 10; // AUMENTADO: Muito mais tolerante a páginas vazias
      const maxConsecutiveUnproductivePages = 15; // AUMENTADO: Muito mais tolerante a páginas improdutivas
      const maxRetries = 5; // AUMENTADO: Mais tentativas em caso de falha
      const maxTotalTrades = 50000; // AUMENTADO SIGNIFICATIVAMENTE: Buscar todos os trades históricos
      const maxOffsetLimit = 100000; // AUMENTADO SIGNIFICATIVAMENTE: Buscar muito mais no passado
      
      console.log('[handleImportTrades] Iniciando busca paginada otimizada...');
      
      // CORRIGIDO: Criar Set com IDs existentes para verificação rápida de duplicatas
      // Tratando corretamente o prefixo "trade_" para evitar duplicação
      const existingTradeIds = new Set();
      
      // NOVO: Conjunto para rastrear chaves compostas (ID+PL) já processadas nesta sessão
      const processedCompositeKeys = new Set();
      
      if (currentActiveReportObjectFromHook.profits && currentActiveReportObjectFromHook.profits.length > 0) {
        currentActiveReportObjectFromHook.profits.forEach(profit => {
          if (profit.originalId && typeof profit.originalId === 'string') {
            // Sempre armazenar com prefixo 'trade_' para consistência
            if (profit.originalId.startsWith('trade_')) {
              existingTradeIds.add(profit.originalId);
            } else {
              existingTradeIds.add(`trade_${profit.originalId}`);
            }
          }
        });
      }
      
      console.log('[handleImportTrades] Exemplo de IDs existentes:', Array.from(existingTradeIds).slice(0, 10));
      
      console.log('[handleImportTrades] IDs existentes carregados:', {
        existingCount: existingTradeIds.size,
        sampleIds: Array.from(existingTradeIds).slice(0, 5),
        totalProfits: currentActiveReportObjectFromHook.profits?.length || 0
      });
      
      while (hasMoreData && allTrades.length < maxTotalTrades && consecutiveEmptyPages < maxConsecutiveEmptyPages && consecutiveUnproductivePages < maxConsecutiveUnproductivePages && currentOffset < maxOffsetLimit) {
        console.log(`[handleImportTrades] Buscando lote: offset=${currentOffset}, limit=${batchSize}`);
        
        // Atualizar progresso com informações mais detalhadas
        setImportProgress(prev => ({
          ...prev,
          trades: { 
            current: allTrades.length, 
            total: Math.max(allTrades.length + batchSize, 100), // Estimativa dinâmica
            percentage: Math.min((allTrades.length / Math.max(allTrades.length + batchSize, 100)) * 100, 95), 
            status: 'loading', 
            message: `Buscando trades... Página ${Math.ceil(currentOffset/batchSize)}. (${allTrades.length} encontrados, ${totalDuplicatesFound} duplicatas)` 
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
            // Erro na primeira página indica problema com a API
            console.error('[handleImportTrades] Erro ao acessar a API:', response?.error);
            setImportProgress(prev => ({
              ...prev,
              trades: { 
                current: 0, 
                total: 0, 
                percentage: 0, 
                status: 'error', 
                message: 'Erro ao acessar a API' 
              }
            }));
            toast({
              title: "Erro na API",
              description: "Não foi possível buscar os dados na API. Por favor, revise os dados inseridos e verifique se sua API possui as permissões necessárias.",
              variant: "destructive",
            });
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
             closed: trade.closed,
             raw: JSON.stringify(trade).substring(0, 200) + '...'
           });
           
           // SOLUÇÃO MELHORADA: Sistema de detecção de duplicatas com chave composta
           // Agora vamos considerar um "composite key" que inclui ID + PL
           
           // Normalizar ID
           const cleanTradeId = tradeId.startsWith('trade_') 
             ? tradeId 
             : `trade_${tradeId}`;
           
           // Criar uma chave composta de ID+PL para identificação única
           // Usando Math.round para estabilizar valores numéricos com possíveis erros de ponto flutuante
           const plValue = Math.round(Number(trade.pl || 0));
           const compositeKey = `${cleanTradeId}|${plValue}`;
           
           // ID composto para o sistema (será salvo no objeto ProfitRecord)
           const compositeId = `lnm_${cleanTradeId.replace('trade_', '')}_pl${plValue}`;
             
           console.log(`[handleImportTrades] Verificando trade: ID=${cleanTradeId}, PL=${plValue}, compositeKey=${compositeKey}, compositeId=${compositeId}`);
           
           // IMPORTANTE: Não verificar mais duplicatas pelo ID básico
           // Verificar apenas pelo composite key
           
           // Manter controle de IDs compostos já processados nesta sessão
           if (processedCompositeKeys.has(compositeKey)) {
             console.log(`[handleImportTrades] DUPLICADO: Trade com chave composta já existente: ${compositeKey}`);
             totalDuplicatesFound++;
             continue;
           }
           
           // Adicionar à lista de chaves compostas processadas
           processedCompositeKeys.add(compositeKey);
           console.log(`[handleImportTrades] NOVO: Chave composta adicionada: ${compositeKey}`);
           
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
        
        // MELHORADO: Atualizar informações de progresso com mais detalhes
        const percentageComplete = Math.min(95, Math.round((currentOffset / maxOffsetLimit) * 100));
        const currentPage = Math.ceil(currentOffset / batchSize);
        const validTradesPercent = allTrades.length > 0 ? Math.round((allTrades.length / (allTrades.length + totalDuplicatesFound)) * 100) : 0;
        
        setImportProgress(prev => ({
          ...prev,
          trades: {
            ...prev.trades,
            current: currentOffset,
            total: maxOffsetLimit,
            percentage: percentageComplete,
            message: `Página ${currentPage} | ${allTrades.length} trades encontrados | ${totalDuplicatesFound} duplicados | ${validTradesPercent}% aproveitamento`
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
        
                  // Log super detalhado de cada trade
         const tradeId = trade.id || trade.uid;
         const fullId = tradeId.startsWith('trade_') ? tradeId : `trade_${tradeId}`;
         
                   // VALIDAÇÃO CRUZADA: Verificar se está duplicado usando três elementos (ID + data + PL)
          const plNum = Number(trade.pl || 0);
          const closed_ts = trade.closed_ts ? Number(trade.closed_ts) : 0;
          
          // Criar chave composta com ID, timestamp de fechamento e valor PL
          const compositeKey = `${fullId}|${closed_ts}|${plNum}`;
          
          // Um trade é duplicado APENAS se a chave composta de validação cruzada já existe
          // Isso permite que trades com qualquer diferença em ID, data ou PL sejam importados como novos
          const isDuplicate = processedCompositeKeys.has(compositeKey);
          
          console.log(`[handleImportTrades] Verificação com validação cruzada: ${isDuplicate ? "DUPLICADO" : "NOVO"} - Chave: ${compositeKey}`);
         
         // Validações específicas
         const mainCriteria = isClosed && hasNonZeroPL;
         const altCriteria1 = isClosed;
         const altCriteria2 = hasNonZeroPL;
         const altCriteria3 = !!(trade.side && trade.quantity);
         
         // Resultado final da validação
         const isValid = mainCriteria || altCriteria1 || altCriteria2 || altCriteria3;
         
                   // Log mais detalhado e organizado
          console.log(`[handleImportTrades] Avaliando trade ${fullId} (PL=${plNum}):`, {
            // Dados do trade
            id: trade.id || trade.uid,
            pl: trade.pl,
            pl_type: typeof trade.pl,
            pl_numeric: plNum,
            closed: trade.closed,
            status: trade.status,
            
            // Critérios e resultado
            compositeKey,
            isDuplicate,
            inExistingIds: existingTradeIds.has(fullId),
            inCompositeKeys: processedCompositeKeys.has(compositeKey),
            mainCriteria,        // closed=true E pl≠0 
            altCriteria1,        // closed=true
            altCriteria2,        // pl≠0
            altCriteria3,        // side+quantity
            isValid,             // Resultado final
            
            // Para referência
            existingId: existingTradeIds.has(fullId) ? 'ID EXISTE' : 'id novo',
            compositeStatus: processedCompositeKeys.has(compositeKey) ? 'COMPOSITE EXISTE' : 'composite novo',
            validationResult: isValid ? 'VÁLIDO' : 'INVÁLIDO',
            duplicateResult: isDuplicate ? 'DUPLICADO' : 'NOVO'
          });
         
         // Qualquer trade com ID e alguma dessas condições é aceito
         // Não processamos duplicatas (já verificado em outro lugar)
         if (isDuplicate) return false;
         
         // Lógica de validação
         return isValid;
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
      
      // IMPLEMENTAÇÃO DE FALLBACK - Preparar para caso a atualização direta falhe
      // Vamos converter todos os trades válidos e tentar uma atualização em massa se necessário
      const convertedProfits: any[] = [];
      const fallbackEnabled = true; // Ativar sistema de fallback

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
            
            // MODIFICADO: Envolver em try/catch específico para conversão
            let profitRecord;
            try {
              // Passar informações de origem para a função de conversão
              profitRecord = convertTradeToProfit(trade, {
                configId: config.id,
                configName: config.name
              });
              console.log('[handleImportTrades] Registro convertido com sucesso:', {
                id: profitRecord.id,
                originalId: profitRecord.originalId,
                date: profitRecord.date,
                amount: profitRecord.amount,
                isProfit: profitRecord.isProfit
              });
            
              // IMPORTANTE: Adicionar ao array de fallback
              if (fallbackEnabled) {
                convertedProfits.push(profitRecord);
              }
            } catch (conversionError) {
              console.error('[handleImportTrades] ERRO NA CONVERSÃO:', conversionError);
              errors++;
              // Continuar para o próximo trade
              continue;
            }
            
            // MODIFICADO: Envolver em try/catch específico para adição
            let result;
            try {
              // Verificar se o objeto de relatório ainda existe
              if (!currentActiveReportObjectFromHook || !currentActiveReportObjectFromHook.id) {
                console.error('[handleImportTrades] ERRO: Relatório não encontrado ou ID inválido');
                errors++;
                continue;
              }
              
              // Adicionar com logs detalhados
              console.log('[handleImportTrades] Tentando adicionar:', {
                profitId: profitRecord.id,
                reportId: currentActiveReportObjectFromHook.id
              });
              
              result = addProfitRecord(profitRecord, currentActiveReportObjectFromHook.id, { suppressToast: true });
              
              console.log('[handleImportTrades] Resultado da adição:', result);
            } catch (addError) {
              console.error('[handleImportTrades] ERRO AO ADICIONAR:', addError);
              errors++;
              continue;
            }
            
            // Processar resultado
            if (result && result.status === 'added') {
              imported++;
              console.log('[handleImportTrades] ✅ Trade adicionado:', result.id);
            } else if (result && result.status === 'duplicate') {
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

      // SISTEMA DE FALLBACK: Se não houver importações bem-sucedidas, tentar abordagem alternativa
      if (fallbackEnabled && imported === 0 && convertedProfits.length > 0) {
        console.log('[handleImportTrades] 🔴 ZERO importações - ATIVANDO SISTEMA DE FALLBACK com', convertedProfits.length, 'trades convertidos');
        
        setImportProgress(prev => ({
          ...prev,
          trades: {
            current: 0,
            total: convertedProfits.length,
            percentage: 0,
            status: 'loading',
            message: `FALLBACK: Tentando importação em massa...`
          }
        }));
        
        // Usando updateAllProfitsSynced para tentar importar em massa
        try {
          // Primeiro obter os profits existentes
          if (currentActiveReportObjectFromHook && currentActiveReportObjectFromHook.id) {
            const existingProfits = currentActiveReportObjectFromHook.profits || [];
            console.log('[handleImportTrades] FALLBACK: Profits existentes:', existingProfits.length);
            
            // Adicionar novos profits aos existentes (evitando duplicatas)
            const existingIds = new Set(existingProfits.map(p => p.id));
            const existingOriginalIds = new Set(existingProfits.map(p => p.originalId).filter(Boolean));
            
            // Filtrar somente profits que não existem
            const uniqueNewProfits = convertedProfits.filter(p => {
              const idNotExists = !existingIds.has(p.id);
              const originalIdNotExists = !p.originalId || !existingOriginalIds.has(p.originalId);
              return idNotExists && originalIdNotExists;
            });
            
            console.log('[handleImportTrades] FALLBACK: Novos profits únicos:', uniqueNewProfits.length);
            
            if (uniqueNewProfits.length > 0) {
              // Atualizar o relatório com todos os profits (existentes + novos)
              const allProfits = [...existingProfits, ...uniqueNewProfits];
              
              // Atualizar em massa
              const updateResult = updateReportData(
                currentActiveReportObjectFromHook.id,
                undefined, // não alterar investimentos
                allProfits
              );
              
              console.log('[handleImportTrades] FALLBACK: Resultado da atualização em massa:', {
                success: updateResult,
                totalProfits: allProfits.length,
                newProfitsAdded: uniqueNewProfits.length
              });
              
              if (updateResult) {
                imported = uniqueNewProfits.length;
                console.log('[handleImportTrades] ✅ FALLBACK bem-sucedido! Adicionados', imported, 'trades');
              }
            }
          }
        } catch (fallbackError) {
          console.error('[handleImportTrades] ❌ Erro no FALLBACK:', fallbackError);
          // Não alterar o contador de erros, pois já foi contabilizado anteriormente
        }
      }
      
      // Progresso completo com informações mais detalhadas da busca ampliada
      setImportProgress(prev => ({
        ...prev,
        trades: {
          current: totalTrades,
          total: totalTrades,
          percentage: 100,
          status: 'complete',
          message: `Concluído: ${imported} importados, ${duplicated} duplicados, ${errors} erros | Busca ampliada: ${Math.ceil(currentOffset / batchSize)} páginas`
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
              <div className="font-medium">Busca ampliada: {allTrades.length} trades analisados em {Math.ceil(currentOffset / batchSize)} páginas</div>
              <div>Processamento em lotes: {Math.ceil(totalTrades / processingBatchSize)} lotes</div>
              <div className="flex flex-wrap gap-x-3 mt-1">
                <span className="text-purple-400">Taxa de aproveitamento: {allTrades.length > 0 ? Math.round((allTrades.length / (allTrades.length + totalDuplicatesFound)) * 100) : 0}%</span>
                <span className="text-blue-400">Profundidade: {Math.ceil(currentOffset / batchSize)} páginas</span>
              </div>
              <div className="mt-1 p-1 bg-black/30 rounded">
              {consecutiveEmptyPages >= maxConsecutiveEmptyPages && (
                <div className="text-blue-400">🎯 Parou: {consecutiveEmptyPages} páginas vazias consecutivas</div>
              )}
              {consecutiveUnproductivePages >= maxConsecutiveUnproductivePages && (
                <div className="text-yellow-400">⚠️ Parou: {consecutiveUnproductivePages} páginas improdutivas consecutivas</div>
              )}
              {allTrades.length >= maxTotalTrades && (
                  <div className="text-orange-400">🛑 Parou: limite ampliado de {maxTotalTrades} trades atingido</div>
              )}
              {currentOffset >= maxOffsetLimit && (
                  <div className="text-red-400">🚫 Parou: limite ampliado de offset {maxOffsetLimit} atingido</div>
                )}
                {consecutiveEmptyPages < maxConsecutiveEmptyPages && 
                 consecutiveUnproductivePages < maxConsecutiveUnproductivePages && 
                 allTrades.length < maxTotalTrades && 
                 currentOffset < maxOffsetLimit && (
                  <div className="text-green-400">✅ Busca completa! Todos os trades disponíveis foram analisados.</div>
                )}
              </div>
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
    console.log('[isDepositConfirmed] 🔍 ANÁLISE DETALHADA DO DEPÓSITO:', {
      id: deposit.id,
      uuid: deposit.uuid,
      type: deposit.type,
      deposit_type: deposit.deposit_type,
      amount: deposit.amount,
      status: deposit.status,
      // Todos os possíveis atributos de confirmação
      isConfirmed: deposit.isConfirmed,
      is_confirmed: deposit.is_confirmed,
      success: deposit.success,
      // Campos de data que podem indicar processamento
      created_at: deposit.created_at,
      updated_at: deposit.updated_at,
      confirmed_at: deposit.confirmed_at,
      timestamp: deposit.timestamp,
      ts: deposit.ts,
      // Outros indicadores importantes
      tx_id: deposit.tx_id,
      txid: deposit.txid,
      network: deposit.network,
      // Verificar se tem todos os campos básicos
      hasAllBasicFields: !!(deposit.id && deposit.amount && deposit.created_at)
    });

    // 🔥 NOVA ABORDAGEM: SER MAIS INCLUSIVO
    // Vamos só rejeitar depósitos que EXPLICITAMENTE sejam inválidos
    
    // ❌ Verificações de rejeição explícita (devem ser muito específicas)
    
    // Se explicitamente marcado como não confirmado com false
    if (deposit.isConfirmed === false && deposit.is_confirmed === false && deposit.success === false) {
      console.log('[isDepositConfirmed] ❌ REJEITADO: Todos os indicadores são false');
      return false;
    }
    
    // Se é status claramente de falha
    const failureStatuses = ['failed', 'error', 'cancelled', 'rejected', 'invalid'];
    if (deposit.status && failureStatuses.includes(deposit.status.toLowerCase())) {
      console.log('[isDepositConfirmed] ❌ REJEITADO: Status de falha:', deposit.status);
      return false;
    }
    
    // Se não tem dados básicos obrigatórios
    if (!deposit.id || !deposit.amount || isNaN(parseFloat(deposit.amount))) {
      console.log('[isDepositConfirmed] ❌ REJEITADO: Falta dados básicos (id, amount válido)');
      return false;
    }
    
    // ✅ Verificações de aceitação positiva (qualquer uma serve)
    
    // Se explicitamente confirmado
    if (deposit.is_confirmed === true) {
      console.log('[isDepositConfirmed] ✅ ACEITO: is_confirmed === true (on-chain confirmado)');
      return true;
    }
    
    // Se operação foi bem-sucedida
    if (deposit.success === true) {
      console.log('[isDepositConfirmed] ✅ ACEITO: success === true (operação bem-sucedida)');
      return true;
    }
    
    // Se tem isConfirmed true (versão legacy)
    if (deposit.isConfirmed === true) {
      console.log('[isDepositConfirmed] ✅ ACEITO: isConfirmed === true (legacy)');
      return true;
    }
    
    // Se é status claramente de sucesso
    const successStatuses = ['confirmed', 'completed', 'success', 'settled', 'processed'];
    if (deposit.status && successStatuses.includes(deposit.status.toLowerCase())) {
      console.log('[isDepositConfirmed] ✅ ACEITO: Status de sucesso:', deposit.status);
      return true;
    }
    
    // Se tem tx_id/txid (indica transação processada)
    if (deposit.tx_id || deposit.txid) {
      console.log('[isDepositConfirmed] ✅ ACEITO: Tem ID de transação (tx_id/txid)');
      return true;
    }
    
    // Se tem data de confirmação
    if (deposit.confirmed_at) {
      console.log('[isDepositConfirmed] ✅ ACEITO: Tem data de confirmação (confirmed_at)');
      return true;
    }
    
    // 🎯 FALLBACK INCLUSIVO: Se chegou até aqui e tem dados básicos, aceitar
    // Só rejeitamos se há indicadores explícitos de falha
    const hasExplicitFailure = (
      deposit.isConfirmed === false || 
      deposit.is_confirmed === false || 
      deposit.success === false ||
      (deposit.status && failureStatuses.includes(deposit.status.toLowerCase()))
    );
    
    if (!hasExplicitFailure) {
      console.log('[isDepositConfirmed] ✅ ACEITO: Fallback inclusivo - sem indicadores de falha explícitos');
      return true;
    }
    
    // Se chegou até aqui, tem algum indicador de falha
    console.log('[isDepositConfirmed] ❌ REJEITADO: Tem indicadores de falha:', {
      isConfirmedFalse: deposit.isConfirmed === false,
      is_confirmedFalse: deposit.is_confirmed === false,
      successFalse: deposit.success === false,
      statusIsFailure: deposit.status && failureStatuses.includes(deposit.status.toLowerCase())
    });
    
    return false;
  };

  const handleImportDeposits = async () => {
    console.log('[handleImportDeposits] Iniciando importação de depósitos');
    
    const config = getCurrentImportConfig();
    
    console.log('[handleImportDeposits] Configuração obtida:', {
      hasConfig: !!config,
      configId: config?.id,
      configName: config?.name,
      hasCredentials: !!config?.credentials,
      isConfigured: config?.credentials?.isConfigured,
      hasUser: !!user?.email
    });
    
    if (!config || !currentActiveReportObjectFromHook || !user?.email) {
      console.log('[handleImportDeposits] Configuração, relatório ou usuário ausente');
      toast({
        title: "⚠️ Configuração incompleta",
        description: "Configure as credenciais da API antes de importar.",
        variant: "destructive",
      });
      return;
    }

    setIsImportingDeposits(true);
    
    // Mostrar progresso inicial da busca intensificada
    setImportProgress(prev => ({
      ...prev,
      deposits: { 
        current: 0, 
        total: 0, 
        percentage: 0, 
        status: 'loading', 
        message: '🔍 Iniciando busca intensificada de depósitos históricos...' 
      }
    }));

    let imported = 0;
    let duplicated = 0;
    let errors = 0;
    let skipped = 0;
    let processed = 0;

    try {
      // Fazer requisição para a API LN Markets usando a estrutura correta
      console.log('[handleImportDeposits] Fazendo requisição com credenciais:', {
        hasKey: !!config.credentials.key,
        hasSecret: !!config.credentials.secret,
        hasPassphrase: !!config.credentials.passphrase,
        network: config.credentials.network,
        isConfigured: config.credentials.isConfigured,
        userEmail: user.email.split('@')[0] + '@***'
      });

      // Atualizar status para busca
      setImportProgress(prev => ({
        ...prev,
        deposits: { 
          current: 0, 
          total: 0, 
          percentage: 0, 
          status: 'loading', 
          message: '📡 Conectando com LN Markets - Busca intensificada ativa...' 
        }
      }));

      // Usar a função correta com userEmail e configId
      const response = await fetchLNMarketsDeposits(user.email, config.id);

      console.log('[handleImportDeposits] Resposta recebida:', {
        success: response.success,
        hasData: !!response.data,
        dataLength: response.data?.length || 0,
        error: response.error
      });

      if (!response.success || !response.data) {
        console.error('[handleImportDeposits] Falha na resposta da API:', response);
        throw new Error(response.error || 'Erro ao buscar depósitos da API');
      }

      const deposits = response.data;
      const totalDeposits = deposits.length;

      console.log('[handleImportDeposits] 🎯 BUSCA INTENSIFICADA CONCLUÍDA - Depósitos encontrados:', {
        total: totalDeposits,
        primeiroDepósito: deposits[0] ? {
          id: deposits[0].id,
          amount: deposits[0].amount,
          status: deposits[0].status,
          created_at: deposits[0].created_at
        } : null,
        últimoDepósito: deposits[totalDeposits - 1] ? {
          id: deposits[totalDeposits - 1].id,
          amount: deposits[totalDeposits - 1].amount,
          status: deposits[totalDeposits - 1].status,
          created_at: deposits[totalDeposits - 1].created_at
        } : null
      });

      // ADICIONADO: Log detalhado dos primeiros depósitos RAW
      console.log('[handleImportDeposits] 🔍 ANÁLISE DOS PRIMEIROS DEPÓSITOS RAW DA API:');
      deposits.slice(0, 5).forEach((deposit: any, index: number) => {
        console.log(`[handleImportDeposits] Depósito ${index + 1}:`, {
          id: deposit.id,
          uuid: deposit.uuid,
          amount: deposit.amount,
          status: deposit.status,
          // Campos de data disponíveis
          timestamp: deposit.timestamp,
          ts: deposit.ts,
          created_at: deposit.created_at,
          updated_at: deposit.updated_at,
          confirmed_at: deposit.confirmed_at,
          // Outros campos importantes
          type: deposit.type,
          deposit_type: deposit.deposit_type,
          is_confirmed: deposit.is_confirmed,
          isConfirmed: deposit.isConfirmed,
          success: deposit.success
        });
      });

      // Atualizar progresso inicial para processamento
      setImportProgress(prev => ({
        ...prev,
        deposits: { 
          current: 0, 
          total: totalDeposits, 
          percentage: 0, 
          status: 'loading', 
          message: `✅ ${totalDeposits} depósitos encontrados! Processando dados...` 
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
            // MODIFICADO: Envolver em try/catch específico para conversão
            let investmentRecord;
            try {
              // Passar informações de origem para a função de conversão
              investmentRecord = convertDepositToInvestment(deposit, {
                configId: config.id,
                configName: config.name
              });
              console.log('[handleImportDeposits] Registro convertido com sucesso:', {
                id: investmentRecord.id,
                originalId: investmentRecord.originalId,
                date: investmentRecord.date,
                amount: investmentRecord.amount
              });
            
              console.log('[handleImportDeposits] Tentando adicionar novo investimento...');
            
              const result = addInvestment(investmentRecord, currentActiveReportObjectFromHook.id, { suppressToast: true });
            
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
        console.error('[handleImportWithdrawals] Falha na resposta da API:', response);
        // Atualizar status do progresso para erro
        setImportProgress(prev => ({
          ...prev,
          withdrawals: { 
            current: 0, 
            total: 0, 
            percentage: 0, 
            status: 'error', 
            message: 'Erro ao acessar a API' 
          }
        }));
        // Mostrar mensagem de erro para o usuário
        toast({
          title: "Erro na API",
          description: "Não foi possível buscar os dados de saques na API. Por favor, revise os dados inseridos e verifique se sua API possui as permissões necessárias.",
          variant: "destructive",
        });
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
          // MODIFICADO: Envolver em try/catch específico para conversão
          let withdrawalRecord;
          try {
            // Passar informações de origem para a função de conversão
            withdrawalRecord = convertWithdrawalToRecord(withdrawal, {
              configId: config.id,
              configName: config.name
            });
            console.log('[handleImportWithdrawals] Registro convertido com sucesso:', {
              id: withdrawalRecord.id,
              originalId: withdrawalRecord.originalId,
              date: withdrawalRecord.date,
              amount: withdrawalRecord.amount
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

    // Usar nova função de associação múltipla, se disponível
    if (typeof associateAPIToReport === 'function') {
      const success = associateAPIToReport(currentActiveReportObjectFromHook.id, configId, config.name);
      
      if (success) {
        setSelectedConfigForImport(configId);
        toast({
          title: "Configuração Associada",
          description: `Relatório agora associado à configuração "${config.name}".`,
          variant: "default",
        });
      }
    } else {
      // Fallback para método legado
      updateReport(currentActiveReportObjectFromHook.id, {
        associatedLNMarketsConfigId: configId,
        associatedLNMarketsConfigName: config.name
      });

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



  // NOVA VALIDAÇÃO: Apenas trades fechados (closed=true)
  const validateTradeForImport = (trade: any): { isValid: boolean; reason?: string } => {
    // Log detalhado do trade para diagnóstico
    console.log('[validateTradeForImport] Validando trade:', {
      id: trade.id || trade.uid,
      closed: trade.closed,
      closed_ts: trade.closed_ts,
      pl: trade.pl,
      status: trade.status,
      side: trade.side,
      quantity: trade.quantity,
      entry_price: trade.entry_price
    });
    
    // CRITÉRIO ABSOLUTO: Deve ser um objeto e ter ID
    if (!trade || typeof trade !== 'object') {
      return { isValid: false, reason: 'Objeto trade inválido' };
    }
    
    if (!trade.id && !trade.uid) {
      return { isValid: false, reason: 'Trade sem ID válido' };
    }
    
    // CRITÉRIO ÚNICO: Trade deve estar fechado (closed=true)
    const isClosed = trade.closed === true || trade.closed === 'true' || 
                     trade.closed === 1 || trade.status === 'closed' ||
                     trade.status === 'done' || trade.state === 'closed';
    
    if (!isClosed) {
      return { isValid: false, reason: 'Trade não está fechado' };
    }
    
    console.log('[validateTradeForImport] ✅ Trade válido fechado com ID:', trade.id || trade.uid);
    return { isValid: true };
    
    /* CRITÉRIOS ANTERIORES REMOVIDOS - MÁXIMA PERMISSIVIDADE
    // Para compatibilidade, vamos aceitar diversos formatos de "closed"
    const isClosed = trade.closed === true || trade.closed === 'true' || 
                     trade.closed === 1 || trade.status === 'closed' || 
                     trade.status === 'done' || trade.state === 'closed';
    
    // Se não tiver PL, ainda podemos processar se tiver closed
    if (trade.pl === undefined || trade.pl === null) {
      if (isClosed) return { isValid: true };
      if (trade.side && trade.quantity) return { isValid: true };
      return { isValid: false, reason: 'Trade sem PL e não fechado' };
    }
    
    // Qualquer trade com PL não zero é válido
    const plValue = Number(trade.pl);
    if (!isNaN(plValue) && plValue !== 0) return { isValid: true };
    
    // Regra especial para trades com PL zero
    if (plValue === 0 && isClosed) return { isValid: true };
    
    // Último critério: side e quantity
    if (trade.side && trade.quantity) return { isValid: true };
    
    // Se chegou aqui, não atende a nenhum critério
    return { isValid: false, reason: 'Trade não atende aos critérios mínimos' };
    */
  };

  // Funções stub vazias para as funções removidas que são referenciadas na interface
  // Estas funções serão removidas junto com suas referências na interface em breve
  
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
    setLocalForceUpdate(prev => prev + 1);
    forceUpdateCountRef.current += 1;
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

  const handleAddProfitSynced = useCallback((
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

  // FUNÇÃO UTILITÁRIA PARA CALCULAR MÉTRICAS DE ROI
  const calculateROIMetrics = useMemo(() => {
    return (data: { investments: any[], profits: any[] }) => {
      const totalInvested = data.investments.reduce((sum: number, inv: any) => sum + convertToBtc(inv.amount, inv.unit), 0);
      const totalProfits = data.profits.reduce((sum: number, profit: any) => {
        const btcAmount = convertToBtc(profit.amount, profit.unit);
        return sum + (profit.isProfit ? btcAmount : -btcAmount);
      }, 0);
      
      const roi = totalInvested > 0 ? (totalProfits / totalInvested) * 100 : 0;
      
      // Calcular ROI anualizado baseado no período
      let periodDays = 365; // padrão para "all"
      if (historyFilterPeriod === "1m") periodDays = 30;
      else if (historyFilterPeriod === "3m") periodDays = 90;
      else if (historyFilterPeriod === "6m") periodDays = 180;
      else if (historyFilterPeriod === "1y") periodDays = 365;
      else if (historyFilterPeriod === "custom" && historyCustomStartDate && historyCustomEndDate) {
        periodDays = Math.max(1, Math.round((historyCustomEndDate.getTime() - historyCustomStartDate.getTime()) / (1000 * 60 * 60 * 24)));
      }
      
      const annualizedROI = periodDays > 0 && periodDays !== 365 ? (roi * 365) / periodDays : roi;
      
      // Calcular taxa de sucesso
      const totalTrades = data.profits.length;
      const successfulTrades = data.profits.filter((p: any) => p.isProfit).length;
      const successRate = totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0;
      
      // Calcular eficiência de investimento
      const totalInvestedValue = totalInvested;
      
      // Calcular valor dos investimentos que geraram lucro usando associação temporal
      let profitableInvestmentValue = 0;
      const profitableInvestmentIds = new Set<string>();
      
      data.profits.forEach(profit => {
        if (profit.isProfit) {
          const profitDate = new Date(profit.date);
          
          // Procurar investimentos em uma janela temporal (30 dias antes do lucro)
          data.investments.forEach(inv => {
            const invDate = new Date(inv.date);
            const daysDiff = (profitDate.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24);
            
            if (daysDiff >= 0 && daysDiff <= 30) {
              const invKey = `${inv.date}-${inv.amount}-${inv.unit}`;
              if (!profitableInvestmentIds.has(invKey)) {
                profitableInvestmentIds.add(invKey);
                profitableInvestmentValue += convertToBtc(inv.amount, inv.unit);
              }
            }
          });
        }
      });
      
      // Fallback proporcional se não conseguir associar
      if (profitableInvestmentValue === 0 && totalProfits > 0 && totalInvested > 0) {
        const profitValue = data.profits.reduce((sum: number, profit: any) => {
          const btcAmount = convertToBtc(profit.amount, profit.unit);
          return sum + (profit.isProfit ? btcAmount : 0);
        }, 0);
        
        const lossValue = data.profits.reduce((sum: number, profit: any) => {
          const btcAmount = convertToBtc(profit.amount, profit.unit);
          return sum + (!profit.isProfit ? btcAmount : 0);
        }, 0);
        
        const totalProfitLoss = profitValue + lossValue;
        if (totalProfitLoss > 0) {
          profitableInvestmentValue = totalInvested * (profitValue / totalProfitLoss);
        }
      }
      
      // Eficiência ponderada e tradicional
      const weightedEfficiency = totalInvestedValue > 0 ? (profitableInvestmentValue / totalInvestedValue) * 100 : 0;
      const totalInvestments = data.investments.length;
      const profitableInvestments = data.profits.filter((p: any) => p.isProfit).length;
      const countEfficiency = totalInvestments > 0 ? (profitableInvestments / totalInvestments) * 100 : 0;
      
      return {
        roi,
        annualizedROI,
        successRate,
        investmentEfficiency: weightedEfficiency,
        countEfficiency,
        periodDays,
        totalInvested,
        totalProfits,
        profitableInvestmentValue,
        totalInvestedValue
      };
    };
  }, [historyFilterPeriod, historyCustomStartDate, historyCustomEndDate]);

  // Função otimizada para obter dados filtrados por período com cache
  const getFilteredHistoryData = useMemo(() => {
    // Usar dados efetivos (props ou hook) para garantir sincronização
    const effectiveReport = activeReportData?.report || currentActiveReportObjectFromHook;
    const effectiveAllReports = allReportsFromHook || [];
    
    const cacheKey = `${historyViewMode}-${historyFilterPeriod}-${historyCustomStartDate?.getTime()}-${historyCustomEndDate?.getTime()}-${effectiveReport?.id || 'none'}-${effectiveAllReports?.length || 0}-${activeReportData?.forceUpdateTrigger || 0}-${localForceUpdate}-${effectiveReport?.updatedAt || 0}`;
    
    if (filteredDataCache.current.has(cacheKey)) {
      return filteredDataCache.current.get(cacheKey);
    }

    if (!effectiveReport && historyViewMode === "active") {
      const emptyResult = { investments: [], profits: [], withdrawals: [] };
      filteredDataCache.current.set(cacheKey, emptyResult);
      return emptyResult;
    }

    // Usar dados efetivos para garantir que sempre temos os dados mais atualizados
    const reportsToAnalyze = historyViewMode === "all" 
      ? effectiveAllReports
      : effectiveReport ? [effectiveReport] : [];

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
      // Garantir que sempre usamos os dados mais atualizados
      const reportInvestments = report.investments || [];
      const reportProfits = report.profits || [];
      const reportWithdrawals = report.withdrawals || [];
      
      // Filtrar investimentos
      const filteredInvestments = reportInvestments.filter(inv => {
        const invDate = new Date(inv.date);
        return invDate >= startDate && invDate <= endDate;
      });
      allInvestments.push(...filteredInvestments);

      // Filtrar lucros
      const filteredProfits = reportProfits.filter(profit => {
        const profitDate = new Date(profit.date);
        return profitDate >= startDate && profitDate <= endDate;
      });
      allProfits.push(...filteredProfits);

      // Filtrar saques
      const filteredWithdrawals = reportWithdrawals.filter(withdrawal => {
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
    // Usar dados efetivos para garantir sincronização
    activeReportData?.report,
    currentActiveReportObjectFromHook, 
    allReportsFromHook, 
    historyViewMode, 
    historyFilterPeriod, 
    historyCustomStartDate, 
    historyCustomEndDate,
    activeReportData?.forceUpdateTrigger,
    localForceUpdate,
    // Adicionar updatedAt para detectar mudanças nos dados
    activeReportData?.report?.updatedAt,
    currentActiveReportObjectFromHook?.updatedAt
  ]);

  // Função otimizada para processar dados para os gráficos com cache
  const getChartData = useMemo((): ChartDataPoint[] => {
    // Usar dados efetivos (props ou hook) para garantir sincronização
    const effectiveReport = activeReportData?.report || currentActiveReportObjectFromHook;
    const effectiveAllReports = allReportsFromHook || [];
    
    const cacheKey = `chart-${chartTimeframe}-${chartViewMode}-${effectiveReport?.id || 'none'}-${effectiveAllReports?.length || 0}-${localForceUpdate}-${effectiveReport?.updatedAt || 0}`;
    
    if (chartDataCache.current.has(cacheKey)) {
      return chartDataCache.current.get(cacheKey) || [];
    }
    
    if (!effectiveReport && chartViewMode === "active") {
      chartDataCache.current.set(cacheKey, []);
      return [];
    }
    
    // Determinar quais relatórios processar com base no modo de visualização
    const reportsToProcess = chartViewMode === "active" 
      ? (effectiveReport ? [effectiveReport] : [])
      : effectiveAllReports;
    
    if (reportsToProcess.length === 0) {
      chartDataCache.current.set(cacheKey, []);
      return [];
    }
    
    // Coletar todos os dados relevantes de todos os relatórios selecionados
    const allInvestments: Investment[] = [];
    const allProfits: ProfitRecord[] = [];
    const allWithdrawals: any[] = [];
    
    reportsToProcess.forEach(report => {
      // Garantir que sempre usamos os dados mais atualizados
      const reportInvestments = report.investments || [];
      const reportProfits = report.profits || [];
      const reportWithdrawals = report.withdrawals || [];
      
      allInvestments.push(...reportInvestments);
      allProfits.push(...reportProfits);
      allWithdrawals.push(...reportWithdrawals);
    });
    
    // Ordenar todos os dados por data
    allInvestments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    allProfits.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    allWithdrawals.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // O resto da lógica existente para processamento de dados de gráficos
    const result: ChartDataPoint[] = [];
    
    if (allInvestments.length === 0 && allProfits.length === 0) {
      chartDataCache.current.set(cacheKey, []);
      return [];
    }
    
    // Continue com o processamento de dados como antes...
    // (manter o código existente para processamento de datas, cálculos, etc.)
    
    // Exemplo para diário
    if (chartTimeframe === "daily") {
      // Encontrar a primeira e última data
      const allDates = [
        ...allInvestments.map(inv => new Date(inv.date).getTime()),
        ...allProfits.map(profit => new Date(profit.date).getTime()),
        ...allWithdrawals.map(w => new Date(w.date).getTime())
      ];
      
      if (allDates.length === 0) {
        chartDataCache.current.set(cacheKey, []);
        return [];
      }
      
      // Data mais antiga e mais recente
      const minDate = new Date(Math.min(...allDates));
      const maxDate = new Date(Math.max(...allDates));
      
      // Limitar período para evitar gráficos muito grandes
      let startDate = minDate;
      const endDate = maxDate;
      
      // Se o período for muito grande, limitar para os últimos 60 dias
      const daysDiff = differenceInDays(endDate, startDate);
      if (daysDiff > 60) {
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 60);
      }
      
      // Para cada dia no período
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateString = formatDateFn(currentDate, "yyyy-MM-dd");
        const month = formatDateFn(currentDate, "MMM yyyy", { locale: ptBR });
        
        // Investimentos até este dia
        const investmentsUntilDate = allInvestments.filter(
          inv => new Date(inv.date) <= currentDate
        );
        const investmentsTotal = investmentsUntilDate.reduce(
          (sum, inv) => sum + convertToBtc(inv.amount, inv.unit), 0
        );
        
        // Lucros/perdas até este dia
        const profitsUntilDate = allProfits.filter(
          profit => new Date(profit.date) <= currentDate
        );
        const profitsTotal = profitsUntilDate.reduce((sum, profit) => {
          const btcAmount = convertToBtc(profit.amount, profit.unit);
          return sum + (profit.isProfit ? btcAmount : -btcAmount);
        }, 0);
        
        // Saques até este dia
        const withdrawalsUntilDate = allWithdrawals.filter(
          w => new Date(w.date) <= currentDate
        );
        const withdrawalsTotal = withdrawalsUntilDate.reduce(
          (sum, w) => sum + convertToBtc(w.amount, w.unit), 0
        );
        
        // Calcular saldo
        const balance = investmentsTotal + profitsTotal - withdrawalsTotal;
        
        // Adicionar ponto de dados
        result.push({
          date: dateString,
          month,
          investments: investmentsTotal,
          profits: profitsTotal,
          balance
        });
        
        // Avançar para o próximo dia
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      // Processamento mensal existente...
      // Encontrar a primeira e última data
      const allDates = [
        ...allInvestments.map(inv => new Date(inv.date).getTime()),
        ...allProfits.map(profit => new Date(profit.date).getTime()),
        ...allWithdrawals.map(w => new Date(w.date).getTime())
      ];
      
      if (allDates.length === 0) {
        chartDataCache.current.set(cacheKey, []);
        return [];
      }
      
      // Data mais antiga e mais recente
      const minDate = new Date(Math.min(...allDates));
      const maxDate = new Date(Math.max(...allDates));
      
      // Para cada mês no período
      let currentMonth = startOfMonth(minDate);
      const lastMonth = endOfMonth(maxDate);
      
      while (currentMonth <= lastMonth) {
        const monthEnd = endOfMonth(currentMonth);
        const monthString = formatDateFn(currentMonth, "MMM yyyy", { locale: ptBR });
        const dateString = formatDateFn(currentMonth, "yyyy-MM-dd");
        
        // Investimentos até este mês
        const investmentsUntilMonth = allInvestments.filter(
          inv => new Date(inv.date) <= monthEnd
        );
        const investmentsTotal = investmentsUntilMonth.reduce(
          (sum, inv) => sum + convertToBtc(inv.amount, inv.unit), 0
        );
        
        // Lucros/perdas até este mês
        const profitsUntilMonth = allProfits.filter(
          profit => new Date(profit.date) <= monthEnd
        );
        const profitsTotal = profitsUntilMonth.reduce((sum, profit) => {
          const btcAmount = convertToBtc(profit.amount, profit.unit);
          return sum + (profit.isProfit ? btcAmount : -btcAmount);
        }, 0);
        
        // Saques até este mês
        const withdrawalsUntilMonth = allWithdrawals.filter(
          w => new Date(w.date) <= monthEnd
        );
        const withdrawalsTotal = withdrawalsUntilMonth.reduce(
          (sum, w) => sum + convertToBtc(w.amount, w.unit), 0
        );
        
        // Calcular saldo
        const balance = investmentsTotal + profitsTotal - withdrawalsTotal;
        
        // Adicionar ponto de dados
        result.push({
          date: dateString,
          month: monthString,
          investments: investmentsTotal,
          profits: profitsTotal,
          balance
        });
        
        // Avançar para o próximo mês
        currentMonth = new Date(currentMonth);
        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }
    }
    
    // Armazenar em cache
    chartDataCache.current.set(cacheKey, result);
    return result;
  }, [
    chartTimeframe, 
    chartViewMode, // NOVO: Considerar o modo de visualização na dependência
    // Usar dados efetivos para garantir sincronização
    activeReportData?.report,
    currentActiveReportObjectFromHook, 
    allReportsFromHook,
    localForceUpdate,
    // Adicionar updatedAt para detectar mudanças nos dados
    activeReportData?.report?.updatedAt,
    currentActiveReportObjectFromHook?.updatedAt
  ]);

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

  // Funções para manipular exclusão em massa
  const handleBulkDeleteInvestments = () => {
    if (!currentActiveReportObjectFromHook?.id) {
      toast({
        title: "Erro",
        description: "Nenhum relatório ativo para excluir investimentos",
        variant: "destructive",
      });
      return;
    }
    
    const success = deleteAllInvestmentsFromReport(currentActiveReportObjectFromHook.id);
    if (success) {
      setShowConfirmDeleteInvestments(false);
      forceUpdate();
    }
  };
  
  const handleBulkDeleteProfits = () => {
    if (!currentActiveReportObjectFromHook?.id) {
      toast({
        title: "Erro",
        description: "Nenhum relatório ativo para excluir lucros/perdas",
        variant: "destructive",
      });
      return;
    }
    
    const success = deleteAllProfitsFromReport(currentActiveReportObjectFromHook.id);
    if (success) {
      setShowConfirmDeleteProfits(false);
      forceUpdate();
    }
  };
  
  const handleBulkDeleteWithdrawals = () => {
    if (!currentActiveReportObjectFromHook?.id) {
      toast({
        title: "Erro",
        description: "Nenhum relatório ativo para excluir saques",
        variant: "destructive",
      });
      return;
    }
    
    const success = deleteAllWithdrawalsFromReport(currentActiveReportObjectFromHook.id);
    if (success) {
      setShowConfirmDeleteWithdrawals(false);
      forceUpdate();
    }
  };

  // Estado para controle de exportação
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  
  // Função para exportar para PDF
  const handleExportPDF = async (options: PDFExportOptions) => {
    console.log('[ExportPDF] Iniciando exportação PDF com opções:', options);
    
    // Validar se há dados para exportar
    if (!currentActiveReportObjectFromHook) {
      toast({
        title: "❌ Erro na exportação",
        description: "Nenhum relatório ativo selecionado.",
        variant: "destructive",
      });
      return;
    }

    // Validar cotações atuais
    const currentRates = states.currentRates;
    if (!currentRates.btcToUsd || !currentRates.brlToUsd) {
      toast({
        title: "⚠️ Cotações indisponíveis",
        description: "Não é possível exportar sem cotações atuais. Aguarde ou recarregue a página.",
        variant: "destructive",
      });
      return;
    }

    if (currentRates.btcToUsd <= 0 || currentRates.brlToUsd <= 0) {
      toast({
        title: "⚠️ Cotações inválidas",
        description: "As cotações atuais são inválidas. Tente novamente em alguns instantes.",
        variant: "destructive",
      });
      return;
    }

    // Mostrar loading
    toast({
      title: "📄 Gerando relatório PDF...",
      description: "Por favor, aguarde enquanto seu relatório é processado.",
    });

    try {
      let capturedCharts: CapturedChart[] = [];

      // Se a opção de incluir gráficos estiver marcada, capturar os gráficos
      if (options.includeCharts) {
        console.log('[ExportPDF] Opção de gráficos habilitada, iniciando captura...');
        
        toast({
          title: "📊 Capturando gráficos...",
          description: "Aguarde enquanto os gráficos são preparados para o relatório.",
        });

        // Primeiro, garantir que estamos na aba de gráficos
        const chartsTabTrigger = document.querySelector('[data-value=\"charts\"]') as HTMLElement;
        if (chartsTabTrigger) {
          chartsTabTrigger.click();
          console.log('[ExportPDF] Mudando para aba de gráficos para captura');
          
          // Aguardar um pouco para a aba carregar
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Aguardar que os gráficos sejam renderizados
        const chartsReady = await waitForChartsToRender(5000);
        
        if (chartsReady) {
          console.log('[ExportPDF] Gráficos prontos, iniciando captura...');
          capturedCharts = await captureProfitCalculatorCharts();
          console.log(`[ExportPDF] ${capturedCharts.length} gráficos capturados`);
        } else {
          console.warn('[ExportPDF] Timeout aguardando gráficos, prosseguindo sem eles');
          toast({
            title: "⚠️ Gráficos não encontrados",
            description: "Continuando a exportação sem os gráficos.",
            variant: "default",
          });
        }
      }

      // Processar exportação com ou sem gráficos
      console.log('[ExportPDF] Processando dados do relatório...');

      const blob = await exportReportToPdfWithRates(
        currentActiveReportObjectFromHook,
        options.currency,
        '', // período customizado pode ser implementado futuramente
        currentRates.btcToUsd,
        currentRates.brlToUsd,
        capturedCharts // Adicionar gráficos capturados
      );

      if (blob) {
        // Criar URL do blob e download
        const url = URL.createObjectURL(blob);
        
        // Criar link de download temporário
        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio-${currentActiveReportObjectFromHook.name?.replace(/[^a-zA-Z0-9]/g, '-') || 'bitcoin'}-${new Date().toISOString().split('T')[0]}.pdf`;
        
        // Adicionar ao DOM, fazer download e remover
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpar URL do blob
        URL.revokeObjectURL(url);
        
        console.log('[ExportPDF] Download iniciado com sucesso');
        
        toast({
          title: "✅ PDF exportado com sucesso!",
          description: `Relatório "${currentActiveReportObjectFromHook.name}" baixado.${capturedCharts.length > 0 ? ` Incluindo ${capturedCharts.length} gráfico(s).` : ''}`,
          variant: "default",
        });
      } else {
        throw new Error('Blob do PDF não foi gerado corretamente');
      }

    } catch (error) {
      console.error('[ExportPDF] Erro na exportação:', error);
      
      toast({
        title: "❌ Erro na exportação",
        description: error instanceof Error ? error.message : "Erro desconhecido ao gerar PDF.",
        variant: "destructive",
      });
    }
  };
  
  // Função para exportar para Excel
  const handleExportExcel = async (options: ExcelExportOptions) => {
    if (!currentActiveReportObjectFromHook || isExporting) return;
    
    try {
      setIsExporting(true);
      
      // Preparar dados do relatório
      const reportData = {
        ...currentActiveReportObjectFromHook,
        investments: options.includeInvestments ? currentActiveReportObjectFromHook.investments : [],
        profits: options.includeProfits ? currentActiveReportObjectFromHook.profits : [],
        withdrawals: options.includeWithdrawals ? currentActiveReportObjectFromHook.withdrawals || [] : []
      };
      
      // Gerar o Excel
      const blob = await generateExcelReport(
        reportData, 
        states.currentRates.btcToUsd, 
        states.currentRates.brlToUsd, 
        options
      );
      
      // Criar um URL para o blob
      const url = URL.createObjectURL(blob);
      
      // Criar um link para download
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-${currentActiveReportObjectFromHook.name.replace(/[^a-zA-Z0-9]/g, '-')}-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "📊 Excel Exportado!",
        description: `Relatório "${currentActiveReportObjectFromHook.name}" exportado com sucesso.`,
        variant: "default",
        className: "border-green-500/50 bg-green-900/20",
      });
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      toast({
        title: "❌ Erro na exportação",
        description: "Ocorreu um erro ao exportar o relatório para Excel.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setShowExportDialog(false);
    }
  };

  // Sistema de sincronização através do contexto global
  // @ts-ignore - Ignore os erros de lint para esse hook específico
  const reportSyncData = useReportSync ? useReportSync() : { syncedData: { needsRefresh: false } };
  const { syncedData } = reportSyncData;
  
  // Referência para controlar recarregamentos
  const refreshTriggerRef = useRef(0);
  
  // Adicionar estado para força-atualizações
  const [investmentListKey, setInvestmentListKey] = useState('investments_0');
  const [profitsListKey, setProfitsListKey] = useState('profits_0');
  const [needsRefresh, setNeedsRefresh] = useState(false);

  // Reagir às mudanças de dados sincronizados
  useEffect(() => {
    if (!activeReportData) return;
    
    // Se houver necessidade de atualização, atualizar os dados da interface
    if (syncedData && syncedData.needsRefresh) {
      // Incrementar o contador de atualizações
      refreshTriggerRef.current += 1;
      
      // Atualizar chaves para forçar remontagem de componentes
      const newInvestmentKey = `investments_${refreshTriggerRef.current}`;
      const newProfitsKey = `profits_${refreshTriggerRef.current}`;
      
      setInvestmentListKey(newInvestmentKey);
      setProfitsListKey(newProfitsKey);
      
      // Limpar o flag de necessidade de atualização
      // setSyncedData(prev => prev ? { ...prev, needsRefresh: false } : null);
    }
  }, [syncedData, activeReportData]);

  // Função local para obter última configuração utilizada
  const getLastUsedConfigId = useCallback((report: Report) => {
    return getLastUsedConfigIdFromLib(report);
  }, []);

  // Effect para sincronizar config LN Markets selecionada com configuração associada ao relatório
  useEffect(() => {
    if (reportsDataLoaded && multipleConfigs && user?.email) {
      const configs = multipleConfigs;
      
      // Verificar se há uma função para obter a última API utilizada
      if (typeof getReportAssociatedAPIs === 'function' && typeof getLastUsedConfigId === 'function' && currentActiveReportObjectFromHook) {
        // Usar a nova lógica de múltiplas APIs
        const lastUsedConfigId = getLastUsedConfigId(currentActiveReportObjectFromHook);
                // Se houver uma última API utilizada e ela ainda existir nas configurações
        if (lastUsedConfigId && configs.configs.some(c => c.id === lastUsedConfigId)) {
          setSelectedConfigForImport(lastUsedConfigId);
          console.log('[ProfitCalculator] Usando última API utilizada:', {
            configId: lastUsedConfigId,
            configName: configs.configs.find(c => c.id === lastUsedConfigId)?.name
          });
          return;
        }
      }
      
      // Se não houver função de múltiplas APIs ou não houver última API, continuar com o fluxo legado
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
  }, [user?.email, reportsDataLoaded, currentActiveReportObjectFromHook, multipleConfigs, getReportAssociatedAPIs, getLastUsedConfigId]);

  // Reagir às mudanças de dados do relatório
  useEffect(() => {
    if (!activeReportData) return;

    // Forçar uma atualização completa
    setInvestmentListKey(`investments_${Date.now()}`);
    setProfitsListKey(`profits_${Date.now()}`);
    
    // Reset cache dos dados filtrados
    // setFilteredInvestmentsCache(null);
    // setFilteredProfitsCache(null);
    
    // Invalidar estatísticas
    // setInvestmentStats(null);
    // setProfitStats(null);
  }, [activeReportData?.id]);

  // Lidar com dados sincronizados externos (como do bitcoin-converter)
  useEffect(() => {
    if (!btcToUsd || !brlToUsd || !appData) return;

    // Detectar se os dados estão sendo fornecidos pelo bitcoin-converter
    // const isFromBitcoinConverter = appData.source && 
    //   ['bitcoin-converter', 'external-sync'].includes(appData.source);

    // Usar cotações passadas como props (fallback)
    states.setCurrentRates({ btcToUsd, brlToUsd });
  }, [btcToUsd, brlToUsd, appData, states.setCurrentRates]);

  // FUNÇÃO PARA FILTRAR DADOS DE UM RELATÓRIO ESPECÍFICO BASEADO NOS FILTROS ATIVOS
  const getFilteredReportData = useMemo(() => {
    return (report: any) => {
      let startDate: Date;
      let endDate = new Date();

      // Determinar período de filtro (mesma lógica de getFilteredHistoryData)
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

      // Filtrar investimentos do relatório
      const filteredInvestments = (report.investments || []).filter((inv: any) => {
        const invDate = new Date(inv.date);
        return invDate >= startDate && invDate <= endDate;
      });

      // Filtrar lucros do relatório
      const filteredProfits = (report.profits || []).filter((profit: any) => {
        const profitDate = new Date(profit.date);
        return profitDate >= startDate && profitDate <= endDate;
      });

      // Filtrar saques do relatório
      const filteredWithdrawals = (report.withdrawals || []).filter((withdrawal: any) => {
        const withdrawalDate = new Date(withdrawal.date);
        return withdrawalDate >= startDate && withdrawalDate <= endDate;
      });

      return {
        investments: filteredInvestments,
        profits: filteredProfits,
        withdrawals: filteredWithdrawals
      };
    };
  }, [historyFilterPeriod, historyCustomStartDate, historyCustomEndDate]);

  // FUNÇÃO PARA CALCULAR EFICIÊNCIA TEMPORAL (EVOLUÇÃO AO LONGO DO TEMPO)
  const calculateTemporalEfficiency = useMemo(() => {
    const effectiveReport = activeReportData?.report || currentActiveReportObjectFromHook;
    const effectiveAllReports = allReportsFromHook || [];
    
    const reportsToAnalyze = historyViewMode === "all" 
      ? effectiveAllReports
      : effectiveReport ? [effectiveReport] : [];

    if (reportsToAnalyze.length === 0) return [];

    // Coletar todos os dados relevantes
    const allInvestments: any[] = [];
    const allProfits: any[] = [];

    reportsToAnalyze.forEach(report => {
      const reportInvestments = report.investments || [];
      const reportProfits = report.profits || [];
      
      allInvestments.push(...reportInvestments);
      allProfits.push(...reportProfits);
    });

    // Aplicar filtros de período
    let startDate: Date;
    let endDate = new Date();

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

    // Filtrar dados pelo período
    const filteredInvestments = allInvestments.filter(inv => {
      const invDate = new Date(inv.date);
      return invDate >= startDate && invDate <= endDate;
    });

    const filteredProfits = allProfits.filter(profit => {
      const profitDate = new Date(profit.date);
      return profitDate >= startDate && profitDate <= endDate;
    });

    if (filteredInvestments.length === 0 && filteredProfits.length === 0) return [];

    // Determinar intervalo baseado no período total dos dados filtrados
    const allDates = [
      ...filteredInvestments.map(inv => new Date(inv.date).getTime()),
      ...filteredProfits.map(profit => new Date(profit.date).getTime())
    ];
    
    if (allDates.length === 0) return [];
    
    const firstDate = new Date(Math.min(...allDates));
    const lastDate = new Date(Math.max(...allDates));
    const totalDays = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Definir intervalos baseado na duração total
    let intervalDays;
    if (totalDays <= 30) intervalDays = 7; // Semanal para períodos curtos
    else if (totalDays <= 90) intervalDays = 15; // Quinzenal para períodos médios
    else if (totalDays <= 365) intervalDays = 30; // Mensal para períodos longos
    else intervalDays = 90; // Trimestral para períodos muito longos

    const intervals: Array<{
      start: Date;
      end: Date;
      investments: any[];
      profits: any[];
      weightedEfficiency: number;
      countEfficiency: number;
      totalInvested: number;
      profitableValue: number;
      label: string;
      period: string;
    }> = [];

    // Criar intervalos
    let currentDate = new Date(firstDate);
    while (currentDate <= lastDate) {
      const intervalEnd = new Date(currentDate);
      intervalEnd.setDate(intervalEnd.getDate() + intervalDays);
      
      // Filtrar dados para este intervalo
      const intervalInvestments = filteredInvestments.filter(inv => {
        const invDate = new Date(inv.date);
        return invDate >= currentDate && invDate < intervalEnd;
      });

      const intervalProfits = filteredProfits.filter(profit => {
        const profitDate = new Date(profit.date);
        return profitDate >= currentDate && profitDate < intervalEnd;
      });

      if (intervalInvestments.length > 0 || intervalProfits.length > 0) {
        // Calcular métricas para este intervalo
        const metrics = calculateROIMetrics({ 
          investments: intervalInvestments, 
          profits: intervalProfits 
        });

        intervals.push({
          start: new Date(currentDate),
          end: new Date(intervalEnd),
          investments: intervalInvestments,
          profits: intervalProfits,
          weightedEfficiency: metrics.investmentEfficiency,
          countEfficiency: metrics.countEfficiency,
          totalInvested: metrics.totalInvested,
          profitableValue: metrics.profitableInvestmentValue,
          label: formatDateFn(currentDate, "dd/MM"),
          period: intervalDays <= 7 ? "Semanal" : intervalDays <= 15 ? "Quinzenal" : intervalDays <= 30 ? "Mensal" : "Trimestral"
        });
      }

      currentDate = new Date(intervalEnd);
    }

    return intervals;
  }, [
    activeReportData?.report,
    currentActiveReportObjectFromHook, 
    allReportsFromHook, 
    historyViewMode,
    historyFilterPeriod,
    historyCustomStartDate,
    historyCustomEndDate,
    calculateROIMetrics
  ]);

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
                    className="bg-black/30 border-purple-700/50 hover:bg-purple-900/20"
                    onClick={() => setShowExportDialog(true)}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Exportando...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Exportar Relatório
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
            <TabsList className="grid w-full grid-cols-3 bg-black/40">
              <TabsTrigger value="import">Importação</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
              <TabsTrigger value="charts">Gráficos</TabsTrigger>
            </TabsList>

            {/* ABA IMPORTAÇÃO */}
            <TabsContent value="import">
              <div className="space-y-6">
                {/* Seletor de Configuração LN Markets */}
                {multipleConfigs && multipleConfigs.configs.length > 0 && (
                  <Card className="bg-black/30 border border-purple-700/40">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ImportIcon className="h-5 w-5" />
                        Importação LN Markets
                      </CardTitle>
                      <CardDescription>
                        Importe seus dados diretamente da API da LN Markets. Configure a API uma vez e use múltiplas vezes.
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
                                .map((config) => {
                                  // Verificar se esta API está associada ao relatório ativo
                                  const isAssociated = typeof getReportAssociatedAPIs === 'function' && 
                                    currentActiveReportObjectFromHook ? 
                                    getReportAssociatedAPIs(currentActiveReportObjectFromHook.id).includes(config.id) : 
                                    currentActiveReportObjectFromHook?.associatedLNMarketsConfigId === config.id;
                                  
                                  // Verificar se é a última API utilizada
                                  const isLastUsed = typeof getLastUsedConfigId === 'function' && 
                                    currentActiveReportObjectFromHook ?
                                    getLastUsedConfigId(currentActiveReportObjectFromHook) === config.id :
                                    false;
                                  
                                  return (
                                    <SelectItem key={config.id} value={config.id}>
                                      <div className="flex items-center gap-2">
                                        <span>{config.name}</span>
                                        {config.id === multipleConfigs.defaultConfigId && (
                                          <Badge variant="outline" className="text-xs">Padrão</Badge>
                                        )}
                                        {isAssociated && (
                                          <Badge variant="default" className="text-xs bg-blue-600">Associada</Badge>
                                        )}
                                        {isLastUsed && (
                                          <Badge variant="default" className="text-xs bg-green-600">Última Usada</Badge>
                                        )}
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                            </SelectContent>
                          </Select>
                          
                          {/* Alerta para múltiplas APIs */}
                          {typeof hasMultipleAPIs === 'function' && 
                           currentActiveReportObjectFromHook && 
                           hasMultipleAPIs(currentActiveReportObjectFromHook.id) && (
                            <Alert variant="default" className="mt-4 bg-yellow-900/20 border border-yellow-700/40">
                              <AlertTriangle className="h-5 w-5 text-yellow-400" />
                              <AlertDescription>
                                <p className="text-yellow-200 text-sm font-medium">Múltiplas fontes de dados</p>
                                <p className="text-yellow-100/80 text-xs mt-1">
                                  Este relatório contém dados de múltiplas configurações de API. 
                                  A API selecionada será usada para novas importações.
                                </p>
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Card de Aviso - Sem Configuração API */}
                {(!multipleConfigs || multipleConfigs.configs.length === 0) && (
                  <Card className="bg-yellow-900/30 border border-yellow-600/50 mb-4">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-yellow-400 text-base sm:text-lg">
                        <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                        <span>Configuração Necessária</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <p className="text-yellow-200 text-sm sm:text-base">
                          Você ainda não tem nenhuma configuração de API LN Markets para importação de dados.
                        </p>
                        <p className="text-xs sm:text-sm text-yellow-300/80">
                          Para usar as funcionalidades de importação, você precisa configurar suas credenciais de API no seu perfil.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center pt-2">
                          <Link href="/profile" className="flex items-center justify-center sm:justify-start gap-2 text-white bg-yellow-700 hover:bg-yellow-600 px-4 py-2 rounded-md transition-colors text-sm">
                            <User className="h-4 w-4 flex-shrink-0" />
                            <span>Ir para meu Perfil</span>
                          </Link>
                          <a 
                            href="https://lnmarkets.com/en/settings/api" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-xs sm:text-sm text-yellow-400 hover:text-yellow-300 underline underline-offset-2 text-center sm:text-right"
                          >
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
                
                <div className="mt-6">
                  <Alert variant="default" className="bg-yellow-900/20 border border-yellow-700/40">
                    <AlertCircle className="h-5 w-5 text-yellow-400" />
                    <AlertDescription>
                      <p className="text-yellow-200 text-sm font-medium">Dica para importações com muitos registros</p>
                      <p className="text-yellow-100/80 text-xs mt-1">
                        Às vezes é necessário clicar de 2 a 3 vezes no botão de importação para que todas as operações sejam salvas, 
                        especialmente quando há muitos registros. Aguarde a conclusão de cada operação antes de clicar novamente.
                      </p>
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </TabsContent>

            {/* ABA HISTÓRICO */}
            <TabsContent value="history">
              <div className="space-y-6">
                <Alert variant="default" className="bg-blue-900/20 border border-blue-700/40">
                  <RefreshCw className="h-5 w-5 text-blue-400" />
                  <AlertDescription>
                    <p className="text-blue-200 text-sm font-medium">Dica para visualização do histórico</p>
                    <p className="text-blue-100/80 text-xs mt-1">
                      Se os resultados não parecerem corretos ou estiverem desatualizados, atualize a página para garantir que todos os dados sejam carregados corretamente.
                    </p>
                  </AlertDescription>
                </Alert>
                
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
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <HistoryStatsCard
                    title="Total Investido"
                    value={formatCurrency(getFilteredHistoryData.investments.reduce((sum: number, inv: any) => {
                      const btcAmount = convertToBtc(inv.amount, inv.unit);
                      const usdValue = btcAmount * states.currentRates.btcToUsd;
                      return sum + (states.displayCurrency === "BRL" ? usdValue * states.currentRates.brlToUsd : usdValue);
                    }, 0), states.displayCurrency)}
                    icon={<TrendingDown className="h-4 w-4 text-blue-400" />}
                    valueColor="text-blue-400"
                    isROI={true}
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
                    isROI={true}
                  />
                  
                  <HistoryStatsCard
                    title={(() => {
                      const period = (() => {
                        switch (historyFilterPeriod) {
                          case "1m": return "Mensal";
                          case "3m": return "3 Meses";
                          case "6m": return "6 Meses";
                          case "1y": return "Anual";
                          case "all": return "Total";
                          case "custom": return "Personalizado";
                          default: return "Período";
                        }
                      })();
                      const source = historyViewMode === "active" ? "Ativo" : "Geral";
                      return `ROI ${period} (${source})`;
                    })()}
                    value={(() => {
                      const metrics = calculateROIMetrics(getFilteredHistoryData);
                      return `${metrics.roi >= 0 ? '+' : ''}${metrics.roi.toFixed(2)}%`;
                    })()}
                    icon={<Calculator className="h-4 w-4" />}
                    valueColor={(() => {
                      const metrics = calculateROIMetrics(getFilteredHistoryData);
                      return metrics.roi >= 0 ? "text-green-400" : "text-red-400";
                    })()}
                    change={(() => {
                      const metrics = calculateROIMetrics(getFilteredHistoryData);
                      return metrics.periodDays !== 365 ? metrics.annualizedROI : undefined;
                    })()}
                    isROI={true}
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
                    hasBackground={true}
                  />
                  
                  <HistoryStatsCard
                    title="Transações"
                    value={`${getFilteredHistoryData.investments.length + getFilteredHistoryData.profits.length + getFilteredHistoryData.withdrawals.length}`}
                    icon={<Users className="h-4 w-4 text-purple-400" />}
                    valueColor="text-purple-400"
                    hasBackground={true}
                  />
                </div>

                {/* Tabelas de Dados */}
                <Tabs value={historyActiveTab} onValueChange={setHistoryActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-5 bg-black/40">
                    <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                    <TabsTrigger value="investments">Investimentos</TabsTrigger>
                    <TabsTrigger value="profits">Lucros/Perdas</TabsTrigger>
                    <TabsTrigger value="withdrawals">Saques</TabsTrigger>
                    <TabsTrigger value="evolution">Evolução</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-4">
                    <Card className="bg-black/30 border border-purple-700/40">
                      <CardHeader>
                        <CardTitle>Resumo do Período</CardTitle>
                        {historyViewMode === "all" && allReportsFromHook && allReportsFromHook.length > 1 && (
                          <div className="text-sm text-purple-300">
                            Análise consolidada de {allReportsFromHook.length} relatórios
                          </div>
                        )}
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
                              
                              {/* Comparação de performance por relatório quando no modo "all" */}
                              {historyViewMode === "all" && allReportsFromHook && allReportsFromHook.length > 1 && (
                                <div className="mt-4">
                                  <h4 className="text-sm font-medium text-gray-400 mb-2">Performance por Relatório</h4>
                                  <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {allReportsFromHook.map(report => {
                                      // Aplicar filtros de período aos dados do relatório individual
                                      const filteredReportData = getFilteredReportData(report);
                                      const reportMetrics = calculateROIMetrics(filteredReportData);
                                      
                                      return (
                                        <div key={report.id} className="flex justify-between text-xs">
                                          <span className="text-gray-300 truncate max-w-[100px]" title={report.name}>
                                            {report.name}
                                          </span>
                                          <span className={reportMetrics.roi >= 0 ? "text-green-400" : "text-red-400"}>
                                            {reportMetrics.roi >= 0 ? '+' : ''}{reportMetrics.roi.toFixed(1)}%
                                            {filteredReportData.investments.length === 0 && filteredReportData.profits.length === 0 && (
                                              <span className="text-gray-500 ml-1">(sem dados)</span>
                                            )}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-2">
                                    ROI baseado no período: {(() => {
                                      switch (historyFilterPeriod) {
                                        case "1m": return "Último mês";
                                        case "3m": return "Últimos 3 meses";
                                        case "6m": return "Últimos 6 meses";
                                        case "1y": return "Último ano";
                                        case "all": return "Todo período";
                                        case "custom": return "Período personalizado";
                                        default: return "Período selecionado";
                                      }
                                    })()}
                                  </div>
                                </div>
                              )}
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
                                <div className="flex justify-between border-t border-gray-700/50 pt-2 mt-2">
                                  <span className="font-medium">ROI (%):</span>
                                  <span className={(() => {
                                    const metrics = calculateROIMetrics(getFilteredHistoryData);
                                    return metrics.roi >= 0 ? "text-green-400 font-medium" : "text-red-400 font-medium";
                                  })()}>
                                    {(() => {
                                      const metrics = calculateROIMetrics(getFilteredHistoryData);
                                      return `${metrics.roi >= 0 ? '+' : ''}${metrics.roi.toFixed(2)}%`;
                                    })()}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-400 mt-1">
                                  <span>Período: {(() => {
                                    switch (historyFilterPeriod) {
                                      case "1m": return "Último mês";
                                      case "3m": return "Últimos 3 meses";
                                      case "6m": return "Últimos 6 meses";
                                      case "1y": return "Último ano";
                                      case "all": return "Todo período";
                                      case "custom": return `${historyCustomStartDate ? formatDateFn(historyCustomStartDate, "dd/MM/yy") : "?"} - ${historyCustomEndDate ? formatDateFn(historyCustomEndDate, "dd/MM/yy") : "?"}`;
                                      default: return "Período";
                                    }
                                  })()}</span>
                                  <span>Fonte: {historyViewMode === "active" ? "Relatório ativo" : "Todos os relatórios"}</span>
                                </div>
                                {/* Métricas adicionais do ROI */}
                                <div className="border-t border-gray-700/50 pt-2 mt-2 space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">ROI Anualizado:</span>
                                    <span className={(() => {
                                      const metrics = calculateROIMetrics(getFilteredHistoryData);
                                      return metrics.annualizedROI >= 0 ? "text-green-400" : "text-red-400";
                                    })()}>
                                      {(() => {
                                        const metrics = calculateROIMetrics(getFilteredHistoryData);
                                        return `${metrics.annualizedROI >= 0 ? '+' : ''}${metrics.annualizedROI.toFixed(2)}%`;
                                      })()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">Taxa de Sucesso:</span>
                                    <span className={(() => {
                                      const metrics = calculateROIMetrics(getFilteredHistoryData);
                                      return metrics.successRate >= 50 ? "text-green-400" : metrics.successRate >= 25 ? "text-yellow-400" : "text-red-400";
                                    })()}>
                                      {(() => {
                                        const metrics = calculateROIMetrics(getFilteredHistoryData);
                                        return `${metrics.successRate.toFixed(1)}%`;
                                      })()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">Eficiência:</span>
                                    <span className={(() => {
                                      const metrics = calculateROIMetrics(getFilteredHistoryData);
                                      return metrics.investmentEfficiency >= 50 ? "text-green-400" : metrics.investmentEfficiency >= 25 ? "text-yellow-400" : "text-red-400";
                                    })()}>
                                      {(() => {
                                        const metrics = calculateROIMetrics(getFilteredHistoryData);
                                        return `${metrics.investmentEfficiency.toFixed(1)}%`;
                                      })()} por valor investido
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">Eficiência (Qtd):</span>
                                    <span className={(() => {
                                      const metrics = calculateROIMetrics(getFilteredHistoryData);
                                      return metrics.countEfficiency >= 50 ? "text-green-400" : metrics.countEfficiency >= 25 ? "text-yellow-400" : "text-red-400";
                                    })()}>
                                      {(() => {
                                        const metrics = calculateROIMetrics(getFilteredHistoryData);
                                        return `${metrics.countEfficiency.toFixed(1)}%`;
                                      })()} por quantidade
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">Valor Lucrativo:</span>
                                    <span className="text-green-400">
                                      {(() => {
                                        const metrics = calculateROIMetrics(getFilteredHistoryData);
                                        return `₿${metrics.profitableInvestmentValue.toFixed(8)}`;
                                      })()}
                                    </span>
                                  </div>
                                  {historyFilterPeriod === "custom" && historyCustomStartDate && historyCustomEndDate && (
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-400">Duração:</span>
                                      <span className="text-gray-300">
                                        {(() => {
                                          const metrics = calculateROIMetrics(getFilteredHistoryData);
                                          return `${metrics.periodDays} dias`;
                                        })()}
                                      </span>
                                    </div>
                                  )}
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
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle>Investimentos no Período</CardTitle>
                        {getFilteredHistoryData.investments.length > 0 && historyViewMode === "active" && (
                          <Button 
                            variant="destructive" 
                            size="sm"
                            className="bg-red-900/70 text-white hover:bg-red-800"
                            onClick={() => setShowConfirmDeleteInvestments(true)}
                          >
                            <TrendingDown className="h-4 w-4 mr-2" />
                            Excluir Todos
                          </Button>
                        )}
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[400px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Unidade</TableHead>
                                <TableHead>Valor (BTC)</TableHead>
                                <TableHead>Valor ({states.displayCurrency})</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getFilteredHistoryData.investments.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-center py-8 text-gray-400">
                                    Nenhum investimento encontrado no período selecionado
                                  </TableCell>
                                </TableRow>
                              ) : (
                                getFilteredHistoryData.investments.map((investment: any) => {
                                const btcAmount = convertToBtc(investment.amount, investment.unit);
                                  const usdValue = btcAmount * states.currentRates.btcToUsd;
                                  const currencyValue = states.displayCurrency === "BRL" ? usdValue * states.currentRates.brlToUsd : usdValue;
                                
                                return (
                                  <TableRow key={investment.id}>
                                    <TableCell>{formatDateFn(new Date(investment.date), "dd/MM/yyyy")}</TableCell>
                                    <TableCell>{investment.unit}</TableCell>
                                    <TableCell className="text-blue-400">₿{btcAmount.toFixed(8)}</TableCell>
                                      <TableCell className="text-blue-400">{formatCurrency(currencyValue, states.displayCurrency)}</TableCell>
                                  </TableRow>
                                );
                                })
                              )}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    {/* Diálogo de confirmação para excluir todos os investimentos */}
                    <Dialog open={showConfirmDeleteInvestments} onOpenChange={setShowConfirmDeleteInvestments}>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-red-400">Confirmar exclusão em massa</DialogTitle>
                          <DialogDescription>
                            Tem certeza que deseja excluir <span className="font-bold text-white">TODOS</span> os investimentos deste relatório?
                          </DialogDescription>
                        </DialogHeader>
                        <div className="bg-red-900/20 p-3 rounded-md border border-red-500/50 text-sm">
                          <p className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-400" />
                            <span>Esta ação não pode ser desfeita. Todos os investimentos serão permanentemente removidos.</span>
                          </p>
                        </div>
                        <DialogFooter className="flex flex-row justify-between sm:justify-between">
                          <Button 
                            variant="outline" 
                            onClick={() => setShowConfirmDeleteInvestments(false)}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            variant="destructive"
                            onClick={handleBulkDeleteInvestments}
                          >
                            Sim, excluir todos
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TabsContent>

                  <TabsContent value="profits" className="mt-4">
                    <Card className="bg-black/30 border border-purple-700/40">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle>Lucros e Perdas no Período</CardTitle>
                        {getFilteredHistoryData.profits.length > 0 && historyViewMode === "active" && (
                          <Button 
                            variant="destructive" 
                            size="sm"
                            className="bg-red-900/70 text-white hover:bg-red-800"
                            onClick={() => setShowConfirmDeleteProfits(true)}
                          >
                            <TrendingDown className="h-4 w-4 mr-2" />
                            Excluir Todos
                          </Button>
                        )}
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[400px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Unidade</TableHead>
                                <TableHead>Valor (BTC)</TableHead>
                                <TableHead>Valor ({states.displayCurrency})</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getFilteredHistoryData.profits.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                                    Nenhum registro de lucro/perda encontrado no período selecionado
                                  </TableCell>
                                </TableRow>
                              ) : (
                                getFilteredHistoryData.profits.map((profit: any) => {
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
                                    <TableCell>{profit.unit}</TableCell>
                                    <TableCell className={profit.isProfit ? "text-green-400" : "text-red-400"}>
                                      ₿{btcAmount.toFixed(8)}
                                    </TableCell>
                                    <TableCell className={profit.isProfit ? "text-green-400" : "text-red-400"}>
                                        {formatCurrency(currencyValue, states.displayCurrency)}
                                    </TableCell>
                                  </TableRow>
                                );
                                })
                              )}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    {/* Diálogo de confirmação para excluir todos os lucros/perdas */}
                    <Dialog open={showConfirmDeleteProfits} onOpenChange={setShowConfirmDeleteProfits}>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-red-400">Confirmar exclusão em massa</DialogTitle>
                          <DialogDescription>
                            Tem certeza que deseja excluir <span className="font-bold text-white">TODOS</span> os registros de lucro/perda deste relatório?
                          </DialogDescription>
                        </DialogHeader>
                        <div className="bg-red-900/20 p-3 rounded-md border border-red-500/50 text-sm">
                          <p className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-400" />
                            <span>Esta ação não pode ser desfeita. Todos os registros de lucro/perda serão permanentemente removidos.</span>
                          </p>
                        </div>
                        <DialogFooter className="flex flex-row justify-between sm:justify-between">
                          <Button 
                            variant="outline" 
                            onClick={() => setShowConfirmDeleteProfits(false)}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            variant="destructive"
                            onClick={handleBulkDeleteProfits}
                          >
                            Sim, excluir todos
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TabsContent>

                  <TabsContent value="withdrawals" className="mt-4">
                    <Card className="bg-black/30 border border-purple-700/40">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle>Saques no Período</CardTitle>
                        {getFilteredHistoryData.withdrawals.length > 0 && historyViewMode === "active" && (
                          <Button 
                            variant="destructive" 
                            size="sm"
                            className="bg-red-900/70 text-white hover:bg-red-800"
                            onClick={() => setShowConfirmDeleteWithdrawals(true)}
                          >
                            <TrendingDown className="h-4 w-4 mr-2" />
                            Excluir Todos
                          </Button>
                        )}
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[400px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Unidade</TableHead>
                                <TableHead>Valor (BTC)</TableHead>
                                <TableHead>Valor ({states.displayCurrency})</TableHead>
                                <TableHead>Destino</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getFilteredHistoryData.withdrawals.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                                    Nenhum saque encontrado no período selecionado
                                  </TableCell>
                                </TableRow>
                              ) : (
                                getFilteredHistoryData.withdrawals.map((withdrawal: any) => {
                                const btcAmount = convertToBtc(withdrawal.amount, withdrawal.unit);
                                  const usdValue = btcAmount * states.currentRates.btcToUsd;
                                  const currencyValue = states.displayCurrency === "BRL" ? usdValue * states.currentRates.brlToUsd : usdValue;
                                
                                return (
                                  <TableRow key={withdrawal.id}>
                                    <TableCell>{formatDateFn(new Date(withdrawal.date), "dd/MM/yyyy")}</TableCell>
                                    <TableCell>{withdrawal.unit}</TableCell>
                                    <TableCell className="text-orange-400">₿{btcAmount.toFixed(8)}</TableCell>
                                      <TableCell className="text-orange-400">{formatCurrency(currencyValue, states.displayCurrency)}</TableCell>
                                    <TableCell>
                                      <Badge variant={withdrawal.destination === 'wallet' ? 'default' : 'destructive'}>
                                        {withdrawal.destination === 'wallet' ? 'Carteira' : 'Exchange'}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                );
                                })
                              )}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    {/* Diálogo de confirmação para excluir todos os saques */}
                    <Dialog open={showConfirmDeleteWithdrawals} onOpenChange={setShowConfirmDeleteWithdrawals}>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-red-400">Confirmar exclusão em massa</DialogTitle>
                          <DialogDescription>
                            Tem certeza que deseja excluir <span className="font-bold text-white">TODOS</span> os saques deste relatório?
                          </DialogDescription>
                        </DialogHeader>
                        <div className="bg-red-900/20 p-3 rounded-md border border-red-500/50 text-sm">
                          <p className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-400" />
                            <span>Esta ação não pode ser desfeita. Todos os saques serão permanentemente removidos.</span>
                          </p>
                        </div>
                        <DialogFooter className="flex flex-row justify-between sm:justify-between">
                          <Button 
                            variant="outline" 
                            onClick={() => setShowConfirmDeleteWithdrawals(false)}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            variant="destructive"
                            onClick={handleBulkDeleteWithdrawals}
                          >
                            Sim, excluir todos
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TabsContent>

                  <TabsContent value="evolution">
                    <Card className="bg-black/30 border border-purple-700/40">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          📊 Evolução da Eficiência de Investimentos
                        </CardTitle>
                        <CardDescription>
                          Análise temporal da eficiência dos investimentos - mostra como a eficiência evolui ao longo do tempo
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {calculateTemporalEfficiency.length === 0 ? (
                          <div className="h-[350px] w-full flex items-center justify-center">
                            <div className="text-center space-y-3">
                              <div className="text-gray-400 text-lg">📈</div>
                              <div className="text-gray-400 text-sm">
                                Dados insuficientes para análise temporal
                              </div>
                              <div className="text-gray-500 text-xs">
                                A evolução da eficiência requer pelo menos dois períodos com dados
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Métricas de Resumo */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-black/20 rounded-lg border border-purple-700/20">
                              <div className="text-center">
                                <div className="text-xs text-gray-400">Períodos Analisados</div>
                                <div className="text-lg font-bold text-purple-400">{calculateTemporalEfficiency.length}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-gray-400">Eficiência Média</div>
                                <div className="text-lg font-bold text-green-400">
                                  {(calculateTemporalEfficiency.reduce((sum, item) => sum + item.weightedEfficiency, 0) / calculateTemporalEfficiency.length).toFixed(1)}%
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-gray-400">Melhor Período</div>
                                <div className="text-lg font-bold text-green-400">
                                  {Math.max(...calculateTemporalEfficiency.map(item => item.weightedEfficiency)).toFixed(1)}%
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-gray-400">Pior Período</div>
                                <div className="text-lg font-bold text-red-400">
                                  {Math.min(...calculateTemporalEfficiency.map(item => item.weightedEfficiency)).toFixed(1)}%
                                </div>
                              </div>
                            </div>

                            {/* Gráfico de Linha */}
                            <div id="efficiency-evolution-chart" className="h-[350px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={calculateTemporalEfficiency}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                                  <XAxis 
                                    dataKey="label" 
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
                                    domain={[0, 100]}
                                    tickFormatter={(value) => `${value}%`}
                                  />
                                  <Tooltip 
                                    contentStyle={{
                                      backgroundColor: 'rgba(0, 0, 0, 0.9)',
                                      border: '1px solid rgba(124, 58, 237, 0.5)',
                                      borderRadius: '0.375rem',
                                      color: '#F3F4F6',
                                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                                    }}
                                    cursor={{ fill: 'rgba(124, 58, 237, 0.3)' }}
                                    formatter={(value: number, name: string) => {
                                      if (name === 'weightedEfficiency') return [`${value.toFixed(1)}%`, 'Eficiência Ponderada'];
                                      if (name === 'countEfficiency') return [`${value.toFixed(1)}%`, 'Eficiência por Quantidade'];
                                      if (name === 'totalInvested') return [`₿${value.toFixed(8)}`, 'Total Investido'];
                                      if (name === 'profitableValue') return [`₿${value.toFixed(8)}`, 'Valor Lucrativo'];
                                      return [value, name];
                                    }}
                                    labelFormatter={(label) => `Período: ${label}`}
                                  />
                                  <Legend />
                                  <Line 
                                    type="monotone" 
                                    dataKey="weightedEfficiency" 
                                    stroke="#10B981" 
                                    strokeWidth={3}
                                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                                    name="Eficiência Ponderada"
                                  />
                                  <Line 
                                    type="monotone" 
                                    dataKey="countEfficiency" 
                                    stroke="#8B5CF6" 
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 3 }}
                                    name="Eficiência por Quantidade"
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>

                            {/* Tabela de Dados Detalhados */}
                            <div className="border border-purple-700/20 rounded-lg overflow-hidden">
                              <div className="bg-black/20 p-3 border-b border-purple-700/20">
                                <h4 className="text-sm font-medium text-gray-300">Dados Detalhados por Período</h4>
                              </div>
                              <div className="max-h-64 overflow-y-auto">
                                <table className="w-full text-xs">
                                  <thead className="bg-black/30 sticky top-0">
                                    <tr>
                                      <th className="text-left p-2 text-gray-400">Período</th>
                                      <th className="text-right p-2 text-gray-400">Efic. Ponderada</th>
                                      <th className="text-right p-2 text-gray-400">Efic. Quantidade</th>
                                      <th className="text-right p-2 text-gray-400">Investimentos</th>
                                      <th className="text-right p-2 text-gray-400">Valor Lucrativo</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {calculateTemporalEfficiency.map((item, index) => (
                                      <tr key={index} className={index % 2 === 0 ? "bg-black/10" : ""}>
                                        <td className="p-2 text-gray-300">
                                          {item.label}
                                          <div className="text-xs text-gray-500">{item.period}</div>
                                        </td>
                                        <td className={`text-right p-2 ${
                                          item.weightedEfficiency >= 50 ? "text-green-400" : 
                                          item.weightedEfficiency >= 25 ? "text-yellow-400" : "text-red-400"
                                        }`}>
                                          {item.weightedEfficiency.toFixed(1)}%
                                        </td>
                                        <td className={`text-right p-2 ${
                                          item.countEfficiency >= 50 ? "text-green-400" : 
                                          item.countEfficiency >= 25 ? "text-yellow-400" : "text-red-400"
                                        }`}>
                                          {item.countEfficiency.toFixed(1)}%
                                        </td>
                                        <td className="text-right p-2 text-blue-400">
                                          {item.investments.length}
                                        </td>
                                        <td className="text-right p-2 text-green-400">
                                          ₿{item.profitableValue.toFixed(8)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Informações Adicionais */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-400">
                              <div className="space-y-2">
                                <h5 className="font-medium text-gray-300">Sobre a Eficiência Ponderada</h5>
                                <ul className="space-y-1 list-disc list-inside">
                                  <li>Considera o valor investido, não apenas quantidade</li>
                                  <li>Associa lucros com investimentos por janela temporal</li>
                                  <li>Intervalos adaptativos baseados no período total</li>
                                </ul>
                              </div>
                              <div className="space-y-2">
                                <h5 className="font-medium text-gray-300">Periodicidade</h5>
                                <ul className="space-y-1 list-disc list-inside">
                                  <li>≤30 dias: Análise semanal</li>
                                  <li>≤90 dias: Análise quinzenal</li>
                                  <li>&gt;365 dias: Análise trimestral</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}
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
                      
                      {/* NOVO: Modo de Visualização */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Modo de Visualização</Label>
                        <Select value={chartViewMode} onValueChange={(value: HistoryViewMode) => setChartViewMode(value)}>
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Relatório Ativo</SelectItem>
                            <SelectItem value="all">Todos os Relatórios</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Cotação Atual agora em nova linha para manter layout consistente */}
                      <div className="space-y-2 sm:col-span-2 xl:col-span-4">
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
                    </div>
                  </CardContent>
                </Card>

                {/* Gráfico Principal */}
                <Card className="bg-black/30 border border-purple-700/40">
                  <CardHeader>
                    <CardTitle>
                      {chartTimeframe === "monthly" ? "Evolução Mensal" : "Evolução Diária"}
                      {chartViewMode === "active" ? " do Relatório Ativo" : " de Todos os Relatórios"}
                    </CardTitle>
                    <CardDescription>
                      Visualização da evolução do patrimônio ao longo do tempo em {chartDisplayUnit === "btc" ? "Bitcoin" : chartDisplayUnit === "usd" ? "Dólares" : "Reais"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {getChartData.length === 0 ? (
                      <div className="h-[350px] w-full flex items-center justify-center">
                        <div className="text-center space-y-3">
                          <div className="text-gray-400 text-lg">📊</div>
                          <div className="text-gray-400 text-sm">
                            {chartViewMode === "active" 
                              ? "Não há dados suficientes no relatório ativo para gerar um gráfico"
                              : "Não há dados suficientes em nenhum relatório para gerar um gráfico"}
                          </div>
                          {chartViewMode === "active" && !currentActiveReportObjectFromHook && (
                            <div className="text-purple-400 text-xs mt-2">
                              Selecione um relatório ativo para visualizar seu gráfico
                            </div>
                          )}
                          {chartViewMode === "all" && (!allReportsFromHook || allReportsFromHook.length === 0) && (
                            <div className="text-purple-400 text-xs mt-2">
                              Nenhum relatório encontrado no sistema
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div id="main-evolution-chart" className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          {chartType === "area" ? (
                            <AreaChart data={getChartData.map(point => ({
                              ...point,
                              investments: convertChartValue(point.investments),
                              profits: convertChartValue(point.profits),
                              balance: convertChartValue(point.balance)
                            }))}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                              <XAxis 
                                dataKey={chartTimeframe === "monthly" ? "month" : "date"} 
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
                                  backgroundColor: 'rgba(0, 0, 0, 0.9)',
                                  border: '1px solid rgba(124, 58, 237, 0.5)',
                                  borderRadius: '0.375rem',
                                  color: '#F3F4F6',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                                }}
                                cursor={{ fill: 'rgba(124, 58, 237, 0.3)' }}
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
                                dataKey={chartTimeframe === "monthly" ? "month" : "date"} 
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
                                  border: '1px solid #7C3AED',
                                  borderRadius: '8px',
                                  color: '#F3F4F6',
                                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                }}
                                cursor={{ fill: 'rgba(124, 58, 237, 0.3)' }}
                                formatter={(value: number, name: string) => {
                                  const formattedValue = formatChartValue(value);
                                  const formattedName = 
                                  name === 'investments' ? 'Investimentos' :
                                    name === 'profits' ? 'Lucros/Perdas' : 
                                    name === 'balance' ? 'Saldo Total' : name;
                                  const textColor = name === 'investments' ? '#F59E0B' : name === 'profits' ? '#10B981' : name === 'balance' ? '#8B5CF6' : '#F3F4F6';
                                  return [<span style={{ color: textColor }}>{formattedValue}</span>, formattedName];
                                }}
                                labelFormatter={(label: string) => `Período: ${label}`}
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
                                dataKey={chartTimeframe === "monthly" ? "month" : "date"} 
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
                                  border: '1px solid #7C3AED',
                                  borderRadius: '8px',
                                  color: '#F3F4F6',
                                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                }}
                                cursor={{ fill: 'rgba(124, 58, 237, 0.3)' }}
                                formatter={(value: number, name: string) => {
                                  const formattedValue = formatChartValue(value);
                                  const formattedName = 
                                  name === 'investments' ? 'Investimentos' :
                                    name === 'profits' ? 'Lucros/Perdas' : 
                                    name === 'balance' ? 'Saldo Total' : name;
                                  const textColor = name === 'investments' ? '#F59E0B' : name === 'profits' ? '#10B981' : name === 'balance' ? '#8B5CF6' : '#F3F4F6';
                                  return [<span style={{ color: textColor }}>{formattedValue}</span>, formattedName];
                                }}
                                labelFormatter={(label: string) => `Período: ${label}`}
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
                        {chartViewMode === "active" 
                          ? "Distribuição entre investimentos e lucros/perdas do relatório ativo" 
                          : "Distribuição entre investimentos e lucros/perdas de todos os relatórios"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {(chartViewMode === "active" && !currentActiveReportObjectFromHook) || 
                       (chartViewMode === "active" &&
                        (!currentActiveReportObjectFromHook.investments || currentActiveReportObjectFromHook.investments.length === 0) &&
                        (!currentActiveReportObjectFromHook.profits || currentActiveReportObjectFromHook.profits.length === 0)) ||
                       (chartViewMode === "all" && (!allReportsFromHook || allReportsFromHook.length === 0)) ? (
                        <div className="h-[250px] sm:h-[300px] w-full flex items-center justify-center">
                          <div className="text-center space-y-2">
                            <div className="text-gray-400 text-lg">🥧</div>
                            <div className="text-gray-400 text-sm">
                              Sem dados para composição
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div id="pie-chart-composition" className="h-[250px] sm:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                {
                                  name: 'Investimentos',
                                  value: convertChartValue(
                                    chartViewMode === "active" 
                                      ? (currentActiveReportObjectFromHook?.investments || [])
                                          .reduce((sum, inv) => sum + convertToBtc(inv.amount, inv.unit), 0)
                                      : (allReportsFromHook || []).flatMap(report => report.investments || [])
                                          .reduce((sum, inv) => sum + convertToBtc(inv.amount, inv.unit), 0)
                                  ),
                                  fill: '#3B82F6'
                                },
                                {
                                  name: 'Lucros/Perdas',
                                  value: Math.abs(convertChartValue(
                                    chartViewMode === "active"
                                      ? (currentActiveReportObjectFromHook?.profits || [])
                                          .reduce((sum, profit) => {
                                            const btcAmount = convertToBtc(profit.amount, profit.unit);
                                            return sum + (profit.isProfit ? btcAmount : -btcAmount);
                                          }, 0)
                                      : (allReportsFromHook || []).flatMap(report => report.profits || [])
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
                                backgroundColor: 'rgba(31, 41, 55, 0.85)',
                                border: '1px solid rgba(124, 58, 237, 0.6)',
                                borderRadius: '0.5rem',
                                color: '#FFFFFF',
                                fontSize: '13px',
                                boxShadow: '0 8px 16px -2px rgba(0, 0, 0, 0.2)',
                                padding: '10px'
                              }}
                              cursor={{ fill: 'rgba(124, 58, 237, 0.4)', stroke: 'rgba(139, 92, 246, 0.6)', strokeWidth: 1.5 }}
                              formatter={(value: number, name: string) => {
                                const formattedValue = formatChartValue(value);
                                // Mantendo cor para destacar o valor, mas texto do nome agora é branco
                                const textColor = name === 'Investimentos' ? '#F59E0B' : '#10B981';
                                return [<span style={{ color: textColor }}>{formattedValue}</span>, <span style={{ color: '#FFFFFF' }}>{name}</span>];
                              }}
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
                        Métricas principais {chartViewMode === "active" ? "do relatório ativo" : "de todos os relatórios"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {chartViewMode === "active" ? (
                          // Visualização apenas do relatório ativo
                          !reportSummaryData ? (
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
                          )
                        ) : (
                          // Visualização de todos os relatórios
                          !appData || !(appData as any).reports || (appData as any).reports.length === 0 ? (
                            <div className="text-center py-8">
                              <div className="text-gray-400 text-sm">
                                Nenhum relatório disponível
                              </div>
                            </div>
                          ) : (
                            (() => {
                              // Calcular valores totais de todos os relatórios de forma segura
                              let totalInvestmentsBtc = 0;
                              let totalOperationalProfitBtc = 0;
                              
                              // Iterar sobre os relatórios com segurança de tipos
                              try {
                                const reports = (appData as any).reports;
                                if (Array.isArray(reports)) {
                                  reports.forEach((report: any) => {
                                    if (report?.summary) {
                                      totalInvestmentsBtc += report.summary.totalInvestmentsBtc || 0;
                                      totalOperationalProfitBtc += report.summary.operationalProfitBtc || 0;
                                    }
                                  });
                                }
                              } catch (err) {
                                console.error("Erro ao calcular estatísticas consolidadas:", err);
                              }
                              
                              if (totalInvestmentsBtc === 0 && totalOperationalProfitBtc === 0) {
                                return (
                                  <div className="text-center py-8">
                                    <div className="text-gray-400 text-sm">
                                      Nenhum dado disponível nos relatórios
                                    </div>
                                  </div>
                                );
                              }
                              
                              return (
                                <>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-400">Total Investido (Todos):</span>
                                    <span className="text-blue-400 font-medium">
                                      {formatChartValue(convertChartValue(totalInvestmentsBtc))}
                                    </span>
                                  </div>
                                  
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-400">Lucro/Perda (Todos):</span>
                                    <span className={`font-medium ${totalOperationalProfitBtc >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {formatChartValue(convertChartValue(totalOperationalProfitBtc))}
                                    </span>
                                  </div>
                                  
                                  <div className="border-t border-purple-700/30 pt-3">
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm text-gray-400">ROI Total:</span>
                                      <span className={`font-bold ${totalOperationalProfitBtc >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {totalInvestmentsBtc > 0 
                                          ? `${((totalOperationalProfitBtc / totalInvestmentsBtc) * 100).toFixed(2)}%`
                                          : '0.00%'
                                        }
                                      </span>
                                    </div>
                                  </div>
                                </>
                              );
                            })()
                          )
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
            </TabsContent>
          </Tabs>
          
          {/* Diálogo de opções de exportação */}
          <ExportOptionsDialog 
            open={showExportDialog} 
            onOpenChange={setShowExportDialog}
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
            isExporting={isExporting}
          />
        </>
      )}
    </div>
  );
}
