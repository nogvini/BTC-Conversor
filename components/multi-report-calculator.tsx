"use client";

import { useState, useEffect, useRef } from "react";
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
  const lastUpdateRef = useRef<number>(0);
  
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

  useEffect(() => {
    if (activeReport) {
      const now = Date.now();
      if (now - lastUpdateRef.current > 100) {
        lastUpdateRef.current = now;
        console.log('[MultiReportCalculator] Relatório ativo atualizado:', activeReport.name);
      }
    }
  }, [activeReport, activeReportId]);

  const handleAddInvestment = (date: string, amount: number, unit: CurrencyUnit) => {
    return addInvestment({ date, amount, unit });
  };

  const handleAddProfitRecord = (
    date: string,
    amount: number,
    unit: CurrencyUnit,
    isProfit: boolean
  ) => {
    return addProfitRecord({ date, amount, unit, isProfit });
  };

  const handleDeleteInvestment = (id: string) => {
    if (!activeReportId) return false;
    return deleteInvestment(activeReportId, id);
  };

  const handleDeleteProfit = (id: string) => {
    if (!activeReportId) return false;
    return deleteProfitRecord(activeReportId, id);
  };

  const handleUpdateAllInvestments = (investments: Investment[]) => {
    if (!activeReportId) return false;
    return updateReportData(activeReportId, investments, undefined);
  };

  const handleUpdateAllProfits = (profits: ProfitRecord[]) => {
    if (!activeReportId) return false;
    return updateReportData(activeReportId, undefined, profits);
  };

  return (
    <div className="space-y-6" key={`multi-calc-${activeReportId || 'no-report'}-${key || 'default'}`}>
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
              key={`profit-calc-${activeReportId}-${activeReport.lastUpdated || 'no-date'}`}
              btcToUsd={btcToUsd}
              brlToUsd={brlToUsd}
              appData={appData}
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