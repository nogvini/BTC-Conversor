"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { useReports } from "@/hooks/use-reports";
import { useIsMobile } from "@/hooks/use-mobile";
import { getCurrentBitcoinPrice } from "@/lib/client-api";

// Imports dos módulos refatorados
import type { ProfitCalculatorProps } from "./types/profit-calculator-types";
import { useProfitCalculatorStates } from "./hooks/use-profit-calculator-states";
import { 
  convertToBtc,
  formatCurrency,
  formatDateToUTC,
  isFutureDate,
  calculateOperationalProfitForSummary,
  calculateValuationProfitForSummary,
  calculateAverageBuyPriceForSummary
} from "./utils/profit-calculator-utils";

export default function ProfitCalculator({ btcToUsd, brlToUsd, appData }: ProfitCalculatorProps) {
  // Hook de relatórios
  const {
    reports: allReportsFromHook,
    activeReportId: activeReportIdFromHook,
    activeReport: currentActiveReportObjectFromHook,
    isLoaded: reportsDataLoaded,
    addReport,
    selectReport,
    addInvestment,
    addProfitRecord,
    deleteInvestment,
    deleteProfitRecord,
    updateReportData,
    updateReport,
    importData,
    deleteAllInvestmentsFromReport,
    deleteAllProfitsFromReport,
  } = useReports();

  // Hook de estados (FIXO - todos os hooks sempre no mesmo local e ordem)
  const states = useProfitCalculatorStates();

  // Estados adicionais que não estão no hook customizado
  const [pendingInvestment, setPendingInvestment] = useState<any>(null);
  const [pendingProfit, setPendingProfit] = useState<any>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const internalFileInputRef = useRef<HTMLInputElement>(null);
  const investmentCsvFileInputRef = useRef<HTMLInputElement>(null);
  const backupExcelFileInputRef = useRef<HTMLInputElement>(null);

  const isMobile = useIsMobile();

  // Effect para verificar tamanho da tela
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkScreenSize = () => {
        states.setUseExportDialog(window.innerWidth < 350);
      };
      
      checkScreenSize();
      window.addEventListener('resize', checkScreenSize);
      return () => window.removeEventListener('resize', checkScreenSize);
    }
  }, []);

  // Effect para atualizar rates
  useEffect(() => {
    if (appData) {
      const newRates = {
        btcToUsd: appData.currentPrice.usd,
        brlToUsd: appData.currentPrice.brl / appData.currentPrice.usd
      };
      states.setCurrentRates(newRates);
      states.setUsingFallbackRates(appData.isUsingCache || !!appData.currentPrice.isUsingCache);
    } else {
      states.setCurrentRates({ btcToUsd, brlToUsd });
      states.setUsingFallbackRates(btcToUsd === 65000 && brlToUsd === 5.2);
    }
  }, [btcToUsd, brlToUsd, appData]);

  // Effect para displayCurrency e inicialização
  useEffect(() => {
    const savedDisplayCurrency = localStorage.getItem("bitcoinDisplayCurrency");
    if (savedDisplayCurrency) {
      try {
        states.setDisplayCurrency(JSON.parse(savedDisplayCurrency));
      } catch (e) {
        console.error("Erro ao analisar moeda de exibição salva:", e);
      }
    }

    if (reportsDataLoaded && allReportsFromHook && allReportsFromHook.length > 0) {
      if (states.selectedReportIdsForHistoryView.length === 0) {
        const initialHistorySelection = activeReportIdFromHook 
          ? [activeReportIdFromHook]
          : (allReportsFromHook.length > 0 ? [allReportsFromHook[0].id] : []);
        states.setSelectedReportIdsForHistoryView(initialHistorySelection);
      } else {
        states.setSelectedReportIdsForHistoryView(prev => 
          prev.filter(id => allReportsFromHook.some(r => r.id === id))
        );
      }
    } else if (reportsDataLoaded && (!allReportsFromHook || allReportsFromHook.length === 0)) {
      states.setSelectedReportIdsForHistoryView([]);
    }
  }, [reportsDataLoaded, allReportsFromHook, activeReportIdFromHook]);

  // Effect para salvar displayCurrency
  useEffect(() => {
    if (reportsDataLoaded) {
      localStorage.setItem("bitcoinDisplayCurrency", JSON.stringify(states.displayCurrency));
    }
  }, [states.displayCurrency, reportsDataLoaded]);

  // Funções auxiliares
  const updateRates = async () => {
    if (appData) {
      return;
    } else {
      states.setLoading(true);
      try {
        const priceData = await getCurrentBitcoinPrice();
        if (priceData) {
          states.setCurrentRates({
            btcToUsd: priceData.usd,
            brlToUsd: priceData.brl / priceData.usd,
          });
          states.setUsingFallbackRates(priceData.isUsingCache);
          
          if (!states.toastDebounce) {
            states.setToastDebounce(true);
            toast({
              title: "Cotação atualizada",
              description: `Bitcoin: ${priceData.usd.toLocaleString()} USD`,
              variant: "default",
            });
            setTimeout(() => states.setToastDebounce(false), 1000);
          }
        }
      } catch (error) {
        console.error("Erro ao atualizar cotação:", error);
        
        if (!states.toastDebounce) {
          states.setToastDebounce(true);
          toast({
            title: "Erro ao atualizar cotação",
            description: "Usando as últimas taxas disponíveis.",
            variant: "destructive",
          });
          setTimeout(() => states.setToastDebounce(false), 1000);
        }
      } finally {
        states.setLoading(false);
      }
    }
  };

  // Função para adicionar investimento
  const handleAddInvestmentButtonClick = () => {
    if (!states.investmentAmount || isNaN(Number(states.investmentAmount)) || Number(states.investmentAmount) <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira um valor válido maior que zero.",
        variant: "destructive",
      });
      return;
    }

    if (isFutureDate(states.investmentDate)) {
      toast({
        title: "Data inválida",
        description: "Não é possível registrar aportes com data futura.",
        variant: "destructive",
      });
      return;
    }

    let targetReportId = activeReportIdFromHook;
    if (!targetReportId) {
      if (!allReportsFromHook || allReportsFromHook.length === 0) {
        addReport("Relatório Padrão");
        toast({ 
          title: "Relatório Criado", 
          description: "Um 'Relatório Padrão' foi criado. Tente adicionar o aporte novamente.", 
          variant: "default" 
        });
        return;
      } else if (allReportsFromHook.length > 0 && !activeReportIdFromHook) {
        selectReport(allReportsFromHook[0].id);
        targetReportId = allReportsFromHook[0].id;
        toast({ 
          title: "Relatório Ativado", 
          description: `Relatório "${allReportsFromHook[0].name}" ativado. Tente adicionar o aporte novamente.`, 
          variant: "default" 
        });
        return;
      } else {
        toast({ 
          title: "Nenhum relatório ativo", 
          description: "Por favor, selecione um relatório ou crie um novo.", 
          variant: "destructive" 
        });
        return;
      }
    }

    const newInvestmentBase = {
      date: formatDateToUTC(states.investmentDate),
      amount: Number(states.investmentAmount),
      unit: states.investmentUnit,
    };

    const reportToUpdate = allReportsFromHook?.find(r => r.id === targetReportId);
    if (!reportToUpdate) {
      toast({ 
        title: "Erro", 
        description: "Relatório alvo não encontrado para adicionar aporte.", 
        variant: "destructive" 
      });
      return;
    }

    // Verificar duplicatas
    const possibleDuplicates = reportToUpdate?.investments.filter(inv => 
      inv.date === newInvestmentBase.date && 
      inv.amount === newInvestmentBase.amount && 
      inv.unit === newInvestmentBase.unit
    ) || [];

    if (possibleDuplicates.length > 0) {
      setPendingInvestment({ ...newInvestmentBase, id: Date.now().toString() });
      states.setDuplicateConfirmInfo({
        type: 'investment',
        date: newInvestmentBase.date,
        amount: newInvestmentBase.amount,
        unit: newInvestmentBase.unit
      });
      states.setShowConfirmDuplicateDialog(true);
    } else {
      confirmAddInvestment(newInvestmentBase);
    }
  };

  // Função para confirmar adição de investimento
  const confirmAddInvestment = async (investmentBaseData: any) => {
    if (!activeReportIdFromHook) {
      toast({ 
        title: "Erro", 
        description: "Nenhum relatório ativo para adicionar o aporte.", 
        variant: "destructive" 
      });
      return;
    }

    const success = addInvestment(investmentBaseData);
    
    if (success) {
      states.setInvestmentAmount("");
      states.setInvestmentDatePriceInfo({ 
        price: null, 
        loading: false, 
        currency: states.displayCurrency, 
        error: null, 
        source: null 
      });
    }
    
    setPendingInvestment(null);
    states.setDuplicateConfirmInfo(null);
    states.setShowConfirmDuplicateDialog(false);
  };

  // Funções para edição de relatórios
  const startEditingActiveReport = () => {
    if (!currentActiveReportObjectFromHook) return;
    states.setEditingActiveReportName(currentActiveReportObjectFromHook.name);
    states.setEditingActiveReportDescription(currentActiveReportObjectFromHook.description || "");
    states.setIsEditingActiveReport(true);
  };

  const cancelEditingActiveReport = () => {
    states.setIsEditingActiveReport(false);
    states.setEditingActiveReportName("");
    states.setEditingActiveReportDescription("");
  };

  const saveActiveReportChanges = () => {
    if (!currentActiveReportObjectFromHook || !states.editingActiveReportName.trim()) {
      toast({ 
        title: "Erro", 
        description: "Nome do relatório não pode estar vazio.", 
        variant: "destructive" 
      });
      return;
    }

    // Preparar as atualizações
    const updates: { name: string; description?: string } = {
      name: states.editingActiveReportName.trim(),
      description: states.editingActiveReportDescription.trim() || undefined
    };

    // Usar a função updateReport do hook para salvar as alterações
    const success = updateReport(currentActiveReportObjectFromHook.id, updates);
    
    if (success) {
      // Cancelar o modo de edição após salvar com sucesso
      cancelEditingActiveReport();
      
      toast({
        title: "Relatório Atualizado",
        description: "As informações do relatório foram atualizadas com sucesso.",
        variant: "default",
      });
    } else {
      toast({
        title: "Erro ao Salvar",
        description: "Houve um problema ao salvar as alterações do relatório.",
        variant: "destructive",
      });
    }
  };

  // Calcular dados do resumo
  const reportSummaryData = useMemo(() => {
    if (!currentActiveReportObjectFromHook) return null;

    const investments = currentActiveReportObjectFromHook.investments || [];
    const profits = currentActiveReportObjectFromHook.profits || [];

    const totalInvestmentsBtc = investments.reduce((sum, inv) => sum + convertToBtc(inv.amount, inv.unit), 0);
    const { operationalProfitBtc } = calculateOperationalProfitForSummary(profits, convertToBtc);
    const { valuationProfitUsd } = calculateValuationProfitForSummary(
      investments, 
      states.currentRates.btcToUsd, 
      states.currentRates.brlToUsd, 
      convertToBtc
    );
    const { averageBuyPriceUsd } = calculateAverageBuyPriceForSummary(
      investments, 
      states.currentRates.brlToUsd, 
      convertToBtc
    );

    return {
      totalInvestmentsBtc,
      operationalProfitBtc,
      valuationProfitUsd,
      averageBuyPriceUsd,
    };
  }, [currentActiveReportObjectFromHook, states.currentRates, states.displayCurrency]);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      <Tabs value={states.activeTab} onValueChange={states.setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-black/40 backdrop-blur-sm">
          <TabsTrigger value="register" className="text-white data-[state=active]:bg-purple-700">
            Registrar
          </TabsTrigger>
          <TabsTrigger value="history" className="text-white data-[state=active]:bg-purple-700">
            Histórico
          </TabsTrigger>
          <TabsTrigger value="chart" className="text-white data-[state=active]:bg-purple-700">
            Gráficos
          </TabsTrigger>
        </TabsList>

        {/* ABA REGISTRAR */}
        <TabsContent value="register">
          <div className="space-y-6">
            {/* Cabeçalho do relatório ativo com edição */}
            {currentActiveReportObjectFromHook && reportSummaryData && (
              <Card className="bg-black/30 rounded-lg shadow-xl shadow-purple-900/10 border border-purple-700/40">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {!states.isEditingActiveReport ? (
                        <>
                          <CardTitle className="text-xl mb-2 flex items-center">
                            Resumo Geral do Relatório Ativo
                          </CardTitle>
                          <CardDescription className="text-purple-500/90 dark:text-purple-400/80">
                            Análise completa dos dados do relatório "{currentActiveReportObjectFromHook?.name || 'Nenhum selecionado'}"
                            {currentActiveReportObjectFromHook?.description && (
                              <span className="block mt-1 text-sm">
                                - {currentActiveReportObjectFromHook.description}
                              </span>
                            )}
                          </CardDescription>
                        </>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-purple-400 mb-1">
                              Nome do Relatório
                            </label>
                            <input
                              type="text"
                              value={states.editingActiveReportName}
                              onChange={(e) => states.setEditingActiveReportName(e.target.value)}
                              className="w-full px-3 py-2 bg-black/50 border border-purple-700/50 rounded-md text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="Digite o nome do relatório"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-purple-400 mb-1">
                              Descrição (opcional)
                            </label>
                            <textarea
                              value={states.editingActiveReportDescription}
                              onChange={(e) => states.setEditingActiveReportDescription(e.target.value)}
                              className="w-full px-3 py-2 bg-black/50 border border-purple-700/50 rounded-md text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                              placeholder="Digite uma descrição para o relatório"
                              rows={2}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      {!states.isEditingActiveReport ? (
                        <Button
                          onClick={startEditingActiveReport}
                          variant="outline"
                          size="sm"
                          className="border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white"
                        >
                          Editar
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            onClick={saveActiveReportChanges}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            Salvar
                          </Button>
                          <Button
                            onClick={cancelEditingActiveReport}
                            variant="outline"
                            size="sm"
                            className="border-gray-600 text-gray-400 hover:bg-gray-600 hover:text-white"
                          >
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Cards de resumo */}
                    <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 p-4 rounded-lg border border-blue-500/30">
                      <div className="text-blue-400 text-sm font-medium">Total Investido</div>
                      <div className="text-white text-lg font-bold">
                        {reportSummaryData.totalInvestmentsBtc.toFixed(8)} BTC
                      </div>
                      <div className="text-blue-300 text-xs">
                        {formatCurrency(
                          reportSummaryData.totalInvestmentsBtc * states.currentRates.btcToUsd * 
                          (states.displayCurrency === "BRL" ? states.currentRates.brlToUsd : 1), 
                          states.displayCurrency
                        )}
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 p-4 rounded-lg border border-green-500/30">
                      <div className="text-green-400 text-sm font-medium">Lucro Operacional</div>
                      <div className="text-white text-lg font-bold">
                        {reportSummaryData.operationalProfitBtc.toFixed(8)} BTC
                      </div>
                      <div className="text-green-300 text-xs">
                        {formatCurrency(
                          reportSummaryData.operationalProfitBtc * states.currentRates.btcToUsd * 
                          (states.displayCurrency === "BRL" ? states.currentRates.brlToUsd : 1), 
                          states.displayCurrency
                        )}
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 p-4 rounded-lg border border-purple-500/30">
                      <div className="text-purple-400 text-sm font-medium">Lucro de Valorização</div>
                      <div className="text-white text-lg font-bold">
                        {formatCurrency(reportSummaryData.valuationProfitUsd, "USD")}
                      </div>
                      <div className="text-purple-300 text-xs">
                        {states.displayCurrency === "BRL" 
                          ? formatCurrency(reportSummaryData.valuationProfitUsd * states.currentRates.brlToUsd, "BRL")
                          : "Valorização atual"
                        }
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 p-4 rounded-lg border border-orange-500/30">
                      <div className="text-orange-400 text-sm font-medium">Preço Médio</div>
                      <div className="text-white text-lg font-bold">
                        {formatCurrency(reportSummaryData.averageBuyPriceUsd, "USD")}
                      </div>
                      <div className="text-orange-300 text-xs">
                        {states.displayCurrency === "BRL" 
                          ? formatCurrency(reportSummaryData.averageBuyPriceUsd * states.currentRates.brlToUsd, "BRL")
                          : "Preço médio de compra"
                        }
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Formulário de registro simplificado */}
            <Card className="bg-black/30 border border-purple-700/40">
              <CardHeader>
                <CardTitle>Adicionar Novo Registro</CardTitle>
                <CardDescription>
                  Registre novos aportes ou operações de trading
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-purple-400">
                  Formulário de registro será implementado aqui...
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ABA HISTÓRICO */}
        <TabsContent value="history">
          <Card className="bg-black/30 border border-purple-700/40">
            <CardHeader>
              <CardTitle>Histórico de Transações</CardTitle>
              <CardDescription>
                Visualize e gerencie seus registros históricos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-purple-400">
                Histórico será implementado aqui...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA GRÁFICOS */}
        <TabsContent value="chart">
          <Card className="bg-black/30 border border-purple-700/40">
            <CardHeader>
              <CardTitle>Análise Gráfica</CardTitle>
              <CardDescription>
                Visualize seus dados em gráficos interativos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-purple-400">
                Gráficos serão implementados aqui...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 