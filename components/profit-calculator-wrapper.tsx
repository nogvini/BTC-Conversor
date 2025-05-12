"use client";

import { useState, useEffect } from "react";
import ProfitCalculator from "./profit-calculator";
import ReportSelector from "./report-selector";
import ReportsComparison from "./reports-comparison";
import { useReports } from "@/hooks/use-reports";
import { toast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";
import ChartWrapper from "./chart-wrapper";

interface ProfitCalculatorWrapperProps {
  btcToUsd: number;
  brlToUsd: number;
  appData?: {
    currentPrice: {
      usd: number;
      brl: number;
      isUsingCache?: boolean;
    };
    isUsingCache: boolean;
  };
}

export default function ProfitCalculatorWrapper({ 
  btcToUsd, 
  brlToUsd, 
  appData 
}: ProfitCalculatorWrapperProps) {
  const { 
    reports,
    activeReport, 
    activeReportId,
    isLoaded,
    addReport, 
    selectReport, 
    deleteReport, 
    updateReport
  } = useReports();
  
  const [isShowingComparison, setIsShowingComparison] = useState(false);
  
  // Mostrar mensagem quando dados são carregados
  useEffect(() => {
    if (isLoaded && reports.length > 0) {
      toast({
        title: "Relatórios carregados",
        description: `${reports.length} relatório(s) carregado(s) com sucesso`,
        variant: "default",
        duration: 3000,
      });
    }
  }, [isLoaded, reports.length]);
  
  // Toggle para mostrar/ocultar comparação
  const toggleComparison = () => {
    setIsShowingComparison(prev => !prev);
  };
  
  if (!isLoaded) {
    return <div className="p-4">Carregando seus relatórios...</div>;
  }
  
  if (!activeReport) {
    return <div className="p-4">Nenhum relatório encontrado.</div>;
  }
  
  return (
    <div className="space-y-4">
      {/* Seletor de Relatórios */}
      <ReportSelector 
        reports={reports}
        activeReportId={activeReportId}
        onSelectReport={selectReport}
        onAddReport={addReport}
        onUpdateReport={updateReport}
        onDeleteReport={deleteReport}
      />
      
      {/* Gerenciador de Visibilidade de Comparação */}
      <div className="flex justify-end">
        <button 
          className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
            isShowingComparison 
              ? 'bg-purple-700/60 hover:bg-purple-700/80' 
              : 'bg-purple-900/30 hover:bg-purple-900/50'
          }`}
          onClick={toggleComparison}
        >
          {isShowingComparison ? 'Ocultar Comparação' : 'Comparar Relatórios'}
        </button>
      </div>
      
      {/* Componente de Comparação (condicional) */}
      {isShowingComparison && reports.length > 0 && (
        <Card className="mb-4 bg-black/30 border-purple-700/50">
          <ChartWrapper>
            <ReportsComparison 
              reports={reports} 
              btcToUsd={appData?.currentPrice?.usd || btcToUsd} 
              brlToUsd={brlToUsd} 
            />
          </ChartWrapper>
        </Card>
      )}
      
      {/* Calculadora de Lucros */}
      <ProfitCalculator 
        btcToUsd={btcToUsd} 
        brlToUsd={brlToUsd} 
        appData={appData}
        report={activeReport}
        onUpdateReport={updateReport}
      />
    </div>
  );
} 