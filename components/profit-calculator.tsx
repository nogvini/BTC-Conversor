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
  // Simplificada pois agora vamos confiar na atualização dos dados pelo componente pai
  const updateRates = async () => {
    if (appData) {
      // Se temos appData, o componente pai já está cuidando da atualização
      toast({
        title: "Atualizando...",
        description: "Use o botão na tela principal para atualizar todas as taxas.",
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

  // Função para alternar a moeda de exibição
  const toggleDisplayCurrency = () => {
    setDisplayCurrency(displayCurrency === "USD" ? "BRL" : "USD")
  }

  // Função melhorada para exportação Excel com melhor visualização
  const exportToExcel = async (data: any[], filename: string, sheetTitle: string) => {
    const workbook = new ExcelJS.Workbook();
    
    // Adicionar informações ao arquivo
    workbook.creator = 'BTC Conversor';
    workbook.lastModifiedBy = 'BTC Conversor';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Criar uma planilha com nome mais amigável
    const worksheet = workbook.addWorksheet(sheetTitle, {
      properties: { tabColor: { argb: 'FF9955FF' } }
    });
    
    // Definir colunas com larguras otimizadas
    worksheet.columns = [
      { header: 'Data', key: 'Data', width: 15, style: { numFmt: 'dd/mm/yyyy' } },
      { header: 'Tipo', key: 'Tipo', width: 12 },
      { header: 'Valor Cripto', key: 'Valor', width: 20 },
      { header: 'BTC', key: 'ValorBTC', width: 18, style: { numFmt: '0.00000000' } },
      { header: 'USD', key: 'ValorUSD', width: 15, style: { numFmt: '"$"#,##0.00' } },
      { header: 'BRL', key: 'ValorBRL', width: 15, style: { numFmt: '"R$"#,##0.00' } }
    ];
    
    // Melhorar o estilo do cabeçalho
    const headerRow = worksheet.getRow(1);
    headerRow.height = 28; // Altura aumentada
    headerRow.font = { 
      bold: true, 
      color: { argb: 'FFFFFFFF' },
      size: 12
    };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF7030A0' } // Roxo mais vibrante
    };
    
    // Melhorar alinhamento e estilo do cabeçalho
    headerRow.eachCell((cell) => {
      cell.alignment = { 
        vertical: 'middle', 
        horizontal: 'center',
        wrapText: true
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FFFFFFFF' } },
        left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        bottom: { style: 'medium', color: { argb: 'FFFFFFFF' } },
        right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
      };
    });
    
    // Adicionar linhas de dados
    data.forEach(item => {
      worksheet.addRow(item);
    });
    
    // Melhorar visualização de cada linha de dados
    for (let i = 2; i <= data.length + 1; i++) {
      const row = worksheet.getRow(i);
      row.height = 22; // Altura consistente
      
      // Aplicar estilos específicos aos valores
      // Célula de Data (coluna A)
      const dateCell = row.getCell(1);
      dateCell.alignment = { vertical: 'middle', horizontal: 'center' };
      
      // Célula de Tipo (coluna B)
      const typeCell = row.getCell(2);
      typeCell.alignment = { vertical: 'middle', horizontal: 'center' };
      
      // Definir cores para lucro e perda
      const isProfitRow = data[i-2].Tipo === 'Lucro';
      const typeColor = isProfitRow ? 'FF10B981' : 'FFE11D48'; // Verde/Vermelho
      const typeTextColor = 'FFFFFFFF'; // Texto branco
      
      // Aplicar estilo à célula de tipo
      typeCell.font = { bold: true, color: { argb: typeTextColor } };
      typeCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: typeColor }
      };
      
      // Aplicar formatação aos valores numéricos
      const valueCell = row.getCell(3); // Valor Cripto
      valueCell.alignment = { vertical: 'middle', horizontal: 'right' };
      valueCell.font = { color: { argb: isProfitRow ? 'FF10B981' : 'FFE11D48' } };
      
      // Formatar as células de valores monetários
      for (let col = 4; col <= 6; col++) {
        const cell = row.getCell(col);
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        // Destacar valores negativos em vermelho, positivos em verde
        const value = parseFloat(cell.value as string);
        cell.font = { 
          color: { argb: value >= 0 ? 'FF10B981' : 'FFE11D48' },
          bold: col === 4 // Destacar valor em BTC
        };
      }
      
      // Aplicar bordas e estilo de fundo para zebrar
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
        };
      });
      
      // Cores de fundo alternadas (zebrado)
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: i % 2 === 0 ? 'FF1F2937' : 'FF111827' } // Alternância de tons
      };
    }
    
    // Calcular saldo total
    const totalBTC = data.reduce((sum, item) => {
      const btcValue = parseFloat(item.ValorBTC);
      return item.Tipo === 'Lucro' ? sum + btcValue : sum - btcValue;
    }, 0);
    
    const totalUSD = data.reduce((sum, item) => {
      const usdValue = parseFloat(item.ValorUSD);
      return item.Tipo === 'Lucro' ? sum + usdValue : sum - usdValue;
    }, 0);
    
    const totalBRL = data.reduce((sum, item) => {
      const brlValue = parseFloat(item.ValorBRL);
      return item.Tipo === 'Lucro' ? sum + brlValue : sum - brlValue;
    }, 0);
    
    // Adicionar linha com totais
    const totalRow = worksheet.addRow({
      Data: 'TOTAL',
      Tipo: '',
      Valor: '',
      ValorBTC: totalBTC.toFixed(8),
      ValorUSD: totalUSD.toFixed(2),
      ValorBRL: totalBRL.toFixed(2)
    });
    
    // Estilizar linha de total
    totalRow.height = 28;
    totalRow.font = { 
      bold: true, 
      size: 12,
      color: { argb: 'FFFFFFFF' }
    };
    
    // Colorir a linha de total de acordo com o saldo (positivo/negativo)
    const totalColor = totalBTC >= 0 ? 'FF10B981' : 'FFE11D48';
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4C1D95' } // Púrpura destacado
    };
    
    // Mesclar células para o rótulo "TOTAL"
    worksheet.mergeCells(`A${data.length + 2}:C${data.length + 2}`);
    totalRow.getCell('Data').alignment = { 
      horizontal: 'center', 
      vertical: 'middle'
    };
    
    // Ajustar o alinhamento das células de valor na linha de total
    for (let col = 4; col <= 6; col++) {
      const cell = totalRow.getCell(col);
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
      cell.font = { 
        bold: true, 
        size: 12,
        color: { argb: totalBTC >= 0 ? 'FFFFFFFF' : 'FFFFFFFF' } 
      };
      // Adicionar borda inferior mais grossa
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FFFFFFFF' } },
        top: { style: 'medium', color: { argb: 'FFFFFFFF' } }
      };
    }
    
    // Adicionar uma linha para informações resumidas
    const infoRow = worksheet.addRow([
      `Relatório gerado em: ${new Date().toLocaleString()}`,
      '',
      '',
      totalBTC >= 0 ? 'LUCRO TOTAL' : 'PREJUÍZO TOTAL',
      '',
      ''
    ]);
    
    // Estilizar linha de informações
    worksheet.mergeCells(`A${data.length + 3}:C${data.length + 3}`);
    worksheet.mergeCells(`D${data.length + 3}:F${data.length + 3}`);
    infoRow.height = 24;
    
    // Estilo para a primeira célula (data de geração)
    const infoDateCell = infoRow.getCell(1);
    infoDateCell.font = { italic: true, color: { argb: 'FFBBBBBB' } };
    infoDateCell.alignment = { horizontal: 'left' };
    
    // Estilo para a célula de status (lucro/prejuízo)
    const infoStatusCell = infoRow.getCell(4);
    infoStatusCell.font = { 
      bold: true, 
      size: 12,
      color: { argb: totalBTC >= 0 ? 'FF10B981' : 'FFE11D48' } 
    };
    infoStatusCell.alignment = { horizontal: 'right' };
    
    // Adicionar imagem ou logotipo do Bitcoin (opcional)
    // Esta parte pode ser implementada se tiver uma imagem disponível
    
    // Congelar o cabeçalho para facilitar a visualização
    worksheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 1, topLeftCell: 'A2', activeCell: 'A2' }
    ];
    
    // Ajustes finais no formato da planilha
    worksheet.properties.defaultRowHeight = 20;
    worksheet.properties.outlineLevelRow = 1;
    
    // Gerar arquivo Excel
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, filename);
  };

  // Substituir a função exportProfitData para usar a nova exportação Excel
  const exportProfitData = (allTime: boolean = false) => {
    // Preparar dados em formato adequado para exportação
    let dataToExport;
    let filename;
    
    if (allTime) {
      // Exportação de todos os tempos
      dataToExport = profits.map(profit => ({
        Data: new Date(profit.date).toLocaleDateString(),
        Tipo: profit.isProfit ? 'Lucro' : 'Perda',
        Valor: formatCryptoAmount(profit.amount, profit.unit),
        ValorBTC: convertToBtc(profit.amount, profit.unit).toFixed(8),
        ValorUSD: (convertToBtc(profit.amount, profit.unit) * currentRates.btcToUsd).toFixed(2),
        ValorBRL: (convertToBtc(profit.amount, profit.unit) * currentRates.btcToUsd * currentRates.brlToUsd).toFixed(2)
      }));
      
      // Nome do arquivo com "histórico-completo"
      filename = `relatório-btc-histórico-completo-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    } else {
      // Exportação do mês atual
      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);
      
      // Filtrar apenas lucros do mês selecionado
      const monthProfits = profits.filter(profit => {
        const profitDate = new Date(profit.date);
        return isWithinInterval(profitDate, { start: monthStart, end: monthEnd });
      });
      
      dataToExport = monthProfits.map(profit => ({
        Data: new Date(profit.date).toLocaleDateString(),
        Tipo: profit.isProfit ? 'Lucro' : 'Perda',
        Valor: formatCryptoAmount(profit.amount, profit.unit),
        ValorBTC: convertToBtc(profit.amount, profit.unit).toFixed(8),
        ValorUSD: (convertToBtc(profit.amount, profit.unit) * currentRates.btcToUsd).toFixed(2),
        ValorBRL: (convertToBtc(profit.amount, profit.unit) * currentRates.btcToUsd * currentRates.brlToUsd).toFixed(2)
      }));
      
      // Nome do arquivo incluindo o mês e ano
      const monthName = format(selectedMonth, 'MMMM-yyyy', { locale: ptBR });
      filename = `relatório-btc-${monthName}.xlsx`;
    }

    // Título da planilha incluindo o período
    const sheetTitle = allTime ? 'Relatório Bitcoin - Histórico Completo' : 
                               `Relatório Bitcoin - ${format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}`;
    
    // Exportar dados
    exportToExcel(dataToExport, filename, sheetTitle);

    toast({
      title: "Exportação concluída",
      description: allTime ? 
        "O relatório histórico completo foi exportado com sucesso." : 
        `O relatório de ${format(selectedMonth, 'MMMM/yyyy', { locale: ptBR })} foi exportado com sucesso.`,
      variant: "success"
    });
  }

  return (
    <div className="space-y-6">
      {usingFallbackRates && (
        <div className="bg-yellow-900/20 border border-yellow-700 text-yellow-200 px-3 py-2 rounded-md text-sm mb-2 flex items-center">
          <AlertTriangle className="h-4 w-4 mr-2" />
          Usando taxas de câmbio simuladas. Os valores podem não refletir o mercado atual.
          <Button
            variant="link"
            size="sm"
            onClick={updateRates}
            className="text-yellow-200 hover:text-yellow-100 ml-2 p-0 h-auto"
          >
            Tentar atualizar
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800">
          <TabsTrigger value="register" className="data-[state=active]:bg-purple-800 data-[state=active]:text-white">
            <Plus className="h-4 w-4 mr-2" />
            Registrar
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-purple-800 data-[state=active]:text-white">
            <TrendingUp className="h-4 w-4 mr-2" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gray-800 border-purple-700">
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
                    className="bg-gray-900 border-purple-700 focus:border-purple-500 text-white"
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
                          "w-full justify-start text-left font-normal bg-gray-900 border-purple-700 hover:bg-gray-800",
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
                    <PopoverContent className="w-auto p-0 bg-gray-900 border-purple-700">
                      <CalendarComponent
                        mode="single"
                        selected={investmentDate}
                        onSelect={(date) => date && setInvestmentDate(date)}
                        initialFocus
                        className="bg-gray-900"
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
                  className="mt-2"
                >
                  <Plus size={16} />
                  Adicionar Investimento
                </Button>
              </CardFooter>
            </Card>

            <Card className="bg-gray-800 border-purple-700">
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
                    className="bg-gray-900 border-purple-700 focus:border-purple-500 text-white"
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
                          "w-full justify-start text-left font-normal bg-gray-900 border-purple-700 hover:bg-gray-800",
                          !profitDate && "text-muted-foreground",
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {profitDate ? format(profitDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-gray-900 border-purple-700">
                      <CalendarComponent
                        mode="single"
                        selected={profitDate}
                        onSelect={(date) => date && setProfitDate(date)}
                        initialFocus
                        className="bg-gray-900"
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
                  className="mt-2"
                >
                  {isProfit ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  Adicionar {isProfit ? "Lucro" : "Perda"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-6">
          <Card className="bg-gray-800 border-purple-700">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Relatório Mensal</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={goToPreviousMonth}
                    variant="outline"
                    size={isMobile ? "icon-sm" : "icon"}
                    aria-label="Mês anterior"
                  >
                    <ChevronLeft />
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size={isMobile ? "sm" : "default"}
                        className={cn(
                          "justify-start text-left font-normal",
                          !selectedMonth && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {format(selectedMonth, "MMMM yyyy", { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={selectedMonth}
                        onSelect={(date) => date && setSelectedMonth(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Button
                    onClick={goToNextMonth}
                    variant="outline"
                    size={isMobile ? "icon-sm" : "icon"}
                    aria-label="Próximo mês"
                    disabled={isCurrentMonth(selectedMonth)}
                  >
                    <ChevronRight />
                  </Button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <CardDescription>Lucro total em {format(selectedMonth, "MMMM yyyy", { locale: ptBR })}</CardDescription>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={updateRates}
                    disabled={loading}
                    className="h-8 bg-gray-900 border-purple-700 hover:bg-gray-800"
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
                    Atualizar Taxas
                  </Button>
                  <Button
                    onClick={toggleDisplayCurrency}
                    variant="secondary"
                    size={isMobile ? "sm" : "default"}
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
                        className="sm:ml-auto"
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Exportar Dados
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto bg-gray-900 border-purple-700">
                      <div className="grid gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => exportProfitData()}
                          className="w-full justify-start"
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Exportar Mês Atual
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => exportProfitData(true)}
                          className="w-full justify-start"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Exportar Histórico Completo
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-900 p-4 rounded-md border border-purple-700 shadow-sm">
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
                <div className="bg-gray-900 p-4 rounded-md border border-purple-700 shadow-sm">
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
                <div className="bg-gray-900 p-4 rounded-md border border-purple-700 shadow-sm">
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
                <div className="bg-gray-900 p-4 rounded-md border border-purple-700 shadow-sm">
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
              <div className="bg-purple-900/30 p-4 rounded-md border border-purple-500 shadow-md">
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
                <div className="bg-gray-900 p-4 rounded-md border border-purple-700 shadow-sm">
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

                <div className="bg-gray-900 p-4 rounded-md border border-purple-700 shadow-sm">
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
              <div className="bg-gray-800/60 p-4 rounded-md border border-gray-600 shadow-sm">
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
            <Card className="bg-gray-800 border-purple-700 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Aportes do Mês</CardTitle>
              </CardHeader>
              <CardContent>
                {monthInvestments.length > 0 ? (
                  <ScrollArea className="h-[220px]">
                    <Table>
                      <TableHeader className="bg-gray-900 sticky top-0">
                        <TableRow>
                          <TableHead className="w-1/3">Data</TableHead>
                          <TableHead className="w-1/3">Valor</TableHead>
                          <TableHead className="w-1/3 text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthInvestments.map((investment) => (
                          <TableRow key={investment.id} className="hover:bg-gray-700">
                            <TableCell className="py-2">{format(new Date(investment.date), "dd/MM/yyyy")}</TableCell>
                            <TableCell className="py-2">{formatCryptoAmount(investment.amount, investment.unit)}</TableCell>
                            <TableCell className="text-right py-2">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => deleteInvestment(investment.id)}
                                className="text-muted-foreground hover:text-destructive"
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

            <Card className="bg-gray-800 border-purple-700 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Lucros/Perdas do Mês</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportProfitData()}
                    className="h-8 bg-gray-900 border-purple-700 hover:bg-gray-800"
                    title="Exportar dados do mês atual para Excel"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Exportar Mês
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportProfitData(true)}
                    className="h-8 bg-gray-900 border-purple-700 hover:bg-gray-800"
                    title="Exportar histórico completo para Excel"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Histórico Completo
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {monthProfits.length > 0 ? (
                  <ScrollArea className="h-[220px]">
                    <Table>
                      <TableHeader className="bg-gray-900 sticky top-0">
                        <TableRow>
                          <TableHead className="w-1/4">Data</TableHead>
                          <TableHead className="w-1/4">Tipo</TableHead>
                          <TableHead className="w-1/3">Valor</TableHead>
                          <TableHead className="w-1/6 text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthProfits.map((profit) => (
                          <TableRow key={profit.id} className="hover:bg-gray-700">
                            <TableCell className="py-2">{format(new Date(profit.date), "dd/MM/yyyy")}</TableCell>
                            <TableCell className={profit.isProfit ? "text-green-500 py-2" : "text-red-500 py-2"}>
                              {profit.isProfit ? "Lucro" : "Perda"}
                            </TableCell>
                            <TableCell className={profit.isProfit ? "text-green-500 py-2" : "text-red-500 py-2"}>
                              {profit.isProfit ? "+" : "-"} {formatCryptoAmount(profit.amount, profit.unit)}
                            </TableCell>
                            <TableCell className="text-right py-2">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => deleteProfit(profit.id)}
                                className="text-muted-foreground hover:text-destructive"
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
                  <div className="text-center py-4 text-gray-400">Nenhum lucro/perda registrado neste mês</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Diálogo de sucesso */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="bg-gray-900 border-purple-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center text-green-500">
              <Check className="h-5 w-5 mr-2" />
              {successMessage.title}
            </DialogTitle>
            <DialogDescription className="text-gray-300">{successMessage.description}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setShowSuccessDialog(false)} className="bg-purple-700 hover:bg-purple-600">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
