// Tipos de moeda e exibição
export type CurrencyUnit = "BTC" | "SATS";
export type DisplayCurrency = "USD" | "BRL";

// Interface para investimentos individuais
export interface Investment {
  id: string;
  originalId?: string;
  date: string;
  amount: number;
  unit: CurrencyUnit;
}

// Interface para registros de lucro/perda
export interface ProfitRecord {
  id: string;
  originalId?: string;
  date: string;
  amount: number;
  unit: CurrencyUnit;
  isProfit: boolean;
}

// Interface para registros de saque
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

// Interface para dados de um relatório individual
export interface Report {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  investments: Investment[];
  profits: ProfitRecord[];
  withdrawals: WithdrawalRecord[];
  color?: string; // Cor para identificação visual nos gráficos comparativos
  icon?: string; // Ícone opcional para identificação visual
  isActive?: boolean; // Indica se é o relatório atualmente selecionado
  
  // NOVO: Associação com configuração LN Markets
  associatedLNMarketsConfigId?: string; // ID da configuração LN Markets associada
  associatedLNMarketsConfigName?: string; // Nome da configuração (cache para UI)
}

// Interface para a coleção de relatórios
export interface ReportCollection {
  reports: Report[];
  activeReportId?: string; // ID do relatório atualmente selecionado
  lastUpdated: string;
  version: string; // Para controle de versão da estrutura de dados
}

// Interface para dados de comparação entre relatórios
export interface ReportComparison {
  totalInvestments: Record<string, number>; // reportId -> valor total investido em BTC
  totalProfits: Record<string, number>; // reportId -> valor total de lucros em BTC
  roi: Record<string, number>; // reportId -> ROI percentual
  timeline: {
    labels: string[]; // Rótulos para as datas (ex: meses)
    datasets: Array<{
      reportId: string;
      reportName: string;
      color: string;
      investments: number[]; // Valores acumulados de investimentos
      profits: number[]; // Valores acumulados de lucros
    }>;
  };
}

// Interface para estatísticas de importação/exportação
export interface ImportExportStats {
  total: number;
  success: number;
  error: number;
  duplicated?: number;
}

// Constantes para o armazenamento local
export const STORAGE_KEYS = {
  REPORTS_COLLECTION: "bitcoinReportsCollection",
  DISPLAY_CURRENCY: "bitcoinDisplayCurrency",
  LAST_ACTIVE_REPORT: "bitcoinLastActiveReport",
  
  // Para compatibilidade com a versão anterior
  LEGACY_INVESTMENTS: "bitcoinInvestments",
  LEGACY_PROFITS: "bitcoinProfits"
};

// Função utilitária para gerar IDs únicos para relatórios e registros
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// Função utilitária para criar um novo relatório vazio
export function createNewReport(name: string, description?: string): Report {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name,
    description,
    createdAt: now,
    updatedAt: now,
    investments: [],
    profits: [],
    withdrawals: [],
    color: getRandomColor(),
    isActive: true
  };
}

// Função utilitária para gerar cores aleatórias para relatórios
function getRandomColor(): string {
  const colors = [
    "#8844ee", // Roxo principal
    "#6633cc", // Roxo mais escuro
    "#aa66ff", // Roxo mais claro
    "#4488dd", // Azul
    "#22aacc", // Ciano
    "#ff6644", // Vermelho
    "#ffaa22", // Laranja
    "#44bb88", // Verde
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Função para migrar dados do formato antigo para o novo formato de múltiplos relatórios
export function migrateFromLegacyData(): ReportCollection | null {
  try {
    const legacyInvestments = localStorage.getItem(STORAGE_KEYS.LEGACY_INVESTMENTS);
    const legacyProfits = localStorage.getItem(STORAGE_KEYS.LEGACY_PROFITS);

    if (!legacyInvestments && !legacyProfits) {
      return null;
    }

    const investments = legacyInvestments ? JSON.parse(legacyInvestments) : [];
    const profits = legacyProfits ? JSON.parse(legacyProfits) : [];

    const defaultReport = createNewReport("Relatório Principal", "Migrado do formato anterior");
    defaultReport.investments = investments;
    defaultReport.profits = profits;

    const reportCollection: ReportCollection = {
      reports: [defaultReport],
      activeReportId: defaultReport.id,
      lastUpdated: new Date().toISOString(),
      version: "1.0.0"
    };

    return reportCollection;
  } catch (error) {
    console.error("Erro ao migrar dados legados:", error);
    return null;
  }
} 