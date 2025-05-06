"use client";

import { Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { PageTransition } from "@/components/page-transition";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [BitcoinConverter, setBitcoinConverter] = useState<React.ComponentType<any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Importar o componente apenas no lado do cliente
    import("@/components/bitcoin-converter").then((mod) => {
      setBitcoinConverter(() => mod.default);
      setIsLoading(false);
    });
  }, []);

  return (
    <main className="min-h-screen p-4 py-8 md:py-12">
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
      <Toaster />
    </main>
  );
}
