import { format, startOfDay, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getHistoricalBitcoinDataForRange } from "@/lib/client-api";
import type { 
  Investment, 
  ProfitRecord, 
  CurrencyUnit, 
  DisplayCurrency, 
  DatePriceInfo 
} from "../types/profit-calculator-types";

// Função para converter para BTC
export const convertToBtc = (amount: number, unit: CurrencyUnit): number => {
  return unit === "SATS" ? amount / 100000000 : amount;
};

// Função para formatar valores crypto
export const formatCryptoAmount = (amount: number, unit: CurrencyUnit): string => {
  if (unit === "BTC") {
    return `${amount.toFixed(8)} BTC`;
  } else {
    return `${amount.toLocaleString()} SATS`;
  }
};

// Função para formatar moeda
export const formatCurrency = (amount: number, currency: string = "USD"): string => {
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

// Verifica se uma data é no futuro
export const isFutureDate = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateToCompare = new Date(date);
  dateToCompare.setHours(0, 0, 0, 0);
  return dateToCompare > today;
};

// Função para garantir que a data não seja afetada pelo fuso horário
export const formatDateToUTC = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

// Função para parse de data ISO
export const parseISODate = (dateString: string): Date => {
  try {
    // Garantir formato YYYY-MM-DD
    const cleanDateString = dateString.split('T')[0];
    const [year, month, day] = cleanDateString.split('-').map(Number);
    
    if (!year || !month || !day || year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
      throw new Error(`Data inválida: ${dateString}`);
    }
    
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  } catch (error) {
    console.error("Erro ao fazer parse da data:", dateString, error);
    return new Date();
  }
};

// Função para formatar data para exibição
export const formatDisplayDate = (dateString: string, formatStr: string = "d MMM yyyy"): string => {
  try {
    const date = parseISODate(dateString);
    return format(date, formatStr, { locale: ptBR });
  } catch (error) {
    console.error("Erro ao formatar data para exibição:", error);
    return dateString;
  }
};

// Função para formatar tempo de investimento
export const formatTempoInvestimento = (dias: number): string => {
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

// Função para buscar preço do Bitcoin em uma data específica
export async function fetchBtcPriceOnDate(
  date: Date, 
  targetCurrency: DisplayCurrency
): Promise<{ price: number; source: string; currency: DisplayCurrency } | null> {
  const targetDate = startOfDay(date);
  const targetDateStr = format(targetDate, "yyyy-MM-dd");

  console.log(`[fetchBtcPriceOnDate] Buscando preço para ${targetDateStr} em ${targetCurrency}`);

  try {
    const data = await getHistoricalBitcoinDataForRange(
      targetCurrency.toLowerCase() as 'usd' | 'brl',
      targetDateStr,
      targetDateStr,
      true
    );

    if (data && data.length > 0 && data[0].price !== null && data[0].price !== undefined) {
      console.log(`[fetchBtcPriceOnDate] Preço encontrado: ${data[0].price} ${targetCurrency}, Fonte: ${data[0].source}`);
      return {
        price: data[0].price,
        source: data[0].source || 'API',
        currency: targetCurrency,
      };
    } else {
      console.warn(`[fetchBtcPriceOnDate] Dados de preço não encontrados para ${targetDateStr} em ${targetCurrency}. Resposta:`, data);
      return null;
    }
  } catch (error: any) {
    console.error(`[fetchBtcPriceOnDate] Erro ao buscar preço para ${targetDateStr} em ${targetCurrency}:`, error);
    return null;
  }
}

// Função para calcular o lucro operacional bruto
export function calculateOperationalProfitForSummary(
  profitRecords: ProfitRecord[],
  convertToBtcFunction: (amount: number, unit: CurrencyUnit) => number
): { operationalProfitBtc: number; netProfitFromOperationsBtc: number } {
  let grossProfitBtc = 0;
  let grossLossBtc = 0;

  profitRecords.forEach(prof => {
    const amountBtc = convertToBtcFunction(prof.amount, prof.unit);
    if (prof.isProfit) {
      grossProfitBtc += amountBtc;
    } else {
      grossLossBtc += amountBtc;
    }
  });
  return { 
    operationalProfitBtc: grossProfitBtc,
    netProfitFromOperationsBtc: grossProfitBtc - grossLossBtc
  };
}

// Função para calcular o lucro de valorização
export function calculateValuationProfitForSummary(
  investments: Investment[],
  currentBtcPriceUsd: number,
  brlToUsdRate: number,
  convertToBtcFunction: (amount: number, unit: CurrencyUnit) => number
): { valuationProfitUsd: number; valuationProfitBtc: number } {
  let totalValuationProfitUsd = 0;

  if (currentBtcPriceUsd > 0) {
    investments.forEach(inv => {
      if (inv.priceAtDate && inv.priceAtDateCurrency) {
        let priceAtDateUsd = inv.priceAtDate;
        if (inv.priceAtDateCurrency === "BRL" && brlToUsdRate !== 0) {
          priceAtDateUsd = inv.priceAtDate / brlToUsdRate;
        }

        if (typeof priceAtDateUsd === 'number' && priceAtDateUsd > 0) {
          const investmentBtc = convertToBtcFunction(inv.amount, inv.unit);
          totalValuationProfitUsd += (currentBtcPriceUsd - priceAtDateUsd) * investmentBtc;
        }
      }
    });
  }
  const valuationProfitBtc = currentBtcPriceUsd > 0 && totalValuationProfitUsd !== 0 
    ? totalValuationProfitUsd / currentBtcPriceUsd 
    : 0;
  return { valuationProfitUsd: totalValuationProfitUsd, valuationProfitBtc };
}

// Função para calcular o preço médio de compra
export function calculateAverageBuyPriceForSummary(
  investments: Investment[],
  brlToUsdRate: number,
  convertToBtcFunction: (amount: number, unit: CurrencyUnit) => number
): { averageBuyPriceUsd: number; totalInvestmentsBtc: number } {
  let totalInvestmentsBtc = 0;
  let totalWeightedPriceUsd = 0;

  investments.forEach(inv => {
    const investmentBtc = convertToBtcFunction(inv.amount, inv.unit);
    totalInvestmentsBtc += investmentBtc;
    if (inv.priceAtDate && inv.priceAtDateCurrency) {
      let priceUsd = inv.priceAtDate;
      if (inv.priceAtDateCurrency === "BRL" && brlToUsdRate !== 0) {
        priceUsd = inv.priceAtDate / brlToUsdRate;
      }
      if (typeof priceUsd === 'number' && priceUsd > 0) {
        totalWeightedPriceUsd += priceUsd * investmentBtc;
      }
    }
  });

  const averageBuyPriceUsd = totalInvestmentsBtc > 0 ? totalWeightedPriceUsd / totalInvestmentsBtc : 0;
  return { averageBuyPriceUsd, totalInvestmentsBtc };
} 