"use client";

import { useReports } from "@/hooks/use-reports";
import ProfitCalculator from "./profit-calculator";
import { RefreshCw, AlertTriangle } from "lucide-react";

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

export default function ProfitCalculatorWrapper(props: ProfitCalculatorWrapperProps) {
  const { 
    collection,
    isLoaded: reportsDataLoaded,
  } = useReports();

  console.log("[Wrapper] reportsDataLoaded:", reportsDataLoaded);
  if (reportsDataLoaded) {
    console.log("[Wrapper] collection.reports:", collection?.reports ? JSON.stringify(collection.reports.map(r => ({id: r.id, name: r.name, numInvestments: r.investments?.length, numProfits: r.profits?.length }))) : 'undefined/null');
  }

  if (!reportsDataLoaded) {
    console.log("[Wrapper] Renderizando estado de carregamento.");
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="h-8 w-8 text-purple-500 animate-spin" />
        <span className="ml-2">Carregando dados dos relatórios...</span>
      </div>
    );
  }

  if (!collection || !collection.reports || !Array.isArray(collection.reports)) {
    console.error("[Wrapper] Erro crítico: reportsDataLoaded é true, mas collection.reports é inválido.", collection);
    return (
      <div className="flex flex-col justify-center items-center h-64 text-red-500">
        <AlertTriangle className="h-8 w-8 mb-2" />
        <span>Erro ao carregar estrutura dos relatórios.</span>
        <span>Por favor, verifique o console para mais detalhes.</span>
      </div>
    );
  }

  console.log("[Wrapper] Dados verificados. Renderizando ProfitCalculator...");
  return <ProfitCalculator {...props} />;
} 