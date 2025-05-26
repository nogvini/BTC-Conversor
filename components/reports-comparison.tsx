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
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    console.warn(`Invalid date string format encountered in reports-comparison: ${dateString}`);
    return new Date(NaN); 
  }
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
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

    const selectedReports = reports.filter(r => selectedReportIds.includes(r.id));
    
    let minDateOverall = new Date(); // Renomeado para evitar conflito com minDate/maxDate no retorno
    let maxDateOverall = new Date(0); // Renomeado
    
    selectedReports.forEach(report => {
      const allDates = [
        ...(report.investments?.map(i => parseReportDateStringToUTCDate(i.date)) || []),
        ...(report.profits?.map(p => parseReportDateStringToUTCDate(p.date)) || [])
      ].filter(date => !isNaN(date.getTime()));
      
      if (allDates.length === 0) return;

      const reportMinDate = new Date(Math.min(...allDates.map(d => d.getTime())));
      const reportMaxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
      
      if (reportMinDate < minDateOverall) minDateOverall = reportMinDate;
      if (reportMaxDate > maxDateOverall) maxDateOverall = reportMaxDate;
    });
    
    if (minDateOverall > maxDateOverall) { // Corrigido para usar Overall
      const today = new Date();
      minDateOverall = new Date(today.getFullYear(), today.getMonth() -1, 1);
      maxDateOverall = new Date(today.getFullYear(), today.getMonth(), 1);
    }
    
    const months: Date[] = [];
    const currentDate = new Date(minDateOverall); // Corrigido para usar Overall
    currentDate.setDate(1); 
    
    while (currentDate <= maxDateOverall) { // Corrigido para usar Overall
      months.push(new Date(currentDate));
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
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
            return sum + convertToBtc(inv.amount, inv.unit);
          }, 0);
          
          const totalProfitsBtc = profitsUntilMonth.reduce((sum, prof) => {
            const btcAmount = convertToBtc(prof.amount, prof.unit);
            return sum + (prof.isProfit ? btcAmount : -btcAmount);
          }, 0);
          
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
                <span className="text-xs text-gray-300">{entry.name}:</span>
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
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button 
          variant="ghost" 
          size="sm" 
          className="px-2" 
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
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Seleção de Relatórios */}
        <Card className="lg:col-span-1 bg-black/40 border-purple-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Selecionar Relatórios</CardTitle>
            <CardDescription>
              Escolha até 3 relatórios para comparar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4 -mr-4">
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
              <div className="flex items-center justify-center h-[300px] text-center">
                <div className="space-y-2">
                  <CircleSlash2 className="h-10 w-10 text-gray-500 mx-auto" />
                  <p className="text-gray-400">Selecione pelo menos um relatório para visualizar o gráfico</p>
                </div>
              </div>
            ) : !comparisonData ? (
              <div className="flex items-center justify-center h-[300px]">
                <RefreshCw className="h-8 w-8 text-purple-500 animate-spin" />
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={comparisonData.chartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#888" 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      stroke="#888"
                      tickFormatter={(value) => {
                        const converted = convertFromBtc(value);
                        if (displayUnit === "btc") {
                          return value.toFixed(value < 0.1 ? 4 : 2);
                        } else {
                          return converted.toFixed(0);
                        }
                      }}
                    />
                    <Tooltip 
                      content={<CustomTooltip />}
                      cursor={{ fill: 'rgba(124, 58, 237, 0.15)' }}
                    />
                    <Legend />
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
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-purple-700/30">
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-300">Relatório</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-300">Investimento Total</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-300">Lucro/Perda</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-300">Saldo Final</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-300">
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
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-300">Data 1º Aporte</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-300">Tempo Invest.</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-300">ROI Anualizado</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-300">Lucro Diário Médio</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-300">ROI Diário Médio</th>
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
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: report.color || "#8844ee" }}
                            />
                            <span className="font-medium">{report.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-medium">
                          {formatValue(totalInvestments)}
                        </td>
                        <td className="py-3 px-3 text-right">
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
                        <td className="py-3 px-3 text-right font-medium">
                          {formatValue(finalBalance)}
                        </td>
                        <td className="py-3 px-3 text-right">
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
                        <td className="py-3 px-3 text-right text-xs">{primeiroAporte}</td>
                        <td className="py-3 px-3 text-right text-xs">{tempoInvest}</td>
                        <td className={cn("py-3 px-3 text-right text-xs", stats.roiAnualizadoPercent > 0 ? "text-green-400" : stats.roiAnualizadoPercent < 0 ? "text-red-400" : "text-gray-400")}>{roiAnualizado}</td>
                        <td className={cn("py-3 px-3 text-right text-xs", stats.mediaDiariaLucroBtc > 0 ? "text-green-400" : stats.mediaDiariaLucroBtc < 0 ? "text-red-400" : "text-gray-400")}>{mediaLucro}</td>
                        <td className={cn("py-3 px-3 text-right text-xs", stats.mediaDiariaRoiPercent > 0 ? "text-green-400" : stats.mediaDiariaRoiPercent < 0 ? "text-red-400" : "text-gray-400")}>{mediaRoi}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 h-auto gap-2 bg-transparent">
          <TabsTrigger
            value="summary"
            className={`data-[state=active]:bg-purple-800 data-[state=active]:text-white bg-black/30 border border-purple-700/50 py-2`}
          >
            Resumo
          </TabsTrigger>
          <TabsTrigger
            value="charts"
            className={`data-[state=active]:bg-purple-800 data-[state=active]:text-white bg-black/30 border border-purple-700/50 py-2`}
          >
            Gráficos
          </TabsTrigger>
          <TabsTrigger
            value="details"
            className={`data-[state=active]:bg-purple-800 data-[state=active]:text-white bg-black/30 border border-purple-700/50 py-2`}
          >
            Detalhes
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="summary" className="pt-2">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 rounded-lg bg-purple-900/20 border border-purple-800/30">
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
            <div className="p-4 rounded-lg bg-purple-900/20 border border-purple-800/30">
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
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 rounded-lg bg-purple-900/20 border border-purple-800/30">
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
            <div className="p-4 rounded-lg bg-purple-900/20 border border-purple-800/30">
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
          
          {/* TABELA DE RESUMO DETALHADO AGREGADO - NOVA SEÇÃO */}
          {comparisonData && selectedReportIds.length > 0 && (
            <div className="mt-6">
              <h3 className="text-md font-semibold mb-3 text-gray-200">Resumo Agregado Detalhado</h3>
              <Card className="bg-black/20 border-purple-700/30">
                <CardContent className="p-0">
                  <Table>
                    <TableBody>
                      <TableRow className="border-purple-700/20">
                        <TableCell className="font-medium text-gray-400 text-xs py-2.5">Primeiro Aporte Agregado</TableCell>
                        <TableCell className="text-right text-xs py-2.5">
                          {comparisonData.aggregatedPrimeiroAporteDate 
                            ? format(new Date(comparisonData.aggregatedPrimeiroAporteDate), 'dd MMM yyyy', { locale: ptBR }) 
                            : 'N/A'}
                        </TableCell>
                      </TableRow>
                      <TableRow className="border-purple-700/20">
                        <TableCell className="font-medium text-gray-400 text-xs py-2.5">Tempo Total de Investimento (Agregado)</TableCell>
                        <TableCell className="text-right text-xs py-2.5">{comparisonData.aggregatedTempoTotalInvestimento || 'N/A'}</TableCell>
                      </TableRow>
                      <TableRow className="border-purple-700/20">
                        <TableCell className="font-medium text-gray-400 text-xs py-2.5">ROI Anualizado Estimado (Agregado)</TableCell>
                        <TableCell className={cn("text-right text-xs py-2.5", comparisonData.aggregatedRoiAnualizadoPercent > 0 ? "text-green-400" : comparisonData.aggregatedRoiAnualizadoPercent < 0 ? "text-red-400" : "text-gray-400")}>
                          {(comparisonData.aggregatedDiasDeInvestimento > 0 && comparisonData.totalInvestmentsBtc > 0 && comparisonData.aggregatedRoiAnualizadoPercent !== -100)
                            ? `${comparisonData.aggregatedRoiAnualizadoPercent.toFixed(2)}%`
                            : (comparisonData.aggregatedRoiAnualizadoPercent === -100 ? '-100.00%' : 'N/A')}
                        </TableCell>
                      </TableRow>
                      <TableRow className="border-purple-700/20">
                        <TableCell className="font-medium text-gray-400 text-xs py-2.5">Média Diária de Lucro (BTC Agregado)</TableCell>
                        <TableCell className={cn("text-right text-xs py-2.5", comparisonData.aggregatedMediaDiariaLucroBtc > 0 ? "text-green-400" : comparisonData.aggregatedMediaDiariaLucroBtc < 0 ? "text-red-400" : "text-gray-400")}>
                          {comparisonData.aggregatedDiasDeInvestimento > 0
                            ? formatValue(convertFromBtc(comparisonData.aggregatedMediaDiariaLucroBtc)) // Reusa formatValue para consistência de unidade
                            : 'N/A'}
                        </TableCell>
                      </TableRow>
                      <TableRow className="border-b-0"> {/* Remover borda da última linha */}
                        <TableCell className="font-medium text-gray-400 text-xs py-2.5">Média Diária de ROI (Agregado)</TableCell>
                        <TableCell className={cn("text-right text-xs py-2.5", comparisonData.aggregatedMediaDiariaRoiPercent > 0 ? "text-green-400" : comparisonData.aggregatedMediaDiariaRoiPercent < 0 ? "text-red-400" : "text-gray-400")}>
                          {(comparisonData.aggregatedDiasDeInvestimento > 0 && comparisonData.totalInvestmentsBtc > 0)
                            ? `${comparisonData.aggregatedMediaDiariaRoiPercent.toFixed(4)}%`
                            : 'N/A'}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
          
          <ScrollArea className="h-[180px] mt-4 rounded-lg border border-purple-800/30">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Relatório</TableHead>
                  <TableHead>Investimentos</TableHead>
                  <TableHead>Lucros</TableHead>
                  <TableHead>ROI</TableHead>
                  <TableHead>Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonDataForTabs.summaries.map(summary => (
                  <TableRow key={summary.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: summary.color }}
                        ></div>
                        {summary.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatCryptoAmount(summary.investments.btc)} BTC
                    </TableCell>
                    <TableCell className={summary.profits.btc >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {formatCryptoAmount(summary.profits.btc)} BTC
                    </TableCell>
                    <TableCell className={summary.roi >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {summary.roi.toFixed(2)}%
                    </TableCell>
                    <TableCell>
                      {formatCryptoAmount(summary.balance.btc)} BTC
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="charts" className="pt-2">
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-purple-900/20 border border-purple-800/30">
              <h4 className="text-sm font-medium mb-3">Comparação de Investimentos e Lucros</h4>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonDataForTabs.barChartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => value.length > 10 ? `${value.substring(0, 10)}...` : value}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
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
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                      }}
                      itemStyle={{ color: '#e2e8f0' }}
                      labelStyle={{ color: '#f8fafc' }}
                      cursor={{ fill: 'rgba(124, 58, 237, 0.15)' }}
                    />
                    <Legend />
                    <Bar dataKey="investimentos" name="Investimentos" fill="#8884d8" />
                    <Bar dataKey="lucros" name="Lucros" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-purple-900/20 border border-purple-800/30">
              <h4 className="text-sm font-medium mb-3">Distribuição de Saldo</h4>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={comparisonDataForTabs.pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      nameKey="name"
                      label={(entry) => entry.name}
                      labelLine={true}
                    >
                      {comparisonDataForTabs.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(8)} BTC`, 'Saldo']}
                      contentStyle={{ 
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        borderColor: 'rgba(124, 58, 237, 0.5)',
                        borderRadius: '0.375rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                      }}
                      itemStyle={{ color: '#e2e8f0' }}
                      labelStyle={{ color: '#f8fafc' }}
                      cursor={{ fill: 'rgba(124, 58, 237, 0.15)' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="details" className="pt-2">
          <ScrollArea className="h-[400px] rounded-lg border border-purple-800/30">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Relatório</TableHead>
                  <TableHead>Investimentos (BTC)</TableHead>
                  <TableHead>Lucros (BTC)</TableHead>
                  <TableHead>ROI</TableHead>
                  <TableHead>Saldo (BTC)</TableHead>
                  <TableHead>Saldo (USD)</TableHead>
                  <TableHead># Aportes</TableHead>
                  <TableHead># Lucros</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonDataForTabs.summaries.map(summary => (
                  <TableRow key={summary.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: summary.color }}
                        ></div>
                        {summary.name}
                      </div>
                    </TableCell>
                    <TableCell>{formatCryptoAmount(summary.investments.btc)}</TableCell>
                    <TableCell className={summary.profits.btc >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {formatCryptoAmount(summary.profits.btc)}
                    </TableCell>
                    <TableCell className={summary.roi >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {summary.roi.toFixed(2)}%
                    </TableCell>
                    <TableCell>{formatCryptoAmount(summary.balance.btc)}</TableCell>
                    <TableCell>{formatCurrencyAmount(summary.balance.usd, "USD")}</TableCell>
                    <TableCell>{summary.investmentCount}</TableCell>
                    <TableCell>{summary.profitCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
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