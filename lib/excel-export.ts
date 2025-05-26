import { Report, Investment, ProfitRecord, WithdrawalRecord } from './calculator-types';
import { utils, write } from 'xlsx';

// Interface para opções de exportação
export interface ExcelExportOptions {
  includeInvestments: boolean;
  includeProfits: boolean;
  includeWithdrawals: boolean;
  includeSummary: boolean;
  includeMonthlyBreakdown: boolean;
  currency: 'USD' | 'BRL';
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

// Função para converter moeda
const convertToBtc = (amount: number, unit: 'BTC' | 'SATS'): number => {
  return unit === 'SATS' ? amount / 100000000 : amount;
};

// Função para formatar moeda
const formatCurrency = (value: number, currency: 'USD' | 'BRL'): string => {
  return new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-US', {
    style: 'currency',
    currency: currency,
  }).format(value);
};

// Função para criar a planilha Excel
export async function generateExcelReport(
  report: Report,
  btcToUsd: number,
  brlToUsd: number,
  options: ExcelExportOptions
): Promise<Blob> {
  // Criar um novo workbook
  const wb = utils.book_new();
  
  // Preparar os dados
  const investments = options.includeInvestments ? prepareInvestmentsData(report.investments, btcToUsd, brlToUsd, options.currency) : [];
  const profits = options.includeProfits ? prepareProfitsData(report.profits, btcToUsd, brlToUsd, options.currency) : [];
  const withdrawals = options.includeWithdrawals ? prepareWithdrawalsData(report.withdrawals || [], btcToUsd, brlToUsd, options.currency) : [];
  
  // Adicionar as planilhas
  if (options.includeSummary) {
    const summaryData = prepareSummaryData(report, btcToUsd, brlToUsd, options.currency);
    const summarySheet = utils.json_to_sheet(summaryData);
    utils.book_append_sheet(wb, summarySheet, 'Resumo');
  }
  
  if (options.includeInvestments && investments.length > 0) {
    const investmentsSheet = utils.json_to_sheet(investments);
    utils.book_append_sheet(wb, investmentsSheet, 'Investimentos');
  }
  
  if (options.includeProfits && profits.length > 0) {
    const profitsSheet = utils.json_to_sheet(profits);
    utils.book_append_sheet(wb, profitsSheet, 'Lucros_Perdas');
  }
  
  if (options.includeWithdrawals && withdrawals.length > 0) {
    const withdrawalsSheet = utils.json_to_sheet(withdrawals);
    utils.book_append_sheet(wb, withdrawalsSheet, 'Saques');
  }
  
  if (options.includeMonthlyBreakdown) {
    const monthlyData = prepareMonthlyBreakdownData(report, btcToUsd, brlToUsd, options.currency);
    if (monthlyData.length > 0) {
      const monthlySheet = utils.json_to_sheet(monthlyData);
      utils.book_append_sheet(wb, monthlySheet, 'Mensal');
    }
  }
  
  // Converter para blob
  const excelBuffer = write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Função para preparar dados de investimentos
function prepareInvestmentsData(
  investments: Investment[], 
  btcToUsd: number, 
  brlToUsd: number, 
  currency: 'USD' | 'BRL'
): any[] {
  return investments.map(inv => {
    const btcAmount = convertToBtc(inv.amount, inv.unit);
    const usdValue = btcAmount * btcToUsd;
    const currencyValue = currency === 'BRL' ? usdValue * brlToUsd : usdValue;
    
    return {
      'Data': new Date(inv.date).toLocaleDateString('pt-BR'),
      'Quantidade': inv.amount,
      'Unidade': inv.unit,
      'Valor (BTC)': btcAmount.toFixed(8),
      [`Valor (${currency})`]: formatCurrency(currencyValue, currency)
    };
  });
}

// Função para preparar dados de lucros/perdas
function prepareProfitsData(
  profits: ProfitRecord[], 
  btcToUsd: number, 
  brlToUsd: number, 
  currency: 'USD' | 'BRL'
): any[] {
  return profits.map(profit => {
    const btcAmount = convertToBtc(profit.amount, profit.unit);
    const usdValue = btcAmount * btcToUsd;
    const currencyValue = currency === 'BRL' ? usdValue * brlToUsd : usdValue;
    
    return {
      'Data': new Date(profit.date).toLocaleDateString('pt-BR'),
      'Tipo': profit.isProfit ? 'Lucro' : 'Perda',
      'Quantidade': profit.amount,
      'Unidade': profit.unit,
      'Valor (BTC)': btcAmount.toFixed(8),
      [`Valor (${currency})`]: formatCurrency(currencyValue, currency)
    };
  });
}

// Função para preparar dados de saques
function prepareWithdrawalsData(
  withdrawals: WithdrawalRecord[], 
  btcToUsd: number, 
  brlToUsd: number, 
  currency: 'USD' | 'BRL'
): any[] {
  return withdrawals.map(withdrawal => {
    const btcAmount = convertToBtc(withdrawal.amount, withdrawal.unit);
    const usdValue = btcAmount * btcToUsd;
    const currencyValue = currency === 'BRL' ? usdValue * brlToUsd : usdValue;
    
    return {
      'Data': new Date(withdrawal.date).toLocaleDateString('pt-BR'),
      'Quantidade': withdrawal.amount,
      'Unidade': withdrawal.unit,
      'Valor (BTC)': btcAmount.toFixed(8),
      [`Valor (${currency})`]: formatCurrency(currencyValue, currency),
      'Tipo': withdrawal.type || 'N/A',
      'Taxa': withdrawal.fee ? formatCurrency(withdrawal.fee, currency) : 'N/A'
    };
  });
}

// Função para preparar resumo geral
function prepareSummaryData(
  report: Report, 
  btcToUsd: number, 
  brlToUsd: number, 
  currency: 'USD' | 'BRL'
): any[] {
  // Calcular totais
  let totalInvestmentsBTC = 0;
  let totalProfitsBTC = 0;
  let totalWithdrawalsBTC = 0;
  
  report.investments.forEach(inv => {
    totalInvestmentsBTC += convertToBtc(inv.amount, inv.unit);
  });
  
  report.profits.forEach(profit => {
    const btcAmount = convertToBtc(profit.amount, profit.unit);
    totalProfitsBTC += profit.isProfit ? btcAmount : -btcAmount;
  });
  
  (report.withdrawals || []).forEach(withdrawal => {
    totalWithdrawalsBTC += convertToBtc(withdrawal.amount, withdrawal.unit);
  });
  
  const balanceBTC = totalInvestmentsBTC + totalProfitsBTC - totalWithdrawalsBTC;
  const balanceUSD = balanceBTC * btcToUsd;
  const balanceCurrency = currency === 'BRL' ? balanceUSD * brlToUsd : balanceUSD;
  
  const totalInvestmentsUSD = totalInvestmentsBTC * btcToUsd;
  const totalInvestmentsCurrency = currency === 'BRL' ? totalInvestmentsUSD * brlToUsd : totalInvestmentsUSD;
  
  const totalProfitsUSD = totalProfitsBTC * btcToUsd;
  const totalProfitsCurrency = currency === 'BRL' ? totalProfitsUSD * brlToUsd : totalProfitsUSD;
  
  const totalWithdrawalsUSD = totalWithdrawalsBTC * btcToUsd;
  const totalWithdrawalsCurrency = currency === 'BRL' ? totalWithdrawalsUSD * brlToUsd : totalWithdrawalsUSD;
  
  // Calcular ROI
  const roi = totalInvestmentsBTC > 0 
    ? ((balanceBTC + totalWithdrawalsBTC) / totalInvestmentsBTC - 1) * 100 
    : 0;
  
  return [
    { 'Métricas': 'Nome do Relatório', 'Valores': report.name },
    { 'Métricas': 'Última Atualização', 'Valores': new Date(report.updatedAt).toLocaleDateString('pt-BR') },
    { 'Métricas': 'Total de Aportes (BTC)', 'Valores': totalInvestmentsBTC.toFixed(8) },
    { 'Métricas': `Total de Aportes (${currency})`, 'Valores': formatCurrency(totalInvestmentsCurrency, currency) },
    { 'Métricas': 'Total de Lucros/Perdas (BTC)', 'Valores': totalProfitsBTC.toFixed(8) },
    { 'Métricas': `Total de Lucros/Perdas (${currency})`, 'Valores': formatCurrency(totalProfitsCurrency, currency) },
    { 'Métricas': 'Total de Saques (BTC)', 'Valores': totalWithdrawalsBTC.toFixed(8) },
    { 'Métricas': `Total de Saques (${currency})`, 'Valores': formatCurrency(totalWithdrawalsCurrency, currency) },
    { 'Métricas': 'Saldo Final (BTC)', 'Valores': balanceBTC.toFixed(8) },
    { 'Métricas': `Saldo Final (${currency})`, 'Valores': formatCurrency(balanceCurrency, currency) },
    { 'Métricas': 'ROI', 'Valores': `${roi.toFixed(2)}%` }
  ];
}

// Função para preparar detalhamento mensal
function prepareMonthlyBreakdownData(
  report: Report, 
  btcToUsd: number, 
  brlToUsd: number, 
  currency: 'USD' | 'BRL'
): any[] {
  // Criar um mapa de operações por mês
  const monthlyData = new Map<string, {
    investments: number;
    profits: number;
    withdrawals: number;
  }>();
  
  // Processar investimentos
  report.investments.forEach(inv => {
    const date = new Date(inv.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, { investments: 0, profits: 0, withdrawals: 0 });
    }
    
    const data = monthlyData.get(monthKey)!;
    data.investments += convertToBtc(inv.amount, inv.unit);
  });
  
  // Processar lucros/perdas
  report.profits.forEach(profit => {
    const date = new Date(profit.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, { investments: 0, profits: 0, withdrawals: 0 });
    }
    
    const data = monthlyData.get(monthKey)!;
    const btcAmount = convertToBtc(profit.amount, profit.unit);
    data.profits += profit.isProfit ? btcAmount : -btcAmount;
  });
  
  // Processar saques
  (report.withdrawals || []).forEach(withdrawal => {
    const date = new Date(withdrawal.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, { investments: 0, profits: 0, withdrawals: 0 });
    }
    
    const data = monthlyData.get(monthKey)!;
    data.withdrawals += convertToBtc(withdrawal.amount, withdrawal.unit);
  });
  
  // Converter para array e ordenar por data
  const result = Array.from(monthlyData.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, data]) => {
      const [year, month] = monthKey.split('-');
      const monthName = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });
      
      const investmentsUSD = data.investments * btcToUsd;
      const investmentsCurrency = currency === 'BRL' ? investmentsUSD * brlToUsd : investmentsUSD;
      
      const profitsUSD = data.profits * btcToUsd;
      const profitsCurrency = currency === 'BRL' ? profitsUSD * brlToUsd : profitsUSD;
      
      const withdrawalsUSD = data.withdrawals * btcToUsd;
      const withdrawalsCurrency = currency === 'BRL' ? withdrawalsUSD * brlToUsd : withdrawalsUSD;
      
      const balanceBTC = data.investments + data.profits - data.withdrawals;
      const balanceUSD = balanceBTC * btcToUsd;
      const balanceCurrency = currency === 'BRL' ? balanceUSD * brlToUsd : balanceUSD;
      
      return {
        'Mês/Ano': `${monthName}/${year}`,
        'Aportes (BTC)': data.investments.toFixed(8),
        [`Aportes (${currency})`]: formatCurrency(investmentsCurrency, currency),
        'Lucros/Perdas (BTC)': data.profits.toFixed(8),
        [`Lucros/Perdas (${currency})`]: formatCurrency(profitsCurrency, currency),
        'Saques (BTC)': data.withdrawals.toFixed(8),
        [`Saques (${currency})`]: formatCurrency(withdrawalsCurrency, currency),
        'Saldo (BTC)': balanceBTC.toFixed(8),
        [`Saldo (${currency})`]: formatCurrency(balanceCurrency, currency)
      };
    });
  
  return result;
} 