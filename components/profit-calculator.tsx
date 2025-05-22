"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Calendar,
  Coins,
  TrendingUp,
  Trash2,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Check,
  RefreshCw,
  AlertTriangle,
  FileText,
  Download,
  ChevronDown,
  Upload,
  FileType,
  PieChart as PieChartIcon,
  BarChart2,
  Sliders,
  ArrowUp,
  ArrowDown,
  CircleSlash2,
  HelpCircle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { format, subMonths, addMonths, startOfMonth, endOfMonth, isWithinInterval, isBefore, startOfDay, endOfDay, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import AnimatedCounter from "./animated-counter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getCurrentBitcoinPrice } from "@/lib/client-api";
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useIsMobile } from "@/hooks/use-mobile";
import { ResponsiveContainer } from "@/components/ui/responsive-container";
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useReports } from "@/hooks/use-reports";
import { getHistoricalBitcoinDataForRange, type HistoricalDataPoint } from "@/lib/client-api";
import { v4 as uuidv4 } from 'uuid';
import { useToast } from "@/components/ui/use-toast";
// import DatePickerWithRange from "./date-picker-with-range";
// import DatePicker from "./date-picker";

// Tipos de dados
type CurrencyUnit = "BTC" | "SATS";
type DisplayCurrency = "USD" | "BRL";

interface Investment {
  id: string;
  originalId?: string;
  date: string;
  amount: number;
  unit: CurrencyUnit;
  // Novos campos para armazenar o preço do Bitcoin na data do aporte
  priceAtDate?: number;
  priceAtDateCurrency?: DisplayCurrency;
  priceAtDateSource?: string;
}

interface ProfitRecord {
  id: string;
  originalId?: string;
  date: string;
  amount: number;
  unit: CurrencyUnit;
  isProfit: boolean;
}

interface AppData {
  currentPrice: {
    usd: number;
    brl: number;
    isUsingCache?: boolean;
  };
  isUsingCache: boolean;
}

interface ProfitCalculatorProps {
  btcToUsd: number;
  brlToUsd: number;
  appData?: AppData;
}

// Adicionar tipo para o objeto monthlyData
interface MonthlyData {
  label: string;
  investments: Investment[];
  investmentTotalBtc: number;
  profits: ProfitRecord[];
  profitTotalBtc: number;
}

interface ImportStats {
  total: number;
  success: number;
  error: number;
  duplicated?: number;
}

// ADICIONAR NOVA INTERFACE REPORT
interface Report {
  id: string;
  name: string;
  description?: string;
  investments: Investment[];
  profits: ProfitRecord[];
  color?: string;
  createdAt: string;
}

// NOVA INTERFACE PARA ReportsCollection (para corrigir linter error)
interface ReportsCollection {
  reports: Report[];
  // Outros campos potenciais da coleção, como 'activeReportId' ou metadados globais, podem ser adicionados aqui se necessário.
}

// NOVA INTERFACE PARA OPÇÕES DE EXPORTAÇÃO
interface ExportOptions {
  exportFormat: 'excel' | 'pdf'; // Novo
  reportSelectionType: 'active' | 'history' | 'manual';
  manualSelectedReportIds?: string[];
  periodSelectionType: 'all' | 'historyFilter' | 'specificMonth' | 'customRange';
  specificMonthDate?: Date | null;
  customStartDate?: Date | null;
  customEndDate?: Date | null;
  includeCharts?: boolean;
  includeSummarySection?: boolean; // Novo
  includeInvestmentsTableSection?: boolean; // Novo
  includeProfitsTableSection?: boolean; // Novo
  pdfDarkMode?: boolean; // NOVO para modo escuro PDF
}

// NOVO: Interface para informações de preço histórico para uma data
interface DatePriceInfo {
  price: number | null;
  loading: boolean;
  currency: DisplayCurrency | null;
  error?: string | null;
  source?: string | null; // Adicionar fonte
}

// Função interna que realmente busca o preço - Refatorada para retornar o valor
async function fetchBtcPriceOnDate(
  date: Date, 
  targetCurrency: DisplayCurrency
): Promise<{ price: number; source: string; currency: DisplayCurrency } | null> {
  const targetDate = startOfDay(date); // Normalizar para o início do dia
  const targetDateStr = format(targetDate, "yyyy-MM-dd");

  console.log(`[fetchBtcPriceOnDate] Buscando preço para ${targetDateStr} em ${targetCurrency}`);

  try {
    const data = await getHistoricalBitcoinDataForRange(
      targetCurrency.toLowerCase() as 'usd' | 'brl',
      targetDateStr,
      targetDateStr, // Para um único dia, from e to são iguais
      true // Forçar atualização para obter o preço mais preciso do dia
    );

    if (data && data.length > 0 && data[0].price !== null && data[0].price !== undefined) {
      console.log(`[fetchBtcPriceOnDate] Preço encontrado: ${data[0].price} ${targetCurrency}, Fonte: ${data[0].source}`);
      return {
        price: data[0].price,
        source: data[0].source || 'API',
        currency: targetCurrency,
      };
    } else {
      console.warn(`[fetchBtcPriceOnDate] Dados de preço não encontrados para ${targetDateStr} em ${targetCurrency}. Resposta:`, data);
      return null; // Retorna null se não encontrar dados específicos
    }
  } catch (error: any) {
    console.error(`[fetchBtcPriceOnDate] Erro ao buscar preço para ${targetDateStr} em ${targetCurrency}:`, error);
    // Não relançar o erro aqui, deixar que o chamador decida como lidar com null
    return null;
  }
}

// +++ NOVAS FUNÇÕES AUXILIARES DE CÁLCULO +++

// Função para calcular o lucro operacional bruto
function calculateOperationalProfitForSummary(
  profitRecords: ProfitRecord[] | undefined, // Permitir undefined
  convertToBtcFunction: (amount: number, unit: CurrencyUnit) => number
): { operationalProfitBtc: number; netProfitFromOperationsBtc: number } {
  let grossProfitBtc = 0;
  let grossLossBtc = 0;

  (profitRecords || []).forEach(prof => { // Adicionar fallback para array vazio
    const amountBtc = convertToBtcFunction(prof.amount, prof.unit);
    if (prof.isProfit) {
      grossProfitBtc += amountBtc;
    } else {
      grossLossBtc += amountBtc;
    }
  });
  return { 
    operationalProfitBtc: grossProfitBtc, // Soma dos lucros (ProfitRecord.isProfit = true)
    netProfitFromOperationsBtc: grossProfitBtc - grossLossBtc // Lucro líquido (lucros - perdas de ProfitRecord)
  };
}

// Função para calcular o lucro de valorização
function calculateValuationProfitForSummary(
  investments: Investment[] | undefined, // Permitir undefined
  currentBtcPriceUsd: number,
  brlToUsdRate: number, // Taxa de BRL para USD
  convertToBtcFunction: (amount: number, unit: CurrencyUnit) => number
): { valuationProfitUsd: number; valuationProfitBtc: number } {
  let totalValuationProfitUsd = 0;

  if (currentBtcPriceUsd > 0) {
    (investments || []).forEach(inv => { // Adicionar fallback para array vazio
      if (inv.priceAtDate && inv.priceAtDateCurrency) {
        let priceAtDateUsd = inv.priceAtDate;
        if (inv.priceAtDateCurrency === "BRL" && brlToUsdRate !== 0) {
          priceAtDateUsd = inv.priceAtDate / brlToUsdRate;
        }

        if (typeof priceAtDateUsd === 'number' && priceAtDateUsd > 0) {
          const investmentBtc = convertToBtcFunction(inv.amount, inv.unit);
          totalValuationProfitUsd += (currentBtcPriceUsd - priceAtDateUsd) * investmentBtc;
        }
      }
    });
  }
  const valuationProfitBtc = currentBtcPriceUsd > 0 && totalValuationProfitUsd !== 0 
    ? totalValuationProfitUsd / currentBtcPriceUsd 
    : 0;
  return { valuationProfitUsd: totalValuationProfitUsd, valuationProfitBtc };
}

// Função para calcular o preço médio de compra
function calculateAverageBuyPriceForSummary(
  investments: Investment[] | undefined, // Permitir undefined
  brlToUsdRate: number, // Taxa de BRL para USD
  convertToBtcFunction: (amount: number, unit: CurrencyUnit) => number
): { averageBuyPriceUsd: number; totalInvestmentsBtc: number } {
  let totalInvestmentsBtc = 0;
  let totalWeightedPriceUsd = 0;

  (investments || []).forEach(inv => { // Adicionar fallback para array vazio
    const investmentBtc = convertToBtcFunction(inv.amount, inv.unit);
    totalInvestmentsBtc += investmentBtc;
    if (inv.priceAtDate && inv.priceAtDateCurrency) {
      let priceUsd = inv.priceAtDate;
      if (inv.priceAtDateCurrency === "BRL" && brlToUsdRate !== 0) {
        priceUsd = inv.priceAtDate / brlToUsdRate;
      }
      if (typeof priceUsd === 'number' && priceUsd > 0) {
        totalWeightedPriceUsd += priceUsd * investmentBtc;
      }
    }
  });

  const averageBuyPriceUsd = totalInvestmentsBtc > 0 ? totalWeightedPriceUsd / totalInvestmentsBtc : 0;
  return { averageBuyPriceUsd, totalInvestmentsBtc };
}

// +++ FIM DAS NOVAS FUNÇÕES AUXILIARES +++

// +++ MOVER formatTempoInvestimento PARA CÁ +++
const formatTempoInvestimento = (dias: number): string => {
  if (dias < 0) return "N/A"; // Sanity check
  if (dias === 0) return "Menos de 1 dia";

  const anos = Math.floor(dias / 365);
  const meses = Math.floor((dias % 365) / 30);
  const diasRestantes = Math.floor((dias % 365) % 30);
  
  let str = "";
  if (anos > 0) str += `${anos} ano${anos > 1 ? 's' : ''} `;
  if (meses > 0) str += `${meses} ${meses > 1 ? 'meses' : 'mês'} `;
  if (diasRestantes > 0) str += `${diasRestantes} dia${diasRestantes > 1 ? 's' : ''}`;
  
  if (str.trim() === "" && dias > 0) {
    return `${dias} dia${dias > 1 ? 's' : ''}`;
  }
  return str.trim() || "N/A";
};
// +++ FIM DE formatTempoInvestimento MOVIDA +++

// Função auxiliar para converter string de data ISO para objeto Date com fuso horário correto
const parseISODate = (dateString: string): Date => {
  if (!dateString) {
    // Retornar uma data inválida ou lançar um erro se a string for vazia/nula
    // Isso depende de como o resto do código espera lidar com datas inválidas.
    // Por agora, vamos logar um aviso e retornar uma data que provavelmente causará erro adiante se não tratada.
    console.warn("parseISODate recebeu uma string vazia ou nula.");
    return new Date("invalid date"); 
  }
  const date = new Date(dateString);
  // Verificar se a data é válida, pois o construtor de Date pode retornar "Invalid Date"
  // mas ainda assim ser um objeto Date.
  if (isNaN(date.getTime())) {
    console.warn(`parseISODate resultou em data inválida para a string: "${dateString}"`);
    // Considerar lançar um erro aqui se uma data inválida não for esperada
    // throw new Error(`Invalid date string provided to parseISODate: ${dateString}`);
  }
  return date;
};

export default function ProfitCalculator({ btcToUsd, brlToUsd, appData }: ProfitCalculatorProps) {
  // =================================================================================
  // 1. DECLARAÇÃO DE HOOKS PRIMÁRIOS (useReports, useState, useRef, useIsMobile)
  // =================================================================================
  const { 
    collection: rawCollection,
    activeReportId: activeReportIdFromHook, 
    isLoaded: reportsDataLoaded, 
    addReport, 
    selectReport, 
    addInvestmentToReport, 
    addProfitRecordToReport, 
    deleteInvestmentFromReport, 
    deleteProfitRecordFromReport, 
    updateReportDetails, 
    importExternalDataToReport, 
    deleteAllInvestmentsFromReport,
    deleteAllProfitsFromReport,
    recalculateReportSummary,
  } = useReports();

  // Todos os useState devem vir aqui
  const [activeTab, setActiveTab] = useState<string>("register");
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("USD");
  const [currentRates, setCurrentRates] = useState({ btcToUsd, brlToUsd });
  const [loading, setLoading] = useState(false);
  const [usingFallbackRates, setUsingFallbackRates] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [investmentAmount, setInvestmentAmount] = useState<string>("");
  const [investmentUnit, setInvestmentUnit] = useState<CurrencyUnit>("SATS");
  const [investmentDate, setInvestmentDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0));
  });
  const [profitAmount, setProfitAmount] = useState<string>("");
  const [profitUnit, setProfitUnit] = useState<CurrencyUnit>("SATS");
  const [profitDate, setProfitDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0));
  });
  const [isProfit, setIsProfit] = useState<boolean>(true);
  const [filterMonth, setFilterMonth] = useState<Date>(new Date());
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [useExportDialog, setUseExportDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [importType, setImportType] = useState<"excel" | "csv" | "internal" | "investment-csv" | null>(null);
  const [showDeleteInvestmentsDialog, setShowDeleteInvestmentsDialog] = useState(false);
  const [showDeleteProfitsDialog, setShowDeleteProfitsDialog] = useState(false);
  const [selectedReportIdsForHistoryView, setSelectedReportIdsForHistoryView] = useState<string[]>([]);
  const [toastDebounce, setToastDebounce] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{count: number, type: string} | null>(null);
  const [pendingInvestment, setPendingInvestment] = useState<Investment | null>(null);
  const [pendingProfit, setPendingProfit] = useState<ProfitRecord | null>(null);
  const [showConfirmDuplicateDialog, setShowConfirmDuplicateDialog] = useState(false);
  const [duplicateConfirmInfo, setDuplicateConfirmInfo] = useState<{ type: 'investment' | 'profit', date: string, amount: number, unit: CurrencyUnit } | null>(null);
  const [reportNameInput, setReportNameInput] = useState("");
  const [showCreateReportDialog, setShowCreateReportDialog] = useState(false);
  const [historyFilterType, setHistoryFilterType] = useState<'month' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
  const [showAdvancedExportDialog, setShowAdvancedExportDialog] = useState(false);
  const [exportReportSelectionType, setExportReportSelectionType] = useState<'active' | 'history' | 'manual'>('active');
  const [manualSelectedReportIdsForExport, setManualSelectedReportIdsForExport] = useState<string[]>([]);
  const [exportPeriodSelectionType, setExportPeriodSelectionType] = useState<'all' | 'historyFilter' | 'specificMonth' | 'customRange'>('all');
  const [exportSpecificMonthDate, setExportSpecificMonthDate] = useState<Date | null>(new Date());
  const [exportCustomStartDateForRange, setExportCustomStartDateForRange] = useState<Date | null>(null);
  const [exportCustomEndDateForRange, setExportCustomEndDateForRange] = useState<Date | null>(null);
  const [exportIncludeCharts, setExportIncludeCharts] = useState<boolean>(true);
  const [exportIncludeSummarySection, setExportIncludeSummarySection] = useState<boolean>(true);
  const [exportIncludeInvestmentsTableSection, setExportIncludeInvestmentsTableSection] = useState<boolean>(true);
  const [exportIncludeProfitsTableSection, setExportIncludeProfitsTableSection] = useState<boolean>(true);
  const [exportPdfDarkMode, setExportPdfDarkMode] = useState<boolean>(false);
  const [investmentDatePriceInfo, setInvestmentDatePriceInfo] = useState<DatePriceInfo>({ price: null, loading: false, currency: displayCurrency, error: null, source: null });
  const [profitDatePriceInfo, setProfitDatePriceInfo] = useState<DatePriceInfo>({ price: null, loading: false, currency: displayCurrency, error: null, source: null });
  
  // Todos os useRef devem vir aqui
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const internalFileInputRef = useRef<HTMLInputElement>(null);
  const investmentCsvFileInputRef = useRef<HTMLInputElement>(null);
  const backupExcelFileInputRef = useRef<HTMLInputElement>(null);

  // Outros hooks primários
  const isMobile = useIsMobile();
  const isSmallScreen = typeof window !== 'undefined' ? window.innerWidth < 350 : false; // Considerar mover para um useEffect se window não estiver sempre disponível no momento da declaração
  const { toast } = useToast(); // Assumindo que useToast está importado
  const today = startOfDay(new Date()); // Isso não é um hook, pode ficar aqui

  // =================================================================================
  // 2. TODOS OS useEffect E useMemo AQUI
  // =================================================================================
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkScreenSize = () => {
        setUseExportDialog(window.innerWidth < 350);
      };
      checkScreenSize();
      window.addEventListener('resize', checkScreenSize);
      return () => window.removeEventListener('resize', checkScreenSize);
    }
  }, []);

  useEffect(() => {
    if (appData) {
      const newRates = {
        btcToUsd: appData.currentPrice.usd,
        brlToUsd: appData.currentPrice.brl / appData.currentPrice.usd // Evitar divisão por zero se usd for 0
      };
      setCurrentRates(newRates);
      setUsingFallbackRates(appData.isUsingCache || !!appData.currentPrice.isUsingCache);
    } else {
      setCurrentRates({ btcToUsd, brlToUsd });
      // Considerar uma lógica mais robusta para fallback rates se btcToUsd ou brlToUsd forem 0 ou undefined
      setUsingFallbackRates( (btcToUsd === 0 && brlToUsd === 0) || (btcToUsd === 65000 && brlToUsd === 5.2) );
    }
  }, [btcToUsd, brlToUsd, appData]);

  useEffect(() => {
    const savedDisplayCurrency = localStorage.getItem("bitcoinDisplayCurrency");
    if (savedDisplayCurrency) {
      try {
        const parsedCurrency = JSON.parse(savedDisplayCurrency);
        if (parsedCurrency === "USD" || parsedCurrency === "BRL") {
          setDisplayCurrency(parsedCurrency as DisplayCurrency);
        }
      } catch (e) {
        console.error("Erro ao analisar moeda de exibição salva:", e);
      }
    }

    if (reportsDataLoaded) {
      const currentReports = rawCollection?.reports; // Usar rawCollection diretamente
      if (currentReports && Array.isArray(currentReports)) {
        if (currentReports.length > 0) {
          // Somente atualiza se selectedReportIdsForHistoryView ainda não tem nada válido
          // ou se o ID ativo mudou e não está na seleção, e a seleção está vazia
          const activeReportExists = activeReportIdFromHook && currentReports.some(r => r.id === activeReportIdFromHook);
          
          if (selectedReportIdsForHistoryView.length === 0) {
             const initialSelection = activeReportExists 
                ? [activeReportIdFromHook as string] 
                : [currentReports[0].id];
             setSelectedReportIdsForHistoryView(initialSelection);
          } else {
            // Garante que os IDs selecionados ainda existem nos relatórios
            setSelectedReportIdsForHistoryView(prev => prev.filter(id => currentReports.some(r => r.id === id)));
          }
        } else { // Nenhum relatório, limpar seleção
          setSelectedReportIdsForHistoryView([]);
        }
      } else { // currentReports não é um array válido (raro, pois temos guarda acima, mas defensivo)
        setSelectedReportIdsForHistoryView([]);
      }
    }
    // Dependências: Adicionar rawCollection para reagir a mudanças nos relatórios.
    // Evitar selectedReportIdsForHistoryView se possível para não causar loops,
    // a menos que a lógica interna realmente precise reagir a mudanças nela mesma.
  }, [reportsDataLoaded, rawCollection, activeReportIdFromHook]);
  
  // Adicionar aqui quaisquer outros useEffects ou useMemos que existam no componente.
  // Por exemplo:
  // useEffect(() => { /* Lógica para buscar preço do Bitcoin na data do aporte/lucro */ ... }, [investmentDate, profitDate, displayCurrency, reportsDataLoaded]);
  // const processedDataForChart = useMemo(() => { /* ... */ return ... }, [allReportsFromHook, filters]);


  // =================================================================================
  // 3. RETORNOS ANTECIPADOS (GUARD CLAUSES)
  // =================================================================================
  if (!reportsDataLoaded) {
    // O console.log foi removido daqui pois o erro ocorre antes dele
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="h-8 w-8 text-purple-500 animate-spin" />
        <span className="ml-2">Carregando seus dados...</span>
      </div>
    );
  }

  if (!rawCollection || !rawCollection.reports || !Array.isArray(rawCollection.reports)) {
    // O console.log foi removido daqui
    return (
      <div className="flex flex-col justify-center items-center h-64 text-red-500">
        <AlertTriangle className="h-8 w-8 mb-2" />
        <span>Erro ao carregar dados dos relatórios.</span>
        <span>Por favor, tente recarregar a página.</span>
      </div>
    );
  }
  
  // =================================================================================
  // 4. DERIVAÇÃO DE ESTADO E LÓGICA DE RENDERIZAÇÃO PRINCIPAL
  // =================================================================================
  const collection = rawCollection; // Agora é seguro usar rawCollection
  const allReportsFromHook = collection.reports; // Já verificado que é um array

  // O console.log foi removido daqui
  const currentActiveReportObjectFromHook = activeReportIdFromHook && allReportsFromHook
    ? allReportsFromHook.find(report => report.id === activeReportIdFromHook)
    : null;
  
  // ... (O restante do corpo da função do componente: funções de manipulação de eventos, cálculos, JSX)
  // Exemplo:
  // const handleAddInvestment = () => { ... }
  // const investmentsToDisplay = useMemo(() => allReportsFromHook.flatMap(r => r.investments), [allReportsFromHook]);

  // Se houver console.logs que você quer manter para depuração, eles podem vir aqui ou dentro de funções específicas.
  // console.log("[ProfitCalculator] Componente renderizando com dados válidos. Reports:", allReportsFromHook.length);

  // ... (restante do código JSX)
  return (
    <div className="container mx-auto p-0 sm:p-4 md:p-2 lg:p-1 xl:p-0 max-w-full">
      {/* Exemplo de uso de allReportsFromHook, certifique-se que 'investments' existe em cada report */}
      {/* <div>{allReportsFromHook.map(report => <div key={report.id}>{report.name} - {report.investments ? report.investments.length : 0} investments</div>)}</div> */}
      
      {/* O SEU JSX EXISTENTE VAI AQUI */}
      <p>Conteúdo principal do ProfitCalculator aqui...</p>
       {/* Este é um placeholder, substitua pelo seu JSX real */}
    </div>
  );
}

export const dynamic = 'force-dynamic';