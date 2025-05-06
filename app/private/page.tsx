"use client"

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

// Componente de carregamento para mostrar enquanto carrega o conteúdo real
const PrivatePageLoading = () => (
  <main className="min-h-screen p-4 py-8 md:py-12">
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Área Restrita</CardTitle>
        <CardDescription>
          Carregando área restrita...
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center py-12">
        <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
      </CardContent>
    </Card>
  </main>
);

// Componente principal da página privada
export default function PrivatePage() {
  const [PrivatePageContent, setPrivatePageContent] = useState<React.ComponentType<any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Importar o componente apenas no lado do cliente
    import("@/components/private-page-content").then((mod) => {
      setPrivatePageContent(() => mod.default);
      setIsLoading(false);
    }).catch(error => {
      console.error("Erro ao carregar o conteúdo da página privada:", error);
      setIsLoading(false);
    });
  }, []);

  // Mostrar o estado de loading enquanto o componente real não estiver pronto
  if (isLoading || !PrivatePageContent) {
    return <PrivatePageLoading />;
  }

  // Quando o componente estiver pronto, renderizá-lo
  return <PrivatePageContent />;
} 