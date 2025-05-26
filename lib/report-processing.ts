import { Report, Investment, ProfitRecord, CurrencyUnit } from './calculator-types';
import { OperationData, HistoricalDataPoint } from './export-types'; // Supondo que HistoricalDataPoint também está em export-types ou api-types
import { getHistoricalBitcoinDataForRange } from './client-api';
import { CalculatedReportData, ReportMetadata } from './export-types';

/**
 * Define a estrutura do objeto de entrada para o processamento do relatório.
 */
interface ReportDataInput {
  report: Report;
  // targetCurrency: 'BRL' | 'USD'; // Poderemos usar isso depois para definir a moeda principal dos cálculos
}

/**
 * Define a estrutura do objeto de saída após o processamento inicial dos dados do relatório.
 * Contém as operações enriquecidas e os mapas de cotações para cálculos subsequentes.
 */
interface ProcessedReportFoundation {
  enrichedOperations: OperationData[];
  historicalQuotesUSD: Map<string, number>; // Chave: YYYY-MM-DD, Valor: preço BTC em USD
  historicalQuotesBRL: Map<string, number>; // Chave: YYYY-MM-DD, Valor: preço BTC em BRL
  reportDateRange: { minDate: string; maxDate: string } | null;
}

const SATOSHIS_IN_BTC = 100_000_000;

/**
 * Converte um valor de CurrencyUnit (BTC ou SATS) para BTC.
 * @param amount A quantidade.
 * @param unit A unidade da quantidade (BTC ou SATS).
 * @returns A quantidade em BTC.
 */
function convertToBTC(amount: number, unit: CurrencyUnit): number {
  if (unit === 'SATS') {
    return amount / SATOSHIS_IN_BTC;
  }
  return amount;
}

/**
 * Prepara os dados base para a exportação de um relatório.
 * Busca cotações históricas e transforma transações em OperationData enriquecidas.
 * @param input Contém o relatório a ser processado.
 * @returns Uma promessa para ProcessedReportFoundation.
 */
export async function prepareReportFoundationData(
  input: ReportDataInput
): Promise<ProcessedReportFoundation> {
  const { report } = input;
  const enrichedOperations: OperationData[] = [];
  const historicalQuotesUSD = new Map<string, number>();
  const historicalQuotesBRL = new Map<string, number>();
  let reportDateRange: { minDate: string; maxDate: string } | null = null;

  // 1. Coletar todas as datas de transações para determinar o intervalo
  const transactionDates: string[] = [];
  
  // Garantir que investments e profits existem e são arrays
  const investments = Array.isArray(report.investments) ? report.investments : [];
  const profits = Array.isArray(report.profits) ? report.profits : [];
  
  // Garantir que date existe e é uma string válida antes de fazer split
  investments.forEach(inv => {
    if (inv && typeof inv.date === 'string') {
      transactionDates.push(inv.date.split('T')[0]);
    }
  });
  
  profits.forEach(prof => {
    if (prof && typeof prof.date === 'string') {
      transactionDates.push(prof.date.split('T')[0]);
    }
  });

  if (transactionDates.length > 0) {
    transactionDates.sort(); // Ordena para facilmente pegar min e max
    const minDate = transactionDates[0];
    const maxDate = transactionDates[transactionDates.length - 1];
    reportDateRange = { minDate, maxDate };

    // 2. Buscar cotações históricas para o intervalo (USD e BRL)
    try {
      const [quotesUSD, quotesBRL] = await Promise.all([
        getHistoricalBitcoinDataForRange('usd', minDate, maxDate),
        getHistoricalBitcoinDataForRange('brl', minDate, maxDate),
      ]);

      quotesUSD.forEach(q => historicalQuotesUSD.set(q.date, q.price));
      quotesBRL.forEach(q => historicalQuotesBRL.set(q.date, q.price));
      
      console.log(`Cotações USD carregadas: ${historicalQuotesUSD.size} registros para o intervalo ${minDate} - ${maxDate}`);
      console.log(`Cotações BRL carregadas: ${historicalQuotesBRL.size} registros para o intervalo ${minDate} - ${maxDate}`);

    } catch (error) {
      console.error('Falha ao buscar cotações históricas para o relatório:', error);
      // Prosseguir sem cotações, pricePerUnit e totalAmount serão 0 ou indefinidos.
      // Ou podemos optar por lançar o erro aqui e tratar no nível superior.
    }
  }

  // 3. Transformar Investments em OperationData
  if (Array.isArray(investments)) {
    investments.forEach(inv => {
      if (!inv || typeof inv.date !== 'string' || typeof inv.amount !== 'number') {
        console.warn('Skipping invalid investment:', inv);
        return;
      }
      
      const dateOnly = inv.date.split('T')[0];
      const btcPriceUSD = historicalQuotesUSD.get(dateOnly);
      const btcPriceBRL = historicalQuotesBRL.get(dateOnly);
      const quantityBTC = convertToBTC(inv.amount, inv.unit || 'BTC');

      enrichedOperations.push({
        id: inv.id || `inv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        originalId: inv.originalId,
        date: inv.date, // Manter o timestamp completo original
        type: 'buy',
        asset: 'BTC',
        quantity: quantityBTC,
        // Se a cotação não estiver disponível, pricePerUnit e totalAmount podem ser 0 ou undefined.
        // A interface OperationData precisará permitir isso ou teremos que tratar.
        pricePerUnitUSD: btcPriceUSD, // Este é o preço do BTC, não o preço por unidade da compra
        totalAmountUSD: btcPriceUSD ? quantityBTC * btcPriceUSD : undefined,
        pricePerUnitBRL: btcPriceBRL,
        totalAmountBRL: btcPriceBRL ? quantityBTC * btcPriceBRL : undefined,
        // currency: 'BRL', // A moeda da transação original. Atualmente não temos essa info.
                          // Para a exportação, podemos definir uma moeda principal para exibição.
      });
    });
  }

  // 4. Transformar ProfitRecords em OperationData
  if (Array.isArray(profits)) {
    profits.forEach(prof => {
      if (!prof || typeof prof.date !== 'string' || typeof prof.amount !== 'number') {
        console.warn('Skipping invalid profit record:', prof);
        return;
      }
      
      const dateOnly = prof.date.split('T')[0];
      const btcPriceUSD = historicalQuotesUSD.get(dateOnly);
      const btcPriceBRL = historicalQuotesBRL.get(dateOnly);
      const quantityBTC = convertToBTC(prof.amount, prof.unit || 'BTC');

      // Nota: isProfit indica se foi lucro em BTC. Para "venda", o valor em fiat é sempre positivo.
      enrichedOperations.push({
        id: prof.id || `prof-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        originalId: prof.originalId,
        date: prof.date,
        type: 'sell',
        asset: 'BTC',
        quantity: quantityBTC,
        pricePerUnitUSD: btcPriceUSD,
        totalAmountUSD: btcPriceUSD ? quantityBTC * btcPriceUSD : undefined,
        pricePerUnitBRL: btcPriceBRL,
        totalAmountBRL: btcPriceBRL ? quantityBTC * btcPriceBRL : undefined,
        // currency: 'BRL',
        isProfitContext: prof.isProfit, // Adicionar contexto se foi lucro ou prejuízo em BTC
      });
    });
  }
  
  // Ordenar operações por data (importante para cálculos sequenciais de saldo)
  enrichedOperations.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  console.log(`Total de operações enriquecidas: ${enrichedOperations.length}`);

  return {
    enrichedOperations,
    historicalQuotesUSD,
    historicalQuotesBRL,
    reportDateRange,
  };
}

/**
 * Define a estrutura do objeto de entrada para o cálculo das métricas do relatório.
 * Estende ProcessedReportFoundation e adiciona metadados do relatório.
 */
interface CalculateMetricsInput extends ProcessedReportFoundation {
  reportName: string; // Nome do relatório para referência (pode vir de Report.name)
  reportPeriodDescription: string; // Descrição do período (ex: "2023-01-01 a 2023-12-31")
  displayCurrency: 'BRL' | 'USD'; // Moeda principal para exibir os totais monetários
}

/**
 * Calcula as métricas financeiras detalhadas para o relatório.
 * @param input Dados processados da fundação do relatório e metadados.
 * @returns Um objeto CalculatedReportData com todas as métricas preenchidas.
 */
export function calculateReportMetrics(
  input: CalculateMetricsInput
): CalculatedReportData {
  const {
    enrichedOperations,
    historicalQuotesUSD,
    historicalQuotesBRL,
    reportDateRange,
    displayCurrency,
  } = input;

  // Inicializar a estrutura de CalculatedReportData
  const calculatedMetrics: CalculatedReportData = {
    roiMonthly: [],
    roiAccumulated: 0,
    realizedPeriodProfitLoss: 0,
    unrealizedPeriodProfitLoss: 0,
    overallPeriodProfitLoss: 0,
    totalInvestments: 0,
    totalWithdrawals: 0,
    totalBalance: { brl: 0, usd: 0, btc: 0 },
    monthlyBreakdown: [],
  };

  if (!reportDateRange || enrichedOperations.length === 0) {
    console.warn("Cálculo de métricas abortado: sem intervalo de datas ou operações.");
    return calculatedMetrics; // Retorna métricas zeradas se não há dados
  }

  // Selecionar o mapa de cotações e os campos de valor com base na displayCurrency
  const quotesForDisplayCurrency = displayCurrency === 'BRL' ? historicalQuotesBRL : historicalQuotesUSD;
  const totalAmountFieldForDisplayCurrency = displayCurrency === 'BRL' ? 'totalAmountBRL' : 'totalAmountUSD';
  const pricePerUnitFieldForDisplayCurrency = displayCurrency === 'BRL' ? 'pricePerUnitBRL' : 'pricePerUnitUSD';

  let currentBtcPortfolioQuantity = 0;
  let currentBtcPortfolioTotalCost = 0; // Custo total na displayCurrency
  calculatedMetrics.totalInvestments = 0; // Reinicializar para calcular corretamente abaixo
  calculatedMetrics.totalWithdrawals = 0; // Reinicializar para calcular corretamente abaixo

  // Calcular totais de aportes, retiradas, saldo BTC e P/L Realizado usando CMP
  for (const op of enrichedOperations) {
    const operationAmountInDisplayCurrency = op[totalAmountFieldForDisplayCurrency];
    const operationPricePerUnitInDisplayCurrency = op[pricePerUnitFieldForDisplayCurrency];

    if (op.type === 'buy') {
      if (typeof operationAmountInDisplayCurrency === 'number') {
        calculatedMetrics.totalInvestments += operationAmountInDisplayCurrency;
        currentBtcPortfolioTotalCost += operationAmountInDisplayCurrency;
      } else if (typeof operationPricePerUnitInDisplayCurrency === 'number') {
        // Fallback se totalAmount não estiver disponível, mas pricePerUnit sim (menos provável com a lógica atual)
        const calculatedAmount = op.quantity * operationPricePerUnitInDisplayCurrency;
        calculatedMetrics.totalInvestments += calculatedAmount;
        currentBtcPortfolioTotalCost += calculatedAmount;
      } else {
        console.warn(`Operação de compra ${op.id} sem valor monetário em ${displayCurrency} para cálculo de custo.`);
      }
      currentBtcPortfolioQuantity += op.quantity;
    } else if (op.type === 'sell') {
      if (typeof operationAmountInDisplayCurrency === 'number') {
        calculatedMetrics.totalWithdrawals += operationAmountInDisplayCurrency;
        
        if (currentBtcPortfolioQuantity > 0 && op.quantity > 0) {
          const cmp = currentBtcPortfolioTotalCost / currentBtcPortfolioQuantity;
          const costOfSoldBtc = op.quantity * cmp;
          const saleProfitLoss = operationAmountInDisplayCurrency - costOfSoldBtc;
          calculatedMetrics.realizedPeriodProfitLoss += saleProfitLoss;
          
          currentBtcPortfolioTotalCost -= costOfSoldBtc;
          // Ajustar para não ficar negativo por imprecisões de float
          currentBtcPortfolioTotalCost = Math.max(0, currentBtcPortfolioTotalCost); 
        } else if (op.quantity > 0) {
          // Vendendo BTC sem ter custo registrado (pode acontecer se dados antigos não tinham compras)
          // Nesse caso, o custo é 0, então o valor da venda é puro lucro realizado.
          calculatedMetrics.realizedPeriodProfitLoss += operationAmountInDisplayCurrency;
        }
      } else {
        console.warn(`Operação de venda ${op.id} sem valor monetário em ${displayCurrency} para cálculo de P/L.`);
      }
      currentBtcPortfolioQuantity -= op.quantity;
    }
  }
  // Garantir que a quantidade de BTC não seja negativa devido a imprecisões ou dados anormais
  currentBtcPortfolioQuantity = Math.max(0, currentBtcPortfolioQuantity);

  calculatedMetrics.totalBalance.btc = currentBtcPortfolioQuantity;

  // Saldo de custo remanescente no portfólio (para P/L não realizado)
  const remainingPortfolioCostAtEnd = currentBtcPortfolioTotalCost;

  // Calcular saldo final em Fiat (USD e BRL)
  // Usar a cotação do último dia do período do relatório
  const lastDateOfPeriod = reportDateRange.maxDate;
  const lastPriceUSD = historicalQuotesUSD.get(lastDateOfPeriod);
  const lastPriceBRL = historicalQuotesBRL.get(lastDateOfPeriod);

  if (typeof lastPriceUSD === 'number') {
    calculatedMetrics.totalBalance.usd = currentBtcPortfolioQuantity * lastPriceUSD;
  } else {
    console.warn(`Cotação USD não encontrada para a data final ${lastDateOfPeriod} para cálculo do saldo.`);
  }

  if (typeof lastPriceBRL === 'number') {
    calculatedMetrics.totalBalance.brl = currentBtcPortfolioQuantity * lastPriceBRL;
  } else {
    console.warn(`Cotação BRL não encontrada para a data final ${lastDateOfPeriod} para cálculo do saldo.`);
  }

  // Calcular P/L Não Realizado
  const marketValueOfEndPortfolioInDisplayCurrency = calculatedMetrics.totalBalance[displayCurrency.toLowerCase() as 'brl' | 'usd'];
  
  if (typeof marketValueOfEndPortfolioInDisplayCurrency === 'number') {
    calculatedMetrics.unrealizedPeriodProfitLoss = marketValueOfEndPortfolioInDisplayCurrency - remainingPortfolioCostAtEnd;
  } else {
    // Se o valor de mercado não pôde ser calculado (ex: falta de cotação final),
    // o P/L não realizado não pode ser determinado com precisão ou pode ser considerado 0.
    // Por enquanto, vamos deixar como 0 se não houver valor de mercado.
    calculatedMetrics.unrealizedPeriodProfitLoss = 0;
    console.warn(`P/L Não Realizado não pôde ser calculado com precisão devido à ausência do valor de mercado final em ${displayCurrency}.`);
  }

  // Calcular P/L Geral do Período
  calculatedMetrics.overallPeriodProfitLoss = calculatedMetrics.realizedPeriodProfitLoss + calculatedMetrics.unrealizedPeriodProfitLoss;

  // Calcular ROI Acumulado para o período
  if (calculatedMetrics.totalInvestments !== 0) {
    calculatedMetrics.roiAccumulated = (calculatedMetrics.overallPeriodProfitLoss / calculatedMetrics.totalInvestments) * 100;
  } else if (calculatedMetrics.overallPeriodProfitLoss > 0) {
    // Se não houve investimentos formais, mas houve lucro (ex: airdrop vendido, ou lucro de trades com capital inicial zero no período)
    calculatedMetrics.roiAccumulated = Infinity; // Ou algum outro indicador de lucro sobre zero investimento
  } else {
    calculatedMetrics.roiAccumulated = 0; // Sem investimentos e sem lucro, ROI é 0
  }

  // --- Início do Detalhamento Mensal ---
  const monthlyBreakdownData: MonthlyBreakdown[] = [];
  const startDate = new Date(reportDateRange.minDate + 'T00:00:00Z'); // Usar Z para UTC
  const endDate = new Date(reportDateRange.maxDate + 'T00:00:00Z');

  let monthIterator = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  
  // Estado do portfólio no início do período (para o primeiro mês)
  let monthlyPortfolioBtcQuantityStart = 0;
  let monthlyPortfolioTotalCostStart = 0; // Na displayCurrency

  while (monthIterator <= endDate) {
    const year = monthIterator.getFullYear();
    const month = monthIterator.getMonth(); // 0-11
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`; // YYYY-MM
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0); // Pega o último dia do mês corretamente
    
    // Filtrar operações para o mês atual
    const operationsThisMonth = enrichedOperations.filter(op => {
      const opDate = new Date(op.date);
      return opDate >= firstDayOfMonth && opDate <= new Date(lastDayOfMonth.getFullYear(), lastDayOfMonth.getMonth(), lastDayOfMonth.getDate(), 23, 59, 59, 999); // Incluir todo o dia
    });

    let investmentsMonth = 0;
    let withdrawalsMonth = 0;
    let realizedProfitLossMonth = 0;
    
    // Estado do portfólio para o cálculo dentro do mês (copiado do início do mês)
    let intraMonthBtcQuantity = monthlyPortfolioBtcQuantityStart;
    let intraMonthTotalCost = monthlyPortfolioTotalCostStart; 

    for (const op of operationsThisMonth) {
      const operationAmountInDisplayCurrency = op[totalAmountFieldForDisplayCurrency as keyof OperationData] as number | undefined;
      if (op.type === 'buy') {
        if (typeof operationAmountInDisplayCurrency === 'number') {
          investmentsMonth += operationAmountInDisplayCurrency;
          intraMonthTotalCost += operationAmountInDisplayCurrency;
        }
        intraMonthBtcQuantity += op.quantity;
      } else if (op.type === 'sell') {
        if (typeof operationAmountInDisplayCurrency === 'number') {
          withdrawalsMonth += operationAmountInDisplayCurrency;
          if (intraMonthBtcQuantity > 0 && op.quantity > 0) {
            const cmp = intraMonthTotalCost / intraMonthBtcQuantity;
            const costOfSoldBtc = op.quantity * cmp;
            realizedProfitLossMonth += (operationAmountInDisplayCurrency - costOfSoldBtc);
            intraMonthTotalCost -= costOfSoldBtc;
            intraMonthTotalCost = Math.max(0, intraMonthTotalCost);
          } else if (op.quantity > 0) {
            realizedProfitLossMonth += operationAmountInDisplayCurrency;
          }
        }
        intraMonthBtcQuantity -= op.quantity;
      }
    }
    intraMonthBtcQuantity = Math.max(0, intraMonthBtcQuantity); // Saldo BTC no fim do mês

    // Valor de mercado no início do mês
    const firstDayOfMonthStr = firstDayOfMonth.toISOString().split('T')[0];
    const btcPriceStartOfMonth = quotesForDisplayCurrency.get(firstDayOfMonthStr) || quotesForDisplayCurrency.get(new Date(year, month, 0).toISOString().split('T')[0]) ; // Fallback para ultimo dia do mes anterior se primeiro dia n tiver cotação
    const marketValuePortfolioStartOfMonth = btcPriceStartOfMonth ? monthlyPortfolioBtcQuantityStart * btcPriceStartOfMonth : 0;

    // Valor de mercado no fim do mês
    const lastDayOfMonthStr = lastDayOfMonth.toISOString().split('T')[0];
    const btcPriceEndOfMonth = quotesForDisplayCurrency.get(lastDayOfMonthStr) || btcPriceStartOfMonth; // Fallback para preço de início do mês se fim não tiver
    const marketValuePortfolioEndOfMonth = btcPriceEndOfMonth ? intraMonthBtcQuantity * btcPriceEndOfMonth : 0;
    
    const unrealizedProfitLossMonth = (marketValuePortfolioEndOfMonth - intraMonthTotalCost) - (marketValuePortfolioStartOfMonth - monthlyPortfolioTotalCostStart);

    const overallProfitLossMonth = realizedProfitLossMonth + unrealizedProfitLossMonth;
    
    const endingBalanceInDisplayCurrencyMonth = marketValuePortfolioEndOfMonth; // O valor de mercado no fim do mês na moeda de display
    const endingBalanceBTCMonth = intraMonthBtcQuantity;
    
    let roiMonthPercentage = 0;
    const denominatorRoiMonth = (marketValuePortfolioStartOfMonth > 0 ? marketValuePortfolioStartOfMonth : monthlyPortfolioTotalCostStart) + investmentsMonth; 
    if (denominatorRoiMonth !== 0) {
      roiMonthPercentage = (overallProfitLossMonth / denominatorRoiMonth) * 100;
    }

    monthlyBreakdownData.push({
      monthYear: monthKey,
      investmentsInDisplayCurrency: investmentsMonth,
      withdrawalsInDisplayCurrency: withdrawalsMonth,
      realizedProfitLossInDisplayCurrency: realizedProfitLossMonth,
      unrealizedProfitLossInDisplayCurrency: unrealizedProfitLossMonth,
      overallProfitLossInDisplayCurrency: overallProfitLossMonth,
      endOfMonthBalanceInDisplayCurrency: endingBalanceInDisplayCurrencyMonth,
      endOfMonthBtcBalance: endingBalanceBTCMonth,
      monthlyRoi: roiMonthPercentage,
    });
    
    calculatedMetrics.roiMonthly.push({ month: monthKey, percentage: roiMonthPercentage });

    // Preparar para o próximo mês
    monthlyPortfolioBtcQuantityStart = intraMonthBtcQuantity;
    monthlyPortfolioTotalCostStart = intraMonthTotalCost;

    monthIterator.setMonth(monthIterator.getMonth() + 1);
  }
  calculatedMetrics.monthlyBreakdown = monthlyBreakdownData;
  // --- Fim do Detalhamento Mensal ---

  console.log("Métricas Finais Completas (com detalhamento mensal):", calculatedMetrics);

  return calculatedMetrics;
} 