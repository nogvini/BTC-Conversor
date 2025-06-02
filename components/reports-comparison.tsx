"use client";

import { useState, useEffect, useMemo } from "react";
import { format, differenceInDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  ChevronLeft,
  PieChart as PieChartIcon,
  BarChart2,
  Sliders,
  ArrowUp,
  ArrowDown,
  CircleSlash2,
  RefreshCw,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Info
} from "lucide-react";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useReports } from "@/hooks/use-reports";
import { useReportSync } from "@/contexts/report-sync-service";
import { Report, ReportComparison, Investment, ProfitRecord } from "@/lib/calculator-types";
import { useIsMobile } from "@/hooks/use-mobile";
import AnimatedCounter from "./animated-counter";
import { convertToBtc } from "./utils/profit-calculator-utils";

interface ReportsComparisonProps {
  onBack: () => void;
  btcToUsd: number;
  brlToUsd: number;
}

type ComparisonMode = "accumulated" | "monthly";
type DisplayUnit = "btc" | "usd" | "brl";

// Definindo interfaces para melhor tipagem
interface ReportStatDetails {
  totalInvestments: number;
  totalProfits: number;
  finalBalance: number;
  roi: number;
  primeiroAporteDate: string | null; // ISO string
  diasDeInvestimento: number;
  tempoTotalInvestimento: string;
  roiAnualizadoPercent: number;
  mediaDiariaLucroBtc: number;
  mediaDiariaRoiPercent: number;
}

interface ChartDataPoint {
  month: string;
  [key: string]: any; // Para as chaves dinâmicas dos relatórios
}

interface ComparisonDataResult {
  chartData: ChartDataPoint[]; 
  statsData: Record<string, ReportStatDetails>;
  dateRange: { start: Date; end: Date };
  totalInvestmentsBtc: number;
  totalProfitsBtc: number;
  totalBalanceBtc: number;
  totalRoi: number;
  aggregatedPrimeiroAporteDate: string | null; // ISO string
  aggregatedDiasDeInvestimento: number;
  aggregatedTempoTotalInvestimento: string;
  aggregatedRoiAnualizadoPercent: number;
  aggregatedMediaDiariaLucroBtc: number;
  aggregatedMediaDiariaRoiPercent: number;
}

// NOVA FUNÇÃO AUXILIAR
const parseReportDateStringToUTCDate = (dateString: string): Date => {
  if (!dateString || typeof dateString !== 'string') {
    console.warn(`Invalid date string encountered in reports-comparison: ${dateString}`);
    return new Date(NaN); 
  }

  // Verificar se é uma data ISO completa (YYYY-MM-DDTHH:mm:ss.sssZ) ou apenas YYYY-MM-DD
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
  
  if (isoRegex.test(dateString)) {
    // Data ISO completa - usar apenas a parte da data
    const dateOnly = dateString.split('T')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    
    if (!year || !month || !day || year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
      console.warn(`Invalid ISO date parts in reports-comparison: ${dateString}`);
      return new Date(NaN);
    }
    
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  } else if (dateOnlyRegex.test(dateString)) {
    // Data apenas YYYY-MM-DD
    const [year, month, day] = dateString.split('-').map(Number);
    
    if (!year || !month || !day || year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
      console.warn(`Invalid date parts in reports-comparison: ${dateString}`);
      return new Date(NaN);
    }
    
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  } else {
    console.warn(`Invalid date string format encountered in reports-comparison: ${dateString}`);
    return new Date(NaN); 
  }
};

// ADICIONAR FUNÇÃO formatTempoInvestimento
const formatTempoInvestimento = (dias: number): string => {
    if (dias < 0) return "N/A"; // Sanity check para valores negativos
    if (dias === 0) return "Menos de 1 dia"; 

    const anos = Math.floor(dias / 365);
    const meses = Math.floor((dias % 365) / 30);
    const diasRestantes = Math.floor((dias % 365) % 30);
    
    let str = "";
    if (anos > 0) str += `${anos} ano${anos > 1 ? 's' : ''} `;
    if (meses > 0) str += `${meses} ${meses > 1 ? 'meses' : 'mês'} `; // Corrigido para "mês/meses"
    if (diasRestantes > 0) str += `${diasRestantes} dia${diasRestantes > 1 ? 's' : ''}`;
    
    // Caso especial: se a string estiver vazia mas dias > 0 (ex: 15 dias), mostrar os dias.
    if (str.trim() === "" && dias > 0) {
      return `${dias} dia${dias > 1 ? 's' : ''}`;
    }
    // Se a string estiver vazia e dias for 0 (já tratado no início), ou se str não estiver vazia
    return str.trim() || "N/A"; // Fallback para N/A se str estiver vazia por algum motivo inesperado
};

/**
 * COMPONENTE: ReportsComparison - Comparação de múltiplos relatórios
 * 
 * MELHORIAS DE RESPONSIVIDADE IMPLEMENTADAS:
 * 
 * 1. TABELA PRINCIPAL DE COMPARAÇÃO:
 *    - Desktop (lg+): Tabela completa com sticky column e todas as métricas
 *    - Tablet (md): Tabela compacta com colunas principais otimizadas 
 *    - Mobile (sm): Versão ultra-compacta com tooltips informativos
 *    - ScrollArea bidirecional para navegação completa
 * 
 * 2. SISTEMA DE ABAS RESPONSIVO:
 *    - Cards com overflow horizontal em telas pequenas
 *    - Gráficos com ResponsiveContainer e adaptações mobile
 *    - Tabelas detalhadas com sticky columns e scroll otimizado
 * 
 * 3. UX MELHORADA:
 *    - Indicações visuais de scroll horizontal
 *    - Tooltips com informações extras em versões compactas
 *    - Formatação adaptativa (Satoshis para valores pequenos)
 */
export function ReportsComparison({ onBack, btcToUsd, brlToUsd }: ReportsComparisonProps) {
  const { reports } = useReports();
  const { syncedData } = useReportSync();
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("accumulated");
  const [displayUnit, setDisplayUnit] = useState<DisplayUnit>("btc");
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
    end: new Date(),
  });
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("summary");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const isMobile = useIsMobile();

  // Selecionar os primeiros dois relatórios por padrão
  useEffect(() => {
    if (reports.length > 0 && selectedReportIds.length === 0) {
      setSelectedReportIds(reports.slice(0, Math.min(2, reports.length)).map(r => r.id));
    }
  }, [reports, selectedReportIds]);
  
  // Reagir a eventos de atualização de relatórios
  useEffect(() => {
    if (syncedData.needsRefresh) {
      console.log('[ReportsComparison] Atualizando após evento de sincronização');
      setRefreshTrigger(prev => prev + 1);
    }
  }, [syncedData]);

  // Função para alternar a seleção de um relatório
  const toggleReportSelection = (reportId: string) => {
    setSelectedReportIds(prev => {
      if (prev.includes(reportId)) {
        return prev.filter(id => id !== reportId);
      } else {
        return [...prev, reportId];
      }
    });
  };

  // Função para obter cor de um relatório
  const getReportColor = (reportId: string) => {
    const report = reports.find(r => r.id === reportId);
    return report?.color || "#8844ee";
  };

  // Converter o valor de BTC para a moeda de exibição
  const convertFromBtc = (btcValue: number): number => {
    switch (displayUnit) {
      case "usd":
        return btcValue * btcToUsd;
      case "brl":
        return btcValue * btcToUsd * brlToUsd;
      default:
        return btcValue;
    }
  };

  // Formatar valor para exibição
  const formatValue = (value: number): string => {
    switch (displayUnit) {
      case "usd":
        return `$${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case "brl":
        return `R$${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case "btc":
        return value >= 0.01 
          ? `₿${value.toLocaleString('pt-BR', { minimumFractionDigits: 8, maximumFractionDigits: 8 })}`
          : `丰${(value * 100000000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
    }
  };

  // Calcular dados de comparação
  const comparisonData = useMemo((): ComparisonDataResult | null => {
    if (selectedReportIds.length === 0) return null;

    console.log('[ReportsComparison] Calculando dados de comparação para:', selectedReportIds);
    
    const selectedReports = reports.filter(r => selectedReportIds.includes(r.id));
    console.log('[ReportsComparison] Relatórios selecionados:', selectedReports.map(r => ({
      id: r.id,
      name: r.name,
      investmentsCount: r.investments?.length || 0,
      profitsCount: r.profits?.length || 0
    })));
    
    let minDateOverall = new Date(); // Renomeado para evitar conflito com minDate/maxDate no retorno
    let maxDateOverall = new Date(0); // Renomeado
    
    selectedReports.forEach(report => {
      const allDates = [
        ...(report.investments?.map(i => parseReportDateStringToUTCDate(i.date)) || []),
        ...(report.profits?.map(p => parseReportDateStringToUTCDate(p.date)) || [])
      ].filter(date => !isNaN(date.getTime()));
      
      console.log(`[ReportsComparison] Datas encontradas para ${report.name}:`, allDates.length);
      
      if (allDates.length === 0) return;

      const reportMinDate = new Date(Math.min(...allDates.map(d => d.getTime())));
      const reportMaxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
      
      console.log(`[ReportsComparison] Range de datas para ${report.name}:`, {
        min: reportMinDate.toISOString(),
        max: reportMaxDate.toISOString()
      });
      
      if (reportMinDate < minDateOverall) minDateOverall = reportMinDate;
      if (reportMaxDate > maxDateOverall) maxDateOverall = reportMaxDate;
    });
    
    console.log('[ReportsComparison] Range geral de datas:', {
      min: minDateOverall.toISOString(),
      max: maxDateOverall.toISOString()
    });
    
    if (minDateOverall > maxDateOverall) { // Corrigido para usar Overall
      const today = new Date();
      minDateOverall = new Date(today.getFullYear(), today.getMonth() -1, 1);
      maxDateOverall = new Date(today.getFullYear(), today.getMonth(), 1);
      console.log('[ReportsComparison] Usando range padrão (dados vazios)');
    }
    
    const months: Date[] = [];
    const currentDate = new Date(minDateOverall); // Corrigido para usar Overall
    currentDate.setDate(1); 
    
    while (currentDate <= maxDateOverall) { // Corrigido para usar Overall
      months.push(new Date(currentDate));
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    console.log(`[ReportsComparison] Meses para processamento: ${months.length}`, months.map(m => format(m, 'MMM yyyy', { locale: ptBR })));
    
    const chartData: ChartDataPoint[] = months.map(month => {
      const monthLabel = format(month, 'MMM yyyy', { locale: ptBR });
      const dataPoint: ChartDataPoint = { month: monthLabel };
      
      selectedReports.forEach(report => {
        const reportId = report.id;
        const currentReportData = reports.find(r => r.id === reportId); // Renomeado para evitar conflito
        if (!currentReportData) return;

        const reportInvestments = currentReportData.investments || [];
        const reportProfits = currentReportData.profits || [];
        
        if (comparisonMode === "accumulated") {
          const monthEndForAccumulation = new Date(month); 
          monthEndForAccumulation.setMonth(monthEndForAccumulation.getMonth() + 1);
          monthEndForAccumulation.setDate(0); 

          const investmentsUntilMonth = reportInvestments.filter(inv => {
            const invDate = parseReportDateStringToUTCDate(inv.date);
            return invDate <= monthEndForAccumulation;
          });
          
          const profitsUntilMonth = reportProfits.filter(prof => {
            const profitDate = parseReportDateStringToUTCDate(prof.date);
            return profitDate <= monthEndForAccumulation;
          });

          const totalInvestmentsBtc = investmentsUntilMonth.reduce((sum, inv) => {
            const btcAmount = convertToBtc(inv.amount, inv.unit);
            console.log(`[Debug] Investimento: ${inv.amount} ${inv.unit} = ${btcAmount} BTC`);
            return sum + btcAmount;
          }, 0);
          
          const totalProfitsBtc = profitsUntilMonth.reduce((sum, prof) => {
            const btcAmount = convertToBtc(prof.amount, prof.unit);
            const contribution = prof.isProfit ? btcAmount : -btcAmount;
            console.log(`[Debug] Lucro/Perda: ${prof.amount} ${prof.unit} = ${contribution} BTC (isProfit: ${prof.isProfit})`);
            return sum + contribution;
          }, 0);
          
          console.log(`[ReportsComparison] ${monthLabel} - ${report.name}:`, {
            investmentsBtc: totalInvestmentsBtc,
            profitsBtc: totalProfitsBtc,
            balanceBtc: totalInvestmentsBtc + totalProfitsBtc
          });
          
          dataPoint[`investments_${reportId}`] = totalInvestmentsBtc;
          dataPoint[`profits_${reportId}`] = totalProfitsBtc;
          dataPoint[`balance_${reportId}`] = totalInvestmentsBtc + totalProfitsBtc;

        } else { // Monthly mode
          const monthStart = new Date(month);
          const monthEnd = new Date(month);
          monthEnd.setMonth(monthEnd.getMonth() + 1);
          monthEnd.setDate(0); 
          
          const investmentsInMonth = reportInvestments.filter(inv => {
            const invDate = parseReportDateStringToUTCDate(inv.date);
            return invDate >= monthStart && invDate <= monthEnd;
          });
          
          const profitsInMonth = reportProfits.filter(prof => {
            const profitDate = parseReportDateStringToUTCDate(prof.date);
            return profitDate >= monthStart && profitDate <= monthEnd;
          });
          
          const monthInvestmentsBtc = investmentsInMonth.reduce((sum, inv) => {
            return sum + convertToBtc(inv.amount, inv.unit);
          }, 0);
          
          const monthProfitsBtc = profitsInMonth.reduce((sum, prof) => {
            const btcAmount = convertToBtc(prof.amount, prof.unit);
            return sum + (prof.isProfit ? btcAmount : -btcAmount);
          }, 0);
          
          dataPoint[`investments_${reportId}`] = monthInvestmentsBtc;
          dataPoint[`profits_${reportId}`] = monthProfitsBtc;
          dataPoint[`balance_${reportId}`] = monthInvestmentsBtc + monthProfitsBtc;
        }
      });
      
      return dataPoint;
    });
    
    console.log('[ReportsComparison] Dados do gráfico gerados:', chartData.slice(0, 3));
    
    const statsData: Record<string, ReportStatDetails> = {};

    selectedReports.forEach(report => {
      const reportId = report.id;
      const currentReportData = reports.find(r => r.id === reportId); // Renomeado
      if (!currentReportData) return;

      const reportInvestments = currentReportData.investments || [];
      const reportProfitsData = currentReportData.profits || []; // Renomeado
      
      const totalInvestmentsBtc = reportInvestments.reduce((sum, inv) => {
        return sum + convertToBtc(inv.amount, inv.unit);
      }, 0);
      
      const totalProfitsBtc = reportProfitsData.reduce((sum, prof) => {
        const btcAmount = convertToBtc(prof.amount, prof.unit);
        return sum + (prof.isProfit ? btcAmount : -btcAmount);
      }, 0);
      
      const finalBalanceBtc = totalInvestmentsBtc + totalProfitsBtc;
      const roiSimple = totalInvestmentsBtc > 0 
        ? (totalProfitsBtc / totalInvestmentsBtc) * 100 
        : 0;
      
      const reportAllEntriesDates = [
        ...(reportInvestments.map(i => parseReportDateStringToUTCDate(i.date))),
        ...(reportProfitsData.map(p => parseReportDateStringToUTCDate(p.date)))
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

      let roiAnualizadoPercent = 0;
      if (totalInvestmentsBtc > 0 && diasDeInvestimento > 0 && totalProfitsBtc !== -totalInvestmentsBtc) {
          const roiDecimal = totalProfitsBtc / totalInvestmentsBtc;
          if (1 + roiDecimal > 0) { // Evitar log de NaN ou raiz de negativo
              roiAnualizadoPercent = (Math.pow(1 + roiDecimal, 365 / diasDeInvestimento) - 1) * 100;
          } else if (roiDecimal === -1) { // Perda total
             roiAnualizadoPercent = -100;
          } else { // Casos onde 1 + roiDecimal é <= 0 mas não é perda total (ex: grande perda inicial)
             roiAnualizadoPercent = 0; // Ou alguma outra representação para ROI anualizado não calculável/significativo
          }
      } else if (totalInvestmentsBtc > 0 && diasDeInvestimento === 0 && totalProfitsBtc !== 0) {
          // Se houver lucro/perda no mesmo dia do investimento, ROI anualizado não é bem definido
          // Pode-se optar por mostrar N/A ou o ROI simples se o período for muito curto
          roiAnualizadoPercent = 0; // Ou roiSimple, ou NaN para indicar N/A na UI
      }


      const mediaDiariaLucroBtc = diasDeInvestimento > 0 ? totalProfitsBtc / diasDeInvestimento : 0;
      const mediaDiariaRoiPercent = diasDeInvestimento > 0 && totalInvestmentsBtc > 0 ? roiSimple / diasDeInvestimento : 0;
      
      statsData[reportId] = {
        totalInvestments: totalInvestmentsBtc,
        totalProfits: totalProfitsBtc,
        finalBalance: finalBalanceBtc,
        roi: roiSimple,
        primeiroAporteDate: primeiroAporteDateObj ? primeiroAporteDateObj.toISOString() : null,
        diasDeInvestimento,
        tempoTotalInvestimento: formatTempoInvestimento(diasDeInvestimento),
        roiAnualizadoPercent,
        mediaDiariaLucroBtc,
        mediaDiariaRoiPercent
      };
    });
    
    let aggregatedTotalInvestmentsBtc = 0;
    let aggregatedTotalProfitsBtc = 0;

    selectedReportIds.forEach(id => {
      const reportStats = statsData[id]; 
      if (reportStats) { 
        aggregatedTotalInvestmentsBtc += reportStats.totalInvestments; // Removido || 0 pois totalInvestments é number
        aggregatedTotalProfitsBtc += reportStats.totalProfits;   // Removido || 0 pois totalProfits é number
      }
    });

    const aggregatedTotalBalanceBtc = aggregatedTotalInvestmentsBtc + aggregatedTotalProfitsBtc;
    const aggregatedTotalRoi = aggregatedTotalInvestmentsBtc > 0
      ? (aggregatedTotalProfitsBtc / aggregatedTotalInvestmentsBtc) * 100
      : 0;

    let aggregatedPrimeiroAporteDateObj: Date | null = null;
    let aggregatedUltimoRegistroDateObj: Date | null = null;

    selectedReportIds.forEach(id => {
      const reportStats = statsData[id];
      if (reportStats?.primeiroAporteDate) {
        const reportPrimeiroAporte = new Date(reportStats.primeiroAporteDate);
        if (!aggregatedPrimeiroAporteDateObj || reportPrimeiroAporte < aggregatedPrimeiroAporteDateObj) {
          aggregatedPrimeiroAporteDateObj = reportPrimeiroAporte;
        }
      }

      const currentReportData = reports.find(r => r.id === id); // Renomeado
      if (currentReportData) {
        const allReportEntriesDates = [
          ...(currentReportData.investments?.map(i => parseReportDateStringToUTCDate(i.date)) || []),
          ...(currentReportData.profits?.map(p => parseReportDateStringToUTCDate(p.date)) || [])
        ].filter(date => !isNaN(date.getTime()));

        if (allReportEntriesDates.length > 0) {
          const reportUltimoRegistro = new Date(Math.max(...allReportEntriesDates.map(d => d.getTime())));
          if (!aggregatedUltimoRegistroDateObj || reportUltimoRegistro > aggregatedUltimoRegistroDateObj) {
            aggregatedUltimoRegistroDateObj = reportUltimoRegistro;
          }
        }
      }
    });

    let aggregatedDiasDeInvestimento = 0;
    if (aggregatedPrimeiroAporteDateObj && aggregatedUltimoRegistroDateObj && aggregatedUltimoRegistroDateObj >= aggregatedPrimeiroAporteDateObj) {
      aggregatedDiasDeInvestimento = differenceInDays(startOfDay(aggregatedUltimoRegistroDateObj), startOfDay(aggregatedPrimeiroAporteDateObj));
    }

    let aggregatedRoiAnualizadoPercent = 0;
    if (aggregatedTotalInvestmentsBtc > 0 && aggregatedDiasDeInvestimento > 0 && aggregatedTotalProfitsBtc !== -aggregatedTotalInvestmentsBtc) {
      const aggregatedRoiDecimal = aggregatedTotalProfitsBtc / aggregatedTotalInvestmentsBtc;
      if (1 + aggregatedRoiDecimal > 0) {
        aggregatedRoiAnualizadoPercent = (Math.pow(1 + aggregatedRoiDecimal, 365 / aggregatedDiasDeInvestimento) - 1) * 100;
      } else if (aggregatedRoiDecimal === -1) {
         aggregatedRoiAnualizadoPercent = -100;
      } else {
         aggregatedRoiAnualizadoPercent = 0; 
      }
    } else if (aggregatedTotalInvestmentsBtc > 0 && aggregatedDiasDeInvestimento === 0 && aggregatedTotalProfitsBtc !== 0){
        aggregatedRoiAnualizadoPercent = 0; 
    }


    const aggregatedMediaDiariaLucroBtc = aggregatedDiasDeInvestimento > 0 ? aggregatedTotalProfitsBtc / aggregatedDiasDeInvestimento : 0;
    const aggregatedMediaDiariaRoiPercent = aggregatedDiasDeInvestimento > 0 && aggregatedTotalInvestmentsBtc > 0 ? aggregatedTotalRoi / aggregatedDiasDeInvestimento : 0;
    
    // Correção para o erro de linter (tentativa 2)
    let aggregatedPrimeiroAporteISO: string | null = null;
    if (aggregatedPrimeiroAporteDateObj) { // Verifica se não é null
      const dateCandidate = aggregatedPrimeiroAporteDateObj as Date; // Type assertion
      if (dateCandidate instanceof Date && !isNaN(dateCandidate.getTime())) {
        aggregatedPrimeiroAporteISO = dateCandidate.toISOString();
      }
    }

    return {
      chartData,
      statsData,
      dateRange: { // Usar os Overall aqui
        start: minDateOverall,
        end: maxDateOverall
      },
      totalInvestmentsBtc: aggregatedTotalInvestmentsBtc,
      totalProfitsBtc: aggregatedTotalProfitsBtc,
      totalBalanceBtc: aggregatedTotalBalanceBtc,
      totalRoi: aggregatedTotalRoi,
      aggregatedPrimeiroAporteDate: aggregatedPrimeiroAporteISO, // Usar a variável corrigida
      aggregatedDiasDeInvestimento, 
      aggregatedTempoTotalInvestimento: formatTempoInvestimento(aggregatedDiasDeInvestimento),
      aggregatedRoiAnualizadoPercent,
      aggregatedMediaDiariaLucroBtc,
      aggregatedMediaDiariaRoiPercent
    };
  }, [reports, selectedReportIds, comparisonMode]); // CORRIGIDO: Removido minDate e maxDate das dependências

  // Função para gerar barras do gráfico
  const generateChartBars = () => {
    if (!comparisonData || selectedReportIds.length === 0) return null;
    
    return selectedReportIds.map(reportId => {
      const color = getReportColor(reportId);
      
      return (
        <Bar
          key={`balance_${reportId}`}
          dataKey={`balance_${reportId}`}
          fill={color}
          name={reports.find(r => r.id === reportId)?.name || ""}
          radius={[4, 4, 0, 0]}
        />
      );
    });
  };

  // Formatar tooltip do gráfico
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/90 border border-purple-700/50 rounded-md p-3 shadow-lg backdrop-blur-sm">
          <p className="font-medium text-sm text-white mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={`item-${index}`} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-white">{entry.name}:</span>
                <span className="text-xs font-medium text-white">
                  {formatValue(convertFromBtc(entry.value))}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    return null;
  };

  // Preparar dados para os gráficos e tabelas
  const comparisonDataForTabs = useMemo(() => {
    if (!reports || reports.length === 0) {
      return {
        summaries: [],
        barChartData: [],
        pieData: [],
      };
    }
    // Calcular totais para cada relatório
    const reportSummaries = reports.map(report => {
      const totalInvestmentsBtc = report.investments?.reduce(
        (total, inv) => total + convertToBtc(inv.amount, inv.unit),
        0
      ) || 0;

      const totalProfitsBtc = report.profits?.reduce((total, profit) => {
        const btcAmount = convertToBtc(profit.amount, profit.unit);
        return profit.isProfit ? total + btcAmount : total - btcAmount;
      }, 0) || 0;

      // Calcular valores em USD e BRL
      const totalInvestmentsUsd = totalInvestmentsBtc * btcToUsd;
      const totalInvestmentsBrl = totalInvestmentsUsd * brlToUsd;
      
      const totalProfitsUsd = totalProfitsBtc * btcToUsd;
      const totalProfitsBrl = totalProfitsUsd * brlToUsd;
      
      // Calcular ROI
      const roi = totalInvestmentsBtc > 0 ? (totalProfitsBtc / totalInvestmentsBtc) * 100 : 0;
      
      return {
        id: report.id,
        name: report.name,
        color: report.color || "#8844ee",
        investments: {
          btc: totalInvestmentsBtc,
          usd: totalInvestmentsUsd,
          brl: totalInvestmentsBrl
        },
        profits: {
          btc: totalProfitsBtc,
          usd: totalProfitsUsd,
          brl: totalProfitsBrl
        },
        roi: roi,
        balance: {
          btc: totalInvestmentsBtc + totalProfitsBtc,
          usd: totalInvestmentsUsd + totalProfitsUsd,
          brl: totalInvestmentsBrl + totalProfitsBrl
        },
        investmentCount: report.investments.length,
        profitCount: report.profits.length
      };
    });
    
    // Preparar dados para o gráfico de comparação
    const barChartData = reportSummaries.map(summary => ({
      name: summary.name,
      investimentos: Number(summary.investments.btc.toFixed(8)),
      lucros: Number(summary.profits.btc.toFixed(8)),
      total: Number((summary.investments.btc + summary.profits.btc).toFixed(8)),
      roi: Number(summary.roi.toFixed(2)),
      color: summary.color
    }));
    
    // Preparar dados para gráfico de pizza
    const pieData = reportSummaries.map(summary => ({
      name: summary.name,
      value: summary.balance.btc > 0 ? summary.balance.btc : 0,
      color: summary.color
    }));
    
    return {
      summaries: reportSummaries,
      barChartData,
      pieData
    };
  }, [reports, btcToUsd, brlToUsd]);
  
  const formatCryptoAmount = (amount: number): string => {
    return amount.toFixed(8);
  };
  
  const formatCurrencyAmount = (amount: number, currency: "USD" | "BRL"): string => {
    return currency === "USD" 
      ? `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `R$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  // Verificar se há dados suficientes para mostrar comparações
  if (reports.length < 2) {
    return (
      <Card className="bg-black/30 border-purple-700/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Comparação de Relatórios</CardTitle>
          <CardDescription>
            Você precisa de pelo menos dois relatórios para ver comparações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="text-muted-foreground">
              Crie mais relatórios para visualizar comparações de desempenho
            </p>
            <Button 
              variant="default" 
              className="mt-4 bg-purple-700 hover:bg-purple-800" 
              onClick={onBack}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Voltar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative space-y-6 pb-20">
      {/* Botão voltar fixo para dispositivos móveis */}
      <div className="md:hidden fixed bottom-4 right-4 z-50">
        <Button 
          variant="default" 
          size="lg" 
          className="rounded-full shadow-lg bg-purple-700 hover:bg-purple-800" 
          onClick={onBack}
        >
          <ChevronLeft className="mr-1 h-5 w-5" />
          Voltar
        </Button>
      </div>
      
      <div className="flex justify-between items-center">
        <Button 
          variant="ghost" 
          size="sm" 
          className="px-2 hidden md:flex" 
          onClick={onBack}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Voltar
        </Button>
        
        <h2 className="text-xl font-semibold text-center">Comparação de Relatórios</h2>
        
        <Button
          variant="outline"
          size="sm"
          className="px-2"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Sliders className="h-4 w-4" />
          <span className="sr-only">Configurações</span>
        </Button>
      </div>
      
      {showSettings && (
        <Card className="bg-black/40 border-purple-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Configurações de Visualização</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Modo de Comparação</Label>
                <RadioGroup 
                  value={comparisonMode} 
                  onValueChange={(v) => setComparisonMode(v as ComparisonMode)}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="accumulated" id="mode-accumulated" />
                    <Label htmlFor="mode-accumulated" className="text-sm">Acumulado</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="monthly" id="mode-monthly" />
                    <Label htmlFor="mode-monthly" className="text-sm">Por mês</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="space-y-2">
                <Label>Unidade de Exibição</Label>
                <RadioGroup 
                  value={displayUnit} 
                  onValueChange={(v) => setDisplayUnit(v as DisplayUnit)}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="btc" id="unit-btc" />
                    <Label htmlFor="unit-btc" className="text-sm">BTC/Satoshis</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="usd" id="unit-usd" />
                    <Label htmlFor="unit-usd" className="text-sm">USD (Dólares)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="brl" id="unit-brl" />
                    <Label htmlFor="unit-brl" className="text-sm">BRL (Reais)</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Seleção de Relatórios */}
        <Card className="lg:col-span-1 bg-black/40 border-purple-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Selecionar Relatórios</CardTitle>
            <CardDescription>
              Escolha até 3 relatórios para comparar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px] sm:h-[300px] pr-4 -mr-4">
              <div className="space-y-2">
                {reports.map(report => (
                  <div 
                    key={report.id}
                    className={cn(
                      "flex items-start p-3 rounded-md border border-transparent transition-colors",
                      selectedReportIds.includes(report.id) 
                        ? "bg-purple-900/40 border-purple-700/50" 
                        : "bg-black/30 hover:bg-black/50"
                    )}
                  >
                    <Checkbox 
                      id={`report-${report.id}`}
                      checked={selectedReportIds.includes(report.id)}
                      onCheckedChange={() => toggleReportSelection(report.id)}
                      className="mt-0.5"
                    />
                    <div className="ml-3 space-y-1">
                      <Label 
                        htmlFor={`report-${report.id}`}
                        className="text-sm font-medium flex items-center gap-2 cursor-pointer"
                      >
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: report.color || "#8844ee" }}
                        />
                        {report.name}
                      </Label>
                      {report.description && (
                        <p className="text-xs text-gray-400 ml-5">{report.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        
        {/* Gráfico de Comparação */}
        <Card className="lg:col-span-2 bg-black/40 border-purple-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex justify-between items-center">
              <span>Evolução do Saldo</span>
              <Badge variant="outline" className="text-xs bg-black/30 border-purple-700/50">
                {comparisonMode === "accumulated" ? "Acumulado" : "Mensal"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-1">
            {selectedReportIds.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] sm:h-[300px] text-center">
                <div className="space-y-2">
                  <CircleSlash2 className="h-10 w-10 text-gray-500 mx-auto" />
                  <p className="text-gray-400">Selecione pelo menos um relatório para visualizar o gráfico</p>
                </div>
              </div>
            ) : !comparisonData ? (
              <div className="flex items-center justify-center h-[200px] sm:h-[300px]">
                <RefreshCw className="h-8 w-8 text-purple-500 animate-spin" />
              </div>
            ) : (
              <div className="h-[200px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={comparisonData.chartData}
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#888" 
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => isMobile ? value.split(' ')[0] : value}
                    />
                    <YAxis 
                      stroke="#888"
                      fontSize={10}
                      width={isMobile ? 30 : 40}
                      tickFormatter={(value) => {
                        const converted = convertFromBtc(value);
                        if (displayUnit === "btc") {
                          return value.toFixed(value < 0.1 ? 2 : 1);
                        } else {
                          return converted.toFixed(0);
                        }
                      }}
                    />
                    <Tooltip 
                      content={<CustomTooltip />}
                      cursor={{ fill: 'rgba(124, 58, 237, 0.4)', stroke: 'rgba(139, 92, 246, 0.6)', strokeWidth: 1.5 }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: isMobile ? 10 : 12 }}
                    />
                    {generateChartBars()}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Resultados da Comparação */}
      {comparisonData && selectedReportIds.length > 0 && (
        <Card className="bg-black/40 border-purple-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Comparativo de Resultados</CardTitle>
            <CardDescription className="md:hidden text-xs text-muted-foreground">
              Deslize horizontalmente para ver mais dados
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto rounded-lg">
              <ScrollArea className="w-full max-h-[400px]" orientation="both">
                {/* Versão completa para telas grandes */}
                <div className="hidden lg:block min-w-[900px]">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-purple-700/30">
                        <th className="sticky left-0 bg-black/60 backdrop-blur-sm z-10 text-left py-2 px-3 text-sm font-medium text-gray-300 border-r border-purple-700/20">Relatório</th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-gray-300 whitespace-nowrap">Investimento Total</th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-gray-300 whitespace-nowrap">Lucro/Perda</th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-gray-300 whitespace-nowrap">Saldo Final</th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-gray-300 whitespace-nowrap">
                          <TooltipProvider>
                            <UITooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center justify-end gap-1">
                                  ROI
                                  <Info className="h-3 w-3 text-gray-400" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs bg-black/90 border-purple-700/50 text-xs">
                                <p>Return on Investment (Retorno sobre Investimento)</p>
                                <p className="text-gray-400 mt-1">
                                  Calculado como: (Lucro Total / Investimento Total) × 100
                                </p>
                              </TooltipContent>
                            </UITooltip>
                          </TooltipProvider>
                        </th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-gray-300 whitespace-nowrap">Data 1º Aporte</th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-gray-300 whitespace-nowrap">Tempo Invest.</th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-gray-300 whitespace-nowrap">ROI Anualizado</th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-gray-300 whitespace-nowrap">Lucro Diário Médio</th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-gray-300 whitespace-nowrap">ROI Diário Médio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReportIds.map(reportId => {
                        const report = reports.find(r => r.id === reportId);
                        const stats = comparisonData.statsData[reportId];
                        
                        if (!report || !stats) return null;
                        
                        const totalInvestments = convertFromBtc(stats.totalInvestments);
                        const totalProfits = convertFromBtc(stats.totalProfits);
                        const finalBalance = convertFromBtc(stats.finalBalance);
                        const roi = stats.roi;

                        // NOVAS MÉTRICAS PARA EXIBIÇÃO
                        const primeiroAporte = stats.primeiroAporteDate ? format(new Date(stats.primeiroAporteDate), 'dd/MM/yy', { locale: ptBR }) : 'N/A';
                        const tempoInvest = stats.tempoTotalInvestimento; // Já formatado pelo formatTempoInvestimento
                        const roiAnualizado = (stats.diasDeInvestimento > 0 && stats.totalInvestments > 0 && stats.roiAnualizadoPercent !== -100) 
                                              ? `${stats.roiAnualizadoPercent.toFixed(2)}%` 
                                              : (stats.roiAnualizadoPercent === -100 ? '-100.00%' : 'N/A');
                        const mediaLucro = stats.diasDeInvestimento > 0 
                                           ? formatValue(convertFromBtc(stats.mediaDiariaLucroBtc)) 
                                           : 'N/A';
                        const mediaRoi = (stats.diasDeInvestimento > 0 && stats.totalInvestments > 0) 
                                         ? `${stats.mediaDiariaRoiPercent.toFixed(4)}%` 
                                         : 'N/A';
                        
                        return (
                          <tr key={reportId} className="border-b border-purple-700/20 hover:bg-purple-900/10">
                            <td className="sticky left-0 bg-black/60 backdrop-blur-sm z-10 py-3 px-3 border-r border-purple-700/20">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: report.color || "#8844ee" }}
                                />
                                <span className="font-medium truncate max-w-[120px]">{report.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-medium whitespace-nowrap">
                              {formatValue(totalInvestments)}
                            </td>
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <div className={cn(
                                "flex items-center justify-end font-medium",
                                totalProfits > 0 ? "text-green-400" : totalProfits < 0 ? "text-red-400" : "text-gray-400"
                              )}>
                                {totalProfits > 0 ? (
                                  <ArrowUp className="h-4 w-4 mr-1" />
                                ) : totalProfits < 0 ? (
                                  <ArrowDown className="h-4 w-4 mr-1" />
                                ) : null}
                                {formatValue(Math.abs(totalProfits))}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-medium whitespace-nowrap">
                              {formatValue(finalBalance)}
                            </td>
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <Badge className={cn(
                                "font-medium",
                                roi > 0 ? "bg-green-900/50 text-green-300 hover:bg-green-900/70" : 
                                roi < 0 ? "bg-red-900/50 text-red-300 hover:bg-red-900/70" : 
                                "bg-gray-700/30 text-gray-300 hover:bg-gray-700/50"
                              )}>
                                {roi > 0 ? "+" : ""}
                                {roi.toFixed(2)}%
                              </Badge>
                            </td>
                            <td className="py-3 px-3 text-right text-xs whitespace-nowrap">{primeiroAporte}</td>
                            <td className="py-3 px-3 text-right text-xs whitespace-nowrap">{tempoInvest}</td>
                            <td className={cn("py-3 px-3 text-right text-xs whitespace-nowrap", stats.roiAnualizadoPercent > 0 ? "text-green-400" : stats.roiAnualizadoPercent < 0 ? "text-red-400" : "text-gray-400")}>{roiAnualizado}</td>
                            <td className={cn("py-3 px-3 text-right text-xs whitespace-nowrap", stats.mediaDiariaLucroBtc > 0 ? "text-green-400" : stats.mediaDiariaLucroBtc < 0 ? "text-red-400" : "text-gray-400")}>{mediaLucro}</td>
                            <td className={cn("py-3 px-3 text-right text-xs whitespace-nowrap", stats.mediaDiariaRoiPercent > 0 ? "text-green-400" : stats.mediaDiariaRoiPercent < 0 ? "text-red-400" : "text-gray-400")}>{mediaRoi}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Versão compacta para telas médias */}
                <div className="hidden md:block lg:hidden min-w-[750px]">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-purple-700/30">
                        <th className="sticky left-0 bg-black/60 backdrop-blur-sm z-10 text-left py-2 px-2 text-sm font-medium text-gray-300 border-r border-purple-700/20">Relatório</th>
                        <th className="text-right py-2 px-2 text-sm font-medium text-gray-300 whitespace-nowrap">Investimento</th>
                        <th className="text-right py-2 px-2 text-sm font-medium text-gray-300 whitespace-nowrap">Lucro</th>
                        <th className="text-right py-2 px-2 text-sm font-medium text-gray-300 whitespace-nowrap">Saldo</th>
                        <th className="text-right py-2 px-2 text-sm font-medium text-gray-300 whitespace-nowrap">ROI</th>
                        <th className="text-right py-2 px-2 text-sm font-medium text-gray-300 whitespace-nowrap">Tempo</th>
                        <th className="text-right py-2 px-2 text-sm font-medium text-gray-300 whitespace-nowrap">ROI Anual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReportIds.map(reportId => {
                        const report = reports.find(r => r.id === reportId);
                        const stats = comparisonData.statsData[reportId];
                        
                        if (!report || !stats) return null;
                        
                        const totalInvestments = convertFromBtc(stats.totalInvestments);
                        const totalProfits = convertFromBtc(stats.totalProfits);
                        const finalBalance = convertFromBtc(stats.finalBalance);
                        const roi = stats.roi;

                        // Formatação compacta para versão média
                        const tempoInvest = stats.diasDeInvestimento > 365 
                          ? `${Math.floor(stats.diasDeInvestimento/365)}a ${Math.floor((stats.diasDeInvestimento%365)/30)}m`
                          : stats.diasDeInvestimento > 30 
                            ? `${Math.floor(stats.diasDeInvestimento/30)}m ${stats.diasDeInvestimento%30}d`
                            : `${stats.diasDeInvestimento}d`;
                            
                        const roiAnualizado = (stats.diasDeInvestimento > 0 && stats.totalInvestments > 0 && stats.roiAnualizadoPercent !== -100) 
                          ? `${stats.roiAnualizadoPercent.toFixed(1)}%` 
                          : (stats.roiAnualizadoPercent === -100 ? '-100%' : 'N/A');
                        
                        return (
                          <tr key={reportId} className="border-b border-purple-700/20 hover:bg-purple-900/10">
                            <td className="sticky left-0 bg-black/60 backdrop-blur-sm z-10 py-2 px-2 border-r border-purple-700/20">
                              <div className="flex items-center gap-1">
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: report.color || "#8844ee" }}
                                />
                                <span className="font-medium text-sm truncate max-w-[100px]">{report.name}</span>
                              </div>
                            </td>
                            <td className="py-2 px-2 text-right font-medium text-xs whitespace-nowrap">
                              {formatValue(totalInvestments)}
                            </td>
                            <td className="py-2 px-2 text-right text-xs whitespace-nowrap">
                              <div className={cn(
                                "flex items-center justify-end font-medium",
                                totalProfits > 0 ? "text-green-400" : totalProfits < 0 ? "text-red-400" : "text-gray-400"
                              )}>
                                {totalProfits > 0 ? (
                                  <ArrowUp className="h-3 w-3 mr-1" />
                                ) : totalProfits < 0 ? (
                                  <ArrowDown className="h-3 w-3 mr-1" />
                                ) : null}
                                {formatValue(Math.abs(totalProfits))}
                              </div>
                            </td>
                            <td className="py-2 px-2 text-right font-medium text-xs whitespace-nowrap">
                              {formatValue(finalBalance)}
                            </td>
                            <td className="py-2 px-2 text-right text-xs whitespace-nowrap">
                              <Badge className={cn(
                                "font-medium text-xs px-1.5 py-0.5",
                                roi > 0 ? "bg-green-900/50 text-green-300 hover:bg-green-900/70" : 
                                roi < 0 ? "bg-red-900/50 text-red-300 hover:bg-red-900/70" : 
                                "bg-gray-700/30 text-gray-300 hover:bg-gray-700/50"
                              )}>
                                {roi > 0 ? "+" : ""}
                                {roi.toFixed(1)}%
                              </Badge>
                            </td>
                            <td className="py-2 px-2 text-right text-xs whitespace-nowrap">{tempoInvest}</td>
                            <td className={cn("py-2 px-2 text-right text-xs whitespace-nowrap", stats.roiAnualizadoPercent > 0 ? "text-green-400" : stats.roiAnualizadoPercent < 0 ? "text-red-400" : "text-gray-400")}>{roiAnualizado}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Versão mobile - ultra compacta */}
                <div className="block md:hidden min-w-[500px]">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-purple-700/30">
                        <th className="sticky left-0 bg-black/60 backdrop-blur-sm z-10 text-left py-2 px-2 text-xs font-medium text-gray-300 border-r border-purple-700/20">Relatório</th>
                        <th className="text-right py-2 px-2 text-xs font-medium text-gray-300 whitespace-nowrap">Invest.</th>
                        <th className="text-right py-2 px-2 text-xs font-medium text-gray-300 whitespace-nowrap">Lucro</th>
                        <th className="text-right py-2 px-2 text-xs font-medium text-gray-300 whitespace-nowrap">ROI</th>
                        <th className="text-right py-2 px-2 text-xs font-medium text-gray-300 whitespace-nowrap">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReportIds.map(reportId => {
                        const report = reports.find(r => r.id === reportId);
                        const stats = comparisonData.statsData[reportId];
                        
                        if (!report || !stats) return null;
                        
                        const totalInvestments = convertFromBtc(stats.totalInvestments);
                        const totalProfits = convertFromBtc(stats.totalProfits);
                        const finalBalance = convertFromBtc(stats.finalBalance);
                        const roi = stats.roi;
                        
                        return (
                          <tr key={reportId} className="border-b border-purple-700/20 hover:bg-purple-900/10">
                            <td className="sticky left-0 bg-black/60 backdrop-blur-sm z-10 py-2 px-2 border-r border-purple-700/20">
                              <div className="flex items-center gap-1">
                                <div 
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: report.color || "#8844ee" }}
                                />
                                <span className="font-medium text-xs truncate max-w-[80px]">{report.name}</span>
                              </div>
                            </td>
                            <td className="py-2 px-2 text-right text-xs whitespace-nowrap">
                              <TooltipProvider>
                                <UITooltip>
                                  <TooltipTrigger asChild>
                                    <div className="font-medium">
                                      {displayUnit === "btc" && totalInvestments < 0.01 
                                        ? `丰${(totalInvestments * 100000000).toFixed(0)}`
                                        : formatValue(totalInvestments).length > 8 
                                          ? formatValue(totalInvestments).substring(0, 8) + "..."
                                          : formatValue(totalInvestments)
                                      }
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-black/90 border-purple-700/50 text-xs">
                                    <p>{formatValue(totalInvestments)}</p>
                                  </TooltipContent>
                                </UITooltip>
                              </TooltipProvider>
                            </td>
                            <td className="py-2 px-2 text-right text-xs whitespace-nowrap">
                              <TooltipProvider>
                                <UITooltip>
                                  <TooltipTrigger asChild>
                                    <div className={cn(
                                      "font-medium",
                                      totalProfits > 0 ? "text-green-400" : totalProfits < 0 ? "text-red-400" : "text-gray-400"
                                    )}>
                                      {totalProfits > 0 ? "+" : totalProfits < 0 ? "-" : ""}
                                      {displayUnit === "btc" && Math.abs(totalProfits) < 0.01 && totalProfits !== 0
                                        ? `丰${(Math.abs(totalProfits) * 100000000).toFixed(0)}`
                                        : formatValue(Math.abs(totalProfits)).length > 6
                                          ? formatValue(Math.abs(totalProfits)).substring(0, 6) + "..."
                                          : formatValue(Math.abs(totalProfits))
                                      }
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-black/90 border-purple-700/50 text-xs">
                                    <p>{totalProfits >= 0 ? "+" : ""}{formatValue(totalProfits)}</p>
                                  </TooltipContent>
                                </UITooltip>
                              </TooltipProvider>
                            </td>
                            <td className="py-2 px-2 text-right text-xs whitespace-nowrap">
                              <span className={cn(
                                "font-medium text-xs",
                                roi > 0 ? "text-green-400" : roi < 0 ? "text-red-400" : "text-gray-400"
                              )}>
                                {roi > 0 ? "+" : ""}
                                {roi.toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-2 px-2 text-right text-xs whitespace-nowrap">
                              <TooltipProvider>
                                <UITooltip>
                                  <TooltipTrigger asChild>
                                    <div className="font-medium">
                                      {displayUnit === "btc" && finalBalance < 0.01 
                                        ? `丰${(finalBalance * 100000000).toFixed(0)}`
                                        : formatValue(finalBalance).length > 8
                                          ? formatValue(finalBalance).substring(0, 8) + "..."
                                          : formatValue(finalBalance)
                                      }
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-black/90 border-purple-700/50 text-xs">
                                    <p>{formatValue(finalBalance)}</p>
                                    <p className="text-gray-400 mt-1">
                                      Tempo: {stats.tempoTotalInvestimento}
                                    </p>
                                  </TooltipContent>
                                </UITooltip>
                              </TooltipProvider>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 h-auto gap-2 bg-transparent">
          <TabsTrigger
            value="summary"
            className={`data-[state=active]:bg-purple-800 data-[state=active]:text-white bg-black/30 border border-purple-700/50 py-2 text-xs sm:text-sm`}
          >
            Resumo
          </TabsTrigger>
          <TabsTrigger
            value="charts"
            className={`data-[state=active]:bg-purple-800 data-[state=active]:text-white bg-black/30 border border-purple-700/50 py-2 text-xs sm:text-sm`}
          >
            Gráficos
          </TabsTrigger>
          <TabsTrigger
            value="details"
            className={`data-[state=active]:bg-purple-800 data-[state=active]:text-white bg-black/30 border border-purple-700/50 py-2 text-xs sm:text-sm`}
          >
            Detalhes
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="summary" className="pt-2">
          {/* Cards de resumo com scrolling horizontal em telas pequenas */}
          <div className="overflow-x-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 min-w-[300px]">
              <div className="p-4 rounded-lg bg-purple-900/20 border border-purple-800/30 min-w-[280px] sm:min-w-0">
                <div className="text-xs text-muted-foreground mb-1">Total de Investimentos</div>
                <div className="text-xl font-bold">
                  <AnimatedCounter 
                    value={(() => {
                      const val = comparisonData?.totalInvestmentsBtc || 0;
                      return val < 0.01 && val > -0.01 && val !== 0 ? val * 100000000 : val;
                    })()}
                    prefix={(() => {
                      const val = comparisonData?.totalInvestmentsBtc || 0;
                      return val < 0.01 && val > -0.01 && val !== 0 ? "丰 " : "₿ ";
                    })()}
                    decimals={(() => {
                      const val = comparisonData?.totalInvestmentsBtc || 0;
                      return val < 0.01 && val > -0.01 && val !== 0 ? 0 : 8;
                    })()}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrencyAmount((comparisonData?.totalInvestmentsBtc || 0) * btcToUsd, "USD")}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-purple-900/20 border border-purple-800/30 min-w-[280px] sm:min-w-0">
                <div className="text-xs text-muted-foreground mb-1">Total de Lucros</div>
                <div className={`text-xl font-bold ${(comparisonData?.totalProfitsBtc || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  <AnimatedCounter 
                    value={(() => {
                      const val = comparisonData?.totalProfitsBtc || 0;
                      return val < 0.01 && val > -0.01 && val !== 0 ? val * 100000000 : val;
                    })()}
                    prefix={(() => {
                      const val = comparisonData?.totalProfitsBtc || 0;
                      return val < 0.01 && val > -0.01 && val !== 0 ? "丰 " : "₿ ";
                    })()}
                    decimals={(() => {
                      const val = comparisonData?.totalProfitsBtc || 0;
                      return val < 0.01 && val > -0.01 && val !== 0 ? 0 : 8;
                    })()}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrencyAmount((comparisonData?.totalProfitsBtc || 0) * btcToUsd, "USD")}
                </div>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 min-w-[300px]">
              <div className="p-4 rounded-lg bg-purple-900/20 border border-purple-800/30 min-w-[280px] sm:min-w-0">
                <div className="text-xs text-muted-foreground mb-1">Saldo Total</div>
                <div className="text-xl font-bold">
                  <AnimatedCounter 
                    value={(() => {
                      const val = comparisonData?.totalBalanceBtc || 0;
                      return val < 0.01 && val > -0.01 && val !== 0 ? val * 100000000 : val;
                    })()}
                    prefix={(() => {
                      const val = comparisonData?.totalBalanceBtc || 0;
                      return val < 0.01 && val > -0.01 && val !== 0 ? "丰 " : "₿ ";
                    })()}
                    decimals={(() => {
                      const val = comparisonData?.totalBalanceBtc || 0;
                      return val < 0.01 && val > -0.01 && val !== 0 ? 0 : 8;
                    })()}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrencyAmount((comparisonData?.totalBalanceBtc || 0) * btcToUsd, "USD")}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-purple-900/20 border border-purple-800/30 min-w-[280px] sm:min-w-0">
                <div className="text-xs text-muted-foreground mb-1">ROI Médio</div>
                <div className={`text-xl font-bold ${(comparisonData?.totalRoi || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  <AnimatedCounter 
                    value={comparisonData?.totalRoi || 0} 
                    suffix="%"
                    decimals={2}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Retorno sobre investimento
                </div>
              </div>
            </div>
          </div>
          
          {/* TABELA DE RESUMO DETALHADO AGREGADO - MELHORADA PARA MOBILE */}
          {comparisonData && selectedReportIds.length > 0 && (
            <div className="mt-6">
              <h3 className="text-md font-semibold mb-3 text-gray-200">Resumo Agregado Detalhado</h3>
              <Card className="bg-black/20 border-purple-700/30">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <ScrollArea className="w-full max-h-[300px]" orientation="both">
                      <div className="min-w-[350px]">
                        <Table>
                          <TableBody>
                            <TableRow className="border-purple-700/20">
                              <TableCell className="font-medium text-gray-400 text-xs py-2.5 whitespace-nowrap">Primeiro Aporte Agregado</TableCell>
                              <TableCell className="text-right text-xs py-2.5 whitespace-nowrap">
                                {comparisonData.aggregatedPrimeiroAporteDate 
                                  ? format(new Date(comparisonData.aggregatedPrimeiroAporteDate), 'dd MMM yyyy', { locale: ptBR }) 
                                  : 'N/A'}
                              </TableCell>
                            </TableRow>
                            <TableRow className="border-purple-700/20">
                              <TableCell className="font-medium text-gray-400 text-xs py-2.5 whitespace-nowrap">Tempo Total de Investimento</TableCell>
                              <TableCell className="text-right text-xs py-2.5 whitespace-nowrap">{comparisonData.aggregatedTempoTotalInvestimento || 'N/A'}</TableCell>
                            </TableRow>
                            <TableRow className="border-purple-700/20">
                              <TableCell className="font-medium text-gray-400 text-xs py-2.5 whitespace-nowrap">ROI Anualizado Estimado</TableCell>
                              <TableCell className={cn("text-right text-xs py-2.5 whitespace-nowrap", comparisonData.aggregatedRoiAnualizadoPercent > 0 ? "text-green-400" : comparisonData.aggregatedRoiAnualizadoPercent < 0 ? "text-red-400" : "text-gray-400")}>
                                {(comparisonData.aggregatedDiasDeInvestimento > 0 && comparisonData.totalInvestmentsBtc > 0 && comparisonData.aggregatedRoiAnualizadoPercent !== -100)
                                  ? `${comparisonData.aggregatedRoiAnualizadoPercent.toFixed(2)}%`
                                  : (comparisonData.aggregatedRoiAnualizadoPercent === -100 ? '-100.00%' : 'N/A')}
                              </TableCell>
                            </TableRow>
                            <TableRow className="border-purple-700/20">
                              <TableCell className="font-medium text-gray-400 text-xs py-2.5 whitespace-nowrap">Média Diária de Lucro</TableCell>
                              <TableCell className={cn("text-right text-xs py-2.5 whitespace-nowrap", comparisonData.aggregatedMediaDiariaLucroBtc > 0 ? "text-green-400" : comparisonData.aggregatedMediaDiariaLucroBtc < 0 ? "text-red-400" : "text-gray-400")}>
                                {comparisonData.aggregatedDiasDeInvestimento > 0
                                  ? formatValue(convertFromBtc(comparisonData.aggregatedMediaDiariaLucroBtc))
                                  : 'N/A'}
                              </TableCell>
                            </TableRow>
                            <TableRow className="border-b-0">
                              <TableCell className="font-medium text-gray-400 text-xs py-2.5 whitespace-nowrap">Média Diária de ROI</TableCell>
                              <TableCell className={cn("text-right text-xs py-2.5 whitespace-nowrap", comparisonData.aggregatedMediaDiariaRoiPercent > 0 ? "text-green-400" : comparisonData.aggregatedMediaDiariaRoiPercent < 0 ? "text-red-400" : "text-gray-400")}>
                                {(comparisonData.aggregatedDiasDeInvestimento > 0 && comparisonData.totalInvestmentsBtc > 0)
                                  ? `${comparisonData.aggregatedMediaDiariaRoiPercent.toFixed(4)}%`
                                  : 'N/A'}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Tabela de resumo individual com scrolling melhorado */}
          <div className="overflow-x-auto mt-4 rounded-lg border border-purple-800/30">
            <ScrollArea className="max-h-[300px] w-full" orientation="both">
              <div className="min-w-[700px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px] sticky left-0 bg-black/40 backdrop-blur-sm z-10">Relatório</TableHead>
                      <TableHead className="whitespace-nowrap">Investimentos (BTC)</TableHead>
                      <TableHead className="whitespace-nowrap">Lucros (BTC)</TableHead>
                      <TableHead className="whitespace-nowrap">ROI</TableHead>
                      <TableHead className="whitespace-nowrap">Saldo (BTC)</TableHead>
                      <TableHead className="whitespace-nowrap">Saldo (USD)</TableHead>
                      <TableHead className="whitespace-nowrap"># Aportes</TableHead>
                      <TableHead className="whitespace-nowrap"># Lucros</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonDataForTabs.summaries.map(summary => (
                      <TableRow key={summary.id}>
                        <TableCell className="font-medium sticky left-0 bg-black/40 backdrop-blur-sm z-10">
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2" 
                              style={{ backgroundColor: summary.color }}
                            ></div>
                            <span className="truncate max-w-[150px]">{summary.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatCryptoAmount(summary.investments.btc)}</TableCell>
                        <TableCell className={`whitespace-nowrap ${summary.profits.btc >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatCryptoAmount(summary.profits.btc)}
                        </TableCell>
                        <TableCell className={`whitespace-nowrap ${summary.roi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {summary.roi.toFixed(2)}%
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatCryptoAmount(summary.balance.btc)}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatCurrencyAmount(summary.balance.usd, "USD")}</TableCell>
                        <TableCell className="whitespace-nowrap">{summary.investmentCount}</TableCell>
                        <TableCell className="whitespace-nowrap">{summary.profitCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </div>
        </TabsContent>
        
        <TabsContent value="charts" className="pt-2">
          <div className="space-y-6">
            <Card className="bg-purple-900/20 border border-purple-800/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Comparação de Investimentos e Lucros</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="overflow-x-auto">
                  <div className="h-[200px] sm:h-[250px] min-w-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonDataForTabs.barChartData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: isMobile ? 8 : 10 }}
                          tickFormatter={(value) => value.length > (isMobile ? 6 : 10) ? `${value.substring(0, isMobile ? 6 : 10)}...` : value}
                          interval={0}
                          angle={isMobile ? -45 : 0}
                          textAnchor={isMobile ? 'end' : 'middle'}
                          height={isMobile ? 60 : 40}
                        />
                        <YAxis 
                          tick={{ fontSize: isMobile ? 8 : 10 }} 
                          width={isMobile ? 30 : 40}
                        />
                        <Tooltip 
                          formatter={(value, name) => {
                            const formattedValue = `${Number(value).toFixed(8)} BTC`;
                            const formattedName = 
                              name === 'investimentos' ? 'Investimentos' : 
                              name === 'lucros' ? 'Lucros' : 
                              name === 'total' ? 'Saldo Total' : 
                              name === 'roi' ? 'ROI' : name;
                            return [formattedValue, formattedName];
                          }}
                          contentStyle={{ 
                            backgroundColor: 'rgba(0, 0, 0, 0.9)',
                            borderColor: 'rgba(124, 58, 237, 0.5)',
                            borderRadius: '0.375rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            fontSize: isMobile ? '11px' : '12px'
                          }}
                          itemStyle={{ color: '#FFFFFF', fontSize: isMobile ? '10px' : '12px' }}
                          labelStyle={{ color: '#FFFFFF', fontSize: isMobile ? '10px' : '12px' }}
                          cursor={{ fill: 'rgba(124, 58, 237, 0.4)', stroke: 'rgba(139, 92, 246, 0.6)', strokeWidth: 1.5 }}
                        />
                        <Legend 
                          wrapperStyle={{ fontSize: isMobile ? 9 : 12 }}
                        />
                        <Bar dataKey="investimentos" name="Investimentos" fill="#8884d8" />
                        <Bar dataKey="lucros" name="Lucros" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-purple-900/20 border border-purple-800/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Distribuição de Saldo</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="overflow-x-auto">
                  <div className="h-[200px] sm:h-[250px] min-w-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={comparisonDataForTabs.pieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={isMobile ? 50 : 80}
                          dataKey="value"
                          nameKey="name"
                          label={isMobile ? false : (entry) => entry.name}
                          labelLine={!isMobile}
                        >
                          {comparisonDataForTabs.pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number, name: string) => {
                            return [
                              <span style={{ color: '#FFFFFF' }}>{`${value.toFixed(8)} BTC`}</span>, 
                              <span style={{ color: '#FFFFFF' }}>{name}</span>
                            ];
                          }}
                          contentStyle={{ 
                            backgroundColor: 'rgba(0, 0, 0, 0.9)',
                            borderColor: 'rgba(124, 58, 237, 0.5)',
                            borderRadius: '0.375rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            color: '#FFFFFF',
                            fontSize: isMobile ? '11px' : '12px'
                          }}
                          cursor={{ fill: 'rgba(124, 58, 237, 0.4)', stroke: 'rgba(139, 92, 246, 0.6)', strokeWidth: 1.5 }}
                        />
                        <Legend 
                          wrapperStyle={{ fontSize: isMobile ? 9 : 12 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="details" className="pt-2">
          <div className="overflow-x-auto rounded-lg border border-purple-800/30">
            <ScrollArea className="h-[400px] w-full" orientation="both">
              {/* Versão para telas grandes */}
              <div className="hidden lg:block min-w-[800px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px] sticky left-0 bg-black/40 backdrop-blur-sm z-10">Relatório</TableHead>
                      <TableHead className="whitespace-nowrap">Investimentos (BTC)</TableHead>
                      <TableHead className="whitespace-nowrap">Lucros (BTC)</TableHead>
                      <TableHead className="whitespace-nowrap">ROI</TableHead>
                      <TableHead className="whitespace-nowrap">Saldo (BTC)</TableHead>
                      <TableHead className="whitespace-nowrap">Saldo (USD)</TableHead>
                      <TableHead className="whitespace-nowrap"># Aportes</TableHead>
                      <TableHead className="whitespace-nowrap"># Lucros</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonDataForTabs.summaries.map(summary => (
                      <TableRow key={summary.id}>
                        <TableCell className="font-medium sticky left-0 bg-black/40 backdrop-blur-sm z-10">
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2" 
                              style={{ backgroundColor: summary.color }}
                            ></div>
                            <span className="truncate max-w-[150px]">{summary.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatCryptoAmount(summary.investments.btc)}</TableCell>
                        <TableCell className={`whitespace-nowrap ${summary.profits.btc >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatCryptoAmount(summary.profits.btc)}
                        </TableCell>
                        <TableCell className={`whitespace-nowrap ${summary.roi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {summary.roi.toFixed(2)}%
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatCryptoAmount(summary.balance.btc)}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatCurrencyAmount(summary.balance.usd, "USD")}</TableCell>
                        <TableCell className="whitespace-nowrap">{summary.investmentCount}</TableCell>
                        <TableCell className="whitespace-nowrap">{summary.profitCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Versão compacta para telas médias e pequenas com melhor scrolling */}
              <div className="block lg:hidden min-w-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-black/40 backdrop-blur-sm z-10 whitespace-nowrap">Relatório</TableHead>
                      <TableHead className="whitespace-nowrap">Invest.</TableHead>
                      <TableHead className="whitespace-nowrap">Lucro</TableHead>
                      <TableHead className="whitespace-nowrap">ROI</TableHead>
                      <TableHead className="whitespace-nowrap">Saldo</TableHead>
                      <TableHead className="whitespace-nowrap">Aportes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonDataForTabs.summaries.map(summary => (
                      <TableRow key={summary.id}>
                        <TableCell className="font-medium py-2 sticky left-0 bg-black/40 backdrop-blur-sm z-10">
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-1" 
                              style={{ backgroundColor: summary.color }}
                            ></div>
                            <span className="text-sm truncate max-w-[80px]">{summary.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-xs whitespace-nowrap">
                          {summary.investments.btc < 0.01 && summary.investments.btc > 0
                            ? `丰${(summary.investments.btc * 100000000).toFixed(0)}`
                            : formatCryptoAmount(summary.investments.btc)}
                        </TableCell>
                        <TableCell className={`py-2 text-xs whitespace-nowrap ${summary.profits.btc >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {summary.profits.btc < 0.01 && summary.profits.btc > -0.01 && summary.profits.btc !== 0
                            ? (summary.profits.btc >= 0 ? "+" : "-") + `丰${(Math.abs(summary.profits.btc) * 100000000).toFixed(0)}`
                            : (summary.profits.btc >= 0 ? "+" : "") + formatCryptoAmount(summary.profits.btc)}
                        </TableCell>
                        <TableCell className={`py-2 text-xs whitespace-nowrap ${summary.roi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {summary.roi >= 0 ? "+" : ""}{summary.roi.toFixed(2)}%
                        </TableCell>
                        <TableCell className="py-2 text-xs whitespace-nowrap">
                          <TooltipProvider>
                            <UITooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  {summary.balance.btc < 0.01 && summary.balance.btc > 0
                                    ? `丰${(summary.balance.btc * 100000000).toFixed(0)}`
                                    : formatCryptoAmount(summary.balance.btc)}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-black/90 border-purple-700/50 text-xs p-2">
                                <p>{formatCurrencyAmount(summary.balance.usd, "USD")}</p>
                                <p>{formatCurrencyAmount(summary.balance.usd * brlToUsd, "BRL")}</p>
                              </TooltipContent>
                            </UITooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="py-2 text-xs whitespace-nowrap">
                          {summary.investmentCount}/{summary.profitCount}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </div>
          
          <div className="mt-4 text-xs text-muted-foreground">
            <div className="flex items-center">
              <Info className="h-3 w-3 mr-1.5 flex-shrink-0" />
              <span>
                Valores em BTC. Valores pequenos em satoshis (丰). Use o modo USD/BRL nas configurações para outras moedas.
              </span>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Componente StatCard auxiliar
interface StatCardProps {
  title: string;
  value: number;
  unit?: "btc" | "usd" | "brl" | "%";
  isProfit?: boolean;
  btcToUsd?: number; // Necessário se unit for btc e precisarmos de conversão implícita para tooltip
  brlToUsd?: number; // Necessário se unit for btc e precisarmos de conversão implícita para tooltip
}

function StatCard({ title, value, unit, isProfit, btcToUsd, brlToUsd }: StatCardProps) {
  const formatStatValue = (val: number, u?: string) => {
    if (typeof val !== 'number' || isNaN(val)) {
      return u === "%" ? "0.00%" : (u === "btc" ? "₿0.00000000" : (u === "usd" ? "$0.00" : (u === "brl" ? "R$0.00" : "0")));
    }

    switch (u) {
      case "btc":
        return val >= 0.01 || val <= -0.01
        ? `₿${val.toLocaleString('pt-BR', { minimumFractionDigits: 8, maximumFractionDigits: 8 })}`
        : `丰${(val * 100000000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
      case "usd":
        return `$${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case "brl":
        return `R$${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case "%":
        return `${val.toFixed(2)}%`;
      default:
        return val.toLocaleString('pt-BR');
    }
  };
  
  const getValueColor = () => {
    if (isProfit === undefined) return "text-primary";
    if (value > 0) return "text-green-500";
    if (value < 0) return "text-red-500";
    return "text-muted-foreground";
  }

  // Tooltip com valor em outras moedas se for BTC
  const renderTooltipContent = () => {
    if (unit === "btc" && btcToUsd && brlToUsd && typeof value === 'number' && !isNaN(value)) {
      const valueUsd = value * btcToUsd;
      const valueBrl = valueUsd * brlToUsd;
      return (
        <TooltipContent>
          <p>{formatStatValue(valueUsd, "usd")}</p>
          <p>{formatStatValue(valueBrl, "brl")}</p>
        </TooltipContent>
      );
    }
    return null;
  };

  return (
    <TooltipProvider>
      <UITooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div className="p-4 bg-background/30 rounded-lg shadow hover:shadow-md transition-shadow">
            <h3 className="text-xs text-muted-foreground truncate" title={title}>{title}</h3>
            <p className={`text-lg font-bold ${getValueColor()}`}>
              {formatStatValue(value, unit)}
            </p>
          </div>
        </TooltipTrigger>
        {renderTooltipContent()}
      </UITooltip>
    </TooltipProvider>
  );
}

export default ReportsComparison;