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

// Tipos de dados
type CurrencyUnit = "BTC" | "SATS";
type DisplayCurrency = "USD" | "BRL";

interface Investment {

  id: string;

  originalId?: string;

  date: string;

  amount: number;

  unit: CurrencyUnit;

  // Novos campos para armazenar o preÃ§o do Bitcoin na data do aporte

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

async function fetchBtcPriceOnDate(

  date: Date, 

  targetCurrency: DisplayCurrency

): Promise<{ price: number; source: string; currency: DisplayCurrency }

function calculateOperationalProfitForSummary(

  profitRecords: ProfitRecord[],

  convertToBtcFunction: (amount: number, unit: CurrencyUnit) => number

): { operationalProfitBtc: number; operationalProfitSats: number; netProfitFromOperationsBtc: number; netProfitFromOperationsSats: number }

async function fetchBtcPriceOnDate(

  date: Date, 

  targetCurrency: DisplayCurrency

): Promise<{ price: number; source: string; currency: DisplayCurrency }

function calculateOperationalProfitForSummary(

  profitRecords: ProfitRecord[],

  convertToBtcFunction: (amount: number, unit: CurrencyUnit) => number

): { operationalProfitBtc: number; operationalProfitSats: number; netProfitFromOperationsBtc: number; netProfitFromOperationsSats: number }

async function fetchBtcPriceOnDate(

  date: Date, 

  targetCurrency: DisplayCurrency

): Promise<{ price: number; source: string; currency: DisplayCurrency }

function calculateOperationalProfitForSummary(

  profitRecords: ProfitRecord[],

  convertToBtcFunction: (amount: number, unit: CurrencyUnit) => number

): { operationalProfitBtc: number; operationalProfitSats: number; netProfitFromOperationsBtc: number; netProfitFromOperationsSats: number }

async function fetchBtcPriceOnDate(

  date: Date, 

  targetCurrency: DisplayCurrency

): Promise<{ price: number; source: string; currency: DisplayCurrency }

function calculateOperationalProfitForSummary(

  profitRecords: ProfitRecord[],

  convertToBtcFunction: (amount: number, unit: CurrencyUnit) => number

): { operationalProfitBtc: number; operationalProfitSats: number; netProfitFromOperationsBtc: number; netProfitFromOperationsSats: number }

async function fetchBtcPriceOnDate(

  date: Date, 

  targetCurrency: DisplayCurrency

): Promise<{ price: number; source: string; currency: DisplayCurrency }

function calculateOperationalProfitForSummary(

  profitRecords: ProfitRecord[],

  convertToBtcFunction: (amount: number, unit: CurrencyUnit) => number

): { operationalProfitBtc: number; operationalProfitSats: number; netProfitFromOperationsBtc: number; netProfitFromOperationsSats: number }

export default function ProfitCalculator({ btcToUsd, brlToUsd, appData }: ProfitCalculatorProps) {

  // USAR O HOOK useReports - AJUSTAR DESESTRUTURAÃ‡ÃƒO

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

    deleteAllInvestmentsFromReport, // Adicionar esta funÃ§Ã£o

    deleteAllProfitsFromReport,    // Adicionar esta funÃ§Ã£o

  } = useReports();



  // Manter estados locais que nÃ£o sÃ£o gerenciados por useReports ou que sÃ£o especÃ­ficos da UI deste componente

  const [activeTab, setActiveTab] = useState<string>("register");

  // selectedMonth e filterMonth sÃ£o para a UI de HistÃ³rico, nÃ£o diretamente para o relatÃ³rio ativo de registro

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

  

  // REINTRODUZIR ESTADO PARA SELEÃ‡ÃƒO DE RELATÃ“RIOS NA ABA HISTÃ“RICO

  const [selectedReportIdsForHistoryView, setSelectedReportIdsForHistoryView] = useState<string[]>([]);

  

  // VariÃ¡vel para controlar se um toast estÃ¡ sendo exibido

  const [toastDebounce, setToastDebounce] = useState(false);

  

  // Ref para input de arquivo

  const fileInputRef = useRef<HTMLInputElement>(null);

  const csvFileInputRef = useRef<HTMLInputElement>(null);

  const internalFileInputRef = useRef<HTMLInputElement>(null);

  const investmentCsvFileInputRef = useRef<HTMLInputElement>(null);

  const backupExcelFileInputRef = useRef<HTMLInputElement>(null); // NOVO REF



  const isMobile = useIsMobile();

  const isSmallScreen = typeof window !== 'undefined' ? window.innerWidth < 350 : false;



  // Novo estado para o diÃ¡logo de duplicaÃ§Ãµes

  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

  const [duplicateInfo, setDuplicateInfo] = useState<{count: number, type: string} | null>(null);



  // Estados para confirmaÃ§Ã£o de adiÃ§Ã£o de registros potencialmente duplicados

  const [pendingInvestment, setPendingInvestment] = useState<Investment | null>(null);

  const [pendingProfit, setPendingProfit] = useState<ProfitRecord | null>(null);

  const [showConfirmDuplicateDialog, setShowConfirmDuplicateDialog] = useState(false);

  const [duplicateConfirmInfo, setDuplicateConfirmInfo] = useState<{

    type: 'investment' | 'profit',

    date: string,

    amount: number,

    unit: CurrencyUnit

  } | null>(null);



  // REINTRODUZIR ESTADOS PARA CRIAÃ‡ÃƒO DE RELATÃ“RIO

  const [reportNameInput, setReportNameInput] = useState("");

  const [showCreateReportDialog, setShowCreateReportDialog] = useState(false);



  // NOVOS ESTADOS PARA FILTRO DE HISTÃ“RICO

  const [historyFilterType, setHistoryFilterType] = useState<'month' | 'custom'>('month');

  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);

  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);



  // Novos estados para o modal de exportaÃ§Ã£o avanÃ§ada

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



  // NOVOS ESTADOS PARA PREÃ‡O DO DIA DO APORTE/LUCRO

  const [investmentDatePriceInfo, setInvestmentDatePriceInfo] = useState<DatePriceInfo>({ price: null, loading: false, currency: displayCurrency, error: null, source: null });

  const [profitDatePriceInfo, setProfitDatePriceInfo] = useState<DatePriceInfo>({ price: null, loading: false, currency: displayCurrency, error: null, source: null });



  const { toast, dismiss } = useToast(); // Desestruturar toast e dismiss

  const notificationToastRef = React.useRef<ReturnType<typeof toast> | null>(null); // Usar o toast desestruturado

  const [currentToastId, setCurrentToastId] = React.useState<string | null>(null); // Manter para lÃ³gica existente



  // Definir "hoje" para desabilitar datas futuras no calendÃ¡rio

  const today = startOfDay(new Date());



  // Verificar tamanho da tela para decidir entre popover e dialog

  useEffect(() => {

    if (typeof window !== 'undefined') {

      const checkScreenSize = () => {

        setUseExportDialog(window.innerWidth < 350);

      };

      

      // Verificar tamanho inicial

      checkScreenSize();

      

      // Adicionar listener para mudanÃ§as de tamanho

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



  // REMOVER BLOCO DE useEffect PARA CARREGAMENTO/SALVAMENTO/MIGRAÃ‡ÃƒO DE RELATÃ“RIOS

  // A LÃ“GICA DE CARREGAMENTO DE RELATÃ“RIOS E MIGRAÃ‡ÃƒO AGORA Ã‰ TRATADA PELO useReports()



  // MANTER useEffect PARA displayCurrency e inicializaÃ§Ã£o de selectedReportIdsForHistoryView

  useEffect(() => {

    const savedDisplayCurrency = localStorage.getItem("bitcoinDisplayCurrency");

    if (savedDisplayCurrency) {

      try {

        setDisplayCurrency(JSON.parse(savedDisplayCurrency) as DisplayCurrency);

      } catch (e) {

        console.error("Erro ao analisar moeda de exibiÃ§Ã£o salva:", e);

      }

    }



    // Inicializar selectedReportIdsForHistoryView com base nos relatÃ³rios carregados pelo hook

    if (reportsDataLoaded && allReportsFromHook && allReportsFromHook.length > 0) { // USAR allReportsFromHook

      if (selectedReportIdsForHistoryView.length === 0) {

        const initialHistorySelection = activeReportIdFromHook // USAR activeReportIdFromHook

          ? [activeReportIdFromHook]

          : (allReportsFromHook.length > 0 ? [allReportsFromHook[0].id] : []);

        setSelectedReportIdsForHistoryView(initialHistorySelection);

      } else {

        // Garante que os relatÃ³rios selecionados para histÃ³rico ainda existam

        setSelectedReportIdsForHistoryView(prev => prev.filter(id => allReportsFromHook.some(r => r.id === id)));

      }

    } else if (reportsDataLoaded && (!allReportsFromHook || allReportsFromHook.length === 0)) {

        setSelectedReportIdsForHistoryView([]);

    }

  }, [reportsDataLoaded, allReportsFromHook, activeReportIdFromHook]); // ATUALIZAR DEPENDÃŠNCIAS



  // MANTER useEffect PARA SALVAR displayCurrency

  useEffect(() => {

    if (reportsDataLoaded) { // Usar reportsDataLoaded para saber quando salvar

      localStorage.setItem("bitcoinDisplayCurrency", JSON.stringify(displayCurrency));

    }

  }, [displayCurrency, reportsDataLoaded]);

  

  useEffect(() => {

    if (reportsDataLoaded) { // Usar reportsDataLoaded aqui tambÃ©m

      updateRates();

    }

  }, [reportsDataLoaded, appData]);



  // FunÃ§Ãµes auxiliares

  const updateRates = async () => {

    if (appData) {

      return; // Adicionar return para evitar processamento desnecessÃ¡rio

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

          

          // Evitar mÃºltiplos toasts

          if (!toastDebounce) {

            setToastDebounce(true);

            toast({

              title: "CotaÃ§Ã£o atualizada",

              description: `Bitcoin: ${priceData.usd.toLocaleString()} USD`,

              variant: "success",

            });

            setTimeout(() => setToastDebounce(false), 1000);

          }

        }

      } catch (error) {

        console.error("Erro ao atualizar cotaÃ§Ã£o:", error);

        

        // Evitar mÃºltiplos toasts tambÃ©m no caso de erro

        if (!toastDebounce) {

          setToastDebounce(true);

          toast({

            title: "Erro ao atualizar cotaÃ§Ã£o",

            description: "Usando as Ãºltimas taxas disponÃ­veis.",

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



  // Verifica se uma data Ã© no futuro

  const isFutureDate = (date: Date): boolean => {

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const dateToCompare = new Date(date);

    dateToCompare.setHours(0, 0, 0, 0);

    return dateToCompare > today;

  };



  // FunÃ§Ã£o para garantir que a data nÃ£o seja afetada pelo fuso horÃ¡rio

  const formatDateToUTC = (date: Date): string => {

    // Usar o mÃ©todo getUTC* para obter os valores UTC da data

    const year = date.getUTCFullYear();

    const month = date.getUTCMonth() + 1; // Janeiro Ã© 0

    const day = date.getUTCDate();

    

    // Formatar a data como YYYY-MM-DD

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  };



  // FunÃ§Ãµes de adiÃ§Ã£o e remoÃ§Ã£o

  const handleAddInvestmentButtonClick = () => { // RENOMEADO para evitar conflito

    if (!investmentAmount || isNaN(Number(investmentAmount)) || Number(investmentAmount) <= 0) {

      toast({

        title: "Valor invÃ¡lido",

        description: "Por favor, insira um valor vÃ¡lido maior que zero.",

        variant: "destructive",

      });

      return;

    }



    if (isFutureDate(investmentDate)) {

      toast({

        title: "Data invÃ¡lida",

        description: "NÃ£o Ã© possÃ­vel registrar aportes com data futura.",

        variant: "destructive",

      });

        return;

    }



    let targetReportId = activeReportIdFromHook;

    if (!targetReportId) {

      if (!allReportsFromHook || allReportsFromHook.length === 0) {

         addReport("RelatÃ³rio PadrÃ£o");

         toast({ title: "RelatÃ³rio Criado", description: "Um 'RelatÃ³rio PadrÃ£o' foi criado. Tente adicionar o aporte novamente.", variant: "default" });

         return;

      } else if (allReportsFromHook.length > 0 && !activeReportIdFromHook) {

        selectReport(allReportsFromHook[0].id);

        targetReportId = allReportsFromHook[0].id;

        toast({ title: "RelatÃ³rio Ativado", description: `RelatÃ³rio "${allReportsFromHook[0].name}" ativado. Tente adicionar o aporte novamente.`, variant: "default" });

        return;

      } else {

         toast({ title: "Nenhum relatÃ³rio ativo", description: "Por favor, selecione um relatÃ³rio ou crie um novo.", variant: "warning" });

        return;

      }

    }

    

    const reportToUpdate = allReportsFromHook?.find(r => r.id === targetReportId);

    if (!reportToUpdate) {

        toast({ title: "Erro", description: "RelatÃ³rio alvo nÃ£o encontrado para adicionar aporte.", variant: "destructive" });

        return;

    }



    const newInvestmentBase: Omit<Investment, "id" | "priceAtDate" | "priceAtDateCurrency" | "priceAtDateSource"> = { // Omitir campos de preÃ§o aqui

      date: formatDateToUTC(investmentDate), // Usar formatDateToUTC

      amount: Number(investmentAmount),

      unit: investmentUnit,

    };



    // ... (lÃ³gica de verificaÃ§Ã£o de duplicados existente, usando newInvestmentBase) ...

    // Se nÃ£o for duplicado ou se o usuÃ¡rio confirmar a duplicata:

    // A busca de preÃ§o e a adiÃ§Ã£o final acontecem em confirmAddInvestment



    // Exemplo de como a lÃ³gica de duplicados chamaria confirmAddInvestment

    // if (possibleDuplicates.length > 0) {

    //   setPendingInvestment({ ...newInvestmentBase, id: Date.now().toString() }); // Adiciona ID temporÃ¡rio para pending

    //   // ... (mostrar diÃ¡logo de confirmaÃ§Ã£o) ...

    // } else {

    //    confirmAddInvestment(newInvestmentBase); // Chama diretamente se nÃ£o houver duplicados

    // }

    // Esta parte precisa ser ajustada para como vocÃª estÃ¡ lidando com o estado pendente e a confirmaÃ§Ã£o.

    // O importante Ã© que `confirmAddInvestment` receba os dados base.

    // Para simplificar, vamos assumir que a lÃ³gica de `handleAddInvestmentButtonClick`

    // eventualmente chama `confirmAddInvestment` com os dados base do investimento (sem ID e sem preÃ§o ainda).

    // A lÃ³gica exata de como `newInvestmentBase` chega a `confirmAddInvestment` (direto ou via estado)

    // depende da sua implementaÃ§Ã£o de tratamento de duplicados.



    // Temporariamente, para o fluxo, vamos assumir que newInvestmentBase Ã© o que passamos

    // (Ajustar conforme sua lÃ³gica de pendingInvestment e confirmaÃ§Ã£o de duplicados)

    const { id, ...investmentDataForConfirmation } = { ...newInvestmentBase, id: Date.now().toString() }; // Simula a preparaÃ§Ã£o dos dados

    

    // A lÃ³gica de tratamento de duplicatas deve ser revisada para passar os dados corretos

    // para setPendingInvestment e depois para confirmAddInvestment.

    // Por ora, focaremos em como confirmAddInvestment lida com a busca de preÃ§o.

    // O fluxo exato de como `investmentData` chega aqui (via `pendingInvestment` ou direto)

    // precisa ser consistente.



    // LÃ³gica de duplicidade (simplificada para focar na busca de preÃ§o):

    const possibleDuplicates = reportToUpdate?.investments.filter(inv => 

      inv.date === newInvestmentBase.date && 

      inv.amount === newInvestmentBase.amount && 

      inv.unit === newInvestmentBase.unit

    ) || [];



    if (possibleDuplicates.length > 0) {

      // Armazena os dados SEM o preÃ§o para o diÃ¡logo de confirmaÃ§Ã£o

      setPendingInvestment({ ...newInvestmentBase, id: Date.now().toString() }); // ID temporÃ¡rio

      setDuplicateConfirmInfo({

        type: 'investment',

        date: newInvestmentBase.date,

        amount: newInvestmentBase.amount,

        unit: newInvestmentBase.unit

      });

      setShowConfirmDuplicateDialog(true);

    } else {

      confirmAddInvestment(newInvestmentBase); // Passa os dados base sem ID e sem preÃ§o

    }

  };

  

  // FunÃ§Ã£o para confirmar adiÃ§Ã£o do investimento apÃ³s possÃ­vel duplicaÃ§Ã£o

  // Recebe os dados base do investimento (sem ID, sem preÃ§o na data)

  const confirmAddInvestment = async (investmentBaseData: Omit<Investment, "id" | "priceAtDate" | "priceAtDateCurrency" | "priceAtDateSource">) => {

    if (!activeReportIdFromHook) {

      toast({ title: "Erro", description: "Nenhum relatÃ³rio ativo para adicionar o aporte.", variant: "destructive" });

      return;

    }

    // A funÃ§Ã£o addInvestment do hook jÃ¡ lida com a adiÃ§Ã£o ao relatÃ³rio ativo

    const success = addInvestment(investmentBaseData); 

    

    if (success) {

      setInvestmentAmount(""); // Limpa o campo de valor

      // NÃ£o limpar a data do investimento, pode ser Ãºtil para registros sequenciais.

      // setInvestmentDate(new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 12, 0, 0)));

      // Limpar info do preÃ§o do dia na UI se desejar, ou deixar para o prÃ³ximo onSelect da data.

      setInvestmentDatePriceInfo({ price: null, loading: false, currency: displayCurrency, error: null, source: null });

    }

    

    setPendingInvestment(null);

    setDuplicateConfirmInfo(null);

    setShowConfirmDuplicateDialog(false);

  };



  const handleAddProfitRecordButtonClick = () => { // RENOMEADO para evitar conflito

    if (!profitAmount || isNaN(Number(profitAmount)) || Number(profitAmount) <= 0) {

      toast({

        title: "Valor invÃ¡lido",

        description: "Por favor, insira um valor vÃ¡lido maior que zero.",

        variant: "destructive",

      });

      return;

    }



    if (isFutureDate(profitDate)) {

      toast({

        title: "Data invÃ¡lida",

        description: `NÃ£o Ã© possÃ­vel registrar ${isProfit ? "lucros" : "perdas"} com data futura.`,

        variant: "destructive",

      });

        return;

    }



    let targetReportId = activeReportIdFromHook;

    if (!targetReportId) {

      if (!allReportsFromHook || allReportsFromHook.length === 0) {

         addReport("RelatÃ³rio PadrÃ£o");

         toast({ title: "RelatÃ³rio Criado", description: "Um 'RelatÃ³rio PadrÃ£o' foi criado. Tente adicionar o registro novamente.", variant: "default" });

         return;

      } else if (allReportsFromHook.length > 0 && !activeReportIdFromHook) {

        selectReport(allReportsFromHook[0].id);

        targetReportId = allReportsFromHook[0].id;

        toast({ title: "RelatÃ³rio Ativado", description: `RelatÃ³rio "${allReportsFromHook[0].name}" ativado. Tente adicionar o registro novamente.`, variant: "default" });

        return;

      } else {

         toast({ title: "Nenhum relatÃ³rio ativo", description: "Por favor, selecione um relatÃ³rio ou crie um novo.", variant: "warning" });

        return;

      }

    }

    

    const reportToUpdate = allReportsFromHook?.find(r => r.id === targetReportId);

    if (!reportToUpdate) {

        toast({ title: "Erro", description: "RelatÃ³rio alvo nÃ£o encontrado para adicionar registro de lucro.", variant: "destructive" });

        return;

    }



    const newProfitRecordBase: Omit<ProfitRecord, "id"> = {

      date: formatDateToUTC(profitDate),

      amount: Number(profitAmount),

      unit: profitUnit,

      isProfit: isProfit,

    };



    // ... (restante da lÃ³gica de adiÃ§Ã£o de registro de lucro) ...

  };

  

  // ... (restante do cÃ³digo) ...

}
