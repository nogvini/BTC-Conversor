"use client"

import { useState, useEffect, useMemo } from "react"
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
  Download
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { format, subMonths, addMonths, startOfMonth, endOfMonth, isWithinInterval, isBefore } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import AnimatedCounter from "./animated-counter"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getCurrentBitcoinPrice } from "@/lib/client-api"
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useIsMobile } from "@/hooks/use-mobile"
import { ResponsiveContainer } from "@/components/ui/responsive-container"

type CurrencyUnit = "BTC" | "SATS"
type CurrencyType = "BTC" | "SATS" | "USD" | "BRL"
type DisplayCurrency = "USD" | "BRL"

interface Investment {
  id: string
  date: string
  amount: number
  unit: CurrencyUnit
}

interface ProfitRecord {
  id: string
  date: string
  amount: number
  unit: CurrencyUnit
  isProfit: boolean // true for profit, false for loss
}

interface AppData {
  currentPrice: {
    usd: number
    brl: number
  }
  isUsingCache: boolean
}

interface ProfitCalculatorProps {
  btcToUsd: number
  brlToUsd: number
  appData?: AppData
}

export default function ProfitCalculator({ btcToUsd, brlToUsd, appData }: ProfitCalculatorProps) {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [profits, setProfits] = useState<ProfitRecord[]>([])
  const [activeTab, setActiveTab] = useState<string>("register")
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())
  const [isDataLoaded, setIsDataLoaded] = useState(false)
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("USD")
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [successMessage, setSuccessMessage] = useState({ title: "", description: "" })
  const [currentRates, setCurrentRates] = useState({ btcToUsd, brlToUsd })
  const [loading, setLoading] = useState(false)
  const [usingFallbackRates, setUsingFallbackRates] = useState(false)

  // Form states
  const [investmentAmount, setInvestmentAmount] = useState<string>("")
  const [investmentUnit, setInvestmentUnit] = useState<CurrencyUnit>("SATS")
  const [investmentDate, setInvestmentDate] = useState<Date>(new Date())

  const [profitAmount, setProfitAmount] = useState<string>("")
  const [profitUnit, setProfitUnit] = useState<CurrencyUnit>("SATS")
  const [profitDate, setProfitDate] = useState<Date>(new Date())
  const [isProfit, setIsProfit] = useState<boolean>(true)

  const isMobile = useIsMobile()

  // Adicionar um novo estado para controlar exportação
  const [isExporting, setIsExporting] = useState(false);

  // Atualizar as taxas de conversão quando as props mudarem
  useEffect(() => {
    // Se temos dados da aplicação, usar as taxas de lá
    if (appData) {
      const newRates = {
        btcToUsd: appData.currentPrice.usd,
        brlToUsd: appData.currentPrice.brl / appData.currentPrice.usd
      }
      setCurrentRates(newRates)
      setUsingFallbackRates(appData.isUsingCache || appData.currentPrice.isUsingCache)
    } else {
      // Caso contrário, usar as taxas passadas como props
      setCurrentRates({ btcToUsd, brlToUsd })
      setUsingFallbackRates(btcToUsd === 65000 && brlToUsd === 5.2)
    }
  }, [btcToUsd, brlToUsd, appData])

  // Função para atualizar as taxas de conversão
  const updateRates = async () => {
    if (appData) {
      // Se temos appData, o componente pai já está cuidando da atualização
      toast({
        title: "Atualizando...",
        description: "Use o botão 'Atualizar Preços' no topo da página para atualizar todas as taxas.",
      })
    } else {
      // Versão antiga se não tivermos appData
      setLoading(true)
      try {
        const priceData = await getCurrentBitcoinPrice()
        if (priceData) {
          setCurrentRates({
            btcToUsd: priceData.usd,
            brlToUsd: priceData.brl / priceData.usd,
          })
          setUsingFallbackRates(priceData.isUsingCache)
          toast({
            title: "Taxas atualizadas",
            description: `Bitcoin: ${priceData.usd.toLocaleString()} USD`,
          })
        }
      } catch (error) {
        console.error("Erro ao atualizar taxas:", error)
        toast({
          title: "Erro ao atualizar taxas",
          description: "Usando as últimas taxas disponíveis.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
  }

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedInvestments = localStorage.getItem("bitcoinInvestments")
    const savedProfits = localStorage.getItem("bitcoinProfits")
    const savedDisplayCurrency = localStorage.getItem("bitcoinDisplayCurrency")

    if (savedInvestments) {
      try {
        setInvestments(JSON.parse(savedInvestments))
      } catch (e) {
        console.error("Erro ao analisar investimentos salvos:", e)
      }
    }

    if (savedProfits) {
      try {
        setProfits(JSON.parse(savedProfits))
      } catch (e) {
        console.error("Erro ao analisar lucros salvos:", e)
      }
    }

    if (savedDisplayCurrency) {
      try {
        setDisplayCurrency(JSON.parse(savedDisplayCurrency) as DisplayCurrency)
      } catch (e) {
        console.error("Erro ao analisar moeda de exibição salva:", e)
      }
    }

    setIsDataLoaded(true)

    // Atualizar taxas ao montar o componente
    updateRates()
  }, [])

  // Save data to localStorage whenever they change
  useEffect(() => {
    if (isDataLoaded) {
      localStorage.setItem("bitcoinInvestments", JSON.stringify(investments))
    }
  }, [investments, isDataLoaded])

  useEffect(() => {
    if (isDataLoaded) {
      localStorage.setItem("bitcoinProfits", JSON.stringify(profits))
    }
  }, [profits, isDataLoaded])

  useEffect(() => {
    if (isDataLoaded) {
      localStorage.setItem("bitcoinDisplayCurrency", JSON.stringify(displayCurrency))
    }
  }, [displayCurrency, isDataLoaded])

  // Add new investment
  const addInvestment = () => {
    if (!investmentAmount || isNaN(Number(investmentAmount)) || Number(investmentAmount) <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira um valor válido maior que zero.",
        variant: "destructive",
      })
      return
    }

    const newInvestment: Investment = {
      id: Date.now().toString(),
      date: format(investmentDate, "yyyy-MM-dd"),
      amount: Number(investmentAmount),
      unit: investmentUnit,
    }

    setInvestments([...investments, newInvestment])
    setInvestmentAmount("")

    // Mostrar diálogo de sucesso
    setSuccessMessage({
      title: "Aporte registrado com sucesso!",
      description: `Seu aporte de ${formatCryptoAmount(newInvestment.amount, newInvestment.unit)} foi registrado.`,
    })
    setShowSuccessDialog(true)

    toast({
      title: "Aporte registrado",
      description: `Aporte de ${formatCryptoAmount(newInvestment.amount, newInvestment.unit)} registrado com sucesso.`,
    })
  }

  // Add new profit/loss record
  const addProfitRecord = () => {
    if (!profitAmount || isNaN(Number(profitAmount)) || Number(profitAmount) <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira um valor válido maior que zero.",
        variant: "destructive",
      })
      return
    }

    const newProfit: ProfitRecord = {
      id: Date.now().toString(),
      date: format(profitDate, "yyyy-MM-dd"),
      amount: Number(profitAmount),
      unit: profitUnit,
      isProfit,
    }

    setProfits([...profits, newProfit])
    setProfitAmount("")

    // Mostrar diálogo de sucesso
    setSuccessMessage({
      title: isProfit ? "Lucro registrado com sucesso!" : "Perda registrada com sucesso!",
      description: `Seu ${isProfit ? "lucro" : "perda"} de ${formatCryptoAmount(newProfit.amount, newProfit.unit)} foi registrado.`,
    })
    setShowSuccessDialog(true)

    toast({
      title: isProfit ? "Lucro registrado" : "Perda registrada",
      description: `${isProfit ? "Lucro" : "Perda"} de ${formatCryptoAmount(newProfit.amount, newProfit.unit)} registrado com sucesso.`,
    })
  }

  // Delete investment
  const deleteInvestment = (id: string) => {
    setInvestments(investments.filter((investment) => investment.id !== id))
    toast({
      title: "Aporte removido",
      description: "O aporte foi removido com sucesso.",
    })
  }

  // Delete profit record
  const deleteProfit = (id: string) => {
    setProfits(profits.filter((profit) => profit.id !== id))
    toast({
      title: "Registro removido",
      description: "O registro de lucro/perda foi removido com sucesso.",
    })
  }

  // Convert between BTC and SATS
  const convertToSats = (amount: number, unit: CurrencyUnit): number => {
    return unit === "BTC" ? amount * 100000000 : amount
  }

  const convertToBtc = (amount: number, unit: CurrencyUnit): number => {
    return unit === "SATS" ? amount / 100000000 : amount
  }

  // Calculate total investments in BTC
  const calculateTotalInvestments = (): number => {
    return investments.reduce((total, investment) => {
      return total + convertToBtc(investment.amount, investment.unit)
    }, 0)
  }

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setSelectedMonth(subMonths(selectedMonth, 1))
  }

  // Navigate to next month
  const goToNextMonth = () => {
    const nextMonth = addMonths(selectedMonth, 1)
    if (nextMonth <= new Date()) {
      setSelectedMonth(nextMonth)
    }
  }

  // Calculate investments for the period (current month + previous months)
  const calculatePeriodInvestments = useMemo(() => {
    const monthEnd = endOfMonth(selectedMonth)

    // Filter investments up to the end of the selected month
    const periodInvestments = investments.filter((investment) => {
      const investmentDate = new Date(investment.date)
      return isBefore(investmentDate, monthEnd) || investmentDate.getTime() === monthEnd.getTime()
    })

    // Calculate total in BTC
    const totalBtc = periodInvestments.reduce((total, investment) => {
      return total + convertToBtc(investment.amount, investment.unit)
    }, 0)

    return {
      btc: totalBtc,
      sats: totalBtc * 100000000,
      usd: totalBtc * currentRates.btcToUsd,
      brl: totalBtc * currentRates.btcToUsd * currentRates.brlToUsd,
    }
  }, [selectedMonth, investments, currentRates])

  // Calculate profits for the selected month
  const calculateMonthProfits = useMemo(() => {
    const monthStart = startOfMonth(selectedMonth)
    const monthEnd = endOfMonth(selectedMonth)

    // Filter profits from the selected month
    const monthProfits = profits.filter((profit) => {
      const profitDate = new Date(profit.date)
      return isWithinInterval(profitDate, { start: monthStart, end: monthEnd })
    })

    // Calculate total profit in BTC
    const totalProfitBtc = monthProfits.reduce((total, profit) => {
      const btcAmount = convertToBtc(profit.amount, profit.unit)
      return profit.isProfit ? total + btcAmount : total - btcAmount
    }, 0)

    // Convert to other currencies
    return {
      btc: totalProfitBtc,
      sats: totalProfitBtc * 100000000,
      usd: totalProfitBtc * currentRates.btcToUsd,
      brl: totalProfitBtc * currentRates.btcToUsd * currentRates.brlToUsd,
    }
  }, [selectedMonth, profits, currentRates])

  const totalInvestments = useMemo(() => calculateTotalInvestments(), [investments])

  // Adicionar o cálculo do saldo total (após a definição de calculateMonthProfits)
  const calculateTotalBalance = useMemo(() => {
    // Calcular todos os lucros acumulados
    const totalProfitBtc = profits.reduce((total, profit) => {
      const btcAmount = convertToBtc(profit.amount, profit.unit)
      return profit.isProfit ? total + btcAmount : total - btcAmount
    }, 0)

    // Saldo = Total investido + Lucros acumulados
    const balanceBtc = totalInvestments + totalProfitBtc

    return {
      btc: balanceBtc,
      sats: balanceBtc * 100000000,
      usd: balanceBtc * currentRates.btcToUsd,
      brl: balanceBtc * currentRates.btcToUsd * currentRates.brlToUsd,
    }
  }, [totalInvestments, profits, currentRates])

  // Format crypto amount with unit
  const formatCryptoAmount = (amount: number, unit: CurrencyUnit): string => {
    if (unit === "BTC") {
      return `${amount.toFixed(8)} BTC`
    } else {
      return `${amount.toLocaleString()} SATS`
    }
  }

  // Format currency amount
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
  }

  // Sort records by date (newest first)
  const sortedInvestments = useMemo(
    () => [...investments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [investments],
  )

  const sortedProfits = useMemo(
    () => [...profits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [profits],
  )

  // Filter investments and profits for the selected month
  const monthInvestments = useMemo(() => {
    const monthStart = startOfMonth(selectedMonth)
    const monthEnd = endOfMonth(selectedMonth)

    return sortedInvestments.filter((investment) => {
      const investmentDate = new Date(investment.date)
      return isWithinInterval(investmentDate, { start: monthStart, end: monthEnd })
    })
  }, [sortedInvestments, selectedMonth])

  const monthProfits = useMemo(() => {
    const monthStart = startOfMonth(selectedMonth)
    const monthEnd = endOfMonth(selectedMonth)

    return sortedProfits.filter((profit) => {
      const profitDate = new Date(profit.date)
      return isWithinInterval(profitDate, { start: monthStart, end: monthEnd })
    })
  }, [sortedProfits, selectedMonth])

  const profitPercentage = useMemo(
    () => (calculatePeriodInvestments.btc > 0 ? (calculateMonthProfits.btc / calculatePeriodInvestments.btc) * 100 : 0),
    [calculatePeriodInvestments.btc, calculateMonthProfits.btc],
  )

  // Check if we can navigate to next month (not in the future)
  const canGoNext = useMemo(() => {
    const nextMonth = addMonths(selectedMonth, 1)
    return nextMonth <= new Date()
  }, [selectedMonth])

  // Verifica se o mês selecionado é o mês atual
  const isCurrentMonth = (date: Date): boolean => {
    const today = new Date()
    return (
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  // Função para alternar a moeda de exibição
  const toggleDisplayCurrency = () => {
    setDisplayCurrency(displayCurrency === "USD" ? "BRL" : "USD")
  }

  // Função melhorada para exportação Excel com margens, tamanho otimizado das células e adição de informações de lucro percentual.
  const exportToExcel = async (data: any[], filename: string, sheetTitle: string, investmentInfo?: {
    totalInvestedBTC: number;
    totalInvestedUSD: number;
    totalInvestedBRL: number;
  }) => {
    try {
    // Criar novo workbook
    const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Raid Bitcoin Toolkit';
      workbook.lastModifiedBy = 'Raid Bitcoin Toolkit';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Adicionar uma planilha
    const worksheet = workbook.addWorksheet('Relatório', {
      properties: { tabColor: { argb: '6b21a8' } }, // Cor roxa
        pageSetup: {
          paperSize: 9, // A4
          orientation: 'portrait',
          margins: {
            left: 0.7,
            right: 0.7,
            top: 0.75,
            bottom: 0.75,
            header: 0.3,
            footer: 0.3
          }
        }
    });
    
      // Definir larguras das colunas
      worksheet.columns = [
        { header: 'Data', key: 'data', width: 15 },
        { header: 'Tipo', key: 'tipo', width: 15 },
        { header: 'Valor', key: 'valor', width: 20 },
        { header: 'Valor BTC', key: 'valorBtc', width: 20 },
        { header: 'Valor USD', key: 'valorUsd', width: 20 },
        { header: 'Valor BRL', key: 'valorBrl', width: 20 },
        { header: 'Lucro %', key: 'lucroPerc', width: 15 }
      ];
      
      // Mesclar células para título principal (agora 7 colunas)
      worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = sheetTitle;
    titleCell.font = {
      bold: true,
      size: 16,
      color: { argb: 'FFFFFFFF' }
    };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '6b21a8' }
    };
    titleCell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
    };
    worksheet.getRow(1).height = 30;
      
      // Adicionar data e hora de geração do relatório
      worksheet.mergeCells('A2:G2');
      const dateCell = worksheet.getCell('A2');
      dateCell.value = `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}`;
      dateCell.font = {
        italic: true,
        size: 10,
        color: { argb: 'FFBBBBBB' }
      };
      dateCell.alignment = {
        horizontal: 'right'
      };
    
    // Adicionar linha em branco
    worksheet.addRow([]);
    
      // Definir cabeçalhos da tabela (linha 4)
      const headerRow = worksheet.getRow(4);
      headerRow.values = ['Data', 'Tipo', 'Valor', 'Valor BTC', 'Valor USD', 'Valor BRL', 'Lucro %'];
    headerRow.eachCell((cell) => {
      cell.font = {
        bold: true,
        color: { argb: 'FFFFFFFF' }
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4c1d95' }
      };
      cell.alignment = {
          horizontal: 'center',
          vertical: 'middle'
        };
        cell.border = {
          top: { style: 'thin', color: { argb: '6b21a8' } },
          left: { style: 'thin', color: { argb: '6b21a8' } },
          bottom: { style: 'thin', color: { argb: '6b21a8' } },
          right: { style: 'thin', color: { argb: '6b21a8' } }
      };
    });
    headerRow.height = 25;
    
    // Adicionar dados
    let totalBTC = 0;
    let totalUSD = 0;
    let totalBRL = 0;
    
      // Calcular o total investido no período (se houver informações de investimento)
      const investmentInPeriod = investmentInfo ? investmentInfo.totalInvestedBTC : 0;
      
      data.forEach((item, index) => {
      // Converter strings para números para cálculos
      const btcValue = parseFloat(item.ValorBTC);
      const usdValue = parseFloat(item.ValorUSD);
      const brlValue = parseFloat(item.ValorBRL);
      
      // Calcular totais (sempre somando, pois agora são apenas lucros)
      totalBTC += btcValue;
      totalUSD += usdValue;
      totalBRL += brlValue;
      
        // Calcular percentual de lucro em relação ao investimento
        const percentProfit = investmentInPeriod > 0 ? 
          ((btcValue / investmentInPeriod) * 100).toFixed(2) + '%' : 'N/A';
      
      // Adicionar linha de dados
        const rowNumber = index + 5; // Começa na linha 5 (após header)
        const row = worksheet.getRow(rowNumber);
        row.values = [
        item.Data,
        item.Tipo,
        item.Valor,
        item.ValorBTC,
        `$${item.ValorUSD}`,
          `R$${item.ValorBRL}`,
          percentProfit
        ];
      
      // Formatar células (sempre como lucro - verde)
      const colorCode = 'FF10B981'; // Verde para lucro
      
        // Aplicar estilos e bordas em cada célula da linha
        row.eachCell((cell, colNumber) => {
          // Bordas para todas as células
          cell.border = {
            top: { style: 'thin', color: { argb: '6b21a8' } },
            left: { style: 'thin', color: { argb: '6b21a8' } },
            bottom: { style: 'thin', color: { argb: '6b21a8' } },
            right: { style: 'thin', color: { argb: '6b21a8' } }
      };
      
          // Aplicar alinhamento com base na coluna
          if (colNumber === 1) { // Data
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (colNumber === 2) { // Tipo
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.font = { color: { argb: colorCode } };
          } else if (colNumber === 7) { // Percentual
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.font = { color: { argb: colorCode } };
          } else { // Valores
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
          }
        });
        
        // Altura da linha
        row.height = 22;
      });
      
      // Adicionar linha em branco
      const blankRow = worksheet.addRow([]);
      blankRow.height = 10;
    
    // Adicionar linha de totais
      const totalRowNumber = data.length + 6; // após última linha de dados + linha em branco
      const totalRow = worksheet.getRow(totalRowNumber);
      totalRow.values = [
        'TOTAL',
        '',
        '',
      totalBTC.toFixed(8),
      `$${totalUSD.toFixed(2)}`,
        `R$${totalBRL.toFixed(2)}`,
        investmentInPeriod > 0 ? 
          ((totalBTC / investmentInPeriod) * 100).toFixed(2) + '%' : 'N/A'
      ];
      
      // Mesclar células para "TOTAL"
      worksheet.mergeCells(`A${totalRowNumber}:C${totalRowNumber}`);
    
    // Formatar células de totais
      totalRow.eachCell((cell, colNumber) => {
        cell.font = { bold: true };
        
        // Bordas para todas as células
        cell.border = {
          top: { style: 'medium', color: { argb: '6b21a8' } },
          left: { style: 'thin', color: { argb: '6b21a8' } },
          bottom: { style: 'medium', color: { argb: '6b21a8' } },
          right: { style: 'thin', color: { argb: '6b21a8' } }
        };
    
    // Cor dos totais sempre verde (lucro)
    const totalColorCode = 'FF10B981';
        
        if (colNumber === 1) { // TOTAL (célula mesclada)
          cell.font = {
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
          cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4c1d95' }
    };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber >= 4) { // Valores
          cell.font = {
      bold: true,
      color: { argb: totalColorCode }
    };
    
          if (colNumber === 7) { // Percentual
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
          }
        }
      });
      
      totalRow.height = 25;
    
    // Adicionar informações de investimento se fornecidas
    if (investmentInfo) {
      // Adicionar linha em branco para separar
        const spacerRow = worksheet.addRow([]);
        spacerRow.height = 15;
        
        // Adicionar seção de resumo
        const summaryRow = worksheet.getRow(totalRowNumber + 2);
        worksheet.mergeCells(`A${totalRowNumber + 2}:G${totalRowNumber + 2}`);
        const summaryCell = worksheet.getCell(`A${totalRowNumber + 2}`);
        summaryCell.value = 'RESUMO DE INVESTIMENTOS E RETORNOS';
        summaryCell.font = {
          bold: true,
          size: 12,
          color: { argb: 'FFFFFFFF' }
        };
        summaryCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4c1d95' }
        };
        summaryCell.alignment = {
          horizontal: 'center',
          vertical: 'middle'
        };
        summaryRow.height = 25;
      
        // Criar tabela de resumo com 3 colunas: Métrica, Valor, Percentual
        const summaryHeaders = worksheet.getRow(totalRowNumber + 3);
        summaryHeaders.values = ['Métrica', 'Valor BTC', 'Valor USD', 'Valor BRL', 'Retorno %', '', ''];
        worksheet.mergeCells(`E${totalRowNumber + 3}:G${totalRowNumber + 3}`);
        
        summaryHeaders.eachCell((cell, colNumber) => {
          if (colNumber <= 5) {
            cell.font = {
              bold: true,
              color: { argb: 'FFFFFFFF' }
            };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: '6b21a8' }
            };
            cell.alignment = {
              horizontal: 'center',
              vertical: 'middle'
            };
            cell.border = {
              top: { style: 'thin', color: { argb: '6b21a8' } },
              left: { style: 'thin', color: { argb: '6b21a8' } },
              bottom: { style: 'thin', color: { argb: '6b21a8' } },
              right: { style: 'thin', color: { argb: '6b21a8' } }
            };
          }
        });
        
        summaryHeaders.height = 22;
        
        // Linha de investimento total
        const investmentRow = worksheet.getRow(totalRowNumber + 4);
        investmentRow.values = [
          'Total Investido',
          investmentInfo.totalInvestedBTC.toFixed(8),
          `$${investmentInfo.totalInvestedUSD.toFixed(2)}`,
          `R$${investmentInfo.totalInvestedBRL.toFixed(2)}`,
          '100%'
        ];
        
        // Linha de lucro
        const profitRow = worksheet.getRow(totalRowNumber + 5);
        profitRow.values = [
          'Total de Lucro',
          totalBTC.toFixed(8),
          `$${totalUSD.toFixed(2)}`,
          `R$${totalBRL.toFixed(2)}`,
          ((totalBTC / investmentInfo.totalInvestedBTC) * 100).toFixed(2) + '%'
        ];
      
        // Linha de saldo final (investimento + lucro)
        const balanceRow = worksheet.getRow(totalRowNumber + 6);
        balanceRow.values = [
          'Saldo Final',
          (investmentInfo.totalInvestedBTC + totalBTC).toFixed(8),
          `$${(investmentInfo.totalInvestedUSD + totalUSD).toFixed(2)}`,
          `R$${(investmentInfo.totalInvestedBRL + totalBRL).toFixed(2)}`,
          ((1 + totalBTC / investmentInfo.totalInvestedBTC) * 100).toFixed(2) + '%'
        ];
      
        // Formato de cada linha
        [investmentRow, profitRow, balanceRow].forEach((row) => {
          row.eachCell((cell, colNumber) => {
            cell.border = {
              top: { style: 'thin', color: { argb: '6b21a8' } },
              left: { style: 'thin', color: { argb: '6b21a8' } },
              bottom: { style: 'thin', color: { argb: '6b21a8' } },
              right: { style: 'thin', color: { argb: '6b21a8' } }
            };
            
            if (colNumber === 1) { // Métrica
              cell.font = { bold: true };
              cell.alignment = { horizontal: 'left', vertical: 'middle' };
            } else if (colNumber === 5) { // Percentual
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
              
              // Cor específica para cada linha
              if (row === investmentRow) {
                cell.font = { color: { argb: 'FFBBBBBB' } };
              } else if (row === profitRow) {
                cell.font = { color: { argb: 'FF10B981' } }; // Verde para lucro
              } else if (row === balanceRow) {
                cell.font = { bold: true, color: { argb: 'FF10B981' } };
              }
            } else { // Valores
              cell.alignment = { horizontal: 'right', vertical: 'middle' };
              
              // Estilo especial para linha de saldo
              if (row === balanceRow) {
                cell.font = { bold: true };
              }
            }
          });
          
          row.height = 22;
        });
        
        // Adicionar bordas mais espessas para o saldo final
        balanceRow.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: '6b21a8' } },
            left: { style: 'thin', color: { argb: '6b21a8' } },
            bottom: { style: 'medium', color: { argb: '6b21a8' } },
            right: { style: 'thin', color: { argb: '6b21a8' } }
          };
        });
    }
    
    // Gerar arquivo Excel
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
    // Usar múltiplos métodos para garantir o download em diferentes ambientes
    try {
      try {
        // Método 1: FileSaver.js saveAs
    saveAs(blob, filename);
        console.log('Download iniciado via saveAs');
      } catch (saveError) {
        console.error('Erro no saveAs:', saveError);

        try {
          // Método 2: createObjectURL + elemento <a>
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          
          // Forçar um pequeno atraso antes de clicar para garantir que o DOM atualize
          setTimeout(() => {
            a.click();
            setTimeout(() => {
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
            }, 100);
          }, 100);
          
          console.log('Download iniciado via método alternativo 1');
        } catch (altError) {
          console.error('Erro no método alternativo 1:', altError);
          
          // Método 3: dataURL fallback para navegadores mais antigos
          try {
            const reader = new FileReader();
            reader.onload = function() {
              const dataUrl = reader.result as string;
              const link = document.createElement('a');
              link.href = dataUrl;
              link.download = filename;
              link.click();
              console.log('Download iniciado via método alternativo 2 (dataURL)');
            };
            reader.readAsDataURL(blob);
          } catch (dataUrlError) {
            console.error('Todos os métodos de download falharam:', dataUrlError);
            throw new Error('Não foi possível iniciar o download do arquivo');
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Erro durante a exportação do Excel:', error);
      throw error;
    }
  };

  // Modificar a função exportProfitData para melhorar o feedback e garantir o download
  const exportProfitData = async (allTime: boolean = false) => {
    try {
      // Mostrar toast com feedback mais claro sobre a exportação
      const loadingToastId = toast({
        title: "Preparando exportação",
        description: "Gerando arquivo Excel, aguarde um momento...",
        duration: 5000,
      }).id;
      
    // Preparar dados em formato adequado para exportação
    let dataToExport;
    let filename;
    
    // Calcular o total investido em BTC
    const totalInvestedBTC = calculateTotalInvestments();
    const totalInvestedUSD = totalInvestedBTC * currentRates.btcToUsd;
    const totalInvestedBRL = totalInvestedUSD * currentRates.brlToUsd;
    
    if (allTime) {
      // Exportação de todos os tempos
        dataToExport = profits.map(profit => {
          const btcValue = convertToBtc(profit.amount, profit.unit);
          return {
        Data: new Date(profit.date).toLocaleDateString(),
            Tipo: profit.isProfit ? 'Lucro' : 'Perda',
        Valor: formatCryptoAmount(profit.amount, profit.unit),
            ValorBTC: btcValue.toFixed(8),
            ValorUSD: (btcValue * currentRates.btcToUsd).toFixed(2),
            ValorBRL: (btcValue * currentRates.btcToUsd * currentRates.brlToUsd).toFixed(2)
          };
        });
      
      // Nome do arquivo com "histórico-completo"
        filename = `raid-btc-historico-completo-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    } else {
      // Exportação do mês atual
      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);
      
      // Filtrar apenas lucros do mês selecionado
      const monthProfits = profits.filter(profit => {
        const profitDate = new Date(profit.date);
        return isWithinInterval(profitDate, { start: monthStart, end: monthEnd });
      });
      
        dataToExport = monthProfits.map(profit => {
          const btcValue = convertToBtc(profit.amount, profit.unit);
          return {
        Data: new Date(profit.date).toLocaleDateString(),
            Tipo: profit.isProfit ? 'Lucro' : 'Perda',
        Valor: formatCryptoAmount(profit.amount, profit.unit),
            ValorBTC: btcValue.toFixed(8),
            ValorUSD: (btcValue * currentRates.btcToUsd).toFixed(2),
            ValorBRL: (btcValue * currentRates.btcToUsd * currentRates.brlToUsd).toFixed(2)
          };
        });
      
      // Nome do arquivo incluindo o mês e ano
      const monthName = format(selectedMonth, 'MMMM-yyyy', { locale: ptBR });
        filename = `raid-btc-${monthName}.xlsx`;
      }

      // Verificar se temos dados para exportar
      if (dataToExport.length === 0) {
        toast({
          title: "Sem dados para exportar",
          description: "Não há registros para exportar no período selecionado.",
          variant: "destructive"
        });
        return;
    }

    // Título da planilha incluindo o período
      const sheetTitle = allTime ? 'Raid Bitcoin Toolkit - Histórico Completo' : 
                                 `Raid Bitcoin Toolkit - ${format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}`;
    
      // Exportar dados com informações de investimento
      const success = await exportToExcel(dataToExport, filename, sheetTitle, {
        totalInvestedBTC,
        totalInvestedUSD,
        totalInvestedBRL
      });
      
      if (success) {
        // Fechar o toast de carregamento, se existir
        if (loadingToastId) {
          toast.dismiss(loadingToastId);
        }
      
      // Notificação de sucesso usando o toast
      toast({
          title: "Exportação concluída com sucesso",
        description: allTime ? 
            "O relatório histórico completo foi exportado. Se o download não iniciar automaticamente, verifique as permissões do navegador." : 
            `O relatório de ${format(selectedMonth, 'MMMM/yyyy', { locale: ptBR })} foi exportado. Se o download não iniciar automaticamente, verifique as permissões do navegador.`,
          variant: "success",
          duration: 6000
        });
      }
    } catch (error) {
      console.error("Erro detalhado ao exportar dados:", error);
      
      // Notificação de erro usando o toast com dicas mais específicas
      toast({
        title: "Erro na exportação",
        description: "Não foi possível completar o download. Tente: 1) Verificar permissões do navegador, 2) Desativar bloqueadores de popups, ou 3) Usar outro navegador.",
        variant: "destructive",
        duration: 8000
      });
    }
  };

  // Atualizar a função handleExportButtonClick
  const handleExportButtonClick = async () => {
    if (isExporting) return; // Evitar múltiplos cliques

    if (profits.length === 0) {
      toast({
        title: "Sem dados para exportar",
        description: "Não há registros de lucros ou perdas para exportar.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsExporting(true);
    // Exportar o mês selecionado por padrão
      await exportProfitData(false);
    } finally {
      setIsExporting(false);
    }
  }

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
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="investment-amount">Valor do Aporte</Label>
                  <Input
                    id="investment-amount"
                    type="number"
                    step="any"
                    placeholder="Valor"
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(e.target.value)}
                    className="bg-black/30 border-[hsl(var(--panel-border))] focus:border-purple-500 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <RadioGroup
                    value={investmentUnit}
                    onValueChange={(value) => setInvestmentUnit(value as CurrencyUnit)}
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="SATS" id="investment-sats" className="text-purple-500" />
                      <Label htmlFor="investment-sats" className="cursor-pointer">
                        SATS
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="BTC" id="investment-btc" className="text-purple-500" />
                      <Label htmlFor="investment-btc" className="cursor-pointer">
                        BTC
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Data do Aporte</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-black/20 border-purple-700/50 hover:bg-purple-900/20",
                          !investmentDate && "text-muted-foreground",
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {investmentDate ? (
                          format(investmentDate, "PPP", { locale: ptBR })
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-black/90 border-purple-800/60">
                      <CalendarComponent
                        mode="single"
                        selected={investmentDate}
                        onSelect={(date) => date && setInvestmentDate(date)}
                        initialFocus
                        className="bg-[hsl(var(--panel-bg))]"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={addInvestment} 
                  disabled={!investmentAmount || loading} 
                  size={isMobile ? "sm" : "default"}
                  responsive
                  className="mt-2 bg-purple-800 hover:bg-purple-700"
                >
                  <Plus size={16} />
                  Adicionar Investimento
                </Button>
              </CardFooter>
            </Card>

            <Card className="panel border-purple-700/50">
              <CardHeader>
                <CardTitle className="text-lg">Registrar Lucro/Perda</CardTitle>
                <CardDescription>Registre seus lucros ou perdas diárias</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profit-amount">Valor</Label>
                  <Input
                    id="profit-amount"
                    type="number"
                    step="any"
                    placeholder="Valor"
                    value={profitAmount}
                    onChange={(e) => setProfitAmount(e.target.value)}
                    className="bg-black/30 border-[hsl(var(--panel-border))] focus:border-purple-500 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <RadioGroup
                    value={isProfit ? "profit" : "loss"}
                    onValueChange={(value) => setIsProfit(value === "profit")}
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="profit" id="type-profit" className="text-green-500" />
                      <Label htmlFor="type-profit" className="cursor-pointer text-green-500">
                        Lucro
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="loss" id="type-loss" className="text-red-500" />
                      <Label htmlFor="type-loss" className="cursor-pointer text-red-500">
                        Perda
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <RadioGroup
                    value={profitUnit}
                    onValueChange={(value) => setProfitUnit(value as CurrencyUnit)}
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="SATS" id="profit-sats" className="text-purple-500" />
                      <Label htmlFor="profit-sats" className="cursor-pointer">
                        SATS
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="BTC" id="profit-btc" className="text-purple-500" />
                      <Label htmlFor="profit-btc" className="cursor-pointer">
                        BTC
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Data</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-black/20 border-purple-700/50 hover:bg-purple-900/20",
                          !profitDate && "text-muted-foreground",
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {profitDate ? format(profitDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-black/90 border-purple-800/60">
                      <CalendarComponent
                        mode="single"
                        selected={profitDate}
                        onSelect={(date) => date && setProfitDate(date)}
                        initialFocus
                        className="bg-[hsl(var(--panel-bg))]"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={addProfitRecord} 
                  disabled={!profitAmount || loading}
                  variant={isProfit ? "default" : "destructive"}
                  size={isMobile ? "sm" : "default"}
                  responsive
                  className={`mt-2 ${isProfit ? "bg-green-600 hover:bg-green-500" : "bg-red-700 hover:bg-red-600"}`}
                >
                  {isProfit ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  Adicionar {isProfit ? "Lucro" : "Perda"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-6">
          <Card className="panel border-purple-700/50">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Relatório Mensal</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={goToPreviousMonth}
                    variant="outline"
                    size={isMobile ? "icon-sm" : "icon"}
                    aria-label="Mês anterior"
                    className="bg-black/20 border-purple-700/50 hover:bg-purple-900/20"
                  >
                    <ChevronLeft />
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size={isMobile ? "sm" : "default"}
                        className={cn(
                          "justify-start text-left font-normal bg-black/20 border-purple-700/50 hover:bg-purple-900/20",
                          !selectedMonth && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {format(selectedMonth, "MMMM yyyy", { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-black/90 border-purple-800/60" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={selectedMonth}
                        onSelect={(date) => date && setSelectedMonth(date)}
                        initialFocus
                        className="bg-[hsl(var(--panel-bg))]"
                      />
                    </PopoverContent>
                  </Popover>
                  <Button
                    onClick={goToNextMonth}
                    variant="outline"
                    size={isMobile ? "icon-sm" : "icon"}
                    aria-label="Próximo mês"
                    disabled={isCurrentMonth(selectedMonth)}
                    className="bg-black/20 border-purple-700/50 hover:bg-purple-900/20"
                  >
                    <ChevronRight />
                  </Button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <CardDescription>Lucro total em {format(selectedMonth, "MMMM yyyy", { locale: ptBR })}</CardDescription>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={toggleDisplayCurrency}
                    variant="secondary"
                    size={isMobile ? "sm" : "default"}
                    className="bg-purple-900/40 hover:bg-purple-800/40"
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size={isMobile ? "sm" : "default"}
                        className="sm:ml-auto bg-black/20 border-purple-700/50 hover:bg-purple-900/20"
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Exportar Dados
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto bg-black/90 border-purple-800/60">
                      <div className="grid gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleExportButtonClick}
                          className="w-full justify-start bg-purple-800 hover:bg-purple-700"
                          disabled={isExporting}
                        >
                          {isExporting ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Exportando...
                            </>
                          ) : (
                            <>
                          <FileText className="mr-2 h-4 w-4" />
                          Exportar Mês Atual
                            </>
                          )}
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={async () => {
                            if (isExporting) return;
                            try {
                              setIsExporting(true);
                              await exportProfitData(true);
                            } finally {
                              setIsExporting(false);
                            }
                          }}
                          className="w-full justify-start bg-purple-800 hover:bg-purple-700"
                          disabled={isExporting}
                        >
                          {isExporting ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Exportando...
                            </>
                          ) : (
                            <>
                          <Download className="mr-2 h-4 w-4" />
                          Exportar Histórico Completo
                            </>
                          )}
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="data-display bg-black/30 p-4 rounded-md border border-purple-700/50 shadow-sm">
                  <div className="text-sm text-gray-400">Total em BTC</div>
                  <div
                    className={`text-xl font-bold ${calculateMonthProfits.btc >= 0 ? "text-green-500" : "text-red-500"}`}
                  >
                    <AnimatedCounter
                      value={Math.abs(calculateMonthProfits.btc)}
                      decimals={8}
                      prefix={calculateMonthProfits.btc >= 0 ? "" : "-"}
                      suffix=" BTC"
                    />
                  </div>
                </div>
                <div className="data-display bg-black/30 p-4 rounded-md border border-purple-700/50 shadow-sm">
                  <div className="text-sm text-gray-400">Total em SATS</div>
                  <div
                    className={`text-xl font-bold ${calculateMonthProfits.sats >= 0 ? "text-green-500" : "text-red-500"}`}
                  >
                    <AnimatedCounter
                      value={Math.abs(calculateMonthProfits.sats)}
                      prefix={calculateMonthProfits.sats >= 0 ? "" : "-"}
                      suffix=" SATS"
                    />
                  </div>
                </div>
                <div className="data-display bg-black/30 p-4 rounded-md border border-purple-700/50 shadow-sm">
                  <div className="text-sm text-gray-400">Total em {displayCurrency}</div>
                  <div
                    className={`text-xl font-bold ${
                      displayCurrency === "USD"
                        ? calculateMonthProfits.usd >= 0
                          ? "text-green-500"
                          : "text-red-500"
                        : calculateMonthProfits.brl >= 0
                          ? "text-green-500"
                          : "text-red-500"
                    }`}
                  >
                    <AnimatedCounter
                      value={Math.abs(
                        displayCurrency === "USD" ? calculateMonthProfits.usd : calculateMonthProfits.brl,
                      )}
                      decimals={2}
                      prefix={
                        displayCurrency === "USD"
                          ? calculateMonthProfits.usd >= 0
                            ? "$"
                            : "-$"
                          : calculateMonthProfits.brl >= 0
                            ? "R$"
                            : "-R$"
                      }
                    />
                  </div>
                </div>
                <div className="data-display bg-black/30 p-4 rounded-md border border-purple-700/50 shadow-sm">
                  <div className="text-sm text-gray-400">Rendimento</div>
                  <div className={`text-xl font-bold ${profitPercentage >= 0 ? "text-green-500" : "text-red-500"}`}>
                    <AnimatedCounter
                      value={Math.abs(profitPercentage)}
                      decimals={2}
                      prefix={profitPercentage >= 0 ? "" : "-"}
                      suffix="%"
                    />
                  </div>
                </div>
              </div>

              {/* Saldo Total */}
              <div className="bg-purple-900/30 p-4 rounded-md border border-purple-500/40 shadow-md">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-purple-300">Saldo Total</div>
                    <div className="text-xl font-bold text-white">
                      <AnimatedCounter value={calculateTotalBalance.btc} decimals={8} suffix=" BTC" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-purple-300">Valor em {displayCurrency}</div>
                    <div className="text-xl font-bold text-white">
                      <AnimatedCounter
                        value={displayCurrency === "USD" ? calculateTotalBalance.usd : calculateTotalBalance.brl}
                        decimals={2}
                        prefix={displayCurrency === "USD" ? "$" : "R$"}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="data-display bg-black/30 p-4 rounded-md border border-purple-700/50 shadow-sm">
                  <div className="text-sm text-gray-400">Valor Investido no Período</div>
                  <div className="text-lg font-bold text-yellow-500">
                    <AnimatedCounter value={calculatePeriodInvestments.btc} decimals={8} suffix=" BTC" />
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    Valor em {displayCurrency}:
                    <span className="text-yellow-500 ml-1">
                      {displayCurrency === "USD"
                        ? formatCurrency(calculatePeriodInvestments.usd, "USD")
                        : formatCurrency(calculatePeriodInvestments.brl, "BRL")}
                    </span>
                  </div>
                </div>

                <div className="data-display bg-black/30 p-4 rounded-md border border-purple-700/50 shadow-sm">
                  <div className="text-sm text-gray-400">Lucro/Perda do Mês</div>
                  <div
                    className={`text-lg font-bold ${calculateMonthProfits.btc >= 0 ? "text-green-500" : "text-red-500"}`}
                  >
                    <AnimatedCounter
                      value={Math.abs(calculateMonthProfits.btc)}
                      decimals={8}
                      prefix={calculateMonthProfits.btc >= 0 ? "+" : "-"}
                      suffix=" BTC"
                    />
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    Valor em {displayCurrency}:
                    <span className={`ml-1 ${calculateMonthProfits.btc >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {displayCurrency === "USD"
                        ? `${calculateMonthProfits.usd >= 0 ? "+" : "-"}${Math.abs(calculateMonthProfits.usd).toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}`
                        : `${calculateMonthProfits.brl >= 0 ? "+" : "-"}${formatCurrency(Math.abs(calculateMonthProfits.brl)).substring(2)}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Total Investido - Movido para baixo e com coloração diferente */}
              <div className="p-4 rounded-md border shadow-sm bg-gradient-to-r from-black/40 to-purple-900/10 border-purple-800/20">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-gray-400">Total Investido (Histórico)</div>
                    <div className="text-lg font-bold text-blue-400">
                      <AnimatedCounter value={totalInvestments} decimals={8} suffix=" BTC" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">Valor em {displayCurrency}</div>
                    <div className="text-lg font-bold text-blue-400">
                      <AnimatedCounter
                        value={
                          displayCurrency === "USD"
                            ? totalInvestments * currentRates.btcToUsd
                            : totalInvestments * currentRates.btcToUsd * currentRates.brlToUsd
                        }
                        decimals={2}
                        prefix={displayCurrency === "USD" ? "$" : "R$"}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="panel border-purple-700/50 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Aportes do Mês</CardTitle>
              </CardHeader>
              <CardContent>
                {monthInvestments.length > 0 ? (
                  <ScrollArea className="h-[220px]">
                    <Table>
                      <TableHeader className="bg-black/40 sticky top-0">
                        <TableRow>
                          <TableHead className="w-1/3">Data</TableHead>
                          <TableHead className="w-1/3">Valor</TableHead>
                          <TableHead className="w-1/3 text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthInvestments.map((investment) => (
                          <TableRow key={investment.id} className="hover:bg-purple-900/10 border-b border-purple-900/10">
                            <TableCell className="py-2">{format(new Date(investment.date), "dd/MM/yyyy")}</TableCell>
                            <TableCell className="py-2">{formatCryptoAmount(investment.amount, investment.unit)}</TableCell>
                            <TableCell className="text-right py-2">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => deleteInvestment(investment.id)}
                                className="text-muted-foreground hover:text-red-500 hover:bg-red-900/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-4 text-gray-400">Nenhum aporte registrado neste mês</div>
                )}
              </CardContent>
            </Card>

            <Card className="panel border-purple-700/50 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Lucros do Mês</CardTitle>
              </CardHeader>
              <CardContent>
                {monthProfits.length > 0 ? (
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-black/40 hover:bg-black/40">
                          <TableHead className="w-[120px]">Data</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthProfits.map((profit) => (
                          <TableRow key={profit.id} className="hover:bg-purple-900/10 border-b border-purple-900/10">
                            <TableCell className="font-medium py-2">{new Date(profit.date).toLocaleDateString()}</TableCell>
                            <TableCell className="py-2">
                              <span className="bg-green-600/20 text-green-500 px-2 py-0.5 rounded-full text-xs font-medium">
                                Lucro
                              </span>
                            </TableCell>
                            <TableCell className="py-2">{formatCryptoAmount(profit.amount, profit.unit)}</TableCell>
                            <TableCell className="text-right py-2">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => deleteProfit(profit.id)}
                                className="text-muted-foreground hover:text-red-500 hover:bg-red-900/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-4 text-gray-400">Nenhum lucro registrado neste mês</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Diálogo de sucesso */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="bg-black/90 border-purple-700/50 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center text-green-500">
              <Check className="h-5 w-5 mr-2" />
              {successMessage.title}
            </DialogTitle>
            <DialogDescription className="text-gray-300">{successMessage.description}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setShowSuccessDialog(false)} className="bg-purple-800 hover:bg-purple-700">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
