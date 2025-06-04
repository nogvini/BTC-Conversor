"use client";

import ProfitCalculator from "./profit-calculator";
import type { ProfitCalculatorProps } from "./types/profit-calculator-types";

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
  return (
    <ProfitCalculator
      btcToUsd={btcToUsd}
      brlToUsd={brlToUsd}
      appData={appData}
      activeReportData={null}
      onInvestmentAdd={() => {}}
      onProfitAdd={() => {}}
      onInvestmentDelete={() => {}}
      onProfitDelete={() => {}}
      onInvestmentsUpdate={() => {}}
      onProfitsUpdate={() => {}}
    />
  );
} 