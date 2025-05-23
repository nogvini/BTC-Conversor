"use client";

import { useReports } from "@/hooks/use-reports";
// import ProfitCalculator from "./profit-calculator"; // Comentado
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
  console.log("!!! [Wrapper RADICALMENTE SIMPLIFICADO] Componente Montado !!!", props);
  
  const { isLoaded: reportsDataLoaded, collection } = useReports();

  console.log("!!! [Wrapper RADICALMENTE SIMPLIFICADO] reportsDataLoaded do hook:", reportsDataLoaded);
  console.log("!!! [Wrapper RADICALMENTE SIMPLIFICADO] collection do hook:", collection ? JSON.stringify(collection) : 'undefined/null');

  if (!reportsDataLoaded) {
    console.log("!!! [Wrapper RADICALMENTE SIMPLIFICADO] Renderizando estado de carregamento (reportsDataLoaded é false).");
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="h-8 w-8 text-purple-500 animate-spin" />
        <span className="ml-2">Carregando... (Wrapper Simplificado)</span>
      </div>
    );
  }
  
  // Comentando a lógica de erro e a renderização do ProfitCalculator por enquanto
  /*
  if (!collection || !collection.reports || !Array.isArray(collection.reports)) {
    console.error("[Wrapper] Erro crítico: reportsDataLoaded é true, mas collection.reports é inválido.", collection);
    return (
      <div className="flex flex-col justify-center items-center h-64 text-red-500">
        <AlertTriangle className="h-8 w-8 mb-2" />
        <span>Erro ao carregar estrutura dos relatórios. (Wrapper Simplificado)</span>
      </div>
    );
  }
  */

  console.log("!!! [Wrapper RADICALMENTE SIMPLIFICADO] reportsDataLoaded é TRUE. Deveria tentar renderizar algo ou nada.");
  console.log("!!! [Wrapper RADICALMENTE SIMPLIFICADO] collection.reports é array?", Array.isArray(collection?.reports));
  
  // return <ProfitCalculator {...props} reportsCollection={collection} activeReportId={null} reportsDataLoaded={true} ... />; // Comentado
  return (
    <div className="p-4 border border-dashed border-yellow-500">
      <h2 className="text-yellow-500">ProfitCalculatorWrapper (Versão Radicalmente Simplificada)</h2>
      <p>Props recebidas: {JSON.stringify(props)}</p>
      <p>reportsDataLoaded: {String(reportsDataLoaded)}</p>
      <p>Collection tem reports array? {String(Array.isArray(collection?.reports))}</p>
      {collection?.reports && (
        <p>Número de relatórios: {collection.reports.length}</p>
      )}
      {!Array.isArray(collection?.reports) && reportsDataLoaded && (
        <p className="text-red-500 font-bold">ALERTA: collection.reports NÃO é um array, mas reportsDataLoaded é true!</p>
      )}
    </div>
  );
} 