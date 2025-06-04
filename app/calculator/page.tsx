"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import ProfitCalculatorWrapper from "@/components/profit-calculator-wrapper";
import { getCurrentBitcoinPrice } from "@/lib/client-api";
import { PageTransition } from "@/components/page-transition";

// Importar RequireAuth dinamicamente com SSR desabilitado
const RequireAuth = dynamic(() => import("@/components/require-auth").then(mod => mod.RequireAuth), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
    </div>
  )
});

export default function CalculatorPage() {
  const [btcToUsd, setBtcToUsd] = useState(65000);
  const [brlToUsd, setBrlToUsd] = useState(5.2);
  const [isLoading, setIsLoading] = useState(true);
  const [appData, setAppData] = useState<{
    currentPrice: {
      usd: number;
      brl: number;
      isUsingCache?: boolean;
    };
    isUsingCache: boolean;
  } | null>(null);

  // Carregar dados de mercado
  useEffect(() => {
    async function loadMarketData() {
      try {
        const priceData = await getCurrentBitcoinPrice();
        if (priceData) {
          setBtcToUsd(priceData.usd);
          setBrlToUsd(priceData.brl / priceData.usd);
          
          setAppData({
            currentPrice: {
              usd: priceData.usd,
              brl: priceData.brl,
              isUsingCache: priceData.isUsingCache
            },
            isUsingCache: priceData.isUsingCache || false
          });
        }
      } catch (error) {
        console.error("Erro ao carregar dados de mercado:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadMarketData();
  }, []);

  // Conteúdo da calculadora
  const calculatorContent = (
    <PageTransition>
      <div className="container max-w-4xl py-6 px-4 md:px-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">Calculadora de Lucros</h1>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <ProfitCalculatorWrapper 
            btcToUsd={btcToUsd} 
            brlToUsd={brlToUsd} 
            appData={appData || undefined}
          />
        )}
      </div>
    </PageTransition>
  );

  return (
    <RequireAuth>
      {calculatorContent}
    </RequireAuth>
  );
}