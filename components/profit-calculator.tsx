"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
import { useReports } from "@/hooks/use-reports"; // ADICIONAR IMPORT

// Tipos de dados
type CurrencyUnit = "BTC" | "SATS";
type DisplayCurrency = "USD" | "BRL";

interface Investment {
  id: string;
  originalId?: string;
  date: string;
  amount: number;
  unit: CurrencyUnit;
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

export default function ProfitCalculator({ btcToUsd, brlToUsd, appData }: ProfitCalculatorProps) {
  // USAR O HOOK useReports - AJUSTAR DESESTRUTURAÇÃO
  const {
    reports: allReportsFromHook,
    activeReportId: activeReportIdFromHook,
    activeReport: currentActiveReportObjectFromHook,
    isLoaded: reportsDataLoaded,
    addReport,
    selectReport,
    addInvestment,
    addProfitRecord,
    deleteInvestment,
    deleteProfitRecord,
    updateReportData,
    importData,
    deleteAllInvestmentsFromReport, // Adicionar esta função
    deleteAllProfitsFromReport,    // Adicionar esta função
  } = useReports();

  // Manter estados locais que não são gerenciados por useReports ou que são específicos da UI deste componente
  const [activeTab, setActiveTab] = useState<string>("register");
  // selectedMonth e filterMonth são para a UI de Histórico, não diretamente para o relatório ativo de registro
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
  
  // REINTRODUZIR ESTADO PARA SELEÇÃO DE RELATÓRIOS NA ABA HISTÓRICO
  const [selectedReportIdsForHistoryView, setSelectedReportIdsForHistoryView] = useState<string[]>([]);
  
  // Variável para controlar se um toast está sendo exibido
  const [toastDebounce, setToastDebounce] = useState(false);
  
  // Ref para input de arquivo
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const internalFileInputRef = useRef<HTMLInputElement>(null);
  const investmentCsvFileInputRef = useRef<HTMLInputElement>(null);
  const backupExcelFileInputRef = useRef<HTMLInputElement>(null); // NOVO REF

  const isMobile = useIsMobile();
  const isSmallScreen = typeof window !== 'undefined' ? window.innerWidth < 350 : false;

  // Novo estado para o diálogo de duplicações
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{count: number, type: string} | null>(null);

  // Estados para confirmação de adição de registros potencialmente duplicados
  const [pendingInvestment, setPendingInvestment] = useState<Investment | null>(null);
  const [pendingProfit, setPendingProfit] = useState<ProfitRecord | null>(null);
  const [showConfirmDuplicateDialog, setShowConfirmDuplicateDialog] = useState(false);
  const [duplicateConfirmInfo, setDuplicateConfirmInfo] = useState<{
    type: 'investment' | 'profit',
    date: string,
    amount: number,
    unit: CurrencyUnit
  } | null>(null);

  // REINTRODUZIR ESTADOS PARA CRIAÇÃO DE RELATÓRIO
  const [reportNameInput, setReportNameInput] = useState("");
  const [showCreateReportDialog, setShowCreateReportDialog] = useState(false);

  // NOVOS ESTADOS PARA FILTRO DE HISTÓRICO
  const [historyFilterType, setHistoryFilterType] = useState<'month' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);

  // Novos estados para o modal de exportação avançada
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel'); // Novo
  const [showAdvancedExportDialog, setShowAdvancedExportDialog] = useState(false);
  const [exportReportSelectionType, setExportReportSelectionType] = useState<'active' | 'history' | 'manual'>('active');
  const [manualSelectedReportIdsForExport, setManualSelectedReportIdsForExport] = useState<string[]>([]);
  const [exportPeriodSelectionType, setExportPeriodSelectionType] = useState<'all' | 'historyFilter' | 'specificMonth' | 'customRange'>('all');
  const [exportSpecificMonthDate, setExportSpecificMonthDate] = useState<Date | null>(new Date());
  const [exportCustomStartDateForRange, setExportCustomStartDateForRange] = useState<Date | null>(null);
  const [exportCustomEndDateForRange, setExportCustomEndDateForRange] = useState<Date | null>(null);
  const [exportIncludeCharts, setExportIncludeCharts] = useState<boolean>(true);
  const [exportIncludeSummarySection, setExportIncludeSummarySection] = useState<boolean>(true); // Novo
  const [exportIncludeInvestmentsTableSection, setExportIncludeInvestmentsTableSection] = useState<boolean>(true); // Novo
  const [exportIncludeProfitsTableSection, setExportIncludeProfitsTableSection] = useState<boolean>(true); // Novo
  const [exportPdfDarkMode, setExportPdfDarkMode] = useState<boolean>(false); // NOVO estado

  // Verificar tamanho da tela para decidir entre popover e dialog
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkScreenSize = () => {
        setUseExportDialog(window.innerWidth < 350);
      };
      
      // Verificar tamanho inicial
      checkScreenSize();
      
      // Adicionar listener para mudanças de tamanho
      window.addEventListener('resize', checkScreenSize);
      
      // Remover listener ao desmontar
      return () => window.removeEventListener('resize', checkScreenSize);
    }
  }, []);

  // Efeitos para carregar e salvar dados
  useEffect(() => {
    if (appData) {
      const newRates = {
        btcToUsd: appData.currentPrice.usd,
        brlToUsd: appData.currentPrice.brl / appData.currentPrice.usd
      };
      setCurrentRates(newRates);
      setUsingFallbackRates(appData.isUsingCache || !!appData.currentPrice.isUsingCache);
    } else {
      setCurrentRates({ btcToUsd, brlToUsd });
      setUsingFallbackRates(btcToUsd === 65000 && brlToUsd === 5.2);
    }
  }, [btcToUsd, brlToUsd, appData]);

  // REMOVER BLOCO DE useEffect PARA CARREGAMENTO/SALVAMENTO/MIGRAÇÃO DE RELATÓRIOS
  // A LÓGICA DE CARREGAMENTO DE RELATÓRIOS E MIGRAÇÃO AGORA É TRATADA PELO useReports()

  // MANTER useEffect PARA displayCurrency e inicialização de selectedReportIdsForHistoryView
  useEffect(() => {
    const savedDisplayCurrency = localStorage.getItem("bitcoinDisplayCurrency");
    if (savedDisplayCurrency) {
      try {
        setDisplayCurrency(JSON.parse(savedDisplayCurrency) as DisplayCurrency);
      } catch (e) {
        console.error("Erro ao analisar moeda de exibição salva:", e);
      }
    }

    // Inicializar selectedReportIdsForHistoryView com base nos relatórios carregados pelo hook
    if (reportsDataLoaded && allReportsFromHook && allReportsFromHook.length > 0) { // USAR allReportsFromHook
      if (selectedReportIdsForHistoryView.length === 0) {
        const initialHistorySelection = activeReportIdFromHook // USAR activeReportIdFromHook
          ? [activeReportIdFromHook]
          : (allReportsFromHook.length > 0 ? [allReportsFromHook[0].id] : []);
        setSelectedReportIdsForHistoryView(initialHistorySelection);
      } else {
        // Garante que os relatórios selecionados para histórico ainda existam
        setSelectedReportIdsForHistoryView(prev => prev.filter(id => allReportsFromHook.some(r => r.id === id)));
      }
    } else if (reportsDataLoaded && (!allReportsFromHook || allReportsFromHook.length === 0)) {
        setSelectedReportIdsForHistoryView([]);
    }
  }, [reportsDataLoaded, allReportsFromHook, activeReportIdFromHook]); // ATUALIZAR DEPENDÊNCIAS

  // MANTER useEffect PARA SALVAR displayCurrency
  useEffect(() => {
    if (reportsDataLoaded) { // Usar reportsDataLoaded para saber quando salvar
      localStorage.setItem("bitcoinDisplayCurrency", JSON.stringify(displayCurrency));
    }
  }, [displayCurrency, reportsDataLoaded]);
  
  useEffect(() => {
    if (reportsDataLoaded) { // Usar reportsDataLoaded aqui também
      updateRates();
    }
  }, [reportsDataLoaded, appData]);

  // Funções auxiliares
  const updateRates = async () => {
    if (appData) {
      return; // Adicionar return para evitar processamento desnecessário
    } else {
      setLoading(true);
      try {
        const priceData = await getCurrentBitcoinPrice();
        if (priceData) {
          setCurrentRates({
            btcToUsd: priceData.usd,
            brlToUsd: priceData.brl / priceData.usd,
          });
          setUsingFallbackRates(priceData.isUsingCache);
          
          // Evitar múltiplos toasts
          if (!toastDebounce) {
            setToastDebounce(true);
            toast({
              title: "Cotação atualizada",
              description: `Bitcoin: ${priceData.usd.toLocaleString()} USD`,
              variant: "success",
            });
            setTimeout(() => setToastDebounce(false), 1000);
          }
        }
      } catch (error) {
        console.error("Erro ao atualizar cotação:", error);
        
        // Evitar múltiplos toasts também no caso de erro
        if (!toastDebounce) {
          setToastDebounce(true);
          toast({
            title: "Erro ao atualizar cotação",
            description: "Usando as últimas taxas disponíveis.",
            variant: "destructive",
          });
          setTimeout(() => setToastDebounce(false), 1000);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const convertToBtc = (amount: number, unit: CurrencyUnit): number => {
    return unit === "SATS" ? amount / 100000000 : amount;
  };

  const formatCryptoAmount = (amount: number, unit: CurrencyUnit): string => {
    if (unit === "BTC") {
      return `${amount.toFixed(8)} BTC`;
    } else {
      return `${amount.toLocaleString()} SATS`;
    }
  };

  const formatCurrency = (amount: number, currency: string = "USD"): string => {
    if (currency === "USD") {
      return `$ ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (currency === "BRL") {
      return `R$ ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (currency === "BTC") {
      return `${amount.toFixed(8)} BTC`;
    } else {
      return `${amount.toLocaleString()} SATS`;
    }
  };

  // Verifica se uma data é no futuro
  const isFutureDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateToCompare = new Date(date);
    dateToCompare.setHours(0, 0, 0, 0);
    return dateToCompare > today;
  };

  // Função para garantir que a data não seja afetada pelo fuso horário
  const formatDateToUTC = (date: Date): string => {
    // Usar o método getUTC* para obter os valores UTC da data
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1; // Janeiro é 0
    const day = date.getUTCDate();
    
    // Formatar a data como YYYY-MM-DD
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // Funções de adição e remoção
  const handleAddInvestmentButtonClick = () => { // RENOMEADO para evitar conflito
    if (!investmentAmount || isNaN(Number(investmentAmount)) || Number(investmentAmount) <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira um valor válido maior que zero.",
        variant: "destructive",
      });
      return;
    }

    if (isFutureDate(investmentDate)) {
      toast({
        title: "Data inválida",
        description: "Não é possível registrar aportes com data futura.",
        variant: "destructive",
      });
        return;
    }

    let targetReportId = activeReportIdFromHook;
    if (!targetReportId) {
      if (!allReportsFromHook || allReportsFromHook.length === 0) {
         addReport("Relatório Padrão");
         toast({ title: "Relatório Criado", description: "Um 'Relatório Padrão' foi criado. Tente adicionar o aporte novamente.", variant: "default" });
         return;
      } else if (allReportsFromHook.length > 0 && !activeReportIdFromHook) {
        selectReport(allReportsFromHook[0].id);
        targetReportId = allReportsFromHook[0].id;
        toast({ title: "Relatório Ativado", description: `Relatório "${allReportsFromHook[0].name}" ativado. Tente adicionar o aporte novamente.`, variant: "default" });
        return;
      } else {
         toast({ title: "Nenhum relatório ativo", description: "Por favor, selecione um relatório ou crie um novo.", variant: "warning" });
        return;
      }
    }
    
    const reportToUpdate = allReportsFromHook?.find(r => r.id === targetReportId);
    if (!reportToUpdate) {
        toast({ title: "Erro", description: "Relatório alvo não encontrado para adicionar aporte.", variant: "destructive" });
        return;
    }

    const newInvestment: Investment = { // ID será gerado pelo hook addInvestment
      id: Date.now().toString(), // Este ID é temporário para a lógica de duplicados local
      date: formatDateToUTC(investmentDate),
      amount: Number(investmentAmount), unit: investmentUnit,
    };

    const possibleDuplicates = reportToUpdate.investments.filter(inv => 
      inv.date === newInvestment.date && inv.amount === newInvestment.amount && inv.unit === newInvestment.unit
    );

    if (possibleDuplicates.length > 0) {
      setPendingInvestment(newInvestment);
      setDuplicateConfirmInfo({ type: 'investment', date: newInvestment.date, amount: newInvestment.amount, unit: newInvestment.unit });
      setShowConfirmDuplicateDialog(true);
    } else {
      // Passar Omit<Investment, "id"> para confirmAddInvestment
      const { id, ...investmentData } = newInvestment;
      confirmAddInvestment(investmentData);
    }
  };
  
  // Função para confirmar adição do investimento após possível duplicação
  const confirmAddInvestment = (investmentData: Omit<Investment, "id">) => { // Recebe Omit<Investment, "id">
    if (!activeReportIdFromHook) {
      toast({ title: "Erro", description: "Nenhum relatório ativo para adicionar o aporte.", variant: "destructive" });
      return;
    }
    // A função addInvestment do hook já lida com a adição ao relatório ativo
    const success = addInvestment(investmentData); 
    
    if (success) {
      setInvestmentAmount("");
    }
    setPendingInvestment(null);
    setDuplicateConfirmInfo(null);
    setShowConfirmDuplicateDialog(false);
  };

  const handleAddProfitRecordButtonClick = () => { // RENOMEADO para evitar conflito
    if (!profitAmount || isNaN(Number(profitAmount)) || Number(profitAmount) <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira um valor válido maior que zero.",
        variant: "destructive",
      });
      return;
    }

    if (isFutureDate(profitDate)) {
      toast({
        title: "Data inválida",
        description: `Não é possível registrar ${isProfit ? "lucros" : "perdas"} com data futura.`,
        variant: "destructive",
      });
        return;
    }

    let targetReportId = activeReportIdFromHook;
    if (!targetReportId) {
      if (!allReportsFromHook || allReportsFromHook.length === 0) {
         addReport("Relatório Padrão");
         toast({ title: "Relatório Criado", description: "Um 'Relatório Padrão' foi criado. Tente adicionar o registro novamente.", variant: "default" });
         return;
      } else if (allReportsFromHook.length > 0 && !activeReportIdFromHook) {
        selectReport(allReportsFromHook[0].id);
        targetReportId = allReportsFromHook[0].id;
        toast({ title: "Relatório Ativado", description: `Relatório "${allReportsFromHook[0].name}" ativado. Tente adicionar o registro novamente.`, variant: "default" });
        return;
      } else {
         toast({ title: "Nenhum relatório ativo", description: "Por favor, selecione um relatório ou crie um novo.", variant: "warning" });
        return;
      }
    }

    const reportToUpdate = allReportsFromHook?.find(r => r.id === targetReportId);
     if (!reportToUpdate) {
        toast({ title: "Erro", description: "Relatório alvo não encontrado para adicionar lucro/perda.", variant: "destructive" });
        return;
    }

    const newProfit: ProfitRecord = { // ID será gerado pelo hook addProfitRecord
      id: Date.now().toString(), // Este ID é temporário para a lógica de duplicados local
      date: formatDateToUTC(profitDate),
      amount: Number(profitAmount),
      unit: profitUnit,
      isProfit,
    };

    const possibleDuplicates = reportToUpdate.profits.filter(p => 
      p.date === newProfit.date && 
      p.amount === newProfit.amount && 
      p.unit === newProfit.unit &&
      p.isProfit === newProfit.isProfit
    );

    if (possibleDuplicates.length > 0) {
      setPendingProfit(newProfit);
      setDuplicateConfirmInfo({
        type: 'profit',
        date: newProfit.date,
        amount: newProfit.amount,
        unit: newProfit.unit
      });
      setShowConfirmDuplicateDialog(true);
    } else {
      // Passar Omit<ProfitRecord, "id"> para confirmAddProfitRecord
      const { id, ...profitData } = newProfit;
      confirmAddProfitRecord(profitData);
    }
  };
  
  // Função para confirmar adição do lucro/perda após possível duplicação
  const confirmAddProfitRecord = (profitData: Omit<ProfitRecord, "id">) => { // Recebe Omit<ProfitRecord, "id">
    if (!activeReportIdFromHook) {
      toast({ title: "Erro", description: "Nenhum relatório ativo para adicionar o registro.", variant: "destructive" });
      return;
    }
    // A função addProfitRecord do hook já lida com a adição ao relatório ativo
    const success = addProfitRecord(profitData);

    if (success) {
      setProfitAmount("");
    }
    setPendingProfit(null);
    setDuplicateConfirmInfo(null);
    setShowConfirmDuplicateDialog(false);
  };

  const deleteInvestmentLocal = (id: string) => {
    if (!activeReportIdFromHook) { 
      toast({ title: "Erro", description: "Nenhum relatório ativo selecionado.", variant: "destructive" });
      return;
    }
    deleteInvestment(activeReportIdFromHook, id);
  };

  const deleteProfitLocal = (id: string) => {
    if (!activeReportIdFromHook) { 
      toast({ title: "Erro", description: "Nenhum relatório ativo selecionado para exclusão.", variant: "destructive" });
      return;
    }
    deleteProfitRecord(activeReportIdFromHook, id);
  };
  
  const deleteAllInvestments = () => {
    if (!activeReportIdFromHook) { 
      toast({ title: "Erro", description: "Nenhum relatório ativo selecionado para exclusão.", variant: "destructive" });
      setShowDeleteInvestmentsDialog(false);
      return;
    }
    // Chamar a função do hook
    deleteAllInvestmentsFromReport(activeReportIdFromHook);
    setShowDeleteInvestmentsDialog(false);
    // O toast de sucesso já é tratado dentro da função do hook
  };
  
  const deleteAllProfits = () => {
    if (!activeReportIdFromHook) { 
      toast({ title: "Erro", description: "Nenhum relatório ativo selecionado para exclusão.", variant: "destructive" });
      setShowDeleteProfitsDialog(false);
      return;
    }
    // Chamar a função do hook
    deleteAllProfitsFromReport(activeReportIdFromHook);
    setShowDeleteProfitsDialog(false);
    // O toast de sucesso já é tratado dentro da função do hook
  };

  // Funções de navegação
  const goToPreviousMonth = () => {
    setSelectedMonth(subMonths(selectedMonth, 1));
  };

  const goToNextMonth = () => {
    const nextMonth = addMonths(selectedMonth, 1);
    if (nextMonth <= new Date()) {
      setSelectedMonth(nextMonth);
    }
  };

  const isCurrentMonth = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const toggleDisplayCurrency = () => {
    setDisplayCurrency(prev => (prev === "USD" ? "BRL" : "USD"));
  };

  // Função para exportação com opções
  const exportData = async (options: ExportOptions) => {
    setIsExporting(true);
    toast({
      title: "Exportando Dados",
      description: "Aguarde enquanto preparamos seus dados para download...",
      variant: "default",
    });

    try {
      let investmentsToExport: Investment[] = [];
      let profitsToExport: ProfitRecord[] = [];
      let reportNameForExport = "Exportação"; // Nome padrão
      let allSelectedReports: Report[] = [];


      // 1. SELECIONAR DADOS DO(S) RELATÓRIO(S)
      if (options.reportSelectionType === 'active') {
        if (!currentActiveReportObjectFromHook) {
          toast({
            title: "Nenhum Relatório Ativo",
            description: "Por favor, selecione ou crie um relatório para exportar os dados.",
            variant: "destructive",
          });
          setIsExporting(false);
          return;
        }
        allSelectedReports = [currentActiveReportObjectFromHook];
        reportNameForExport = currentActiveReportObjectFromHook.name;
      } else if (options.reportSelectionType === 'manual' && options.manualSelectedReportIds && allReportsFromHook) {
        allSelectedReports = allReportsFromHook.filter(r => options.manualSelectedReportIds!.includes(r.id));
        reportNameForExport = allSelectedReports.length === 1 ? allSelectedReports[0].name : "Relatórios Selecionados";
      } else if (options.reportSelectionType === 'history' && allReportsFromHook) {
        allSelectedReports = allReportsFromHook.filter(r => selectedReportIdsForHistoryView.includes(r.id));
        reportNameForExport = allSelectedReports.length === 1 ? allSelectedReports[0].name : "Seleção do Histórico";
      }

      if (allSelectedReports.length === 0) {
         toast({
          title: "Nenhum Relatório Selecionado",
          description: "Nenhum relatório corresponde aos critérios de seleção para exportação.",
          variant: "destructive",
        });
        setIsExporting(false);
        return;
      }

      // Consolidar investimentos e lucros de todos os relatórios selecionados
      allSelectedReports.forEach(report => {
        investmentsToExport.push(...(report.investments || []));
        profitsToExport.push(...(report.profits || []));
      });
      
      // 2. FILTRAR DADOS PELO PERÍODO SELECIONADO
      let finalInvestmentsToExport = [...investmentsToExport];
      let finalProfitsToExport = [...profitsToExport];

      if (options.periodSelectionType === 'specificMonth' && options.specificMonthDate) {
        const monthStart = startOfMonth(options.specificMonthDate);
        const monthEnd = endOfMonth(options.specificMonthDate);
        finalInvestmentsToExport = investmentsToExport.filter(inv => {
          try {
            const invDate = parseISODate(inv.date);
            return isWithinInterval(invDate, { start: monthStart, end: monthEnd });
          } catch { return false; }
        });
        finalProfitsToExport = profitsToExport.filter(prof => {
          try {
            const profDate = parseISODate(prof.date);
            return isWithinInterval(profDate, { start: monthStart, end: monthEnd });
          } catch { return false; }
        });
      } else if (options.periodSelectionType === 'customRange' && options.customStartDate && options.customEndDate) {
        const rangeStart = startOfDay(options.customStartDate);
        const rangeEnd = endOfDay(options.customEndDate);
        if (isBefore(rangeEnd, rangeStart)) {
           toast({ title: "Erro no Período", description: "A data final do intervalo não pode ser anterior à data inicial.", variant: "destructive" });
           setIsExporting(false);
           return;
        }
        finalInvestmentsToExport = investmentsToExport.filter(inv => {
          try {
            const invDate = parseISODate(inv.date);
            return isWithinInterval(invDate, { start: rangeStart, end: rangeEnd });
          } catch { return false; }
        });
        finalProfitsToExport = profitsToExport.filter(prof => {
          try {
            const profDate = parseISODate(prof.date);
            return isWithinInterval(profDate, { start: rangeStart, end: rangeEnd });
          } catch { return false; }
        });
      } else if (options.periodSelectionType === 'historyFilter') {
        if (historyFilterType === 'month') {
          const monthStart = startOfMonth(filterMonth);
          const monthEnd = endOfMonth(filterMonth);
          finalInvestmentsToExport = investmentsToExport.filter(inv => { try { const d = parseISODate(inv.date); return isWithinInterval(d, { start: monthStart, end: monthEnd }); } catch { return false; }});
          finalProfitsToExport = profitsToExport.filter(prof => { try { const d = parseISODate(prof.date); return isWithinInterval(d, { start: monthStart, end: monthEnd }); } catch { return false; }});
        } else if (historyFilterType === 'custom' && customStartDate && customEndDate) {
          const histStart = startOfDay(customStartDate);
          const histEnd = endOfDay(customEndDate);
           if (isBefore(histEnd, histStart)) {
             toast({ title: "Erro no Período do Histórico", description: "A data final do filtro de histórico não pode ser anterior à inicial.", variant: "destructive" });
             setIsExporting(false);
             return;
          }
          finalInvestmentsToExport = investmentsToExport.filter(inv => { try { const d = parseISODate(inv.date); return isWithinInterval(d, { start: histStart, end: histEnd }); } catch { return false; }});
          finalProfitsToExport = profitsToExport.filter(prof => { try { const d = parseISODate(prof.date); return isWithinInterval(d, { start: histStart, end: histEnd }); } catch { return false; }});
        }
        // Se 'historyFilter' mas sem filtro ativo no histórico, não faz nada (mantém todos os dados dos relatórios selecionados)
      }
      // Se 'all', finalInvestmentsToExport e finalProfitsToExport já contêm todos os dados dos relatórios selecionados.


      if (finalInvestmentsToExport.length === 0 && finalProfitsToExport.length === 0) {
        toast({
          title: "Nenhum Dado para Exportar",
          description: "Nenhum dado encontrado para as opções de relatório e período selecionadas.",
          variant: "destructive",
        });
        setIsExporting(false);
        return;
      }
      
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "BTC Profit Calculator";
      workbook.lastModifiedBy = "BTC Profit Calculator";
      workbook.created = new Date();
      workbook.modified = new Date();

      // Estilo para cabeçalhos
      const headerStyle: Partial<ExcelJS.Style> = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4F46E5' } // Roxo Tailwind (indigo-600)
        },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
        }
      };

      // Estilo para células de dados
      const dataCellStyle: Partial<ExcelJS.Style> = {
        alignment: { vertical: 'middle' },
        border: {
          top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
        }
      };
      
      const currencyStyle: Partial<ExcelJS.Style> = {
        ...dataCellStyle,
        numFmt: '#,##0.00' // Formato para moeda com 2 casas decimais
      };
      
      const cryptoStyle: Partial<ExcelJS.Style> = {
        ...dataCellStyle,
        numFmt: '#,##0.00000000' // Formato para cripto com 8 casas decimais
      };
      
      const dateStyle: Partial<ExcelJS.Style> = {
        ...dataCellStyle,
        numFmt: 'dd/mm/yyyy hh:mm:ss' // Formato para data e hora
      };

      // Array para manter referência das planilhas ativas (criadas)
      const activeSheets: ExcelJS.Worksheet[] = [];

      if (options.exportFormat === 'excel') {
        // Resumo do Relatório (Excel)
        if (options.includeSummarySection) {
            const summarySheet = workbook.addWorksheet('Resumo do Relatório');
            activeSheets.push(summarySheet); // Adicionar à lista
            summarySheet.columns = [
              { header: 'Métrica', key: 'metric', width: 30 },
              { header: 'Valor', key: 'value', width: 30 }
            ];
            summarySheet.getRow(1).eachCell({ includeEmpty: true }, cell => { cell.style = headerStyle; });

            const totalInvestmentsBtc = finalInvestmentsToExport.reduce((sum, inv) => sum + convertToBtc(inv.amount, inv.unit), 0);
            const totalProfitsBtc = finalProfitsToExport.filter(p => p.isProfit).reduce((sum, prof) => sum + convertToBtc(prof.amount, prof.unit), 0);
            const totalLossesBtc = finalProfitsToExport.filter(p => !p.isProfit).reduce((sum, loss) => sum + convertToBtc(loss.amount, loss.unit), 0);
            const netProfitBtc = totalProfitsBtc - totalLossesBtc;
            const balanceBtc = totalInvestmentsBtc + netProfitBtc;

            // Cálculo das novas métricas
            let primeiroAporteDate: Date | null = null;
            if (finalInvestmentsToExport.length > 0) {
              primeiroAporteDate = finalInvestmentsToExport.reduce((earliest, current) => {
                try {
                  const currentDate = parseISODate(current.date);
                  return (!earliest || currentDate < earliest) ? currentDate : earliest;
                } catch {
                  return earliest; // Ignorar datas inválidas
                }
              }, null as Date | null);
            }

            let diasDeInvestimento = 0;
            if (primeiroAporteDate) {
              // Usar a data final do período selecionado, ou a data atual se período for "todos" ou não especificado
              let dataFinalCalculo = new Date(); 
              if (options.periodSelectionType === 'specificMonth' && options.specificMonthDate) {
                dataFinalCalculo = endOfMonth(options.specificMonthDate);
              } else if (options.periodSelectionType === 'customRange' && options.customEndDate) {
                dataFinalCalculo = endOfDay(options.customEndDate);
              } else if (options.periodSelectionType === 'historyFilter') {
                if (historyFilterType === 'month') {
                  dataFinalCalculo = endOfMonth(filterMonth);
                } else if (historyFilterType === 'custom' && customEndDate) {
                  dataFinalCalculo = endOfDay(customEndDate);
                }
              }
              // Garantir que a data final do cálculo não seja anterior ao primeiro aporte
              if (dataFinalCalculo < primeiroAporteDate) {
                dataFinalCalculo = primeiroAporteDate; 
              }
              diasDeInvestimento = differenceInDays(dataFinalCalculo, primeiroAporteDate);
              if (diasDeInvestimento < 0) diasDeInvestimento = 0; // Evitar dias negativos se algo der errado
            }

            const formatTempoInvestimento = (dias: number): string => {
              if (dias <= 0) return "N/A";
              const anos = Math.floor(dias / 365);
              const meses = Math.floor((dias % 365) / 30);
              const diasRestantes = Math.floor((dias % 365) % 30);
              let str = "";
              if (anos > 0) str += `${anos} ano(s) `;
              if (meses > 0) str += `${meses} mes(es) `;
              if (diasRestantes > 0 || (anos === 0 && meses === 0)) str += `${diasRestantes} dia(s)`;
              return str.trim();
            };

            const roiObtidoPercent = totalInvestmentsBtc > 0 ? (netProfitBtc / totalInvestmentsBtc) * 100 : 0;
            
            let roiAnualizadoPercent = 0;
            if (totalInvestmentsBtc > 0 && diasDeInvestimento > 0 && netProfitBtc !== -totalInvestmentsBtc) { // Evitar log de 0
                const roiDecimal = netProfitBtc / totalInvestmentsBtc;
                if (1 + roiDecimal > 0) { // Evitar raiz de número negativo
                    roiAnualizadoPercent = (Math.pow(1 + roiDecimal, 365 / diasDeInvestimento) - 1) * 100;
                } else {
                    roiAnualizadoPercent = -100; // Perda total
                }
            }

            const mediaDiariaLucroBtc = diasDeInvestimento > 0 ? netProfitBtc / diasDeInvestimento : 0;
            const mediaDiariaRoiPercent = diasDeInvestimento > 0 ? roiObtidoPercent / diasDeInvestimento : 0;

            summarySheet.addRow({ metric: 'Relatório(s) Exportado(s)', value: reportNameForExport });
            summarySheet.addRow({ metric: 'Período Exportado', 
              value: options.periodSelectionType === 'all' ? 'Todos os dados' : 
                    options.periodSelectionType === 'specificMonth' && options.specificMonthDate ? format(options.specificMonthDate, "MMMM yyyy", { locale: ptBR }) :
                    options.periodSelectionType === 'customRange' && options.customStartDate && options.customEndDate ? `${format(options.customStartDate, "dd/MM/yy")} - ${format(options.customEndDate, "dd/MM/yy")}` :
                    options.periodSelectionType === 'historyFilter' ? 
                        (historyFilterType === 'month' ? `Filtro Histórico: ${format(filterMonth, "MMMM yyyy", { locale: ptBR })}` : 
                        (historyFilterType === 'custom' && customStartDate && customEndDate ? `Filtro Histórico: ${format(customStartDate, "dd/MM/yy")} - ${format(customEndDate, "dd/MM/yy")}` : 'Filtro Histórico (Não Especificado)')) 
                    : 'Não Especificado'
            });
            summarySheet.addRow({ metric: 'Total de Investimentos (BTC)', value: totalInvestmentsBtc });
            summarySheet.addRow({ metric: 'Total de Lucros (BTC)', value: totalProfitsBtc });
            summarySheet.addRow({ metric: 'Total de Prejuízos (BTC)', value: totalLossesBtc });
            summarySheet.addRow({ metric: 'Lucro Líquido (BTC)', value: netProfitBtc });
            summarySheet.addRow({ metric: 'Saldo Atual Estimado (BTC)', value: balanceBtc });
            
            if (appData?.currentPrice) {
              summarySheet.addRow({ metric: `Saldo Atual Estimado (${displayCurrency})`, value: formatCurrency(balanceBtc * (displayCurrency === "USD" ? currentRates.btcToUsd : currentRates.btcToUsd * currentRates.brlToUsd), displayCurrency) });
              summarySheet.addRow({ metric: `Preço BTC (${displayCurrency}) Usado`, value: formatCurrency(displayCurrency === "USD" ? currentRates.btcToUsd : currentRates.btcToUsd * currentRates.brlToUsd, displayCurrency) });
            }

            // Adicionando novas métricas
            summarySheet.addRow({ metric: 'Data do Primeiro Aporte', value: primeiroAporteDate ? format(primeiroAporteDate, "dd/MM/yyyy", { locale: ptBR }) : 'N/A' });
            summarySheet.addRow({ metric: 'Tempo Total de Investimento', value: formatTempoInvestimento(diasDeInvestimento) });
            summarySheet.addRow({ metric: 'ROI Obtido Total (%)', value: `${roiObtidoPercent.toFixed(2)}%` });
            summarySheet.addRow({ 
              metric: 'Expectativa de ROI Anualizado Estimado (%)', 
              value: (totalInvestmentsBtc > 0 && diasDeInvestimento > 0) ? `${roiAnualizadoPercent.toFixed(2)}%` : 'N/A' 
            });
            summarySheet.addRow({ 
              metric: 'Média Diária de Lucro (BTC)', 
              value: diasDeInvestimento > 0 ? mediaDiariaLucroBtc.toFixed(8) : 'N/A' 
            });
            summarySheet.addRow({ 
              metric: 'Média Diária de ROI (%)', 
              value: diasDeInvestimento > 0 ? `${mediaDiariaRoiPercent.toFixed(4)}%` : 'N/A' 
            });

            summarySheet.getColumn('value').numFmt = '#,##0.00########';
            summarySheet.getColumn('metric').font = { bold: true };
        }

        // Planilha de Investimentos (Excel)
        if (options.includeInvestmentsTableSection) {
            const investmentSheet = workbook.addWorksheet('Investimentos');
            activeSheets.push(investmentSheet); // Adicionar à lista
            investmentSheet.columns = [
              { header: 'ID', key: 'id', width: 30 },
              { header: 'Data (UTC)', key: 'date', width: 20, style: dateStyle },
              { header: 'Quantidade', key: 'amount', width: 20, style: cryptoStyle }, 
              { header: 'Unidade', key: 'unit', width: 10 },
              { header: 'Equivalente BTC', key: 'btcEquivalent', width: 20, style: cryptoStyle },
              { header: `Valor (${displayCurrency}) no Momento da Compra`, key: 'valueAtPurchase', width: 30, style: currencyStyle },
            ];
            investmentSheet.getRow(1).eachCell({ includeEmpty: true }, cell => { cell.style = headerStyle; });

            finalInvestmentsToExport.forEach(inv => {
              const btcEquivalent = convertToBtc(inv.amount, inv.unit);
              investmentSheet.addRow({
                id: inv.originalId || inv.id, // Alinhado para importação de backup
                date: new Date(parseISODate(inv.date)), // Garantir que seja um objeto Date para o ExcelJS
                amount: inv.amount,
                unit: inv.unit,
                btcEquivalent: btcEquivalent,
                valueAtPurchase: 'N/A'
              });
            });
        }
      
        // Planilha de Lucros/Prejuízos (Excel)
        if (options.includeProfitsTableSection) {
            const profitSheet = workbook.addWorksheet('Lucros e Prejuízos');
            activeSheets.push(profitSheet); // Adicionar à lista
            profitSheet.columns = [
              { header: 'ID', key: 'id', width: 30 },
              { header: 'Data (UTC)', key: 'date', width: 20, style: dateStyle },
              { header: 'Quantidade', key: 'amount', width: 20, style: cryptoStyle }, 
              { header: 'Unidade', key: 'unit', width: 10 },
              { header: 'Tipo', key: 'type', width: 10 },
              { header: 'Equivalente BTC', key: 'btcEquivalent', width: 20, style: cryptoStyle },
              { header: `Valor (${displayCurrency}) no Momento do Registro`, key: 'valueAtRecord', width: 30, style: currencyStyle },
            ];
            profitSheet.getRow(1).eachCell({ includeEmpty: true }, cell => { cell.style = headerStyle; });

            finalProfitsToExport.forEach(prof => {
              const btcEquivalent = convertToBtc(prof.amount, prof.unit);
              profitSheet.addRow({
                id: prof.originalId || prof.id, // Alinhado para importação de backup
                date: new Date(parseISODate(prof.date)), // Garantir que seja um objeto Date para o ExcelJS
                amount: prof.amount,
                unit: prof.unit,
                type: prof.isProfit ? 'Lucro' : 'Prejuízo',
                btcEquivalent: btcEquivalent,
                valueAtRecord: 'N/A'
              });
            });
        }

        // Planilha de Metadados (Excel) - Sempre incluída para Excel
        const metadataSheet = workbook.addWorksheet('Metadados');
        activeSheets.push(metadataSheet); // Adicionar à lista
        metadataSheet.columns = [
          { header: 'Chave', key: 'key', width: 30 },
          { header: 'Valor', key: 'value', width: 50 }
        ];
        metadataSheet.getRow(1).eachCell({ includeEmpty: true }, cell => { cell.style = headerStyle; });

        metadataSheet.addRow({ key: 'Relatório(s) Exportado(s)', value: reportNameForExport });
        // Se for um único relatório e options.reportSelectionType !== 'manual', podemos adicionar o ID
        if (allSelectedReports.length === 1 && options.reportSelectionType !== 'manual' && options.reportSelectionType !== 'history') {
           metadataSheet.addRow({ key: 'ID do Relatório Exportado', value: allSelectedReports[0].id });
        } else if (options.reportSelectionType === 'manual' && options.manualSelectedReportIds) {
           metadataSheet.addRow({ key: 'IDs dos Relatórios Exportados (Manual)', value: options.manualSelectedReportIds.join(', ') });
        } else if (options.reportSelectionType === 'history') {
           metadataSheet.addRow({ key: 'IDs dos Relatórios Exportados (Histórico)', value: selectedReportIdsForHistoryView.join(', ') });
        }
        
        metadataSheet.addRow({ key: 'Data de Exportação', value: format(new Date(), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }) });
        metadataSheet.addRow({ key: 'Moeda de Exibição', value: displayCurrency });
        metadataSheet.addRow({ key: 'Preço BTC/USD na Exportação', value: currentRates.btcToUsd });
        metadataSheet.addRow({ key: 'Preço BRL/USD na Exportação', value: currentRates.brlToUsd });
        metadataSheet.addRow({ key: 'Tipo de Seleção de Relatório', value: options.reportSelectionType });
        metadataSheet.addRow({ key: 'Tipo de Seleção de Período', value: options.periodSelectionType });
        // Ajuste para refletir se os dados são completos ou filtrados com base nas opções
        metadataSheet.addRow({ key: 'Dados Completos Exportados', value: options.periodSelectionType === 'all' ? 'Sim (Todos os Dados do(s) Relatório(s) Selecionado(s))' : 'Não (Dados Filtrados por Período)' });

        if (options.periodSelectionType === 'specificMonth' && options.specificMonthDate) {
          metadataSheet.addRow({ key: 'Mês Específico Exportado', value: format(options.specificMonthDate, "MMMM yyyy", { locale: ptBR }) });
        }
        if (options.periodSelectionType === 'customRange' && options.customStartDate && options.customEndDate) {
          metadataSheet.addRow({ key: 'Intervalo Customizado Início', value: format(options.customStartDate, "dd/MM/yyyy") });
          metadataSheet.addRow({ key: 'Intervalo Customizado Fim', value: format(options.customEndDate, "dd/MM/yyyy") });
        }
        if (options.periodSelectionType === 'historyFilter') {
           metadataSheet.addRow({ key: 'Usou Filtro do Histórico', value: 'Sim' });
           metadataSheet.addRow({ key: 'Tipo Filtro Histórico', value: historyFilterType });
           if(historyFilterType === 'month') metadataSheet.addRow({ key: 'Mês Filtro Histórico', value: format(filterMonth, "MMMM yyyy", { locale: ptBR }) });
           if(historyFilterType === 'custom' && customStartDate && customEndDate) {
              metadataSheet.addRow({ key: 'Início Filtro Histórico', value: format(customStartDate, "dd/MM/yyyy") });
              metadataSheet.addRow({ key: 'Fim Filtro Histórico', value: format(customEndDate, "dd/MM/yyyy") });
           }
        }
        metadataSheet.addRow({ key: 'Total de Investimentos Exportados', value: finalInvestmentsToExport.length });
        metadataSheet.addRow({ key: 'Total de Lucros/Prejuízos Exportados', value: finalProfitsToExport.length });
        metadataSheet.addRow({ key: 'Gráficos Incluídos', value: options.includeCharts ? 'Sim' : 'Não' });

        // Aplicar formatação às colunas das planilhas ativas
        activeSheets.forEach(sheet => {
          sheet.columns.forEach((column: Partial<ExcelJS.Column>) => {
            if (column.key) { // Certifique-se de que a chave existe
              const cells = sheet.getColumn(column.key).values;
              if (cells && cells.length > 1) { // Ignora o cabeçalho
                // Aplica o estilo de dados às células de dados
                sheet.getColumn(column.key).eachCell({ includeEmpty: true }, (cell: ExcelJS.Cell, rowNumber: number) => {
                  if (rowNumber > 1) { // Ignora a linha do cabeçalho
                    cell.style = { ...cell.style, ...dataCellStyle }; // Aplica estilo de dados base
                    
                    let formatString: string | undefined = undefined;

                    if (column.key === 'amount' && (sheet.name === 'Investimentos' || sheet.name === 'Lucros e Prejuízos')) {
                      const unitCell = cell.worksheet.getRow(Number(cell.row)).getCell('unit');
                      const unitRawValue = unitCell?.value;
                      
                      if (unitRawValue === 'SATS') {
                        formatString = '#,##0';
                      } else if (unitRawValue === 'BTC') { 
                        formatString = '#,##0.00000000';
                      } else if (column.style?.numFmt) { 
                        formatString = column.style.numFmt;
                      } else {
                         formatString = '#,##0.00000000'; 
                      }
                    } else if (column.style?.numFmt) { 
                      formatString = column.style.numFmt;
                    }

                    if (formatString !== undefined) { 
                      cell.numFmt = formatString;
                    }
                  }
                });
              }
            }
          });
           // Autoajuste da largura das colunas com base no conteúdo, limitado a um máximo
          sheet.columns.forEach((column: Partial<ExcelJS.Column>) => {
              let maxLength = 0;
              column.eachCell!({ includeEmpty: true }, function(cell: ExcelJS.Cell) {
                  var columnLength = cell.value ? cell.value.toString().length : 10;
                  if (columnLength > maxLength) {
                      maxLength = columnLength;
                  }
              });
              column.width = maxLength < 10 ? 10 : (maxLength > 50 ? 50 : maxLength + 2); // min 10, max 50
          });
        });
        
        // Estilo especial para a primeira coluna (chave) na aba de Metadados e Resumo
        const summarySheetRef = workbook.getWorksheet('Resumo do Relatório');
        if (summarySheetRef && options.includeSummarySection) summarySheetRef.getColumn('metric').font = { bold: true };
        
        const metadataSheetRef = workbook.getWorksheet('Metadados');
        if (metadataSheetRef) metadataSheetRef.getColumn('key').font = { bold: true }; // Metadados sempre tem 'key'

        // LÓGICA DE GRÁFICOS PARA EXCEL
        if (options.exportFormat === 'excel' && options.includeCharts) {
          const monthlyChartDataForExcel = getChartMonthlyData(finalInvestmentsToExport, finalProfitsToExport);
          if (monthlyChartDataForExcel.length > 0) {
            const chartsSheet = workbook.addWorksheet("Gráficos");
            activeSheets.push(chartsSheet); 

            // Função auxiliar para obter a string de formatação de moeda para Excel
            const getExcelCurrencyFormat = (currency: 'USD' | 'BRL' | 'BTC' | 'SATS'): string => {
              if (currency === 'USD') return '"$"#,##0.00';
              if (currency === 'BRL') return '"R$"#,##0.00';
              if (currency === 'BTC') return '#,##0.00000000 "BTC"';
              if (currency === 'SATS') return '#,##0 "SATS"';
              return '#,##0.00';
            };

            // Definir cabeçalhos para a planilha de gráficos
            const excelChartHeaders = [
              { header: 'Mês/Ano', key: 'monthYear', width: 15 }, // Coluna A
              { header: 'Total Investimentos (BTC)', key: 'totalInvestmentsBtc', width: 25, style: { numFmt: getExcelCurrencyFormat('BTC') } }, // B
              { header: 'Lucro Líquido (BTC)', key: 'netProfitsBtc', width: 25, style: { numFmt: getExcelCurrencyFormat('BTC') } }, // C
              { header: `Total Investimentos (${displayCurrency})`, key: 'totalInvestmentsDisplay', width: 25, style: { numFmt: getExcelCurrencyFormat(displayCurrency) } }, // D
              { header: `Lucro Líquido (${displayCurrency})`, key: 'netProfitsDisplay', width: 25, style: { numFmt: getExcelCurrencyFormat(displayCurrency) } }, // E
              { header: `Saldo Acumulado (BTC)`, key: 'balanceBtc', width: 25, style: { numFmt: getExcelCurrencyFormat('BTC') } }, // F
              { header: `Saldo Acumulado (${displayCurrency})`, key: 'balanceDisplay', width: 25, style: { numFmt: getExcelCurrencyFormat(displayCurrency) } }, // G
            ];
            chartsSheet.columns = excelChartHeaders;
            chartsSheet.getRow(1).font = { bold: true };
            chartsSheet.getRow(1).eachCell({ includeEmpty: true }, (cell: ExcelJS.Cell) => { cell.style = headerStyle; });

            let cumulativeBalanceBtc = 0;
            let cumulativeBalanceDisplay = 0;
            const btcToDisplayRate = displayCurrency === 'USD' ? currentRates.btcToUsd : (currentRates.btcToUsd * currentRates.brlToUsd);

            monthlyChartDataForExcel.forEach(data => {
              cumulativeBalanceBtc += data.totalInvestments + data.netProfits;
              cumulativeBalanceDisplay += (data.totalInvestments + data.netProfits) * btcToDisplayRate;
              
              chartsSheet.addRow({
                monthYear: format(parseISODate(data.monthYear + '-01'), "MMM/yyyy", { locale: ptBR }), // Usar format da date-fns
                totalInvestmentsBtc: data.totalInvestments,
                netProfitsBtc: data.netProfits,
                totalInvestmentsDisplay: data.totalInvestments * btcToDisplayRate,
                netProfitsDisplay: data.netProfits * btcToDisplayRate,
                balanceBtc: cumulativeBalanceBtc,
                balanceDisplay: cumulativeBalanceDisplay
              });
            });
            
            // Aplicar estilos de dados às células numéricas na aba Gráficos
            ['B', 'C', 'D', 'E', 'F', 'G'].forEach(colLetter => {
              chartsSheet.getColumn(colLetter).eachCell({ includeEmpty: true }, (cell: ExcelJS.Cell, rowNumber: number) => {
                if (rowNumber > 1) cell.style = { ...cell.style, ...dataCellStyle }; // Aplica estilo de dados base
              });
            });
            chartsSheet.getColumn('A').eachCell({ includeEmpty: true }, (cell: ExcelJS.Cell, rowNumber: number) => {
               if (rowNumber > 1) cell.style = { ...cell.style, ...dataCellStyle };
            });

            const lastDataRowCharts = chartsSheet.rowCount;

            // GRÁFICOS DIRETOS NO EXCEL - Tentativa de adicionar gráficos foi removida devido a incompatibilidade.
            // Os dados para os gráficos estão presentes na aba "Gráficos".
            // A funcionalidade de visualização de gráficos no Excel será reimplementada usando imagens em uma futura atualização.

            if (lastDataRowCharts > 1) {
              // console.log("EXCEL_CHART_LOG: Dados para gráficos existem, mas a renderização direta foi desabilitada.");
              toast({
                title: "Gráficos no Excel (Desabilitado Temporariamente)",
                description: "A renderização de gráficos diretamente no Excel está desabilitada. Os dados brutos para gráficos estão na aba 'Gráficos'.",
                variant: "default",
                duration: 7000,
              });
            }
          }
        }
      } // Fim do if (options.exportFormat === 'excel')

      // LÓGICA PARA PDF
      if (options.exportFormat === 'pdf') {
        toast({
          title: "Iniciando Exportação para PDF",
          description: "Seu relatório PDF está sendo preparado...",
          variant: "default",
        });
        setIsExporting(true);

        try {
          // 1. Coletar todos os dados necessários para o PDF
          const chartDataForPdf = getChartMonthlyData(finalInvestmentsToExport, finalProfitsToExport);
          
          const payload = {
            reportName: reportNameForExport,
            options: {
              ...options,
              specificMonthDate: options.specificMonthDate ? options.specificMonthDate.toISOString() : null,
              customStartDate: options.customStartDate ? options.customStartDate.toISOString() : null,
              customEndDate: options.customEndDate ? options.customEndDate.toISOString() : null,
            }, // As opções de exportação selecionadas pelo usuário, com datas formatadas
            investments: finalInvestmentsToExport,
            profits: finalProfitsToExport,
            summaryData: { // Recalcular ou buscar os dados de resumo se não estiverem já disponíveis
              totalInvestmentsBtc: finalInvestmentsToExport.reduce((sum, inv) => sum + convertToBtc(inv.amount, inv.unit), 0),
              totalProfitsBtc: finalProfitsToExport.filter(p => p.isProfit).reduce((sum, prof) => sum + convertToBtc(prof.amount, prof.unit), 0),
              totalLossesBtc: finalProfitsToExport.filter(p => !p.isProfit).reduce((sum, loss) => sum + convertToBtc(loss.amount, loss.unit), 0),
              netProfitBtc: finalProfitsToExport.filter(p => p.isProfit).reduce((sum, prof) => sum + convertToBtc(prof.amount, prof.unit), 0) - finalProfitsToExport.filter(p => !p.isProfit).reduce((sum, loss) => sum + convertToBtc(loss.amount, loss.unit), 0),
              balanceBtc: finalInvestmentsToExport.reduce((sum, inv) => sum + convertToBtc(inv.amount, inv.unit), 0) + (finalProfitsToExport.filter(p => p.isProfit).reduce((sum, prof) => sum + convertToBtc(prof.amount, prof.unit), 0) - finalProfitsToExport.filter(p => !p.isProfit).reduce((sum, loss) => sum + convertToBtc(loss.amount, loss.unit), 0)),
              currentRates: currentRates,
              displayCurrency: displayCurrency,
            },
            chartData: chartDataForPdf, // Dados agregados para gráficos
            // Adicionar quaisquer outros dados que o template PDF possa precisar
          };

          // 2. Fazer a chamada para a API de backend
          const response = await fetch('/api/export/pdf', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: "Erro desconhecido ao gerar PDF." }));
            throw new Error(errorData.message || `Falha na exportação do PDF: ${response.statusText}`);
          }

          // 3. Lidar com a resposta (download do arquivo PDF)
          const blob = await response.blob();
          const reportNameSanitized = (currentActiveReportObjectFromHook?.name || reportNameForExport).replace(/[^a-z0-9]/gi, '_').toLowerCase();
          const dateSuffix = format(new Date(), "yyyyMMdd_HHmmss");
          const fileName = `btc_calculator_report_${reportNameSanitized}_${dateSuffix}.pdf`;
          
          saveAs(blob, fileName);

          toast({
            title: "Exportação PDF Concluída",
            description: `Seu relatório PDF (${fileName}) foi baixado com sucesso.`,
            variant: "success",
          });

        } catch (error) {
          console.error("Erro ao exportar para PDF:", error);
          toast({
            title: "Erro na Exportação PDF",
            description: error instanceof Error ? error.message : "Ocorreu um problema ao gerar o relatório PDF.",
            variant: "destructive",
          });
        } finally {
          setIsExporting(false);
        }
        return; // Interromper aqui para PDF
      }

      // Somente prosseguir com saveAs se for Excel e houver dados
      if (options.exportFormat === 'excel' && (finalInvestmentsToExport.length > 0 || finalProfitsToExport.length > 0 || activeSheets.find(s => s.name === 'Resumo do Relatório'))) {
        const buffer = await workbook.xlsx.writeBuffer();
        const reportNameSanitized = (currentActiveReportObjectFromHook?.name || reportNameForExport).replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const dateSuffix = format(new Date(), "yyyyMMdd_HHmmss");
        const fileName = `btc_calculator_report_${reportNameSanitized}_${dateSuffix}.xlsx`;
        
        saveAs(new Blob([buffer]), fileName);

        toast({
          title: "Exportação Concluída",
          description: `Seus dados foram exportados com sucesso para ${fileName}`,
          variant: "default",
        });
      }

    } catch (error) {
      console.error("Erro ao exportar dados:", error);
      toast({
        title: "Erro na Exportação",
        description: "Ocorreu um erro ao tentar exportar seus dados. Verifique o console para mais detalhes.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setUseExportDialog(false); // Fecha o diálogo após a exportação
      setShowExportOptions(false); // Fecha o popover/dropdown de opções
    }
  };


  const handleExportButtonClick = () => {
    if (!currentActiveReportObjectFromHook || currentActiveReportObjectFromHook.investments.length === 0 && currentActiveReportObjectFromHook.profits.length === 0) { // USAR currentActiveReportObjectFromHook
       toast({
         title: "Nenhum dado para exportar",
         description: "Adicione investimentos ou lucros/prejuízos antes de exportar.",
         variant: "destructive"
       });
       return;
    }
    // Se houver dados, decide se mostra o diálogo ou o popover
    if (isMobile || isSmallScreen) {
      setUseExportDialog(true);
    } else {
      // Para desktop, pode-se usar um Popover, que é controlado por showExportOptions
      // Se showExportOptions já estiver controlando um popover, não precisa fazer nada aqui
      // ou pode-se abrir um diálogo também por consistência, se preferir.
      // Por ora, vamos assumir que o popover é acionado pelo PopoverTrigger
      // e esta função é mais para o caso mobile/dialog
       setUseExportDialog(true); // Para consistência, usar diálogo em ambos por enquanto
    }
  };

  // Funções de filtro e cálculo para o histórico
  const calculateTotalInvestmentsInMonth = (month: Date): number => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    // MODIFICADO: Usar selectedReportIdsForHistoryView
    if (selectedReportIdsForHistoryView.length === 0) return 0;

    let total = 0;
    allReportsFromHook?.filter(r => selectedReportIdsForHistoryView.includes(r.id)).forEach(report => { // USAR allReportsFromHook
      total += (report.investments || [])
        .filter(investment => { 
          if (!investment || !investment.date) return false;
          try {
            const investmentDate = parseISODate(investment.date);
            if (isNaN(investmentDate.getTime())) return false; 
            return isWithinInterval(investmentDate, { start: monthStart, end: monthEnd });
          } catch (e) { console.error("Erro data investimento calc:", investment.date, e); return false; }
        })
        .reduce((subTotal: number, investment: Investment) => {
          if (investment && typeof investment.amount === 'number' && investment.unit) {
            const btcValue = convertToBtc(investment.amount, investment.unit);
            return subTotal + (isNaN(btcValue) ? 0 : btcValue); 
          }
          return subTotal;
        }, 0);
    });
    return total;
  };

  const calculateTotalProfitsInMonth = (month: Date): number => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    // MODIFICADO: Usar selectedReportIdsForHistoryView
    if (selectedReportIdsForHistoryView.length === 0) return 0;
    
    let total = 0;
    allReportsFromHook?.filter(r => selectedReportIdsForHistoryView.includes(r.id)).forEach(report => { // USAR allReportsFromHook
      total += (report.profits || [])
        .filter(profit => { 
          if (!profit || !profit.date) return false;
          try {
            const profitDate = parseISODate(profit.date);
            if (isNaN(profitDate.getTime())) return false; 
            return isWithinInterval(profitDate, { start: monthStart, end: monthEnd });
          } catch (e) { console.error("Erro data lucro calc:", profit.date, e); return false; }
        })
        .reduce((subTotal: number, profit: ProfitRecord) => {
          if (profit && typeof profit.amount === 'number' && profit.unit) {
            const btcAmount = convertToBtc(profit.amount, profit.unit);
            if (isNaN(btcAmount)) return subTotal;
            return profit.isProfit ? subTotal + btcAmount : subTotal - btcAmount;
          }
          return subTotal;
        }, 0);
    });
    return total;
  };

  const getFilteredInvestments = (): (Investment & { reportName?: string, reportColor?: string })[] => {
    // MODIFICADO: Usar selectedReportIdsForHistoryView
    if (selectedReportIdsForHistoryView.length === 0 || !allReportsFromHook) return []; // USAR allReportsFromHook

    let allInvestments: (Investment & { reportName?: string, reportColor?: string })[] = [];
    allReportsFromHook.filter(r => selectedReportIdsForHistoryView.includes(r.id)).forEach(report => { // USAR allReportsFromHook
      (report.investments || []).forEach(inv => {
        allInvestments.push({ ...inv, reportName: report.name, reportColor: report.color });
      });
    });

    if (!showFilterOptions) return allInvestments;

    if (historyFilterType === 'month') {
      const monthStart = startOfMonth(filterMonth);
      const monthEnd = endOfMonth(filterMonth);
      return allInvestments.filter(investment => {
        try {
          const investmentDate = parseISODate(investment.date);
          if (isNaN(investmentDate.getTime())) return false;
          return isWithinInterval(investmentDate, { start: monthStart, end: monthEnd });
        } catch (e) { console.error("Erro data inv filtro mensal:", investment.date, e); return false; }
      });
    } else if (historyFilterType === 'custom' && customStartDate && customEndDate) {
      const startDate = startOfDay(customStartDate); // startOfDay importado de date-fns
      const endDate = endOfDay(customEndDate);     // endOfDay importado de date-fns
      if (isBefore(endDate, startDate)) { // Validação simples
        // console.warn("Data final anterior à data inicial no filtro personalizado.");
        return []; // Ou mostrar um aviso
      }
      return allInvestments.filter(investment => {
        try {
          const investmentDate = parseISODate(investment.date);
          if (isNaN(investmentDate.getTime())) return false;
          return isWithinInterval(investmentDate, { start: startDate, end: endDate });
        } catch (e) { console.error("Erro data inv filtro custom:", investment.date, e); return false; }
      });
    } else if (historyFilterType === 'custom') {
      // Se o filtro é customizado mas as datas não estão completas, retorna vazio para evitar confusão.
      // Poderia também retornar baseInvestments se a intenção for mostrar tudo até que o filtro esteja pronto.
      return []; 
    }
    return allInvestments; // Fallback se nenhum filtro específico se aplicar
  };

  const getFilteredProfits = (): (ProfitRecord & { reportName?: string, reportColor?: string })[] => {
    // MODIFICADO: Usar selectedReportIdsForHistoryView
    if (selectedReportIdsForHistoryView.length === 0 || !allReportsFromHook) return []; // USAR allReportsFromHook

    let allProfits: (ProfitRecord & { reportName?: string, reportColor?: string })[] = [];
    allReportsFromHook.filter(r => selectedReportIdsForHistoryView.includes(r.id)).forEach(report => { // USAR allReportsFromHook
      (report.profits || []).forEach(prof => {
        allProfits.push({ ...prof, reportName: report.name, reportColor: report.color });
      });
    });
    
    if (!showFilterOptions) return allProfits;

    if (historyFilterType === 'month') {
      const monthStart = startOfMonth(filterMonth);
      const monthEnd = endOfMonth(filterMonth);
      return allProfits.filter(profit => {
        try {
          const profitDate = parseISODate(profit.date);
          if (isNaN(profitDate.getTime())) return false;
          return isWithinInterval(profitDate, { start: monthStart, end: monthEnd });
        } catch (e) { console.error("Erro data lucro filtro mensal:", profit.date, e); return false; }
      });
    } else if (historyFilterType === 'custom' && customStartDate && customEndDate) {
      const startDate = startOfDay(customStartDate);
      const endDate = endOfDay(customEndDate);
      if (isBefore(endDate, startDate)) {
        // console.warn("Data final anterior à data inicial no filtro personalizado.");
        return [];
      }
      return allProfits.filter(profit => {
        try {
          const profitDate = parseISODate(profit.date);
          if (isNaN(profitDate.getTime())) return false;
          return isWithinInterval(profitDate, { start: startDate, end: endDate });
        } catch (e) { console.error("Erro data lucro filtro custom:", profit.date, e); return false; }
      });
    } else if (historyFilterType === 'custom') {
      return [];
    }
    return allProfits;
  };

  // Função para formatar valor baseado na moeda selecionada
  const formatBtcValueInCurrency = (btcValue: number): string => {
    if (displayCurrency === "USD") {
      return `$${(btcValue * currentRates.btcToUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      return `R$${(btcValue * currentRates.btcToUsd * currentRates.brlToUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  // Conteúdo das opções de exportação
  const ExportOptionsContent = () => (
    <>
      <div className="p-2 bg-purple-900/30 text-xs text-center text-gray-300 border-b border-purple-700/50">
        Selecione o tipo de exportação
      </div>
      <div className="p-0">
        <button
          className="w-full text-left px-4 py-3 hover:bg-purple-900/20 flex flex-col transition-colors"
          onClick={() => {
            // Este botão agora abre o diálogo avançado
            setShowAdvancedExportDialog(true);
            if (typeof setShowExportOptions === 'function') { // Se setShowExportOptions for para fechar um popover
              setShowExportOptions(false);
            }
          }}
        >
          <div className="font-semibold">Opções Avançadas de Exportação...</div>
          <div className="text-xs text-gray-400">Selecione relatórios, períodos e mais.</div>
        </button>

        <button
          className="w-full text-left px-4 py-3 hover:bg-purple-900/20 flex items-center transition-colors border-t border-purple-900/30"
          onClick={() => {
            const opts: ExportOptions = {
              exportFormat: 'excel', // Novo
              reportSelectionType: 'history', 
              manualSelectedReportIds: undefined, 
              periodSelectionType: 'historyFilter', 
              specificMonthDate: null,
              customStartDate: null,
              customEndDate: null,
              includeCharts: exportIncludeCharts, 
              includeSummarySection: exportIncludeSummarySection, // Novo
              includeInvestmentsTableSection: exportIncludeInvestmentsTableSection, // Novo
              includeProfitsTableSection: exportIncludeProfitsTableSection, // Novo
            };
            exportData(opts);
            if (typeof setShowExportOptions === 'function') { setShowExportOptions(false); }
          }}
        >
          <FileType className="mr-2 h-4 w-4 text-purple-400" /> Exportar dados filtrados (aba Histórico)
        </button>
        
        <button
          className="w-full text-left px-4 py-3 hover:bg-purple-900/20 flex items-center transition-colors border-t border-purple-900/30"
          onClick={() => {
            exportData({ 
              exportFormat: 'excel', // Novo
              reportSelectionType: 'active',
              periodSelectionType: 'all',
              includeCharts: exportIncludeCharts,
              includeSummarySection: exportIncludeSummarySection, // Novo
              includeInvestmentsTableSection: exportIncludeInvestmentsTableSection, // Novo
              includeProfitsTableSection: exportIncludeProfitsTableSection, // Novo
            });
            if (typeof setShowExportOptions === 'function') { setShowExportOptions(false); }
          }}
        >
          <Download className="mr-2 h-4 w-4 text-purple-400" /> Exportar todos os dados (relatório ativo)
        </button>
      </div>
    </>
  );

  // Função auxiliar para parse de CSV com suporte a campos entre aspas
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let currentValue = '';
    let insideQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (insideQuotes && i + 1 < line.length && line[i + 1] === '"') {
          // Aspas escapadas dentro de aspas (duplas aspas)
          currentValue += '"';
          i++; // Pular o próximo caractere
        } else {
          // Alternar estado das aspas
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        // Fim do valor atual
        result.push(currentValue);
        currentValue = '';
      } else {
        // Caractere comum, adicionar ao valor atual
        currentValue += char;
      }
    }
    
    // Adicionar o último valor
    result.push(currentValue);
    
    return result;
  };

  // Função auxiliar para parse de CSV com suporte a campos entre aspas
  const parseCSV = (text: string): Array<Record<string, string>> => {
    // Dividir por linhas (respeitando diferentes sistemas operacionais)
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    
    if (lines.length === 0) return [];
    
    // Primeira linha contém os cabeçalhos
    const headers = parseCSVLine(lines[0]);
    
    // Processar as demais linhas
    const records: Array<Record<string, string>> = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = parseCSVLine(line);
      
      // Verificar se temos o número correto de valores
      if (values.length !== headers.length) {
        console.warn(`Linha ${i+1}: número incorreto de valores (${values.length}) comparado com cabeçalhos (${headers.length})`);
        continue; // Pular linha com número incorreto de valores
      }
      
      // Criar objeto de registro
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        record[header] = values[index];
      });
      
      records.push(record);
    }
    
    return records;
  };

  // Função para importar dados CSV
  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    if (!activeReportIdFromHook) { // USAR activeReportIdFromHook
      toast({
        title: "Importação CSV Falhou",
        description: "Nenhum relatório ativo. Por favor, selecione ou crie um relatório antes de importar.",
        variant: "destructive",
      });
      if (csvFileInputRef.current) csvFileInputRef.current.value = '';
      return;
    }

    const currentActiveReportForCsv = allReportsFromHook?.find(r => r.id === activeReportIdFromHook); // USAR allReportsFromHook e activeReportIdFromHook
    if (!currentActiveReportForCsv) {
      toast({ title: "Erro na Importação", description: "Não foi possível encontrar o relatório ativo.", variant: "destructive" });
      if (csvFileInputRef.current) csvFileInputRef.current.value = '';
      return;
    }

    const file = event.target.files[0];
    setIsImporting(true);
    setImportStats(null);
    setImportType("csv");

    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          if (!e.target || !e.target.result) {
            throw new Error("Falha ao ler o arquivo CSV");
          }
          
          const csvText = e.target.result as string;
          
          // Usar o parser CSV robusto
          const records = parseCSV(csvText);
          
          if (records.length === 0) {
            throw new Error("O arquivo CSV não contém dados válidos");
          }
          
          // Extrair cabeçalhos do primeiro registro
          const headers = Object.keys(records[0]);
          
          const totalRows = records.length;
          
          console.log("CSV processado:", records[0]); // Debug
          
          // Processar registros usando a função comum modificada
          // MODIFICADO: Passar currentActiveReportForCsv.profits
          const { newProfits, successCount, errorCount, duplicatedCount } = 
            processTradeRecords(headers, records, currentActiveReportForCsv.profits);
          
          // Adicionar os novos registros de lucro
          if (newProfits.length > 0) {
            // MODIFICADO: Adicionar lucros ao activeReport
            newProfits.forEach(profit => {
              const {id, ...profitData} = profit; // Remover ID temporário se houver
              addProfitRecord(profitData); // USAR hook addProfitRecord
            });
            
            if (!toastDebounce) {
              setToastDebounce(true);
              toast({
                title: "Importação CSV concluída",
                description: `Foram importados ${successCount} registros de lucro/perda com sucesso.`,
                variant: "success",
              });
              setTimeout(() => setToastDebounce(false), 500);
            }
          } else if (duplicatedCount > 0) {
            // Não mostrar toast quando só houve duplicações
            setDuplicateInfo({
              count: duplicatedCount,
              type: 'lucros/perdas'
            });
            setShowDuplicateDialog(true);
          } else {
            toast({
              title: "Nenhum registro importado",
              description: "Não foi possível encontrar registros válidos no arquivo CSV.",
              variant: "destructive",
            });
          }
          
          // Atualizar estatísticas
          setImportStats({
            total: totalRows,
            success: successCount,
            error: errorCount,
            duplicated: duplicatedCount
          });
          
          // Mostrar diálogo de duplicações apenas se houver duplicações
          if (duplicatedCount > 0) {
            setDuplicateInfo({
              count: duplicatedCount,
              type: 'lucros/perdas'
            });
            setShowDuplicateDialog(true);
          }
          
        } catch (error) {
          console.error("Erro ao processar o arquivo CSV:", error);
          toast({
            title: "Erro na importação CSV",
            description: error instanceof Error ? error.message : "Falha ao processar o arquivo CSV.",
            variant: "destructive",
          });
        } finally {
          setIsImporting(false);
          setImportType(null);
          if (csvFileInputRef.current) {
            csvFileInputRef.current.value = '';
          }
        }
      };
      
      reader.onerror = () => {
        setIsImporting(false);
        setImportType(null);
        toast({
          title: "Erro na leitura",
          description: "Não foi possível ler o arquivo CSV selecionado.",
          variant: "destructive",
        });
        if (csvFileInputRef.current) {
          csvFileInputRef.current.value = '';
        }
      };
      
      reader.readAsText(file);
      
    } catch (error) {
      setIsImporting(false);
      setImportType(null);
      console.error("Erro ao importar CSV:", error);
      toast({
        title: "Erro na importação CSV",
        description: "Ocorreu um erro ao tentar importar o arquivo CSV.",
        variant: "destructive",
      });
      if (csvFileInputRef.current) {
        csvFileInputRef.current.value = '';
      }
    }
  };

  // Funções para acionar os inputs de arquivo
  const triggerExcelFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const triggerCSVFileInput = () => {
    if (csvFileInputRef.current) {
      csvFileInputRef.current.click();
    }
  };
  
  const triggerInternalFileInput = () => {
    internalFileInputRef.current?.click();
  };
  
  const triggerInvestmentCsvFileInput = () => {
    investmentCsvFileInputRef.current?.click();
  };

  // NOVA FUNÇÃO PARA DISPARAR INPUT DE BACKUP EXCEL
  const triggerBackupExcelFileInput = () => {
    backupExcelFileInputRef.current?.click();
  };

  // Função para processar os registros (comum a Excel e CSV)
  const processTradeRecords = (
    headers: string[], 
    records: Array<Record<string, any>>, 
    existingReportProfits: ProfitRecord[], // MODIFICADO: Adicionado parâmetro
    headerIndexMap?: Record<string, number>
  ): { newProfits: ProfitRecord[], successCount: number, errorCount: number, duplicatedCount: number } => {
    // Lista de cabeçalhos requeridos
    const requiredHeaders = [
      "id", "type", "side", "openingFee", "closingFee", "maintenanceMargin", 
      "quantity", "margin", "leverage", "price", "liquidation", "stoploss", 
      "takeprofit", "exitPrice", "pl", "creationTs", "marketFilledTs", 
      "closedTs", "entryPrice", "entryMargin", "open", "running", 
      "canceled", "closed", "sumFundingFees"
    ];
    
    // Verificar se todos os cabeçalhos requeridos estão presentes
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    
    if (missingHeaders.length > 0) {
      throw new Error(`Cabeçalhos obrigatórios ausentes: ${missingHeaders.join(", ")}`);
    }
    
    // Iniciar processamento dos registros
    const newProfits: ProfitRecord[] = [];
    let successCount = 0;
    let errorCount = 0;
    let duplicatedCount = 0;
    
    // Obter conjunto de IDs existentes para verificar duplicações
    // MODIFICADO: Usar o parâmetro existingReportProfits
    const existingProfitIds = new Set(existingReportProfits.map(profit => profit.originalId || profit.id));
    
    // Processar cada registro
    records.forEach((record, index) => {
      try {
        // Extrair os dados necessários - modo diferente para Excel vs CSV
        let originalId, closedTs, pl, openingFee, closingFee, sumFundingFees, closedValue;
        
        if (headerIndexMap) {
          // Para Excel (usando headerIndexMap)
          const row = record as any; // row do ExcelJS
          originalId = row.getCell(headerIndexMap["id"]).value?.toString();
          closedTs = row.getCell(headerIndexMap["closedTs"]).value;
          pl = parseFloat(row.getCell(headerIndexMap["pl"]).value?.toString() || "0");
          openingFee = parseFloat(row.getCell(headerIndexMap["openingFee"]).value?.toString() || "0");
          closingFee = parseFloat(row.getCell(headerIndexMap["closingFee"]).value?.toString() || "0");
          sumFundingFees = parseFloat(row.getCell(headerIndexMap["sumFundingFees"]).value?.toString() || "0");
          closedValue = row.getCell(headerIndexMap["closed"]).value;
        } else {
          // Para CSV (usando objeto record)
          originalId = record["id"]?.toString();
          closedTs = record["closedTs"];
          
          // Tratar valores nulos ou string "null"
          const plStr = (record["pl"]?.toString() || "0").replace(/^"(.*)"$/, "$1");
          const openingFeeStr = (record["openingFee"]?.toString() || "0").replace(/^"(.*)"$/, "$1");
          const closingFeeStr = (record["closingFee"]?.toString() || "0").replace(/^"(.*)"$/, "$1");
          const sumFundingFeesStr = (record["sumFundingFees"]?.toString() || "0").replace(/^"(.*)"$/, "$1");
          const closedStr = (record["closed"]?.toString() || "false").replace(/^"(.*)"$/, "$1");
          
          pl = plStr === "null" ? 0 : parseFloat(plStr);
          openingFee = openingFeeStr === "null" ? 0 : parseFloat(openingFeeStr);
          closingFee = closingFeeStr === "null" ? 0 : parseFloat(closingFeeStr);
          sumFundingFees = sumFundingFeesStr === "null" ? 0 : parseFloat(sumFundingFeesStr);
          closedValue = closedStr;
        }
        
        // Verificar se o ID original já existe no sistema
        if (originalId && existingProfitIds.has(originalId)) {
          duplicatedCount++;
          return; // Pular este registro, pois já existe
        }
        
        // Verificar se a operação foi fechada
        const isClosed = closedValue === true || closedValue === "true" || closedValue === 1 || closedValue === "1";
        
        // Só processar operações fechadas
        if (!isClosed || !closedTs || closedTs === "null") {
          errorCount++;
          return; // Skip para próximo registro
        }
        
        // Extrair data
        let profitDate: Date;
        
        if (typeof closedTs === 'number') {
          // Se for timestamp em milissegundos
          profitDate = new Date(closedTs);
        } else if (closedTs instanceof Date) {
          profitDate = closedTs;
        } else {
          // Tratar o formato GMT específico
          const tsString = closedTs.toString().replace(/^"(.*)"$/, "$1");
          
          try {
            if (tsString.includes('GMT')) {
              // Formato como "Wed Apr 30 2025 11:42:47 GMT-0300 (Brasilia Standard Time)"
              const dateParts = tsString.split(' ');
              if (dateParts.length >= 5) {
                // Reconstruir a string de data sem a parte do timezone em parênteses
                const cleanDateStr = dateParts.slice(0, 5).join(' ');
                profitDate = new Date(cleanDateStr);
              } else {
                profitDate = new Date(tsString);
              }
            } else {
              // Tentar formato padrão
              profitDate = new Date(tsString);
            }
            
            // Se ainda não for válida, tentar formatos alternativos
            if (isNaN(profitDate.getTime())) {
              console.warn(`Formato de data não reconhecido: ${tsString}, tentando analisar manualmente...`);
              // Tentar um parser manual se necessário
              if (tsString.includes('/')) {
                const [day, month, year] = tsString.split('/').map(Number);
                profitDate = new Date(year, month - 1, day);
              }
            }
          } catch (e) {
            console.error(`Erro ao converter data: ${tsString}`, e);
            profitDate = new Date(); // Usar data atual como fallback
          }
        }
        
        // Verificar se a data é válida
        if (isNaN(profitDate.getTime())) {
          console.error(`Data inválida: ${closedTs}, usando data atual como fallback`);
          profitDate = new Date(); // Usar data atual como fallback
        }
        
        // Os valores já estão em SATS, não precisam de conversão adicional
        // Apenas arredondar para garantir valores inteiros
        const profitSats = Math.round(pl);
        const feesSats = Math.round(openingFee) + Math.round(closingFee) + Math.round(sumFundingFees);
        
        // Calcular valor líquido (lucro - taxas)
        const netProfitSats = profitSats - feesSats;
        
        // Criar registro de lucro/perda
        const newProfit: ProfitRecord = {
          id: Date.now().toString() + index, // ID único local
          originalId: originalId, // Salvar ID original da operação
          date: "2024-01-01", // TESTE: Data Hardcoded para diagnóstico
          amount: Math.abs(netProfitSats), // Valor absoluto
          unit: "SATS", // Em satoshis
          isProfit: netProfitSats >= 0, // Lucro se positivo
        };
        
        newProfits.push(newProfit);
        successCount++;
      } catch (error) {
        console.error(`Erro ao processar registro ${index}:`, error);
        errorCount++;
      }
    });
    
    return { newProfits, successCount, errorCount, duplicatedCount };
  };

  // Componente para as opções de importação
  const ImportOptions = () => {
    const CsvOperacoesButton = (
      <>
        <input type="file" accept=".csv" onChange={handleImportCSV} ref={csvFileInputRef} className="hidden" />
        <Button variant="outline" className="w-full justify-center bg-black/30 border-purple-700/50 hover:bg-purple-900/20" onClick={triggerCSVFileInput} disabled={isImporting}>
          {isImporting && importType === "csv" ? ( <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Importando...</> ) : ( <><FileType className="mr-2 h-4 w-4" />Importar CSV de Operações</> )}
        </Button>
      </>
    );

    const CsvAportesButton = (
      <>
        <input type="file" accept=".csv" onChange={handleImportInvestmentCSV} ref={investmentCsvFileInputRef} className="hidden" />
        <Button variant="outline" className="w-full justify-center bg-black/30 border-purple-700/50 hover:bg-purple-900/20" onClick={triggerInvestmentCsvFileInput} disabled={isImporting}>
          {isImporting && importType === "investment-csv" ? ( <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Importando...</> ) : ( <><FileType className="mr-2 h-4 w-4" />Importar CSV de Aportes</> )}
        </Button>
      </>
    );

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {isMobile ? (
            <>
              {CsvAportesButton}      {/* Aportes primeiro no mobile */}
              {CsvOperacoesButton}    {/* Operações depois no mobile */}
            </>
          ) : (
            <>
              {CsvOperacoesButton}    {/* Ordem normal no desktop */}
              {CsvAportesButton}
            </>
          )}
          
          {/* Input para arquivo de backup (Excel) */}
          <input
            type="file"
            accept=".xlsx"
            onChange={handleImportInternalData}
            ref={internalFileInputRef}
            className="hidden"
          />
          <Button 
            variant="outline"
            className="w-full justify-center bg-black/30 border-purple-700/50 hover:bg-purple-900/20 sm:col-span-2" 
            onClick={triggerInternalFileInput}
            disabled={isImporting}
          >
            {isImporting && importType === "internal" ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Importar Backup (Excel)
              </>
            )}
          </Button>
        </div>
        
        {/* Exibir estatísticas de importação para CSV de operações */}
        {importStats && importType === "csv" && (
          <div className="mt-3 p-3 text-xs rounded bg-purple-900/20 border border-purple-700/40">
            <div className="flex justify-between mb-1">
              <span>Total processado:</span>
              <span className="font-medium">{importStats.total}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Importados com sucesso:</span>
              <span className="font-medium text-green-500">{importStats.success}</span>
            </div>
            {importStats.duplicated && importStats.duplicated > 0 && (
              <div className="flex justify-between mb-1">
                <span>Registros duplicados ignorados:</span>
                <span className="font-medium text-yellow-500">{importStats.duplicated}</span>
              </div>
            )}
            {importStats.error > 0 && (
              <div className="flex justify-between">
                <span>Falhas:</span>
                <span className="font-medium text-red-500">{importStats.error}</span>
              </div>
            )}
          </div>
        )}
        
        {/* Exibir estatísticas de importação para CSV de aportes */}
        {importStats && importType === "investment-csv" && (
          <div className="mt-3 p-3 text-xs rounded bg-purple-900/20 border border-purple-700/40">
            <div className="flex justify-between mb-1">
              <span>Total processado:</span>
              <span className="font-medium">{importStats.total}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Importados com sucesso:</span>
              <span className="font-medium text-green-500">{importStats.success}</span>
            </div>
            {importStats.duplicated && importStats.duplicated > 0 && (
              <div className="flex justify-between mb-1">
                <span>Registros duplicados ignorados:</span>
                <span className="font-medium text-yellow-500">{importStats.duplicated}</span>
              </div>
            )}
            {importStats.error > 0 && (
              <div className="flex justify-between">
                <span>Falhas:</span>
                <span className="font-medium text-red-500">{importStats.error}</span>
              </div>
            )}
          </div>
        )}
        
        {/* Exibir estatísticas de importação para arquivo de backup */}
        {importStats && importType === "internal" && (
          <div className="mt-3 p-3 text-xs rounded bg-purple-900/20 border border-purple-700/40">
            <div className="flex justify-between mb-1">
              <span>Total processado:</span>
              <span className="font-medium">{importStats.total}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Importados com sucesso:</span>
              <span className="font-medium text-green-500">{importStats.success}</span>
            </div>
            {importStats.duplicated && importStats.duplicated > 0 && (
              <div className="flex justify-between mb-1">
                <span>Registros duplicados ignorados:</span>
                <span className="font-medium text-yellow-500">{importStats.duplicated}</span>
              </div>
            )}
            {importStats.error > 0 && (
              <div className="flex justify-between">
                <span>Falhas:</span>
                <span className="font-medium text-red-500">{importStats.error}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      
      if (!activeReportIdFromHook) { // USAR activeReportIdFromHook
        toast({
          title: "Importação Excel Falhou",
          description: "Nenhum relatório ativo. Por favor, selecione ou crie um relatório antes de importar.",
          variant: "destructive",
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      
      const currentActiveReportForExcel = allReportsFromHook?.find(r => r.id === activeReportIdFromHook); // USAR allReportsFromHook e activeReportIdFromHook
      if (!currentActiveReportForExcel) {
        toast({ title: "Erro na Importação", description: "Não foi possível encontrar o relatório ativo.", variant: "destructive" });
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      
      setIsImporting(true);
      setImportType("excel");
      
      const file = event.target.files[0];
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        if (!e.target) return;
        
        try {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(e.target.result as ArrayBuffer);
          
          // Assumindo que os dados estão na primeira planilha
          const worksheet = workbook.getWorksheet(1);
          
          if (!worksheet) {
            toast({
              title: "Erro ao importar",
              description: "Não foi possível encontrar dados na planilha.",
              variant: "destructive",
            });
            setIsImporting(false);
            event.target.value = '';
            return;
          }
          
          const headers: string[] = [];
          const records: Record<string, any>[] = [];
          
          // Obter os cabeçalhos (primeira linha)
          worksheet.getRow(1).eachCell((cell, colNumber) => {
            headers[colNumber - 1] = cell.value?.toString() || `Coluna${colNumber}`;
          });
          
          // Obter os dados (linhas seguintes)
          let rowCount = 0;
          let successCount = 0;
          let errorCount = 0;
          let duplicatedCount = 0;
          
          worksheet.eachRow((row, rowNumber) => {
            // Pular a linha de cabeçalho
            if (rowNumber === 1) return;
            
            const record: Record<string, any> = {};
            
            row.eachCell((cell, colNumber) => {
              record[headers[colNumber - 1]] = cell.value;
            });
            
            records.push(record);
            rowCount++;
          });
          
          // Processar os registros
          const { newProfits, successCount: sCount, errorCount: eCount, duplicatedCount: dCount } = processTradeRecords(headers, records, currentActiveReportForExcel.profits);
          
          successCount = sCount;
          errorCount = eCount;
          duplicatedCount = dCount;
          
          // Adicionar os novos registros
          if (newProfits.length > 0) {
            // MODIFICADO: Adicionar lucros ao activeReport e remover localStorage antigo
            newProfits.forEach(profit => {
              const {id, ...profitData} = profit; // Remover ID temporário se houver
              addProfitRecord(profitData); // USAR hook addProfitRecord
            });
            // localStorage.setItem("bitcoinProfits", JSON.stringify(combinedProfits)); // REMOVIDO
            
            toast({
              title: "Importação concluída",
              description: `${successCount} registros importados com sucesso${
                duplicatedCount > 0 ? `, ${duplicatedCount} duplicados ignorados` : ''
              }${
                errorCount > 0 ? ` e ${errorCount} falhas` : ''
              }.`,
              variant: errorCount > 0 ? "destructive" : "default",
            });
            
            // Se tiver registros duplicados, mostrar diálogo informativo
            if (duplicatedCount > 0) {
              setDuplicateInfo({
                count: duplicatedCount,
                type: 'registros de operações'
              });
              setShowDuplicateDialog(true);
            }
          } else {
            toast({
              title: "Nenhum registro importado",
              description: "Não foi possível extrair registros válidos do arquivo Excel.",
              variant: "destructive",
            });
          }
          
          setImportStats({
            total: rowCount,
            success: successCount,
            error: errorCount,
            duplicated: duplicatedCount
          });
        } catch (error) {
          console.error("Erro ao processar arquivo Excel:", error);
          toast({
            title: "Erro na importação",
            description: "Ocorreu um erro ao processar o arquivo Excel.",
            variant: "destructive",
          });
        } finally {
          setIsImporting(false);
          // Limpar o input para permitir selecionar o mesmo arquivo novamente
          event.target.value = '';
        }
      };
      
      reader.onerror = () => {
        toast({
          title: "Erro na leitura do arquivo",
          description: "Não foi possível ler o arquivo Excel.",
          variant: "destructive",
        });
        setIsImporting(false);
        event.target.value = '';
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("Erro na importação Excel:", error);
      toast({
        title: "Erro na importação",
        description: "Ocorreu um erro ao importar o arquivo Excel.",
        variant: "destructive",
      });
      setIsImporting(false);
      event.target.value = '';
    }
  };

  // Função para importar dados internos de um arquivo Excel gerado pelo sistema
  const handleImportInternalData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    
    if (!activeReportIdFromHook) { // USAR activeReportIdFromHook
      toast({
        title: "Importação Falhou",
        description: "Nenhum relatório ativo. Por favor, selecione ou crie um relatório antes de importar o backup.",
        variant: "destructive",
      });
      if (internalFileInputRef.current) internalFileInputRef.current.value = '';
      return;
    }
    
    const file = event.target.files[0];
    setIsImporting(true);
    setImportStats(null);
    setImportType("internal");
    
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          if (!e.target || !e.target.result) {
            throw new Error("Falha ao ler o arquivo");
          }
          
          const buffer = e.target.result;
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer as ArrayBuffer);
          
          // Buscar a planilha de registros
          const recordsSheet = workbook.getWorksheet('Registros_Importação');
          
          if (!recordsSheet) {
            throw new Error("Este arquivo Excel não contém a planilha de registros para importação");
          }
          
          // Verificar o formato
          let isValidFormat = false;
          // let rowWithVersion = recordsSheet.getRow(recordsSheet.rowCount); // Removido, não usado
          
          // Verificar as últimas 3 linhas para encontrar a versão do formato
          for (let i = 0; i < 3; i++) {
            const row = recordsSheet.getRow(recordsSheet.rowCount - i);
            if (row.getCell(1).value === 'META' && row.getCell(2).value === 'FORMAT_VERSION') {
              isValidFormat = true;
              break;
            }
          }
          
          if (!isValidFormat) {
            throw new Error("Formato de arquivo inválido. Este arquivo não contém dados válidos para importação");
          }
          
          // Processar os registros
          const newInvestments: Investment[] = [];
          const newProfits: ProfitRecord[] = [];
          let totalCount = 0;
          let investmentCount = 0;
          let profitCount = 0;
          let errorCount = 0;
          let duplicatedCount = 0;
          
          const currentActiveReport = allReportsFromHook?.find(r => r.id === activeReportIdFromHook);
          if (!currentActiveReport) {
            throw new Error("Relatório ativo não encontrado durante a importação.");
          }

          const existingInvestmentIds = new Set(
            currentActiveReport.investments
              .map(inv => inv.originalId || inv.id)
          );
          
          const existingProfitIds = new Set(
            currentActiveReport.profits
              .map(p => p.originalId || p.id)
          );
          
          for (let i = 2; i <= recordsSheet.rowCount; i++) {
            const row = recordsSheet.getRow(i);
            const type = row.getCell(1).value?.toString();
            
            if (type === 'META') continue;
            
            try {
              if (type === 'INVESTMENT') {
                const id = row.getCell(2).value?.toString() || Date.now().toString() + Math.random();
                const originalId = row.getCell(3).value?.toString() || id;
                const date = row.getCell(4).value?.toString() || format(new Date(), "yyyy-MM-dd");
                const amount = Number(row.getCell(5).value) || 0;
                const unit = (row.getCell(6).value?.toString() as CurrencyUnit) || "SATS";
                
                if (amount > 0) {
                  if (existingInvestmentIds.has(id) || existingInvestmentIds.has(originalId)) {
                    duplicatedCount++;
                    continue;
                  }
                  
                  const investment: Investment = { id, originalId, date, amount, unit };
                  newInvestments.push(investment);
                  existingInvestmentIds.add(id); // Adicionar ao set para evitar duplicações dentro do mesmo arquivo
                  if (originalId) existingInvestmentIds.add(originalId);
                  investmentCount++;
                }
                totalCount++;
              } else if (type === 'PROFIT') {
                const id = row.getCell(2).value?.toString() || Date.now().toString() + Math.random();
                const originalId = row.getCell(3).value?.toString() || id;
                const date = row.getCell(4).value?.toString() || format(new Date(), "yyyy-MM-dd");
                const amount = Number(row.getCell(5).value) || 0;
                const unit = (row.getCell(6).value?.toString() as CurrencyUnit) || "SATS";
                const isProfitValue = row.getCell(7).value?.toString();
                const isProfit = isProfitValue === 'TRUE';
                
                if (amount > 0) {
                  if (existingProfitIds.has(id) || existingProfitIds.has(originalId)) {
                    duplicatedCount++;
                    continue;
                  }
                  
                  const profit: ProfitRecord = { id, originalId, date, amount, unit, isProfit };
                  newProfits.push(profit);
                  existingProfitIds.add(id); // Adicionar ao set para evitar duplicações dentro do mesmo arquivo
                  if (originalId) existingProfitIds.add(originalId);
                  profitCount++;
                }
                totalCount++;
              }
            } catch (error) {
              console.error(`Erro ao processar linha ${i}:`, error);
              errorCount++;
            }
          }
          
          setImportStats({
            total: totalCount,
            success: investmentCount + profitCount,
            error: errorCount,
            duplicated: duplicatedCount
          });
          
          if (newInvestments.length > 0 || newProfits.length > 0) {
            // Usar a função importData do hook useReports
            // O terceiro argumento (options) é opcional. Por padrão, ele mescla os dados (não substitui).
            // A função importData espera que os IDs já estejam corretos e únicos se não for para substituir.
            // Como newInvestments e newProfits podem ter IDs temporários da leitura do arquivo,
            // é melhor usar addInvestment e addProfitRecord individualmente se importData não gerar IDs.
            // Ou, garantir que importData possa receber Omit<Investment, "id">[] e Omit<ProfitRecord, "id">[]
            // e gere os IDs internamente.
            // Dado que importData no hook parece ser para combinar dados já estruturados (com IDs),
            // e as funções addInvestment/addProfitRecord do hook geram IDs,
            // vamos usar addInvestment e addProfitRecord individualmente.
            
            let importedInvCount = 0;
            newInvestments.forEach(inv => {
              const { id, ...invData } = inv;
              if (addInvestment(invData)) importedInvCount++;
            });

            let importedProfitCount = 0;
            newProfits.forEach(prof => {
              const { id, ...profData } = prof;
              if (addProfitRecord(profData)) importedProfitCount++;
            });
            
            toast({
              title: "Importação concluída",
              description: `Foram importados ${importedInvCount} aportes e ${importedProfitCount} registros de lucro/perda com sucesso para o relatório "${currentActiveReport.name}".`,
              variant: "success",
            });
          } else if (duplicatedCount > 0 && investmentCount === 0 && profitCount === 0) {
            setDuplicateInfo({
              count: duplicatedCount,
              type: 'registros'
            });
            setShowDuplicateDialog(true);
          } else if (investmentCount === 0 && profitCount === 0 && errorCount === 0 && duplicatedCount === 0) {
            toast({
              title: "Nenhum novo registro encontrado",
              description: "O arquivo não continha novos registros para importar.",
              variant: "default",
            });
          } else {
             toast({
              title: "Nenhum registro novo importado",
              description: "Não foram encontrados novos registros válidos para importar.",
              variant: "warning",
            });
          }
          
        } catch (error) {
          console.error("Erro ao processar arquivo para importação interna:", error);
          toast({
            title: "Erro na importação",
            description: error instanceof Error ? error.message : "Falha ao processar o arquivo Excel.",
            variant: "destructive",
          });
        } finally {
          setIsImporting(false);
          setImportType(null);
          if (event.target) {
            event.target.value = '';
          }
        }
      };
      
      reader.onerror = () => {
        setIsImporting(false);
        setImportType(null);
        toast({
          title: "Erro na leitura",
          description: "Não foi possível ler o arquivo Excel selecionado.",
          variant: "destructive",
        });
        if (event.target) {
          event.target.value = '';
        }
      };
      
      reader.readAsArrayBuffer(file);
      
    } catch (error) {
      setIsImporting(false);
      setImportType(null);
      console.error("Erro na importação interna:", error);
      toast({
        title: "Erro na importação",
        description: "Ocorreu um erro ao tentar processar o arquivo Excel.",
        variant: "destructive",
      });
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // NOVA FUNÇÃO PARA IMPORTAR BACKUP EXCEL GERADO PELA APLICAÇÃO
  const handleImportBackupExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast({ title: "Nenhum arquivo selecionado", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    setImportStats(null);
    // Modificado: Toast inicial mais genérico, será atualizado no final.
    toast({ title: "Iniciando importação do backup Excel...", description: "Processando arquivo...", variant: "default" });

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        let determinedTargetReportId: string | null = null;
        let investmentsSuccessfullyAdded = 0;
        let investmentsDuplicatesSkipped = 0;
        let investmentsFailed = 0;
        let profitsSuccessfullyAdded = 0;
        let profitsDuplicatesSkipped = 0;
        let profitsFailed = 0;

        try {
          const buffer = e.target?.result;
          if (!buffer) {
            throw new Error("Falha ao ler o buffer do arquivo.");
          }
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer as ArrayBuffer);

          const metadataSheet = workbook.getWorksheet('Metadados');
          let reportNameFromMetadata: string | null = null;

          if (metadataSheet) {
            metadataSheet.eachRow((row, rowNumber) => {
              if (rowNumber > 1) { // Pular cabeçalho
                const key = row.getCell(1).value?.toString().trim();
                const value = row.getCell(2).value?.toString().trim();

                if (key === 'ID do Relatório Exportado' && value) {
                  determinedTargetReportId = value;
                } else if (key === 'IDs dos Relatórios Exportados (Manual)' && value && !determinedTargetReportId) {
                  determinedTargetReportId = value.split(',')[0]?.trim();
                } else if (key === 'IDs dos Relatórios Exportados (Histórico)' && value && !determinedTargetReportId) {
                  determinedTargetReportId = value.split(',')[0]?.trim();
                }
                if (key === 'Relatório(s) Exportado(s)' && value) {
                  reportNameFromMetadata = value;
                }
              }
            });
          } else {
            toast({ title: "Aba 'Metadados' não encontrada", description: "O arquivo de backup pode estar corrompido ou não é um formato válido.", variant: "destructive", duration: 7000 });
            setIsImporting(false);
            if (event.target) event.target.value = '';
            return;
          }

          if (!determinedTargetReportId && reportNameFromMetadata) {
            const foundReport = allReportsFromHook.find(r => r.name === reportNameFromMetadata);
            if (foundReport) determinedTargetReportId = foundReport.id;
          }

          if (!determinedTargetReportId) {
            if (activeReportIdFromHook) { // Usar activeReportIdFromHook se nenhum for encontrado
                determinedTargetReportId = activeReportIdFromHook;
                toast({
                    title: "ID do Relatório não encontrado nos metadados",
                    description: `Usando o relatório ativo "${allReportsFromHook.find(r => r.id === activeReportIdFromHook)?.name || 'desconhecido'}" como destino.`, // Adicionado fallback
                    variant: "default",
                    duration: 7000
                });
            } else {
                toast({ title: "Relatório de Destino Não Encontrado", description: "Não foi possível determinar o relatório de destino. Por favor, selecione ou crie um relatório e tente novamente.", variant: "destructive", duration: 7000 });
                setIsImporting(false);
                if (event.target) event.target.value = '';
                return;
            }
          }
          
          // Certificar que o determinedTargetReportId é o ativo no hook para as chamadas addInvestment/addProfitRecord
          // ou que as funções do hook possam aceitar um targetReportId.
          // Por simplicidade, vamos garantir que o relatório alvo esteja ativo.
          if (determinedTargetReportId && determinedTargetReportId !== activeReportIdFromHook) {
            const reportExists = allReportsFromHook.some(r => r.id === determinedTargetReportId);
            if (reportExists) {
                selectReport(determinedTargetReportId); // Ativa o relatório alvo
                toast({ title: "Relatório Alvo Ativado", description: `O relatório "${allReportsFromHook.find(r => r.id === determinedTargetReportId)?.name || 'destino'}" foi ativado para a importação.`, variant: "default", duration: 4000});
            } else {
                toast({ title: "Relatório Alvo Inválido", description: "O relatório de destino especificado no backup não existe mais.", variant: "destructive", duration: 7000 });
                setIsImporting(false);
                if (event.target) event.target.value = '';
                return;
            }
          } else if (!activeReportIdFromHook && determinedTargetReportId) {
            // Se activeReportIdFromHook era null, mas determinedTargetReportId não é, ativa-o.
            const reportExists = allReportsFromHook.some(r => r.id === determinedTargetReportId);
            if (reportExists) {
                selectReport(determinedTargetReportId);
            } else {
                 toast({ title: "Relatório Alvo Inválido", description: "O relatório de destino especificado no backup não existe mais.", variant: "destructive", duration: 7000 });
                setIsImporting(false);
                if (event.target) event.target.value = '';
                return;
            }
          } else if (!activeReportIdFromHook && !determinedTargetReportId) {
            // Caso extremo: nenhum relatório ativo e nenhum ID no backup.
             toast({ title: "Nenhum Relatório de Destino", description: "Por favor, crie ou selecione um relatório antes de importar.", variant: "destructive", duration: 7000 });
             setIsImporting(false);
             if (event.target) event.target.value = '';
             return;
          }

          const tempImportedInvestments: Omit<Investment, 'id'>[] = [];
          const tempImportedProfits: Omit<ProfitRecord, 'id'>[] = [];
          let fileInvestmentsProcessed = 0;
          let fileInvestmentsErrored = 0;
          let fileProfitsProcessed = 0;
          let fileProfitsErrored = 0;

          const investmentsSheet = workbook.getWorksheet('Investimentos');
          if (investmentsSheet) {
            investmentsSheet.eachRow((row, rowNumber) => {
              if (rowNumber > 1) { 
                try {
                  const originalId = row.getCell(1).value?.toString();
                  const dateValue = row.getCell(2).value;
                  const amountStr = row.getCell(3).value?.toString();
                  const unitStr = row.getCell(4).value?.toString() as CurrencyUnit;

                  if (originalId && dateValue && amountStr && unitStr && (unitStr === 'BTC' || unitStr === 'SATS')) {
                    let date: string;
                    if (dateValue instanceof Date) {
                        date = formatDateToUTC(dateValue);
                    } else if (typeof dateValue === 'string') {
                        // Tentar parsear a string, pode ser ISO ou outro formato que parseISODate entenda
                        date = formatDateToUTC(parseISODate(dateValue));                     
                    } else if (typeof dateValue === 'number') { // Para datas do Excel como números
                        // O ExcelJS geralmente converte números de data para objetos Date.
                        // Se ainda for um número aqui, é um caso inesperado ou formato não tratado por parseISODate.
                        // Para robustez, poderíamos tentar converter o número de série do Excel para data se tivéssemos uma lib para isso,
                        // ou logar um erro. Por simplicidade, vamos assumir que ExcelJS converte para Date ou string ISO.
                        // Se dateValue é um número que representa um timestamp, new Date(dateValue) funcionaria.
                        // Se for um número de série do Excel, é mais complexo.
                        // Vamos tratar como erro por enquanto se não for Date nem String reconhecível por parseISODate.
                        throw new Error(`Formato de data de investimento numérico não suportado diretamente: ${dateValue}. Esperava-se Date ou string.`);
                    } else {
                        throw new Error(`Formato de data de investimento inválido: ${dateValue}`);
                    }
                    const amount = parseFloat(amountStr);
                    if (isNaN(amount) || amount <= 0) throw new Error(`Valor de investimento inválido: ${amountStr}`);

                    tempImportedInvestments.push({ originalId, date, amount, unit: unitStr });
                    fileInvestmentsProcessed++;
                  } else {
                    fileInvestmentsErrored++;
                  }
                } catch (err) {
                  console.warn("Erro ao processar linha de investimento do Excel:", err, row.values);
                  fileInvestmentsErrored++;
                }
              }
            });
          }

          const profitsSheet = workbook.getWorksheet('Lucros e Prejuízos');
          if (profitsSheet) {
            profitsSheet.eachRow((row, rowNumber) => {
              if (rowNumber > 1) { 
                try {
                  const originalId = row.getCell(1).value?.toString();
                  const dateValue = row.getCell(2).value;
                  const amountStr = row.getCell(3).value?.toString();
                  const unitStr = row.getCell(4).value?.toString() as CurrencyUnit;
                  const typeStr = row.getCell(5).value?.toString();

                  if (originalId && dateValue && amountStr && unitStr && typeStr && (unitStr === 'BTC' || unitStr === 'SATS') && (typeStr === 'Lucro' || typeStr === 'Prejuízo')) {
                    let date: string;
                    if (dateValue instanceof Date) {
                        date = formatDateToUTC(dateValue);
                    } else if (typeof dateValue === 'string') {
                        date = formatDateToUTC(parseISODate(dateValue)); 
                    } else if (typeof dateValue === 'number') { 
                        // Mesma consideração que para investimentos sobre datas numéricas do Excel.
                        throw new Error(`Formato de data de lucro/prejuízo numérico não suportado diretamente: ${dateValue}. Esperava-se Date ou string.`);
                    } else {
                        throw new Error(`Formato de data de lucro/prejuízo inválido: ${dateValue}`);
                    }
                    const amount = parseFloat(amountStr);
                    if (isNaN(amount) || amount <= 0) throw new Error(`Valor de lucro/prejuízo inválido: ${amountStr}`);
                    const isProfit = typeStr === 'Lucro';

                    tempImportedProfits.push({ originalId, date, amount, unit: unitStr, isProfit });
                    fileProfitsProcessed++;
                  } else {
                    fileProfitsErrored++;
                  }
                } catch (err) {
                  console.warn("Erro ao processar linha de lucro/prejuízo do Excel:", err, row.values);
                  fileProfitsErrored++;
                }
              }
            });
          }
          
          // Adicionar investimentos ao relatório ativo
          for (const invData of tempImportedInvestments) {
            // A função addInvestment do hook agora aceita originalId e lida com a lógica de duplicidade.
            // Ela também usa o activeReportIdFromHook internamente.
            const result = addInvestment(invData); // Passa todo o objeto, incluindo originalId
            switch (result.status) {
              case 'added':
                investmentsSuccessfullyAdded++;
                break;
              case 'duplicate':
                investmentsDuplicatesSkipped++;
                break;
              case 'error':
                investmentsFailed++;
                console.error(`Falha ao adicionar aporte (ID original: ${invData.originalId}): ${result.message}`);
                break;
            }
          }

          // Adicionar lucros/perdas ao relatório ativo
          for (const profitData of tempImportedProfits) {
            const result = addProfitRecord(profitData); // Passa todo o objeto, incluindo originalId
            switch (result.status) {
              case 'added':
                profitsSuccessfullyAdded++;
                break;
              case 'duplicate':
                profitsDuplicatesSkipped++;
                break;
              case 'error':
                profitsFailed++;
                console.error(`Falha ao adicionar lucro/perda (ID original: ${profitData.originalId}): ${result.message}`);
                break;
            }
          }
          
          const totalProcessed = fileInvestmentsProcessed + fileProfitsProcessed; // Total lido do arquivo
          const totalSuccessfullyAdded = investmentsSuccessfullyAdded + profitsSuccessfullyAdded;
          const totalDuplicatesSkipped = investmentsDuplicatesSkipped + profitsDuplicatesSkipped;
          const totalErroredInFile = fileInvestmentsErrored + fileProfitsErrored;
          const totalFailedToAdd = investmentsFailed + profitsFailed; // Falhas na lógica do hook

          setImportStats({
             total: totalProcessed, 
             success: totalSuccessfullyAdded, 
             error: totalErroredInFile + totalFailedToAdd, // totalFailedToAdd agora é a soma de investmentsFailed e profitsFailed
             duplicated: totalDuplicatesSkipped 
          });

          // Toast de resumo final
          let toastTitle = "Importação de Backup";
          let toastDescription = "";
          let toastVariant: "default" | "success" | "destructive" = "default";

          if (totalSuccessfullyAdded > 0 && totalErroredInFile === 0 && totalFailedToAdd === 0 && totalDuplicatesSkipped === 0) {
            toastTitle = "Importação Concluída com Sucesso";
            toastDescription = `Todos os ${totalSuccessfullyAdded} registros do arquivo foram adicionados.`;
            toastVariant = "success";
          } else if (totalSuccessfullyAdded > 0 || totalDuplicatesSkipped > 0) {
            toastTitle = "Importação Concluída com Observações";
            toastDescription = `Adicionados: ${totalSuccessfullyAdded}. Duplicatas Ignoradas: ${totalDuplicatesSkipped}. Erros no arquivo: ${totalErroredInFile}. Falhas ao adicionar: ${totalFailedToAdd}.`;
            toastVariant = "default";
          } else if (totalErroredInFile > 0 || totalFailedToAdd > 0) {
            toastTitle = "Falha na Importação de Backup";
            toastDescription = `Nenhum registro novo adicionado. Duplicatas: ${totalDuplicatesSkipped}. Erros no arquivo: ${totalErroredInFile}. Falhas ao adicionar: ${totalFailedToAdd}.`;
            toastVariant = "destructive";
          } else if (totalDuplicatesSkipped > 0 && totalSuccessfullyAdded === 0 && totalErroredInFile === 0 && totalFailedToAdd === 0){
            toastTitle = "Nenhum Novo Registro Adicionado";
            toastDescription = `Todos os ${totalDuplicatesSkipped} registros encontrados no arquivo já existiam e foram ignorados.`;
            toastVariant = "default";
          } else { // Caso de nenhum registro no arquivo ou outro estado inesperado
            toastTitle = "Importação Finalizada";
            toastDescription = "Nenhum registro processado ou encontrado no arquivo.";
            toastVariant = "default";
          }
          
          toast({
            title: toastTitle,
            description: toastDescription,
            variant: toastVariant,
            duration: 7000
          });

        } catch (error: any) {
          console.error("Erro ao processar o arquivo Excel de backup:", error);
          toast({ title: "Erro Crítico na Importação", description: error.message || "Ocorreu um erro desconhecido ao processar o arquivo.", variant: "destructive" });
          setImportStats({ total: 0, success: 0, error: 1, duplicated: 0 }); // Indica uma falha geral
        } finally {
          setIsImporting(false);
          if (event.target) event.target.value = ''; // Limpa o input
        }
      };
      reader.onerror = (error) => {
        console.error("Erro ao ler o arquivo de backup:", error);
        toast({ title: "Erro de Leitura do Arquivo", description: "Não foi possível ler o arquivo selecionado.", variant: "destructive" });
        setIsImporting(false);
        if (event.target) event.target.value = '';
      };
      reader.readAsArrayBuffer(file);

    } catch (error: any) {
      console.error("Erro ao iniciar a importação de backup:", error);
      toast({ title: "Erro Inesperado na Importação", description: error.message || "Ocorreu um erro ao tentar importar.", variant: "destructive" });
      setIsImporting(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleImportInvestmentCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    if (!activeReportIdFromHook) {
      toast({
        title: "Importação de Aportes Falhou",
        description: "Nenhum relatório ativo. Selecione ou crie um relatório.",
        variant: "destructive",
      });
      if (investmentCsvFileInputRef.current) investmentCsvFileInputRef.current.value = '';
      return;
    }

    const currentActiveReportForInvestCsv = allReportsFromHook?.find(r => r.id === activeReportIdFromHook);
    if (!currentActiveReportForInvestCsv) {
      toast({ title: "Erro na Importação", description: "Relatório ativo não encontrado.", variant: "destructive" });
      if (investmentCsvFileInputRef.current) investmentCsvFileInputRef.current.value = '';
      return;
    }

    const file = event.target.files[0];
    setIsImporting(true);
    setImportStats(null);
    setImportType("investment-csv");

    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          if (!e.target || !e.target.result) {
            throw new Error("Falha ao ler o arquivo CSV");
          }
          
          const csvText = e.target.result as string;
          const records = parseCSV(csvText);
          
          if (records.length === 0) {
            throw new Error("O arquivo CSV não contém dados válidos");
          }
          
          const requiredHeaders = ["id", "ts", "amount", "transactionIdOrHash", "comment", "success", "type"];
          const headers = Object.keys(records[0]);
          
          const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
          if (missingHeaders.length > 0) {
            throw new Error(`Cabeçalhos obrigatórios ausentes: ${missingHeaders.join(", ")}`);
          }
          
          const totalRecords = records.length;
          let importedCount = 0;
          let errorCount = 0;
          let duplicatedCount = 0;
          const newInvestmentsFromCsv: Omit<Investment, "id">[] = []; // Coleção de dados sem ID para o hook
          
          const existingIds = new Set(currentActiveReportForInvestCsv.investments.map(inv => inv.originalId || inv.id));
          
          records.forEach((record, index) => {
            try {
              const successValue = String(record.success).toLowerCase();
              const isSuccess = successValue === "true" || successValue === "1";
              if (!isSuccess) return;
              
              let investmentDateFromFile: Date;
              const tsNum = Number(record.ts);
              if (!isNaN(tsNum)) {
                investmentDateFromFile = new Date(tsNum);
              } else {
                investmentDateFromFile = new Date(record.ts);
              }
              if (isNaN(investmentDateFromFile.getTime())) throw new Error(`Data inválida: ${record.ts}`);
              
              const amount = parseFloat(record.amount.toString());
              if (isNaN(amount) || amount <= 0) throw new Error(`Valor inválido: ${record.amount}`);
              
              const unit: CurrencyUnit = "SATS";
              const originalId = record.id.toString();
              if (existingIds.has(originalId)) {
                duplicatedCount++;
                return;
              }
              
              newInvestmentsFromCsv.push({
                originalId: originalId, 
                date: formatDateToUTC(investmentDateFromFile), // Usar formatDateToUTC
                amount: amount,
                unit: unit
              });
              importedCount++;
            } catch (error) {
              console.error(`Erro ao processar linha ${index + 1} do CSV de aportes:`, error);
              errorCount++;
            }
          });
          
          setImportStats({
            total: totalRecords,
            success: importedCount,
            error: errorCount,
            duplicated: duplicatedCount
          });
          
          if (newInvestmentsFromCsv.length > 0) {
            newInvestmentsFromCsv.forEach(invData => addInvestment(invData)); // Chamar o hook addInvestment
            
            toast({
              title: "Importação de aportes concluída",
              description: `Foram importados ${importedCount} aportes com sucesso.`,
              variant: "success",
            });
          } else if (duplicatedCount > 0) {
            setDuplicateInfo({ count: duplicatedCount, type: 'aportes' });
            setShowDuplicateDialog(true);
          } else {
            toast({
              title: "Nenhum aporte importado",
              description: "Não foram encontrados registros de aportes válidos no arquivo CSV.",
              variant: "destructive",
            });
          }
          
        } catch (error) {
          console.error("Erro ao processar o arquivo CSV de aportes:", error);
          toast({
            title: "Erro na importação",
            description: error instanceof Error ? error.message : "Falha ao processar o arquivo CSV.",
            variant: "destructive",
          });
        } finally {
          setIsImporting(false);
          setImportType(null);
          if (event.target && event.target.files) {
            event.target.value = '';
          }
        }
      };
      
      reader.onerror = () => {
        setIsImporting(false);
        setImportType(null);
        toast({
          title: "Erro na leitura",
          description: "Não foi possível ler o arquivo CSV selecionado.",
          variant: "destructive",
        });
        if (event.target) event.target.value = '';
      };
      
      reader.readAsText(file);
      
    } catch (error) {
      setIsImporting(false);
      setImportType(null);
      console.error("Erro ao importar CSV de aportes:", error);
      toast({
        title: "Erro na importação",
        description: "Ocorreu um erro ao tentar importar o arquivo CSV.",
        variant: "destructive",
      });
      if (event.target) event.target.value = '';
    }
  };

  // Função auxiliar para converter string de data ISO para objeto Date com fuso horário correto
  const parseISODate = (dateString: string): Date => {
    // Tenta converter vários formatos comuns, incluindo ISO com ou sem Z
    // e formatos que podem vir de inputs date/datetime-local
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date;
    }
    // Fallback para formatos que podem não ser diretamente parseados por new Date()
    // Exemplo: DD/MM/YYYY HH:mm:ss - isso precisaria de uma lógica de parse mais robusta
    // Por agora, vamos confiar na capacidade do new Date() de lidar com ISO e formatos próximos
    // e adicionar um log se o parse falhar para formatos inesperados.
    // console.warn('Falha ao parsear data diretamente, formato pode ser inesperado:', dateString);
    // Retorna uma data inválida se o parse falhar, para ser tratada pelos callers
    return new Date(NaN);
  };

  // Função para exibir data formatada a partir de uma string ISO
  const formatDisplayDate = (dateString: string, formatStr: string = "d MMM yyyy"): string => {
    const date = parseISODate(dateString);
    return format(date, formatStr, { locale: ptBR });
  };

  const handleCreateReport = () => {
    if (!reportNameInput.trim()) {
      toast({ title: "Nome inválido", description: "Por favor, insira um nome para o relatório.", variant: "destructive" });
      return;
    }
    // A função addReport do hook já cria com cor, ID, data, etc. e o define como ativo
    addReport(reportNameInput.trim()); // USAR FUNÇÃO DO HOOK
    
    setReportNameInput("");
    setShowCreateReportDialog(false);
    // Toast é tratado por useReports
  };

  const handleHistoryReportSelection = (reportId: string) => {
    setSelectedReportIdsForHistoryView(prev => {
      const isSelected = prev.includes(reportId);
      if (isSelected) {
        // Se estiver desmarcando e for o último selecionado, não permitir (manter pelo menos um)
        // Ou permitir desmarcar todos se essa for a UX desejada (getFiltered... já lida com array vazio)
        // Vamos manter pelo menos um selecionado se houver relatórios.
        if (prev.length === 1 && allReportsFromHook && allReportsFromHook.length > 0) return prev; 
        return prev.filter(id => id !== reportId);
      } else {
        return [...prev, reportId];
      }
    });
  };
  
  const selectAllHistoryReports = () => {
    if (allReportsFromHook) { // USAR allReportsFromHook
      setSelectedReportIdsForHistoryView(allReportsFromHook.map(r => r.id));
    }
  };

  const clearHistoryReportSelection = () => {
    if (allReportsFromHook && allReportsFromHook.length > 0) { // USAR allReportsFromHook
        setSelectedReportIdsForHistoryView([allReportsFromHook[0].id]); 
    } else {
        setSelectedReportIdsForHistoryView([]);
    }
  };

  // Atualizar selectedReportIdsForHistoryView se o relatório ativo mudar e for o único selecionado no histórico
  useEffect(() => {
    if (reportsDataLoaded && activeReportIdFromHook && selectedReportIdsForHistoryView.length === 1 && selectedReportIdsForHistoryView[0] !== activeReportIdFromHook) {
        // Se apenas um relatório estava selecionado no histórico e o relatório ativo mudou,
        // e o novo relatório ativo NÃO é o que estava selecionado, atualize a seleção do histórico
        // para refletir o novo relatório ativo (se ele existir).
        // Isso é mais para manter a consistência se o usuário mudar o relatório ativo na aba de registro
        // e espera que o histórico (se filtrado para um único) reflita isso.
        // No entanto, a seleção de histórico é multi-select, então este caso pode ser opcional.
        // Por agora, vamos manter a seleção do histórico independente, a menos que explicitamente mudada.
    } else if (reportsDataLoaded && activeReportIdFromHook && selectedReportIdsForHistoryView.length === 0 && allReportsFromHook && allReportsFromHook.length > 0) {
      // Se nenhum relatório de histórico estiver selecionado, mas temos um relatório ativo, seleciona-o.
      setSelectedReportIdsForHistoryView([activeReportIdFromHook]);
    }
  }, [activeReportIdFromHook, reportsDataLoaded, selectedReportIdsForHistoryView, allReportsFromHook?.length]); // Adicionado allReportsFromHook?.length

  // Função auxiliar para agregar dados para gráficos
  const getChartMonthlyData = (
    investments: Investment[],
    profits: ProfitRecord[]
  ): { monthYear: string; totalInvestments: number; netProfits: number; totalProfits: number; totalLosses: number }[] => {
    const monthlyData: Record<string, { totalInvestments: number; netProfits: number; totalProfits: number; totalLosses: number }> = {};

    investments.forEach(inv => {
      try {
        const date = parseISODate(inv.date);
        const monthYear = format(date, "yyyy-MM", { locale: ptBR }); // Usar yyyy-MM para ordenação correta
        if (!monthlyData[monthYear]) {
          monthlyData[monthYear] = { totalInvestments: 0, netProfits: 0, totalProfits: 0, totalLosses: 0 };
        }
        monthlyData[monthYear].totalInvestments += convertToBtc(inv.amount, inv.unit);
      } catch (e) {
        console.error("Erro ao processar data de investimento para gráfico:", inv.date, e);
      }
    });

    profits.forEach(prof => {
      try {
        const date = parseISODate(prof.date);
        const monthYear = format(date, "yyyy-MM", { locale: ptBR });
        if (!monthlyData[monthYear]) {
          monthlyData[monthYear] = { totalInvestments: 0, netProfits: 0, totalProfits: 0, totalLosses: 0 };
        }
        const btcAmount = convertToBtc(prof.amount, prof.unit);
        if (prof.isProfit) {
          monthlyData[monthYear].netProfits += btcAmount;
          monthlyData[monthYear].totalProfits += btcAmount;
        } else {
          monthlyData[monthYear].netProfits -= btcAmount;
          monthlyData[monthYear].totalLosses += btcAmount;
        }
      } catch (e) {
        console.error("Erro ao processar data de lucro/perda para gráfico:", prof.date, e);
      }
    });

    return Object.entries(monthlyData)
      .map(([monthYear, data]) => ({ monthYear, ...data }))
      .sort((a, b) => a.monthYear.localeCompare(b.monthYear)); // Ordenar por yyyy-MM
  };

  if (!reportsDataLoaded) { // USAR reportsDataLoaded
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="h-8 w-8 text-purple-500 animate-spin" />
        <span className="ml-2">Carregando seus dados...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-2 h-auto gap-2 bg-transparent">
          <TabsTrigger
            value="register"
            className={`data-[state=active]:bg-purple-800 data-[state=active]:text-white bg-black/30 border border-purple-700/50 py-2`}
          >
            Registrar
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className={`data-[state=active]:bg-purple-800 data-[state=active]:text-white bg-black/30 border border-purple-700/50 py-2`}
          >
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="register">
          <div className="mb-4 p-3 bg-black/20 border border-purple-700/30 rounded-md">
            <div className="flex justify-between items-center mb-1">
              <Label className="text-sm text-purple-400">Relatório Ativo para Novos Registros:</Label>
              <Button onClick={() => setShowCreateReportDialog(true)} size="sm" variant="link" className="px-0 text-purple-400 hover:text-purple-300 text-xs">
                <Plus className="mr-1 h-3 w-3" /> Criar Novo
              </Button>
            </div>
            {allReportsFromHook && allReportsFromHook.length > 0 ? ( // USAR allReportsFromHook
                <Select value={activeReportIdFromHook || ""} onValueChange={(value) => { if (value) selectReport(value); }}> {/* USAR activeReportIdFromHook e selectReport */}
                    <SelectTrigger className="w-full bg-black/40 border-purple-600/50 focus:border-purple-500 focus:ring-purple-500/50 hover:border-purple-600/70 text-white">
                        <SelectValue placeholder="Selecione um relatório" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/95 border-purple-700/60 text-white">
                        {allReportsFromHook.map(report => ( // USAR allReportsFromHook
                            <SelectItem key={report.id} value={report.id} style={{ color: report.color || '#E0E0E0' }}>
                                {report.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : (
                <p className="text-xs text-muted-foreground mt-1">Nenhum relatório. O primeiro registro criará um "Relatório Padrão".</p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Card de Registrar Investimento atualizado com estilo padrão */}
            <Card className="bg-black/30 rounded-lg shadow-xl shadow-purple-900/10 border border-purple-700/40">
              <CardHeader>
                <CardTitle className="text-lg mb-1.5">Registrar Investimento</CardTitle>
                <CardDescription className="text-purple-500/90 dark:text-purple-400/80">Registre seus aportes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="investment-amount">Valor</Label>
                    <Input
                      id="investment-amount"
                      type="number"
                      placeholder="Valor"
                      value={investmentAmount}
                      onChange={(e) => setInvestmentAmount(e.target.value)}
                      className="bg-background/30 dark:bg-black/40 border-purple-700/50 focus:border-purple-500 focus:ring-purple-500/50 hover:border-purple-600/70"
                    />
                  </div>
                  <div>
                    <Label htmlFor="investment-date">Data do Aporte</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left bg-black/30 border-purple-700/50 hover:bg-purple-900/20 hover:border-purple-600/70"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {investmentDate ? format(investmentDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione uma data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-black/90 border-purple-800/60" align="start">
                        <div className="p-2 bg-purple-900/30 text-xs text-center text-gray-300 border-b border-purple-700/50">
                          Selecione a data do aporte
                        </div>
                        <CalendarComponent
                          mode="single"
                          selected={investmentDate}
                          onSelect={(date) => {
                            if (date) {
                              // Definir a data com horário meio-dia UTC para evitar problemas de fuso
                              const newDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0));
                              setInvestmentDate(newDate);
                            }
                          }}
                          initialFocus
                          className="bg-black/80"
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label className="block mb-2">Unidade</Label>
                    <RadioGroup
                      value={investmentUnit}
                      onValueChange={(value) => setInvestmentUnit(value as CurrencyUnit)}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="BTC" id="unit-btc" />
                        <Label htmlFor="unit-btc">BTC</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="SATS" id="unit-sats" />
                        <Label htmlFor="unit-sats">Satoshis</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <Button onClick={handleAddInvestmentButtonClick} className="bg-purple-800 hover:bg-purple-700 border border-purple-600/80">
                    Adicionar Aporte
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Card de Registrar Lucro/Perda atualizado com estilo padrão */}
            <Card className="bg-black/30 rounded-lg shadow-xl shadow-purple-900/10 border border-purple-700/40">
              <CardHeader>
                <CardTitle className="text-lg mb-1.5">Registrar Lucro/Perda</CardTitle>
                <CardDescription className="text-purple-500/90 dark:text-purple-400/80">Registre seus lucros ou perdas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="profit-amount">Valor</Label>
                    <Input
                      id="profit-amount"
                      type="number"
                      placeholder="Valor"
                      value={profitAmount}
                      onChange={(e) => setProfitAmount(e.target.value)}
                      className="bg-background/30 dark:bg-black/40 border-purple-700/50 focus:border-purple-500 focus:ring-purple-500/50 hover:border-purple-600/70"
                    />
                  </div>
                  <div>
                    <Label htmlFor="profit-date">Data do Registro</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left bg-black/30 border-purple-700/50 hover:bg-purple-900/20 hover:border-purple-600/70"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {profitDate ? format(profitDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione uma data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-black/90 border-purple-800/60" align="start">
                        <div className="p-2 bg-purple-900/30 text-xs text-center text-gray-300 border-b border-purple-700/50">
                          Selecione a data do {isProfit ? "lucro" : "perda"}
                        </div>
                        <CalendarComponent
                          mode="single"
                          selected={profitDate}
                          onSelect={(date) => {
                            if (date) {
                              // Definir a data com horário meio-dia UTC para evitar problemas de fuso
                              const newDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0));
                              setProfitDate(newDate);
                            }
                          }}
                          initialFocus
                          className="bg-black/80"
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  {/* Reorganizando os RadioGroups para ficarem lado a lado */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="block mb-2">Tipo</Label>
                      <RadioGroup
                        value={isProfit ? "profit" : "loss"}
                        onValueChange={(value) => setIsProfit(value === "profit")}
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="profit" id="type-profit" />
                          <Label htmlFor="type-profit">Lucro</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="loss" id="type-loss" />
                          <Label htmlFor="type-loss">Perda</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    
                    <div>
                      <Label className="block mb-2">Unidade</Label>
                      <RadioGroup
                        value={profitUnit}
                        onValueChange={(value) => setProfitUnit(value as CurrencyUnit)}
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="BTC" id="profit-unit-btc" />
                          <Label htmlFor="profit-unit-btc">BTC</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="SATS" id="profit-unit-sats" />
                          <Label htmlFor="profit-unit-sats">Satoshis</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                  
                  <Button onClick={handleAddProfitRecordButtonClick} className="bg-purple-800 hover:bg-purple-700 border border-purple-600/80">
                    Adicionar {isProfit ? "Lucro" : "Perda"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Card de Importação atualizado com estilo padrão */}
          <Card className="bg-black/30 rounded-lg shadow-xl shadow-purple-900/10 border border-purple-700/40">
            <CardHeader>
              <CardTitle className="text-lg mb-1.5">Importação de Registros</CardTitle>
              <CardDescription className="text-purple-500/90 dark:text-purple-400/80">Importe operações e aportes de arquivos externos</CardDescription>
            </CardHeader>
            <CardContent>
              <ImportOptions />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {/* Card principal do Histórico atualizado com a borda correta */}
          <Card className="bg-black/30 border border-purple-700/40 shadow-xl shadow-purple-900/10 rounded-lg">
            <CardHeader>
              {/* Estilo do CardTitle atualizado */}
              <CardTitle className="text-lg mb-1.5">Histórico de Registros</CardTitle>
              {/* Nova CardDescription adicionada */}
              <CardDescription className="text-purple-500/90 dark:text-purple-400/80">
                Visualize seus aportes e lucros/perdas registrados por relatório e período.
              </CardDescription>

              {/* SELETOR DE RELATÓRIO PARA HISTÓRICO - MODIFICADO PARA CHECKBOXES */}
              <div className="mt-4 mb-2 space-y-3">
                <div>
                  <Label className="text-sm text-purple-400 block mb-2">Selecionar Relatórios para Visualização no Histórico:</Label>
                  {allReportsFromHook && allReportsFromHook.length > 0 ? ( // USAR allReportsFromHook
                    <>
                      <div className="flex space-x-2 mb-2">
                        {/* MODIFICADO: size="sm" e classes para parecer menor */}
                        <Button size="sm" variant="outline" onClick={selectAllHistoryReports} className="bg-black/30 border-purple-700/50 text-xs px-2 py-1 h-7">Selecionar Todos</Button>
                        <Button size="sm" variant="outline" onClick={clearHistoryReportSelection} className="bg-black/30 border-purple-700/50 text-xs px-2 py-1 h-7">Limpar (Manter 1º)</Button>
                      </div>
                      <ScrollArea className="h-[100px] border border-purple-700/30 bg-black/20 p-2 rounded-md">
                        <div className="space-y-1.5">
                        {allReportsFromHook.map(report => ( // USAR allReportsFromHook
                          <div key={`hist-sel-${report.id}`} className="flex items-center space-x-2 p-1 hover:bg-purple-900/20 rounded-sm">
                            <Checkbox
                              id={`hist-report-${report.id}`}
                              checked={selectedReportIdsForHistoryView.includes(report.id)}
                              onCheckedChange={() => handleHistoryReportSelection(report.id)}
                              style={{borderColor: report.color || '#A855F7'}}
                            />
                            <Label htmlFor={`hist-report-${report.id}`} className="text-xs font-normal cursor-pointer" style={{color: report.color || '#E0E0E0'}}>
                              {report.name}
                            </Label>
                          </div>
                        ))}
                        </div>
                      </ScrollArea>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">Nenhum relatório criado. Crie um na aba "Registrar".</p>
                  )}
                </div>
              </div>
              
              {/* Aviso sobre exclusão e exportação estarem ligados ao relatório ativo da aba Registrar */}
              {activeReportIdFromHook && allReportsFromHook && allReportsFromHook.length > 0 && ( // USAR activeReportIdFromHook e allReportsFromHook
                <div className="mt-1 mb-3 p-2 text-xs bg-yellow-900/30 border border-yellow-700/40 text-yellow-300 rounded-md">
                  <HelpCircle className="inline h-3 w-3 mr-1 mb-0.5" /> {/* Usar HelpCircle diretamente */}
                  Lembrete: A exportação e exclusão de dados em massa (botões "Remover todos") afetam apenas o relatório <span className="font-semibold">"{allReportsFromHook.find(r=>r.id === activeReportIdFromHook)?.name || 'selecionado na aba Registrar'}"</span>. {/* USAR allReportsFromHook */}
                </div>
              )}


              <div className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:space-x-2 pt-3">
                {/* Controles de Filtro (Tipo e Datas) */}
                <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 items-start sm:items-center">
                  <Button
                    variant={showFilterOptions ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowFilterOptions(!showFilterOptions)}
                    className={cn(
                      showFilterOptions 
                        ? "bg-purple-800 hover:bg-purple-700 border border-purple-600/80"
                        : "bg-black/30 border-purple-700/50 hover:bg-purple-900/20 hover:border-purple-600/70",
                      "w-full sm:w-auto"
                    )}
                  >
                    <Sliders className="mr-2 h-4 w-4" />
                    {showFilterOptions ? "Ocultar Filtros" : "Mostrar Filtros"}
                  </Button>

                  {showFilterOptions && (
                    <RadioGroup 
                      value={historyFilterType} 
                      onValueChange={(value) => setHistoryFilterType(value as 'month' | 'custom')}
                      className="flex space-x-1 bg-black/30 border border-purple-700/50 p-0.5 rounded-md text-xs"
                    >
                      <RadioGroupItem value="month" id="filter-month-type" className="sr-only" />
                      <Label 
                        htmlFor="filter-month-type" 
                        className={cn(
                          "px-2 py-1 rounded-sm cursor-pointer",
                          historyFilterType === 'month' ? "bg-purple-700 text-white" : "text-gray-400 hover:bg-purple-900/30"
                        )}
                      >
                        Mensal
                      </Label>
                      <RadioGroupItem value="custom" id="filter-custom-type" className="sr-only" />
                      <Label 
                        htmlFor="filter-custom-type" 
                        className={cn(
                          "px-2 py-1 rounded-sm cursor-pointer",
                          historyFilterType === 'custom' ? "bg-purple-700 text-white" : "text-gray-400 hover:bg-purple-900/30"
                        )}
                      >
                        Personalizado
                      </Label>
                    </RadioGroup>
                  )}
                </div>
                
                {/* Botões de Exportar e Moeda (mantidos à direita) */}
                <div className="flex items-center space-x-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleDisplayCurrency}
                    className="bg-black/30 border-purple-700/50 hover:bg-purple-900/20 hover:border-purple-600/70"
                  >
                    {displayCurrency === "USD" ? (
                      <>
                        <span className="font-bold mr-1">R$</span> BRL
                      </>
                    ) : (
                      <>
                        <DollarSign className="h-4 w-4 mr-1" /> USD
                      </>
                    )}
                  </Button>
                  
                  {/* SUBSTITUIR O BLOCO DE EXPORTAÇÃO ANTIGO */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        // Inicializar estados do modal de exportação avançada antes de abrir
                        const activeId = activeReportIdFromHook;
                        const historySelectionNotEmpty = selectedReportIdsForHistoryView.length > 0;

                        if (historySelectionNotEmpty) {
                            setExportReportSelectionType('history');
                        } else if (activeId) {
                            setExportReportSelectionType('active');
                        } else {
                            setExportReportSelectionType('manual'); // Ou um fallback mais robusto
                        }
                        setManualSelectedReportIdsForExport(historySelectionNotEmpty ? selectedReportIdsForHistoryView : (activeId ? [activeId] : []));
                        
                        // Definir período padrão com base no filtro do histórico se ativo
                        if (showFilterOptions) {
                            if (historyFilterType === 'month') {
                                setExportPeriodSelectionType('historyFilter'); // Usará filterMonth
                            } else if (historyFilterType === 'custom' && customStartDate && customEndDate) {
                                setExportPeriodSelectionType('historyFilter'); // Usará customStartDate/EndDate
                            } else {
                                setExportPeriodSelectionType('all');
                            }
                        } else {
                             setExportPeriodSelectionType('all');
                        }
                        setExportSpecificMonthDate(filterMonth || new Date());
                        setExportCustomStartDateForRange(customStartDate);
                        setExportCustomEndDateForRange(customEndDate);
                        setExportIncludeCharts(true);
                        setShowAdvancedExportDialog(true);
                    }}
                    disabled={isExporting || (!allReportsFromHook || allReportsFromHook.length === 0)}
                    className="bg-black/30 border-purple-700/50 hover:bg-purple-900/20 hover:border-purple-600/70"
                  >
                    {isExporting ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Exportando...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Exportar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {showFilterOptions && (
                <div className="px-0 pt-4 pb-2 border-t border-purple-700/20 mt-3">
                  {historyFilterType === 'month' && (
                    <div className="flex items-center space-x-2">
                      <Label className="text-sm">Mês:</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-auto justify-start text-left font-normal bg-black/30 border-purple-700/50 hover:bg-purple-900/20 hover:border-purple-600/70"
                          >
                            <span>{format(filterMonth, "MMMM yyyy", { locale: ptBR })}</span>
                            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-black/90 border-purple-800/60" align="start">
                          <div className="p-2 bg-purple-900/30 text-xs text-center text-gray-300 border-b border-purple-700/50">
                            Selecione o mês para filtrar
                          </div>
                          <div className="p-3">
                            <div className="flex items-center justify-between mb-3">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-7 w-7 bg-black/30 border-purple-700/30"
                                onClick={() => setFilterMonth(subMonths(filterMonth, 1))}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <div className="font-medium text-center">
                                {format(filterMonth, "MMMM yyyy", { locale: ptBR })}
                              </div>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-7 w-7 bg-black/30 border-purple-700/30"
                                onClick={() => {
                                  const nextMonth = addMonths(filterMonth, 1);
                                  if (isBefore(nextMonth, addMonths(new Date(), 1))) {
                                    setFilterMonth(nextMonth);
                                  }
                                }}
                                disabled={!isBefore(addMonths(filterMonth, 1), addMonths(new Date(), 1))}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                  {historyFilterType === 'custom' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="custom-start-date" className="text-sm">Data de Início:</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              id="custom-start-date"
                              className="w-full justify-start text-left font-normal bg-black/30 border-purple-700/50 hover:bg-purple-900/20 hover:border-purple-600/70"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {customStartDate ? format(customStartDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-black/90 border-purple-800/60" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={customStartDate || undefined}
                              onSelect={(date) => setCustomStartDate(date || null)}
                              disabled={(date) => customEndDate ? date > customEndDate || date > new Date() : date > new Date()}
                              initialFocus
                              className="bg-black/80"
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label htmlFor="custom-end-date" className="text-sm">Data de Fim:</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              id="custom-end-date"
                              className="w-full justify-start text-left font-normal bg-black/30 border-purple-700/50 hover:bg-purple-900/20 hover:border-purple-600/70"
                              disabled={!customStartDate}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {customEndDate ? format(customEndDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-black/90 border-purple-800/60" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={customEndDate || undefined}
                              onSelect={(date) => setCustomEndDate(date || null)}
                              disabled={(date) => customStartDate ? date < customStartDate || date > new Date() : date > new Date()}
                              initialFocus
                              className="bg-black/80"
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Resumo dos dados filtrados */}
              {showFilterOptions && selectedReportIdsForHistoryView.length > 0 && ( // MODIFICADO: verificar selectedReportIdsForHistoryView
                <div className="px-6 pb-2">
                  {(() => {
                    // Cálculos para o resumo com base nos filtros atuais
                    const filteredInvestmentsForSummary = getFilteredInvestments();
                    const totalInvestmentsBtcForPeriod = filteredInvestmentsForSummary.reduce((sum, inv) => sum + convertToBtc(inv.amount, inv.unit), 0);
                    
                    const filteredProfitsForSummary = getFilteredProfits();
                    const totalNetProfitsBtcForPeriod = filteredProfitsForSummary.reduce((sum, prof) => {
                      const btcAmount = convertToBtc(prof.amount, prof.unit);
                      if (isNaN(btcAmount)) return sum;
                      return prof.isProfit ? sum + btcAmount : sum - btcAmount;
                    }, 0);

                    const rendementForPeriod = totalInvestmentsBtcForPeriod > 0 
                      ? (totalNetProfitsBtcForPeriod / totalInvestmentsBtcForPeriod) * 100 
                      : 0;

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div className="bg-black/30 p-3 rounded-md border border-purple-700/50">
                          <div className="text-xs text-gray-400">Período Selecionado</div>
                          <div className="text-lg font-semibold text-white">
                            {historyFilterType === 'month' 
                              ? format(filterMonth, "MMMM yyyy", { locale: ptBR }) 
                              : customStartDate && customEndDate 
                                ? `${format(customStartDate, "dd/MM/yy")} - ${format(customEndDate, "dd/MM/yy")}`
                                : "Nenhum filtro aplicado"
                            }
                          </div>
                        </div>

                        <div className="bg-black/30 p-3 rounded-md border border-purple-700/50">
                          <div className="text-xs text-gray-400">Aporte total no período</div>
                          <div className="text-lg font-semibold text-blue-400">
                            {formatCryptoAmount(totalInvestmentsBtcForPeriod, "BTC")}
                          </div>
                          <div className="text-xs text-gray-400">
                            {formatBtcValueInCurrency(totalInvestmentsBtcForPeriod)}
                          </div>
                        </div>

                        <div className="bg-black/30 p-3 rounded-md border border-purple-700/50">
                          <div className="text-xs text-gray-400">Lucro/Perda no período</div>
                          <div className={`text-lg font-semibold ${totalNetProfitsBtcForPeriod >= 0 ? "text-green-500" : "text-red-500"}`}>
                            {totalNetProfitsBtcForPeriod >= 0 ? "+" : ""}
                            {formatCryptoAmount(totalNetProfitsBtcForPeriod, "BTC")}
                          </div>
                          <div className="text-xs text-gray-400">
                            {totalNetProfitsBtcForPeriod >= 0 ? "+" : ""}
                            {formatBtcValueInCurrency(totalNetProfitsBtcForPeriod)}
                          </div>
                        </div>

                        <div className="bg-black/30 p-3 rounded-md border border-purple-700/50">
                          <div className="text-xs text-gray-400">Rendimento no período</div>
                          <div className={`text-lg font-semibold ${rendementForPeriod >= 0 ? "text-green-500" : "text-red-500"}`}>
                            {totalInvestmentsBtcForPeriod > 0 || totalNetProfitsBtcForPeriod !== 0 ? 
                              `${rendementForPeriod.toFixed(2)}%` : 
                              "N/A"}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              
              {getFilteredInvestments().length === 0 && getFilteredProfits().length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {selectedReportIdsForHistoryView.length === 0 ? "Selecione um ou mais relatórios para visualizar." :
                    showFilterOptions ? 
                    `Nenhum registro encontrado para ${format(filterMonth, "MMMM 'de' yyyy", { locale: ptBR })} nos relatórios selecionados.` : 
                    "Nenhum registro encontrado nos relatórios selecionados. Adicione investimentos ou lucros na aba 'Registrar'."}
                </p>
              ) : (
                <div className="space-y-6">
                  {getFilteredInvestments().length > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold text-blue-400">Investimentos</h3>
                        {!showFilterOptions && activeReportIdFromHook && ( // USAR activeReportIdFromHook
                          <Button 
                            variant="destructive" 
                            size="sm"
                            className="bg-red-900/70 hover:bg-red-900"
                            onClick={() => setShowDeleteInvestmentsDialog(true)}
                            disabled={!activeReportIdFromHook} 
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remover todos (do relatório "{allReportsFromHook?.find(r=>r.id === activeReportIdFromHook)?.name || ''}")
                          </Button>
                        )}
                      </div>
                      <Table>
                        <TableHeader className="bg-black/40">
                          <TableRow>
                            <TableHead className="w-[20%]">Data</TableHead>
                            {selectedReportIdsForHistoryView.length > 1 && <TableHead className="w-[20%]">Relatório</TableHead>}
                            <TableHead className="w-[25%]">Valor em BTC</TableHead>
                            <TableHead className="w-[25%]">Valor em {displayCurrency}</TableHead>
                            <TableHead className="w-[10%] text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getFilteredInvestments().map((investment) => {
                            const btcValue = convertToBtc(investment.amount, investment.unit);
                            return (
                              <TableRow key={`${investment.reportName}-${investment.id}`} className="hover:bg-purple-900/10 border-b border-purple-900/10">
                                <TableCell>{formatDisplayDate(investment.date, "d MMM yyyy")}</TableCell>
                                {selectedReportIdsForHistoryView.length > 1 && 
                                  <TableCell>
                                    <span className="text-xs px-1.5 py-0.5 rounded-sm whitespace-nowrap" style={{backgroundColor: `${investment.reportColor}33`, color: investment.reportColor}}>
                                      {investment.reportName}
                                    </span>
                                  </TableCell>
                                }
                                <TableCell>{formatCryptoAmount(btcValue, "BTC")}</TableCell>
                                <TableCell>{formatBtcValueInCurrency(btcValue)}</TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteInvestmentLocal(investment.id)} // Corrigido para deleteInvestmentLocal
                                    className="hover:bg-red-900/20 hover:text-red-400"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  
                  {getFilteredProfits().length > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold text-green-500">Lucros/Perdas</h3>
                        {!showFilterOptions && activeReportIdFromHook && ( // USAR activeReportIdFromHook
                          <Button 
                            variant="destructive" 
                            size="sm"
                            className="bg-red-900/70 hover:bg-red-900"
                            onClick={() => setShowDeleteProfitsDialog(true)}
                            disabled={!activeReportIdFromHook} 
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                             Remover todos (do relatório "{allReportsFromHook?.find(r=>r.id === activeReportIdFromHook)?.name || ''}")
                          </Button>
                        )}
                      </div>
                      <Table>
                        <TableHeader className="bg-black/40">
                          <TableRow>
                            <TableHead className="w-[15%]">Data</TableHead>
                            {selectedReportIdsForHistoryView.length > 1 && <TableHead className="w-[15%]">Relatório</TableHead>}
                            <TableHead className="w-[15%]">Tipo</TableHead>
                            <TableHead className="w-[20%]">Valor em BTC</TableHead>
                            <TableHead className="w-[20%]">Valor em {displayCurrency}</TableHead>
                            <TableHead className="w-[15%] text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getFilteredProfits().map((profit) => {
                            const btcValue = convertToBtc(profit.amount, profit.unit);
                            return (
                              <TableRow key={`${profit.reportName}-${profit.id}`} className="hover:bg-purple-900/10 border-b border-purple-900/10">
                                <TableCell>{formatDisplayDate(profit.date, "d MMM yyyy")}</TableCell>
                                {selectedReportIdsForHistoryView.length > 1 && 
                                  <TableCell>
                                     <span className="text-xs px-1.5 py-0.5 rounded-sm whitespace-nowrap" style={{backgroundColor: `${profit.reportColor}33`, color: profit.reportColor}}>
                                      {profit.reportName}
                                    </span>
                                  </TableCell>
                                }
                                <TableCell>
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    profit.isProfit ? "bg-green-900/30 text-green-500" : "bg-red-900/30 text-red-500"
                                  }`}>
                                    {profit.isProfit ? "Lucro" : "Perda"}
                                  </span>
                                </TableCell>
                                <TableCell className={profit.isProfit ? "text-green-500" : "text-red-500"}>
                                  {profit.isProfit ? "+" : "-"}
                                  {formatCryptoAmount(btcValue, "BTC")}
                                </TableCell>
                                <TableCell className={profit.isProfit ? "text-green-500" : "text-red-500"}>
                                  {profit.isProfit ? "+" : "-"}
                                  {formatBtcValueInCurrency(btcValue)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteProfitLocal(profit.id)} // Corrigido para deleteProfitLocal
                                    className="hover:bg-red-900/20 hover:text-red-400"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreateReportDialog} onOpenChange={setShowCreateReportDialog}>
        <DialogContent className="bg-black/95 border-purple-800/60 text-white">
          <DialogHeader>
            <DialogTitle>Criar Novo Relatório</DialogTitle>
            <DialogDescription className="text-gray-400">
              Insira um nome para o seu novo relatório.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="report-name" className="text-gray-300">Nome do Relatório</Label>
              <Input 
                id="report-name" 
                value={reportNameInput} 
                onChange={(e) => setReportNameInput(e.target.value)} 
                placeholder="Ex: Minha Estratégia Principal"
                className="bg-black/30 border-purple-700/50 focus:border-purple-500 focus:ring-purple-500/50 hover:border-purple-600/70 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateReportDialog(false)} className="bg-black/30 border-purple-700/50 text-white hover:bg-black/50">Cancelar</Button>
            <Button onClick={handleCreateReport} className="bg-purple-700 hover:bg-purple-600 text-white">Criar Relatório</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog para exportação em telas pequenas */}
      {useExportDialog && (
        <Dialog open={showExportOptions} onOpenChange={setShowExportOptions}>
          <DialogContent className="p-0 max-w-[95vw] bg-black/95 border-purple-800/60" style={{ maxHeight: "80vh" }}>
            <DialogHeader className="p-4 pb-0">
              <DialogTitle className="text-center">Exportar Dados (Simples)</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto">
              {/* <ExportOptionsContent /> */} {/* O conteúdo antigo pode ser removido ou adaptado se necessário para um modo "simples" no futuro */}
              <div className="p-4 text-center text-sm">
                A exportação avançada agora é o padrão. <br/> Clique no botão "Exportar" para ver as opções.
                <Button onClick={() => setShowExportOptions(false)} className="mt-4 w-full">Fechar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Dialog para confirmar exclusão de investimentos */}
      <Dialog open={showDeleteInvestmentsDialog} onOpenChange={setShowDeleteInvestmentsDialog}>
        <DialogContent className="bg-black/95 border-purple-800/60">
          <DialogHeader>
            <DialogTitle>Excluir todos os aportes</DialogTitle>
            <DialogDescription>
              Você tem certeza que deseja excluir todos os registros de aporte? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteInvestmentsDialog(false)}
              className="bg-black/30 border-purple-700/50"
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={deleteAllInvestments}
              className="bg-red-900 hover:bg-red-800"
            >
              Excluir todos
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Dialog para confirmar exclusão de lucros/perdas */}
      <Dialog open={showDeleteProfitsDialog} onOpenChange={setShowDeleteProfitsDialog}>
        <DialogContent className="bg-black/95 border-purple-800/60">
          <DialogHeader>
            <DialogTitle>Excluir todos os lucros/perdas</DialogTitle>
            <DialogDescription>
              Você tem certeza que deseja excluir todos os registros de lucro e perda? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteProfitsDialog(false)}
              className="bg-black/30 border-purple-700/50"
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={deleteAllProfits}
              className="bg-red-900 hover:bg-red-800"
            >
              Excluir todos
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo para mostrar informações sobre duplicações */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="bg-black/95 border-purple-800/60">
          <DialogHeader>
            <DialogTitle>Registros duplicados encontrados</DialogTitle>
            <DialogDescription>
              Foram encontrados {duplicateInfo?.count} {duplicateInfo?.type} que já existem no sistema.
              Estes registros foram ignorados para evitar duplicações que poderiam causar imprecisões nos dados.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 p-4 bg-purple-900/20 border border-purple-800/40 rounded-md">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
              <div className="text-sm">
                <p className="mb-2">
                  O sistema compara os identificadores únicos das operações para evitar duplicações durante a importação.
                </p>
                <p className="text-gray-400">
                  Isto garante maior precisão nos seus cálculos de lucro e rendimento.
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <Button 
              onClick={() => setShowDuplicateDialog(false)}
              className="bg-purple-800 hover:bg-purple-700"
            >
              <Check className="mr-2 h-4 w-4" />
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de confirmação para registros potencialmente duplicados */}
      {showConfirmDuplicateDialog && duplicateConfirmInfo && (
        <Dialog 
          open={showConfirmDuplicateDialog} 
          onOpenChange={setShowConfirmDuplicateDialog}
        >
          <DialogContent className="bg-black/95 border-purple-800/60">
            <DialogHeader>
              <DialogTitle>Possível duplicação de registro</DialogTitle>
              <DialogDescription>
                <div className="my-2">
                  Já existe um registro {duplicateConfirmInfo.type === 'investment' ? 'de aporte' : 'de lucro/perda'} com a mesma data e valor:
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 bg-black/40 p-2 rounded border border-purple-700/30">
                  <div className="text-sm font-medium">Data:</div>
                  <div className="text-sm">
                    {(() => {
                      try {
                        // Converter a string de data (YYYY-MM-DD) em objeto Date usando parseISODate
                        const dateObj = parseISODate(duplicateConfirmInfo.date);
                        return format(dateObj, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
                      } catch (e) {
                        return duplicateConfirmInfo.date;
                      }
                    })()}
                  </div>
                  
                  <div className="text-sm font-medium">Valor:</div>
                  <div className="text-sm">{formatCryptoAmount(duplicateConfirmInfo.amount, duplicateConfirmInfo.unit)}</div>
                  
                  {duplicateConfirmInfo.type === 'profit' && (
                    <>
                      <div className="text-sm font-medium">Tipo:</div>
                      <div className="text-sm">{pendingProfit?.isProfit ? 'Lucro' : 'Perda'}</div>
                    </>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-2 p-4 bg-purple-900/20 border border-purple-800/40 rounded-md">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
                <div className="text-sm">
                  <p className="mb-2">
                    Adicionar este registro pode causar uma duplicação nos seus dados, o que pode afetar a precisão dos cálculos de rendimento.
                  </p>
                  <p className="text-gray-400">
                    Você deseja continuar mesmo assim?
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setPendingInvestment(null);
                  setPendingProfit(null);
                  setDuplicateConfirmInfo(null);
                  setShowConfirmDuplicateDialog(false);
                }}
                className="bg-black/30 border-purple-700/50"
              >
                Cancelar
              </Button>
              <Button 
                variant="default"
                onClick={() => {
                  if (duplicateConfirmInfo.type === 'investment' && pendingInvestment) {
                    const {id, ...investmentData} = pendingInvestment;
                    confirmAddInvestment(investmentData);
                  } else if (duplicateConfirmInfo.type === 'profit' && pendingProfit) {
                    const {id, ...profitData} = pendingProfit;
                    confirmAddProfitRecord(profitData);
                  }
                }}
                className="bg-purple-800 hover:bg-purple-700"
              >
                Adicionar mesmo assim
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* NOVO DIÁLOGO PARA OPÇÕES AVANÇADAS DE EXPORTAÇÃO */}
      <Dialog open={showAdvancedExportDialog} onOpenChange={setShowAdvancedExportDialog}>
        <DialogContent className="bg-black/95 border-purple-800/60 text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Opções Avançadas de Exportação</DialogTitle>
            <DialogDescription className="text-gray-400">
              Configure os detalhes da sua exportação.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="data" className="space-y-4 pt-4">
            <TabsList className="grid w-full grid-cols-3 bg-black/30 border-purple-700/50">
              <TabsTrigger value="data" className="data-[state=active]:bg-purple-800 data-[state=active]:text-white">Dados e Relatórios</TabsTrigger>
              <TabsTrigger value="content" className="data-[state=active]:bg-purple-800 data-[state=active]:text-white">Conteúdo</TabsTrigger>
              <TabsTrigger value="charts" className="data-[state=active]:bg-purple-800 data-[state=active]:text-white">Gráficos</TabsTrigger>
            </TabsList>

            <TabsContent value="data" className="space-y-6">
              {/* SELEÇÃO DE FORMATO */}
              <div className="space-y-2">
                <Label className="text-base font-medium text-purple-300">Formato do Arquivo</Label>
                <RadioGroup value={exportFormat} onValueChange={(v) => setExportFormat(v as 'excel' | 'pdf')} className="flex space-x-4">
                  <div className="flex items-center space-x-2 p-2 rounded hover:bg-purple-900/20 border border-transparent hover:border-purple-700/30">
                    <RadioGroupItem value="excel" id="format-excel" />
                    <Label htmlFor="format-excel" className="font-normal text-sm cursor-pointer">Excel (.xlsx)</Label>
                  </div>
                  <div className="flex items-center space-x-2 p-2 rounded hover:bg-purple-900/20 border border-transparent hover:border-purple-700/30">
                    <RadioGroupItem value="pdf" id="format-pdf" />
                    <Label htmlFor="format-pdf" className="font-normal text-sm cursor-pointer">PDF (.pdf)</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* SELEÇÃO DE RELATÓRIOS */}
              <div className="space-y-2">
                <Label className="text-base font-medium text-purple-300">Selecionar Relatórios</Label>
                <RadioGroup value={exportReportSelectionType} onValueChange={(v) => setExportReportSelectionType(v as any)} className="space-y-1.5">
                  {activeReportIdFromHook && currentActiveReportObjectFromHook && (
                    <div className="flex items-center space-x-2 p-2 rounded hover:bg-purple-900/20 border border-transparent hover:border-purple-700/30">
                      <RadioGroupItem value="active" id="rep-active" />
                      <Label htmlFor="rep-active" className="font-normal text-sm cursor-pointer flex-grow">
                        Apenas o relatório ativo na aba 'Registrar': <span className="font-semibold" style={{color: currentActiveReportObjectFromHook.color || 'inherit'}}>{currentActiveReportObjectFromHook.name}</span>
                      </Label>
                    </div>
                  )}
                  {selectedReportIdsForHistoryView.length > 0 && (
                    <div className="flex items-center space-x-2 p-2 rounded hover:bg-purple-900/20 border border-transparent hover:border-purple-700/30">
                      <RadioGroupItem value="history" id="rep-history" />
                      <Label htmlFor="rep-history" className="font-normal text-sm cursor-pointer flex-grow">
                        Usar seleção da aba 'Histórico' ({selectedReportIdsForHistoryView.length} relatório(s))
                      </Label>
                    </div>
                  )}
                  <div className="flex items-start space-x-2 p-2 rounded hover:bg-purple-900/20 border border-transparent hover:border-purple-700/30">
                    <RadioGroupItem value="manual" id="rep-manual" className="mt-1"/>
                    <Label htmlFor="rep-manual" className="font-normal text-sm cursor-pointer flex-grow">
                      Selecionar manualmente para esta exportação:
                      {exportReportSelectionType === 'manual' && allReportsFromHook && allReportsFromHook.length > 0 && (
                        <ScrollArea className="mt-2 h-[100px] border border-purple-700/30 bg-black/20 p-2 rounded-md">
                          <div className="space-y-1.5">
                            {allReportsFromHook.map(report => (
                              <div key={`manual-exp-sel-${report.id}`} className="flex items-center space-x-2 p-1 hover:bg-purple-900/20 rounded-sm">
                                <Checkbox
                                  id={`manual-exp-report-${report.id}`}
                                  checked={manualSelectedReportIdsForExport.includes(report.id)}
                                  onCheckedChange={(checked) => {
                                    setManualSelectedReportIdsForExport(prev => 
                                      checked ? [...prev, report.id] : prev.filter(id => id !== report.id)
                                    );
                                  }}
                                  style={{borderColor: report.color || '#A855F7'}}
                                />
                                <Label htmlFor={`manual-exp-report-${report.id}`} className="text-xs font-normal cursor-pointer" style={{color: report.color || '#E0E0E0'}}>
                                  {report.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* SELEÇÃO DE PERÍODO */}
              <div className="space-y-2">
                <Label className="text-base font-medium text-purple-300">Selecionar Período</Label>
                <RadioGroup value={exportPeriodSelectionType} onValueChange={(v) => setExportPeriodSelectionType(v as any)} className="space-y-1.5">
                  <div className="flex items-center space-x-2 p-2 rounded hover:bg-purple-900/20 border border-transparent hover:border-purple-700/30">
                    <RadioGroupItem value="all" id="period-all" />
                    <Label htmlFor="period-all" className="font-normal text-sm cursor-pointer flex-grow">Todos os dados (dos relatórios selecionados)</Label>
                  </div>
                  {showFilterOptions && (historyFilterType === 'month' || (historyFilterType === 'custom' && customStartDate && customEndDate)) && (
                    <div className="flex items-center space-x-2 p-2 rounded hover:bg-purple-900/20 border border-transparent hover:border-purple-700/30">
                      <RadioGroupItem value="historyFilter" id="period-history" />
                      <Label htmlFor="period-history" className="font-normal text-sm cursor-pointer flex-grow">
                        Usar período do filtro da aba 'Histórico': 
                        <span className="font-semibold ml-1">
                           {historyFilterType === 'month' ? format(filterMonth, "MMMM yyyy", { locale: ptBR }) : 
                           (customStartDate && customEndDate ? `${format(customStartDate, "dd/MM/yy")} - ${format(customEndDate, "dd/MM/yy")}` : 'N/A')}
                        </span>
                      </Label>
                    </div>
                  )}
                  <div className="flex items-start space-x-2 p-2 rounded hover:bg-purple-900/20 border border-transparent hover:border-purple-700/30">
                    <RadioGroupItem value="specificMonth" id="period-month" className="mt-1" />
                    <Label htmlFor="period-month" className="font-normal text-sm cursor-pointer flex-grow">
                      Mês específico:
                      {exportPeriodSelectionType === 'specificMonth' && (
                        <div className="flex items-center space-x-2 mt-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 bg-black/30 border-purple-700/50 hover:bg-purple-900/20 text-white shrink-0"
                            onClick={() => setExportSpecificMonthDate(prev => subMonths(prev || new Date(), 1))}
                            aria-label="Mês anterior"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span 
                            className="flex-grow text-center px-3 py-1.5 text-sm rounded-md border border-purple-700/50 bg-black/30 text-white select-none whitespace-nowrap min-w-[150px]"
                            aria-live="polite"
                          >
                            {exportSpecificMonthDate ? format(exportSpecificMonthDate, "MMMM 'de' yyyy", { locale: ptBR }) : "Selecione o mês"}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 bg-black/30 border-purple-700/50 hover:bg-purple-900/20 text-white shrink-0"
                            onClick={() => setExportSpecificMonthDate(prev => addMonths(prev || new Date(), 1))}
                            aria-label="Próximo mês"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </Label>
                  </div>
                  <div className="flex items-start space-x-2 p-2 rounded hover:bg-purple-900/20 border border-transparent hover:border-purple-700/30">
                     <RadioGroupItem value="customRange" id="period-range" className="mt-1" />
                     <Label htmlFor="period-range" className="font-normal text-sm cursor-pointer flex-grow">
                       Intervalo de datas personalizado:
                       {exportPeriodSelectionType === 'customRange' && (
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
                           <Popover>
                             <PopoverTrigger asChild>
                               <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal bg-black/30 border-purple-700/50 hover:bg-purple-900/20 hover:border-purple-600/70">
                                 <Calendar className="mr-2 h-4 w-4" />
                                 {exportCustomStartDateForRange ? format(exportCustomStartDateForRange, "dd/MM/yy") : "Início"}
                               </Button>
                             </PopoverTrigger>
                             <PopoverContent className="w-auto p-0 bg-black/90 border-purple-800/60"><CalendarComponent mode="single" selected={exportCustomStartDateForRange || undefined} onSelect={(date) => setExportCustomStartDateForRange(date || null)} disabled={(date) => (exportCustomEndDateForRange && date > exportCustomEndDateForRange) || date > new Date()} className="bg-black/80 p-2" locale={ptBR}/></PopoverContent>
                           </Popover>
                           <Popover>
                             <PopoverTrigger asChild>
                               <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal bg-black/30 border-purple-700/50 hover:bg-purple-900/20 hover:border-purple-600/70" disabled={!exportCustomStartDateForRange}>
                                 <Calendar className="mr-2 h-4 w-4" />
                                 {exportCustomEndDateForRange ? format(exportCustomEndDateForRange, "dd/MM/yy") : "Fim"}
                               </Button>
                             </PopoverTrigger>
                             <PopoverContent className="w-auto p-0 bg-black/90 border-purple-800/60"><CalendarComponent mode="single" selected={exportCustomEndDateForRange || undefined} onSelect={(date) => setExportCustomEndDateForRange(date || null)} disabled={(date) => (exportCustomStartDateForRange && date < exportCustomStartDateForRange) || date > new Date()} className="bg-black/80 p-2" locale={ptBR}/></PopoverContent>
                           </Popover>
                         </div>
                       )}
                     </Label>
                  </div>
                </RadioGroup>
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-4">
              <Label className="text-base font-medium text-purple-300">Seções a Incluir no Relatório</Label>
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2 p-2 rounded hover:bg-purple-900/20 border border-transparent hover:border-purple-700/30">
                  <Checkbox id="include-summary" checked={exportIncludeSummarySection} onCheckedChange={(checked) => setExportIncludeSummarySection(Boolean(checked))} />
                  <Label htmlFor="include-summary" className="font-normal text-sm cursor-pointer flex-grow">Resumo Financeiro</Label>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded hover:bg-purple-900/20 border border-transparent hover:border-purple-700/30">
                  <Checkbox id="include-investments-table" checked={exportIncludeInvestmentsTableSection} onCheckedChange={(checked) => setExportIncludeInvestmentsTableSection(Boolean(checked))} />
                  <Label htmlFor="include-investments-table" className="font-normal text-sm cursor-pointer flex-grow">Tabela de Investimentos</Label>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded hover:bg-purple-900/20 border border-transparent hover:border-purple-700/30">
                  <Checkbox id="include-profits-table" checked={exportIncludeProfitsTableSection} onCheckedChange={(checked) => setExportIncludeProfitsTableSection(Boolean(checked))} />
                  <Label htmlFor="include-profits-table" className="font-normal text-sm cursor-pointer flex-grow">Tabela de Lucros/Prejuízos</Label>
                </div>
                {/* NOVO CHECKBOX MODO ESCURO PDF */}
                {exportFormat === 'pdf' && (
                  <div className="flex items-center space-x-2 p-2 rounded hover:bg-purple-900/20 border border-transparent hover:border-purple-700/30 mt-3 pt-3 border-t border-purple-700/20">
                    <Checkbox id="pdf-dark-mode" checked={exportPdfDarkMode} onCheckedChange={(checked) => setExportPdfDarkMode(Boolean(checked))} />
                    <Label htmlFor="pdf-dark-mode" className="font-normal text-sm cursor-pointer flex-grow">Modo Escuro para PDF</Label>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="charts" className="space-y-4">
              <div className="flex items-center space-x-2 p-2 rounded hover:bg-purple-900/20 border border-transparent hover:border-purple-700/30">
                <Checkbox id="include-charts" checked={exportIncludeCharts} onCheckedChange={(checked) => setExportIncludeCharts(Boolean(checked))} />
                <Label htmlFor="include-charts" className="font-normal text-sm cursor-pointer flex-grow">Incluir gráficos na exportação</Label>
              </div>
              {exportIncludeCharts && (
                <div className="p-3 bg-black/20 border border-purple-700/30 rounded-md text-xs text-gray-400">
                  <p>Gráficos padrão serão incluídos:</p>
                  <ul className="list-disc list-inside ml-2 mt-1">
                    <li>Evolução do Saldo Total</li>
                    <li>Volume de Investimentos Mensais</li>
                    <li>Lucros/Prejuízos Líquidos Mensais</li>
                    <li>Comparativo de Saldos (se múltiplos relatórios)</li>
                  </ul>
                  <p className="mt-2">A personalização detalhada de gráficos será adicionada em breve.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setShowAdvancedExportDialog(false)} className="bg-black/30 border-purple-700/50 text-white hover:bg-black/50">Cancelar</Button>
            <Button 
              onClick={() => {
                // Lógica de exportação com as novas opções virá aqui.
                // Por agora, apenas logamos as opções e fechamos o modal.
                const optionsToLog: ExportOptions = { // Garantir que optionsToLog seja do tipo ExportOptions
                  exportFormat: exportFormat, // Adicionado
                  reportSelectionType: exportReportSelectionType,
                  manualSelectedReportIds: exportReportSelectionType === 'manual' ? manualSelectedReportIdsForExport : (exportReportSelectionType === 'history' ? selectedReportIdsForHistoryView : (activeReportIdFromHook ? [activeReportIdFromHook] : [])),
                  periodSelectionType: exportPeriodSelectionType,
                  specificMonthDate: exportPeriodSelectionType === 'specificMonth' ? exportSpecificMonthDate : null,
                  customStartDate: exportPeriodSelectionType === 'customRange' ? exportCustomStartDateForRange : null,
                  customEndDate: exportPeriodSelectionType === 'customRange' ? exportCustomEndDateForRange : null,
                  includeCharts: exportIncludeCharts,
                  includeSummarySection: exportIncludeSummarySection, 
                  includeInvestmentsTableSection: exportIncludeInvestmentsTableSection, 
                  includeProfitsTableSection: exportIncludeProfitsTableSection,
                  pdfDarkMode: exportFormat === 'pdf' ? exportPdfDarkMode : undefined, // NOVO - adicionar ao payload
                };
                console.log("Opções Avançadas de Exportação Selecionadas:", optionsToLog);
                
                // Chamada REAL a exportData com o objeto construído
                exportData(optionsToLog); 

                setShowAdvancedExportDialog(false);
                // O toast de sucesso/início já é tratado dentro de exportData se a exportação for bem-sucedida
                // Se houver erro na construção das opções ANTES de chamar exportData, um toast aqui seria útil.
              }} 
              className="bg-purple-700 hover:bg-purple-600 text-white"
              disabled={isExporting || (exportReportSelectionType === 'manual' && manualSelectedReportIdsForExport.length === 0) || (exportReportSelectionType === 'active' && !activeReportIdFromHook)}
            >
              {isExporting ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Exportando...</> : "Exportar Agora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const dynamic = 'force-dynamic';