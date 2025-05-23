"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, ChevronLeft } from "lucide-react";
import { ReportManager } from "@/components/report-manager";
import { useReports } from "@/hooks/use-reports";
import { ReportsComparison } from "@/components/reports-comparison";
import ProfitCalculator from "@/components/profit-calculator";
import { DisplayCurrency, CurrencyUnit, Investment, ProfitRecord } from "@/lib/calculator-types";

interface MultiReportCalculatorProps {
  btcToUsd: number;
  brlToUsd: number;
  appData?: any;
  key?: string | number;
}

export function MultiReportCalculator({ btcToUsd, brlToUsd, appData, key }: MultiReportCalculatorProps) {
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  
  // Refs para controle de sincronização
  const lastUpdateRef = useRef<number>(0);
  const lastActiveReportIdRef = useRef<string | null>(null);
  const lastActiveReportDataRef = useRef<string | null>(null);
  const forceUpdateCountRef = useRef<number>(0);
  
  // Estado local para forçar re-renders
  const [localForceUpdate, setLocalForceUpdate] = useState(0);
  
  const {
    activeReport,
    activeReportId,
    isLoaded,
    addInvestment,
    addProfitRecord,
    deleteInvestment,
    deleteProfitRecord,
    updateReportData,
  } = useReports();

  // Função para forçar atualização
  const forceUpdate = useCallback(() => {
    forceUpdateCountRef.current += 1;
    setLocalForceUpdate(forceUpdateCountRef.current);
    console.log('[MultiReportCalculator] Forçando atualização:', forceUpdateCountRef.current);
  }, []);

  // Effect principal para detectar mudanças no relatório ativo
  useEffect(() => {
    if (!isLoaded || !activeReport || !activeReportId) {
      return;
    }

    const now = Date.now();
    const reportChanged = lastActiveReportIdRef.current !== activeReportId;
    
    // Criar hash dos dados do relatório para detectar mudanças no conteúdo
    const reportDataHash = JSON.stringify({
      investments: activeReport.investments,
      profits: activeReport.profits,
      withdrawals: activeReport.withdrawals,
      updatedAt: activeReport.updatedAt,
      lastUpdated: activeReport.lastUpdated
    });
    
    const dataChanged = lastActiveReportDataRef.current !== reportDataHash;
    
    // Detectar se houve mudança significativa
    if (reportChanged || dataChanged || now - lastUpdateRef.current > 1000) {
      console.log('[MultiReportCalculator] Mudança detectada:', {
        reportId: activeReportId,
        reportName: activeReport.name,
        reportChanged,
        dataChanged,
        investmentsCount: activeReport.investments?.length || 0,
        profitsCount: activeReport.profits?.length || 0,
        withdrawalsCount: activeReport.withdrawals?.length || 0,
        timestamp: new Date().toISOString()
      });
      
      // Atualizar referências
      lastUpdateRef.current = now;
      lastActiveReportIdRef.current = activeReportId;
      lastActiveReportDataRef.current = reportDataHash;
      
      // Forçar atualização do componente filho
      forceUpdate();
    }
  }, [
    activeReport, 
    activeReportId, 
    isLoaded,
    activeReport?.investments, 
    activeReport?.profits, 
    activeReport?.withdrawals,
    activeReport?.updatedAt,
    activeReport?.lastUpdated,
    forceUpdate
  ]);

  // Effect adicional para mudanças de props externas
  useEffect(() => {
    console.log('[MultiReportCalculator] Props externas mudaram:', {
      btcToUsd,
      brlToUsd,
      key,
      appDataTimestamp: appData?.lastFetched
    });
    forceUpdate();
  }, [btcToUsd, brlToUsd, key, appData?.lastFetched, forceUpdate]);

  // Effect para log de re-renderização
  useEffect(() => {
    console.log('[MultiReportCalculator] Componente re-renderizado:', {
      key,
      localForceUpdate,
      activeReportId,
      isLoaded,
      timestamp: new Date().toISOString()
    });
  }, [key, localForceUpdate, activeReportId, isLoaded]);

  // Handlers com sincronização automática
  const handleAddInvestment = useCallback((date: string, amount: number, unit: CurrencyUnit) => {
    const result = addInvestment({ date, amount, unit });
    // Forçar atualização após adicionar investimento
    setTimeout(forceUpdate, 100);
    return result;
  }, [addInvestment, forceUpdate]);

  const handleAddProfitRecord = useCallback((
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

  const handleDeleteInvestment = useCallback((id: string) => {
    if (!activeReportId) return false;
    const result = deleteInvestment(activeReportId, id);
    // Forçar atualização após deletar investimento
    setTimeout(forceUpdate, 100);
    return result;
  }, [activeReportId, deleteInvestment, forceUpdate]);

  const handleDeleteProfit = useCallback((id: string) => {
    if (!activeReportId) return false;
    const result = deleteProfitRecord(activeReportId, id);
    // Forçar atualização após deletar lucro
    setTimeout(forceUpdate, 100);
    return result;
  }, [activeReportId, deleteProfitRecord, forceUpdate]);

  const handleUpdateAllInvestments = useCallback((investments: Investment[]) => {
    if (!activeReportId) return false;
    const result = updateReportData(activeReportId, investments, undefined);
    // Forçar atualização após atualizar investimentos
    setTimeout(forceUpdate, 100);
    return result;
  }, [activeReportId, updateReportData, forceUpdate]);

  const handleUpdateAllProfits = useCallback((profits: ProfitRecord[]) => {
    if (!activeReportId) return false;
    const result = updateReportData(activeReportId, undefined, profits);
    // Forçar atualização após atualizar lucros
    setTimeout(forceUpdate, 100);
    return result;
  }, [activeReportId, updateReportData, forceUpdate]);

  // Gerar chave única para o ProfitCalculator baseada em múltiplos fatores
  const profitCalculatorKey = `profit-calc-${activeReportId || 'no-report'}-${localForceUpdate}-${activeReport?.updatedAt || 'no-date'}-${JSON.stringify(activeReport?.investments?.length || 0)}-${JSON.stringify(activeReport?.profits?.length || 0)}-${Date.now()}`;

  console.log('[MultiReportCalculator] Renderizando com key:', profitCalculatorKey);

  return (
    <div className="space-y-6" key={`multi-calc-${activeReportId || 'no-report'}-${localForceUpdate}`}>
      {isComparisonMode ? (
        <ReportsComparison 
          onBack={() => setIsComparisonMode(false)} 
          btcToUsd={btcToUsd} 
          brlToUsd={brlToUsd} 
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
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
          
          {activeReport && isLoaded ? (
            <ProfitCalculator
              key={profitCalculatorKey}
              btcToUsd={btcToUsd}
              brlToUsd={brlToUsd}
              appData={appData}
              // Passar dados diretamente para garantir sincronização
              activeReportData={{
                id: activeReportId,
                report: activeReport,
                forceUpdateTrigger: localForceUpdate
              }}
              // Passar handlers sincronizados
              onInvestmentAdd={handleAddInvestment}
              onProfitAdd={handleAddProfitRecord}
              onInvestmentDelete={handleDeleteInvestment}
              onProfitDelete={handleDeleteProfit}
              onInvestmentsUpdate={handleUpdateAllInvestments}
              onProfitsUpdate={handleUpdateAllProfits}
            />
          ) : (
            <div className="flex items-center justify-center h-40">
              <div className="animate-pulse h-6 w-40 bg-purple-900/20 rounded"></div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 