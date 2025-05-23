"use client";

import { /*useState, useEffect, useMemo, useRef, useCallback */ } from "react"; // Comentar hooks não usados na versão simplificada
import {
  Calendar,
  Coins,
  TrendingUp,
  Trash2,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Check,
  RefreshCw,
  AlertTriangle,
  FileText,
  Download,
  ChevronDown,
  Upload,
  FileType,
  PieChart as PieChartIcon,
  BarChart2,
  Sliders,
  ArrowUp,
  ArrowDown,
  CircleSlash2,
  HelpCircle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { format, subMonths, addMonths, startOfMonth, endOfMonth, isWithinInterval, isBefore, startOfDay, endOfDay, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import AnimatedCounter from "./animated-counter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getCurrentBitcoinPrice } from "@/lib/client-api";
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
// import { useIsMobile } from "@/hooks/use-mobile"; // Comentar se não usar
// import { useToast } from "@/components/ui/use-toast"; // Comentar se não usar
import { ResponsiveContainer } from "@/components/ui/responsive-container";
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useReports } from "@/hooks/use-reports";
import { getHistoricalBitcoinDataForRange, type HistoricalDataPoint } from "@/lib/client-api";
import { v4 as uuidv4 } from 'uuid';
// import DatePickerWithRange from "./date-picker-with-range";
// import DatePicker from "./date-picker";

// Tipos de dados
type CurrencyUnit = "BTC" | "SATS";
type DisplayCurrency = "USD" | "BRL";

interface Investment {
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

interface ProfitRecord {
  id: string;
  originalId?: string;
  date: string;
  amount: number;
  unit: CurrencyUnit;
  isProfit: boolean;
}

interface AppData {
  currentPrice: {
    usd: number;
    brl: number;
    isUsingCache?: boolean;
  };
  isUsingCache: boolean;
}

interface ProfitCalculatorProps {
  btcToUsd: number;
  brlToUsd: number;
  appData?: AppData;
  reportsCollection: ReportsCollection;
  activeReportId: string | null;
  reportsDataLoaded: boolean;
  addReport: (name: string, description?: string, color?: string, id?: string) => Report;
  selectReport: (reportId: string | null) => void;
  addInvestmentToReport: (reportId: string, investmentBaseData: Omit<Investment, "id" | "priceAtDate" | "priceAtDateCurrency" | "priceAtDateSource">, options?: { suppressToast?: boolean }) => { status: 'added' | 'error' | 'duplicate', reportId: string, investmentId?: string, message?: string };
  addProfitRecordToReport: (reportId: string, profitBaseData: Omit<ProfitRecord, "id">, options?: { suppressToast?: boolean }) => { status: 'added' | 'error' | 'duplicate', reportId: string, profitId?: string, message?: string };
  deleteInvestmentFromReport: (reportId: string, investmentId: string) => boolean;
  deleteProfitRecordFromReport: (reportId: string, profitId: string) => boolean;
  updateReportDetails: (reportId: string, updates: Partial<Pick<Report, "name" | "description" | "color">>) => boolean;
  importExternalDataToReport: (reportId: string, investments: Investment[], profits: ProfitRecord[], options?: { suppressToast?: boolean, source?: string }) => { success: boolean, investmentStats: { added: number, duplicates: number, errors: number }, profitStats: { added: number, duplicates: number, errors: number } };
  deleteAllInvestmentsFromReport: (reportId: string) => boolean;
  deleteAllProfitsFromReport: (reportId: string) => boolean;
  recalculateReportSummary: (reportId: string, currentRates: any) => Promise<boolean>;
}

// Adicionar tipo para o objeto monthlyData
interface MonthlyData {
  label: string;
  investments: Investment[];
  investmentTotalBtc: number;
  profits: ProfitRecord[];
  profitTotalBtc: number;
}

interface ImportStats {
  total: number;
  success: number;
  error: number;
  duplicated?: number;
}

// ADICIONAR NOVA INTERFACE REPORT
interface Report {
  id: string;
  name: string;
  description?: string;
  investments: Investment[];
  profits: ProfitRecord[];
  color?: string;
  createdAt: string;
}

// NOVA INTERFACE PARA ReportsCollection (para corrigir linter error)
interface ReportsCollection {
  reports: Report[];
  // Outros campos potenciais da coleção, como 'activeReportId' ou metadados globais, podem ser adicionados aqui se necessário.
}

// NOVA INTERFACE PARA OPÇÕES DE EXPORTAÇÃO
interface ExportOptions {
  exportFormat: 'excel' | 'pdf'; // Novo
  reportSelectionType: 'active' | 'history' | 'manual';
  manualSelectedReportIds?: string[];
  periodSelectionType: 'all' | 'historyFilter' | 'specificMonth' | 'customRange';
  specificMonthDate?: Date | null;
  customStartDate?: Date | null;
  customEndDate?: Date | null;
  includeCharts?: boolean;
  includeSummarySection?: boolean; // Novo
  includeInvestmentsTableSection?: boolean; // Novo
  includeProfitsTableSection?: boolean; // Novo
  pdfDarkMode?: boolean; // NOVO para modo escuro PDF
}

// NOVO: Interface para informações de preço histórico para uma data
interface DatePriceInfo {
  price: number | null;
  loading: boolean;
  currency: DisplayCurrency | null;
  error?: string | null;
  source?: string | null; // Adicionar fonte
}

// Função interna que realmente busca o preço - Refatorada para retornar o valor
async function fetchBtcPriceOnDate(
  date: Date, 
  targetCurrency: DisplayCurrency
): Promise<{ price: number; source: string; currency: DisplayCurrency } | null> {
  const targetDate = startOfDay(date); // Normalizar para o início do dia
  const targetDateStr = format(targetDate, "yyyy-MM-dd");

  console.log(`[fetchBtcPriceOnDate] Buscando preço para ${targetDateStr} em ${targetCurrency}`);

  try {
    const data = await getHistoricalBitcoinDataForRange(
      targetCurrency.toLowerCase() as 'usd' | 'brl',
      targetDateStr,
      targetDateStr, // Para um único dia, from e to são iguais
      true // Forçar atualização para obter o preço mais preciso do dia
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
      return null; // Retorna null se não encontrar dados específicos
    }
  } catch (error: any) {
    console.error(`[fetchBtcPriceOnDate] Erro ao buscar preço para ${targetDateStr} em ${targetCurrency}:`, error);
    // Não relançar o erro aqui, deixar que o chamador decida como lidar com null
    return null;
  }
}

// +++ NOVAS FUNÇÕES AUXILIARES DE CÁLCULO +++

// Função para calcular o lucro operacional bruto
function calculateOperationalProfitForSummary(
  profitRecords: ProfitRecord[] | undefined, // Permitir undefined
  convertToBtcFunction: (amount: number, unit: CurrencyUnit) => number
): { operationalProfitBtc: number; netProfitFromOperationsBtc: number } {
  let grossProfitBtc = 0;
  let grossLossBtc = 0;

  (profitRecords || []).forEach(prof => { // Adicionar fallback para array vazio
    const amountBtc = convertToBtcFunction(prof.amount, prof.unit);
    if (prof.isProfit) {
      grossProfitBtc += amountBtc;
    } else {
      grossLossBtc += amountBtc;
    }
  });
  return { 
    operationalProfitBtc: grossProfitBtc, // Soma dos lucros (ProfitRecord.isProfit = true)
    netProfitFromOperationsBtc: grossProfitBtc - grossLossBtc // Lucro líquido (lucros - perdas de ProfitRecord)
  };
}

// Função para calcular o lucro de valorização
function calculateValuationProfitForSummary(
  investments: Investment[] | undefined, // Permitir undefined
  currentBtcPriceUsd: number,
  brlToUsdRate: number, // Taxa de BRL para USD
  convertToBtcFunction: (amount: number, unit: CurrencyUnit) => number
): { valuationProfitUsd: number; valuationProfitBtc: number } {
  let totalValuationProfitUsd = 0;

  if (currentBtcPriceUsd > 0) {
    (investments || []).forEach(inv => { // Adicionar fallback para array vazio
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
function calculateAverageBuyPriceForSummary(
  investments: Investment[] | undefined, // Permitir undefined
  brlToUsdRate: number, // Taxa de BRL para USD
  convertToBtcFunction: (amount: number, unit: CurrencyUnit) => number
): { averageBuyPriceUsd: number; totalInvestmentsBtc: number } {
  let totalInvestmentsBtc = 0;
  let totalWeightedPriceUsd = 0;

  (investments || []).forEach(inv => { // Adicionar fallback para array vazio
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

// +++ FIM DAS NOVAS FUNÇÕES AUXILIARES +++

// +++ MOVER formatTempoInvestimento PARA CÁ +++
const formatTempoInvestimento = (dias: number): string => {
  if (dias < 0) return "N/A"; // Sanity check
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
// +++ FIM DE formatTempoInvestimento MOVIDA +++

  // Função auxiliar para converter string de data ISO para objeto Date com fuso horário correto
  const parseISODate = (dateString: string): Date => {
    if (!dateString) {
      // Retornar uma data inválida ou lançar um erro se a string for vazia/nula
      // Isso depende de como o resto do código espera lidar com datas inválidas.
      // Por agora, vamos logar um aviso e retornar uma data que provavelmente causará erro adiante se não tratada.
      console.warn("parseISODate recebeu uma string vazia ou nula.");
      return new Date("invalid date"); 
    }
    const date = new Date(dateString);
    // Verificar se a data é válida, pois o construtor de Date pode retornar "Invalid Date"
    // mas ainda assim ser um objeto Date.
    if (isNaN(date.getTime())) {
      console.warn(`parseISODate resultou em data inválida para a string: "${dateString}"`);
      // Considerar lançar um erro aqui se uma data inválida não for esperada
      // throw new Error(`Invalid date string provided to parseISODate: ${dateString}`);
    }
    return date;
  };

export default function ProfitCalculator(props: ProfitCalculatorProps) {
  // Desestruturar apenas o que será usado no JSX mínimo
  const { reportsCollection, reportsDataLoaded } = props;

  // Adicionar um log aqui para ver se o corpo da função é alcançado
  console.log("[ProfitCalculator - SIMPLIFICADO] Renderizando. reportsDataLoaded:", reportsDataLoaded);
  if (reportsCollection?.reports) {
    console.log("[ProfitCalculator - SIMPLIFICADO] Número de relatórios:", reportsCollection.reports.length);
  }

  // ======= INÍCIO DO CÓDIGO COMENTADO (QUASE TUDO) =======
  /*
  const { 
    // ... (resto das props desestruturadas)
  } = props;

  // Todos os useState 
  const [activeTab, setActiveTab] = useState<string>("register");
  // ... (comentar TODOS os useState)
  const [profitDatePriceInfo, setProfitDatePriceInfo] = useState<DatePriceInfo>({ price: null, loading: false, currency: displayCurrency, error: null, source: null });
  
  // Todos os useRef, useIsMobile, useToast
  const fileInputRef = useRef<HTMLInputElement>(null);
  // ... (comentar TODOS os useRef)
  const backupExcelFileInputRef = useRef<HTMLInputElement>(null);

  const isMobile = useIsMobile();
  const isSmallScreen = typeof window !== 'undefined' ? window.innerWidth < 350 : false; 
  const { toast } = useToast(); 
  const today = startOfDay(new Date()); 

  // Todos os useEffect e useMemo
  useEffect(() => {
    // ...
  }, []);
  // ... (comentar TODOS os useEffect e useMemo)
  useEffect(() => {
    // ...
  }, [props.reportsDataLoaded, props.reportsCollection, props.activeReportId]);

  // Guardas (já não são estritamente necessárias por causa do Wrapper)
  // if (!props.reportsDataLoaded) { ... }
  // if (!props.reportsCollection || ...) { ... }
  
  const collection = props.reportsCollection; 
  const allReportsFromHook = collection.reports; 
  const currentActiveReportObjectFromHook = props.activeReportId && allReportsFromHook
    ? allReportsFromHook.find(report => report.id === props.activeReportId)
    : null;
  
  // ... (todas as funções de manipulação de eventos, lógicas de cálculo etc.)
  */
  // ======= FIM DO CÓDIGO COMENTADO =======

  // JSX Mínimo para Teste
    return (
    <div className="container mx-auto p-4">
      <h1 className="text-xl font-bold">Profit Calculator (Versão Simplificada)</h1>
      <p>Dados de Relatórios Carregados: {reportsDataLoaded ? 'Sim' : 'Não'}</p>
      {reportsDataLoaded && reportsCollection?.reports && (
        <p>Número de Relatórios: {reportsCollection.reports.length}</p>
      )}
      {reportsDataLoaded && !reportsCollection?.reports && (
        <p className="text-red-500">Coleção de relatórios não é um array ou é indefinida!</p>
      )}
      {/* Adicionar aqui um .map() simples e seguro para testar o erro de map especificamente */}
      {/* {reportsDataLoaded && reportsCollection?.reports && Array.isArray(reportsCollection.reports) && (
                  <div>
          <h2 className="text-lg">Nomes dos Relatórios:</h2>
          <ul>
            {reportsCollection.reports.map(report => (
              <li key={report.id}>{report.name || "Sem nome"}</li>
            ))}
                  </ul>
                </div>
      )} */}
    </div>
  );
}

export const dynamic = 'force-dynamic';