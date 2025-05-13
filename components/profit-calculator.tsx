"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
import { format, subMonths, addMonths, startOfMonth, endOfMonth, isWithinInterval, isBefore, startOfDay, endOfDay } from "date-fns";
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
import { useIsMobile } from "@/hooks/use-mobile";
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
import { Checkbox } from "@/components/ui/checkbox"; // ADICIONAR IMPORT

// Tipos de dados
type CurrencyUnit = "BTC" | "SATS";
type DisplayCurrency = "USD" | "BRL";

interface Investment {
  id: string;
  originalId?: string;
  date: string;
  amount: number;
  unit: CurrencyUnit;
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

export default function ProfitCalculator({ btcToUsd, brlToUsd, appData }: ProfitCalculatorProps) {
  // Estados MODIFICADOS
  const [reports, setReports] = useState<Report[]>([]);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  // NOVO ESTADO PARA SELEÇÃO DE RELATÓRIOS NA ABA HISTÓRICO
  const [selectedReportIdsForHistoryView, setSelectedReportIdsForHistoryView] = useState<string[]>([]);
  
  // REINTRODUZIR activeReport
  const activeReport = useMemo(() => {
    if (!activeReportId) return null;
    return reports.find(r => r.id === activeReportId) || null;
  }, [reports, activeReportId]);
  
  // Manter outros estados (activeTab, selectedMonth, etc.)
  const [activeTab, setActiveTab] = useState<string>("register");
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("USD");
  const [currentRates, setCurrentRates] = useState({ btcToUsd, brlToUsd });
  const [loading, setLoading] = useState(false);
  const [usingFallbackRates, setUsingFallbackRates] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [investmentAmount, setInvestmentAmount] = useState<string>("");
  const [investmentUnit, setInvestmentUnit] = useState<CurrencyUnit>("SATS");
  const [investmentDate, setInvestmentDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0));
  });
  const [profitAmount, setProfitAmount] = useState<string>("");
  const [profitUnit, setProfitUnit] = useState<CurrencyUnit>("SATS");
  const [profitDate, setProfitDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0));
  });
  const [isProfit, setIsProfit] = useState<boolean>(true);
  const [filterMonth, setFilterMonth] = useState<Date>(new Date());
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [useExportDialog, setUseExportDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [importType, setImportType] = useState<"excel" | "csv" | "internal" | "investment-csv" | null>(null);
  const [showDeleteInvestmentsDialog, setShowDeleteInvestmentsDialog] = useState(false);
  const [showDeleteProfitsDialog, setShowDeleteProfitsDialog] = useState(false);
  
  // Variável para controlar se um toast está sendo exibido
  const [toastDebounce, setToastDebounce] = useState(false);
  
  // Ref para input de arquivo
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const internalFileInputRef = useRef<HTMLInputElement>(null);
  const investmentCsvFileInputRef = useRef<HTMLInputElement>(null);

  const isMobile = useIsMobile();
  const isSmallScreen = typeof window !== 'undefined' ? window.innerWidth < 350 : false;

  // Novo estado para o diálogo de duplicações
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{count: number, type: string} | null>(null);

  // Estados para confirmação de adição de registros potencialmente duplicados
  const [pendingInvestment, setPendingInvestment] = useState<Investment | null>(null);
  const [pendingProfit, setPendingProfit] = useState<ProfitRecord | null>(null);
  const [showConfirmDuplicateDialog, setShowConfirmDuplicateDialog] = useState(false);
  const [duplicateConfirmInfo, setDuplicateConfirmInfo] = useState<{
    type: 'investment' | 'profit',
    date: string,
    amount: number,
    unit: CurrencyUnit
  } | null>(null);

  // REINTRODUZIR ESTADOS PARA CRIAÇÃO DE RELATÓRIO
  const [reportNameInput, setReportNameInput] = useState("");
  const [showCreateReportDialog, setShowCreateReportDialog] = useState(false);

  // NOVOS ESTADOS PARA FILTRO DE HISTÓRICO
  const [historyFilterType, setHistoryFilterType] = useState<'month' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);

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

  // NOVO BLOCO DE useEffect PARA CARREGAMENTO/SALVAMENTO/MIGRAÇÃO
  // useEffect DE CARREGAMENTO DE DADOS - MODIFICADO
  useEffect(() => {
    const savedReportsString = localStorage.getItem("bitcoinReports");
    const savedDisplayCurrency = localStorage.getItem("bitcoinDisplayCurrency");
    let loadedReports: Report[] = [];
    let migrated = false;

    if (savedReportsString) {
      try {
        const parsedReports = JSON.parse(savedReportsString);
        if (Array.isArray(parsedReports) && parsedReports.every(r => r.id && r.name && Array.isArray(r.investments) && Array.isArray(r.profits))) {
          loadedReports = parsedReports;
        } else {
          console.error("Formato de relatórios salvos inválido.");
          loadedReports = [];
        }
      } catch (e) {
        console.error("Erro ao analisar relatórios salvos:", e);
        loadedReports = [];
      }
    } else {
      const oldInvestmentsString = localStorage.getItem("bitcoinInvestments");
      const oldProfitsString = localStorage.getItem("bitcoinProfits");

      if (oldInvestmentsString || oldProfitsString) {
        let oldInvestments: Investment[] = [];
        let oldProfits: ProfitRecord[] = [];
        try {
          if (oldInvestmentsString) oldInvestments = JSON.parse(oldInvestmentsString);
          if (oldProfitsString) oldProfits = JSON.parse(oldProfitsString);

          if (oldInvestments.length > 0 || oldProfits.length > 0) {
            const defaultReport: Report = {
              id: `migrated-${Date.now()}`,
              name: "Relatório Principal (Migrado)",
              investments: oldInvestments,
              profits: oldProfits,
              createdAt: new Date().toISOString(),
              color: "#8844ee"
            };
            loadedReports = [defaultReport];
            migrated = true;
            localStorage.setItem("bitcoinReports", JSON.stringify(loadedReports)); // Salva o migrado
            localStorage.removeItem("bitcoinInvestments");
            localStorage.removeItem("bitcoinProfits");
          }
        } catch (e) {
          console.error("Erro ao migrar dados antigos:", e);
        }
      }
    }
    
    setReports(loadedReports);
    if (loadedReports.length > 0) {
      if (!activeReportId) {
        setActiveReportId(loadedReports[0].id);
      }
      if (selectedReportIdsForHistoryView.length === 0) {
        // Inicializa selectedReportIdsForHistoryView com o ID do activeReportId se existir, ou o primeiro relatório
        const initialHistorySelection = activeReportId ? [activeReportId] : (loadedReports.length > 0 ? [loadedReports[0].id] : []);
        setSelectedReportIdsForHistoryView(initialHistorySelection);
      } else {
        // Garante que os relatórios selecionados para histórico ainda existam
        setSelectedReportIdsForHistoryView(prev => prev.filter(id => loadedReports.some(r => r.id === id)));
      }
    } else {
        setActiveReportId(null);
        setSelectedReportIdsForHistoryView([]);
    }

    if (savedDisplayCurrency) {
      try {
        setDisplayCurrency(JSON.parse(savedDisplayCurrency) as DisplayCurrency);
      } catch (e) {
        console.error("Erro ao analisar moeda de exibição salva:", e);
      }
    }

    setIsDataLoaded(true);
    
    if (migrated) {
        toast({
            title: "Dados Migrados",
            description: "Seus dados antigos foram migrados para um novo formato de relatório.",
            variant: "success",
        });
    }
  }, []); // Array de dependências vazio para executar apenas na montagem

  useEffect(() => {
    if (isDataLoaded) {
      localStorage.setItem("bitcoinReports", JSON.stringify(reports));
    }
  }, [reports, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
      localStorage.setItem("bitcoinDisplayCurrency", JSON.stringify(displayCurrency));
    }
  }, [displayCurrency, isDataLoaded]);
  
  useEffect(() => {
    if (isDataLoaded) {
      updateRates();
    }
  }, [isDataLoaded, appData]); // Adicionado appData se updateRates o utiliza e não é pego por outro useEffect

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
          
          // Evitar múltiplos toasts
          if (!toastDebounce) {
            setToastDebounce(true);
            toast({
              title: "Cotação atualizada",
              description: `Bitcoin: ${priceData.usd.toLocaleString()} USD`,
              variant: "success",
            });
            setTimeout(() => setToastDebounce(false), 1000);
          }
        }
      } catch (error) {
        console.error("Erro ao atualizar cotação:", error);
        
        // Evitar múltiplos toasts também no caso de erro
        if (!toastDebounce) {
          setToastDebounce(true);
          toast({
            title: "Erro ao atualizar cotação",
            description: "Usando as últimas taxas disponíveis.",
            variant: "destructive",
          });
          setTimeout(() => setToastDebounce(false), 1000);
        }
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
    today.setHours(0, 0, 0, 0);
    const dateToCompare = new Date(date);
    dateToCompare.setHours(0, 0, 0, 0);
    return dateToCompare > today;
  };

  // Função para garantir que a data não seja afetada pelo fuso horário
  const formatDateToUTC = (date: Date): string => {
    // Usar o método getUTC* para obter os valores UTC da data
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1; // Janeiro é 0
    const day = date.getUTCDate();
    
    // Formatar a data como YYYY-MM-DD
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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

    let targetReportId = activeReportId;
    if (!targetReportId) {
      if (reports.length === 0) {
        const newReport: Report = {
          id: `report-default-${Date.now()}`, name: "Relatório Padrão",
          investments: [], profits: [], createdAt: new Date().toISOString(), color: "#8844ee"
        };
        setReports([newReport]);
        setActiveReportId(newReport.id);
        targetReportId = newReport.id;
        toast({ title: "Relatório Criado", description: "Um 'Relatório Padrão' foi criado para seu primeiro registro.", variant: "default" }); // MODIFICADO: info -> default
      } else {
        // Se há relatórios mas nenhum ativo, poderia selecionar o primeiro ou pedir para selecionar
        // Por simplicidade, vamos exigir que um relatório seja selecionado ou criado via UI se já existirem relatórios
         toast({ title: "Nenhum relatório ativo", description: "Por favor, selecione um relatório na aba Histórico ou crie um novo.", variant: "warning" });
        return;
      }
    }
    
    const reportToUpdate = reports.find(r => r.id === targetReportId); // Usar targetReportId aqui
    if (!reportToUpdate) {
        toast({ title: "Erro", description: "Relatório alvo não encontrado para adicionar aporte.", variant: "destructive" });
        return;
    }

    const newInvestment: Investment = {
      id: Date.now().toString(), date: formatDateToUTC(investmentDate),
      amount: Number(investmentAmount), unit: investmentUnit,
    };

    const possibleDuplicates = reportToUpdate.investments.filter(inv => 
      inv.date === newInvestment.date && inv.amount === newInvestment.amount && inv.unit === newInvestment.unit
    );

    if (possibleDuplicates.length > 0) {
      setPendingInvestment(newInvestment);
      setDuplicateConfirmInfo({ type: 'investment', date: newInvestment.date, amount: newInvestment.amount, unit: newInvestment.unit });
      setShowConfirmDuplicateDialog(true);
    } else {
      confirmAddInvestment(newInvestment);
    }
  };
  
  // Função para confirmar adição do investimento após possível duplicação
  const confirmAddInvestment = (investment: Investment) => {
    setReports(prevReports => prevReports.map(r => 
      r.id === activeReportId // Garante que está atualizando o relatório ativo
        ? { ...r, investments: [...r.investments, investment] }
        : r
    ));
    setInvestmentAmount("");
    
    // Evitar múltiplos toasts
    if (!toastDebounce) {
      setToastDebounce(true);
      toast({
        title: "Aporte registrado!",
        description: `Aporte de ${formatCryptoAmount(investment.amount, investment.unit)} adicionado ao relatório "${reports.find(r => r.id === activeReportId)?.name || ''}".`,
        variant: "success",
      });
      setTimeout(() => setToastDebounce(false), 500);
    }
    
    // Limpar estados de confirmação
    setPendingInvestment(null);
    setDuplicateConfirmInfo(null);
    setShowConfirmDuplicateDialog(false);
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

    let targetReportId = activeReportId;
    if (!targetReportId) {
      if (reports.length === 0) {
        const newReport: Report = {
          id: `report-default-${Date.now()}`, name: "Relatório Padrão",
          investments: [], profits: [], createdAt: new Date().toISOString(), color: "#8844ee"
        };
        setReports([newReport]);
        setActiveReportId(newReport.id);
        targetReportId = newReport.id;
        toast({ title: "Relatório Criado", description: "Um 'Relatório Padrão' foi criado para seu primeiro registro.", variant: "default" }); // MODIFICADO: info -> default
      } else {
         toast({ title: "Nenhum relatório ativo", description: "Por favor, selecione um relatório na aba Histórico ou crie um novo.", variant: "warning" });
        return;
      }
    }

    const reportToUpdate = reports.find(r => r.id === targetReportId); // Usar targetReportId
     if (!reportToUpdate) {
        toast({ title: "Erro", description: "Relatório alvo não encontrado para adicionar lucro/perda.", variant: "destructive" });
        return;
    }

    // Criar novo registro de lucro usando formatDateToUTC
    const newProfit: ProfitRecord = {
      id: Date.now().toString(),
      date: formatDateToUTC(profitDate),
      amount: Number(profitAmount),
      unit: profitUnit,
      isProfit,
    };

    // Verificar possíveis duplicações (mesma data, mesmo valor e mesmo tipo lucro/perda)
    const possibleDuplicates = reportToUpdate.profits.filter(p => 
      p.date === newProfit.date && 
      p.amount === newProfit.amount && 
      p.unit === newProfit.unit &&
      p.isProfit === newProfit.isProfit
    );

    if (possibleDuplicates.length > 0) {
      // Armazenar o lucro pendente para confirmação
      setPendingProfit(newProfit);
      setDuplicateConfirmInfo({
        type: 'profit',
        date: newProfit.date,
        amount: newProfit.amount,
        unit: newProfit.unit
      });
      setShowConfirmDuplicateDialog(true);
    } else {
      // Adicionar diretamente se não houver possíveis duplicações
      confirmAddProfitRecord(newProfit);
    }
  };
  
  // Função para confirmar adição do lucro/perda após possível duplicação
  const confirmAddProfitRecord = (profit: ProfitRecord) => {
    setReports(prevReports => prevReports.map(r =>
      r.id === activeReportId // Garante que está atualizando o relatório ativo
        ? { ...r, profits: [...r.profits, profit] }
        : r
    ));
    setProfitAmount("");
    
    // Evitar múltiplos toasts
    if (!toastDebounce) {
      setToastDebounce(true);
      toast({
        title: isProfit ? "Lucro registrado!" : "Perda registrada!",
        description: `${isProfit ? "Lucro" : "Perda"} de ${formatCryptoAmount(profit.amount, profit.unit)} adicionado ao relatório "${reports.find(r => r.id === activeReportId)?.name || ''}".`,
        variant: "success",
      });
      setTimeout(() => setToastDebounce(false), 500);
    }
    
    // Limpar estados de confirmação
    setPendingProfit(null);
    setDuplicateConfirmInfo(null);
    setShowConfirmDuplicateDialog(false);
  };

  const deleteInvestment = (id: string) => {
    if (!activeReportId) {
      toast({ title: "Erro", description: "Nenhum relatório ativo selecionado.", variant: "destructive" });
      return;
    }
    setReports(prevReports => prevReports.map(r => 
      r.id === activeReportId
        ? { ...r, investments: r.investments.filter(inv => inv.id !== id) }
        : r
    ));
    if (!toastDebounce) {
      setToastDebounce(true);
      toast({ title: "Aporte removido", description: "O aporte foi removido do relatório atual." });
      setTimeout(() => setToastDebounce(false), 1000);
    }
  };

  const deleteProfit = (id: string) => {
    if (!activeReportId) {
      toast({ title: "Erro", description: "Nenhum relatório ativo selecionado para exclusão.", variant: "destructive" });
      return;
    }
    setReports(prevReports => prevReports.map(report => {
      if (report.id === activeReportId) {
        return {
          ...report,
          profits: report.profits.filter(p => p.id !== id)
        };
      }
      return report;
    }));
    toast({ title: "Sucesso", description: "Registro de lucro/prejuízo excluído.", variant: "default" });
  };
  
  const deleteAllInvestments = () => {
    if (!activeReportId) {
      toast({ title: "Erro", description: "Nenhum relatório ativo selecionado para exclusão.", variant: "destructive" });
      setShowDeleteInvestmentsDialog(false);
      return;
    }
    setReports(prevReports => prevReports.map(report => {
      if (report.id === activeReportId) {
        return { ...report, investments: [] };
      }
      return report;
    }));
    toast({ title: "Sucesso", description: "Todos os investimentos foram excluídos do relatório ativo.", variant: "default" });
    setShowDeleteInvestmentsDialog(false);
  };
  
  const deleteAllProfits = () => {
    if (!activeReportId) {
      toast({ title: "Erro", description: "Nenhum relatório ativo selecionado para exclusão.", variant: "destructive" });
      setShowDeleteProfitsDialog(false);
      return;
    }
    setReports(prevReports => prevReports.map(report => {
      if (report.id === activeReportId) {
        return { ...report, profits: [] };
      }
      return report;
    }));
    toast({ title: "Sucesso", description: "Todos os registros de lucro/prejuízo foram excluídos do relatório ativo.", variant: "default" });
    setShowDeleteProfitsDialog(false);
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
    setDisplayCurrency(prev => (prev === "USD" ? "BRL" : "USD"));
  };

  // Função para exportação com opções
  const exportData = async (exportAll: boolean = false) => {
    if (!activeReport) {
      toast({
        title: "Nenhum Relatório Ativo",
        description: "Por favor, selecione ou crie um relatório para exportar os dados.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    toast({
      title: "Exportando Dados",
      description: "Aguarde enquanto preparamos seus dados para download...",
      variant: "default",
    });

    try {
      // Filtrar dados se exportAll for false
      const investmentsToExport = exportAll ? activeReport.investments : getFilteredInvestments();
      const profitsToExport = exportAll ? activeReport.profits : getFilteredProfits();

      if (investmentsToExport.length === 0 && profitsToExport.length === 0) {
        toast({
          title: "Nenhum Dado para Exportar",
          description: exportAll ? "O relatório ativo não contém dados." : "Não há dados para o filtro atual.",
          variant: "destructive",
        });
        setIsExporting(false);
        return;
      }
      
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "BTC Profit Calculator";
      workbook.lastModifiedBy = "BTC Profit Calculator";
      workbook.created = new Date();
      workbook.modified = new Date();

      // Estilo para cabeçalhos
      const headerStyle: Partial<ExcelJS.Style> = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4F46E5' } // Roxo Tailwind (indigo-600)
        },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
        }
      };

      // Estilo para células de dados
      const dataCellStyle: Partial<ExcelJS.Style> = {
        alignment: { vertical: 'middle' },
        border: {
          top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
        }
      };
      
      const currencyStyle: Partial<ExcelJS.Style> = {
        ...dataCellStyle,
        numFmt: '#,##0.00' // Formato para moeda com 2 casas decimais
      };
      
      const cryptoStyle: Partial<ExcelJS.Style> = {
        ...dataCellStyle,
        numFmt: '#,##0.00000000' // Formato para cripto com 8 casas decimais
      };
      
      const dateStyle: Partial<ExcelJS.Style> = {
        ...dataCellStyle,
        numFmt: 'dd/mm/yyyy hh:mm:ss' // Formato para data e hora
      };


      // Resumo do Relatório
      const summarySheet = workbook.addWorksheet('Resumo do Relatório');
      summarySheet.columns = [
        { header: 'Métrica', key: 'metric', width: 30 },
        { header: 'Valor', key: 'value', width: 30 }
      ];
      summarySheet.getRow(1).eachCell({ includeEmpty: true }, cell => { cell.style = headerStyle; });

      const totalInvestmentsBtc = activeReport.investments.reduce((sum, inv) => sum + convertToBtc(inv.amount, inv.unit), 0);
      const totalProfitsBtc = activeReport.profits.filter(p => p.isProfit).reduce((sum, prof) => sum + convertToBtc(prof.amount, prof.unit), 0);
      const totalLossesBtc = activeReport.profits.filter(p => !p.isProfit).reduce((sum, loss) => sum + convertToBtc(loss.amount, loss.unit), 0);
      const netProfitBtc = totalProfitsBtc - totalLossesBtc;
      const balanceBtc = totalInvestmentsBtc + netProfitBtc;

      summarySheet.addRow({ metric: 'Nome do Relatório', value: activeReport.name });
      summarySheet.addRow({ metric: 'Data de Criação', value: format(new Date(activeReport.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) });
      summarySheet.addRow({ metric: 'Total de Investimentos (BTC)', value: totalInvestmentsBtc });
      summarySheet.addRow({ metric: 'Total de Lucros (BTC)', value: totalProfitsBtc });
      summarySheet.addRow({ metric: 'Total de Prejuízos (BTC)', value: totalLossesBtc });
      summarySheet.addRow({ metric: 'Lucro Líquido (BTC)', value: netProfitBtc });
      summarySheet.addRow({ metric: 'Saldo Atual Estimado (BTC)', value: balanceBtc });
      
      if (appData?.currentPrice) {
        summarySheet.addRow({ metric: `Saldo Atual Estimado (${displayCurrency})`, value: formatCurrency(balanceBtc * (displayCurrency === "USD" ? currentRates.btcToUsd : currentRates.btcToUsd * currentRates.brlToUsd), displayCurrency) });
        summarySheet.addRow({ metric: `Preço BTC (${displayCurrency}) Usado`, value: formatCurrency(displayCurrency === "USD" ? currentRates.btcToUsd : currentRates.btcToUsd * currentRates.brlToUsd, displayCurrency) });
      }
      
      summarySheet.getColumn('value').numFmt = '#,##0.00########'; // Formato geral para valores

      // Planilha de Investimentos
      const investmentSheet = workbook.addWorksheet('Investimentos');
      investmentSheet.columns = [
        { header: 'ID', key: 'id', width: 30 },
        { header: 'Data (UTC)', key: 'date', width: 20, style: dateStyle },
        { header: 'Quantidade', key: 'amount', width: 20, style: cryptoStyle }, // cryptoStyle é um base, ajustaremos por SATS/BTC depois
        { header: 'Unidade', key: 'unit', width: 10 },
        { header: 'Equivalente BTC', key: 'btcEquivalent', width: 20, style: cryptoStyle },
        { header: `Valor (${displayCurrency}) no Momento da Compra`, key: 'valueAtPurchase', width: 30, style: currencyStyle },
      ];
      investmentSheet.getRow(1).eachCell({ includeEmpty: true }, cell => { cell.style = headerStyle; });

      investmentsToExport.forEach(inv => {
        const btcEquivalent = convertToBtc(inv.amount, inv.unit);
        // TODO: Precisaríamos de dados históricos para calcular o valor exato no momento da compra.
        // Por enquanto, deixaremos este campo como "N/A" ou usaremos o preço atual como uma aproximação,
        // o que não é ideal mas é uma limitação sem dados históricos de preço por data.
        investmentSheet.addRow({
          id: inv.id,
          date: new Date(inv.date), // ExcelJS lida bem com objetos Date
          amount: inv.amount,
          unit: inv.unit,
          btcEquivalent: btcEquivalent,
          valueAtPurchase: 'N/A' // Placeholder
        });
      });
      
      // Removida a atribuição de função a investmentSheet.getColumn('amount').numFmt daqui

      // Planilha de Lucros/Prejuízos
      const profitSheet = workbook.addWorksheet('Lucros e Prejuízos');
      profitSheet.columns = [
        { header: 'ID', key: 'id', width: 30 },
        { header: 'Data (UTC)', key: 'date', width: 20, style: dateStyle },
        { header: 'Quantidade', key: 'amount', width: 20, style: cryptoStyle }, // cryptoStyle é um base, ajustaremos por SATS/BTC depois
        { header: 'Unidade', key: 'unit', width: 10 },
        { header: 'Tipo', key: 'type', width: 10 },
        { header: 'Equivalente BTC', key: 'btcEquivalent', width: 20, style: cryptoStyle },
        { header: `Valor (${displayCurrency}) no Momento do Registro`, key: 'valueAtRecord', width: 30, style: currencyStyle },
      ];
      profitSheet.getRow(1).eachCell({ includeEmpty: true }, cell => { cell.style = headerStyle; });

      profitsToExport.forEach(prof => {
        const btcEquivalent = convertToBtc(prof.amount, prof.unit);
        // Similar ao investimento, o valor exato no momento do registro precisaria de dados históricos.
        profitSheet.addRow({
          id: prof.id,
          date: new Date(prof.date),
          amount: prof.amount,
          unit: prof.unit,
          type: prof.isProfit ? 'Lucro' : 'Prejuízo',
          btcEquivalent: btcEquivalent,
          valueAtRecord: 'N/A' // Placeholder
        });
      });
      
      // Removida a atribuição de função a profitSheet.getColumn('amount').numFmt daqui

      // Adicionando Metadados ao Arquivo
      const metadataSheet = workbook.addWorksheet('Metadados');
      metadataSheet.columns = [
        { header: 'Chave', key: 'key', width: 30 },
        { header: 'Valor', key: 'value', width: 50 }
      ];
      metadataSheet.getRow(1).eachCell({ includeEmpty: true }, cell => { cell.style = headerStyle; });

      metadataSheet.addRow({ key: 'Nome do Relatório', value: activeReport.name });
      metadataSheet.addRow({ key: 'ID do Relatório', value: activeReport.id });
      metadataSheet.addRow({ key: 'Data de Exportação', value: format(new Date(), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }) });
      metadataSheet.addRow({ key: 'Moeda de Exibição', value: displayCurrency });
      metadataSheet.addRow({ key: 'Preço BTC/USD na Exportação', value: currentRates.btcToUsd });
      metadataSheet.addRow({ key: 'Preço BRL/USD na Exportação', value: currentRates.brlToUsd });
      metadataSheet.addRow({ key: 'Dados Completos Exportados', value: exportAll ? 'Sim' : 'Não (Filtrado)' });
      if (!exportAll) {
        metadataSheet.addRow({ key: 'Mês do Filtro (se aplicável)', value: format(filterMonth, "MMMM yyyy", { locale: ptBR }) });
      }
      metadataSheet.addRow({ key: 'Total de Investimentos Exportados', value: investmentsToExport.length });
      metadataSheet.addRow({ key: 'Total de Lucros/Prejuízos Exportados', value: profitsToExport.length });

      // Aplicar formatação às colunas
      [summarySheet, investmentSheet, profitSheet, metadataSheet].forEach(sheet => {
        sheet.columns.forEach(column => {
          if (column.key) { // Certifique-se de que a chave existe
            const cells = sheet.getColumn(column.key).values;
            if (cells && cells.length > 1) { // Ignora o cabeçalho
              // Aplica o estilo de dados às células de dados
              sheet.getColumn(column.key).eachCell({ includeEmpty: true }, (cell, rowNumber) => {
                if (rowNumber > 1) { // Ignora a linha do cabeçalho
                  cell.style = { ...cell.style, ...dataCellStyle }; // Aplica estilo de dados base
                  
                  let formatString: string | undefined = undefined;

                  if (column.key === 'amount' && (sheet.name === 'Investimentos' || sheet.name === 'Lucros e Prejuízos')) {
                    const unitCell = cell.row.getCell('unit'); // A chave 'unit' deve existir nas colunas dessas planilhas
                    const unitRawValue = unitCell?.value; // value pode ser null, string, number, etc.
                    
                    if (unitRawValue === 'SATS') {
                      formatString = '#,##0';
                    } else if (unitRawValue === 'BTC') { // Assumindo que a unidade será explicitamente 'BTC' ou 'SATS'
                      formatString = '#,##0.00000000';
                    } else if (column.style?.numFmt) { 
                      // Fallback para o numFmt do estilo da coluna 'amount' (que é cryptoStyle) se a unidade não for reconhecida
                      formatString = column.style.numFmt;
                    } else {
                      // Fallback final se column.style.numFmt também não existir (improvável para 'amount')
                       formatString = '#,##0.00000000'; // Formato BTC padrão como último recurso
                    }
                  } else if (column.style?.numFmt) { // Usar o numFmt definido no estilo da coluna para outros casos
                    formatString = column.style.numFmt;
                  }
                  // Adicional: Para a coluna 'value' na 'Resumo do Relatório' e 'Metadados',
                  // o numFmt global summarySheet.getColumn('value').numFmt = '#,##0.00########'; já foi aplicado.
                  // Se uma formatação mais específica for necessária por linha (ex: BTC vs USD), 
                  // seria melhor tratá-la ao adicionar as linhas ou com lógica mais detalhada aqui.

                  if (formatString !== undefined) { // Garante que string vazia também seja aplicada se for intencional
                    cell.numFmt = formatString;
                  }
                }
              });
            }
          }
        });
         // Autoajuste da largura das colunas com base no conteúdo, limitado a um máximo
        sheet.columns.forEach(column => {
            let maxLength = 0;
            column.eachCell!({ includeEmpty: true }, function(cell) {
                var columnLength = cell.value ? cell.value.toString().length : 10;
                if (columnLength > maxLength) {
                    maxLength = columnLength;
                }
            });
            column.width = maxLength < 10 ? 10 : (maxLength > 50 ? 50 : maxLength + 2); // min 10, max 50
        });
      });
      
      // Estilo especial para a primeira coluna (chave) na aba de Metadados e Resumo
      summarySheet.getColumn('metric').font = { bold: true };
      metadataSheet.getColumn('key').font = { bold: true };


      const buffer = await workbook.xlsx.writeBuffer();
      const reportNameSanitized = activeReport.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const dateSuffix = format(new Date(), "yyyyMMdd_HHmmss");
      const fileName = `btc_calculator_report_${reportNameSanitized}_${dateSuffix}.xlsx`;
      
      saveAs(new Blob([buffer]), fileName);

      toast({
        title: "Exportação Concluída",
        description: `Seus dados foram exportados com sucesso para ${fileName}`,
        variant: "default",
      });

    } catch (error) {
      console.error("Erro ao exportar dados:", error);
      toast({
        title: "Erro na Exportação",
        description: "Ocorreu um erro ao tentar exportar seus dados. Verifique o console para mais detalhes.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setUseExportDialog(false); // Fecha o diálogo após a exportação
      setShowExportOptions(false); // Fecha o popover/dropdown de opções
    }
  };


  const handleExportButtonClick = () => {
    if (!activeReport || activeReport.investments.length === 0 && activeReport.profits.length === 0) {
       toast({
         title: "Nenhum dado para exportar",
         description: "Adicione investimentos ou lucros/prejuízos antes de exportar.",
         variant: "destructive"
       });
       return;
    }
    // Se houver dados, decide se mostra o diálogo ou o popover
    if (isMobile || isSmallScreen) {
      setUseExportDialog(true);
    } else {
      // Para desktop, pode-se usar um Popover, que é controlado por showExportOptions
      // Se showExportOptions já estiver controlando um popover, não precisa fazer nada aqui
      // ou pode-se abrir um diálogo também por consistência, se preferir.
      // Por ora, vamos assumir que o popover é acionado pelo PopoverTrigger
      // e esta função é mais para o caso mobile/dialog
       setUseExportDialog(true); // Para consistência, usar diálogo em ambos por enquanto
    }
  };

  // Funções de filtro e cálculo para o histórico
  const calculateTotalInvestmentsInMonth = (month: Date): number => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    // MODIFICADO: Usar selectedReportIdsForHistoryView
    if (selectedReportIdsForHistoryView.length === 0) return 0;

    let total = 0;
    reports.filter(r => selectedReportIdsForHistoryView.includes(r.id)).forEach(report => {
      total += (report.investments || [])
        .filter(investment => { 
          if (!investment || !investment.date) return false;
          try {
            const investmentDate = parseISODate(investment.date);
            if (isNaN(investmentDate.getTime())) return false; 
            return isWithinInterval(investmentDate, { start: monthStart, end: monthEnd });
          } catch (e) { console.error("Erro data investimento calc:", investment.date, e); return false; }
        })
        .reduce((subTotal: number, investment: Investment) => {
          if (investment && typeof investment.amount === 'number' && investment.unit) {
            const btcValue = convertToBtc(investment.amount, investment.unit);
            return subTotal + (isNaN(btcValue) ? 0 : btcValue); 
          }
          return subTotal;
        }, 0);
    });
    return total;
  };

  const calculateTotalProfitsInMonth = (month: Date): number => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    // MODIFICADO: Usar selectedReportIdsForHistoryView
    if (selectedReportIdsForHistoryView.length === 0) return 0;
    
    let total = 0;
    reports.filter(r => selectedReportIdsForHistoryView.includes(r.id)).forEach(report => {
      total += (report.profits || [])
        .filter(profit => { 
          if (!profit || !profit.date) return false;
          try {
            const profitDate = parseISODate(profit.date);
            if (isNaN(profitDate.getTime())) return false; 
            return isWithinInterval(profitDate, { start: monthStart, end: monthEnd });
          } catch (e) { console.error("Erro data lucro calc:", profit.date, e); return false; }
        })
        .reduce((subTotal: number, profit: ProfitRecord) => {
          if (profit && typeof profit.amount === 'number' && profit.unit) {
            const btcAmount = convertToBtc(profit.amount, profit.unit);
            if (isNaN(btcAmount)) return subTotal;
            return profit.isProfit ? subTotal + btcAmount : subTotal - btcAmount;
          }
          return subTotal;
        }, 0);
    });
    return total;
  };

  const getFilteredInvestments = (): (Investment & { reportName?: string, reportColor?: string })[] => {
    // MODIFICADO: Usar selectedReportIdsForHistoryView
    if (selectedReportIdsForHistoryView.length === 0) return [];

    let allInvestments: (Investment & { reportName?: string, reportColor?: string })[] = [];
    reports.filter(r => selectedReportIdsForHistoryView.includes(r.id)).forEach(report => {
      (report.investments || []).forEach(inv => {
        allInvestments.push({ ...inv, reportName: report.name, reportColor: report.color });
      });
    });

    if (!showFilterOptions) return allInvestments;

    if (historyFilterType === 'month') {
      const monthStart = startOfMonth(filterMonth);
      const monthEnd = endOfMonth(filterMonth);
      return allInvestments.filter(investment => {
        try {
          const investmentDate = parseISODate(investment.date);
          if (isNaN(investmentDate.getTime())) return false;
          return isWithinInterval(investmentDate, { start: monthStart, end: monthEnd });
        } catch (e) { console.error("Erro data inv filtro mensal:", investment.date, e); return false; }
      });
    } else if (historyFilterType === 'custom' && customStartDate && customEndDate) {
      const startDate = startOfDay(customStartDate); // startOfDay importado de date-fns
      const endDate = endOfDay(customEndDate);     // endOfDay importado de date-fns
      if (isBefore(endDate, startDate)) { // Validação simples
        // console.warn("Data final anterior à data inicial no filtro personalizado.");
        return []; // Ou mostrar um aviso
      }
      return allInvestments.filter(investment => {
        try {
          const investmentDate = parseISODate(investment.date);
          if (isNaN(investmentDate.getTime())) return false;
          return isWithinInterval(investmentDate, { start: startDate, end: endDate });
        } catch (e) { console.error("Erro data inv filtro custom:", investment.date, e); return false; }
      });
    } else if (historyFilterType === 'custom') {
      // Se o filtro é customizado mas as datas não estão completas, retorna vazio para evitar confusão.
      // Poderia também retornar baseInvestments se a intenção for mostrar tudo até que o filtro esteja pronto.
      return []; 
    }
    return allInvestments; // Fallback se nenhum filtro específico se aplicar
  };

  const getFilteredProfits = (): (ProfitRecord & { reportName?: string, reportColor?: string })[] => {
    // MODIFICADO: Usar selectedReportIdsForHistoryView
    if (selectedReportIdsForHistoryView.length === 0) return [];

    let allProfits: (ProfitRecord & { reportName?: string, reportColor?: string })[] = [];
    reports.filter(r => selectedReportIdsForHistoryView.includes(r.id)).forEach(report => {
      (report.profits || []).forEach(prof => {
        allProfits.push({ ...prof, reportName: report.name, reportColor: report.color });
      });
    });
    
    if (!showFilterOptions) return allProfits;

    if (historyFilterType === 'month') {
      const monthStart = startOfMonth(filterMonth);
      const monthEnd = endOfMonth(filterMonth);
      return allProfits.filter(profit => {
        try {
          const profitDate = parseISODate(profit.date);
          if (isNaN(profitDate.getTime())) return false;
          return isWithinInterval(profitDate, { start: monthStart, end: monthEnd });
        } catch (e) { console.error("Erro data lucro filtro mensal:", profit.date, e); return false; }
      });
    } else if (historyFilterType === 'custom' && customStartDate && customEndDate) {
      const startDate = startOfDay(customStartDate);
      const endDate = endOfDay(customEndDate);
      if (isBefore(endDate, startDate)) {
        // console.warn("Data final anterior à data inicial no filtro personalizado.");
        return [];
      }
      return allProfits.filter(profit => {
        try {
          const profitDate = parseISODate(profit.date);
          if (isNaN(profitDate.getTime())) return false;
          return isWithinInterval(profitDate, { start: startDate, end: endDate });
        } catch (e) { console.error("Erro data lucro filtro custom:", profit.date, e); return false; }
      });
    } else if (historyFilterType === 'custom') {
      return [];
    }
    return allProfits;
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
            <span className="font-medium">Exportar dados do mês selecionado</span>
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

  // Função auxiliar para parse de CSV com suporte a campos entre aspas
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let currentValue = '';
    let insideQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (insideQuotes && i + 1 < line.length && line[i + 1] === '"') {
          // Aspas escapadas dentro de aspas (duplas aspas)
          currentValue += '"';
          i++; // Pular o próximo caractere
        } else {
          // Alternar estado das aspas
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        // Fim do valor atual
        result.push(currentValue);
        currentValue = '';
      } else {
        // Caractere comum, adicionar ao valor atual
        currentValue += char;
      }
    }
    
    // Adicionar o último valor
    result.push(currentValue);
    
    return result;
  };

  // Função auxiliar para parse de CSV com suporte a campos entre aspas
  const parseCSV = (text: string): Array<Record<string, string>> => {
    // Dividir por linhas (respeitando diferentes sistemas operacionais)
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    
    if (lines.length === 0) return [];
    
    // Primeira linha contém os cabeçalhos
    const headers = parseCSVLine(lines[0]);
    
    // Processar as demais linhas
    const records: Array<Record<string, string>> = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = parseCSVLine(line);
      
      // Verificar se temos o número correto de valores
      if (values.length !== headers.length) {
        console.warn(`Linha ${i+1}: número incorreto de valores (${values.length}) comparado com cabeçalhos (${headers.length})`);
        continue; // Pular linha com número incorreto de valores
      }
      
      // Criar objeto de registro
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        record[header] = values[index];
      });
      
      records.push(record);
    }
    
    return records;
  };

  // Função para importar dados CSV
  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    // ADICIONADO: Verificar se um relatório está ativo
    if (!activeReportId) {
      toast({
        title: "Importação CSV Falhou",
        description: "Nenhum relatório ativo. Por favor, selecione ou crie um relatório antes de importar.",
        variant: "destructive",
      });
      if (csvFileInputRef.current) csvFileInputRef.current.value = '';
      return;
    }

    // ADICIONADO: Obter o relatório ativo atual para passar seus lucros
    const currentActiveReportForCsv = reports.find(r => r.id === activeReportId);
    if (!currentActiveReportForCsv) {
      toast({ title: "Erro na Importação", description: "Não foi possível encontrar o relatório ativo.", variant: "destructive" });
      if (csvFileInputRef.current) csvFileInputRef.current.value = '';
      return;
    }

    const file = event.target.files[0];
    setIsImporting(true);
    setImportStats(null);
    setImportType("csv");

    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          if (!e.target || !e.target.result) {
            throw new Error("Falha ao ler o arquivo CSV");
          }
          
          const csvText = e.target.result as string;
          
          // Usar o parser CSV robusto
          const records = parseCSV(csvText);
          
          if (records.length === 0) {
            throw new Error("O arquivo CSV não contém dados válidos");
          }
          
          // Extrair cabeçalhos do primeiro registro
          const headers = Object.keys(records[0]);
          
          const totalRows = records.length;
          
          console.log("CSV processado:", records[0]); // Debug
          
          // Processar registros usando a função comum modificada
          // MODIFICADO: Passar currentActiveReportForCsv.profits
          const { newProfits, successCount, errorCount, duplicatedCount } = 
            processTradeRecords(headers, records, currentActiveReportForCsv.profits);
          
          // Adicionar os novos registros de lucro
          if (newProfits.length > 0) {
            // MODIFICADO: Adicionar lucros ao activeReport
            setReports(prevReports => prevReports.map(r => 
              r.id === activeReportId
                ? { ...r, profits: [...r.profits, ...newProfits] }
                : r
            ));
            
            if (!toastDebounce) {
              setToastDebounce(true);
              toast({
                title: "Importação CSV concluída",
                description: `Foram importados ${successCount} registros de lucro/perda com sucesso.`,
                variant: "success",
              });
              setTimeout(() => setToastDebounce(false), 500);
            }
          } else if (duplicatedCount > 0) {
            // Não mostrar toast quando só houve duplicações
            setDuplicateInfo({
              count: duplicatedCount,
              type: 'lucros/perdas'
            });
            setShowDuplicateDialog(true);
          } else {
            toast({
              title: "Nenhum registro importado",
              description: "Não foi possível encontrar registros válidos no arquivo CSV.",
              variant: "destructive",
            });
          }
          
          // Atualizar estatísticas
          setImportStats({
            total: totalRows,
            success: successCount,
            error: errorCount,
            duplicated: duplicatedCount
          });
          
          // Mostrar diálogo de duplicações apenas se houver duplicações
          if (duplicatedCount > 0) {
            setDuplicateInfo({
              count: duplicatedCount,
              type: 'lucros/perdas'
            });
            setShowDuplicateDialog(true);
          }
          
        } catch (error) {
          console.error("Erro ao processar o arquivo CSV:", error);
          toast({
            title: "Erro na importação CSV",
            description: error instanceof Error ? error.message : "Falha ao processar o arquivo CSV.",
            variant: "destructive",
          });
        } finally {
          setIsImporting(false);
          setImportType(null);
          if (csvFileInputRef.current) {
            csvFileInputRef.current.value = '';
          }
        }
      };
      
      reader.onerror = () => {
        setIsImporting(false);
        setImportType(null);
        toast({
          title: "Erro na leitura",
          description: "Não foi possível ler o arquivo CSV selecionado.",
          variant: "destructive",
        });
        if (csvFileInputRef.current) {
          csvFileInputRef.current.value = '';
        }
      };
      
      reader.readAsText(file);
      
    } catch (error) {
      setIsImporting(false);
      setImportType(null);
      console.error("Erro ao importar CSV:", error);
      toast({
        title: "Erro na importação CSV",
        description: "Ocorreu um erro ao tentar importar o arquivo CSV.",
        variant: "destructive",
      });
      if (csvFileInputRef.current) {
        csvFileInputRef.current.value = '';
      }
    }
  };

  // Funções para acionar os inputs de arquivo
  const triggerExcelFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const triggerCSVFileInput = () => {
    if (csvFileInputRef.current) {
      csvFileInputRef.current.click();
    }
  };
  
  const triggerInternalFileInput = () => {
    if (internalFileInputRef.current) {
      internalFileInputRef.current.click();
    }
  };
  
  const triggerInvestmentCsvFileInput = () => {
    if (investmentCsvFileInputRef.current) {
      investmentCsvFileInputRef.current.click();
    }
  };

  // Função para processar os registros (comum a Excel e CSV)
  const processTradeRecords = (
    headers: string[], 
    records: Array<Record<string, any>>, 
    existingReportProfits: ProfitRecord[], // MODIFICADO: Adicionado parâmetro
    headerIndexMap?: Record<string, number>
  ): { newProfits: ProfitRecord[], successCount: number, errorCount: number, duplicatedCount: number } => {
    // Lista de cabeçalhos requeridos
    const requiredHeaders = [
      "id", "type", "side", "openingFee", "closingFee", "maintenanceMargin", 
      "quantity", "margin", "leverage", "price", "liquidation", "stoploss", 
      "takeprofit", "exitPrice", "pl", "creationTs", "marketFilledTs", 
      "closedTs", "entryPrice", "entryMargin", "open", "running", 
      "canceled", "closed", "sumFundingFees"
    ];
    
    // Verificar se todos os cabeçalhos requeridos estão presentes
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    
    if (missingHeaders.length > 0) {
      throw new Error(`Cabeçalhos obrigatórios ausentes: ${missingHeaders.join(", ")}`);
    }
    
    // Iniciar processamento dos registros
    const newProfits: ProfitRecord[] = [];
    let successCount = 0;
    let errorCount = 0;
    let duplicatedCount = 0;
    
    // Obter conjunto de IDs existentes para verificar duplicações
    // MODIFICADO: Usar o parâmetro existingReportProfits
    const existingProfitIds = new Set(existingReportProfits.map(profit => profit.originalId || profit.id));
    
    // Processar cada registro
    records.forEach((record, index) => {
      try {
        // Extrair os dados necessários - modo diferente para Excel vs CSV
        let originalId, closedTs, pl, openingFee, closingFee, sumFundingFees, closedValue;
        
        if (headerIndexMap) {
          // Para Excel (usando headerIndexMap)
          const row = record as any; // row do ExcelJS
          originalId = row.getCell(headerIndexMap["id"]).value?.toString();
          closedTs = row.getCell(headerIndexMap["closedTs"]).value;
          pl = parseFloat(row.getCell(headerIndexMap["pl"]).value?.toString() || "0");
          openingFee = parseFloat(row.getCell(headerIndexMap["openingFee"]).value?.toString() || "0");
          closingFee = parseFloat(row.getCell(headerIndexMap["closingFee"]).value?.toString() || "0");
          sumFundingFees = parseFloat(row.getCell(headerIndexMap["sumFundingFees"]).value?.toString() || "0");
          closedValue = row.getCell(headerIndexMap["closed"]).value;
        } else {
          // Para CSV (usando objeto record)
          originalId = record["id"]?.toString();
          closedTs = record["closedTs"];
          
          // Tratar valores nulos ou string "null"
          const plStr = (record["pl"]?.toString() || "0").replace(/^"(.*)"$/, "$1");
          const openingFeeStr = (record["openingFee"]?.toString() || "0").replace(/^"(.*)"$/, "$1");
          const closingFeeStr = (record["closingFee"]?.toString() || "0").replace(/^"(.*)"$/, "$1");
          const sumFundingFeesStr = (record["sumFundingFees"]?.toString() || "0").replace(/^"(.*)"$/, "$1");
          const closedStr = (record["closed"]?.toString() || "false").replace(/^"(.*)"$/, "$1");
          
          pl = plStr === "null" ? 0 : parseFloat(plStr);
          openingFee = openingFeeStr === "null" ? 0 : parseFloat(openingFeeStr);
          closingFee = closingFeeStr === "null" ? 0 : parseFloat(closingFeeStr);
          sumFundingFees = sumFundingFeesStr === "null" ? 0 : parseFloat(sumFundingFeesStr);
          closedValue = closedStr;
        }
        
        // Verificar se o ID original já existe no sistema
        if (originalId && existingProfitIds.has(originalId)) {
          duplicatedCount++;
          return; // Pular este registro, pois já existe
        }
        
        // Verificar se a operação foi fechada
        const isClosed = closedValue === true || closedValue === "true" || closedValue === 1 || closedValue === "1";
        
        // Só processar operações fechadas
        if (!isClosed || !closedTs || closedTs === "null") {
          errorCount++;
          return; // Skip para próximo registro
        }
        
        // Extrair data
        let profitDate: Date;
        
        if (typeof closedTs === 'number') {
          // Se for timestamp em milissegundos
          profitDate = new Date(closedTs);
        } else if (closedTs instanceof Date) {
          profitDate = closedTs;
        } else {
          // Tratar o formato GMT específico
          const tsString = closedTs.toString().replace(/^"(.*)"$/, "$1");
          
          try {
            if (tsString.includes('GMT')) {
              // Formato como "Wed Apr 30 2025 11:42:47 GMT-0300 (Brasilia Standard Time)"
              const dateParts = tsString.split(' ');
              if (dateParts.length >= 5) {
                // Reconstruir a string de data sem a parte do timezone em parênteses
                const cleanDateStr = dateParts.slice(0, 5).join(' ');
                profitDate = new Date(cleanDateStr);
              } else {
                profitDate = new Date(tsString);
              }
            } else {
              // Tentar formato padrão
              profitDate = new Date(tsString);
            }
            
            // Se ainda não for válida, tentar formatos alternativos
            if (isNaN(profitDate.getTime())) {
              console.warn(`Formato de data não reconhecido: ${tsString}, tentando analisar manualmente...`);
              // Tentar um parser manual se necessário
              if (tsString.includes('/')) {
                const [day, month, year] = tsString.split('/').map(Number);
                profitDate = new Date(year, month - 1, day);
              }
            }
          } catch (e) {
            console.error(`Erro ao converter data: ${tsString}`, e);
            profitDate = new Date(); // Usar data atual como fallback
          }
        }
        
        // Verificar se a data é válida
        if (isNaN(profitDate.getTime())) {
          console.error(`Data inválida: ${closedTs}, usando data atual como fallback`);
          profitDate = new Date(); // Usar data atual como fallback
        }
        
        // Os valores já estão em SATS, não precisam de conversão adicional
        // Apenas arredondar para garantir valores inteiros
        const profitSats = Math.round(pl);
        const feesSats = Math.round(openingFee) + Math.round(closingFee) + Math.round(sumFundingFees);
        
        // Calcular valor líquido (lucro - taxas)
        const netProfitSats = profitSats - feesSats;
        
        // Criar registro de lucro/perda
        const newProfit: ProfitRecord = {
          id: Date.now().toString() + index, // ID único local
          originalId: originalId, // Salvar ID original da operação
          date: format(profitDate, "yyyy-MM-dd"),
          amount: Math.abs(netProfitSats), // Valor absoluto
          unit: "SATS", // Em satoshis
          isProfit: netProfitSats >= 0, // Lucro se positivo
        };
        
        newProfits.push(newProfit);
        successCount++;
      } catch (error) {
        console.error(`Erro ao processar registro ${index}:`, error);
        errorCount++;
      }
    });
    
    return { newProfits, successCount, errorCount, duplicatedCount };
  };

  // Componente para as opções de importação
  const ImportOptions = () => {
    const CsvOperacoesButton = (
      <>
        <input type="file" accept=".csv" onChange={handleImportCSV} ref={csvFileInputRef} className="hidden" />
        <Button variant="outline" className="w-full justify-center bg-black/30 border-purple-700/50 hover:bg-purple-900/20" onClick={triggerCSVFileInput} disabled={isImporting}>
          {isImporting && importType === "csv" ? ( <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Importando...</> ) : ( <><FileType className="mr-2 h-4 w-4" />Importar CSV de Operações</> )}
        </Button>
      </>
    );

    const CsvAportesButton = (
      <>
        <input type="file" accept=".csv" onChange={handleImportInvestmentCSV} ref={investmentCsvFileInputRef} className="hidden" />
        <Button variant="outline" className="w-full justify-center bg-black/30 border-purple-700/50 hover:bg-purple-900/20" onClick={triggerInvestmentCsvFileInput} disabled={isImporting}>
          {isImporting && importType === "investment-csv" ? ( <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Importando...</> ) : ( <><FileType className="mr-2 h-4 w-4" />Importar CSV de Aportes</> )}
        </Button>
      </>
    );

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {isMobile ? (
            <>
              {CsvAportesButton}      {/* Aportes primeiro no mobile */}
              {CsvOperacoesButton}    {/* Operações depois no mobile */}
            </>
          ) : (
            <>
              {CsvOperacoesButton}    {/* Ordem normal no desktop */}
              {CsvAportesButton}
            </>
          )}
          
          {/* Input para arquivo de backup (Excel) */}
          <input
            type="file"
            accept=".xlsx"
            onChange={handleImportInternalData}
            ref={internalFileInputRef}
            className="hidden"
          />
          <Button 
            variant="outline"
            className="w-full justify-center bg-black/30 border-purple-700/50 hover:bg-purple-900/20 sm:col-span-2" 
            onClick={triggerInternalFileInput}
            disabled={isImporting}
          >
            {isImporting && importType === "internal" ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Importar Backup (Excel)
              </>
            )}
          </Button>
        </div>
        
        {/* Exibir estatísticas de importação para CSV de operações */}
        {importStats && importType === "csv" && (
          <div className="mt-3 p-3 text-xs rounded bg-purple-900/20 border border-purple-700/40">
            <div className="flex justify-between mb-1">
              <span>Total processado:</span>
              <span className="font-medium">{importStats.total}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Importados com sucesso:</span>
              <span className="font-medium text-green-500">{importStats.success}</span>
            </div>
            {importStats.duplicated && importStats.duplicated > 0 && (
              <div className="flex justify-between mb-1">
                <span>Registros duplicados ignorados:</span>
                <span className="font-medium text-yellow-500">{importStats.duplicated}</span>
              </div>
            )}
            {importStats.error > 0 && (
              <div className="flex justify-between">
                <span>Falhas:</span>
                <span className="font-medium text-red-500">{importStats.error}</span>
              </div>
            )}
          </div>
        )}
        
        {/* Exibir estatísticas de importação para CSV de aportes */}
        {importStats && importType === "investment-csv" && (
          <div className="mt-3 p-3 text-xs rounded bg-purple-900/20 border border-purple-700/40">
            <div className="flex justify-between mb-1">
              <span>Total processado:</span>
              <span className="font-medium">{importStats.total}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Importados com sucesso:</span>
              <span className="font-medium text-green-500">{importStats.success}</span>
            </div>
            {importStats.duplicated && importStats.duplicated > 0 && (
              <div className="flex justify-between mb-1">
                <span>Registros duplicados ignorados:</span>
                <span className="font-medium text-yellow-500">{importStats.duplicated}</span>
              </div>
            )}
            {importStats.error > 0 && (
              <div className="flex justify-between">
                <span>Falhas:</span>
                <span className="font-medium text-red-500">{importStats.error}</span>
              </div>
            )}
          </div>
        )}
        
        {/* Exibir estatísticas de importação para arquivo de backup */}
        {importStats && importType === "internal" && (
          <div className="mt-3 p-3 text-xs rounded bg-purple-900/20 border border-purple-700/40">
            <div className="flex justify-between mb-1">
              <span>Total processado:</span>
              <span className="font-medium">{importStats.total}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Importados com sucesso:</span>
              <span className="font-medium text-green-500">{importStats.success}</span>
            </div>
            {importStats.duplicated && importStats.duplicated > 0 && (
              <div className="flex justify-between mb-1">
                <span>Registros duplicados ignorados:</span>
                <span className="font-medium text-yellow-500">{importStats.duplicated}</span>
              </div>
            )}
            {importStats.error > 0 && (
              <div className="flex justify-between">
                <span>Falhas:</span>
                <span className="font-medium text-red-500">{importStats.error}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      
      // ADICIONADO: Verificar se um relatório está ativo
      if (!activeReportId) {
        toast({
          title: "Importação Excel Falhou",
          description: "Nenhum relatório ativo. Por favor, selecione ou crie um relatório antes de importar.",
          variant: "destructive",
        });
        if (fileInputRef.current) fileInputRef.current.value = ''; // Assumindo fileInputRef é para Excel aqui
        return;
      }
      
      // ADICIONADO: Obter o relatório ativo atual para passar seus lucros
      const currentActiveReportForExcel = reports.find(r => r.id === activeReportId);
      if (!currentActiveReportForExcel) {
        toast({ title: "Erro na Importação", description: "Não foi possível encontrar o relatório ativo.", variant: "destructive" });
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      
      setIsImporting(true);
      setImportType("excel");
      
      const file = event.target.files[0];
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        if (!e.target) return;
        
        try {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(e.target.result as ArrayBuffer);
          
          // Assumindo que os dados estão na primeira planilha
          const worksheet = workbook.getWorksheet(1);
          
          if (!worksheet) {
            toast({
              title: "Erro ao importar",
              description: "Não foi possível encontrar dados na planilha.",
              variant: "destructive",
            });
            setIsImporting(false);
            event.target.value = '';
            return;
          }
          
          const headers: string[] = [];
          const records: Record<string, any>[] = [];
          
          // Obter os cabeçalhos (primeira linha)
          worksheet.getRow(1).eachCell((cell, colNumber) => {
            headers[colNumber - 1] = cell.value?.toString() || `Coluna${colNumber}`;
          });
          
          // Obter os dados (linhas seguintes)
          let rowCount = 0;
          let successCount = 0;
          let errorCount = 0;
          let duplicatedCount = 0;
          
          worksheet.eachRow((row, rowNumber) => {
            // Pular a linha de cabeçalho
            if (rowNumber === 1) return;
            
            const record: Record<string, any> = {};
            
            row.eachCell((cell, colNumber) => {
              record[headers[colNumber - 1]] = cell.value;
            });
            
            records.push(record);
            rowCount++;
          });
          
          // Processar os registros
          const { newProfits, successCount: sCount, errorCount: eCount, duplicatedCount: dCount } = processTradeRecords(headers, records, currentActiveReportForExcel.profits);
          
          successCount = sCount;
          errorCount = eCount;
          duplicatedCount = dCount;
          
          // Adicionar os novos registros
          if (newProfits.length > 0) {
            // MODIFICADO: Adicionar lucros ao activeReport e remover localStorage antigo
            setReports(prevReports => prevReports.map(r => 
              r.id === activeReportId
                ? { ...r, profits: [...r.profits, ...newProfits] } // newProfits já inclui os existentes do arquivo se processTradeRecords não mudou muito
                : r
            ));
            // localStorage.setItem("bitcoinProfits", JSON.stringify(combinedProfits)); // REMOVIDO
            
            toast({
              title: "Importação concluída",
              description: `${successCount} registros importados com sucesso${
                duplicatedCount > 0 ? `, ${duplicatedCount} duplicados ignorados` : ''
              }${
                errorCount > 0 ? ` e ${errorCount} falhas` : ''
              }.`,
              variant: errorCount > 0 ? "destructive" : "default",
            });
            
            // Se tiver registros duplicados, mostrar diálogo informativo
            if (duplicatedCount > 0) {
              setDuplicateInfo({
                count: duplicatedCount,
                type: 'registros de operações'
              });
              setShowDuplicateDialog(true);
            }
          } else {
            toast({
              title: "Nenhum registro importado",
              description: "Não foi possível extrair registros válidos do arquivo Excel.",
              variant: "destructive",
            });
          }
          
          setImportStats({
            total: rowCount,
            success: successCount,
            error: errorCount,
            duplicated: duplicatedCount
          });
        } catch (error) {
          console.error("Erro ao processar arquivo Excel:", error);
          toast({
            title: "Erro na importação",
            description: "Ocorreu um erro ao processar o arquivo Excel.",
            variant: "destructive",
          });
        } finally {
          setIsImporting(false);
          // Limpar o input para permitir selecionar o mesmo arquivo novamente
          event.target.value = '';
        }
      };
      
      reader.onerror = () => {
        toast({
          title: "Erro na leitura do arquivo",
          description: "Não foi possível ler o arquivo Excel.",
          variant: "destructive",
        });
        setIsImporting(false);
        event.target.value = '';
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("Erro na importação Excel:", error);
      toast({
        title: "Erro na importação",
        description: "Ocorreu um erro ao importar o arquivo Excel.",
        variant: "destructive",
      });
      setIsImporting(false);
      event.target.value = '';
    }
  };

  // Função para importar dados internos de um arquivo Excel gerado pelo sistema
  const handleImportInternalData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    
    // ADICIONADO: Verificar se um relatório está ativo
    if (!activeReportId) {
      toast({
        title: "Importação Falhou",
        description: "Nenhum relatório ativo. Por favor, selecione ou crie um relatório antes de importar o backup.",
        variant: "destructive",
      });
      if (internalFileInputRef.current) internalFileInputRef.current.value = '';
      return;
    }
    
    const file = event.target.files[0];
    setIsImporting(true);
    setImportStats(null);
    setImportType("internal");
    
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          if (!e.target || !e.target.result) {
            throw new Error("Falha ao ler o arquivo");
          }
          
          const buffer = e.target.result;
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer as ArrayBuffer);
          
          // Buscar a planilha de registros
          const recordsSheet = workbook.getWorksheet('Registros_Importação');
          
          if (!recordsSheet) {
            throw new Error("Este arquivo Excel não contém a planilha de registros para importação");
          }
          
          // Verificar o formato
          let isValidFormat = false;
          let rowWithVersion = recordsSheet.getRow(recordsSheet.rowCount);
          
          // Verificar as últimas 3 linhas para encontrar a versão do formato
          for (let i = 0; i < 3; i++) {
            const row = recordsSheet.getRow(recordsSheet.rowCount - i);
            if (row.getCell(1).value === 'META' && row.getCell(2).value === 'FORMAT_VERSION') {
              isValidFormat = true;
              break;
            }
          }
          
          if (!isValidFormat) {
            throw new Error("Formato de arquivo inválido. Este arquivo não contém dados válidos para importação");
          }
          
          // Processar os registros
          const newInvestments: Investment[] = [];
          const newProfits: ProfitRecord[] = [];
          let totalCount = 0;
          let investmentCount = 0;
          let profitCount = 0;
          let errorCount = 0;
          let duplicatedCount = 0;
          
          // Obter conjunto de IDs existentes para verificar duplicações
          // MODIFICADO: Usar activeReport para pegar IDs existentes
          const currentActiveReport = reports.find(r => r.id === activeReportId);
          if (!currentActiveReport) { // Segurança adicional, embora já verificado activeReportId
            throw new Error("Relatório ativo não encontrado durante a importação.");
          }

          const existingInvestmentIds = new Set(
            currentActiveReport.investments
              .map(inv => inv.originalId || inv.id)
          );
          
          const existingProfitIds = new Set(
            currentActiveReport.profits
              .map(p => p.originalId || p.id)
          );
          
          // Começar da linha 2 (após o cabeçalho)
          for (let i = 2; i <= recordsSheet.rowCount; i++) {
            const row = recordsSheet.getRow(i);
            const type = row.getCell(1).value?.toString();
            
            // Pular metadados
            if (type === 'META') continue;
            
            try {
              if (type === 'INVESTMENT') {
                const id = row.getCell(2).value?.toString() || Date.now().toString();
                const originalId = row.getCell(3).value?.toString() || id;
                const date = row.getCell(4).value?.toString() || format(new Date(), "yyyy-MM-dd");
                const amount = Number(row.getCell(5).value) || 0;
                const unit = (row.getCell(6).value?.toString() as CurrencyUnit) || "SATS";
                
                if (amount > 0) {
                  // Verificar se o ID já existe para evitar duplicatas
                  if (existingInvestmentIds.has(id) || existingInvestmentIds.has(originalId)) {
                    duplicatedCount++;
                    continue;
                  }
                  
                  const investment: Investment = {
                    id,
                    originalId,
                    date,
                    amount,
                    unit
                  };
                  
                  newInvestments.push(investment);
                  investmentCount++;
                }
                
                totalCount++;
              } else if (type === 'PROFIT') {
                const id = row.getCell(2).value?.toString() || Date.now().toString();
                const originalId = row.getCell(3).value?.toString() || id;
                const date = row.getCell(4).value?.toString() || format(new Date(), "yyyy-MM-dd");
                const amount = Number(row.getCell(5).value) || 0;
                const unit = (row.getCell(6).value?.toString() as CurrencyUnit) || "SATS";
                const isProfitValue = row.getCell(7).value?.toString();
                const isProfit = isProfitValue === 'TRUE';
                
                if (amount > 0) {
                  // Verificar se o ID já existe para evitar duplicatas
                  if (existingProfitIds.has(id) || existingProfitIds.has(originalId)) {
                    duplicatedCount++;
                    continue;
                  }
                  
                  const profit: ProfitRecord = {
                    id,
                    originalId,
                    date,
                    amount,
                    unit,
                    isProfit
                  };
                  
                  newProfits.push(profit);
                  profitCount++;
                }
                
                totalCount++;
              }
            } catch (error) {
              console.error(`Erro ao processar linha ${i}:`, error);
              errorCount++;
            }
          }
          
          // Atualizar estatísticas
          setImportStats({
            total: totalCount,
            success: investmentCount + profitCount,
            error: errorCount,
            duplicated: duplicatedCount
          });
          
          // Adicionar os novos registros ou mostrar diálogo de duplicados
          if (newInvestments.length > 0 || newProfits.length > 0) {
            // MODIFICADO: Atualizar investments e profits do activeReport via setReports
            setReports(prevReports => prevReports.map(r => {
              if (r.id === activeReportId) {
                return {
                  ...r,
                  investments: [...r.investments, ...newInvestments],
                  profits: [...r.profits, ...newProfits]
                };
              }
              return r;
            }));
            
            toast({
              title: "Importação concluída",
              description: `Foram importados ${investmentCount} aportes e ${profitCount} registros de lucro/perda com sucesso.`,
              variant: "success",
            });
          } else if (duplicatedCount > 0) {
            // Mostrar diálogo de duplicações em vez de toast
            setDuplicateInfo({
              count: duplicatedCount,
              type: 'registros'
            });
            setShowDuplicateDialog(true);
          } else {
            toast({
              title: "Nenhum registro importado",
              description: "Não foram encontrados novos registros para importar.",
              variant: "destructive",
            });
          }
          
        } catch (error) {
          console.error("Erro ao processar arquivo para importação interna:", error);
          toast({
            title: "Erro na importação",
            description: error instanceof Error ? error.message : "Falha ao processar o arquivo Excel.",
            variant: "destructive",
          });
        } finally {
          setIsImporting(false);
          setImportType(null);
          if (event.target) {
            event.target.value = '';
          }
        }
      };
      
      reader.onerror = () => {
        setIsImporting(false);
        setImportType(null);
        toast({
          title: "Erro na leitura",
          description: "Não foi possível ler o arquivo Excel selecionado.",
          variant: "destructive",
        });
        if (event.target) {
          event.target.value = '';
        }
      };
      
      reader.readAsArrayBuffer(file);
      
    } catch (error) {
      setIsImporting(false);
      setImportType(null);
      console.error("Erro na importação interna:", error);
      toast({
        title: "Erro na importação",
        description: "Ocorreu um erro ao tentar processar o arquivo Excel.",
        variant: "destructive",
      });
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // Função para importar aportes via CSV
  const handleImportInvestmentCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    // ADICIONADO: Verificar relatório ativo
    if (!activeReportId) {
      toast({
        title: "Importação de Aportes Falhou",
        description: "Nenhum relatório ativo. Selecione ou crie um relatório.",
        variant: "destructive",
      });
      if (investmentCsvFileInputRef.current) investmentCsvFileInputRef.current.value = '';
      return;
    }

    const currentActiveReportForInvestCsv = reports.find(r => r.id === activeReportId);
    if (!currentActiveReportForInvestCsv) {
      toast({ title: "Erro na Importação", description: "Relatório ativo não encontrado.", variant: "destructive" });
      if (investmentCsvFileInputRef.current) investmentCsvFileInputRef.current.value = '';
      return;
    }

    const file = event.target.files[0];
    setIsImporting(true);
    setImportStats(null);
    setImportType("investment-csv");

    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          if (!e.target || !e.target.result) {
            throw new Error("Falha ao ler o arquivo CSV");
          }
          
          const csvText = e.target.result as string;
          
          // Usar o parser CSV robusto
          const records = parseCSV(csvText);
          
          if (records.length === 0) {
            throw new Error("O arquivo CSV não contém dados válidos");
          }
          
          // Verificar cabeçalhos necessários
          const requiredHeaders = ["id", "ts", "amount", "transactionIdOrHash", "comment", "success", "type"];
          const headers = Object.keys(records[0]);
          
          const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
          if (missingHeaders.length > 0) {
            throw new Error(`Cabeçalhos obrigatórios ausentes: ${missingHeaders.join(", ")}`);
          }
          
          const totalRecords = records.length;
          let importedCount = 0;
          let errorCount = 0;
          let duplicatedCount = 0;
          const newInvestments: Investment[] = [];
          
          // Obter conjunto de IDs existentes para verificar duplicações
          // MODIFICADO: Usar currentActiveReportForInvestCsv.investments
          const existingIds = new Set(currentActiveReportForInvestCsv.investments.map(inv => inv.originalId || inv.id));
          
          // Processar cada registro
          records.forEach((record, index) => {
            try {
              // Verificar se o aporte foi bem-sucedido
              const successValue = String(record.success).toLowerCase();
              const isSuccess = successValue === "true" || successValue === "1";
              
              if (!isSuccess) {
                // Ignorar registros não bem-sucedidos
                return;
              }
              
              // Processar o timestamp
              let investmentDate: Date;
              
              // Tentar interpretar o timestamp como número (milissegundos)
              const tsNum = Number(record.ts);
              if (!isNaN(tsNum)) {
                investmentDate = new Date(tsNum);
              } else {
                // Tentar interpretar como string de data
                investmentDate = new Date(record.ts);
              }
              
              // Verificar se a data é válida
              if (isNaN(investmentDate.getTime())) {
                throw new Error(`Data inválida: ${record.ts}`);
              }
              
              // Processar o valor
              const amount = parseFloat(record.amount.toString());
              if (isNaN(amount) || amount <= 0) {
                throw new Error(`Valor inválido: ${record.amount}`);
              }
              
              // Definir a unidade sempre como SATS
              const unit: CurrencyUnit = "SATS";
              
              // Verificar se este registro já existe (usando o ID original)
              const originalId = record.id.toString();
              if (existingIds.has(originalId)) {
                duplicatedCount++;
                return;
              }
              
              // Criar novo investimento
              const newInvestment: Investment = {
                id: Date.now().toString() + index, // Usar ID único
                originalId: originalId, // Preservar ID original para evitar duplicações futuras
                date: format(investmentDate, "yyyy-MM-dd"),
                amount: amount,
                unit: unit
              };
              
              // Adicionar ao array de novos investimentos
              newInvestments.push(newInvestment);
              importedCount++;
              
            } catch (error) {
              console.error(`Erro ao processar linha ${index + 1}:`, error);
              errorCount++;
            }
          });
          
          // Atualizar estatísticas
          setImportStats({
            total: totalRecords,
            success: importedCount,
            error: errorCount,
            duplicated: duplicatedCount
          });
          
          // Adicionar os novos investimentos ou mostrar diálogo de duplicados
          if (newInvestments.length > 0) {
            // MODIFICADO: Usar setReports para adicionar ao relatório ativo
            setReports(prevReports => prevReports.map(r => 
              r.id === activeReportId
                ? { ...r, investments: [...r.investments, ...newInvestments] }
                : r
            ));
            
            toast({
              title: "Importação de aportes concluída",
              description: `Foram importados ${importedCount} aportes com sucesso.`,
              variant: "success",
            });
          } else if (duplicatedCount > 0) {
            // Mostrar diálogo de duplicações em vez de toast
            setDuplicateInfo({
              count: duplicatedCount,
              type: 'aportes'
            });
            setShowDuplicateDialog(true);
          } else {
            toast({
              title: "Nenhum aporte importado",
              description: "Não foram encontrados registros de aportes válidos no arquivo CSV.",
              variant: "destructive",
            });
          }
          
        } catch (error) {
          console.error("Erro ao processar o arquivo CSV de aportes:", error);
          toast({
            title: "Erro na importação",
            description: error instanceof Error ? error.message : "Falha ao processar o arquivo CSV.",
            variant: "destructive",
          });
        } finally {
          setIsImporting(false);
          setImportType(null);
          if (event.target && event.target.files) {
            event.target.value = '';
          }
        }
      };
      
      reader.onerror = () => {
        setIsImporting(false);
        setImportType(null);
        toast({
          title: "Erro na leitura",
          description: "Não foi possível ler o arquivo CSV selecionado.",
          variant: "destructive",
        });
        if (event.target) {
          event.target.value = '';
        }
      };
      
      reader.readAsText(file);
      
    } catch (error) {
      setIsImporting(false);
      setImportType(null);
      console.error("Erro ao importar CSV de aportes:", error);
      toast({
        title: "Erro na importação",
        description: "Ocorreu um erro ao tentar importar o arquivo CSV.",
        variant: "destructive",
      });
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // Função auxiliar para converter string de data ISO para objeto Date com fuso horário correto
  const parseISODate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    // Criar data UTC com meio-dia para evitar problemas de fuso horário
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  };

  // Função para exibir data formatada a partir de uma string ISO
  const formatDisplayDate = (dateString: string, formatStr: string = "d MMM yyyy"): string => {
    const date = parseISODate(dateString);
    return format(date, formatStr, { locale: ptBR });
  };

  const handleCreateReport = () => {
    if (!reportNameInput.trim()) {
      toast({ title: "Nome inválido", description: "Por favor, insira um nome para o relatório.", variant: "destructive" });
      return;
    }
    const newReport: Report = {
      id: `report-${Date.now()}`,
      name: reportNameInput.trim(),
      investments: [],
      profits: [],
      createdAt: new Date().toISOString(),
      color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`
    };
    setReports(prev => [...prev, newReport]);
    setActiveReportId(newReport.id); // Ativa o relatório recém-criado
    setReportNameInput("");
    setShowCreateReportDialog(false);
    toast({ title: "Relatório Criado", description: `"${newReport.name}" foi criado e ativado.`, variant: "success" });
  };

  const handleHistoryReportSelection = (reportId: string) => {
    setSelectedReportIdsForHistoryView(prev => {
      const isSelected = prev.includes(reportId);
      if (isSelected) {
        // Se estiver desmarcando e for o último selecionado, não permitir (manter pelo menos um)
        // Ou permitir desmarcar todos se essa for a UX desejada (getFiltered... já lida com array vazio)
        // Vamos manter pelo menos um selecionado se houver relatórios.
        if (prev.length === 1 && reports.length > 0) return prev; 
        return prev.filter(id => id !== reportId);
      } else {
        return [...prev, reportId];
      }
    });
  };
  
  const selectAllHistoryReports = () => {
    setSelectedReportIdsForHistoryView(reports.map(r => r.id));
  };

  const clearHistoryReportSelection = () => {
    // Mantém o primeiro relatório selecionado se houver relatórios
    if (reports.length > 0) {
        setSelectedReportIdsForHistoryView([reports[0].id]); 
    } else {
        setSelectedReportIdsForHistoryView([]);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-2 h-auto gap-2 bg-transparent">
          <TabsTrigger
            value="register"
            className={`data-[state=active]:bg-purple-800 data-[state=active]:text-white bg-black/30 border border-purple-700/50 py-2`}
          >
            Registrar
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className={`data-[state=active]:bg-purple-800 data-[state=active]:text-white bg-black/30 border border-purple-700/50 py-2`}
          >
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="register">
          <div className="mb-4 p-3 bg-black/20 border border-purple-700/30 rounded-md">
            <div className="flex justify-between items-center mb-1">
              <Label className="text-sm text-purple-400">Relatório Ativo para Novos Registros:</Label>
              <Button onClick={() => setShowCreateReportDialog(true)} size="sm" variant="link" className="px-0 text-purple-400 hover:text-purple-300 text-xs">
                <Plus className="mr-1 h-3 w-3" /> Criar Novo
              </Button>
            </div>
            {reports.length > 0 ? (
                <Select value={activeReportId || ""} onValueChange={(value) => setActiveReportId(value || null)}>
                    <SelectTrigger className="w-full bg-black/40 border-purple-600/50 focus:border-purple-500 focus:ring-purple-500/50 hover:border-purple-600/70 text-white">
                        <SelectValue placeholder="Selecione um relatório" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/95 border-purple-700/60 text-white">
                        {reports.map(report => (
                            <SelectItem key={report.id} value={report.id} style={{ color: report.color || '#E0E0E0' }}>
                                {report.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : (
                <p className="text-xs text-muted-foreground mt-1">Nenhum relatório. O primeiro registro criará um "Relatório Padrão".</p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Card de Registrar Investimento atualizado com estilo padrão */}
            <Card className="bg-black/30 rounded-lg shadow-xl shadow-purple-900/10 border border-purple-700/40">
              <CardHeader>
                <CardTitle className="text-lg mb-1.5">Registrar Investimento</CardTitle>
                <CardDescription className="text-purple-500/90 dark:text-purple-400/80">Registre seus aportes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="investment-amount">Valor</Label>
                    <Input
                      id="investment-amount"
                      type="number"
                      placeholder="Valor"
                      value={investmentAmount}
                      onChange={(e) => setInvestmentAmount(e.target.value)}
                      className="bg-background/30 dark:bg-black/40 border-purple-700/50 focus:border-purple-500 focus:ring-purple-500/50 hover:border-purple-600/70"
                    />
                  </div>
                  <div>
                    <Label htmlFor="investment-date">Data do Aporte</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left bg-black/30 border-purple-700/50 hover:bg-purple-900/20 hover:border-purple-600/70"
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
                          onSelect={(date) => {
                            if (date) {
                              // Definir a data com horário meio-dia UTC para evitar problemas de fuso
                              const newDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0));
                              setInvestmentDate(newDate);
                            }
                          }}
                          initialFocus
                          className="bg-black/80"
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label className="block mb-2">Unidade</Label>
                    <RadioGroup
                      value={investmentUnit}
                      onValueChange={(value) => setInvestmentUnit(value as CurrencyUnit)}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="BTC" id="unit-btc" />
                        <Label htmlFor="unit-btc">BTC</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="SATS" id="unit-sats" />
                        <Label htmlFor="unit-sats">Satoshis</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <Button onClick={addInvestment} className="bg-purple-800 hover:bg-purple-700 border border-purple-600/80">
                    Adicionar Aporte
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Card de Registrar Lucro/Perda atualizado com estilo padrão */}
            <Card className="bg-black/30 rounded-lg shadow-xl shadow-purple-900/10 border border-purple-700/40">
              <CardHeader>
                <CardTitle className="text-lg mb-1.5">Registrar Lucro/Perda</CardTitle>
                <CardDescription className="text-purple-500/90 dark:text-purple-400/80">Registre seus lucros ou perdas</CardDescription>
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
                      className="bg-background/30 dark:bg-black/40 border-purple-700/50 focus:border-purple-500 focus:ring-purple-500/50 hover:border-purple-600/70"
                    />
                  </div>
                  <div>
                    <Label htmlFor="profit-date">Data do Registro</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left bg-black/30 border-purple-700/50 hover:bg-purple-900/20 hover:border-purple-600/70"
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
                          onSelect={(date) => {
                            if (date) {
                              // Definir a data com horário meio-dia UTC para evitar problemas de fuso
                              const newDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0));
                              setProfitDate(newDate);
                            }
                          }}
                          initialFocus
                          className="bg-black/80"
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  {/* Reorganizando os RadioGroups para ficarem lado a lado */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="block mb-2">Tipo</Label>
                      <RadioGroup
                        value={isProfit ? "profit" : "loss"}
                        onValueChange={(value) => setIsProfit(value === "profit")}
                        className="space-y-2"
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
                    </div>
                    
                    <div>
                      <Label className="block mb-2">Unidade</Label>
                      <RadioGroup
                        value={profitUnit}
                        onValueChange={(value) => setProfitUnit(value as CurrencyUnit)}
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="BTC" id="profit-unit-btc" />
                          <Label htmlFor="profit-unit-btc">BTC</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="SATS" id="profit-unit-sats" />
                          <Label htmlFor="profit-unit-sats">Satoshis</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                  
                  <Button onClick={addProfitRecord} className="bg-purple-800 hover:bg-purple-700 border border-purple-600/80">
                    Adicionar {isProfit ? "Lucro" : "Perda"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Card de Importação atualizado com estilo padrão */}
          <Card className="bg-black/30 rounded-lg shadow-xl shadow-purple-900/10 border border-purple-700/40">
            <CardHeader>
              <CardTitle className="text-lg mb-1.5">Importação de Registros</CardTitle>
              <CardDescription className="text-purple-500/90 dark:text-purple-400/80">Importe operações e aportes de arquivos externos</CardDescription>
            </CardHeader>
            <CardContent>
              <ImportOptions />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {/* Card principal do Histórico atualizado com a borda correta */}
          <Card className="bg-black/30 border border-purple-700/40 shadow-xl shadow-purple-900/10 rounded-lg">
            <CardHeader>
              {/* Estilo do CardTitle atualizado */}
              <CardTitle className="text-lg mb-1.5">Histórico de Registros</CardTitle>
              {/* Nova CardDescription adicionada */}
              <CardDescription className="text-purple-500/90 dark:text-purple-400/80">
                Visualize seus aportes e lucros/perdas registrados por relatório e período.
              </CardDescription>

              {/* SELETOR DE RELATÓRIO PARA HISTÓRICO - MODIFICADO PARA CHECKBOXES */}
              <div className="mt-4 mb-2 space-y-3">
                <div>
                  <Label className="text-sm text-purple-400 block mb-2">Selecionar Relatórios para Visualização no Histórico:</Label>
                  {reports.length > 0 ? (
                    <>
                      <div className="flex space-x-2 mb-2">
                        {/* MODIFICADO: size="sm" e classes para parecer menor */}
                        <Button size="sm" variant="outline" onClick={selectAllHistoryReports} className="bg-black/30 border-purple-700/50 text-xs px-2 py-1 h-7">Selecionar Todos</Button>
                        <Button size="sm" variant="outline" onClick={clearHistoryReportSelection} className="bg-black/30 border-purple-700/50 text-xs px-2 py-1 h-7">Limpar (Manter 1º)</Button>
                      </div>
                      <ScrollArea className="h-[100px] border border-purple-700/30 bg-black/20 p-2 rounded-md">
                        <div className="space-y-1.5">
                        {reports.map(report => (
                          <div key={`hist-sel-${report.id}`} className="flex items-center space-x-2 p-1 hover:bg-purple-900/20 rounded-sm">
                            <Checkbox
                              id={`hist-report-${report.id}`}
                              checked={selectedReportIdsForHistoryView.includes(report.id)}
                              onCheckedChange={() => handleHistoryReportSelection(report.id)}
                              style={{borderColor: report.color || '#A855F7'}}
                            />
                            <Label htmlFor={`hist-report-${report.id}`} className="text-xs font-normal cursor-pointer" style={{color: report.color || '#E0E0E0'}}>
                              {report.name}
                            </Label>
                          </div>
                        ))}
                        </div>
                      </ScrollArea>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">Nenhum relatório criado. Crie um na aba "Registrar".</p>
                  )}
                </div>
              </div>
              
              {/* Aviso sobre exclusão e exportação estarem ligados ao relatório ativo da aba Registrar */}
              {activeReportId && reports.length > 0 && (
                <div className="mt-1 mb-3 p-2 text-xs bg-yellow-900/30 border border-yellow-700/40 text-yellow-300 rounded-md">
                  <HelpCircle className="inline h-3 w-3 mr-1 mb-0.5" /> {/* Usar HelpCircle diretamente */}
                  Lembrete: A exportação e exclusão de dados em massa (botões "Remover todos") afetam apenas o relatório <span className="font-semibold">"{reports.find(r=>r.id === activeReportId)?.name || 'selecionado na aba Registrar'}"</span>.
                </div>
              )}


              <div className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:space-x-2 pt-3">
                {/* Controles de Filtro (Tipo e Datas) */}
                <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 items-start sm:items-center">
                  <Button
                    variant={showFilterOptions ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowFilterOptions(!showFilterOptions)}
                    className={cn(
                      showFilterOptions 
                        ? "bg-purple-800 hover:bg-purple-700 border border-purple-600/80"
                        : "bg-black/30 border-purple-700/50 hover:bg-purple-900/20 hover:border-purple-600/70",
                      "w-full sm:w-auto"
                    )}
                  >
                    <Sliders className="mr-2 h-4 w-4" />
                    {showFilterOptions ? "Ocultar Filtros" : "Mostrar Filtros"}
                  </Button>

                  {showFilterOptions && (
                    <RadioGroup 
                      value={historyFilterType} 
                      onValueChange={(value) => setHistoryFilterType(value as 'month' | 'custom')}
                      className="flex space-x-1 bg-black/30 border border-purple-700/50 p-0.5 rounded-md text-xs"
                    >
                      <RadioGroupItem value="month" id="filter-month-type" className="sr-only" />
                      <Label 
                        htmlFor="filter-month-type" 
                        className={cn(
                          "px-2 py-1 rounded-sm cursor-pointer",
                          historyFilterType === 'month' ? "bg-purple-700 text-white" : "text-gray-400 hover:bg-purple-900/30"
                        )}
                      >
                        Mensal
                      </Label>
                      <RadioGroupItem value="custom" id="filter-custom-type" className="sr-only" />
                      <Label 
                        htmlFor="filter-custom-type" 
                        className={cn(
                          "px-2 py-1 rounded-sm cursor-pointer",
                          historyFilterType === 'custom' ? "bg-purple-700 text-white" : "text-gray-400 hover:bg-purple-900/30"
                        )}
                      >
                        Personalizado
                      </Label>
                    </RadioGroup>
                  )}
                </div>
                
                {/* Botões de Exportar e Moeda (mantidos à direita) */}
                <div className="flex items-center space-x-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleDisplayCurrency}
                    className="bg-black/30 border-purple-700/50 hover:bg-purple-900/20 hover:border-purple-600/70"
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
                      className="bg-black/30 border-purple-700/50 hover:bg-purple-900/20 hover:border-purple-600/70"
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
                          className="bg-black/30 border-purple-700/50 hover:bg-purple-900/20 hover:border-purple-600/70"
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
                <div className="px-0 pt-4 pb-2 border-t border-purple-700/20 mt-3">
                  {historyFilterType === 'month' && (
                    <div className="flex items-center space-x-2">
                      <Label className="text-sm">Mês:</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-auto justify-start text-left font-normal bg-black/30 border-purple-700/50 hover:bg-purple-900/20 hover:border-purple-600/70"
                          >
                            <span>{format(filterMonth, "MMMM yyyy", { locale: ptBR })}</span>
                            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-black/90 border-purple-800/60" align="start">
                          <div className="p-2 bg-purple-900/30 text-xs text-center text-gray-300 border-b border-purple-700/50">
                            Selecione o mês para filtrar
                          </div>
                          <div className="p-3">
                            <div className="flex items-center justify-between mb-3">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-7 w-7 bg-black/30 border-purple-700/30"
                                onClick={() => setFilterMonth(subMonths(filterMonth, 1))}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <div className="font-medium text-center">
                                {format(filterMonth, "MMMM yyyy", { locale: ptBR })}
                              </div>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-7 w-7 bg-black/30 border-purple-700/30"
                                onClick={() => {
                                  const nextMonth = addMonths(filterMonth, 1);
                                  if (isBefore(nextMonth, addMonths(new Date(), 1))) {
                                    setFilterMonth(nextMonth);
                                  }
                                }}
                                disabled={!isBefore(addMonths(filterMonth, 1), addMonths(new Date(), 1))}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                  {historyFilterType === 'custom' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="custom-start-date" className="text-sm">Data de Início:</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              id="custom-start-date"
                              className="w-full justify-start text-left font-normal bg-black/30 border-purple-700/50 hover:bg-purple-900/20 hover:border-purple-600/70"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {customStartDate ? format(customStartDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-black/90 border-purple-800/60" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={customStartDate || undefined}
                              onSelect={(date) => setCustomStartDate(date || null)}
                              disabled={(date) => customEndDate ? date > customEndDate || date > new Date() : date > new Date()}
                              initialFocus
                              className="bg-black/80"
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label htmlFor="custom-end-date" className="text-sm">Data de Fim:</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              id="custom-end-date"
                              className="w-full justify-start text-left font-normal bg-black/30 border-purple-700/50 hover:bg-purple-900/20 hover:border-purple-600/70"
                              disabled={!customStartDate}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {customEndDate ? format(customEndDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-black/90 border-purple-800/60" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={customEndDate || undefined}
                              onSelect={(date) => setCustomEndDate(date || null)}
                              disabled={(date) => customStartDate ? date < customStartDate || date > new Date() : date > new Date()}
                              initialFocus
                              className="bg-black/80"
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Resumo dos dados filtrados */}
              {showFilterOptions && selectedReportIdsForHistoryView.length > 0 && ( // MODIFICADO: verificar selectedReportIdsForHistoryView
                <div className="px-6 pb-2">
                  {(() => {
                    // Cálculos para o resumo com base nos filtros atuais
                    const filteredInvestmentsForSummary = getFilteredInvestments();
                    const totalInvestmentsBtcForPeriod = filteredInvestmentsForSummary.reduce((sum, inv) => sum + convertToBtc(inv.amount, inv.unit), 0);
                    
                    const filteredProfitsForSummary = getFilteredProfits();
                    const totalNetProfitsBtcForPeriod = filteredProfitsForSummary.reduce((sum, prof) => {
                      const btcAmount = convertToBtc(prof.amount, prof.unit);
                      if (isNaN(btcAmount)) return sum;
                      return prof.isProfit ? sum + btcAmount : sum - btcAmount;
                    }, 0);

                    const rendementForPeriod = totalInvestmentsBtcForPeriod > 0 
                      ? (totalNetProfitsBtcForPeriod / totalInvestmentsBtcForPeriod) * 100 
                      : 0;

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div className="bg-black/30 p-3 rounded-md border border-purple-700/50">
                          <div className="text-xs text-gray-400">Período Selecionado</div>
                          <div className="text-lg font-semibold text-white">
                            {historyFilterType === 'month' 
                              ? format(filterMonth, "MMMM yyyy", { locale: ptBR }) 
                              : customStartDate && customEndDate 
                                ? `${format(customStartDate, "dd/MM/yy")} - ${format(customEndDate, "dd/MM/yy")}`
                                : "Nenhum filtro aplicado"
                            }
                          </div>
                        </div>

                        <div className="bg-black/30 p-3 rounded-md border border-purple-700/50">
                          <div className="text-xs text-gray-400">Aporte total no período</div>
                          <div className="text-lg font-semibold text-blue-400">
                            {formatCryptoAmount(totalInvestmentsBtcForPeriod, "BTC")}
                          </div>
                          <div className="text-xs text-gray-400">
                            {formatBtcValueInCurrency(totalInvestmentsBtcForPeriod)}
                          </div>
                        </div>

                        <div className="bg-black/30 p-3 rounded-md border border-purple-700/50">
                          <div className="text-xs text-gray-400">Lucro/Perda no período</div>
                          <div className={`text-lg font-semibold ${totalNetProfitsBtcForPeriod >= 0 ? "text-green-500" : "text-red-500"}`}>
                            {totalNetProfitsBtcForPeriod >= 0 ? "+" : ""}
                            {formatCryptoAmount(totalNetProfitsBtcForPeriod, "BTC")}
                          </div>
                          <div className="text-xs text-gray-400">
                            {totalNetProfitsBtcForPeriod >= 0 ? "+" : ""}
                            {formatBtcValueInCurrency(totalNetProfitsBtcForPeriod)}
                          </div>
                        </div>

                        <div className="bg-black/30 p-3 rounded-md border border-purple-700/50">
                          <div className="text-xs text-gray-400">Rendimento no período</div>
                          <div className={`text-lg font-semibold ${rendementForPeriod >= 0 ? "text-green-500" : "text-red-500"}`}>
                            {totalInvestmentsBtcForPeriod > 0 || totalNetProfitsBtcForPeriod !== 0 ? 
                              `${rendementForPeriod.toFixed(2)}%` : 
                              "N/A"}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              
              {getFilteredInvestments().length === 0 && getFilteredProfits().length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {selectedReportIdsForHistoryView.length === 0 ? "Selecione um ou mais relatórios para visualizar." :
                    showFilterOptions ? 
                    `Nenhum registro encontrado para ${format(filterMonth, "MMMM 'de' yyyy", { locale: ptBR })} nos relatórios selecionados.` : 
                    "Nenhum registro encontrado nos relatórios selecionados. Adicione investimentos ou lucros na aba 'Registrar'."}
                </p>
              ) : (
                <div className="space-y-6">
                  {getFilteredInvestments().length > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold text-blue-400">Investimentos</h3>
                        {!showFilterOptions && activeReportId && ( // Botão de exclusão ainda ligado ao activeReportId
                          <Button 
                            variant="destructive" 
                            size="sm"
                            className="bg-red-900/70 hover:bg-red-900"
                            onClick={() => setShowDeleteInvestmentsDialog(true)}
                            disabled={!activeReportId} // Desabilitar se nenhum relatório ativo para registro
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remover todos (do relatório "{reports.find(r=>r.id === activeReportId)?.name || ''}")
                          </Button>
                        )}
                      </div>
                      <Table>
                        <TableHeader className="bg-black/40">
                          <TableRow>
                            <TableHead className="w-[20%]">Data</TableHead>
                            {selectedReportIdsForHistoryView.length > 1 && <TableHead className="w-[20%]">Relatório</TableHead>}
                            <TableHead className="w-[25%]">Valor em BTC</TableHead>
                            <TableHead className="w-[25%]">Valor em {displayCurrency}</TableHead>
                            <TableHead className="w-[10%] text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getFilteredInvestments().map((investment) => {
                            const btcValue = convertToBtc(investment.amount, investment.unit);
                            return (
                              <TableRow key={`${investment.reportName}-${investment.id}`} className="hover:bg-purple-900/10 border-b border-purple-900/10">
                                <TableCell>{formatDisplayDate(investment.date, "d MMM yyyy")}</TableCell>
                                {selectedReportIdsForHistoryView.length > 1 && 
                                  <TableCell>
                                    <span className="text-xs px-1.5 py-0.5 rounded-sm whitespace-nowrap" style={{backgroundColor: `${investment.reportColor}33`, color: investment.reportColor}}>
                                      {investment.reportName}
                                    </span>
                                  </TableCell>
                                }
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
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold text-green-500">Lucros/Perdas</h3>
                        {!showFilterOptions && activeReportId && ( // Botão de exclusão ainda ligado ao activeReportId
                          <Button 
                            variant="destructive" 
                            size="sm"
                            className="bg-red-900/70 hover:bg-red-900"
                            onClick={() => setShowDeleteProfitsDialog(true)}
                            disabled={!activeReportId} // Desabilitar se nenhum relatório ativo para registro
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                             Remover todos (do relatório "{reports.find(r=>r.id === activeReportId)?.name || ''}")
                          </Button>
                        )}
                      </div>
                      <Table>
                        <TableHeader className="bg-black/40">
                          <TableRow>
                            <TableHead className="w-[15%]">Data</TableHead>
                            {selectedReportIdsForHistoryView.length > 1 && <TableHead className="w-[15%]">Relatório</TableHead>}
                            <TableHead className="w-[15%]">Tipo</TableHead>
                            <TableHead className="w-[20%]">Valor em BTC</TableHead>
                            <TableHead className="w-[20%]">Valor em {displayCurrency}</TableHead>
                            <TableHead className="w-[15%] text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getFilteredProfits().map((profit) => {
                            const btcValue = convertToBtc(profit.amount, profit.unit);
                            return (
                              <TableRow key={`${profit.reportName}-${profit.id}`} className="hover:bg-purple-900/10 border-b border-purple-900/10">
                                <TableCell>{formatDisplayDate(profit.date, "d MMM yyyy")}</TableCell>
                                {selectedReportIdsForHistoryView.length > 1 && 
                                  <TableCell>
                                     <span className="text-xs px-1.5 py-0.5 rounded-sm whitespace-nowrap" style={{backgroundColor: `${profit.reportColor}33`, color: profit.reportColor}}>
                                      {profit.reportName}
                                    </span>
                                  </TableCell>
                                }
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

      <Dialog open={showCreateReportDialog} onOpenChange={setShowCreateReportDialog}>
        <DialogContent className="bg-black/95 border-purple-800/60 text-white">
          <DialogHeader>
            <DialogTitle>Criar Novo Relatório</DialogTitle>
            <DialogDescription className="text-gray-400">
              Insira um nome para o seu novo relatório.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="report-name" className="text-gray-300">Nome do Relatório</Label>
              <Input 
                id="report-name" 
                value={reportNameInput} 
                onChange={(e) => setReportNameInput(e.target.value)} 
                placeholder="Ex: Minha Estratégia Principal"
                className="bg-black/30 border-purple-700/50 focus:border-purple-500 focus:ring-purple-500/50 hover:border-purple-600/70 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateReportDialog(false)} className="bg-black/30 border-purple-700/50 text-white hover:bg-black/50">Cancelar</Button>
            <Button onClick={handleCreateReport} className="bg-purple-700 hover:bg-purple-600 text-white">Criar Relatório</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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
      
      {/* Dialog para confirmar exclusão de investimentos */}
      <Dialog open={showDeleteInvestmentsDialog} onOpenChange={setShowDeleteInvestmentsDialog}>
        <DialogContent className="bg-black/95 border-purple-800/60">
          <DialogHeader>
            <DialogTitle>Excluir todos os aportes</DialogTitle>
            <DialogDescription>
              Você tem certeza que deseja excluir todos os registros de aporte? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteInvestmentsDialog(false)}
              className="bg-black/30 border-purple-700/50"
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={deleteAllInvestments}
              className="bg-red-900 hover:bg-red-800"
            >
              Excluir todos
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Dialog para confirmar exclusão de lucros/perdas */}
      <Dialog open={showDeleteProfitsDialog} onOpenChange={setShowDeleteProfitsDialog}>
        <DialogContent className="bg-black/95 border-purple-800/60">
          <DialogHeader>
            <DialogTitle>Excluir todos os lucros/perdas</DialogTitle>
            <DialogDescription>
              Você tem certeza que deseja excluir todos os registros de lucro e perda? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteProfitsDialog(false)}
              className="bg-black/30 border-purple-700/50"
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={deleteAllProfits}
              className="bg-red-900 hover:bg-red-800"
            >
              Excluir todos
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo para mostrar informações sobre duplicações */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="bg-black/95 border-purple-800/60">
          <DialogHeader>
            <DialogTitle>Registros duplicados encontrados</DialogTitle>
            <DialogDescription>
              Foram encontrados {duplicateInfo?.count} {duplicateInfo?.type} que já existem no sistema.
              Estes registros foram ignorados para evitar duplicações que poderiam causar imprecisões nos dados.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 p-4 bg-purple-900/20 border border-purple-800/40 rounded-md">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
              <div className="text-sm">
                <p className="mb-2">
                  O sistema compara os identificadores únicos das operações para evitar duplicações durante a importação.
                </p>
                <p className="text-gray-400">
                  Isto garante maior precisão nos seus cálculos de lucro e rendimento.
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <Button 
              onClick={() => setShowDuplicateDialog(false)}
              className="bg-purple-800 hover:bg-purple-700"
            >
              <Check className="mr-2 h-4 w-4" />
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de confirmação para registros potencialmente duplicados */}
      {showConfirmDuplicateDialog && duplicateConfirmInfo && (
        <Dialog 
          open={showConfirmDuplicateDialog} 
          onOpenChange={setShowConfirmDuplicateDialog}
        >
          <DialogContent className="bg-black/95 border-purple-800/60">
            <DialogHeader>
              <DialogTitle>Possível duplicação de registro</DialogTitle>
              <DialogDescription>
                <div className="my-2">
                  Já existe um registro {duplicateConfirmInfo.type === 'investment' ? 'de aporte' : 'de lucro/perda'} com a mesma data e valor:
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 bg-black/40 p-2 rounded border border-purple-700/30">
                  <div className="text-sm font-medium">Data:</div>
                  <div className="text-sm">
                    {(() => {
                      try {
                        // Converter a string de data (YYYY-MM-DD) em objeto Date usando parseISODate
                        const dateObj = parseISODate(duplicateConfirmInfo.date);
                        return format(dateObj, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
                      } catch (e) {
                        return duplicateConfirmInfo.date;
                      }
                    })()}
                  </div>
                  
                  <div className="text-sm font-medium">Valor:</div>
                  <div className="text-sm">{formatCryptoAmount(duplicateConfirmInfo.amount, duplicateConfirmInfo.unit)}</div>
                  
                  {duplicateConfirmInfo.type === 'profit' && (
                    <>
                      <div className="text-sm font-medium">Tipo:</div>
                      <div className="text-sm">{pendingProfit?.isProfit ? 'Lucro' : 'Perda'}</div>
                    </>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-2 p-4 bg-purple-900/20 border border-purple-800/40 rounded-md">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
                <div className="text-sm">
                  <p className="mb-2">
                    Adicionar este registro pode causar uma duplicação nos seus dados, o que pode afetar a precisão dos cálculos de rendimento.
                  </p>
                  <p className="text-gray-400">
                    Você deseja continuar mesmo assim?
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setPendingInvestment(null);
                  setPendingProfit(null);
                  setDuplicateConfirmInfo(null);
                  setShowConfirmDuplicateDialog(false);
                }}
                className="bg-black/30 border-purple-700/50"
              >
                Cancelar
              </Button>
              <Button 
                variant="default"
                onClick={() => {
                  if (duplicateConfirmInfo.type === 'investment' && pendingInvestment) {
                    confirmAddInvestment(pendingInvestment);
                  } else if (duplicateConfirmInfo.type === 'profit' && pendingProfit) {
                    confirmAddProfitRecord(pendingProfit);
                  }
                }}
                className="bg-purple-800 hover:bg-purple-700"
              >
                Adicionar mesmo assim
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export const dynamic = 'force-dynamic';