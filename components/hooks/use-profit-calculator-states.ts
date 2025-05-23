import { useState } from "react";
import type { 
  CurrencyUnit, 
  DisplayCurrency, 
  ImportStats, 
  DatePriceInfo 
} from "../types/profit-calculator-types";

export const useProfitCalculatorStates = () => {
  // Estados principais
  const [activeTab, setActiveTab] = useState<string>("register");
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("USD");
  const [currentRates, setCurrentRates] = useState({ btcToUsd: 65000, brlToUsd: 5.2 });
  const [loading, setLoading] = useState(false);
  const [usingFallbackRates, setUsingFallbackRates] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Estados para investimentos
  const [investmentAmount, setInvestmentAmount] = useState<string>("");
  const [investmentUnit, setInvestmentUnit] = useState<CurrencyUnit>("SATS");
  const [investmentDate, setInvestmentDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0));
  });

  // Estados para lucros/perdas
  const [profitAmount, setProfitAmount] = useState<string>("");
  const [profitUnit, setProfitUnit] = useState<CurrencyUnit>("SATS");
  const [profitDate, setProfitDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0));
  });
  const [isProfit, setIsProfit] = useState<boolean>(true);

  // Estados para filtros e histórico
  const [filterMonth, setFilterMonth] = useState<Date>(new Date());
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [selectedReportIdsForHistoryView, setSelectedReportIdsForHistoryView] = useState<string[]>([]);
  const [historyFilterType, setHistoryFilterType] = useState<'month' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);

  // Estados para exportação
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [useExportDialog, setUseExportDialog] = useState(false);
  const [showAdvancedExportDialog, setShowAdvancedExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
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

  // Estados para importação
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [importType, setImportType] = useState<"excel" | "csv" | "internal" | "investment-csv" | null>(null);

  // Estados para dialogs
  const [showDeleteInvestmentsDialog, setShowDeleteInvestmentsDialog] = useState(false);
  const [showDeleteProfitsDialog, setShowDeleteProfitsDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{count: number, type: string} | null>(null);
  const [showConfirmDuplicateDialog, setShowConfirmDuplicateDialog] = useState(false);
  const [duplicateConfirmInfo, setDuplicateConfirmInfo] = useState<{
    type: 'investment' | 'profit',
    date: string,
    amount: number,
    unit: CurrencyUnit
  } | null>(null);

  // Estados para relatórios
  const [reportNameInput, setReportNameInput] = useState("");
  const [showCreateReportDialog, setShowCreateReportDialog] = useState(false);

  // Estados para preços históricos
  const [investmentDatePriceInfo, setInvestmentDatePriceInfo] = useState<DatePriceInfo>({ 
    price: null, 
    loading: false, 
    currency: null, 
    error: null, 
    source: null 
  });
  const [profitDatePriceInfo, setProfitDatePriceInfo] = useState<DatePriceInfo>({ 
    price: null, 
    loading: false, 
    currency: null, 
    error: null, 
    source: null 
  });

  // Estados para edição de relatórios
  const [isEditingActiveReport, setIsEditingActiveReport] = useState(false);
  const [editingActiveReportName, setEditingActiveReportName] = useState("");
  const [editingActiveReportDescription, setEditingActiveReportDescription] = useState("");

  // Estados auxiliares
  const [toastDebounce, setToastDebounce] = useState(false);

  return {
    // Estados principais
    activeTab, setActiveTab,
    selectedMonth, setSelectedMonth,
    displayCurrency, setDisplayCurrency,
    currentRates, setCurrentRates,
    loading, setLoading,
    usingFallbackRates, setUsingFallbackRates,
    isExporting, setIsExporting,

    // Estados para investimentos
    investmentAmount, setInvestmentAmount,
    investmentUnit, setInvestmentUnit,
    investmentDate, setInvestmentDate,

    // Estados para lucros/perdas
    profitAmount, setProfitAmount,
    profitUnit, setProfitUnit,
    profitDate, setProfitDate,
    isProfit, setIsProfit,

    // Estados para filtros e histórico
    filterMonth, setFilterMonth,
    showFilterOptions, setShowFilterOptions,
    selectedReportIdsForHistoryView, setSelectedReportIdsForHistoryView,
    historyFilterType, setHistoryFilterType,
    customStartDate, setCustomStartDate,
    customEndDate, setCustomEndDate,

    // Estados para exportação
    showExportOptions, setShowExportOptions,
    useExportDialog, setUseExportDialog,
    showAdvancedExportDialog, setShowAdvancedExportDialog,
    exportFormat, setExportFormat,
    exportReportSelectionType, setExportReportSelectionType,
    manualSelectedReportIdsForExport, setManualSelectedReportIdsForExport,
    exportPeriodSelectionType, setExportPeriodSelectionType,
    exportSpecificMonthDate, setExportSpecificMonthDate,
    exportCustomStartDateForRange, setExportCustomStartDateForRange,
    exportCustomEndDateForRange, setExportCustomEndDateForRange,
    exportIncludeCharts, setExportIncludeCharts,
    exportIncludeSummarySection, setExportIncludeSummarySection,
    exportIncludeInvestmentsTableSection, setExportIncludeInvestmentsTableSection,
    exportIncludeProfitsTableSection, setExportIncludeProfitsTableSection,
    exportPdfDarkMode, setExportPdfDarkMode,

    // Estados para importação
    isImporting, setIsImporting,
    importStats, setImportStats,
    importType, setImportType,

    // Estados para dialogs
    showDeleteInvestmentsDialog, setShowDeleteInvestmentsDialog,
    showDeleteProfitsDialog, setShowDeleteProfitsDialog,
    showDuplicateDialog, setShowDuplicateDialog,
    duplicateInfo, setDuplicateInfo,
    showConfirmDuplicateDialog, setShowConfirmDuplicateDialog,
    duplicateConfirmInfo, setDuplicateConfirmInfo,

    // Estados para relatórios
    reportNameInput, setReportNameInput,
    showCreateReportDialog, setShowCreateReportDialog,

    // Estados para preços históricos
    investmentDatePriceInfo, setInvestmentDatePriceInfo,
    profitDatePriceInfo, setProfitDatePriceInfo,

    // Estados para edição de relatórios
    isEditingActiveReport, setIsEditingActiveReport,
    editingActiveReportName, setEditingActiveReportName,
    editingActiveReportDescription, setEditingActiveReportDescription,

    // Estados auxiliares
    toastDebounce, setToastDebounce,
  };
}; 