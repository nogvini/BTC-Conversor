"use client";

import { Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { PageTransition } from "@/components/page-transition";
import { Loader2 } from "lucide-react";
import { NavigationBar } from "@/components/ui/navigation-bar";

// Componente seguro para renderização no lado do cliente apenas
export default function Home() {
  const [isBrowser, setIsBrowser] = useState(false);
  const [BitcoinConverter, setBitcoinConverter] = useState<React.ComponentType<any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Verificar se estamos no navegador
  useEffect(() => {
    setIsBrowser(true);
  }, []);

  // Carregar componente apenas no lado do cliente
  useEffect(() => {
    if (isBrowser) {
      import("@/components/bitcoin-converter").then((mod) => {
        setBitcoinConverter(() => mod.default);
        setIsLoading(false);
      }).catch(error => {
        console.error("Erro ao carregar componente BitcoinConverter:", error);
        setIsLoading(false);
      });
    }
  }, [isBrowser]);
  
  // Função para atualizar os dados
  const handleRefresh = () => {
    if (BitcoinConverter && !isRefreshing) {
      setIsRefreshing(true);
      
      // Recarregar o componente
      import("@/components/bitcoin-converter").then((mod) => {
        setBitcoinConverter(() => mod.default);
        setIsRefreshing(false);
      }).catch(error => {
        console.error("Erro ao recarregar componente:", error);
        setIsRefreshing(false);
      });
    }
  };

  // Durante SSR ou hidratação inicial, mostrar apenas um esqueleto
  if (!isBrowser) {
    return (
      <main className="min-h-screen">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-10 w-10 rounded-full bg-purple-500/20" />
        </div>
      </main>
    );
  }

  // Renderização no lado do cliente
  return (
    <main className="min-h-screen">
      <NavigationBar onRefresh={handleRefresh} loading={isRefreshing} />
      
      <div className="p-4 pt-16 md:pt-20 pb-8 md:pb-12">
        <Suspense fallback={<div>Carregando...</div>}>
          <PageTransition>
            {isLoading ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
              </div>
            ) : BitcoinConverter ? (
              <BitcoinConverter />
            ) : null}
          </PageTransition>
        </Suspense>
      </div>
      
      <Toaster />
    </main>
  );
}
