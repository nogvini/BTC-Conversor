"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import ReportSelector from "./report-selector";
import { useReports } from "@/hooks/use-reports";
import { toast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";
import ChartWrapper from "./chart-wrapper";

// Lazy load ProfitCalculator
const ProfitCalculator = dynamic(() => import('./profit-calculator'), {
  loading: () => (
    <div className="flex flex-col items-center justify-center space-y-4 p-8 bg-black/20 rounded-lg shadow-xl shadow-purple-900/10 border border-purple-700/40 min-h-[300px]">
      <div className="animate-pulse flex flex-col items-center space-y-4 w-full max-w-md">
        <div className="h-8 bg-purple-700/30 rounded w-3/4 mb-4"></div>
        <div className="h-6 bg-purple-700/30 rounded w-1/2 mb-6"></div>
        <div className="h-10 bg-purple-700/30 rounded w-full"></div>
        <div className="h-10 bg-purple-700/30 rounded w-full"></div>
        <div className="h-10 bg-purple-800/40 rounded w-full mt-2"></div>
      </div>
      <p className="text-sm text-purple-400 mt-4">Carregando calculadora de lucros...</p>
    </div>
  ),
  ssr: false
});

// Lazy load ReportsComparison
const ReportsComparison = dynamic(() => import('./reports-comparison'), {
  loading: () => (
    <div className="flex items-center justify-center p-4 min-h-[200px]">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      <p className="ml-3 text-sm text-purple-400">Carregando comparação...</p>
    </div>
  ),
  ssr: false
});

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
    return (
      <div className="flex flex-col items-center justify-center space-y-3 p-6 bg-black/20 rounded-lg shadow-md border border-purple-700/30 min-h-[150px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
        <p className="text-purple-400 text-sm">Carregando seus relatórios...</p>
      </div>
    );
  }
  
  if (!activeReport && reports.length === 0) {
    return (
      <div className="p-6 bg-black/20 rounded-lg border border-purple-700/30 text-center">
        <p className="mb-3 text-purple-400">Nenhum relatório encontrado.</p>
        <ReportSelector 
          reports={reports}
          activeReportId={null}
          onSelectReport={selectReport}
          onAddReport={addReport}
          onUpdateReport={updateReport}
          onDeleteReport={deleteReport}
        />
      </div>
    );
  }

  if (!activeReport && reports.length > 0) {
    return (
      <div className="p-6 bg-black/20 rounded-lg border border-purple-700/30 text-center">
        <p className="mb-3 text-purple-400">Por favor, selecione um relatório ou crie um novo.</p>
        <ReportSelector 
          reports={reports}
          activeReportId={activeReportId}
          onSelectReport={selectReport}
          onAddReport={addReport}
          onUpdateReport={updateReport}
          onDeleteReport={deleteReport}
        />
      </div>
    );
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