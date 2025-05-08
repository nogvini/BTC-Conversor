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
  ArrowLeft,
  ArrowRight
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getCurrentBitcoinPrice } from "@/lib/client-api";
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useIsMobile } from "@/hooks/use-mobile";
import { ResponsiveContainer } from "@/components/ui/responsive-container";
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectItem, SelectContent } from "@/components/ui/select";

// Tipos de dados
type CurrencyUnit = "BTC" | "SATS";
type DisplayCurrency = "USD" | "BRL";

// Interface para relatórios
interface Report {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface Investment {
  id: string;
  originalId?: string;
  date: string;
  amount: number;
  unit: CurrencyUnit;
  reportId: string; // ID do relatório ao qual este investimento pertence
}

interface ProfitRecord {
  id: string;
  originalId?: string;
  date: string;
  amount: number;
  unit: CurrencyUnit;
  isProfit: boolean;
  reportId: string; // ID do relatório ao qual este registro pertence
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

export default function ProfitCalculator({ btcToUsd, brlToUsd, appData }: ProfitCalculatorProps) {
  // Estados
  const [reports, setReports] = useState<Report[]>([]);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportName, setReportName] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [profits, setProfits] = useState<ProfitRecord[]>([]);
  const [activeTab, setActiveTab] = useState<string>("register");
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  
  // Novos estados para seleção de período personalizado
  const [dateRangeMode, setDateRangeMode] = useState<"month" | "custom">("month");
  const [dateRange, setDateRange] = useState<{from: Date | undefined; to: Date | undefined}>({
    from: new Date(),
    to: new Date()
  });
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("USD");
  const [currentRates, setCurrentRates] = useState({ btcToUsd, brlToUsd });
  const [loading, setLoading] = useState(false);
  const [usingFallbackRates, setUsingFallbackRates] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Estados do formulário
  const [investmentAmount, setInvestmentAmount] = useState<string>("");
  const [investmentUnit, setInvestmentUnit] = useState<CurrencyUnit>("SATS");
  const [investmentDate, setInvestmentDate] = useState<Date>(() => {
    // Criar data com o horário no meio do dia em UTC
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0));
  });
  const [profitAmount, setProfitAmount] = useState<string>("");
  const [profitUnit, setProfitUnit] = useState<CurrencyUnit>("SATS");
  const [profitDate, setProfitDate] = useState<Date>(() => {
    // Criar data com o horário no meio do dia em UTC
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0));
  });
  const [isProfit, setIsProfit] = useState<boolean>(true);

  // Estados adicionais para filtros
  const [filterMonth, setFilterMonth] = useState<Date>(new Date());
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [useExportDialog, setUseExportDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [importType, setImportType] = useState<"excel" | "csv" | "internal" | "investment-csv" | null>(null);
  
  // Estados para confirmação de exclusão em massa
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
    const savedReports = localStorage.getItem("bitcoinReports");
    const savedActiveReportId = localStorage.getItem("bitcoinActiveReportId");
    const savedSelectedReportIds = localStorage.getItem("bitcoinSelectedReportIds");

    // Carregar relatórios
    if (savedReports) {
      try {
        const parsedReports = JSON.parse(savedReports) as Report[];
        setReports(parsedReports);
        
        // Se não houver relatórios, criar um relatório padrão
        if (parsedReports.length === 0) {
          createDefaultReport();
        }
      } catch (e) {
        console.error("Erro ao analisar relatórios salvos:", e);
        createDefaultReport();
      }
    } else {
      // Se não houver relatórios, criar um relatório padrão
      createDefaultReport();
    }

    // Carregar ID do relatório ativo
    if (savedActiveReportId) {
      try {
        const parsedActiveReportId = JSON.parse(savedActiveReportId) as string;
        setActiveReportId(parsedActiveReportId);
      } catch (e) {
        console.error("Erro ao analisar ID do relatório ativo:", e);
      }
    }

    // Carregar IDs dos relatórios selecionados
    if (savedSelectedReportIds) {
      try {
        const parsedSelectedReportIds = JSON.parse(savedSelectedReportIds) as string[];
        setSelectedReportIds(parsedSelectedReportIds);
      } catch (e) {
        console.error("Erro ao analisar IDs dos relatórios selecionados:", e);
      }
    }

    if (savedInvestments) {
      try {
        const parsedInvestments = JSON.parse(savedInvestments);
        
        // Se a estrutura antiga não tiver reportId, adicionar reportId padrão
        if (parsedInvestments.length > 0 && !parsedInvestments[0].hasOwnProperty('reportId')) {
          const updatedInvestments = parsedInvestments.map((inv: any) => ({
            ...inv,
            reportId: "default"
          }));
          setInvestments(updatedInvestments);
        } else {
          setInvestments(parsedInvestments);
        }
      } catch (e) {
        console.error("Erro ao analisar investimentos salvos:", e);
      }
    }

    if (savedProfits) {
      try {
        const parsedProfits = JSON.parse(savedProfits);
        
        // Se a estrutura antiga não tiver reportId, adicionar reportId padrão
        if (parsedProfits.length > 0 && !parsedProfits[0].hasOwnProperty('reportId')) {
          const updatedProfits = parsedProfits.map((profit: any) => ({
            ...profit,
            reportId: "default"
          }));
          setProfits(updatedProfits);
        } else {
          setProfits(parsedProfits);
        }
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

  // Função para criar relatório padrão
  const createDefaultReport = () => {
    const defaultReport: Report = {
      id: "default",
      name: "Conta Principal",
      description: "Relatório de conta padrão",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setReports([defaultReport]);
    setActiveReportId(defaultReport.id);
    setSelectedReportIds([defaultReport.id]);
    
    // Salvar no localStorage
    localStorage.setItem("bitcoinReports", JSON.stringify([defaultReport]));
    localStorage.setItem("bitcoinActiveReportId", JSON.stringify(defaultReport.id));
    localStorage.setItem("bitcoinSelectedReportIds", JSON.stringify([defaultReport.id]));
  };

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

  useEffect(() => {
    if (isDataLoaded && reports.length > 0) {
      localStorage.setItem("bitcoinReports", JSON.stringify(reports));
    }
  }, [reports, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded && activeReportId) {
      localStorage.setItem("bitcoinActiveReportId", JSON.stringify(activeReportId));
    }
  }, [activeReportId, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
      localStorage.setItem("bitcoinSelectedReportIds", JSON.stringify(selectedReportIds));
    }
  }, [selectedReportIds, isDataLoaded]);

  // Função para adicionar novo relatório
  const addReport = () => {
    if (!reportName.trim()) {
      toast({
        title: "Nome inválido",
        description: "Por favor, insira um nome válido para o relatório.",
        variant: "destructive",
      });
      return;
    }

    const newReport: Report = {
      id: Date.now().toString(),
      name: reportName.trim(),
      description: reportDescription.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setReports(prev => [...prev, newReport]);
    setActiveReportId(newReport.id);
    setSelectedReportIds(prev => [...prev, newReport.id]);
    
    // Limpar campos do formulário
    setReportName("");
    setReportDescription("");
    setShowReportDialog(false);
    
    toast({
      title: "Relatório criado",
      description: `O relatório "${newReport.name}" foi criado com sucesso.`,
      variant: "success",
    });
  };

  // Função para excluir relatório
  const deleteReport = (id: string) => {
    // Não permitir exclusão se for o único relatório
    if (reports.length <= 1) {
      toast({
        title: "Operação não permitida",
        description: "Não é possível excluir o único relatório disponível.",
        variant: "destructive",
      });
      return;
    }

    // Confirmar exclusão
    if (window.confirm(`Tem certeza que deseja excluir este relatório? Todos os dados associados serão perdidos.`)) {
      // Remover o relatório
      const updatedReports = reports.filter(report => report.id !== id);
      setReports(updatedReports);
      
      // Remover investimentos e lucros do relatório
      setInvestments(prev => prev.filter(inv => inv.reportId !== id));
      setProfits(prev => prev.filter(prof => prof.reportId !== id));
      
      // Atualizar relatório ativo se necessário
      if (activeReportId === id) {
        setActiveReportId(updatedReports[0]?.id || null);
      }
      
      // Atualizar relatórios selecionados
      setSelectedReportIds(prev => prev.filter(reportId => reportId !== id));
      
      toast({
        title: "Relatório excluído",
        description: "O relatório foi excluído com sucesso.",
        variant: "default",
      });
    }
  };

  // Função para alterar o relatório ativo
  const changeActiveReport = (id: string) => {
    setActiveReportId(id);
    
    // Limpar estados de formulários
    setInvestmentAmount("");
    setProfitAmount("");
    
    toast({
      title: "Relatório alterado",
      description: `Agora você está registrando na conta: ${reports.find(r => r.id === id)?.name}`,
      variant: "default",
    });
  };

  // Função para alternar entre relatórios selecionados para visualização
  const toggleReportSelection = (id: string) => {
    if (selectedReportIds.includes(id)) {
      // Se já estiver selecionado e não for o único, remover da seleção
      if (selectedReportIds.length > 1) {
        setSelectedReportIds(prev => prev.filter(reportId => reportId !== id));
      } else {
        toast({
          title: "Seleção inválida",
          description: "Pelo menos um relatório deve estar selecionado.",
          variant: "destructive",
        });
      }
    } else {
      // Se não estiver selecionado, adicionar à seleção
      setSelectedReportIds(prev => [...prev, id]);
    }
  };

  // Função para selecionar todos os relatórios
  const selectAllReports = () => {
    setSelectedReportIds(reports.map(report => report.id));
  };

  // Função para obter nome do relatório ativo
  const getActiveReportName = (): string => {
    const report = reports.find(r => r.id === activeReportId);
    return report ? report.name : "Sem relatório selecionado";
  };

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

    // Criar novo investimento usando formatDateToUTC
    const newInvestment: Investment = {
      id: Date.now().toString(),
      date: formatDateToUTC(investmentDate),
      amount: Number(investmentAmount),
      unit: investmentUnit,
      reportId: activeReportId || "", // Usar ID do relatório ativo
    };

    // Verificar possíveis duplicações (mesma data e mesmo valor)
    const possibleDuplicates = investments.filter(inv => 
      inv.date === newInvestment.date && 
      inv.amount === newInvestment.amount && 
      inv.unit === newInvestment.unit
    );

    if (possibleDuplicates.length > 0) {
      // Armazenar o investimento pendente para confirmação
      setPendingInvestment(newInvestment);
      setDuplicateConfirmInfo({
        type: 'investment',
        date: newInvestment.date,
        amount: newInvestment.amount,
        unit: newInvestment.unit
      });
      setShowConfirmDuplicateDialog(true);
    } else {
      // Adicionar diretamente se não houver possíveis duplicações
      confirmAddInvestment(newInvestment);
    }
  };
  
  // Função para confirmar adição do investimento após possível duplicação
  const confirmAddInvestment = (investment: Investment) => {
    setInvestments([...investments, investment]);
    setInvestmentAmount("");
    
    // Evitar múltiplos toasts
    if (!toastDebounce) {
      setToastDebounce(true);
      toast({
        title: "Aporte registrado com sucesso!",
        description: `Aporte de ${formatCryptoAmount(investment.amount, investment.unit)} registrado com sucesso.`,
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

    // Criar novo registro de lucro usando formatDateToUTC
    const newProfit: ProfitRecord = {
      id: Date.now().toString(),
      date: formatDateToUTC(profitDate),
      amount: Number(profitAmount),
      unit: profitUnit,
      isProfit,
      reportId: activeReportId || "", // Usar ID do relatório ativo
    };

    // Verificar possíveis duplicações (mesma data, mesmo valor e mesmo tipo lucro/perda)
    const possibleDuplicates = profits.filter(p => 
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
    setProfits([...profits, profit]);
    setProfitAmount("");
    
    // Evitar múltiplos toasts
    if (!toastDebounce) {
      setToastDebounce(true);
      toast({
        title: isProfit ? "Lucro registrado com sucesso!" : "Perda registrada com sucesso!",
        description: `${isProfit ? "Lucro" : "Perda"} de ${formatCryptoAmount(profit.amount, profit.unit)} registrado com sucesso.`,
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
    setInvestments(investments.filter((investment) => investment.id !== id));
    
    // Evitar múltiplos toasts
    if (!toastDebounce) {
      setToastDebounce(true);
      toast({
        title: "Aporte removido",
        description: "O aporte foi removido com sucesso.",
      });
      setTimeout(() => setToastDebounce(false), 1000);
    }
  };

  const deleteProfit = (id: string) => {
    setProfits(profits.filter((profit) => profit.id !== id));
    
    // Evitar múltiplos toasts
    if (!toastDebounce) {
      setToastDebounce(true);
      toast({
        title: "Registro removido",
        description: "O registro de lucro/perda foi removido com sucesso.",
      });
      setTimeout(() => setToastDebounce(false), 1000);
    }
  };
  
  // Função para excluir todos os aportes
  const deleteAllInvestments = () => {
    setInvestments([]);
    setShowDeleteInvestmentsDialog(false);
    
    toast({
      title: "Todos os aportes removidos",
      description: "Todos os registros de aporte foram removidos com sucesso.",
      variant: "success",
    });
  };
  
  // Função para excluir todos os lucros/perdas
  const deleteAllProfits = () => {
    setProfits([]);
    setShowDeleteProfitsDialog(false);
    
    toast({
      title: "Todos os lucros/perdas removidos",
      description: "Todos os registros de lucro/perda foram removidos com sucesso.",
      variant: "success",
    });
  };

  // Funções de navegação
  const goToPreviousMonth = () => {
    if (dateRangeMode === "month") {
      setSelectedMonth(subMonths(selectedMonth, 1));
    } else {
      // Em modo de intervalo, mova ambas as datas para trás em um mês
      if (dateRange.from && dateRange.to) {
        setDateRange({
          from: subMonths(dateRange.from, 1),
          to: subMonths(dateRange.to, 1)
        });
      }
    }
  };

  const goToNextMonth = () => {
    const today = new Date();
    
    if (dateRangeMode === "month") {
      const nextMonth = addMonths(selectedMonth, 1);
      if (nextMonth <= today) {
        setSelectedMonth(nextMonth);
      }
    } else {
      // Em modo de intervalo, mova ambas as datas para frente em um mês se não ultrapassar a data atual
      if (dateRange.from && dateRange.to) {
        const newEndDate = addMonths(dateRange.to, 1);
        if (newEndDate <= today) {
          setDateRange({
            from: addMonths(dateRange.from, 1),
            to: newEndDate
          });
        }
      }
    }
  };
  
  const switchToMonthMode = () => {
    setDateRangeMode("month");
    if (dateRange.from) {
      // Use a data inicial do intervalo como mês selecionado
      setSelectedMonth(dateRange.from);
    }
  };
  
  const switchToCustomMode = () => {
    setDateRangeMode("custom");
    // Inicializar o intervalo com o mês atual selecionado
    const startOfSelectedMonth = startOfMonth(selectedMonth);
    const endOfSelectedMonth = endOfMonth(selectedMonth);
    setDateRange({
      from: startOfSelectedMonth,
      to: endOfSelectedMonth
    });
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

  // Modificar função de filtragem para considerar relatórios selecionados e o intervalo de datas
  const getFilteredInvestments = (): Investment[] => {
    if (dateRangeMode === "month" && !selectedMonth) return [];
    if (dateRangeMode === "custom" && (!dateRange.from || !dateRange.to)) return [];
    
    return investments.filter(investment => {
      const investmentDate = new Date(investment.date);
      
      // Verificar se está no intervalo de datas selecionado
      let isInDateRange = false;
      
      if (dateRangeMode === "month") {
        // Modo de mês: verificar mesmo mês e ano
        isInDateRange = investmentDate.getMonth() === selectedMonth.getMonth() &&
                         investmentDate.getFullYear() === selectedMonth.getFullYear();
      } else {
        // Modo personalizado: verificar se está entre as datas selecionadas
        if (dateRange.from && dateRange.to) {
          // Ajustar as datas para o início/fim do dia para comparação correta
          const from = startOfDay(dateRange.from);
          const to = endOfDay(dateRange.to);
          isInDateRange = isWithinInterval(investmentDate, { start: from, end: to });
        }
      }
      
      // Verificar se pertence a um relatório selecionado
      const isSelectedReport = selectedReportIds.includes(investment.reportId);
      
      return isInDateRange && isSelectedReport;
    });
  };

  const getFilteredProfits = (): ProfitRecord[] => {
    if (dateRangeMode === "month" && !selectedMonth) return [];
    if (dateRangeMode === "custom" && (!dateRange.from || !dateRange.to)) return [];
    
    return profits.filter(profit => {
      const profitDate = new Date(profit.date);
      
      // Verificar se está no intervalo de datas selecionado
      let isInDateRange = false;
      
      if (dateRangeMode === "month") {
        // Modo de mês: verificar mesmo mês e ano
        isInDateRange = profitDate.getMonth() === selectedMonth.getMonth() &&
                         profitDate.getFullYear() === selectedMonth.getFullYear();
      } else {
        // Modo personalizado: verificar se está entre as datas selecionadas
        if (dateRange.from && dateRange.to) {
          // Ajustar as datas para o início/fim do dia para comparação correta
          const from = startOfDay(dateRange.from);
          const to = endOfDay(dateRange.to);
          isInDateRange = isWithinInterval(profitDate, { start: from, end: to });
        }
      }
      
      // Verificar se pertence a um relatório selecionado
      const isSelectedReport = selectedReportIds.includes(profit.reportId);
      
      return isInDateRange && isSelectedReport;
    });
  };
  
  // Função para obter o texto de período para exibição
  const getDisplayPeriodText = (): string => {
    if (dateRangeMode === "month") {
      return format(selectedMonth, 'MMMM yyyy', { locale: ptBR });
    } else {
      if (dateRange.from && dateRange.to) {
        // Se estiverem no mesmo mês e ano
        if (dateRange.from.getMonth() === dateRange.to.getMonth() && 
            dateRange.from.getFullYear() === dateRange.to.getFullYear()) {
          return `${format(dateRange.from, 'd', { locale: ptBR })} a ${format(dateRange.to, 'd', { locale: ptBR })} de ${format(dateRange.from, 'MMMM yyyy', { locale: ptBR })}`;
        }
        // Se estiverem no mesmo ano mas meses diferentes
        else if (dateRange.from.getFullYear() === dateRange.to.getFullYear()) {
          return `${format(dateRange.from, 'd MMM', { locale: ptBR })} a ${format(dateRange.to, 'd MMM', { locale: ptBR })} de ${format(dateRange.from, 'yyyy', { locale: ptBR })}`;
        } 
        // Anos diferentes
        else {
          return `${format(dateRange.from, 'd MMM yyyy', { locale: ptBR })} a ${format(dateRange.to, 'd MMM yyyy', { locale: ptBR })}`;
        }
      }
      return "Período personalizado";
    }
  };

  // Componente para exibir opções de relatório no histórico
  const ReportFilterOptions = () => (
    <Card className="p-4 bg-black/40 border-purple-700/50">
      <h3 className="text-sm font-medium mb-4">Filtrar por Relatórios</h3>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {reports.map(report => (
          <div key={report.id} className="flex items-center space-x-2">
            <Checkbox 
              id={`report-${report.id}`} 
              checked={selectedReportIds.includes(report.id)}
              onCheckedChange={() => toggleReportSelection(report.id)}
            />
            <Label htmlFor={`report-${report.id}`} className="text-sm cursor-pointer">
              {report.name}
            </Label>
          </div>
        ))}
        <div className="flex items-center mt-4 pt-3 border-t border-purple-700/30">
          <Button 
            variant="outline" 
            size="sm"
            className="text-xs py-1 px-2 h-7 bg-black/30 border-purple-700/50 hover:bg-purple-900/20 mr-2 w-full"
            onClick={selectAllReports}
          >
            Selecionar Todos
          </Button>
        </div>
      </div>
    </Card>
  );

  // Modificar a função de exportação para trabalhar com o intervalo de datas
  const exportData = async (exportAll: boolean = false, reportIds?: string[]) => {
    try {
      setIsExporting(true);
      
      // Determinar quais relatórios exportar
      const reportsToExport = reportIds || selectedReportIds;
      
      // Filtrar investimentos e lucros pelos relatórios selecionados e intervalo de datas
      const filteredInvestments = exportAll
        ? investments.filter(inv => reportsToExport.includes(inv.reportId))
        : investments.filter(inv => {
            const investmentDate = new Date(inv.date);
            
            // Verificar o intervalo de datas
            let isInDateRange = false;
            if (dateRangeMode === "month") {
              isInDateRange = investmentDate.getMonth() === selectedMonth.getMonth() &&
                             investmentDate.getFullYear() === selectedMonth.getFullYear();
            } else {
              if (dateRange.from && dateRange.to) {
                isInDateRange = isWithinInterval(investmentDate, { 
                  start: startOfDay(dateRange.from), 
                  end: endOfDay(dateRange.to) 
                });
              }
            }
            
            const isSelectedReport = reportsToExport.includes(inv.reportId);
            return isInDateRange && isSelectedReport;
          });
      
      const filteredProfits = exportAll
        ? profits.filter(profit => reportsToExport.includes(profit.reportId))
        : profits.filter(profit => {
            const profitDate = new Date(profit.date);
            
            // Verificar o intervalo de datas
            let isInDateRange = false;
            if (dateRangeMode === "month") {
              isInDateRange = profitDate.getMonth() === selectedMonth.getMonth() &&
                             profitDate.getFullYear() === selectedMonth.getFullYear();
            } else {
              if (dateRange.from && dateRange.to) {
                isInDateRange = isWithinInterval(profitDate, { 
                  start: startOfDay(dateRange.from), 
                  end: endOfDay(dateRange.to) 
                });
              }
            }
            
            const isSelectedReport = reportsToExport.includes(profit.reportId);
            return isInDateRange && isSelectedReport;
          });
      
      // Resto da função permanece igual
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Bitcoin Monitor";
      workbook.created = new Date();
      
      // Adicionar metadados
      // Comentado devido a incompatibilidade de tipos
      // workbook.properties.title = "Relatório Bitcoin";
      // workbook.properties.subject = "Investimentos e Lucros Bitcoin";
      
      // Adicionar planilha de investimentos
      const investmentsSheet = workbook.addWorksheet("Investimentos");
      investmentsSheet.columns = [
        { header: "ID", key: "id", width: 40 },
        { header: "Data", key: "date", width: 15 },
        { header: "Valor (BTC)", key: "amountBtc", width: 15 },
        { header: "Valor (Satoshis)", key: "amountSats", width: 15 },
        { header: "Unidade Original", key: "unit", width: 15 },
        { header: "Relatório", key: "report", width: 20 },
      ];
      
      // Adicionar dados de investimentos
      filteredInvestments.forEach(investment => {
        const reportName = reports.find(r => r.id === investment.reportId)?.name || "Desconhecido";
        const amountBtc = convertToBtc(investment.amount, investment.unit);
        const amountSats = investment.unit === "BTC" ? investment.amount * 100000000 : investment.amount;
        
        investmentsSheet.addRow({
          id: investment.id,
          date: formatDisplayDate(investment.date, "dd/MM/yyyy"),
          amountBtc: amountBtc.toFixed(8),
          amountSats: Math.round(amountSats),
          unit: investment.unit,
          report: reportName,
        });
      });
      
      // Adicionar planilha de lucros
      const profitsSheet = workbook.addWorksheet("Lucros/Perdas");
      profitsSheet.columns = [
        { header: "ID", key: "id", width: 40 },
        { header: "Data", key: "date", width: 15 },
        { header: "Valor (BTC)", key: "amountBtc", width: 15 },
        { header: "Valor (Satoshis)", key: "amountSats", width: 15 },
        { header: "Tipo", key: "type", width: 15 },
        { header: "Unidade Original", key: "unit", width: 15 },
        { header: "Relatório", key: "report", width: 20 },
      ];
      
      // Adicionar dados de lucros
      filteredProfits.forEach(profit => {
        const reportName = reports.find(r => r.id === profit.reportId)?.name || "Desconhecido";
        const amountBtc = convertToBtc(profit.amount, profit.unit);
        const amountSats = profit.unit === "BTC" ? profit.amount * 100000000 : profit.amount;
        
        profitsSheet.addRow({
          id: profit.id,
          date: formatDisplayDate(profit.date, "dd/MM/yyyy"),
          amountBtc: amountBtc.toFixed(8),
          amountSats: Math.round(amountSats),
          type: profit.isProfit ? "Lucro" : "Perda",
          unit: profit.unit,
          report: reportName,
        });
      });
      
      // Gerar buffer e blob
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      // Criar URL e link para download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      // Atualizar nome do arquivo para refletir o intervalo de datas
      const periodStr = dateRangeMode === "month" 
        ? format(selectedMonth, "MMMM-yyyy", { locale: ptBR })
        : dateRange.from && dateRange.to
          ? `${format(dateRange.from, "dd-MM-yyyy")}_a_${format(dateRange.to, "dd-MM-yyyy")}`
          : "periodo-personalizado";
      
      // Nome do arquivo baseado nos relatórios selecionados
      const reportNames = reportsToExport.length === reports.length 
        ? "todos-relatorios" 
        : reportsToExport.map(id => reports.find(r => r.id === id)?.name.toLowerCase().replace(/\s+/g, "-") || id).join("-");
      
      link.download = exportAll
        ? `bitcoin-dados-completos-${reportNames}.xlsx`
        : `bitcoin-dados-${periodStr}-${reportNames}.xlsx`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Exportação concluída",
        description: "Os dados foram exportados com sucesso.",
        variant: "success",
      });
    } catch (error) {
      console.error("Erro ao exportar dados:", error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os dados.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Componente para diálogo de criação de relatório
  const ReportDialog = () => (
    <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
      <DialogContent className="bg-black border-purple-700/50 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Novo Relatório</DialogTitle>
          <DialogDescription className="text-gray-400">
            Crie um novo relatório para registrar operações em uma conta ou exchange específica.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="report-name">Nome do Relatório</Label>
            <Input
              id="report-name"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              placeholder="Ex: Conta Pessoal, Binance, etc."
              className="bg-black/30 border-purple-700/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-description">Descrição (opcional)</Label>
            <Textarea
              id="report-description"
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              placeholder="Descrição do relatório"
              className="bg-black/30 border-purple-700/50 min-h-[80px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setShowReportDialog(false)}
            className="bg-black/30 border-purple-700/50 hover:bg-purple-900/20"
          >
            Cancelar
          </Button>
          <Button onClick={addReport}>
            Criar Relatório
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

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
          const { newProfits, successCount, errorCount, duplicatedCount } = 
            processTradeRecords(headers, records);
          
          // Adicionar os novos registros de lucro
          if (newProfits.length > 0) {
            setProfits(prevProfits => [...prevProfits, ...newProfits]);
            
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
    const existingProfitIds = new Set(profits.map(profit => profit.originalId || profit.id));
    
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
          reportId: activeReportId || "", // Usar ID do relatório ativo
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
  const ImportOptions = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Input para CSV de operações */}
        <input
          type="file"
          accept=".csv"
          onChange={handleImportCSV}
          ref={csvFileInputRef}
          className="hidden"
        />
        <Button 
          variant="outline" 
          className="w-full justify-center bg-black/30 border-purple-700/50 hover:bg-purple-900/20"
          onClick={triggerCSVFileInput}
          disabled={isImporting}
        >
          {isImporting && importType === "csv" ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Importando...
            </>
          ) : (
            <>
              <FileType className="mr-2 h-4 w-4" />
              Importar CSV de Operações
            </>
          )}
        </Button>
        
        {/* Input para CSV de aportes */}
        <input
          type="file"
          accept=".csv"
          onChange={handleImportInvestmentCSV}
          ref={investmentCsvFileInputRef}
          className="hidden"
        />
        <Button 
          variant="outline" 
          className="w-full justify-center bg-black/30 border-purple-700/50 hover:bg-purple-900/20"
          onClick={triggerInvestmentCsvFileInput}
          disabled={isImporting}
        >
          {isImporting && importType === "investment-csv" ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Importando...
            </>
          ) : (
            <>
              <FileType className="mr-2 h-4 w-4" />
              Importar CSV de Aportes
            </>
          )}
        </Button>
        
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

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
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
          const { newProfits, successCount: sCount, errorCount: eCount, duplicatedCount: dCount } = processTradeRecords(headers, records);
          
          successCount = sCount;
          errorCount = eCount;
          duplicatedCount = dCount;
          
          // Adicionar os novos registros
          if (newProfits.length > 0) {
            const combinedProfits = [...profits, ...newProfits];
            setProfits(combinedProfits);
            localStorage.setItem("bitcoinProfits", JSON.stringify(combinedProfits));
            
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
          const existingInvestmentIds = new Set(
            investments
              .map(inv => inv.originalId || inv.id)
          );
          
          const existingProfitIds = new Set(
            profits
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
                    unit,
                    reportId: activeReportId || "", // Usar ID do relatório ativo
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
                    isProfit,
                    reportId: activeReportId || "", // Usar ID do relatório ativo
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
            setInvestments(prevInvestments => [...prevInvestments, ...newInvestments]);
            setProfits(prevProfits => [...prevProfits, ...newProfits]);
            
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
          const existingIds = new Set(investments.map(inv => inv.originalId || inv.id));
          
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
                unit: unit,
                reportId: activeReportId || "", // Usar ID do relatório ativo
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
            setInvestments(prev => [...prev, ...newInvestments]);
            
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

  // Função para calcular o total de investimentos no mês
  const calculateTotalInvestmentsInMonth = (month: Date): number => {
    return getFilteredInvestments().reduce((total, investment) => {
      return total + convertToBtc(investment.amount, investment.unit);
    }, 0);
  };

  // Função para calcular o total de lucros no mês
  const calculateTotalProfitsInMonth = (month: Date): number => {
    return getFilteredProfits().reduce((total, profit) => {
      const btcValue = convertToBtc(profit.amount, profit.unit);
      return total + (profit.isProfit ? btcValue : -btcValue);
    }, 0);
  };

  // Função para formatar valor em BTC para a moeda selecionada
  const formatBtcValueInCurrency = (btcValue: number): string => {
    if (displayCurrency === "USD") {
      const usdValue = btcValue * currentRates.btcToUsd;
      return formatCurrency(usdValue, "USD");
    } else {
      const brlValue = btcValue * currentRates.btcToUsd * currentRates.brlToUsd;
      return formatCurrency(brlValue, "BRL");
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Renderizar Dialog de Relatório */}
      <ReportDialog />
      
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
          {/* Adicionar Card para seleção de relatório */}
          <Card className="panel border-purple-700/50 mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Relatório Atual</CardTitle>
              <CardDescription>Selecione o relatório para registro</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 items-center">
                <Select
                  value={activeReportId || ""}
                  onValueChange={changeActiveReport}
                >
                  <SelectTrigger className="w-full bg-black/30 border-purple-700/50">
                    <SelectValue placeholder="Selecione um relatório" />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-purple-700/50">
                    <SelectGroup>
                      {reports.map(report => (
                        <SelectItem key={report.id} value={report.id}>
                          {report.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={() => setShowReportDialog(true)}
                  className="w-full sm:w-auto whitespace-nowrap"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Novo Relatório
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card className="panel border-purple-700/50">
              <CardHeader>
                <CardTitle className="text-lg">Registrar Investimento</CardTitle>
                <CardDescription>Registre seus aportes</CardDescription>
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
                  <Button onClick={addInvestment}>
                    Adicionar Aporte
                  </Button>
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
                  
                  <Button onClick={addProfitRecord}>
                    Adicionar {isProfit ? "Lucro" : "Perda"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Nova seção para importação */}
          <Card className="panel border-purple-700/50">
            <CardHeader>
              <CardTitle className="text-lg">Importação de Registros</CardTitle>
              <CardDescription>Importe operações e aportes de arquivos externos</CardDescription>
            </CardHeader>
            <CardContent>
              <ImportOptions />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="space-y-4">
            {/* Adicionar Card para filtro de relatórios */}
            <Card className="panel border-purple-700/50">
              <CardHeader>
                <CardTitle className="text-lg">Filtrar Relatórios</CardTitle>
                <CardDescription>Selecione quais relatórios deseja visualizar</CardDescription>
              </CardHeader>
              <CardContent>
                <ReportFilterOptions />
              </CardContent>
            </Card>

            {getFilteredInvestments().length === 0 && getFilteredProfits().length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {showFilterOptions ? 
                  `Nenhum registro encontrado para ${getDisplayPeriodText()}.` : 
                  "Nenhum registro encontrado. Adicione investimentos ou lucros na aba 'Registrar'."}
              </p>
            ) : (
              <div className="space-y-6">
                {getFilteredInvestments().length > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-semibold text-blue-400">Investimentos</h3>
                      {!showFilterOptions && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          className="bg-red-900/70 hover:bg-red-900"
                          onClick={() => setShowDeleteInvestmentsDialog(true)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remover todos
                        </Button>
                      )}
                    </div>
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
                              <TableCell>{formatDisplayDate(investment.date, "d MMM yyyy")}</TableCell>
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
                      {!showFilterOptions && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          className="bg-red-900/70 hover:bg-red-900"
                          onClick={() => setShowDeleteProfitsDialog(true)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remover todos
                        </Button>
                      )}
                    </div>
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
                              <TableCell>{formatDisplayDate(profit.date, "d MMM yyyy")}</TableCell>
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
          </div>
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

              <Card className="panel border-purple-700/50">
                <CardHeader>
                  <CardTitle className="text-lg">Resumo do Período</CardTitle>
                  <CardDescription>
                    Veja o resumo dos investimentos e lucros/perdas do período selecionado.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-black/30 p-3 rounded-md border border-purple-700/50">
                      <div className="text-xs text-gray-400">Período selecionado</div>
                      <div className="text-lg font-semibold text-white">
                        {getDisplayPeriodText()}
                      </div>
                    </div>

                    <div className="bg-black/30 p-3 rounded-md border border-purple-700/50">
                      <div className="text-xs text-gray-400">Aporte total</div>
                      <div className="text-lg font-semibold text-blue-400">
                        {formatCryptoAmount(getFilteredInvestments().reduce((total, investment) => {
                          return total + convertToBtc(investment.amount, investment.unit);
                        }, 0), "BTC")}
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatBtcValueInCurrency(getFilteredInvestments().reduce((total, investment) => {
                          return total + convertToBtc(investment.amount, investment.unit);
                        }, 0))}
                      </div>
                    </div>

                    <div className="bg-black/30 p-3 rounded-md border border-purple-700/50">
                      <div className="text-xs text-gray-400">Lucro/Perda do período</div>
                      <div className={`text-lg font-semibold ${getFilteredProfits().reduce((total, profit) => {
                          const btcValue = convertToBtc(profit.amount, profit.unit);
                          return total + (profit.isProfit ? btcValue : -btcValue);
                        }, 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {getFilteredProfits().reduce((total, profit) => {
                          const btcValue = convertToBtc(profit.amount, profit.unit);
                          return total + (profit.isProfit ? btcValue : -btcValue);
                        }, 0) >= 0 ? "+" : ""}
                        {formatCryptoAmount(Math.abs(getFilteredProfits().reduce((total, profit) => {
                          const btcValue = convertToBtc(profit.amount, profit.unit);
                          return total + (profit.isProfit ? btcValue : -btcValue);
                        }, 0)), "BTC")}
                      </div>
                      <div className="text-xs text-gray-400">
                        {getFilteredProfits().reduce((total, profit) => {
                          const btcValue = convertToBtc(profit.amount, profit.unit);
                          return total + (profit.isProfit ? btcValue : -btcValue);
                        }, 0) >= 0 ? "+" : ""}
                        {formatBtcValueInCurrency(Math.abs(getFilteredProfits().reduce((total, profit) => {
                          const btcValue = convertToBtc(profit.amount, profit.unit);
                          return total + (profit.isProfit ? btcValue : -btcValue);
                        }, 0)))}
                      </div>
                    </div>

                    <div className="bg-black/30 p-3 rounded-md border border-purple-700/50">
                      <div className="text-xs text-gray-400">Rendimento</div>
                      <div className={`text-lg font-semibold ${
                        getFilteredInvestments().reduce((total, investment) => {
                          return total + convertToBtc(investment.amount, investment.unit);
                        }, 0) > 0 && 
                        (getFilteredProfits().reduce((total, profit) => {
                          const btcValue = convertToBtc(profit.amount, profit.unit);
                          return total + (profit.isProfit ? btcValue : -btcValue);
                        }, 0) / getFilteredInvestments().reduce((total, investment) => {
                          return total + convertToBtc(investment.amount, investment.unit);
                        }, 0) * 100) >= 0 ? 
                        "text-green-500" : "text-red-500"}`}>
                        {getFilteredInvestments().reduce((total, investment) => {
                          return total + convertToBtc(investment.amount, investment.unit);
                        }, 0) > 0 ? 
                          `${(getFilteredProfits().reduce((total, profit) => {
                            const btcValue = convertToBtc(profit.amount, profit.unit);
                            return total + (profit.isProfit ? btcValue : -btcValue);
                          }, 0) / getFilteredInvestments().reduce((total, investment) => {
                            return total + convertToBtc(investment.amount, investment.unit);
                          }, 0) * 100).toFixed(2)}%` : 
                          "N/A"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card para navegação de período - modificado para permitir intervalo personalizado */}
              <Card className="panel border-purple-700/50">
                <CardContent className="p-4">
                  <div className="flex flex-col space-y-4">
                    {/* Seletores de tipo de período */}
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Button
                        variant={dateRangeMode === "month" ? "default" : "outline"}
                        size="sm"
                        onClick={switchToMonthMode}
                        className={dateRangeMode === "month" ? "" : "bg-black/30 border-purple-700/50"}
                      >
                        Mês Único
                      </Button>
                      <Button
                        variant={dateRangeMode === "custom" ? "default" : "outline"}
                        size="sm"
                        onClick={switchToCustomMode}
                        className={dateRangeMode === "custom" ? "" : "bg-black/30 border-purple-700/50"}
                      >
                        Período Personalizado
                      </Button>
                    </div>
                    
                    {/* Navegação */}
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={goToPreviousMonth}
                        className="bg-black/30 border-purple-700/50 hover:bg-purple-900/20"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      
                      {dateRangeMode === "month" ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="min-w-[240px] justify-center font-medium bg-black/30 border-purple-700/50 hover:bg-purple-900/20"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-black/90 border-purple-800/60" align="center">
                            <div className="p-2 bg-purple-900/30 text-xs text-center text-gray-300 border-b border-purple-700/50">
                              Selecione um mês
                            </div>
                            <CalendarComponent
                              mode="single"
                              selected={selectedMonth}
                              onSelect={(date) => {
                                if (date) {
                                  const newDate = new Date(date);
                                  // Definir para o primeiro dia do mês
                                  newDate.setDate(1);
                                  setSelectedMonth(newDate);
                                }
                              }}
                              initialFocus
                              className="bg-black/80"
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <Popover open={showDateRangePicker} onOpenChange={setShowDateRangePicker}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="min-w-[240px] justify-center font-medium bg-black/30 border-purple-700/50 hover:bg-purple-900/20"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {dateRange.from && dateRange.to ? (
                                <>
                                  {format(dateRange.from, 'd MMM', { locale: ptBR })} - {format(dateRange.to, 'd MMM yyyy', { locale: ptBR })}
                                </>
                              ) : (
                                "Selecionar período"
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-black/90 border-purple-800/60" align="center">
                            <div className="p-2 bg-purple-900/30 text-xs text-center text-gray-300 border-b border-purple-700/50">
                              Selecione um período
                            </div>
                            <CalendarComponent
                              mode="range"
                              selected={{
                                from: dateRange.from,
                                to: dateRange.to
                              }}
                              onSelect={(range) => {
                                // Verificar se é uma seleção completa
                                if (range?.from && range?.to) {
                                  setDateRange({
                                    from: startOfDay(range.from),
                                    to: endOfDay(range.to)
                                  });
                                  setShowDateRangePicker(false);
                                } else {
                                  setDateRange(range || { from: undefined, to: undefined });
                                }
                              }}
                              initialFocus
                              numberOfMonths={2}
                              className="bg-black/80"
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                      
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={goToNextMonth}
                        className="bg-black/30 border-purple-700/50 hover:bg-purple-900/20"
                        disabled={dateRangeMode === "month" ? isCurrentMonth(selectedMonth) : false}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {getFilteredInvestments().length === 0 && getFilteredProfits().length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {showFilterOptions ? 
                    `Nenhum registro encontrado para ${getDisplayPeriodText()}.` : 
                    "Nenhum registro encontrado. Adicione investimentos ou lucros na aba 'Registrar'."}
                </p>
              ) : (
                // ... o resto do código permanece igual
              )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const dynamic = 'force-dynamic';