"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { useReports } from "@/hooks/use-reports";
import { useIsMobile } from "@/hooks/use-mobile";
import { getCurrentBitcoinPrice } from "@/lib/client-api";
import { TrendingUp, Download, Upload, Wallet, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

// Imports para LN Markets
import type { LNMarketsCredentials, LNMarketsImportStats } from "./types/ln-markets-types";
import { retrieveLNMarketsCredentials } from "@/lib/encryption";
import { 
  createLNMarketsClient, 
  convertTradeToProfit, 
  convertDepositToInvestment, 
  convertWithdrawalToRecord 
} from "@/lib/ln-markets-api";
import { useAuth } from "@/hooks/use-auth";

export default function ProfitCalculator({ btcToUsd, brlToUsd, appData }: ProfitCalculatorProps) {
  // Hook de autenticação
  const { session } = useAuth();
  const { user } = session;

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
    addWithdrawal,
    deleteInvestment,
    deleteProfitRecord,
    deleteWithdrawal,
    updateReportData,
    updateReport,
    importData,
    deleteAllInvestmentsFromReport,
    deleteAllProfitsFromReport,
    deleteAllWithdrawalsFromReport,
  } = useReports();

  // Hook de estados (FIXO - todos os hooks sempre no mesmo local e ordem)
  const states = useProfitCalculatorStates();

  // Estados adicionais para LN Markets
  const [lnMarketsCredentials, setLnMarketsCredentials] = useState<LNMarketsCredentials | null>(null);
  const [isImportingTrades, setIsImportingTrades] = useState(false);
  const [isImportingDeposits, setIsImportingDeposits] = useState(false);
  const [isImportingWithdrawals, setIsImportingWithdrawals] = useState(false);
  const [importStats, setImportStats] = useState<LNMarketsImportStats | null>(null);

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

  // Effect para carregar credenciais LN Markets
  useEffect(() => {
    if (user?.email) {
      const credentials = retrieveLNMarketsCredentials(user.email);
      setLnMarketsCredentials(credentials);
    }
  }, [user?.email]);

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

  // Funções para importação LN Markets
  const handleImportTrades = async () => {
    if (!lnMarketsCredentials?.isConfigured || !currentActiveReportObjectFromHook) {
      toast({
        title: "Configuração necessária",
        description: "Configure suas credenciais LN Markets no perfil e certifique-se de ter um relatório ativo.",
        variant: "destructive",
      });
      return;
    }

    setIsImportingTrades(true);
    try {
      const client = createLNMarketsClient(lnMarketsCredentials);
      const response = await client.getTrades();

      if (!response.success || !response.data) {
        throw new Error(response.error || "Erro ao buscar trades");
      }

      let imported = 0;
      let duplicated = 0;
      let errors = 0;

      for (const trade of response.data) {
        if (trade.closed && trade.pl !== 0) {
          const profitRecord = convertTradeToProfit(trade);
          const result = addProfitRecord(profitRecord, currentActiveReportObjectFromHook.id, { suppressToast: true });
          
          if (result.status === 'added') {
            imported++;
          } else if (result.status === 'duplicate') {
            duplicated++;
          } else {
            errors++;
          }
        }
      }

      setImportStats(prev => ({
        trades: { total: response.data?.length || 0, imported, duplicated, errors },
        deposits: prev?.deposits || { total: 0, imported: 0, duplicated: 0, errors: 0 },
        withdrawals: prev?.withdrawals || { total: 0, imported: 0, duplicated: 0, errors: 0 },
      }));

      toast({
        title: "Trades importados",
        description: `${imported} trades importados, ${duplicated} duplicados ignorados`,
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao importar trades",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsImportingTrades(false);
    }
  };

  const handleImportDeposits = async () => {
    if (!lnMarketsCredentials?.isConfigured || !currentActiveReportObjectFromHook) {
      toast({
        title: "Configuração necessária",
        description: "Configure suas credenciais LN Markets no perfil e certifique-se de ter um relatório ativo.",
        variant: "destructive",
      });
      return;
    }

    setIsImportingDeposits(true);
    try {
      const client = createLNMarketsClient(lnMarketsCredentials);
      const response = await client.getDeposits();

      if (!response.success || !response.data) {
        throw new Error(response.error || "Erro ao buscar depósitos");
      }

      let imported = 0;
      let duplicated = 0;
      let errors = 0;

      for (const deposit of response.data) {
        if (deposit.status === 'confirmed') {
          const investment = convertDepositToInvestment(deposit);
          const result = addInvestment(investment, currentActiveReportObjectFromHook.id, { suppressToast: true });
          
          if (result.status === 'added') {
            imported++;
          } else if (result.status === 'duplicate') {
            duplicated++;
          } else {
            errors++;
          }
        }
      }

      setImportStats(prev => ({
        trades: prev?.trades || { total: 0, imported: 0, duplicated: 0, errors: 0 },
        deposits: { total: response.data?.length || 0, imported, duplicated, errors },
        withdrawals: prev?.withdrawals || { total: 0, imported: 0, duplicated: 0, errors: 0 },
      }));

      toast({
        title: "Depósitos importados",
        description: `${imported} depósitos importados, ${duplicated} duplicados ignorados`,
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao importar depósitos",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsImportingDeposits(false);
    }
  };

  const handleImportWithdrawals = async () => {
    if (!lnMarketsCredentials?.isConfigured || !currentActiveReportObjectFromHook) {
      toast({
        title: "Configuração necessária",
        description: "Configure suas credenciais LN Markets no perfil e certifique-se de ter um relatório ativo.",
        variant: "destructive",
      });
      return;
    }

    setIsImportingWithdrawals(true);
    try {
      const client = createLNMarketsClient(lnMarketsCredentials);
      const response = await client.getWithdrawals();

      if (!response.success || !response.data) {
        throw new Error(response.error || "Erro ao buscar saques");
      }

      let imported = 0;
      let duplicated = 0;
      let errors = 0;

      for (const withdrawal of response.data) {
        if (withdrawal.status === 'confirmed') {
          const withdrawalRecord = convertWithdrawalToRecord(withdrawal);
          const result = addWithdrawal(withdrawalRecord, currentActiveReportObjectFromHook.id, { suppressToast: true });
          
          if (result.status === 'added') {
            imported++;
          } else if (result.status === 'duplicate') {
            duplicated++;
          } else {
            errors++;
          }
        }
      }

      setImportStats(prev => ({
        trades: prev?.trades || { total: 0, imported: 0, duplicated: 0, errors: 0 },
        deposits: prev?.deposits || { total: 0, imported: 0, duplicated: 0, errors: 0 },
        withdrawals: { total: response.data?.length || 0, imported, duplicated, errors },
      }));

      toast({
        title: "Saques importados",
        description: `${imported} saques importados, ${duplicated} duplicados ignorados`,
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao importar saques",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsImportingWithdrawals(false);
    }
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

  // Calcular dados do resumo incluindo saques
  const reportSummaryData = useMemo(() => {
    if (!currentActiveReportObjectFromHook) return null;

    const investments = currentActiveReportObjectFromHook.investments || [];
    const profits = currentActiveReportObjectFromHook.profits || [];
    const withdrawals = currentActiveReportObjectFromHook.withdrawals || [];

    const totalInvestmentsBtc = investments.reduce((sum, inv) => sum + convertToBtc(inv.amount, inv.unit), 0);
    const totalWithdrawalsBtc = withdrawals.reduce((sum, w) => sum + convertToBtc(w.amount, w.unit), 0);
    
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

    // Saldo total (sem débito dos saques) e saldo atual (com débito dos saques)
    const totalBalanceBtc = totalInvestmentsBtc + operationalProfitBtc;
    const currentBalanceBtc = totalBalanceBtc - totalWithdrawalsBtc;

    return {
      totalInvestmentsBtc,
      operationalProfitBtc,
      valuationProfitUsd,
      averageBuyPriceUsd,
      totalWithdrawalsBtc,
      totalBalanceBtc,
      currentBalanceBtc,
      hasWithdrawals: withdrawals.length > 0,
    };
  }, [currentActiveReportObjectFromHook, states.currentRates, states.displayCurrency]);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      <Tabs value={states.activeTab} onValueChange={states.setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-black/40 backdrop-blur-sm">
          <TabsTrigger value="register" className="text-white data-[state=active]:bg-purple-700">
            Importar
          </TabsTrigger>
          <TabsTrigger value="history" className="text-white data-[state=active]:bg-purple-700">
            Histórico
          </TabsTrigger>
          <TabsTrigger value="chart" className="text-white data-[state=active]:bg-purple-700">
            Gráficos
          </TabsTrigger>
        </TabsList>

        {/* ABA IMPORTAR */}
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

                  {/* Cards de saldo (mostrar apenas se houver saques) */}
                  {reportSummaryData.hasWithdrawals && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 p-4 rounded-lg border border-yellow-500/30">
                        <div className="text-yellow-400 text-sm font-medium">Saldo Total</div>
                        <div className="text-white text-lg font-bold">
                          {reportSummaryData.totalBalanceBtc.toFixed(8)} BTC
                        </div>
                        <div className="text-yellow-300 text-xs">
                          Sem débito dos saques
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-red-500/20 to-red-600/20 p-4 rounded-lg border border-red-500/30">
                        <div className="text-red-400 text-sm font-medium">Saldo Atual</div>
                        <div className="text-white text-lg font-bold">
                          {reportSummaryData.currentBalanceBtc.toFixed(8)} BTC
                        </div>
                        <div className="text-red-300 text-xs">
                          Com débito dos saques
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Status da configuração LN Markets */}
            {!lnMarketsCredentials?.isConfigured && (
              <Alert>
                <Zap className="h-4 w-4" />
                <AlertDescription>
                  Configure suas credenciais LN Markets no perfil para importar dados automaticamente.
                </AlertDescription>
              </Alert>
            )}

            {/* Botões de importação LN Markets */}
            <Card className="bg-black/30 border border-purple-700/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Importação LN Markets
                </CardTitle>
                <CardDescription>
                  Importe seus dados diretamente da API LN Markets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    onClick={handleImportTrades}
                    disabled={!lnMarketsCredentials?.isConfigured || isImportingTrades}
                    className="h-16 flex flex-col items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <TrendingUp className="h-5 w-5" />
                    <span>
                      {isImportingTrades ? "Importando..." : "Importar Trades"}
                    </span>
                  </Button>

                  <Button
                    onClick={handleImportDeposits}
                    disabled={!lnMarketsCredentials?.isConfigured || isImportingDeposits}
                    className="h-16 flex flex-col items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Download className="h-5 w-5" />
                    <span>
                      {isImportingDeposits ? "Importando..." : "Importar Depósitos"}
                    </span>
                  </Button>

                  <Button
                    onClick={handleImportWithdrawals}
                    disabled={!lnMarketsCredentials?.isConfigured || isImportingWithdrawals}
                    className="h-16 flex flex-col items-center justify-center gap-2 bg-red-600 hover:bg-red-700"
                  >
                    <Upload className="h-5 w-5" />
                    <span>
                      {isImportingWithdrawals ? "Importando..." : "Importar Saques"}
                    </span>
                  </Button>
                </div>

                {/* Estatísticas de importação */}
                {importStats && (
                  <div className="mt-6 p-4 bg-black/20 rounded-lg border border-purple-700/30">
                    <h4 className="text-sm font-medium text-purple-400 mb-3">Última Importação</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {importStats.trades && (
                        <div>
                          <div className="text-green-400 font-medium">Trades</div>
                          <div>Total: {importStats.trades.total}</div>
                          <div>Importados: {importStats.trades.imported}</div>
                          <div>Duplicados: {importStats.trades.duplicated}</div>
                        </div>
                      )}
                      {importStats.deposits && (
                        <div>
                          <div className="text-blue-400 font-medium">Depósitos</div>
                          <div>Total: {importStats.deposits.total}</div>
                          <div>Importados: {importStats.deposits.imported}</div>
                          <div>Duplicados: {importStats.deposits.duplicated}</div>
                        </div>
                      )}
                      {importStats.withdrawals && (
                        <div>
                          <div className="text-red-400 font-medium">Saques</div>
                          <div>Total: {importStats.withdrawals.total}</div>
                          <div>Importados: {importStats.withdrawals.imported}</div>
                          <div>Duplicados: {importStats.withdrawals.duplicated}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
                Visualize e gerencie seus registros históricos incluindo saques
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-purple-400">
                Histórico será implementado aqui...
                {reportSummaryData?.hasWithdrawals && (
                  <p className="mt-2 text-sm">
                    Incluindo análise de saldo total vs saldo atual
                  </p>
                )}
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