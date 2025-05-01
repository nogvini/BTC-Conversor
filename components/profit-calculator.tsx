"use client";

import { useState, useEffect, useMemo } from "react";
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
  ChevronDown
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { format, subMonths, addMonths, startOfMonth, endOfMonth, isWithinInterval, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import AnimatedCounter from "./animated-counter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getCurrentBitcoinPrice } from "@/lib/client-api";
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useIsMobile } from "@/hooks/use-mobile";
import { ResponsiveContainer } from "@/components/ui/responsive-container";

// Tipos de dados
type CurrencyUnit = "BTC" | "SATS";
type DisplayCurrency = "USD" | "BRL";

interface Investment {
  id: string;
  date: string;
  amount: number;
  unit: CurrencyUnit;
}

interface ProfitRecord {
  id: string;
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
}

export default function ProfitCalculator({ btcToUsd, brlToUsd, appData }: ProfitCalculatorProps) {
  // Estados
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [profits, setProfits] = useState<ProfitRecord[]>([]);
  const [activeTab, setActiveTab] = useState<string>("register");
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("USD");
  const [currentRates, setCurrentRates] = useState({ btcToUsd, brlToUsd });
  const [loading, setLoading] = useState(false);
  const [usingFallbackRates, setUsingFallbackRates] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Estados do formulário
  const [investmentAmount, setInvestmentAmount] = useState<string>("");
  const [investmentUnit, setInvestmentUnit] = useState<CurrencyUnit>("SATS");
  const [investmentDate, setInvestmentDate] = useState<Date>(new Date());
  const [profitAmount, setProfitAmount] = useState<string>("");
  const [profitUnit, setProfitUnit] = useState<CurrencyUnit>("SATS");
  const [profitDate, setProfitDate] = useState<Date>(new Date());
  const [isProfit, setIsProfit] = useState<boolean>(true);

  // Estados adicionais para filtros
  const [filterMonth, setFilterMonth] = useState<Date>(new Date());
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [useExportDialog, setUseExportDialog] = useState(false);

  const isMobile = useIsMobile();
  const isSmallScreen = typeof window !== 'undefined' ? window.innerWidth < 350 : false;

  // Verificar tamanho da tela para decidir entre popover e dialog
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkScreenSize = () => {
        setUseExportDialog(window.innerWidth < 350);
      };
      
      // Verificar tamanho inicial
      checkScreenSize();
      
      // Adicionar listener para mudanças de tamanho
      window.addEventListener('resize', checkScreenSize);
      
      // Remover listener ao desmontar
      return () => window.removeEventListener('resize', checkScreenSize);
    }
  }, []);

  // Efeitos para carregar e salvar dados
  useEffect(() => {
    if (appData) {
      const newRates = {
        btcToUsd: appData.currentPrice.usd,
        brlToUsd: appData.currentPrice.brl / appData.currentPrice.usd
      };
      setCurrentRates(newRates);
      setUsingFallbackRates(appData.isUsingCache || !!appData.currentPrice.isUsingCache);
    } else {
      setCurrentRates({ btcToUsd, brlToUsd });
      setUsingFallbackRates(btcToUsd === 65000 && brlToUsd === 5.2);
    }
  }, [btcToUsd, brlToUsd, appData]);

  useEffect(() => {
    // Carregar dados do localStorage
    const savedInvestments = localStorage.getItem("bitcoinInvestments");
    const savedProfits = localStorage.getItem("bitcoinProfits");
    const savedDisplayCurrency = localStorage.getItem("bitcoinDisplayCurrency");

    if (savedInvestments) {
      try {
        setInvestments(JSON.parse(savedInvestments));
      } catch (e) {
        console.error("Erro ao analisar investimentos salvos:", e);
      }
    }

    if (savedProfits) {
      try {
        setProfits(JSON.parse(savedProfits));
      } catch (e) {
        console.error("Erro ao analisar lucros salvos:", e);
      }
    }

    if (savedDisplayCurrency) {
      try {
        setDisplayCurrency(JSON.parse(savedDisplayCurrency) as DisplayCurrency);
      } catch (e) {
        console.error("Erro ao analisar moeda de exibição salva:", e);
      }
    }

    setIsDataLoaded(true);
    updateRates();
  }, []);

  // Salvar dados no localStorage quando mudam
  useEffect(() => {
    if (isDataLoaded) {
      localStorage.setItem("bitcoinInvestments", JSON.stringify(investments));
    }
  }, [investments, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
      localStorage.setItem("bitcoinProfits", JSON.stringify(profits));
    }
  }, [profits, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
      localStorage.setItem("bitcoinDisplayCurrency", JSON.stringify(displayCurrency));
    }
  }, [displayCurrency, isDataLoaded]);

  // Funções auxiliares
  const updateRates = async () => {
    if (appData) {
      return; // Adicionar return para evitar processamento desnecessário
    } else {
      setLoading(true);
      try {
        const priceData = await getCurrentBitcoinPrice();
        if (priceData) {
          setCurrentRates({
            btcToUsd: priceData.usd,
            brlToUsd: priceData.brl / priceData.usd,
          });
          setUsingFallbackRates(priceData.isUsingCache);
          toast({
            title: "Taxas atualizadas",
            description: `Bitcoin: ${priceData.usd.toLocaleString()} USD`,
            variant: "success",
          });
        }
      } catch (error) {
        console.error("Erro ao atualizar taxas:", error);
        toast({
          title: "Erro ao atualizar taxas",
          description: "Usando as últimas taxas disponíveis.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const convertToBtc = (amount: number, unit: CurrencyUnit): number => {
    return unit === "SATS" ? amount / 100000000 : amount;
  };

  const formatCryptoAmount = (amount: number, unit: CurrencyUnit): string => {
    if (unit === "BTC") {
      return `${amount.toFixed(8)} BTC`;
    } else {
      return `${amount.toLocaleString()} SATS`;
    }
  };

  const formatCurrency = (amount: number, currency: string = "USD"): string => {
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
  const isFutureDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Resetar horas para comparar apenas as datas
    return date > today;
  };

  // Funções de adição e remoção
  const addInvestment = () => {
    if (!investmentAmount || isNaN(Number(investmentAmount)) || Number(investmentAmount) <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira um valor válido maior que zero.",
        variant: "destructive",
      });
      return;
    }

    if (isFutureDate(investmentDate)) {
      toast({
        title: "Data inválida",
        description: "Não é possível registrar aportes com data futura.",
        variant: "destructive",
      });
      return;
    }

    const newInvestment: Investment = {
      id: Date.now().toString(),
      date: format(investmentDate, "yyyy-MM-dd"),
      amount: Number(investmentAmount),
      unit: investmentUnit,
    };

    setInvestments([...investments, newInvestment]);
    setInvestmentAmount("");

    toast({
      title: "Aporte registrado com sucesso!",
      description: `Aporte de ${formatCryptoAmount(newInvestment.amount, newInvestment.unit)} registrado com sucesso.`,
      variant: "success",
    });
  };

  const addProfitRecord = () => {
    if (!profitAmount || isNaN(Number(profitAmount)) || Number(profitAmount) <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira um valor válido maior que zero.",
        variant: "destructive",
      });
      return;
    }

    if (isFutureDate(profitDate)) {
      toast({
        title: "Data inválida",
        description: `Não é possível registrar ${isProfit ? "lucros" : "perdas"} com data futura.`,
        variant: "destructive",
      });
      return;
    }

    const newProfit: ProfitRecord = {
      id: Date.now().toString(),
      date: format(profitDate, "yyyy-MM-dd"),
      amount: Number(profitAmount),
      unit: profitUnit,
      isProfit,
    };

    setProfits([...profits, newProfit]);
    setProfitAmount("");

    toast({
      title: isProfit ? "Lucro registrado com sucesso!" : "Perda registrada com sucesso!",
      description: `${isProfit ? "Lucro" : "Perda"} de ${formatCryptoAmount(newProfit.amount, newProfit.unit)} registrado com sucesso.`,
      variant: "success",
    });
  };

  const deleteInvestment = (id: string) => {
    setInvestments(investments.filter((investment) => investment.id !== id));
    toast({
      title: "Aporte removido",
      description: "O aporte foi removido com sucesso.",
    });
  };

  const deleteProfit = (id: string) => {
    setProfits(profits.filter((profit) => profit.id !== id));
    toast({
      title: "Registro removido",
      description: "O registro de lucro/perda foi removido com sucesso.",
    });
  };

  // Funções de navegação
  const goToPreviousMonth = () => {
    setSelectedMonth(subMonths(selectedMonth, 1));
  };

  const goToNextMonth = () => {
    const nextMonth = addMonths(selectedMonth, 1);
    if (nextMonth <= new Date()) {
      setSelectedMonth(nextMonth);
    }
  };

  const isCurrentMonth = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const toggleDisplayCurrency = () => {
    setDisplayCurrency(displayCurrency === "USD" ? "BRL" : "USD");
  };

  // Função para exportação com opções
  const exportData = async (exportAll: boolean = false) => {
    try {
      setIsExporting(true);
      setShowExportOptions(false);
      
      // Determinar quais dados exportar
      const dataToExport = {
        investments: exportAll ? investments : getFilteredInvestments(),
        profits: exportAll ? profits : getFilteredProfits()
      };
      
      // Verificar se há dados para exportar
      if (dataToExport.investments.length === 0 && dataToExport.profits.length === 0) {
        toast({
          title: "Sem dados para exportar",
          description: "Não há registros para exportar no período selecionado.",
          variant: "destructive"
        });
        setIsExporting(false);
        return;
      }
      
      // Criar workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "BTC Monitor";
      workbook.created = new Date();
      
      // Obter cotação atual do BTC em USD e BRL
      const currentBtcUsdRate = currentRates.btcToUsd;
      const currentBrlUsdRate = currentRates.brlToUsd;
      const currentBtcBrlRate = currentBtcUsdRate * currentBrlUsdRate;
      
      // Calcular totais para estatísticas
      const totalInvestmentsBtc = dataToExport.investments.reduce((total, inv) => 
        total + convertToBtc(inv.amount, inv.unit), 0);
      
      const totalProfitsBtc = dataToExport.profits.reduce((total, profit) => {
        const amount = convertToBtc(profit.amount, profit.unit);
        return profit.isProfit ? total + amount : total - amount;
      }, 0);
      
      const totalValueUsd = totalInvestmentsBtc * currentBtcUsdRate;
      const totalValueBrl = totalValueUsd * currentBrlUsdRate;
      
      const profitValueUsd = totalProfitsBtc * currentBtcUsdRate;
      const profitValueBrl = profitValueUsd * currentBrlUsdRate;
      
      const roi = totalInvestmentsBtc > 0 ? 
        (totalProfitsBtc / totalInvestmentsBtc) * 100 : 0;
      
      // Agrupar investimentos e lucros por mês para análise
      const monthlyData = {};
      
      // Se for exportação completa, precisamos agrupar os dados por mês
      if (exportAll) {
        // Processar investimentos por mês
        investments.forEach(investment => {
          const investDate = new Date(investment.date);
          const monthKey = format(investDate, "yyyy-MM");
          const monthLabel = format(investDate, "MMMM yyyy", { locale: ptBR });
          
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
              label: monthLabel,
              investments: [],
              investmentTotalBtc: 0,
              profits: [],
              profitTotalBtc: 0
            };
          }
          
          const btcValue = convertToBtc(investment.amount, investment.unit);
          monthlyData[monthKey].investments.push(investment);
          monthlyData[monthKey].investmentTotalBtc += btcValue;
        });
        
        // Processar lucros por mês
        profits.forEach(profit => {
          const profitDate = new Date(profit.date);
          const monthKey = format(profitDate, "yyyy-MM");
          const monthLabel = format(profitDate, "MMMM yyyy", { locale: ptBR });
          
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
              label: monthLabel,
              investments: [],
              investmentTotalBtc: 0,
              profits: [],
              profitTotalBtc: 0
            };
          }
          
          const btcValue = convertToBtc(profit.amount, profit.unit);
          monthlyData[monthKey].profits.push(profit);
          monthlyData[monthKey].profitTotalBtc += profit.isProfit ? btcValue : -btcValue;
        });
      }
      
      // Adicionar planilha de informações de mercado
      const marketInfoSheet = workbook.addWorksheet('Informações de Mercado', {
        properties: { tabColor: { argb: 'FF9900' } }
      });
      
      marketInfoSheet.columns = [
        { header: 'Métrica', key: 'metric', width: 30 },
        { header: 'Valor', key: 'value', width: 20 }
      ];
      
      marketInfoSheet.getRow(1).font = { bold: true };
      marketInfoSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4F4F6F' }
      };
      
      // Adicionar dados ao resumo de mercado
      marketInfoSheet.addRow({ metric: 'Data da Exportação', value: format(new Date(), "dd/MM/yyyy HH:mm") });
      marketInfoSheet.addRow({ metric: 'Período', 
        value: exportAll ? 'Histórico Completo' : 
          `${format(startOfMonth(filterMonth), "MMMM yyyy", { locale: ptBR })}` });
      marketInfoSheet.addRow({ metric: 'Cotação atual do Bitcoin (USD)', value: `$${currentBtcUsdRate.toFixed(2)}` });
      marketInfoSheet.addRow({ metric: 'Cotação atual do Bitcoin (BRL)', value: `R$${currentBtcBrlRate.toFixed(2)}` });
      marketInfoSheet.addRow({ metric: 'Taxa de câmbio USD/BRL', value: `${currentBrlUsdRate.toFixed(2)}` });
      
      // Se estivermos exportando um mês específico, adicionar informações detalhadas do mês
      if (!exportAll) {
        const monthLabel = format(filterMonth, "MMMM 'de' yyyy", { locale: ptBR });
        marketInfoSheet.addRow({ metric: 'Número de Aportes no Mês', value: dataToExport.investments.length });
        marketInfoSheet.addRow({ metric: 'Número de Registros de Lucro/Perda', value: dataToExport.profits.length });
        
        // Saldo do mês
        const monthBalance = totalInvestmentsBtc + totalProfitsBtc;
        marketInfoSheet.addRow({ metric: 'Saldo do Mês (BTC)', value: monthBalance.toFixed(8) });
        marketInfoSheet.addRow({ metric: 'Saldo do Mês (USD)', value: `$${(monthBalance * currentBtcUsdRate).toFixed(2)}` });
        marketInfoSheet.addRow({ metric: 'Saldo do Mês (BRL)', value: `R$${(monthBalance * currentBtcBrlRate).toFixed(2)}` });
        
        // Porcentagem de lucro em relação ao aporte
        if (totalInvestmentsBtc > 0) {
          const profitPercentage = (totalProfitsBtc / totalInvestmentsBtc) * 100;
          marketInfoSheet.addRow({ 
            metric: 'Lucro em Relação ao Aporte do Mês', 
            value: `${profitPercentage.toFixed(2)}%` 
          });
        }
      }
      
      // Adicionar planilha de resumo
      const summarySheet = workbook.addWorksheet('Resumo', {
        properties: { tabColor: { argb: 'FFD700' } }
      });
      
      summarySheet.columns = [
        { header: 'Métrica', key: 'metric', width: 35 },
        { header: 'Valor', key: 'value', width: 20 },
        { header: 'Valor (BTC)', key: 'btcValue', width: 20 },
        { header: 'Valor (USD)', key: 'usdValue', width: 20 },
        { header: 'Valor (BRL)', key: 'brlValue', width: 20 }
      ];
      
      summarySheet.getRow(1).font = { bold: true };
      summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
        fgColor: { argb: '4F4F6F' }
      };
      
      // Adicionar dados ao resumo
      summarySheet.addRow({ 
        metric: 'Período', 
        value: exportAll ? 'Histórico Completo' : `${format(startOfMonth(filterMonth), "MMMM yyyy", { locale: ptBR })}`,
        btcValue: '-',
        usdValue: '-',
        brlValue: '-'
      });
      
      summarySheet.addRow({
        metric: 'Data de Exportação',
        value: format(new Date(), "dd/MM/yyyy HH:mm"),
        btcValue: '-',
        usdValue: '-',
        brlValue: '-'
      });
      
      summarySheet.addRow({
        metric: 'Cotação BTC',
        value: '-',
        btcValue: '1 BTC',
        usdValue: `$${currentBtcUsdRate.toFixed(2)}`,
        brlValue: `R$${currentBtcBrlRate.toFixed(2)}`
      });
      
      // Linha em branco
      summarySheet.addRow({});
      
      // Adicionar resumo financeiro
      const totalInvestmentsRow = summarySheet.addRow({
        metric: 'Total de Aportes',
        value: '-',
        btcValue: totalInvestmentsBtc.toFixed(8),
        usdValue: `$${totalValueUsd.toFixed(2)}`,
        brlValue: `R$${totalValueBrl.toFixed(2)}`
      });
      totalInvestmentsRow.font = { bold: true };
      
      const totalProfitsRow = summarySheet.addRow({
        metric: 'Total de Lucros/Perdas',
        value: '-',
        btcValue: totalProfitsBtc.toFixed(8),
        usdValue: `$${profitValueUsd.toFixed(2)}`,
        brlValue: `R$${profitValueBrl.toFixed(2)}`
      });
      totalProfitsRow.font = { bold: true, color: { argb: totalProfitsBtc >= 0 ? '00B050' : 'FF0000' } };
      
      const balanceRow = summarySheet.addRow({
        metric: 'Saldo Atual (Aportes + Lucros)',
        value: '-',
        btcValue: (totalInvestmentsBtc + totalProfitsBtc).toFixed(8),
        usdValue: `$${(totalValueUsd + profitValueUsd).toFixed(2)}`,
        brlValue: `R$${(totalValueBrl + profitValueBrl).toFixed(2)}`
      });
      balanceRow.font = { bold: true };
      
      // Linha em branco
      summarySheet.addRow({});
      
      // Métricas de rendimento
      const roiRow = summarySheet.addRow({
        metric: 'ROI (Retorno sobre Investimento)',
        value: `${roi.toFixed(2)}%`,
        btcValue: '-',
        usdValue: '-',
        brlValue: '-'
      });
      
      // Porcentagem do lucro em relação ao aporte total
      const profitPercentageRow = summarySheet.addRow({
        metric: 'Lucro em % do Aporte Total',
        value: `${roi.toFixed(2)}%`,
        btcValue: totalInvestmentsBtc > 0 ? `${((totalProfitsBtc / totalInvestmentsBtc) * 100).toFixed(2)}%` : '0.00%',
        usdValue: '-',
        brlValue: '-'
      });
      profitPercentageRow.font = { color: { argb: totalProfitsBtc >= 0 ? '00B050' : 'FF0000' } };
      
      // Adicionar planilha de lucros mensais
      if (exportAll) {
        const monthlyProfitsSheet = workbook.addWorksheet('Lucros Mensais', {
          properties: { tabColor: { argb: '00B050' } }
        });
        
        monthlyProfitsSheet.columns = [
          { header: 'Mês', key: 'month', width: 20 },
          { header: 'Lucro (BTC)', key: 'btcProfit', width: 20 },
          { header: 'Lucro (USD)', key: 'usdProfit', width: 20 },
          { header: 'Lucro (BRL)', key: 'brlProfit', width: 20 },
          { header: '% do Aporte Mensal', key: 'monthlyPercent', width: 22 },
          { header: '% do Aporte Total', key: 'totalPercent', width: 22 }
        ];
        
        monthlyProfitsSheet.getRow(1).font = { bold: true };
        monthlyProfitsSheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4F4F6F' }
        };
        
        // Filtrar apenas meses com lucros não nulos
        const monthsWithProfits = Object.entries(monthlyData)
          .filter(([_, data]: [string, any]) => data.profitTotalBtc !== 0)
          .map(([key, data]: [string, any]) => ({ key, data }))
          .sort((a, b) => new Date(a.key).getTime() - new Date(b.key).getTime());
        
        // Adicionar dados de lucros mensais
        let totalMonthlyProfitBtc = 0;
        
        monthsWithProfits.forEach(({ key, data }) => {
          const profitBtc = data.profitTotalBtc;
          totalMonthlyProfitBtc += profitBtc;
          
          const profitUsd = profitBtc * currentBtcUsdRate;
          const profitBrl = profitUsd * currentBrlUsdRate;
          
          // Porcentagens
          const percentOfMonthly = data.investmentTotalBtc > 0 ? 
            (profitBtc / data.investmentTotalBtc) * 100 : 0;
          const percentOfTotal = totalInvestmentsBtc > 0 ? 
            (profitBtc / totalInvestmentsBtc) * 100 : 0;
          
          const row = monthlyProfitsSheet.addRow({
            month: data.label,
            btcProfit: profitBtc.toFixed(8),
            usdProfit: profitUsd.toFixed(2),
            brlProfit: profitBrl.toFixed(2),
            monthlyPercent: `${percentOfMonthly.toFixed(2)}%`,
            totalPercent: `${percentOfTotal.toFixed(2)}%`
          });
          
          // Colorir conforme lucro/perda
          const colorCode = profitBtc > 0 ? '00B050' : profitBtc < 0 ? 'FF0000' : '000000';
          row.getCell('btcProfit').font = { color: { argb: colorCode } };
          row.getCell('usdProfit').font = { color: { argb: colorCode } };
          row.getCell('brlProfit').font = { color: { argb: colorCode } };
          row.getCell('monthlyPercent').font = { color: { argb: colorCode } };
          row.getCell('totalPercent').font = { color: { argb: colorCode } };
        });
        
        // Linha de total
        const totalProfitsUsd = totalMonthlyProfitBtc * currentBtcUsdRate;
        const totalProfitsBrl = totalProfitsUsd * currentBrlUsdRate;
        const percentOfTotalInvestment = totalInvestmentsBtc > 0 ? 
          (totalMonthlyProfitBtc / totalInvestmentsBtc) * 100 : 0;
        
        const totalRow = monthlyProfitsSheet.addRow({
          month: 'TOTAL',
          btcProfit: totalMonthlyProfitBtc.toFixed(8),
          usdProfit: totalProfitsUsd.toFixed(2),
          brlProfit: totalProfitsBrl.toFixed(2),
          monthlyPercent: '-',
          totalPercent: `${percentOfTotalInvestment.toFixed(2)}%`
        });
        
        // Estilizar linha total
        totalRow.font = { bold: true };
        totalRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'DDDDDD' }
        };
        
        // Colorir conforme total
        const totalColorCode = totalMonthlyProfitBtc > 0 ? '00B050' : 
                               totalMonthlyProfitBtc < 0 ? 'FF0000' : '000000';
        totalRow.getCell('btcProfit').font = { bold: true, color: { argb: totalColorCode } };
        totalRow.getCell('usdProfit').font = { bold: true, color: { argb: totalColorCode } };
        totalRow.getCell('brlProfit').font = { bold: true, color: { argb: totalColorCode } };
        totalRow.getCell('totalPercent').font = { bold: true, color: { argb: totalColorCode } };
        
        // Adicionar ao resumo
        summarySheet.addRow({
          metric: 'Total de Meses com Lucro/Perda',
          value: `${monthsWithProfits.length} meses`,
          btcValue: '-',
          usdValue: '-',
          brlValue: '-'
        });
      }
      
      // Adicionar planilha de análise mensal para exportação completa
      if (exportAll && Object.keys(monthlyData).length > 0) {
        const monthlyAnalysisSheet = workbook.addWorksheet('Análise Mensal', {
          properties: { tabColor: { argb: '9966FF' } }
        });
        
        // Adicionar cabeçalhos
        monthlyAnalysisSheet.columns = [
          { header: 'Mês', key: 'month', width: 20 },
          { header: 'Valor Aportado (BTC)', key: 'investmentBtc', width: 20 },
          { header: 'Valor Aportado (USD)', key: 'investmentUsd', width: 20 },
          { header: 'Valor Aportado (BRL)', key: 'investmentBrl', width: 20 },
          { header: 'Lucro/Perda (BTC)', key: 'profitBtc', width: 20 },
          { header: 'Lucro/Perda (USD)', key: 'profitUsd', width: 20 },
          { header: 'Lucro/Perda (BRL)', key: 'profitBrl', width: 20 },
          { header: '% do Aporte Mensal', key: 'percentOfMonthly', width: 20 },
          { header: '% do Aporte Total', key: 'percentOfTotal', width: 20 },
          { header: 'Número de Aportes', key: 'investmentCount', width: 18 },
          { header: 'Número de Lucros/Perdas', key: 'profitCount', width: 22 }
        ];
        
        // Estilizar cabeçalhos
        monthlyAnalysisSheet.getRow(1).font = { bold: true };
        monthlyAnalysisSheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4F4F6F' }
        };
        
        // Preparar dados mensais para ordenação
        const sortedMonthKeys = Object.keys(monthlyData).sort();
        
        // Adicionar dados mensais
        sortedMonthKeys.forEach(monthKey => {
          const monthData = monthlyData[monthKey];
          
          // Calcular valores atuais baseados na cotação atual
          const investmentBtc = monthData.investmentTotalBtc;
          const investmentUsd = investmentBtc * currentBtcUsdRate;
          const investmentBrl = investmentUsd * currentBrlUsdRate;
          
          const profitBtc = monthData.profitTotalBtc;
          const profitUsd = profitBtc * currentBtcUsdRate;
          const profitBrl = profitUsd * currentBrlUsdRate;
          
          // Porcentagens
          const percentOfMonthly = investmentBtc > 0 ? (profitBtc / investmentBtc) * 100 : 0;
          const percentOfTotal = totalInvestmentsBtc > 0 ? (profitBtc / totalInvestmentsBtc) * 100 : 0;
          
          const row = monthlyAnalysisSheet.addRow({
            month: monthData.label,
            investmentBtc: investmentBtc.toFixed(8),
            investmentUsd: investmentUsd.toFixed(2),
            investmentBrl: investmentBrl.toFixed(2),
            profitBtc: profitBtc.toFixed(8),
            profitUsd: profitUsd.toFixed(2),
            profitBrl: profitBrl.toFixed(2),
            percentOfMonthly: percentOfMonthly.toFixed(2) + '%',
            percentOfTotal: percentOfTotal.toFixed(2) + '%',
            investmentCount: monthData.investments.length,
            profitCount: monthData.profits.length
          });
          
          // Colorir a linha baseado no lucro/perda
          if (profitBtc > 0) {
            row.getCell('profitBtc').font = { color: { argb: '00B050' } };
            row.getCell('profitUsd').font = { color: { argb: '00B050' } };
            row.getCell('profitBrl').font = { color: { argb: '00B050' } };
            row.getCell('percentOfMonthly').font = { color: { argb: '00B050' } };
            row.getCell('percentOfTotal').font = { color: { argb: '00B050' } };
          } else if (profitBtc < 0) {
            row.getCell('profitBtc').font = { color: { argb: 'FF0000' } };
            row.getCell('profitUsd').font = { color: { argb: 'FF0000' } };
            row.getCell('profitBrl').font = { color: { argb: 'FF0000' } };
            row.getCell('percentOfMonthly').font = { color: { argb: 'FF0000' } };
            row.getCell('percentOfTotal').font = { color: { argb: 'FF0000' } };
          }
        });
        
        // Adicionar linha de total
        const totalRow = monthlyAnalysisSheet.addRow({
          month: 'TOTAL',
          investmentBtc: totalInvestmentsBtc.toFixed(8),
          investmentUsd: totalValueUsd.toFixed(2),
          investmentBrl: totalValueBrl.toFixed(2),
          profitBtc: totalProfitsBtc.toFixed(8),
          profitUsd: profitValueUsd.toFixed(2),
          profitBrl: profitValueBrl.toFixed(2),
          percentOfMonthly: roi.toFixed(2) + '%',
          percentOfTotal: roi.toFixed(2) + '%',
          investmentCount: investments.length,
          profitCount: profits.length
        });
        
        // Estilizar linha de total
        totalRow.font = { bold: true };
        totalRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'DDDDDD' }
        };
        
        // Colorir células de lucro/perda na linha de total
        if (totalProfitsBtc > 0) {
          totalRow.getCell('profitBtc').font = { bold: true, color: { argb: '00B050' } };
          totalRow.getCell('profitUsd').font = { bold: true, color: { argb: '00B050' } };
          totalRow.getCell('profitBrl').font = { bold: true, color: { argb: '00B050' } };
          totalRow.getCell('percentOfMonthly').font = { bold: true, color: { argb: '00B050' } };
          totalRow.getCell('percentOfTotal').font = { bold: true, color: { argb: '00B050' } };
        } else if (totalProfitsBtc < 0) {
          totalRow.getCell('profitBtc').font = { bold: true, color: { argb: 'FF0000' } };
          totalRow.getCell('profitUsd').font = { bold: true, color: { argb: 'FF0000' } };
          totalRow.getCell('profitBrl').font = { bold: true, color: { argb: 'FF0000' } };
          totalRow.getCell('percentOfMonthly').font = { bold: true, color: { argb: 'FF0000' } };
          totalRow.getCell('percentOfTotal').font = { bold: true, color: { argb: 'FF0000' } };
        }
      }
      
      // Adicionar planilha de Saldo Completo
      const balanceSheet = workbook.addWorksheet('Saldo Completo', {
        properties: { tabColor: { argb: '3366FF' } }
      });
      
      balanceSheet.columns = [
        { header: 'Descrição', key: 'description', width: 30 },
        { header: 'Valor (BTC)', key: 'btcValue', width: 20 },
        { header: 'Valor (USD)', key: 'usdValue', width: 20 },
        { header: 'Valor (BRL)', key: 'brlValue', width: 20 },
        { header: 'Porcentagem', key: 'percentage', width: 15 }
      ];
      
      balanceSheet.getRow(1).font = { bold: true };
      balanceSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4F4F6F' }
      };
      
      // Dados do saldo completo
      balanceSheet.addRow({
        description: 'Total de Aportes',
        btcValue: totalInvestmentsBtc.toFixed(8),
        usdValue: totalValueUsd.toFixed(2),
        brlValue: totalValueBrl.toFixed(2),
        percentage: '100.00%'
      });
      
      const totalBalance = totalInvestmentsBtc + totalProfitsBtc;
      const totalBalanceUsd = totalBalance * currentBtcUsdRate;
      const totalBalanceBrl = totalBalanceUsd * currentBrlUsdRate;
      
      balanceSheet.addRow({
        description: 'Total de Lucros',
        btcValue: totalProfitsBtc.toFixed(8),
        usdValue: profitValueUsd.toFixed(2),
        brlValue: profitValueBrl.toFixed(2),
        percentage: `${roi.toFixed(2)}%`
      }).font = { color: { argb: totalProfitsBtc >= 0 ? '00B050' : 'FF0000' } };
      
      const balanceTotalRow = balanceSheet.addRow({
        description: 'Saldo Total (Aportes + Lucros)',
        btcValue: totalBalance.toFixed(8),
        usdValue: totalBalanceUsd.toFixed(2),
        brlValue: totalBalanceBrl.toFixed(2),
        percentage: `${((totalBalance / totalInvestmentsBtc) * 100 - 100).toFixed(2)}%`
      });
      
      balanceTotalRow.font = { bold: true };
      balanceTotalRow.eachCell((cell, colNumber) => {
        if (colNumber > 1) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'E6E6E6' }
          };
        }
      });
      
      // Linha em branco
      balanceSheet.addRow({});
      
      // Adicionar detalhes de rendimento
      balanceSheet.addRow({
        description: 'Cotação BTC/USD atual',
        btcValue: '-',
        usdValue: currentBtcUsdRate.toFixed(2),
        brlValue: '-',
        percentage: '-'
      });
      
      balanceSheet.addRow({
        description: 'Cotação USD/BRL atual',
        btcValue: '-',
        usdValue: '1.00',
        brlValue: currentBrlUsdRate.toFixed(2),
        percentage: '-'
      });
      
      balanceSheet.addRow({
        description: 'Cotação BTC/BRL atual',
        btcValue: '-',
        usdValue: '-',
        brlValue: currentBtcBrlRate.toFixed(2),
        percentage: '-'
      });
      
      // Calcular média diária de lucro
      if (profits.length > 0) {
        const oldestProfit = [...profits].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        )[0];
        
        const daysSinceFirstProfit = Math.max(
          1, 
          Math.floor((new Date().getTime() - new Date(oldestProfit.date).getTime()) / (1000 * 60 * 60 * 24))
        );
        
        const dailyProfitBtc = totalProfitsBtc / daysSinceFirstProfit;
        const dailyProfitUsd = dailyProfitBtc * currentBtcUsdRate;
        const dailyProfitBrl = dailyProfitUsd * currentBrlUsdRate;
        
        // Linha em branco
        balanceSheet.addRow({});
        
        balanceSheet.addRow({
          description: 'Média de Lucro Diário',
          btcValue: dailyProfitBtc.toFixed(8),
          usdValue: dailyProfitUsd.toFixed(2),
          brlValue: dailyProfitBrl.toFixed(2),
          percentage: `${((dailyProfitBtc / totalBalance) * 100).toFixed(4)}%`
        }).font = { color: { argb: dailyProfitBtc >= 0 ? '00B050' : 'FF0000' } };
        
        const projectedMonthlyProfitBtc = dailyProfitBtc * 30;
        const projectedMonthlyProfitUsd = projectedMonthlyProfitBtc * currentBtcUsdRate;
        const projectedMonthlyProfitBrl = projectedMonthlyProfitUsd * currentBrlUsdRate;
        
        balanceSheet.addRow({
          description: 'Projeção de Lucro Mensal',
          btcValue: projectedMonthlyProfitBtc.toFixed(8),
          usdValue: projectedMonthlyProfitUsd.toFixed(2),
          brlValue: projectedMonthlyProfitBrl.toFixed(2),
          percentage: `${((projectedMonthlyProfitBtc / totalBalance) * 100).toFixed(2)}%`
        }).font = { color: { argb: projectedMonthlyProfitBtc >= 0 ? '00B050' : 'FF0000' } };
        
        const projectedYearlyProfitBtc = dailyProfitBtc * 365;
        const projectedYearlyProfitUsd = projectedYearlyProfitBtc * currentBtcUsdRate;
        const projectedYearlyProfitBrl = projectedYearlyProfitUsd * currentBrlUsdRate;
        
        balanceSheet.addRow({
          description: 'Projeção de Lucro Anual',
          btcValue: projectedYearlyProfitBtc.toFixed(8),
          usdValue: projectedYearlyProfitUsd.toFixed(2),
          brlValue: projectedYearlyProfitBrl.toFixed(2),
          percentage: `${((projectedYearlyProfitBtc / totalBalance) * 100).toFixed(2)}%`
        }).font = { color: { argb: projectedYearlyProfitBtc >= 0 ? '00B050' : 'FF0000' } };
      }
      
      // Informações adicionais para o resumo
      if (!exportAll) {
        // Para exportação mensal
        const monthlyInvestmentCount = dataToExport.investments.length;
        const monthlyProfitCount = dataToExport.profits.length;
        
        summarySheet.addRow({
          metric: 'Número de Aportes no Mês',
          value: `${monthlyInvestmentCount}`,
          btcValue: '-',
          usdValue: '-',
          brlValue: '-'
        });
        
        summarySheet.addRow({
          metric: 'Número de Registros de Lucro/Perda',
          value: `${monthlyProfitCount}`,
          btcValue: '-',
          usdValue: '-',
          brlValue: '-'
        });
      } else {
        // Para exportação completa
        const monthsCount = Object.keys(monthlyData).length;
        const totalMonthsWithProfit = Object.values(monthlyData).filter(
          (data: any) => data.profitTotalBtc > 0
        ).length;
        
        summarySheet.addRow({
          metric: 'Número Total de Meses',
          value: `${monthsCount}`,
          btcValue: '-',
          usdValue: '-',
          brlValue: '-'
        });
        
        summarySheet.addRow({
          metric: 'Meses com Lucro',
          value: `${totalMonthsWithProfit} (${((totalMonthsWithProfit / monthsCount) * 100).toFixed(1)}%)`,
          btcValue: '-',
          usdValue: '-',
          brlValue: '-'
        });
        
        summarySheet.addRow({
          metric: 'Média de Aporte Mensal',
          value: '-',
          btcValue: (totalInvestmentsBtc / Math.max(1, monthsCount)).toFixed(8),
          usdValue: `$${(totalValueUsd / Math.max(1, monthsCount)).toFixed(2)}`,
          brlValue: `R$${(totalValueBrl / Math.max(1, monthsCount)).toFixed(2)}`
        });
      }
      
      // Adicionar taxa de crescimento anualizado se tiver dados suficientes
      if (dataToExport.investments.length > 0) {
        const oldestInvestment = [...dataToExport.investments].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        )[0];
        
        const daysSinceFirstInvestment = Math.max(
          1, 
          Math.floor((new Date().getTime() - new Date(oldestInvestment.date).getTime()) / (1000 * 60 * 60 * 24))
        );
        
        if (daysSinceFirstInvestment > 30) {
          const annualizedROI = (Math.pow(1 + (roi / 100), 365 / daysSinceFirstInvestment) - 1) * 100;
          
          summarySheet.addRow({
            metric: 'ROI Anualizado',
            value: `${annualizedROI.toFixed(2)}%`,
            btcValue: '-',
            usdValue: '-',
            brlValue: '-'
          });
          
          summarySheet.addRow({
            metric: 'Período de Investimento',
            value: `${daysSinceFirstInvestment} dias`,
            btcValue: '-',
            usdValue: '-',
            brlValue: '-'
          });
        }
      }
      
      // Gerar o arquivo e fazer download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const dateStr = format(new Date(), "dd-MM-yyyy");
      const timeStr = format(new Date(), "HH-mm");
      const fileName = exportAll 
        ? `bitcoin-historico-completo-${dateStr}.xlsx` 
        : `bitcoin-${format(filterMonth, 'MMMM-yyyy', { locale: ptBR })}-exportado-${dateStr}.xlsx`;
      saveAs(blob, fileName);
      
      toast({
        title: "Exportação concluída com sucesso",
        description: `Arquivo "${fileName}" salvo com análise ${exportAll ? 'completa e resumo mensal' : 'detalhada do mês'}.`,
      });
      
    } catch (error) {
      console.error("Erro na exportação:", error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível completar a exportação. Verifique o console para mais detalhes.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportButtonClick = () => {
    if (isExporting) {
      toast({
        title: "Exportação em andamento",
        description: "Aguarde a conclusão da exportação atual.",
        variant: "destructive"
      });
      return;
    }
    
    if (investments.length === 0 && profits.length === 0) {
      toast({
        title: "Sem dados para exportar",
        description: "Não há registros para exportar.",
        variant: "destructive"
      });
      return;
    }
    
    setShowExportOptions(true);
  };

  // Funções de filtro e cálculo para o histórico
  const calculateTotalInvestmentsInMonth = (month: Date): number => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    
    return investments
      .filter(investment => {
        const investmentDate = new Date(investment.date);
        return isWithinInterval(investmentDate, { start: monthStart, end: monthEnd });
      })
      .reduce((total, investment) => {
        return total + convertToBtc(investment.amount, investment.unit);
      }, 0);
  };

  const calculateTotalProfitsInMonth = (month: Date): number => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    
    return profits
      .filter(profit => {
        const profitDate = new Date(profit.date);
        return isWithinInterval(profitDate, { start: monthStart, end: monthEnd });
      })
      .reduce((total, profit) => {
        const btcAmount = convertToBtc(profit.amount, profit.unit);
        return profit.isProfit ? total + btcAmount : total - btcAmount;
      }, 0);
  };

  const getFilteredInvestments = (): Investment[] => {
    if (!showFilterOptions) return investments;
    
    const monthStart = startOfMonth(filterMonth);
    const monthEnd = endOfMonth(filterMonth);
    
    return investments.filter(investment => {
      const investmentDate = new Date(investment.date);
      return isWithinInterval(investmentDate, { start: monthStart, end: monthEnd });
    });
  };

  const getFilteredProfits = (): ProfitRecord[] => {
    if (!showFilterOptions) return profits;
    
    const monthStart = startOfMonth(filterMonth);
    const monthEnd = endOfMonth(filterMonth);
    
    return profits.filter(profit => {
      const profitDate = new Date(profit.date);
      return isWithinInterval(profitDate, { start: monthStart, end: monthEnd });
    });
  };

  // Função para formatar valor baseado na moeda selecionada
  const formatBtcValueInCurrency = (btcValue: number): string => {
    if (displayCurrency === "USD") {
      return `$${(btcValue * currentRates.btcToUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      return `R$${(btcValue * currentRates.btcToUsd * currentRates.brlToUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  // Conteúdo das opções de exportação
  const ExportOptionsContent = () => (
    <>
      <div className="p-2 bg-purple-900/30 text-xs text-center text-gray-300 border-b border-purple-700/50">
        Selecione o tipo de exportação
      </div>
      <div className="p-0">
        <button
          className="w-full text-left px-4 py-3 hover:bg-purple-900/20 flex flex-col transition-colors"
          onClick={() => {
            exportData(false);
            setShowExportOptions(false);
          }}
          disabled={isExporting}
        >
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="font-medium">Exportar dados do mês atual</span>
          </div>
          {showFilterOptions && (
            <span className="text-xs text-gray-400 block mt-1 ml-6 flex-wrap">
              {format(filterMonth, "MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          )}
          <span className="text-xs text-gray-400 block mt-1 ml-6 flex-wrap">
            Inclui cotações, lucros e rendimentos detalhados
          </span>
        </button>
        <button
          className="w-full text-left px-4 py-3 hover:bg-purple-900/20 flex flex-col border-t border-purple-700/20 transition-colors"
          onClick={() => {
            exportData(true);
            setShowExportOptions(false);
          }}
          disabled={isExporting}
        >
          <div className="flex items-center">
            <Download className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="font-medium">Exportar todos os dados</span>
          </div>
          <span className="text-xs text-gray-400 block mt-1 ml-6 flex-wrap">
            Inclui histórico completo com análise de rendimento
          </span>
        </button>
        <div className="border-t border-purple-700/20 p-2 text-center">
          <button
            className="text-center text-xs text-gray-400 hover:text-gray-300 w-full py-1"
            onClick={() => setShowExportOptions(false)}
          >
            Cancelar
          </button>
        </div>
      </div>
    </>
  );

  // Interface simplificada temporária
  return (
    <div className="space-y-6">
      {usingFallbackRates && (
        <div className="bg-yellow-900/20 border border-yellow-700/50 text-yellow-300 px-3 py-2 rounded-md text-sm mb-2 flex items-center">
          <AlertTriangle className="h-4 w-4 mr-2" />
          Usando taxas de câmbio simuladas. Os valores podem não refletir o mercado atual.
          <span className="ml-2 text-yellow-200">Use o botão "Atualizar Preços" no topo da página.</span>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-black/30 border border-purple-800/40">
          <TabsTrigger value="register" className="data-[state=active]:bg-purple-800/70 data-[state=active]:text-white">
            <Plus className="h-4 w-4 mr-2" />
            Registrar
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-purple-800/70 data-[state=active]:text-white">
            <TrendingUp className="h-4 w-4 mr-2" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="panel border-purple-700/50">
              <CardHeader>
                <CardTitle className="text-lg">Registrar Aporte</CardTitle>
                <CardDescription>Registre seus investimentos em Bitcoin</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                  <Label htmlFor="investment-amount">Valor do Aporte</Label>
                  <Input
                    id="investment-amount"
                    type="number"
                    placeholder="Valor"
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(e.target.value)}
                  />
                </div>
                  <div>
                    <Label htmlFor="investment-date">Data do Aporte</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                          className="w-full justify-start text-left bg-black/30 border-purple-700/50 hover:bg-purple-900/20"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                          {investmentDate ? format(investmentDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione uma data"}
                      </Button>
                    </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-black/90 border-purple-800/60" align="start">
                        <div className="p-2 bg-purple-900/30 text-xs text-center text-gray-300 border-b border-purple-700/50">
                          Selecione a data do aporte
                        </div>
                      <CalendarComponent
                        mode="single"
                        selected={investmentDate}
                          onSelect={(date) => date && !isFutureDate(date) && setInvestmentDate(date)}
                          disabled={(date) => isFutureDate(date)}
                        initialFocus
                          className="bg-black/80"
                          locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                    {isFutureDate(investmentDate) && (
                      <p className="text-sm text-red-500 mt-1">Não é possível registrar eventos futuros</p>
                    )}
                  </div>
                  <Button onClick={addInvestment}>Adicionar Investimento</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="panel border-purple-700/50">
              <CardHeader>
                <CardTitle className="text-lg">Registrar Lucro/Perda</CardTitle>
                <CardDescription>Registre seus lucros ou perdas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                  <Label htmlFor="profit-amount">Valor</Label>
                  <Input
                    id="profit-amount"
                    type="number"
                    placeholder="Valor"
                    value={profitAmount}
                    onChange={(e) => setProfitAmount(e.target.value)}
                  />
                </div>
                  <div>
                    <Label htmlFor="profit-date">Data do Registro</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                          className="w-full justify-start text-left bg-black/30 border-purple-700/50 hover:bg-purple-900/20"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                          {profitDate ? format(profitDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione uma data"}
                      </Button>
                    </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-black/90 border-purple-800/60" align="start">
                        <div className="p-2 bg-purple-900/30 text-xs text-center text-gray-300 border-b border-purple-700/50">
                          Selecione a data do {isProfit ? "lucro" : "perda"}
                        </div>
                      <CalendarComponent
                        mode="single"
                        selected={profitDate}
                          onSelect={(date) => date && !isFutureDate(date) && setProfitDate(date)}
                          disabled={(date) => isFutureDate(date)}
                        initialFocus
                          className="bg-black/80"
                          locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                    {isFutureDate(profitDate) && (
                      <p className="text-sm text-red-500 mt-1">Não é possível registrar eventos futuros</p>
                    )}
                </div>
                  <RadioGroup
                    value={isProfit ? "profit" : "loss"}
                    onValueChange={(value) => setIsProfit(value === "profit")}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="profit" id="type-profit" />
                      <Label htmlFor="type-profit">Lucro</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="loss" id="type-loss" />
                      <Label htmlFor="type-loss">Perda</Label>
                    </div>
                  </RadioGroup>
                  <Button onClick={addProfitRecord}>
                  Adicionar {isProfit ? "Lucro" : "Perda"}
                </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card className="panel border-purple-700/50">
            <CardHeader>
              <CardTitle className="text-lg">Histórico</CardTitle>
              <div className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:space-x-2">
                <div className="flex items-center space-x-2">
                  <Button
                    variant={showFilterOptions ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowFilterOptions(!showFilterOptions)}
                    className={showFilterOptions ? "bg-purple-800 hover:bg-purple-700" : "bg-black/30 border-purple-700/50"}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {showFilterOptions ? "Filtro ativo" : "Filtrar por mês"}
                  </Button>
                  
                  {showFilterOptions && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                          size="sm"
                          className="bg-black/30 border-purple-700/50"
                        >
                          {format(filterMonth, "MMMM yyyy", { locale: ptBR })}
                          <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-black/90 border-purple-800/60">
                        <div className="p-2 bg-purple-900/30 text-xs text-center text-gray-300 border-b border-purple-700/50">
                          Selecione o mês para filtrar
                        </div>
                      <CalendarComponent
                        mode="single"
                          selected={filterMonth}
                          onSelect={(date) => date && setFilterMonth(date)}
                        initialFocus
                          className="bg-black/80"
                          locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleDisplayCurrency}
                    className="bg-black/30 border-purple-700/50"
                  >
                    {displayCurrency === "USD" ? (
                      <>
                        <span className="font-bold mr-1">R$</span> BRL
                      </>
                    ) : (
                      <>
                        <DollarSign className="h-4 w-4 mr-1" /> USD
                      </>
                    )}
                  </Button>
                  
                  {useExportDialog ? (
                      <Button
                        variant="outline"
                      size="sm"
                      onClick={() => setShowExportOptions(true)}
                      disabled={isExporting}
                      className="bg-black/30 border-purple-700/50"
                    >
                      {isExporting ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Exportando...
                        </>
                      ) : (
                        <>
                        <FileText className="mr-2 h-4 w-4" />
                          Exportar
                        </>
                      )}
                      </Button>
                  ) : (
                    <Popover open={showExportOptions} onOpenChange={setShowExportOptions}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isExporting}
                          className="bg-black/30 border-purple-700/50"
                        >
                          {isExporting ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Exportando...
                            </>
                          ) : (
                            <>
                          <FileText className="mr-2 h-4 w-4" />
                              Exportar
                            </>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="p-0 bg-black/90 border-purple-800/60" 
                        align={isMobile ? "center" : "end"}
                        alignOffset={isMobile ? 0 : -5}
                        sideOffset={5}
                        side={isMobile ? "bottom" : "bottom"}
                        style={{ width: isMobile ? "calc(100vw - 30px)" : "280px", maxWidth: "95vw" }}
                      >
                        <ExportOptionsContent />
                    </PopoverContent>
                  </Popover>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {showFilterOptions && (
                <div className="px-6 pb-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="bg-black/30 p-3 rounded-md border border-purple-700/50">
                      <div className="text-xs text-gray-400">Mês selecionado</div>
                      <div className="text-lg font-semibold text-white">
                        {format(filterMonth, "MMMM yyyy", { locale: ptBR })}
                </div>
              </div>

                    <div className="bg-black/30 p-3 rounded-md border border-purple-700/50">
                      <div className="text-xs text-gray-400">Aporte total</div>
                      <div className="text-lg font-semibold text-blue-400">
                        {formatCryptoAmount(calculateTotalInvestmentsInMonth(filterMonth), "BTC")}
                    </div>
                      <div className="text-xs text-gray-400">
                        {formatBtcValueInCurrency(calculateTotalInvestmentsInMonth(filterMonth))}
                </div>
              </div>

                    <div className="bg-black/30 p-3 rounded-md border border-purple-700/50">
                      <div className="text-xs text-gray-400">Lucro/Perda do mês</div>
                      <div className={`text-lg font-semibold ${calculateTotalProfitsInMonth(filterMonth) >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {calculateTotalProfitsInMonth(filterMonth) >= 0 ? "+" : ""}
                        {formatCryptoAmount(calculateTotalProfitsInMonth(filterMonth), "BTC")}
                  </div>
                      <div className="text-xs text-gray-400">
                        {calculateTotalProfitsInMonth(filterMonth) >= 0 ? "+" : ""}
                        {formatBtcValueInCurrency(calculateTotalProfitsInMonth(filterMonth))}
                  </div>
                </div>

                    <div className="bg-black/30 p-3 rounded-md border border-purple-700/50">
                      <div className="text-xs text-gray-400">Rendimento</div>
                      <div className={`text-lg font-semibold ${
                        calculateTotalInvestmentsInMonth(filterMonth) > 0 && 
                        (calculateTotalProfitsInMonth(filterMonth) / calculateTotalInvestmentsInMonth(filterMonth) * 100) >= 0 ? 
                        "text-green-500" : "text-red-500"}`}>
                        {calculateTotalInvestmentsInMonth(filterMonth) > 0 ? 
                          `${(calculateTotalProfitsInMonth(filterMonth) / calculateTotalInvestmentsInMonth(filterMonth) * 100).toFixed(2)}%` : 
                          "N/A"}
                  </div>
                  </div>
                </div>
              </div>
              )}
              
              {getFilteredInvestments().length === 0 && getFilteredProfits().length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {showFilterOptions ? 
                    `Nenhum registro encontrado para ${format(filterMonth, "MMMM 'de' yyyy", { locale: ptBR })}.` : 
                    "Nenhum registro encontrado. Adicione investimentos ou lucros na aba 'Registrar'."}
                </p>
              ) : (
                <div className="space-y-6">
                  {getFilteredInvestments().length > 0 && (
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold mb-2 text-blue-400">Investimentos</h3>
                    <Table>
                        <TableHeader className="bg-black/40">
                        <TableRow>
                            <TableHead className="w-1/4">Data</TableHead>
                            <TableHead className="w-1/4">Valor em BTC</TableHead>
                            <TableHead className="w-1/4">Valor em {displayCurrency}</TableHead>
                            <TableHead className="w-1/4 text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                          {getFilteredInvestments().map((investment) => {
                            const btcValue = convertToBtc(investment.amount, investment.unit);
                            return (
                          <TableRow key={investment.id} className="hover:bg-purple-900/10 border-b border-purple-900/10">
                                <TableCell>{format(new Date(investment.date), "d MMM yyyy", { locale: ptBR })}</TableCell>
                                <TableCell>{formatCryptoAmount(btcValue, "BTC")}</TableCell>
                                <TableCell>{formatBtcValueInCurrency(btcValue)}</TableCell>
                                <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                    size="icon"
                                onClick={() => deleteInvestment(investment.id)}
                                    className="hover:bg-red-900/20 hover:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                    </div>
                  )}
                  
                  {getFilteredProfits().length > 0 && (
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold mb-2 text-green-500">Lucros/Perdas</h3>
                    <Table>
                        <TableHeader className="bg-black/40">
                          <TableRow>
                            <TableHead className="w-1/5">Data</TableHead>
                            <TableHead className="w-1/5">Tipo</TableHead>
                            <TableHead className="w-1/5">Valor em BTC</TableHead>
                            <TableHead className="w-1/5">Valor em {displayCurrency}</TableHead>
                            <TableHead className="w-1/5 text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                          {getFilteredProfits().map((profit) => {
                            const btcValue = convertToBtc(profit.amount, profit.unit);
                            return (
                          <TableRow key={profit.id} className="hover:bg-purple-900/10 border-b border-purple-900/10">
                                <TableCell>{format(new Date(profit.date), "d MMM yyyy", { locale: ptBR })}</TableCell>
                                <TableCell>
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    profit.isProfit ? "bg-green-900/30 text-green-500" : "bg-red-900/30 text-red-500"
                                  }`}>
                                    {profit.isProfit ? "Lucro" : "Perda"}
                              </span>
                            </TableCell>
                                <TableCell className={profit.isProfit ? "text-green-500" : "text-red-500"}>
                                  {profit.isProfit ? "+" : "-"}
                                  {formatCryptoAmount(btcValue, "BTC")}
                                </TableCell>
                                <TableCell className={profit.isProfit ? "text-green-500" : "text-red-500"}>
                                  {profit.isProfit ? "+" : "-"}
                                  {formatBtcValueInCurrency(btcValue)}
                                </TableCell>
                                <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                    size="icon"
                                onClick={() => deleteProfit(profit.id)}
                                    className="hover:bg-red-900/20 hover:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                    </div>
                  )}
                </div>
                )}
              </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para exportação em telas pequenas */}
      {useExportDialog && (
        <Dialog open={showExportOptions} onOpenChange={setShowExportOptions}>
          <DialogContent className="p-0 max-w-[95vw] bg-black/95 border-purple-800/60" style={{ maxHeight: "80vh" }}>
            <DialogHeader className="p-4 pb-0">
              <DialogTitle className="text-center">Exportar Dados</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto">
              <ExportOptionsContent />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 