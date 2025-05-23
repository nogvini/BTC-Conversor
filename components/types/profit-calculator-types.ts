// Tipos de dados
export type CurrencyUnit = "BTC" | "SATS";
export type DisplayCurrency = "USD" | "BRL";

export interface Investment {
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

export interface ProfitRecord {
  id: string;
  originalId?: string;
  date: string;
  amount: number;
  unit: CurrencyUnit;
  isProfit: boolean;
}

// Nova interface para saques
export interface WithdrawalRecord {
  id: string;
  originalId?: string;
  date: string;
  amount: number;
  unit: CurrencyUnit;
  fee?: number; // Taxa do saque
  type?: 'onchain' | 'lightning'; // Tipo de saque
  txid?: string; // ID da transação
  // Campos para preço histórico
  priceAtDate?: number;
  priceAtDateCurrency?: DisplayCurrency;
  priceAtDateSource?: string;
}

export interface AppData {
  currentPrice: {
    usd: number;
    brl: number;
    isUsingCache?: boolean;
  };
  isUsingCache: boolean;
}

// Tipo para dados de relatório ativo com informações de sincronização
export interface ActiveReportData {
  id: string | undefined;
  report: Report | undefined;
  forceUpdateTrigger: number;
}

// Handlers de sincronização para operações CRUD
export interface SyncHandlers {
  onInvestmentAdd?: (date: string, amount: number, unit: CurrencyUnit) => any;
  onProfitAdd?: (date: string, amount: number, unit: CurrencyUnit, isProfit: boolean) => any;
  onInvestmentDelete?: (id: string) => boolean;
  onProfitDelete?: (id: string) => boolean;
  onInvestmentsUpdate?: (investments: Investment[]) => boolean;
  onProfitsUpdate?: (profits: ProfitRecord[]) => boolean;
}

export interface ProfitCalculatorProps {
  btcToUsd: number;
  brlToUsd: number;
  appData?: AppData;
  // Novas props para sincronização em tempo real
  activeReportData?: ActiveReportData;
  // Handlers opcionais para operações sincronizadas
  onInvestmentAdd?: (date: string, amount: number, unit: CurrencyUnit) => any;
  onProfitAdd?: (date: string, amount: number, unit: CurrencyUnit, isProfit: boolean) => any;
  onInvestmentDelete?: (id: string) => boolean;
  onProfitDelete?: (id: string) => boolean;
  onInvestmentsUpdate?: (investments: Investment[]) => boolean;
  onProfitsUpdate?: (profits: ProfitRecord[]) => boolean;
}

export interface MonthlyData {
  label: string;
  investments: Investment[];
  investmentTotalBtc: number;
  profits: ProfitRecord[];
  profitTotalBtc: number;
  withdrawals: WithdrawalRecord[];
  withdrawalTotalBtc: number;
}

export interface ImportStats {
  total: number;
  success: number;
  error: number;
  duplicated?: number;
}

export interface Report {
  id: string;
  name: string;
  description?: string;
  investments: Investment[];
  profits: ProfitRecord[];
  withdrawals: WithdrawalRecord[];
  color?: string;
  createdAt: string;
  updatedAt: string;
  lastUpdated?: string; // Timestamp da última atualização para sincronização
  
  // NOVO: Associação com configuração LN Markets
  associatedLNMarketsConfigId?: string; // ID da configuração LN Markets associada
  associatedLNMarketsConfigName?: string; // Nome da configuração (cache para UI)
}

export interface ExportOptions {
  exportFormat: 'excel' | 'pdf';
  reportSelectionType: 'active' | 'history' | 'manual';
  manualSelectedReportIds?: string[];
  periodSelectionType: 'all' | 'historyFilter' | 'specificMonth' | 'customRange';
  specificMonthDate?: Date | null;
  customStartDate?: Date | null;
  customEndDate?: Date | null;
  includeCharts?: boolean;
  includeSummarySection?: boolean;
  includeInvestmentsTableSection?: boolean;
  includeProfitsTableSection?: boolean;
  includeWithdrawalsTableSection?: boolean; // Nova seção para saques
  pdfDarkMode?: boolean;
}

export interface DatePriceInfo {
  price: number | null;
  loading: boolean;
  currency: DisplayCurrency | null;
  error?: string | null;
  source?: string | null;
}

// Tipo para controle de sincronização
export interface SyncState {
  lastUpdate: number;
  lastReportId: string | null;
  lastDataHash: string | null;
  isStale: boolean;
} 