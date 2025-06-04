export interface ImportProgress {
  current: number;
  total: number;
  percentage: number;
  status: 'idle' | 'loading' | 'complete' | 'error';
  message?: string;
}

export interface ImportProgressState {
  trades: ImportProgress;
  deposits: ImportProgress;
  withdrawals: ImportProgress;
}

export interface LNMarketsImportStats {
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

export type HistoryFilterPeriod = "1m" | "3m" | "6m" | "1y" | "all" | "custom";
export type HistoryViewMode = "active" | "all";

export interface ChartDataPoint {
  date: string;
  investments: number;
  profits: number;
  balance: number;
  month: string;
}

// Props base para todos os componentes modulares
export interface ProfitCalculatorBaseProps {
  btcToUsd: number;
  brlToUsd: number;
  effectiveActiveReport: any;
  effectiveActiveReportId: string | null;
} 