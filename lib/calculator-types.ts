// Tipos de moeda e exibição
export type CurrencyUnit = "BTC" | "SATS";
export type DisplayCurrency = "USD" | "BRL";

// Interface para informação de origem de dados
export interface DataSourceInfo {
  configId: string;
  configName: string;
  importDate: string;
  recordType: 'trade' | 'deposit' | 'withdrawal';
}

// Interface para investimentos individuais
export interface Investment {
  id: string;
  originalId?: string;
  date: string;
  amount: number;
  unit: CurrencyUnit;
  
  // Campos para rastreamento da origem do dado
  sourceConfigId?: string;
  sourceConfigName?: string;
  importedAt?: string;
}

// Interface para registros de lucro/perda
export interface ProfitRecord {
  id: string;
  originalId?: string;
  date: string;
  amount: number;
  unit: CurrencyUnit;
  isProfit: boolean;
  
  // Campos para rastreamento da origem do dado
  sourceConfigId?: string;
  sourceConfigName?: string;
  importedAt?: string;
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
  destination?: 'wallet' | 'exchange'; // Destino do saque
  // Campos para preço histórico
  priceAtDate?: number;
  priceAtDateCurrency?: DisplayCurrency;
  priceAtDateSource?: string;
  
  // Campos para rastreamento da origem do dado
  sourceConfigId?: string;
  sourceConfigName?: string;
  importedAt?: string;
}

// Interface para dados de um relatório individual
export interface Report {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  lastUpdated?: string; // Timestamp da última atualização para sincronização
  investments: Investment[];
  profits: ProfitRecord[];
  withdrawals: WithdrawalRecord[];
  color?: string; // Cor para identificação visual nos gráficos comparativos
  icon?: string; // Ícone opcional para identificação visual
  isActive?: boolean; // Indica se é o relatório atualmente selecionado
  
  // Suporte para múltiplas APIs
  associatedLNMarketsConfigId?: string; // [LEGADO] ID da configuração LN Markets associada
  associatedLNMarketsConfigName?: string; // [LEGADO] Nome da configuração (cache para UI)
  
  // NOVO: Suporte para múltiplas configurações de API
  associatedLNMarketsConfigIds?: string[]; // Lista de IDs de APIs associadas
  lastUsedConfigId?: string; // Última API utilizada
  dataSourceMapping?: Record<string, DataSourceInfo>; // Mapeamento detalhado de origem dos dados
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

// Interface para estatísticas de API por relatório
export interface APIUsageStats {
  configId: string;
  configName: string;
  tradesCount: number;
  depositsCount: number;
  withdrawalsCount: number;
  totalRecords: number;
  lastUsed?: string;
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
    isActive: true,
    associatedLNMarketsConfigIds: [], // Inicializa como array vazio
    dataSourceMapping: {} // Inicializa como objeto vazio
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

// NOVA: Função para migrar relatórios para o formato de múltiplas APIs
export function migrateReportToMultipleAPIs(report: Report): Report {
  // Fazer uma cópia profunda do relatório para não modificar o original
  const updatedReport = JSON.parse(JSON.stringify(report)) as Report;
  
  // Inicializar novos campos se não existirem
  if (!updatedReport.associatedLNMarketsConfigIds) {
    updatedReport.associatedLNMarketsConfigIds = [];
  }
  
  if (!updatedReport.dataSourceMapping) {
    updatedReport.dataSourceMapping = {};
  }
  
  // Migrar configuração única para o array de configurações se existir
  if (updatedReport.associatedLNMarketsConfigId && 
      !updatedReport.associatedLNMarketsConfigIds.includes(updatedReport.associatedLNMarketsConfigId)) {
    updatedReport.associatedLNMarketsConfigIds.push(updatedReport.associatedLNMarketsConfigId);
    
    // Definir como última configuração usada se não estiver definida
    if (!updatedReport.lastUsedConfigId) {
      updatedReport.lastUsedConfigId = updatedReport.associatedLNMarketsConfigId;
    }
  }
  
  // Atualizar a data de atualização
  updatedReport.updatedAt = new Date().toISOString();
  
  return updatedReport;
}

// NOVA: Função utilitária para obter configurações utilizadas em um relatório
export function getUsedConfigIds(report: Report): string[] {
  if (!report) return [];
  
  // Mesclar IDs das fontes dos registros com IDs associadas
  const configIds = new Set<string>();
  
  // Adicionar IDs associadas explicitamente
  if (report.associatedLNMarketsConfigIds && report.associatedLNMarketsConfigIds.length > 0) {
    report.associatedLNMarketsConfigIds.forEach(id => configIds.add(id));
  }
  
  // Adicionar ID legado se existir e não estiver no array novo
  if (report.associatedLNMarketsConfigId && !configIds.has(report.associatedLNMarketsConfigId)) {
    configIds.add(report.associatedLNMarketsConfigId);
  }
  
  // Adicionar IDs de fontes de investimentos
  if (report.investments) {
    report.investments.forEach(investment => {
      if (investment.sourceConfigId) {
        configIds.add(investment.sourceConfigId);
      }
    });
  }
  
  // Adicionar IDs de fontes de lucros
  if (report.profits) {
    report.profits.forEach(profit => {
      if (profit.sourceConfigId) {
        configIds.add(profit.sourceConfigId);
      }
    });
  }
  
  // Adicionar IDs de fontes de saques
  if (report.withdrawals) {
    report.withdrawals.forEach(withdrawal => {
      if (withdrawal.sourceConfigId) {
        configIds.add(withdrawal.sourceConfigId);
      }
    });
  }
  
  return Array.from(configIds);
}

// NOVA: Função utilitária para obter estatísticas de uso por API
export function getConfigUsageStats(report: Report): APIUsageStats[] {
  if (!report) return [];
  
  const stats: Record<string, APIUsageStats> = {};
  
  // Processar investimentos
  report.investments?.forEach(investment => {
    if (investment.sourceConfigId && investment.sourceConfigName) {
      if (!stats[investment.sourceConfigId]) {
        stats[investment.sourceConfigId] = {
          configId: investment.sourceConfigId,
          configName: investment.sourceConfigName,
          tradesCount: 0,
          depositsCount: 0,
          withdrawalsCount: 0,
          totalRecords: 0,
          lastUsed: investment.importedAt
        };
      }
      
      stats[investment.sourceConfigId].depositsCount++;
      stats[investment.sourceConfigId].totalRecords++;
      
      // Atualizar última data de uso se for mais recente
      if (investment.importedAt && (!stats[investment.sourceConfigId].lastUsed || 
          new Date(investment.importedAt) > new Date(stats[investment.sourceConfigId].lastUsed!))) {
        stats[investment.sourceConfigId].lastUsed = investment.importedAt;
      }
    }
  });
  
  // Processar lucros/perdas
  report.profits?.forEach(profit => {
    if (profit.sourceConfigId && profit.sourceConfigName) {
      if (!stats[profit.sourceConfigId]) {
        stats[profit.sourceConfigId] = {
          configId: profit.sourceConfigId,
          configName: profit.sourceConfigName,
          tradesCount: 0,
          depositsCount: 0,
          withdrawalsCount: 0,
          totalRecords: 0,
          lastUsed: profit.importedAt
        };
      }
      
      stats[profit.sourceConfigId].tradesCount++;
      stats[profit.sourceConfigId].totalRecords++;
      
      // Atualizar última data de uso se for mais recente
      if (profit.importedAt && (!stats[profit.sourceConfigId].lastUsed || 
          new Date(profit.importedAt) > new Date(stats[profit.sourceConfigId].lastUsed!))) {
        stats[profit.sourceConfigId].lastUsed = profit.importedAt;
      }
    }
  });
  
  // Processar saques
  report.withdrawals?.forEach(withdrawal => {
    if (withdrawal.sourceConfigId && withdrawal.sourceConfigName) {
      if (!stats[withdrawal.sourceConfigId]) {
        stats[withdrawal.sourceConfigId] = {
          configId: withdrawal.sourceConfigId,
          configName: withdrawal.sourceConfigName,
          tradesCount: 0,
          depositsCount: 0,
          withdrawalsCount: 0,
          totalRecords: 0,
          lastUsed: withdrawal.importedAt
        };
      }
      
      stats[withdrawal.sourceConfigId].withdrawalsCount++;
      stats[withdrawal.sourceConfigId].totalRecords++;
      
      // Atualizar última data de uso se for mais recente
      if (withdrawal.importedAt && (!stats[withdrawal.sourceConfigId].lastUsed || 
          new Date(withdrawal.importedAt) > new Date(stats[withdrawal.sourceConfigId].lastUsed!))) {
        stats[withdrawal.sourceConfigId].lastUsed = withdrawal.importedAt;
      }
    }
  });
  
  // Converter para array e ordenar por número total de registros
  return Object.values(stats).sort((a, b) => b.totalRecords - a.totalRecords);
}

// NOVA: Função para obter a última configuração utilizada
export function getLastUsedConfigId(report: Report): string | null {
  if (!report) return null;
  
  // Se já tiver o lastUsedConfigId definido, retornar
  if (report.lastUsedConfigId) {
    return report.lastUsedConfigId;
  }
  
  // Obter estatísticas de uso e verificar a mais recente
  const stats = getConfigUsageStats(report);
  if (stats.length === 0) {
    // Se não houver estatísticas, retornar configuração associada legada
    return report.associatedLNMarketsConfigId || null;
  }
  
  // Ordenar por data de uso mais recente
  const sortedByDate = [...stats].sort((a, b) => {
    if (!a.lastUsed) return 1;
    if (!b.lastUsed) return -1;
    return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
  });
  
  return sortedByDate[0].configId;
} 