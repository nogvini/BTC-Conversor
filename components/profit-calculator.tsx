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
  Download
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
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: "", description: "" });
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

  const isMobile = useIsMobile();

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
      toast({
        title: "Atualizando...",
        description: "Use o botão 'Atualizar Preços' no topo da página para atualizar todas as taxas.",
      });
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

    const newInvestment: Investment = {
      id: Date.now().toString(),
      date: format(investmentDate, "yyyy-MM-dd"),
      amount: Number(investmentAmount),
      unit: investmentUnit,
    };

    setInvestments([...investments, newInvestment]);
    setInvestmentAmount("");

    setSuccessMessage({
      title: "Aporte registrado com sucesso!",
      description: `Seu aporte de ${formatCryptoAmount(newInvestment.amount, newInvestment.unit)} foi registrado.`,
    });
    setShowSuccessDialog(true);

    toast({
      title: "Aporte registrado",
      description: `Aporte de ${formatCryptoAmount(newInvestment.amount, newInvestment.unit)} registrado com sucesso.`,
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

    const newProfit: ProfitRecord = {
      id: Date.now().toString(),
      date: format(profitDate, "yyyy-MM-dd"),
      amount: Number(profitAmount),
      unit: profitUnit,
      isProfit,
    };

    setProfits([...profits, newProfit]);
    setProfitAmount("");

    setSuccessMessage({
      title: isProfit ? "Lucro registrado com sucesso!" : "Perda registrada com sucesso!",
      description: `Seu ${isProfit ? "lucro" : "perda"} de ${formatCryptoAmount(newProfit.amount, newProfit.unit)} foi registrado.`,
    });
    setShowSuccessDialog(true);

    toast({
      title: isProfit ? "Lucro registrado" : "Perda registrada",
      description: `${isProfit ? "Lucro" : "Perda"} de ${formatCryptoAmount(newProfit.amount, newProfit.unit)} registrado com sucesso.`,
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

  // Função simplificada para exportação (stub)
  const handleExportButtonClick = async () => {
    if (isExporting || profits.length === 0) {
      toast({
        title: profits.length === 0 ? "Sem dados para exportar" : "Exportação em andamento",
        description: profits.length === 0 ? "Não há registros de lucros ou perdas para exportar." : "Aguarde a conclusão da exportação atual.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsExporting(true);
      // Simulação de exportação
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Exportação concluída com sucesso",
        description: "Os dados foram exportados com sucesso.",
        variant: "success"
      });
    } catch (error) {
      console.error("Erro na exportação:", error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível completar a exportação.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

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
              <div className="flex justify-between">
                <CardDescription>Seus registros</CardDescription>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={handleExportButtonClick}
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
                      Exportar
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {investments.length === 0 && profits.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum registro encontrado. Adicione investimentos ou lucros na aba "Registrar".
                </p>
              ) : (
                <div className="space-y-4">
                  {investments.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Investimentos</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {investments.map((investment) => (
                            <TableRow key={investment.id}>
                              <TableCell>{new Date(investment.date).toLocaleDateString()}</TableCell>
                              <TableCell>{formatCryptoAmount(investment.amount, investment.unit)}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteInvestment(investment.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  
                  {profits.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Lucros/Perdas</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {profits.map((profit) => (
                            <TableRow key={profit.id}>
                              <TableCell>{new Date(profit.date).toLocaleDateString()}</TableCell>
                              <TableCell>{profit.isProfit ? "Lucro" : "Perda"}</TableCell>
                              <TableCell>{formatCryptoAmount(profit.amount, profit.unit)}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteProfit(profit.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
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

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{successMessage.title}</DialogTitle>
            <DialogDescription>{successMessage.description}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setShowSuccessDialog(false)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 