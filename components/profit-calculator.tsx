"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
import { useReports } from "@/hooks/use-reports";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { startOfDay } from "@/lib/utils";
import { getCurrentBitcoinPrice } from "@/lib/api";

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
  }
}

interface ProfitCalculatorProps {
  btcToUsd: number;
  brlToUsd: number;
  appData?: AppData;
}

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

interface Report {
  id: string;
  name: string;
  description?: string;
  investments: Investment[];
  profits: ProfitRecord[];
  color?: string;
  createdAt: string;
}

interface DatePriceInfo {
  price: number | null;
  loading: boolean;
  currency: DisplayCurrency | null;
  error?: string | null;
  source?: string | null; // Adicionar fonte
}

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

// Declaração de tipos para as funções
type FetchBtcPriceOnDateType = (
  date: Date, 
  targetCurrency: DisplayCurrency
) => Promise<{ price: number; source: string; currency: DisplayCurrency }>;

type CalculateOperationalProfitType = (
  profitRecords: ProfitRecord[],
  convertToBtcFunction: (amount: number, unit: CurrencyUnit) => number
) => { 
  operationalProfitBtc: number; 
  operationalProfitSats: number; 
  netProfitFromOperationsBtc: number; 
  netProfitFromOperationsSats: number 
};

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

  // NOVOS ESTADOS PARA PREÇO DO DIA DO APORTE/LUCRO
  const [investmentDatePriceInfo, setInvestmentDatePriceInfo] = useState<DatePriceInfo>({ price: null, loading: false, currency: displayCurrency, error: null, source: null });
  const [profitDatePriceInfo, setProfitDatePriceInfo] = useState<DatePriceInfo>({ price: null, loading: false, currency: displayCurrency, error: null, source: null });

  const { toast, dismiss } = useToast(); // Desestruturar toast e dismiss
  const notificationToastRef = React.useRef<ReturnType<typeof toast> | null>(null); // Usar o toast desestruturado
  const [currentToastId, setCurrentToastId] = React.useState<string | null>(null); // Manter para lógica existente

  // Definir "hoje" para desabilitar datas futuras no calendário
  const today = startOfDay(new Date());

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

    const newInvestmentBase: Omit<Investment, "id" | "priceAtDate" | "priceAtDateCurrency" | "priceAtDateSource"> = { // Omitir campos de preço aqui
      date: formatDateToUTC(investmentDate), // Usar formatDateToUTC
      amount: Number(investmentAmount),
      unit: investmentUnit,
    };

    // ... (lógica de verificação de duplicados existente, usando newInvestmentBase) ...
    // Se não for duplicado ou se o usuário confirmar a duplicata:
    // A busca de preço e a adição final acontecem em confirmAddInvestment

    // Exemplo de como a lógica de duplicados chamaria confirmAddInvestment
    // if (possibleDuplicates.length > 0) {
    //   setPendingInvestment({ ...newInvestmentBase, id: Date.now().toString() }); // Adiciona ID temporário para pending
    //   // ... (mostrar diálogo de confirmação) ...
    // } else {
    //    confirmAddInvestment(newInvestmentBase); // Chama diretamente se não houver duplicados
    // }
    // Esta parte precisa ser ajustada para como você está lidando com o estado pendente e a confirmação.
    // O importante é que `confirmAddInvestment` receba os dados base.
    // Para simplificar, vamos assumir que a lógica de `handleAddInvestmentButtonClick`
    // eventualmente chama `confirmAddInvestment` com os dados base do investimento (sem ID e sem preço ainda).
    // A lógica exata de como `newInvestmentBase` chega a `confirmAddInvestment` (direto ou via estado)
    // depende da sua implementação de tratamento de duplicados.

    // Temporariamente, para o fluxo, vamos assumir que newInvestmentBase é o que passamos
    // (Ajustar conforme sua lógica de pendingInvestment e confirmação de duplicados)
    const { id, ...investmentDataForConfirmation } = { ...newInvestmentBase, id: Date.now().toString() }; // Simula a preparação dos dados
    
    // A lógica de tratamento de duplicatas deve ser revisada para passar os dados corretos
    // para setPendingInvestment e depois para confirmAddInvestment.
    // Por ora, focaremos em como confirmAddInvestment lida com a busca de preço.
    // O fluxo exato de como `investmentData` chega aqui (via `pendingInvestment` ou direto)
    // precisa ser consistente.

    // Lógica de duplicidade (simplificada para focar na busca de preço):
    const possibleDuplicates = reportToUpdate?.investments.filter(inv => 
      inv.date === newInvestmentBase.date && 
      inv.amount === newInvestmentBase.amount && 
      inv.unit === newInvestmentBase.unit
    ) || [];

    if (possibleDuplicates.length > 0) {
      // Armazena os dados SEM o preço para o diálogo de confirmação
      setPendingInvestment({ ...newInvestmentBase, id: Date.now().toString() }); // ID temporário
      setDuplicateConfirmInfo({
        type: 'investment',
        date: newInvestmentBase.date,
        amount: newInvestmentBase.amount,
        unit: newInvestmentBase.unit
      });
      setShowConfirmDuplicateDialog(true);
    } else {
      confirmAddInvestment(newInvestmentBase); // Passa os dados base sem ID e sem preço
    }
  };
  
  // Função para confirmar adição do investimento após possível duplicação
  // Recebe os dados base do investimento (sem ID, sem preço na data)
  const confirmAddInvestment = async (investmentBaseData: Omit<Investment, "id" | "priceAtDate" | "priceAtDateCurrency" | "priceAtDateSource">) => {
    if (!activeReportIdFromHook) {
      toast({ title: "Erro", description: "Nenhum relatório ativo para adicionar o aporte.", variant: "destructive" });
      return;
    }
    // A função addInvestment do hook já lida com a adição ao relatório ativo
    const success = addInvestment(investmentBaseData); 
    
    if (success) {
      setInvestmentAmount(""); // Limpa o campo de valor
      // Não limpar a data do investimento, pode ser útil para registros sequenciais.
      // setInvestmentDate(new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 12, 0, 0)));
      // Limpar info do preço do dia na UI se desejar, ou deixar para o próximo onSelect da data.
      setInvestmentDatePriceInfo({ price: null, loading: false, currency: displayCurrency, error: null, source: null });
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
        toast({ title: "Erro", description: "Relatório alvo não encontrado para adicionar registro de lucro.", variant: "destructive" });
        return;
    }

    const newProfitRecordBase: Omit<ProfitRecord, "id"> = {
      date: formatDateToUTC(profitDate),
      amount: Number(profitAmount),
      unit: profitUnit,
      isProfit: isProfit,
    };

    // ... (restante da lógica de adição de registro de lucro) ...
  };
  
  // ... (restante do código) ...
}
