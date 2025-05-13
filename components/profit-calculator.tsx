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
  HelpCircle,
  AreaChart,
  BarChart3,
  CalendarIcon,
  Edit3,
  Files,
  FolderPlus,
  Info,
  Search,
  X,
  PlusCircle
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
import { Checkbox } from "@/components/ui/checkbox";
import { useReports } from "@/hooks/use-reports"; // ADICIONAR IMPORT
import { usePathname } from "next/navigation";
import Papa from 'papaparse'; // ADICIONAR IMPORT PARA PAPAPARSE
import { generateId, Report, Investment, ProfitRecord, STORAGE_KEYS, ReportCollection } from "@/lib/calculator-types"; // Adicionei STORAGE_KEYS aqui se for usado no useEffect inicial
import { ColumnDef } from "@tanstack/react-table"; // IMPORTAR ColumnDef
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DataTable } from "@/components/ui/data-table"; 
import { Badge } from "@/components/ui/badge"; // ADICIONAR IMPORT PARA BADGE

// Tipos de dados
type CurrencyUnit = "BTC" | "SATS";
type DisplayCurrency = "USD" | "BRL" | "SATS" | "BTC"; // Adicionado SATS e BTC aqui também, pois são opções de display

interface AppData {
  currentPrice: {
    usd: number;
    brl: number;
    isUsingCache?: boolean;
  };
  isUsingCache: boolean;
  title: string;
  description: string;
  lastUpdated: string;
}

interface ProfitCalculatorProps {
  btcToUsd: number;
  brlToUsd: number;
  appData: AppData;
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

// ADICIONAR DEFINIÇÕES DE FUNÇÕES AUXILIARES AQUI, ANTES DO COMPONENTE

const formatDateToUTC = (date: Date): string => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    console.warn("formatDateToUTC recebeu data inválida:", date);
    // Retornar um valor padrão ou lançar um erro, dependendo da política de erro
    return ""; // Ou formato de data de erro como "0000-00-00"
  }
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDate = (dateString: string): Date => {
  if (!dateString || typeof dateString !== 'string') {
    console.warn("parseDate recebeu string de data inválida ou não string:", dateString);
    return new Date(NaN);
  }
  // Tenta formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }
  // Tenta formato DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    const [day, month, year] = dateString.split('/').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }
  const isoDate = new Date(dateString);
  if (!isNaN(isoDate.getTime())) {
    return new Date(Date.UTC(isoDate.getUTCFullYear(), isoDate.getUTCMonth(), isoDate.getUTCDate(), 12, 0, 0));
  }
  console.warn(`parseDate: Formato de data não reconhecido: ${dateString}. Retornando data inválida.`);
  return new Date(NaN);
};

const getRandomColor = (): string => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

// Função para identificar unidade (exemplo, pode precisar de ajustes)
const 识别Unit = (unitStr: string): CurrencyUnit => {
  if (typeof unitStr !== 'string') unitStr = "SATS"; // Fallback se não for string
  const lowerUnit = unitStr.toLowerCase();
  if (lowerUnit === "btc") return "BTC";
  return "SATS"; 
};

// DEFINIR formatDate
const formatDate = (dateValue: string | Date, locale: string = 'pt-BR'): string => {
  try {
    const date = typeof dateValue === 'string' ? parseDate(dateValue) : dateValue;
    if (!date || isNaN(date.getTime())) return "Data inválida";
    return date.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch (error) {
    console.error("Erro ao formatar data:", error);
    return "Erro na data";
  }
};

export default function ProfitCalculator({ btcToUsd, brlToUsd, appData }: ProfitCalculatorProps) {
  // USAR O HOOK useReports - AJUSTAR DESESTRUTURAÇÃO E NOMES
  const {
    reports: allReportsFromHook, // Nome novo para os relatórios vindos do hook
    activeReport: currentActiveReportObjectFromHook, // Nome novo para o objeto do relatório ativo do hook
    activeReportId: activeReportIdFromHook, // Nome novo para o ID do relatório ativo do hook
    isLoaded: reportsDataLoaded,
    addReport,
    selectReport,
    deleteReport,
    updateReport, // Usaremos para atualizar nome, descrição, cor
    addInvestment, // Adiciona ao relatório ativo
    addProfitRecord, // Adiciona ao relatório ativo
    deleteInvestment: deleteInvestmentFromReportHook, // Exige reportId e investmentId
    deleteProfitRecord: deleteProfitRecordFromReportHook, // Exige reportId e profitId
    updateReportData, // Para atualizações em lote de investments/profits
    importData, // Para importação de CSV
  } = useReports();

  // Estados locais do ProfitCalculator
  const [activeTab, setActiveTab] = useState("register");
  // MANTER OS ESTADOS ANTIGOS TEMPORARIAMENTE PARA EVITAR ERROS IMEDIATOS
  // ELES SERÃO SUBSTITUÍDOS GRADUALMENTE PELOS DADOS DO HOOK
  const [reports, setReports] = useState<Report[]>([]); 
  const [activeReportId, setActiveReportId] = useState<string | null>(null); 
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  
  const [displayCurrency, setDisplayCurrency] = useState<"BTC" | "SATS" | "USD" | "BRL">("SATS");
  
  // Estados para modais e inputs de formulário (ESSENCIAIS E DEVEM PERMANECER)
  const [showAddInvestmentModal, setShowAddInvestmentModal] = useState(false);
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [investmentDate, setInvestmentDate] = useState<Date>(new Date());
  const [investmentUnit, setInvestmentUnit] = useState<CurrencyUnit>("SATS");
  const [investmentOriginalId, setInvestmentOriginalId] = useState("");

  const [showAddProfitModal, setShowAddProfitModal] = useState(false);
  const [profitAmount, setProfitAmount] = useState("");
  const [profitDate, setProfitDate] = useState<Date>(new Date());
  const [profitUnit, setProfitUnit] = useState<CurrencyUnit>("SATS");
  const [isProfit, setIsProfit] = useState(true);
  const [profitOriginalId, setProfitOriginalId] = useState("");

  const [showCreateReportModal, setShowCreateReportModal] = useState(false);
  const [newReportName, setNewReportName] = useState("");
  const [newReportDescription, setNewReportDescription] = useState("");

  const [showEditReportModal, setShowEditReportModal] = useState(false);
  const [editingReportName, setEditingReportName] = useState("");
  const [editingReportDescription, setEditingReportDescription] = useState("");
  const [editingReportColor, setEditingReportColor] = useState(getRandomColor()); // getRandomColor deve estar definido
  
  const [showDeleteReportModal, setShowDeleteReportModal] = useState(false);
  const [showClearTransactionsModal, setShowClearTransactionsModal] = useState(false);

  const [investmentCsvFile, setInvestmentCsvFile] = useState<File | null>(null);
  const [profitCsvFile, setProfitCsvFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const [investmentToDelete, setInvestmentToDelete] = useState<string | null>(null);
  const [profitToDelete, setProfitToDelete] = useState<string | null>(null);
  const [showDeleteInvestmentsDialog, setShowDeleteInvestmentsDialog] = useState(false);
  const [showDeleteProfitsDialog, setShowDeleteProfitsDialog] = useState(false);
  
  const [selectedReportIdsForHistoryView, setSelectedReportIdsForHistoryView] = useState<string[]>([]);
  
  const toastCurrentlyShowing = useRef<string | null>(null);

  // Lógica para definir o relatório ativo inicialmente ou quando a lista de relatórios muda
  useEffect(() => {
    if (reportsDataLoaded && allReportsFromHook.length > 0 && !activeReportIdFromHook) {
      // Se os dados foram carregados, há relatórios mas nenhum está ativo, ativa o primeiro.
      selectReport(allReportsFromHook[0].id);
    }
  }, [reportsDataLoaded, allReportsFromHook, activeReportIdFromHook, selectReport]);


  // Função para adicionar um novo investimento (agora usa o hook)
  const handleAddInvestment = () => {
    if (!activeReportIdFromHook) {
      toast({ title: "Erro", description: "Nenhum relatório ativo selecionado.", variant: "destructive" });
      return;
    }
    if (!investmentAmount || !investmentDate) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios.", variant: "destructive" });
      return;
    }

    const newInvestmentData: Omit<Investment, "id"> = {
      date: formatDateToUTC(investmentDate),
      amount: Number(investmentAmount),
      unit: investmentUnit,
      originalId: investmentOriginalId || undefined,
    };
    
    // Usa a função do hook que opera no relatório ativo
    addInvestment(newInvestmentData);

    setInvestmentAmount("");
    setInvestmentDate(new Date());
    setInvestmentUnit("SATS");
    setInvestmentOriginalId("");
    setShowAddInvestmentModal(false);
    toast({ title: "Sucesso", description: "Investimento adicionado ao relatório ativo." });
  };

  // Função para adicionar um novo registro de lucro/perda (agora usa o hook)
  const handleAddProfitRecord = () => {
    if (!activeReportIdFromHook) {
      toast({ title: "Erro", description: "Nenhum relatório ativo selecionado.", variant: "destructive" });
      return;
    }
    if (!profitAmount || !profitDate) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios.", variant: "destructive" });
      return;
    }

    const newProfitData: Omit<ProfitRecord, "id"> = {
      date: formatDateToUTC(profitDate),
      amount: Number(profitAmount),
      unit: profitUnit,
      isProfit: isProfit,
      originalId: profitOriginalId || undefined,
    };

    // Usa a função do hook que opera no relatório ativo
    addProfitRecord(newProfitData);

    setProfitAmount("");
    setProfitDate(new Date());
    setProfitUnit("SATS");
    setIsProfit(true);
    setProfitOriginalId("");
    setShowAddProfitModal(false);
    toast({ title: "Sucesso", description: "Registro de lucro/perda adicionado ao relatório ativo." });
  };

  // Função para deletar um investimento (agora usa o hook)
  const handleDeleteInvestment = (investmentId: string) => {
    if (!activeReportIdFromHook) {
      toast({ title: "Erro", description: "Nenhum relatório ativo para esta operação.", variant: "destructive" });
      return;
    }
    deleteInvestmentFromReportHook(activeReportIdFromHook, investmentId);
    toast({ title: "Sucesso", description: "Investimento excluído." });
    setShowDeleteInvestmentsDialog(false); // Fechar dialog se estiver aberto
  };

  // Função para deletar um registro de lucro/perda (agora usa o hook)
  const handleDeleteProfitRecord = (profitId: string) => {
    if (!activeReportIdFromHook) {
      toast({ title: "Erro", description: "Nenhum relatório ativo para esta operação.", variant: "destructive" });
      return;
    }
    deleteProfitRecordFromReportHook(activeReportIdFromHook, profitId);
    toast({ title: "Sucesso", description: "Registro de lucro/perda excluído." });
    setShowDeleteProfitsDialog(false); // Fechar dialog se estiver aberto
  };

  // Função para criar um novo relatório (agora usa o hook)
  const handleCreateReport = () => {
    if (!newReportName.trim()) {
      toast({ title: "Erro", description: "O nome do relatório não pode ser vazio.", variant: "destructive" });
      return;
    }
    addReport(newReportName, newReportDescription);
    setNewReportName("");
    setNewReportDescription("");
    setShowCreateReportModal(false);
    // O hook já exibe um toast de sucesso
  };

  // Função para deletar o relatório ativo (agora usa o hook)
  const handleDeleteActiveReport = () => {
    if (!activeReportIdFromHook) {
      toast({ title: "Erro", description: "Nenhum relatório ativo para excluir.", variant: "destructive" });
      return;
    }
    if (allReportsFromHook.length <= 1) {
      toast({ title: "Operação não permitida", description: "Deve haver pelo menos um relatório.", variant: "destructive" });
      return; // O hook também tem essa lógica, mas uma verificação aqui é boa.
    }
    deleteReport(activeReportIdFromHook);
    setShowDeleteReportModal(false);
     // O hook já exibe um toast de sucesso
  };

  // Função para selecionar um relatório (agora usa o hook)
  const handleSelectReport = (reportId: string) => {
    selectReport(reportId);
  };
  
  // Função para atualizar os detalhes do relatório ativo (nome, descrição, cor)
  const handleUpdateActiveReportDetails = () => {
    if (!activeReportIdFromHook || !currentActiveReportObjectFromHook) {
      toast({ title: "Erro", description: "Nenhum relatório ativo para atualizar.", variant: "destructive" });
      return;
    }
    if (!editingReportName.trim()) {
      toast({ title: "Erro", description: "O nome do relatório não pode ser vazio.", variant: "destructive" });
      return;
    }

    updateReport(activeReportIdFromHook, {
      name: editingReportName,
      description: editingReportDescription,
      color: editingReportColor,
    });
    setShowEditReportModal(false);
    toast({ title: "Sucesso", description: `Relatório "${editingReportName}" atualizado.` });
  };


  // Efeito para inicializar campos de edição quando modal abre
  useEffect(() => {
    if (showEditReportModal && currentActiveReportObjectFromHook) {
      setEditingReportName(currentActiveReportObjectFromHook.name);
      setEditingReportDescription(currentActiveReportObjectFromHook.description || "");
      setEditingReportColor(currentActiveReportObjectFromHook.color || getRandomColor());
    }
  }, [showEditReportModal, currentActiveReportObjectFromHook]);

  // ... (resto do código do componente, incluindo funções de importação de CSV)
  // AS FUNÇÕES DE IMPORTAÇÃO DE CSV (handleImportInvestmentCSV, handleImportProfitCSV, processTradeRecords)
  // precisarão usar `importData` ou `updateReportData` do hook.
  // Por exemplo, após processar o CSV e obter newInvestments e newProfits:
  // importData(activeReportIdFromHook, newInvestments, newProfits, { replace: false }); // ou true, dependendo da lógica desejada

  const processAndImportInvestments = (parsedData: any[], reportId: string) => {
    const newInvestments: Investment[] = [];
    let hasErrors = false;
    parsedData.forEach((row, index) => {
      try {
        const dateStr = row.Data || row.Date || row.date;
        const amountStr = row.Amount || row.amount || row.Valor || row.valor || row["Quantidade Comprada"] || row.Quantity;
        const unitStr = row.Unit || row.unit || row.Unidade || row.unidade || row.Moeda || row.Currency || "SATS";
        const originalId = row.ID || row.Id || row.id || `csv-inv-${Date.now()}-${index}`;

        if (!dateStr || !amountStr) {
          console.warn(`Linha ${index + 2} ignorada: Data ou Quantia ausente.`);
          return;
        }
        
        const investmentDate = parseDate(dateStr);
        if (isNaN(investmentDate.getTime())) {
          console.warn(`Linha ${index + 2} ignorada: Formato de data inválido ('${dateStr}'). Use YYYY-MM-DD ou DD/MM/YYYY.`);
          return;
        }

        const amount = parseFloat(String(amountStr).replace(/[,]/g, "."));
        if (isNaN(amount) || amount <= 0) {
          console.warn(`Linha ${index + 2} ignorada: Quantia inválida ('${amountStr}').`);
          return;
        }

        const unit =识别Unit(unitStr); // Função para identificar a unidade (BTC/SATS)

        const newInvestment: Investment = {
          id: generateId(), // Gerar novo ID sempre
          originalId: String(originalId),
          date: "2024-01-01", // TESTE: Data Hardcoded para diagnóstico
          amount: amount,
          unit: unit
        };
        newInvestments.push(newInvestment);
      } catch (e) {
        console.error(`Erro ao processar linha ${index + 2} do CSV de aportes:`, e);
        hasErrors = true;
      }
    });

    if (hasErrors) {
      toast({ title: "Atenção", description: "Algumas linhas do CSV de aportes podem não ter sido importadas devido a erros. Verifique o console.", variant: "default", duration: 7000 });
    }

    if (newInvestments.length > 0) {
      importData(reportId, newInvestments, undefined, { replace: false }); // Usar a função do hook
      toast({ title: "Sucesso", description: `${newInvestments.length} aportes importados para o relatório ativo.` });
    } else if (!hasErrors) {
      toast({ title: "Informação", description: "Nenhum novo aporte encontrado ou todos os registros já existem.", variant: "default" });
    }
    setInvestmentCsvFile(null);
  };

  const processAndImportProfits = (parsedData: any[], reportId: string) => {
    const newProfits: ProfitRecord[] = [];
    let hasErrors = false;

    parsedData.forEach((row, index) => {
      try {
        const dateStr = row.Data || row.Date || row.date;
        // Para lucros/perdas, pode haver colunas diferentes dependendo da origem (ex: exchanges)
        // Tentar identificar lucro líquido, ou calcular a partir de preço de compra/venda, quantidade.
        // Simplificação: esperamos uma coluna "LucroLiquidoSATS" ou "NetProfitSATS"
        let netProfitSatsStr = row.LucroLiquidoSATS || row.NetProfitSATS || row.netProfitSats || row.ProfitSATS || row.profitSats;
        
        const amountStr = row.Amount || row.amount || row.Valor || row.valor; // Usado se netProfitSatsStr não existir
        const unitStr = row.Unit || row.unit || row.Unidade || row.unidade || "SATS";
        const typeStr = row.Type || row.type || row.Tipo || row.tipo; // 'profit' ou 'loss'

        const originalId = row.ID || row.Id || row.id || `csv-prof-${Date.now()}-${index}`;

        if (!dateStr) {
          console.warn(`Linha ${index + 2} ignorada (lucros): Data ausente.`);
          return;
        }
        if (!netProfitSatsStr && !amountStr) {
            console.warn(`Linha ${index + 2} ignorada (lucros): Valor de lucro/perda (NetProfitSATS ou Amount) ausente.`);
            return;
        }

        const profitDate = parseDate(dateStr);
        if (isNaN(profitDate.getTime())) {
          console.warn(`Linha ${index + 2} ignorada (lucros): Formato de data inválido ('${dateStr}'). Use YYYY-MM-DD ou DD/MM/YYYY.`);
          return;
        }
        
        let netProfitSats: number;
        if (netProfitSatsStr !== undefined) {
            netProfitSats = parseFloat(String(netProfitSatsStr).replace(/[,]/g, "."));
        } else if (amountStr !== undefined) {
            const amount = parseFloat(String(amountStr).replace(/[,]/g, "."));
            const unit = 识别Unit(unitStr);
            let amountInSats = amount;
            if (unit === 'BTC') {
                amountInSats = amount * 100_000_000;
            }
            // Se não há netProfitSats, tentamos inferir pelo 'type' e 'amount'
            if (typeStr && String(typeStr).toLowerCase().includes('loss') || String(typeStr).toLowerCase().includes('perda')) {
                netProfitSats = -Math.abs(amountInSats);
            } else {
                netProfitSats = Math.abs(amountInSats);
            }
        } else {
            console.warn(`Linha ${index + 2} ignorada (lucros): Não foi possível determinar o valor do lucro/perda.`);
            return;
        }

        if (isNaN(netProfitSats)) {
          console.warn(`Linha ${index + 2} ignorada (lucros): Valor de lucro/perda inválido.`);
          return;
        }

        const newProfit: ProfitRecord = {
          id: generateId(),
          originalId: String(originalId),
          date: "2024-01-01", // TESTE: Data Hardcoded para diagnóstico
          amount: Math.abs(netProfitSats),
          unit: "SATS",
          isProfit: netProfitSats >= 0,
        };
        newProfits.push(newProfit);
      } catch (e) {
        console.error(`Erro ao processar linha ${index + 2} do CSV de lucros/perdas:`, e);
        hasErrors = true;
      }
    });

    if (hasErrors) {
      toast({ title: "Atenção", description: "Algumas linhas do CSV de lucros/perdas podem não ter sido importadas. Verifique o console.", variant: "default", duration: 7000 });
    }

    if (newProfits.length > 0) {
      importData(reportId, undefined, newProfits, { replace: false }); // Usar a função do hook
      toast({ title: "Sucesso", description: `${newProfits.length} registros de lucros/perdas importados para o relatório ativo.` });
    } else if (!hasErrors) {
      toast({ title: "Informação", description: "Nenhum novo registro de lucro/perda encontrado ou todos já existem.", variant: "default" });
    }
    setProfitCsvFile(null);
  };


  const handleImportInvestmentCSV = async () => {
    if (!investmentCsvFile) {
      toast({ title: "Erro", description: "Nenhum arquivo CSV de aportes selecionado.", variant: "destructive" });
      return;
    }
    if (!activeReportIdFromHook) {
      toast({ title: "Erro", description: "Nenhum relatório ativo para importar os dados.", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    try {
      const text = await investmentCsvFile.text();
      const result = Papa.parse(text, { header: true, skipEmptyLines: true });
      if (result.errors.length > 0) {
        console.error("Erros ao parsear CSV de aportes:", result.errors);
        toast({ title: "Erro de CSV", description: "Não foi possível parsear o arquivo CSV de aportes. Verifique o console.", variant: "destructive", duration: 7000 });
        setIsImporting(false);
        return;
      }
      processAndImportInvestments(result.data, activeReportIdFromHook);
    } catch (error) {
      console.error("Erro ao processar o arquivo CSV de aportes:", error);
      toast({ title: "Erro de Importação", description: "Ocorreu um erro ao importar os aportes. Verifique o console.", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportProfitCSV = async () => {
    if (!profitCsvFile) {
      toast({ title: "Erro", description: "Nenhum arquivo CSV de lucros/perdas selecionado.", variant: "destructive" });
      return;
    }
     if (!activeReportIdFromHook) {
      toast({ title: "Erro", description: "Nenhum relatório ativo para importar os dados.", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    try {
      const text = await profitCsvFile.text();
      const result = Papa.parse(text, { header: true, skipEmptyLines: true });
       if (result.errors.length > 0) {
        console.error("Erros ao parsear CSV de lucros:", result.errors);
        toast({ title: "Erro de CSV", description: "Não foi possível parsear o arquivo CSV de lucros/perdas. Verifique o console.", variant: "destructive", duration: 7000 });
        setIsImporting(false);
        return;
      }
      processAndImportProfits(result.data, activeReportIdFromHook);
    } catch (error) {
      console.error("Erro ao processar o arquivo CSV de lucros/perdas:", error);
      toast({ title: "Erro de Importação", description: "Ocorreu um erro ao importar os lucros/perdas. Verifique o console.", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };
  
  // Função para limpar todas as transações (investimentos e lucros) do relatório ATIVO
  const handleClearAllTransactions = () => {
    if (!activeReportIdFromHook) {
      toast({ title: "Erro", description: "Nenhum relatório ativo selecionado.", variant: "destructive" });
      return;
    }
    // Usa updateReportData para limpar os arrays
    updateReportData(activeReportIdFromHook, [], []); 
    toast({ title: "Sucesso", description: "Todas as transações do relatório ativo foram excluídas." });
    setShowClearTransactionsModal(false);
  };


  // Cálculo de totais, médias, etc. (deve usar currentActiveReportObjectFromHook)
  const {
    totalInvestedSats,
    totalInvestedBtc,
    totalInvestedUsd,
    totalInvestedBrl,
    averageBuyPriceUsd,
    averageBuyPriceBrl,
    totalProfitSats,
    totalProfitBtc,
    totalProfitUsd,
    totalProfitBrl,
    netResultSats,
    netResultBtc,
    netResultUsd,
    netResultBrl,
    roi,
    chartData,
    balanceChartData,
    investmentsByMonth,
    profitsByMonth,
    monthlyNetResult,
    reportCurrency, // Adicionado para consistência
    btcBalance, // Saldo total em BTC
    satsBalance // Saldo total em SATS
  } = useMemo(() => {
    return calculateReportMetrics(currentActiveReportObjectFromHook, btcToUsd, brlToUsd, displayCurrency);
  }, [currentActiveReportObjectFromHook, btcToUsd, brlToUsd, displayCurrency]);

  // ... (renderização do componente JSX, usando allReportsFromHook, currentActiveReportObjectFromHook, activeReportIdFromHook etc.)

  // Exemplo de como usar currentActiveReportObjectFromHook na renderização:
  // <h3>{currentActiveReportObjectFromHook ? currentActiveReportObjectFromHook.name : "Nenhum Relatório Selecionado"}</h3>

  // Exemplo de como listar relatórios para seleção:
  // {allReportsFromHook.map(report => (
  //   <SelectItem key={report.id} value={report.id}>
  //     {report.name}
  //   </SelectItem>
  // ))}
  
    const历史记录Columns: ColumnDef<Investment | ProfitRecord>[] = useMemo(() => [
    {
      accessorKey: "date",
      header: "Data",
      // Tipar row explicitamente
      cell: ({ row }: { row: { original: Investment | ProfitRecord; getValue: (key: string) => any } }) => 
        formatDate(row.getValue("date") as string), // Assumir que getValue retorna algo que formatDate pode processar
    },
    {
      accessorKey: "type",
      header: "Tipo",
      cell: ({ row }: { row: { original: Investment | ProfitRecord; getValue: (key: string) => any } }) => {
        const original = row.original;
        // Usar um type guard para diferenciar Investment de ProfitRecord
        if ('isProfit' in original) {
          // É um ProfitRecord
          return original.isProfit ? (
            <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/50">Lucro</Badge>
          ) : (
            <Badge variant="outline" className="bg-red-500/20 text-red-300 border-red-500/50">Prejuízo</Badge>
          );
        } else {
          // É um Investment (ou tipo desconhecido, mas esperamos Investment aqui)
          return <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/50">Aporte</Badge>;
        }
      },
    },
    {
      accessorKey: "amount",
      header: "Valor",
      cell: ({ row }: { row: { original: Investment | ProfitRecord; getValue: (key: string) => any } }) => {
        const original = row.original;
        const amount = parseFloat(row.getValue("amount"));
        
        let unit: CurrencyUnit;
        let isActuallyInvestment: boolean;
        let isActuallyProfit: boolean | undefined = undefined;

        if ('isProfit' in original) {
          // É ProfitRecord
          unit = "SATS"; // ProfitRecord sempre em SATS no nosso modelo de dados atual do hook
          isActuallyInvestment = false;
          isActuallyProfit = original.isProfit;
        } else {
          // É Investment
          unit = original.unit; 
          isActuallyInvestment = true;
        }
        
        let displayAmount = amount;
        let displayUnitLabel = unit;

        if (displayCurrency === "BTC" || displayCurrency === "SATS") { // displayCurrency é um estado do componente
          if (unit === "SATS" && displayCurrency === "BTC") {
            displayAmount = amount / 100_000_000;
            displayUnitLabel = "BTC";
          } else if (unit === "BTC" && displayCurrency === "SATS") {
            displayAmount = amount * 100_000_000;
            displayUnitLabel = "SATS";
          }
        } else if (displayCurrency === "USD" || displayCurrency === "BRL") {
            const amountInBtc = unit === "SATS" ? amount / 100_000_000 : amount;
            displayAmount = displayCurrency === "USD" ? amountInBtc * btcToUsd : amountInBtc * btcToUsd * (1 / brlToUsd);
            displayUnitLabel = displayCurrency as CurrencyUnit; // Cast para alinhar com o tipo de displayUnitLabel
        }
        
        const formattedAmount = displayAmount.toLocaleString(undefined, {
          minimumFractionDigits: displayUnitLabel === "BTC" ? 8 : (displayUnitLabel === "SATS" ? 0 : 2),
          maximumFractionDigits: displayUnitLabel === "BTC" ? 8 : (displayUnitLabel === "SATS" ? 0 : 2),
        });

        return (
          <span className={``}>
            {isActuallyInvestment ? "" : (isActuallyProfit ? "+" : "-")}
            {formattedAmount} {displayUnitLabel}
          </span>
        );
      },
    },
    {
        id: "actions",
        header: "Ações",
        cell: ({ row }: { row: { original: Investment | ProfitRecord; getValue: (key: string) => any } }) => {
            const item = row.original;
            // Usar o mesmo type guard
            if ('isProfit' in item) {
                // É ProfitRecord
                return (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setProfitToDelete(item.id); // item é ProfitRecord aqui
                            setShowDeleteProfitsDialog(true);
                        }}
                    >
                        <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                );
            } else {
                // É Investment
                return (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setInvestmentToDelete(item.id); // item é Investment aqui
                            setShowDeleteInvestmentsDialog(true);
                        }}
                    >
                        <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                );
            }
        },
    },
  ], [displayCurrency, btcToUsd, brlToUsd, currentActiveReportObjectFromHook]); // Adicionado currentActiveReportObjectFromHook como dependência do useMemo


  // Combinar dados para a tabela de histórico
  // A lógica de filtragem por selectedReportIdsForHistoryView será aplicada aqui
  const combinedHistoryData = useMemo(() => {
    let combined: (Investment | ProfitRecord)[] = [];
    const reportsToDisplay = selectedReportIdsForHistoryView.length > 0
      ? allReportsFromHook.filter(r => selectedReportIdsForHistoryView.includes(r.id))
      : (currentActiveReportObjectFromHook ? [currentActiveReportObjectFromHook] : []); // Se nada selecionado, mostrar ativo

    reportsToDisplay.forEach(report => {
      if (report?.investments) combined = combined.concat(report.investments);
      if (report?.profits) combined = combined.concat(report.profits);
    });

    // Ordenar por data, mais recente primeiro
    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allReportsFromHook, currentActiveReportObjectFromHook, selectedReportIdsForHistoryView]);
  
  // Funções para controlar a seleção de relatórios na aba de histórico
  const toggleHistoryReportSelection = (reportId: string) => {
    setSelectedReportIdsForHistoryView(prevSelected =>
      prevSelected.includes(reportId)
        ? prevSelected.filter(id => id !== reportId)
        : [...prevSelected, reportId]
    );
  };

  const selectAllHistoryReports = () => {
    setSelectedReportIdsForHistoryView(allReportsFromHook.map(r => r.id));
  };

  const clearHistoryReportSelection = () => {
    setSelectedReportIdsForHistoryView([]);
  };
  
  // Efeito para resetar seleção do histórico se o relatório ativo mudar e nenhum estiver selecionado
  // ou se o relatório ativo não estiver na seleção.
  useEffect(() => {
    if (activeReportIdFromHook && selectedReportIdsForHistoryView.length > 0 && !selectedReportIdsForHistoryView.includes(activeReportIdFromHook)) {
      // Se o ativo mudou e não está na seleção, limpa a seleção para evitar confusão.
      // Ou poderia adicionar o novo ativo à seleção. Por ora, vamos limpar.
      // setSelectedReportIdsForHistoryView([]);
    } else if (activeReportIdFromHook && selectedReportIdsForHistoryView.length === 0) {
       // Poderia auto-selecionar o ativo se nada estiver selecionado, mas vamos manter explícito.
    }
  }, [activeReportIdFromHook, selectedReportIdsForHistoryView]);


  // ... resto do código ...

  // Dentro do JSX para a aba "Histórico":
  // ...
  // <div className="mt-4 mb-2 space-y-3">
  //   <Label className="text-sm text-purple-400 block mb-2">Selecionar Relatórios para Visualização no Histórico:</Label>
  //   {allReportsFromHook.length > 0 ? (
  //     <>
  //       <div className="flex space-x-2 mb-2">
  //         <Button size="sm" variant="outline" onClick={selectAllHistoryReports} className="bg-black/30 border-purple-700/50 text-xs px-2 py-1 h-7">Selecionar Todos</Button>
  //         <Button size="sm" variant="outline" onClick={clearHistoryReportSelection} className="bg-black/30 border-purple-700/50 text-xs px-2 py-1 h-7">Limpar Seleção</Button>
  //       </div>
  //       <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
  //         {allReportsFromHook.map((report) => (
  //           <div key={report.id} className="flex items-center space-x-2 p-2 rounded-md bg-black/20 border border-purple-700/30">
  //             <Checkbox
  //               id={`history-report-${report.id}`}
  //               checked={selectedReportIdsForHistoryView.includes(report.id)}
  //               onCheckedChange={() => toggleHistoryReportSelection(report.id)}
  //               className="border-purple-500 data-[state=checked]:bg-purple-500"
  //             />
  //             <label
  //               htmlFor={`history-report-${report.id}`}
  //               className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 truncate"
  //               title={report.name}
  //               style={{color: report.color || 'inherit'}}
  //             >
  //               {report.name}
  //             </label>
  //           </div>
  //         ))}
  //       </div>
  //     </>
  //   ) : (
  //     <p className="text-sm text-gray-400">Nenhum relatório disponível.</p>
  //   )}
  // </div>
  // <DataTable columns={historyColumns} data={combinedHistoryData} /> 
  // ...

  // Na seção de seleção de relatório principal (dropdown):
  // <Select value={activeReportIdFromHook || ""} onValueChange={handleSelectReport}>
  //   <SelectTrigger className="w-full md:w-[280px] bg-black/30 border-purple-700/50">
  //     <SelectValue placeholder="Selecione um Relatório" />
  //   </SelectTrigger>
  //   <SelectContent className="bg-gray-900/90 border-purple-700/50 text-white backdrop-blur-md">
  //     {allReportsFromHook.map((report) => (
  //       <SelectItem key={report.id} value={report.id} style={{color: report.color || 'inherit'}}>
  //         {report.name}
  //       </SelectItem>
  //     ))}
  //   </SelectContent>
  // </Select>

  // Ao exibir informações do relatório ativo:
  //  <CardTitle className="text-2xl flex items-center">
  //    <BarChart3 className="mr-2 h-6 w-6 text-purple-400" />
  //    {currentActiveReportObjectFromHook ? currentActiveReportObjectFromHook.name : "Visão Geral"}
  //    {currentActiveReportObjectFromHook && (
  //      <Button variant="ghost" size="sm" onClick={() => setShowEditReportModal(true)} className="ml-2">
  //        <Edit3 className="h-4 w-4" />
  //      </Button>
  //    )}
  //  </CardTitle>
  //  <CardDescription className="text-purple-500/90 dark:text-purple-400/80">
  //    {currentActiveReportObjectFromHook?.description || "Selecione ou crie um relatório para ver os detalhes."}
  //  </CardDescription>


  // Dentro do Modal de edição de relatório:
  // ...
  // value={editingReportName}
  // onChange={(e) => setEditingReportName(e.target.value)}
  // ...
  // value={editingReportDescription}
  // onChange={(e) => setEditingReportDescription(e.target.value)}
  // ...
  // value={editingReportColor}
  // onChange={(e) => setEditingReportColor(e.target.value)}
  // ...
  // onClick={handleUpdateActiveReportDetails}
  // ...

  // Dentro do Modal de exclusão de relatório:
  // ...
  // <AlertDialogAction onClick={handleDeleteActiveReport} className="bg-red-600 hover:bg-red-700">
  // ...

  // Para os botões de limpar investimentos/lucros (se ainda existirem individualmente) ou limpar todas as transações
  // onClick={() => handleDeleteInvestment(investmentToDelete)}
  // onClick={() => handleDeleteProfitRecord(profitToDelete)}
  // onClick={handleClearAllTransactions} // Nova função unificada


  // Para os inputs de data nos modais de adicionar investimento/lucro:
  // selected={investmentDate}
  // onSelect={(date) => setInvestmentDate(date || new Date())}
  // ...
  // selected={profitDate}
  // onSelect={(date) => setProfitDate(date || new Date())}
  // ...

  // A função formatDateToUTC e parseDate já devem estar definidas no arquivo.
  // A função 识别Unit (identificarUnidade) precisa ser definida ou importada se ainda não estiver.
  // Exemplo simples para 识别Unit (pode precisar de melhorias):
  const 识别Unit = (unitStr: string): CurrencyUnit => {
    const lowerUnit = unitStr.toLowerCase();
    if (lowerUnit === "btc") return "BTC";
    return "SATS"; // Default para SATS
  };
  // A função generateId também deve estar disponível (importada de "@/lib/calculator-types" ou definida localmente se necessário)
  // Por exemplo: const generateId = () => \`id-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`;

  // Remover chamadas duplicadas de toast se o hook já as provê.



  if (!reportsDataLoaded) { // USAR reportsDataLoaded
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="h-8 w-8 text-purple-500 animate-spin" />
        <span className="ml-2">Carregando seus dados...</span>
      </div>
    );
  }

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
            {allReportsFromHook && allReportsFromHook.length > 0 ? ( // USAR allReportsFromHook
                <Select value={activeReportIdFromHook || ""} onValueChange={(value) => { if (value) selectReport(value); }}> {/* USAR activeReportIdFromHook e selectReport */}
                    <SelectTrigger className="w-full bg-black/40 border-purple-600/50 focus:border-purple-500 focus:ring-purple-500/50 hover:border-purple-600/70 text-white">
                        <SelectValue placeholder="Selecione um relatório" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/95 border-purple-700/60 text-white">
                        {allReportsFromHook.map(report => ( // USAR allReportsFromHook
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
                  {allReportsFromHook && allReportsFromHook.length > 0 ? ( // USAR allReportsFromHook
                    <>
                      <div className="flex space-x-2 mb-2">
                        {/* MODIFICADO: size="sm" e classes para parecer menor */}
                        <Button size="sm" variant="outline" onClick={selectAllHistoryReports} className="bg-black/30 border-purple-700/50 text-xs px-2 py-1 h-7">Selecionar Todos</Button>
                        <Button size="sm" variant="outline" onClick={clearHistoryReportSelection} className="bg-black/30 border-purple-700/50 text-xs px-2 py-1 h-7">Limpar (Manter 1º)</Button>
                      </div>
                      <ScrollArea className="h-[100px] border border-purple-700/30 bg-black/20 p-2 rounded-md">
                        <div className="space-y-1.5">
                        {allReportsFromHook.map(report => ( // USAR allReportsFromHook
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
              {activeReportIdFromHook && allReportsFromHook && allReportsFromHook.length > 0 && ( // USAR activeReportIdFromHook e allReportsFromHook
                <div className="mt-1 mb-3 p-2 text-xs bg-yellow-900/30 border border-yellow-700/40 text-yellow-300 rounded-md">
                  <HelpCircle className="inline h-3 w-3 mr-1 mb-0.5" /> {/* Usar HelpCircle diretamente */}
                  Lembrete: A exportação e exclusão de dados em massa (botões "Remover todos") afetam apenas o relatório <span className="font-semibold">"{allReportsFromHook.find(r=>r.id === activeReportIdFromHook)?.name || 'selecionado na aba Registrar'}"</span>. {/* USAR allReportsFromHook */}
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
                        {!showFilterOptions && activeReportIdFromHook && ( // USAR activeReportIdFromHook
                          <Button 
                            variant="destructive" 
                            size="sm"
                            className="bg-red-900/70 hover:bg-red-900"
                            onClick={() => setShowDeleteInvestmentsDialog(true)}
                            disabled={!activeReportIdFromHook} 
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remover todos (do relatório "{allReportsFromHook?.find(r=>r.id === activeReportIdFromHook)?.name || ''}")
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
                        {!showFilterOptions && activeReportIdFromHook && ( // USAR activeReportIdFromHook
                          <Button 
                            variant="destructive" 
                            size="sm"
                            className="bg-red-900/70 hover:bg-red-900"
                            onClick={() => setShowDeleteProfitsDialog(true)}
                            disabled={!activeReportIdFromHook} 
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                             Remover todos (do relatório "{allReportsFromHook?.find(r=>r.id === activeReportIdFromHook)?.name || ''}")
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
            <DialogDescription>
              Dê um nome e uma descrição para o seu novo relatório de lucros e perdas.
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
            <Button variant="outline" onClick={() => setShowCreateReportModal(false)}>Cancelar</Button> {/* CORRIGIDO AQUI */}
            <Button onClick={handleCreateReport} className="bg-purple-600 hover:bg-purple-700">Criar Relatório</Button>
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

      {/* Botão para adicionar investimento */}
      <Button onClick={() => setShowAddInvestmentModal(true)} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700">
        <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Investimento
      </Button>
      {/* Modal para adicionar investimento */}
      <Dialog open={showAddInvestmentModal} onOpenChange={setShowAddInvestmentModal}>
        <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Adicionar Investimento ao Relatório "{currentActiveReportObjectFromHook?.name || 'Atual'}"</DialogTitle>
            <DialogDescription>
              Registre um investimento realizado.
            </DialogDescription>
          </DialogHeader>
          {/* ... (inputs do formulário de investimento) ... */}
          <div className="grid gap-4 py-4">
            {/* Amount */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="investment-amount" className="text-right">
                Quantia (SATS)
              </Label>
              <Input
                id="investment-amount"
                type="number"
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(e.target.value)}
                className="col-span-3 bg-gray-700 border-gray-600 placeholder-gray-500"
                placeholder="Ex: 100000"
              />
            </div>
            {/* Unit - Removido pois Investment é sempre SATS na lógica atual do hook */}
            {/* Date */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="investment-date" className="text-right">
                Data
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "col-span-3 justify-start text-left font-normal bg-gray-700 border-gray-600 hover:bg-gray-600",
                      !investmentDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {investmentDate ? formatDate(investmentDate, 'P') : <span>Escolha uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700" align="start">
                  <Calendar
                    mode="single"
                    selected={investmentDate}
                    onSelect={(date) => setInvestmentDate(date || new Date())}
                    initialFocus
                    className="bg-gray-800 text-white"
                  />
                </PopoverContent>
              </Popover>
            </div>
            {/* Original ID */}
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="investment-original-id" className="text-right">
                ID Original (Opcional)
              </Label>
              <Input
                id="investment-original-id"
                value={investmentOriginalId}
                onChange={(e) => setInvestmentOriginalId(e.target.value)}
                className="col-span-3 bg-gray-700 border-gray-600 placeholder-gray-500"
                placeholder="ID da transação original, se houver"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddInvestmentModal(false)}>Cancelar</Button>
            <Button onClick={() => handleAddInvestment()} className="bg-blue-600 hover:bg-blue-700">Salvar Aporte</Button> 
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Botão para adicionar lucro/prejuízo */}
      <Button onClick={() => setShowAddProfitModal(true)} className="w-full md:w-auto bg-green-600 hover:bg-green-700">
        <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Lucro/Prejuízo
      </Button>
      {/* Modal para adicionar lucro/perda */}
      <Dialog open={showAddProfitModal} onOpenChange={setShowAddProfitModal}>
        <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Adicionar Lucro/Prejuízo ao Relatório "{currentActiveReportObjectFromHook?.name || 'Atual'}"</DialogTitle>
            <DialogDescription>
              Registre um lucro ou prejuízo obtido.
            </DialogDescription>
          </DialogHeader>
          {/* ... (inputs do formulário de lucro/prejuízo) ... */}
          <div className="grid gap-4 py-4">
            {/* Amount */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="profit-amount" className="text-right">
                Quantia (SATS)
              </Label>
              <Input
                id="profit-amount"
                type="number"
                value={profitAmount}
                onChange={(e) => setProfitAmount(e.target.value)}
                className="col-span-3 bg-gray-700 border-gray-600 placeholder-gray-500"
                placeholder="Ex: 100000"
              />
            </div>
            {/* Unit - Removido pois ProfitRecord é sempre SATS na lógica atual do hook */}
            {/* Date */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="profit-date" className="text-right">
                Data
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "col-span-3 justify-start text-left font-normal bg-gray-700 border-gray-600 hover:bg-gray-600",
                      !profitDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {profitDate ? formatDate(profitDate, 'P') : <span>Escolha uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700" align="start">
                  <Calendar
                    mode="single"
                    selected={profitDate}
                    onSelect={(date) => setProfitDate(date || new Date())}
                    initialFocus
                    className="bg-gray-800 text-white"
                  />
                </PopoverContent>
              </Popover>
            </div>
            {/* Type (Lucro/Prejuízo) */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="profit-type" className="text-right">
                Tipo
              </Label>
              <Select value={isProfit ? "profit" : "loss"} onValueChange={(value) => setIsProfit(value === "profit")}>
                <SelectTrigger className="col-span-3 bg-gray-700 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="profit">Lucro</SelectItem>
                  <SelectItem value="loss">Prejuízo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Original ID */}
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="profit-original-id" className="text-right">
                ID Original (Opcional)
              </Label>
              <Input
                id="profit-original-id"
                value={profitOriginalId}
                onChange={(e) => setProfitOriginalId(e.target.value)}
                className="col-span-3 bg-gray-700 border-gray-600 placeholder-gray-500"
                placeholder="ID da transação original, se houver"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddProfitModal(false)}>Cancelar</Button>
            <Button onClick={() => handleAddProfitRecord()} className="bg-green-600 hover:bg-green-700">Salvar Registro</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const dynamic = 'force-dynamic';