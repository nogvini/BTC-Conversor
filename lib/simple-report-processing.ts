import { format, differenceInDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface SimpleReportData {
  reportName: string;
  reportPeriod: string;
  totalInvestmentsBtc: number;
  totalProfitsBtc: number;
  totalBalanceBtc: number;
  totalInvestmentsDisplay: number;
  totalProfitsDisplay: number;
  totalBalanceDisplay: number;
  displayCurrency: 'BRL' | 'USD';
  roi: number;
  primeiroAporteDate: string | null;
  diasDeInvestimento: number;
  tempoTotalInvestimento: string;
  roiAnualizadoPercent: number;
  mediaDiariaLucroBtc: number;
  mediaDiariaRoiPercent: number;
  currentBtcPrice: number;
  currentBtcPriceBrl: number;
  generatedAt: string;
  capturedCharts?: Array<{
    id: string;
    title: string;
    dataUrl: string;
    width: number;
    height: number;
  }>;
}

// Função para parse seguro de data
const parseReportDateStringToUTCDate = (dateString: string): Date => {
  console.log(`[parseReportDateStringToUTCDate] Parseando: "${dateString}"`);
  
  if (!dateString || typeof dateString !== 'string') {
    console.error(`[parseReportDateStringToUTCDate] Input inválido: ${dateString}`);
    return new Date();
  }

  // Para ISO completo (ex: "2025-05-20T05:12:44.198Z")
  const isoCompleteRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  
  // Para formato simples (ex: "2024-01-15")
  const simpleDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  
  try {
    if (isoCompleteRegex.test(dateString)) {
      console.log(`[parseReportDateStringToUTCDate] Formato ISO detectado: ${dateString}`);
      return new Date(dateString);
    } else if (simpleDateRegex.test(dateString)) {
      console.log(`[parseReportDateStringToUTCDate] Formato simples detectado: ${dateString}`);
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    } else {
      console.warn(`[parseReportDateStringToUTCDate] Formato não reconhecido: ${dateString}, tentando Date.parse`);
      const parsed = new Date(dateString);
      if (isNaN(parsed.getTime())) {
        throw new Error("Data inválida após Date.parse");
      }
      return parsed;
    }
  } catch (error) {
    console.error(`[parseReportDateStringToUTCDate] Erro ao processar data: ${dateString}`, error);
    return new Date(); // Fallback para hoje
  }
};

// Função para converter valores para BTC (mesma lógica do reports-comparison.tsx)
const convertToBtc = (amount: number, unit: 'BTC' | 'SATS'): number => {
  return unit === "SATS" ? amount / 100000000 : amount;
};

// Função para formatar tempo de investimento
const formatTempoInvestimento = (dias: number): string => {
  if (dias < 0) return "N/A";
  if (dias === 0) return "Menos de 1 dia";

  const anos = Math.floor(dias / 365);
  const meses = Math.floor((dias % 365) / 30);
  const diasRestantes = Math.floor((dias % 365) % 30);
  
  let str = "";
  if (anos > 0) str += `${anos} ano${anos > 1 ? 's' : ''} `;
  if (meses > 0) str += `${meses} ${meses > 1 ? 'meses' : 'mês'} `;
  if (diasRestantes > 0) str += `${diasRestantes} dia${diasRestantes > 1 ? 's' : ''}`;
  
  if (str.trim() === "" && dias > 0) {
    return `${dias} dia${dias > 1 ? 's' : ''}`;
  }
  return str.trim() || "N/A";
};

/**
 * Processa os dados do relatório usando a mesma lógica do reports-comparison.tsx
 * Mais simples e direto, sem conversões complexas de operações
 */
export function processSimpleReportData(
  report: any,
  displayCurrency: 'BRL' | 'USD',
  btcToUsd: number,
  brlToUsd: number,
  reportPeriodDescription?: string,
  capturedCharts?: Array<{
    id: string;
    title: string;
    dataUrl: string;
    width: number;
    height: number;
  }>
): SimpleReportData {
  console.log('=== PROCESSAMENTO SIMPLES DE RELATÓRIO ===');
  console.log('Relatório recebido:', {
    id: report.id,
    name: report.name,
    investmentsCount: report.investments?.length || 0,
    profitsCount: report.profits?.length || 0,
    withdrawalsCount: report.withdrawals?.length || 0
  });

  const reportInvestments = Array.isArray(report.investments) ? report.investments : [];
  const reportProfits = Array.isArray(report.profits) ? report.profits : [];
  
  console.log('Arrays validados:', {
    investmentsLength: reportInvestments.length,
    profitsLength: reportProfits.length
  });

  if (reportInvestments.length > 0) {
    console.log('Primeiros 2 investimentos:', reportInvestments.slice(0, 2));
  }
  if (reportProfits.length > 0) {
    console.log('Primeiros 2 lucros:', reportProfits.slice(0, 2));
  }

  // Calcular totais em BTC (mesma lógica do reports-comparison.tsx)
  const totalInvestmentsBtc = reportInvestments.reduce((sum, inv) => {
    const btcAmount = convertToBtc(inv.amount, inv.unit);
    console.log(`[Debug] Investimento: ${inv.amount} ${inv.unit} = ${btcAmount} BTC`);
    return sum + btcAmount;
  }, 0);
  
  const totalProfitsBtc = reportProfits.reduce((sum, prof) => {
    const btcAmount = convertToBtc(prof.amount, prof.unit);
    const contribution = prof.isProfit ? btcAmount : -btcAmount;
    console.log(`[Debug] Lucro/Perda: ${prof.amount} ${prof.unit} = ${contribution} BTC (isProfit: ${prof.isProfit})`);
    return sum + contribution;
  }, 0);
  
  const totalBalanceBtc = totalInvestmentsBtc + totalProfitsBtc;

  console.log('Totais calculados em BTC:', {
    totalInvestmentsBtc,
    totalProfitsBtc,
    totalBalanceBtc
  });

  // Converter para moeda de exibição
  const btcPriceInDisplayCurrency = displayCurrency === 'USD' ? btcToUsd : (btcToUsd * brlToUsd);
  
  const totalInvestmentsDisplay = totalInvestmentsBtc * btcPriceInDisplayCurrency;
  const totalProfitsDisplay = totalProfitsBtc * btcPriceInDisplayCurrency;
  const totalBalanceDisplay = totalBalanceBtc * btcPriceInDisplayCurrency;

  console.log('Convertido para', displayCurrency, ':', {
    btcPriceInDisplayCurrency,
    totalInvestmentsDisplay,
    totalProfitsDisplay,
    totalBalanceDisplay
  });

  // Calcular ROI simples
  const roi = totalInvestmentsBtc > 0 ? (totalProfitsBtc / totalInvestmentsBtc) * 100 : 0;

  // Calcular datas e períodos
  const reportAllEntriesDates = [
    ...(reportInvestments.map(i => parseReportDateStringToUTCDate(i.date))),
    ...(reportProfits.map(p => parseReportDateStringToUTCDate(p.date)))
  ].filter(date => !isNaN(date.getTime()));

  let primeiroAporteDateObj: Date | null = null;
  const reportValidInvestmentsDates = reportInvestments
    .map(inv => parseReportDateStringToUTCDate(inv.date))
    .filter(date => !isNaN(date.getTime()));

  if (reportValidInvestmentsDates.length > 0) {
    primeiroAporteDateObj = new Date(Math.min(...reportValidInvestmentsDates.map(d => d.getTime())));
  }
  
  let ultimoRegistroDateObj: Date | null = null;
  if (reportAllEntriesDates.length > 0) {
    ultimoRegistroDateObj = new Date(Math.max(...reportAllEntriesDates.map(d => d.getTime())));
  }

  let diasDeInvestimento = 0;
  if (primeiroAporteDateObj && ultimoRegistroDateObj && ultimoRegistroDateObj >= primeiroAporteDateObj) {
    diasDeInvestimento = differenceInDays(startOfDay(ultimoRegistroDateObj), startOfDay(primeiroAporteDateObj));
  }

  // Calcular ROI anualizado
  let roiAnualizadoPercent = 0;
  if (totalInvestmentsBtc > 0 && diasDeInvestimento > 0 && totalProfitsBtc !== -totalInvestmentsBtc) {
    const roiDecimal = totalProfitsBtc / totalInvestmentsBtc;
    if (1 + roiDecimal > 0) {
      roiAnualizadoPercent = (Math.pow(1 + roiDecimal, 365 / diasDeInvestimento) - 1) * 100;
    } else if (roiDecimal === -1) {
      roiAnualizadoPercent = -100;
    }
  }

  // Calcular médias diárias
  const mediaDiariaLucroBtc = diasDeInvestimento > 0 ? totalProfitsBtc / diasDeInvestimento : 0;
  const mediaDiariaRoiPercent = diasDeInvestimento > 0 ? roi / diasDeInvestimento : 0;

  const result: SimpleReportData = {
    reportName: report.name || 'Relatório Bitcoin',
    reportPeriod: reportPeriodDescription || 'Período completo',
    totalInvestmentsBtc,
    totalProfitsBtc,
    totalBalanceBtc,
    totalInvestmentsDisplay,
    totalProfitsDisplay,
    totalBalanceDisplay,
    displayCurrency,
    roi,
    primeiroAporteDate: primeiroAporteDateObj ? primeiroAporteDateObj.toISOString() : null,
    diasDeInvestimento,
    tempoTotalInvestimento: formatTempoInvestimento(diasDeInvestimento),
    roiAnualizadoPercent,
    mediaDiariaLucroBtc,
    mediaDiariaRoiPercent,
    currentBtcPrice: btcToUsd,
    currentBtcPriceBrl: btcToUsd * brlToUsd,
    generatedAt: new Date().toISOString(),
    capturedCharts
  };

  console.log('Resultado final do processamento simples:', result);
  
  return result;
} 