"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useReportEvents } from "@/contexts/report-events-context";
import { useReportSync } from "@/contexts/report-sync-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// CORRIGIDO: Usando apenas uma implementação de toast
import { useToast } from "@/hooks/use-toast";
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

// NOVO: Import do hook customizado para mudança de relatório
import { useReportChange } from "@/hooks/use-report-change";

// TIPOS PARA O SISTEMA MELHORADO
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
            {progress.current} / {progress.total}
          </div>
          {estimatedTimeRemaining && progress.status === 'loading' && (
            <div className="text-xs text-blue-400">
              {formatTimeRemaining(estimatedTimeRemaining)}
            </div>
          )}
        </div>
      </div>
      
      <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
        <div 
          className={cn("h-full transition-all duration-300 ease-out", getStatusColor())}
          style={{ width: `${Math.min(progress.percentage, 100)}%` }}
        />
      </div>
      
      {progress.message && (
        <div className="text-xs text-gray-300 bg-black/30 px-2 py-1 rounded">
          {progress.message}
        </div>
      )}
    </div>
  );
}

function HistoryStatsCard({ title, value, icon, change, valueColor }: {
  title: string;
  value: string;
  icon: React.ReactNode;
  change?: number;
  valueColor?: string;
}) {
  return (
    <Card className="bg-black/20 border border-purple-700/30 hover:bg-black/30 transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {icon}
            <p className="text-sm font-medium text-gray-300">{title}</p>
          </div>
          {change !== undefined && (
            <Badge variant={change >= 0 ? "default" : "destructive"} className="text-xs">
              {change >= 0 ? "+" : ""}{change.toFixed(1)}%
            </Badge>
          )}
        </div>
        <p className={cn("text-2xl font-bold mt-2", valueColor || "text-white")}>{value}</p>
      </CardContent>
    </Card>
  );
}

export default function ProfitCalculatorFixed({ 
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

  // CORRIGIDO: Hook de toast com implementação única
  const { toast } = useToast();

  // NOVO: Hook personalizado para mudança de relatório
  const { handleReportChange } = useReportChange({
    onReportChange: (reportId, reportName) => {
      console.log('[ProfitCalculatorFixed] Relatório mudou via callback:', { reportId, reportName });
      
      // Limpar caches
      if (typeof chartDataCache !== 'undefined' && chartDataCache.current) {
        chartDataCache.current.clear();
      }
      if (typeof filteredDataCache !== 'undefined' && filteredDataCache.current) {
        filteredDataCache.current.clear();
      }
      
      // Forçar recarregamento
      setComponentKey(prev => prev + 1);
      setLocalForceUpdate(prev => prev + 1);
      
      // Resetar estados
      setHistoryFilterPeriod("3m");
      setHistoryViewMode("active");
      setHistoryActiveTab("overview");
      setChartViewMode("active");
      setChartDisplayUnit("btc");
      setChartType("bar");
      setChartTimeframe("monthly");
    },
    enableToast: true,
    debounceMs: 200
  });

  // Estados básicos
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [localForceUpdate, setLocalForceUpdate] = useState(0);
  const [componentKey, setComponentKey] = useState(0);
  const [lastActiveReportId, setLastActiveReportId] = useState<string | null>(null);

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
    associateAPIToReport,
    getReportAssociatedAPIs,
    hasMultipleAPIs,
    updateRecordSource
  } = useReports();

  // Hook de estados
  const states = useProfitCalculatorStates();

  // Estados LN Markets
  const [lnMarketsCredentials, setLnMarketsCredentials] = useState<LNMarketsCredentials | null>(null);
  const [isImportingTrades, setIsImportingTrades] = useState(false);
  const [isImportingDeposits, setIsImportingDeposits] = useState(false);
  const [isImportingWithdrawals, setIsImportingWithdrawals] = useState(false);
  const [importStats, setImportStats] = useState<LNMarketsImportStats | null>(null);
  const [multipleConfigs, setMultipleConfigs] = useState<LNMarketsMultipleConfig | null>(null);
  const [selectedConfigForImport, setSelectedConfigForImport] = useState<string | null>(null);
  const [showConfigSelector, setShowConfigSelector] = useState(false);

  // Estados de progresso
  const [importProgress, setImportProgress] = useState<ImportProgressState>({
    trades: { current: 0, total: 0, percentage: 0, status: 'idle' },
    deposits: { current: 0, total: 0, percentage: 0, status: 'idle' },
    withdrawals: { current: 0, total: 0, percentage: 0, status: 'idle' }
  });

  // Estados de histórico e gráficos
  const [historyFilterPeriod, setHistoryFilterPeriod] = useState<HistoryFilterPeriod>("3m");
  const [historyViewMode, setHistoryViewMode] = useState<HistoryViewMode>("active");
  const [historyCustomStartDate, setHistoryCustomStartDate] = useState<Date | undefined>(undefined);
  const [historyCustomEndDate, setHistoryCustomEndDate] = useState<Date | undefined>(undefined);
  const [historyActiveTab, setHistoryActiveTab] = useState<string>("overview");
  const [chartDisplayUnit, setChartDisplayUnit] = useState<"btc" | "usd" | "brl">("btc");
  const [chartType, setChartType] = useState<"line" | "bar" | "area">("bar");
  const [chartTimeframe, setChartTimeframe] = useState<"daily" | "monthly">("monthly");
  const [chartViewMode, setChartViewMode] = useState<HistoryViewMode>("active");
  const [chartVisibleSeries, setChartVisibleSeries] = useState({
    investments: true,
    profits: true,
    balance: true
  });

  // Estados de diálogo
  const [showConfirmDeleteInvestments, setShowConfirmDeleteInvestments] = useState(false);
  const [showConfirmDeleteProfits, setShowConfirmDeleteProfits] = useState(false);
  const [showConfirmDeleteWithdrawals, setShowConfirmDeleteWithdrawals] = useState(false);

  // Refs
  const chartDataCache = useRef(new Map());
  const filteredDataCache = useRef(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const internalFileInputRef = useRef<HTMLInputElement>(null);
  const investmentCsvFileInputRef = useRef<HTMLInputElement>(null);
  const backupExcelFileInputRef = useRef<HTMLInputElement>(null);

  const isMobile = useIsMobile();

  // Determinar qual fonte de dados usar
  const effectiveActiveReportId = activeReportData?.id || currentActiveReportObjectFromHook?.id;
  const effectiveActiveReport = activeReportData?.report || currentActiveReportObjectFromHook;

  // CORRIGIDO: Effect para detectar mudança de relatório usando o hook personalizado
  useEffect(() => {
    handleReportChange(
      effectiveActiveReportId,
      lastActiveReportId,
      effectiveActiveReport?.name
    );
    
    // Atualizar o último relatório ativo conhecido
    if (effectiveActiveReportId !== lastActiveReportId) {
      setLastActiveReportId(effectiveActiveReportId);
    }
  }, [effectiveActiveReportId, lastActiveReportId, effectiveActiveReport?.name, handleReportChange]);

  // Resto dos effects e funções vão aqui (continuaremos na próxima parte)
  
  return (
    <div key={componentKey} className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          Calculadora de Lucros - Versão Corrigida
        </h2>
        <p className="text-purple-400">
          Relatório ativo: {effectiveActiveReport?.name || 'Nenhum relatório selecionado'}
        </p>
        <p className="text-sm text-gray-400">
          Component key: {componentKey} | Force update: {localForceUpdate}
        </p>
      </div>

      {/* ADICIONADO: ReportManager para permitir trocar relatórios */}
      <Card className="bg-black/30 border border-purple-700/40">
        <CardHeader>
          <CardTitle>Gerenciador de Relatórios</CardTitle>
          <CardDescription>
            Troque entre relatórios para testar o recarregamento do componente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportManager />
        </CardContent>
      </Card>
      
      {/* Card de informações do relatório ativo */}
      <Card className="bg-black/30 border border-purple-700/40">
        <CardHeader>
          <CardTitle>Informações do Relatório Ativo</CardTitle>
          <CardDescription>
            Dados do relatório selecionado - deve atualizar instantaneamente ao trocar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <HistoryStatsCard
              title="Relatório ID"
              value={effectiveActiveReportId || 'N/A'}
              icon={<File className="h-4 w-4" />}
              valueColor="text-blue-400"
            />
            <HistoryStatsCard
              title="Investimentos"
              value={(effectiveActiveReport?.investments?.length || 0).toString()}
              icon={<TrendingUp className="h-4 w-4" />}
              valueColor="text-green-400"
            />
            <HistoryStatsCard
              title="Lucros"
              value={(effectiveActiveReport?.profits?.length || 0).toString()}
              icon={<Wallet className="h-4 w-4" />}
              valueColor="text-yellow-400"
            />
          </div>
          
          {/* Informações adicionais para debug */}
          <div className="mt-4 p-4 bg-gray-900/50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Debug Info:</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
              <div>Último ID: {lastActiveReportId || 'N/A'}</div>
              <div>Atual ID: {effectiveActiveReportId || 'N/A'}</div>
              <div>Nome: {effectiveActiveReport?.name || 'N/A'}</div>
              <div>Timestamp: {new Date().toLocaleTimeString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card de teste de dados */}
      {effectiveActiveReport && (
        <Card className="bg-black/30 border border-purple-700/40">
          <CardHeader>
            <CardTitle>Dados do Relatório</CardTitle>
            <CardDescription>
              Conteúdo detalhado do relatório selecionado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="investments" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="investments">Investimentos</TabsTrigger>
                <TabsTrigger value="profits">Lucros</TabsTrigger>
                <TabsTrigger value="withdrawals">Retiradas</TabsTrigger>
              </TabsList>
              
              <TabsContent value="investments" className="mt-4">
                <div className="space-y-2">
                  {effectiveActiveReport.investments?.length > 0 ? (
                    effectiveActiveReport.investments.slice(0, 5).map((investment, index) => (
                      <div key={index} className="p-2 bg-gray-800/50 rounded text-sm">
                        <div className="flex justify-between">
                          <span>Data: {investment.date}</span>
                          <span>Valor: {investment.amount} {investment.currency}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-center py-4">Nenhum investimento encontrado</p>
                  )}
                  {effectiveActiveReport.investments?.length > 5 && (
                    <p className="text-xs text-gray-500 text-center">
                      ... e mais {effectiveActiveReport.investments.length - 5} investimentos
                    </p>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="profits" className="mt-4">
                <div className="space-y-2">
                  {effectiveActiveReport.profits?.length > 0 ? (
                    effectiveActiveReport.profits.slice(0, 5).map((profit, index) => (
                      <div key={index} className="p-2 bg-gray-800/50 rounded text-sm">
                        <div className="flex justify-between">
                          <span>Data: {profit.date}</span>
                          <span className={profit.amount >= 0 ? "text-green-400" : "text-red-400"}>
                            {profit.amount >= 0 ? '+' : ''}{profit.amount} {profit.currency}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-center py-4">Nenhum lucro encontrado</p>
                  )}
                  {effectiveActiveReport.profits?.length > 5 && (
                    <p className="text-xs text-gray-500 text-center">
                      ... e mais {effectiveActiveReport.profits.length - 5} lucros
                    </p>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="withdrawals" className="mt-4">
                <div className="space-y-2">
                  {effectiveActiveReport.withdrawals?.length > 0 ? (
                    effectiveActiveReport.withdrawals.slice(0, 5).map((withdrawal, index) => (
                      <div key={index} className="p-2 bg-gray-800/50 rounded text-sm">
                        <div className="flex justify-between">
                          <span>Data: {withdrawal.date}</span>
                          <span>Valor: {withdrawal.amount} {withdrawal.currency}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-center py-4">Nenhuma retirada encontrada</p>
                  )}
                  {effectiveActiveReport.withdrawals?.length > 5 && (
                    <p className="text-xs text-gray-500 text-center">
                      ... e mais {effectiveActiveReport.withdrawals.length - 5} retiradas
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 