"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { useReports } from "@/hooks/use-reports";
import { useIsMobile } from "@/hooks/use-mobile";
import { getCurrentBitcoinPrice } from "@/lib/client-api";
import { TrendingUp, Download, Upload, Wallet, Zap, FileSpreadsheet, ChevronLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

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
import type { LNMarketsCredentials, LNMarketsImportStats, LNMarketsAPIConfig, LNMarketsMultipleConfig } from "./types/ln-markets-types";
import { retrieveLNMarketsCredentials, retrieveLNMarketsMultipleConfigs, getLNMarketsConfig } from "@/lib/encryption";
import { 
  convertTradeToProfit, 
  convertDepositToInvestment, 
  convertWithdrawalToRecord 
} from "@/lib/ln-markets-converters";
import { 
  fetchLNMarketsTrades,
  fetchLNMarketsDeposits,
  fetchLNMarketsWithdrawals
} from "@/lib/ln-markets-client";
import { useAuth } from "@/hooks/use-auth";

// Imports para o sistema de relatórios integrado
import { ReportManager } from "@/components/report-manager";
import { ReportsComparison } from "@/components/reports-comparison";
import { DisplayCurrency, CurrencyUnit, Investment, ProfitRecord } from "@/lib/calculator-types";

export default function ProfitCalculator({ 
  btcToUsd, 
  brlToUsd, 
  appData, 
  activeReportData,
  onInvestmentAdd,
  onProfitAdd,
  onInvestmentDelete,
  onProfitDelete,
  onInvestmentsUpdate,
  onProfitsUpdate
}: ProfitCalculatorProps) {
  // Hook de autenticação
  const { session } = useAuth();
  const { user } = session;

  // NOVO: Estado para modo de comparação (integração do MultiReportCalculator)
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  
  // NOVO: Refs para controle de sincronização (do MultiReportCalculator)
  const lastUpdateRef = useRef<number>(0);
  const lastActiveReportIdRef = useRef<string | null>(null);
  const lastActiveReportDataRef = useRef<string | null>(null);
  const forceUpdateCountRef = useRef<number>(0);
  
  // NOVO: Estado local para forçar re-renders (do MultiReportCalculator)
  const [localForceUpdate, setLocalForceUpdate] = useState(0);

  // Hook de relatórios - com controle de sincronização
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

  // NOVOS Estados para múltiplas configurações LN Markets
  const [multipleConfigs, setMultipleConfigs] = useState<LNMarketsMultipleConfig | null>(null);
  const [selectedConfigForImport, setSelectedConfigForImport] = useState<string | null>(null);
  const [showConfigSelector, setShowConfigSelector] = useState(false);

  // Estados adicionais que não estão no hook customizado
  const [pendingInvestment, setPendingInvestment] = useState<any>(null);
  const [pendingProfit, setPendingProfit] = useState<any>(null);

  // NOVO: Estado de controle de sincronização
  const [syncState, setSyncState] = useState({
    lastUpdate: Date.now(),
    isStale: false,
    forceUpdateCount: 0
  });

  // Refs para controle de sincronização
  const lastReportDataRef = useRef<string | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const internalFileInputRef = useRef<HTMLInputElement>(null);
  const investmentCsvFileInputRef = useRef<HTMLInputElement>(null);
  const backupExcelFileInputRef = useRef<HTMLInputElement>(null);

  const isMobile = useIsMobile();

  // Determinar qual fonte de dados usar (props ou hook)
  const effectiveActiveReportId = activeReportData?.id || activeReportIdFromHook;
  const effectiveActiveReport = activeReportData?.report || currentActiveReportObjectFromHook;

  // NOVO: Effect principal para sincronização de dados
  useEffect(() => {
    if (!effectiveActiveReport || !effectiveActiveReportId) {
      return;
    }

    const reportDataHash = JSON.stringify({
      id: effectiveActiveReportId,
      investments: effectiveActiveReport.investments,
      profits: effectiveActiveReport.profits,
      withdrawals: effectiveActiveReport.withdrawals,
      updatedAt: effectiveActiveReport.updatedAt,
      lastUpdated: effectiveActiveReport.lastUpdated,
      forceUpdateTrigger: activeReportData?.forceUpdateTrigger
    });

    if (lastReportDataRef.current !== reportDataHash) {
      console.log('[ProfitCalculator] Dados do relatório mudaram:', {
        reportId: effectiveActiveReportId,
        reportName: effectiveActiveReport.name,
        investmentsCount: effectiveActiveReport.investments?.length || 0,
        profitsCount: effectiveActiveReport.profits?.length || 0,
        withdrawalsCount: effectiveActiveReport.withdrawals?.length || 0,
        forceUpdateTrigger: activeReportData?.forceUpdateTrigger,
        timestamp: new Date().toISOString()
      });

      lastReportDataRef.current = reportDataHash;
      
      // Atualizar estado de sincronização
      setSyncState(prev => ({
        ...prev,
        lastUpdate: Date.now(),
        isStale: false,
        forceUpdateCount: prev.forceUpdateCount + 1
      }));

      // Limpar timeout anterior se existir
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      // Agendar uma verificação de estagnação
      syncTimeoutRef.current = setTimeout(() => {
        setSyncState(prev => ({ ...prev, isStale: true }));
      }, 5000);
    }
  }, [
    effectiveActiveReportId,
    effectiveActiveReport,
    effectiveActiveReport?.investments,
    effectiveActiveReport?.profits,
    effectiveActiveReport?.withdrawals,
    effectiveActiveReport?.updatedAt,
    effectiveActiveReport?.lastUpdated,
    activeReportData?.forceUpdateTrigger
  ]);

  // Limpeza do timeout ao desmontar
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

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

  // NOVO Effect para carregar múltiplas configurações LN Markets
  useEffect(() => {
    if (user?.email) {
      const configs = retrieveLNMarketsMultipleConfigs(user.email);
      setMultipleConfigs(configs);
      
      // Se o relatório já tem uma configuração associada, verificar se ainda existe
      if (currentActiveReportObjectFromHook?.associatedLNMarketsConfigId) {
        const associatedConfig = configs?.configs.find(
          c => c.id === currentActiveReportObjectFromHook.associatedLNMarketsConfigId
        );
        if (associatedConfig) {
          setSelectedConfigForImport(associatedConfig.id);
        } else {
          // Configuração associada não existe mais, usar a padrão se disponível
          setSelectedConfigForImport(configs?.defaultConfigId || null);
        }
      } else {
        // Usar configuração padrão se disponível
        setSelectedConfigForImport(configs?.defaultConfigId || null);
      }
    }
  }, [user?.email, currentActiveReportObjectFromHook?.associatedLNMarketsConfigId]);

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
    console.log('[handleImportTrades] Iniciando importação de trades');
    
    const config = getCurrentImportConfig();
    
    console.log('[handleImportTrades] Configuração obtida:', {
      hasConfig: !!config,
      configName: config?.name,
      hasActiveReport: !!currentActiveReportObjectFromHook,
      reportName: currentActiveReportObjectFromHook?.name
    });
    
    if (!config || !currentActiveReportObjectFromHook || !user?.email) {
      console.log('[handleImportTrades] Configuração, relatório ou usuário ausente');
      toast({
        title: "Configuração necessária",
        description: "Selecione uma configuração LN Markets ativa e certifique-se de ter um relatório ativo.",
        variant: "destructive",
      });
      return;
    }

    setIsImportingTrades(true);
    try {
      console.log('[handleImportTrades] Fazendo requisição com credenciais:', {
        hasKey: !!config.credentials.key,
        hasSecret: !!config.credentials.secret,
        hasPassphrase: !!config.credentials.passphrase,
        network: config.credentials.network,
        isConfigured: config.credentials.isConfigured
      });
      
      const response = await fetchLNMarketsTrades(user.email, config.id);

      console.log('[handleImportTrades] Resposta recebida:', {
        success: response.success,
        hasData: !!response.data,
        dataLength: response.data?.length,
        error: response.error
      });

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
        description: `${imported} trades importados da configuração "${config.name}", ${duplicated} duplicados ignorados`,
        variant: "default",
      });
    } catch (error: any) {
      console.error('[handleImportTrades] Erro durante importação:', error);
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
    console.log('[handleImportDeposits] Iniciando importação de depósitos');
    
    const config = getCurrentImportConfig();
    
    console.log('[handleImportDeposits] Configuração obtida:', {
      hasConfig: !!config,
      configName: config?.name,
      hasActiveReport: !!currentActiveReportObjectFromHook,
      reportName: currentActiveReportObjectFromHook?.name
    });
    
    if (!config || !currentActiveReportObjectFromHook || !user?.email) {
      console.log('[handleImportDeposits] Configuração, relatório ou usuário ausente');
      toast({
        title: "Configuração necessária",
        description: "Selecione uma configuração LN Markets ativa e certifique-se de ter um relatório ativo.",
        variant: "destructive",
      });
      return;
    }

    setIsImportingDeposits(true);
    try {
      console.log('[handleImportDeposits] Fazendo requisição com credenciais:', {
        hasKey: !!config.credentials.key,
        hasSecret: !!config.credentials.secret,
        hasPassphrase: !!config.credentials.passphrase,
        network: config.credentials.network,
        isConfigured: config.credentials.isConfigured
      });
      
      const response = await fetchLNMarketsDeposits(user.email, config.id);

      console.log('[handleImportDeposits] Resposta recebida:', {
        success: response.success,
        hasData: !!response.data,
        dataLength: response.data?.length,
        error: response.error
      });

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
        description: `${imported} depósitos importados da configuração "${config.name}", ${duplicated} duplicados ignorados`,
        variant: "default",
      });
    } catch (error: any) {
      console.error('[handleImportDeposits] Erro durante importação:', error);
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
    console.log('[handleImportWithdrawals] Iniciando importação de saques');
    
    const config = getCurrentImportConfig();
    
    console.log('[handleImportWithdrawals] Configuração obtida:', {
      hasConfig: !!config,
      configName: config?.name,
      hasActiveReport: !!currentActiveReportObjectFromHook,
      reportName: currentActiveReportObjectFromHook?.name
    });
    
    if (!config || !currentActiveReportObjectFromHook || !user?.email) {
      console.log('[handleImportWithdrawals] Configuração, relatório ou usuário ausente');
      toast({
        title: "Configuração necessária",
        description: "Selecione uma configuração LN Markets ativa e certifique-se de ter um relatório ativo.",
        variant: "destructive",
      });
      return;
    }

    setIsImportingWithdrawals(true);
    try {
      console.log('[handleImportWithdrawals] Fazendo requisição com credenciais:', {
        hasKey: !!config.credentials.key,
        hasSecret: !!config.credentials.secret,
        hasPassphrase: !!config.credentials.passphrase,
        network: config.credentials.network,
        isConfigured: config.credentials.isConfigured
      });
      
      const response = await fetchLNMarketsWithdrawals(user.email, config.id);

      console.log('[handleImportWithdrawals] Resposta recebida:', {
        success: response.success,
        hasData: !!response.data,
        dataLength: response.data?.length,
        error: response.error
      });

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
        description: `${imported} saques importados da configuração "${config.name}", ${duplicated} duplicados ignorados`,
        variant: "default",
      });
    } catch (error: any) {
      console.error('[handleImportWithdrawals] Erro durante importação:', error);
      toast({
        title: "Erro ao importar saques",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsImportingWithdrawals(false);
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

  // NOVAS Funções para múltiplas configurações
  
  // Função para associar configuração ao relatório atual
  const handleAssociateConfigToReport = (configId: string) => {
    if (!currentActiveReportObjectFromHook) return;
    
    const config = multipleConfigs?.configs.find(c => c.id === configId);
    if (!config) return;

    const success = updateReport(currentActiveReportObjectFromHook.id, {
      associatedLNMarketsConfigId: configId,
      associatedLNMarketsConfigName: config.name
    });

    if (success) {
      setSelectedConfigForImport(configId);
      toast({
        title: "Configuração Associada",
        description: `Relatório agora está associado à configuração "${config.name}".`,
        variant: "default",
      });
    }
  };

  // Função para obter configuração atual para importação
  const getCurrentImportConfig = (): LNMarketsAPIConfig | null => {
    console.log('[getCurrentImportConfig] Verificando configuração:', {
      selectedConfigForImport,
      hasMultipleConfigs: !!multipleConfigs,
      configsLength: multipleConfigs?.configs?.length || 0,
      allConfigIds: multipleConfigs?.configs?.map(c => c.id) || []
    });
    
    if (!selectedConfigForImport || !multipleConfigs) {
      console.log('[getCurrentImportConfig] Faltam dados básicos');
      return null;
    }
    
    const config = multipleConfigs.configs.find(c => c.id === selectedConfigForImport && c.isActive);
    
    console.log('[getCurrentImportConfig] Resultado da busca:', {
      configFound: !!config,
      configId: config?.id,
      configName: config?.name,
      configIsActive: config?.isActive,
      hasCredentials: !!config?.credentials,
      credentialsKeys: config?.credentials ? Object.keys(config.credentials) : []
    });
    
    return config || null;
  };

  // NOVA Função de debug para verificar dados
  const debugImportData = () => {
    const config = getCurrentImportConfig();
    console.log('[DEBUG] Estado atual da importação:', {
      userEmail: user?.email,
      selectedConfigForImport,
      config: config ? {
        id: config.id,
        name: config.name,
        isActive: config.isActive,
        hasCredentials: !!config.credentials
      } : null,
      allConfigs: multipleConfigs?.configs?.map(c => ({
        id: c.id,
        name: c.name,
        isActive: c.isActive
      })) || []
    });
    
    toast({
      title: "Debug Info",
      description: `Config selecionado: ${config?.name || 'Nenhum'}. Verifique o console.`,
      variant: "default",
    });
  };

  // NOVO: Função para forçar atualização (do MultiReportCalculator)
  const forceUpdate = useCallback(() => {
    forceUpdateCountRef.current += 1;
    setLocalForceUpdate(forceUpdateCountRef.current);
    console.log('[ProfitCalculator] Forçando atualização:', forceUpdateCountRef.current);
  }, []);

  // NOVO: Effect principal para detectar mudanças no relatório ativo (do MultiReportCalculator)
  useEffect(() => {
    if (!reportsDataLoaded || !currentActiveReportObjectFromHook || !activeReportIdFromHook) {
      return;
    }

    const now = Date.now();
    const reportChanged = lastActiveReportIdRef.current !== activeReportIdFromHook;
    
    // Criar hash dos dados do relatório para detectar mudanças no conteúdo
    const reportDataHash = JSON.stringify({
      investments: currentActiveReportObjectFromHook.investments,
      profits: currentActiveReportObjectFromHook.profits,
      withdrawals: currentActiveReportObjectFromHook.withdrawals,
      updatedAt: currentActiveReportObjectFromHook.updatedAt,
      lastUpdated: currentActiveReportObjectFromHook.lastUpdated
    });
    
    const dataChanged = lastActiveReportDataRef.current !== reportDataHash;
    
    // Detectar se houve mudança significativa
    if (reportChanged || dataChanged || now - lastUpdateRef.current > 1000) {
      console.log('[ProfitCalculator] Mudança detectada:', {
        reportId: activeReportIdFromHook,
        reportName: currentActiveReportObjectFromHook.name,
        reportChanged,
        dataChanged,
        investmentsCount: currentActiveReportObjectFromHook.investments?.length || 0,
        profitsCount: currentActiveReportObjectFromHook.profits?.length || 0,
        withdrawalsCount: currentActiveReportObjectFromHook.withdrawals?.length || 0,
        timestamp: new Date().toISOString()
      });
      
      // Atualizar referências
      lastUpdateRef.current = now;
      lastActiveReportIdRef.current = activeReportIdFromHook;
      lastActiveReportDataRef.current = reportDataHash;
      
      // Forçar atualização do componente
      forceUpdate();
    }
  }, [
    currentActiveReportObjectFromHook, 
    activeReportIdFromHook, 
    reportsDataLoaded,
    currentActiveReportObjectFromHook?.investments, 
    currentActiveReportObjectFromHook?.profits, 
    currentActiveReportObjectFromHook?.withdrawals,
    currentActiveReportObjectFromHook?.updatedAt,
    currentActiveReportObjectFromHook?.lastUpdated,
    forceUpdate
  ]);

  // NOVO: Handlers com sincronização automática (do MultiReportCalculator)
  const handleAddInvestmentSynced = useCallback((date: string, amount: number, unit: CurrencyUnit) => {
    const result = addInvestment({ date, amount, unit });
    // Forçar atualização após adicionar investimento
    setTimeout(forceUpdate, 100);
    return result;
  }, [addInvestment, forceUpdate]);

  const handleAddProfitRecordSynced = useCallback((
    date: string,
    amount: number,
    unit: CurrencyUnit,
    isProfit: boolean
  ) => {
    const result = addProfitRecord({ date, amount, unit, isProfit });
    // Forçar atualização após adicionar registro de lucro
    setTimeout(forceUpdate, 100);
    return result;
  }, [addProfitRecord, forceUpdate]);

  const handleDeleteInvestmentSynced = useCallback((id: string) => {
    if (!activeReportIdFromHook) return false;
    const result = deleteInvestment(activeReportIdFromHook, id);
    // Forçar atualização após deletar investimento
    setTimeout(forceUpdate, 100);
    return result;
  }, [activeReportIdFromHook, deleteInvestment, forceUpdate]);

  const handleDeleteProfitSynced = useCallback((id: string) => {
    if (!activeReportIdFromHook) return false;
    const result = deleteProfitRecord(activeReportIdFromHook, id);
    // Forçar atualização após deletar lucro
    setTimeout(forceUpdate, 100);
    return result;
  }, [activeReportIdFromHook, deleteProfitRecord, forceUpdate]);

  const handleUpdateAllInvestmentsSynced = useCallback((investments: Investment[]) => {
    if (!activeReportIdFromHook) return false;
    const result = updateReportData(activeReportIdFromHook, investments, undefined);
    // Forçar atualização após atualizar investimentos
    setTimeout(forceUpdate, 100);
    return result;
  }, [activeReportIdFromHook, updateReportData, forceUpdate]);

  const handleUpdateAllProfitsSynced = useCallback((profits: ProfitRecord[]) => {
    if (!activeReportIdFromHook) return false;
    const result = updateReportData(activeReportIdFromHook, undefined, profits);
    // Forçar atualização após atualizar lucros
    setTimeout(forceUpdate, 100);
    return result;
  }, [activeReportIdFromHook, updateReportData, forceUpdate]);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      {/* NOVO: Sistema integrado de gerenciamento de relatórios */}
      {isComparisonMode ? (
        <ReportsComparison 
          onBack={() => setIsComparisonMode(false)} 
          btcToUsd={btcToUsd} 
          brlToUsd={brlToUsd} 
        />
      ) : (
        <>
          {/* NOVO: Cabeçalho com gerenciador de relatórios */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-6">
            <ReportManager onCompare={() => setIsComparisonMode(true)} />
            
            <Button
              variant="outline"
              size="sm"
              className="sm:ml-auto bg-black/30 border-purple-700/50 hover:bg-purple-900/20"
              onClick={() => setIsComparisonMode(true)}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Comparar Relatórios
            </Button>
          </div>

          {/* Conteúdo principal do calculadora */}
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
                {/* Cabeçalho do relatório ativo - somente exibição */}
                {currentActiveReportObjectFromHook && reportSummaryData && (
                  <Card className="bg-black/30 rounded-lg shadow-xl shadow-purple-900/10 border border-purple-700/40">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
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
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                )}

                {/* Seção de Configuração LN Markets Associada */}
                {multipleConfigs && multipleConfigs.configs.length > 0 && (
                  <Card className="bg-black/30 border border-blue-700/40">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="h-5 w-5 text-blue-500" />
                          Configuração LN Markets Associada
                        </div>
                        <Button
                          onClick={() => setShowConfigSelector(!showConfigSelector)}
                          size="sm"
                          variant="outline"
                          className="border-blue-500 text-blue-400"
                        >
                          {showConfigSelector ? "Cancelar" : "Trocar"}
                        </Button>
                      </CardTitle>
                      <CardDescription>
                        {selectedConfigForImport 
                          ? `Dados serão importados da configuração associada`
                          : "Nenhuma configuração associada - selecione uma para importar dados"
                        }
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      {!showConfigSelector ? (
                        // Mostrar configuração atual
                        <div>
                          {selectedConfigForImport ? (
                            (() => {
                              const currentConfig = multipleConfigs.configs.find(c => c.id === selectedConfigForImport);
                              return currentConfig ? (
                                <div className="p-3 border border-blue-500/30 rounded-lg bg-blue-500/5">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h3 className="font-medium text-white flex items-center gap-2">
                                        {currentConfig.name}
                                        <Badge variant={currentConfig.isActive ? "default" : "secondary"} className="text-xs">
                                          {currentConfig.isActive ? "Ativa" : "Inativa"}
                                        </Badge>
                                        {multipleConfigs.defaultConfigId === currentConfig.id && (
                                          <Badge variant="outline" className="text-xs">Padrão</Badge>
                                        )}
                                      </h3>
                                      {currentConfig.description && (
                                        <p className="text-sm text-blue-300">{currentConfig.description}</p>
                                      )}
                                      <p className="text-xs text-blue-400">
                                        Rede: {currentConfig.credentials.network}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-4 text-red-400">
                                  Configuração associada não encontrada
                                </div>
                              );
                            })()
                          ) : (
                            <div className="text-center py-4 text-yellow-400">
                              <Zap className="h-8 w-8 mx-auto mb-2" />
                              <p>Nenhuma configuração associada</p>
                              <p className="text-sm">Clique em "Trocar" para selecionar uma configuração</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        // Seletor de configuração
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-blue-400">Selecione uma configuração:</h4>
                          {multipleConfigs.configs.map((config) => (
                            <div key={config.id} className="p-3 border border-blue-500/30 rounded-lg hover:bg-blue-500/5 cursor-pointer"
                                 onClick={() => {
                                   handleAssociateConfigToReport(config.id);
                                   setShowConfigSelector(false);
                                 }}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="font-medium text-white flex items-center gap-2">
                                    {config.name}
                                    <Badge variant={config.isActive ? "default" : "secondary"} className="text-xs">
                                      {config.isActive ? "Ativa" : "Inativa"}
                                    </Badge>
                                    {multipleConfigs.defaultConfigId === config.id && (
                                      <Badge variant="outline" className="text-xs">Padrão</Badge>
                                    )}
                                  </h3>
                                  {config.description && (
                                    <p className="text-sm text-blue-300">{config.description}</p>
                                  )}
                                  <p className="text-xs text-blue-400">
                                    Rede: {config.credentials.network}
                                  </p>
                                </div>
                                {selectedConfigForImport === config.id && (
                                  <Badge variant="default" className="text-xs">Atual</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Status da configuração LN Markets */}
                {(!multipleConfigs || multipleConfigs.configs.length === 0) && (
                  <Alert>
                    <Zap className="h-4 w-4" />
                    <AlertDescription>
                      Configure suas credenciais LN Markets no perfil para importar dados automaticamente.
                    </AlertDescription>
                  </Alert>
                )}

                {selectedConfigForImport && !getCurrentImportConfig() && (
                  <Alert variant="destructive">
                    <Zap className="h-4 w-4" />
                    <AlertDescription>
                      A configuração associada está inativa. Ative-a no perfil ou selecione outra configuração.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Botões de importação LN Markets */}
                <Card className="bg-black/30 border border-purple-700/40">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Importação LN Markets
                      {selectedConfigForImport && (() => {
                        const config = getCurrentImportConfig();
                        return config ? (
                          <Badge variant="outline" className="text-xs">
                            {config.name}
                          </Badge>
                        ) : null;
                      })()}
                    </CardTitle>
                    <CardDescription>
                      {selectedConfigForImport 
                        ? "Importe dados da configuração associada"
                        : "Selecione uma configuração para importar dados"
                      }
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Button
                        onClick={handleImportTrades}
                        disabled={!getCurrentImportConfig() || isImportingTrades}
                        className="h-16 flex flex-col items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50"
                      >
                        <TrendingUp className="h-5 w-5" />
                        <span>
                          {isImportingTrades ? "Importando..." : "Importar Trades"}
                        </span>
                      </Button>

                      <Button
                        onClick={handleImportDeposits}
                        disabled={!getCurrentImportConfig() || isImportingDeposits}
                        className="h-16 flex flex-col items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Download className="h-5 w-5" />
                        <span>
                          {isImportingDeposits ? "Importando..." : "Importar Depósitos"}
                        </span>
                      </Button>

                      <Button
                        onClick={handleImportWithdrawals}
                        disabled={!getCurrentImportConfig() || isImportingWithdrawals}
                        className="h-16 flex flex-col items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50"
                      >
                        <Upload className="h-5 w-5" />
                        <span>
                          {isImportingWithdrawals ? "Importando..." : "Importar Saques"}
                        </span>
                      </Button>
                    </div>

                    {/* Botão de Debug */}
                    <div className="mt-4 flex justify-center">
                      <Button
                        onClick={debugImportData}
                        variant="outline"
                        size="sm"
                        className="border-orange-500 text-orange-400"
                      >
                        🐛 Debug Config
                      </Button>
                    </div>

                    {/* Estatísticas de importação */}
                    {importStats && selectedConfigForImport && (
                      <div className="mt-6 p-4 bg-black/20 rounded-lg border border-purple-700/30">
                        <h4 className="text-sm font-medium text-purple-400 mb-3">
                          Última Importação ({multipleConfigs?.configs.find(c => c.id === selectedConfigForImport)?.name})
                        </h4>
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
        </>
      )}
    </div>
  );
} 