/**
 * Metadados do relatório exportado.
 */
export interface ReportMetadata {
  reportName: string;
  periodDescription: string; // Ex: "Janeiro 2024", "2023 Completo", "Últimos 30 dias"
  generationDate: string; // ISO 8601 date string
  currencyDisplayUnit: 'BRL' | 'USD' | 'BTC'; // Moeda principal para exibição de totais
}

/**
 * Representa uma única operação (compra/venda)
 * Esta interface pode precisar ser alinhada com tipos existentes no projeto.
 */
export interface OperationData {
  id: string;
  originalId?: string; // ID original do Investment ou ProfitRecord
  date: string; // ISO 8601 date string
  type: 'buy' | 'sell';
  asset: string; // Ex: "BTC"
  quantity: number; // Quantidade em BTC
  
  // Preço do ativo (BTC) no momento da transação e valor total da transação nessa cotação
  pricePerUnitUSD?: number; // Preço do BTC em USD no dia da transação
  totalAmountUSD?: number;  // quantity * pricePerUnitUSD
  pricePerUnitBRL?: number; // Preço do BTC em BRL no dia da transação
  totalAmountBRL?: number;  // quantity * pricePerUnitBRL
  
  isProfitContext?: boolean; // Para ProfitRecord, indica se a operação foi um lucro em termos de BTC
  // O campo 'currency' foi removido; os valores são explicitamente em USD e BRL.
  // A moeda principal de exibição do relatório virá de ReportMetadata.currencyDisplayUnit.
}

/**
 * Representa uma cotação de ativo em um determinado momento.
 */
export interface QuotationData {
  date: string; // ISO 8601 date string
  asset: string; // Ex: "BTC"
  price: number;
  currency: 'BRL' | 'USD'; // Moeda da cotação
}

/**
 * Dados calculados para o relatório.
 */
export interface CalculatedReportData {
  roiMonthly: Array<{ month: string; percentage: number }>; // Ex: [{ month: "Jan/2024", percentage: 5.2 }]
  roiAccumulated: number; // Percentual
  
  // Lucro/Prejuízo detalhado do período
  realizedPeriodProfitLoss: number; // Lucro/Prejuízo das operações de compra e venda
  unrealizedPeriodProfitLoss: number; // Lucro/Prejuízo pela valorização/desvalorização do saldo em carteira
  overallPeriodProfitLoss: number; // Soma de realized e unrealized P/L
  
  totalInvestments: number; // Total de aportes no período (em valor da moeda principal)
  totalWithdrawals?: number; // Total de retiradas/vendas (em valor da moeda principal) - opcional, pode ser derivado
  
  totalBalance: { // Saldo final do período
    brl: number;
    usd: number;
    btc: number;
  };
  
  totalInvestmentsInDisplayCurrency: number;
  totalWithdrawalsInDisplayCurrency: number;
  finalBtcBalance: number;
  finalPortfolioValueInUSD: number;
  finalPortfolioValueInBRL: number;
  realizedPeriodProfitLossInDisplayCurrency: number;
  unrealizedPeriodProfitLossInDisplayCurrency: number;
  overallPeriodProfitLossInDisplayCurrency: number;
  cumulativePeriodROI: number;
  monthlyBreakdown: MonthlyBreakdown[];
}

/**
 * Configuração para um gráfico individual no relatório.
 */
export interface ChartConfiguration {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie'; // Tipos de gráfico suportados
  dataKeys: {
    xAxis: string; // Chave do objeto de dados para o eixo X
    yAxis: string[]; // Chave(s) do objeto de dados para o eixo Y
  };
  // data?: any[]; // Os dados específicos para este gráfico seriam passados separadamente ou referenciados
}

/**
 * Estrutura principal do relatório exportado.
 */
export interface ExportedReport {
  metadata: ReportMetadata;
  data: CalculatedReportData;
  operations: OperationData[];
  quotations?: QuotationData[]; // Cotações podem ser opcionais dependendo do tipo de relatório
  charts?: ChartConfiguration[]; // Configurações dos gráficos a serem incluídos
  chartsSvg?: { // Para SVGs renderizados no servidor
    monthlyPL?: string; // SVG como string para o gráfico de P/L Mensal
    portfolioEvolution?: string; // SVG como string para o gráfico de Evolução do Portfólio
    // Adicionar outros SVGs de gráficos conforme necessário
  };
  // Adicionar aqui quaisquer outras seções ou dados necessários
}

// Exemplo de como poderia ser uma lista de dados para um gráfico:
// interface ChartDataPoint {
//   date: string; // ou 'month', 'category', etc.
//   value: number;
//   value2?: number; // para gráficos com múltiplas linhas/barras
// } 