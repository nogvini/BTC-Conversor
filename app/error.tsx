"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 p-8 rounded-lg border border-purple-800/50 shadow-xl max-w-md mx-auto">
        <h1 className="text-4xl font-bold text-white mb-4">Algo deu errado</h1>
        <p className="text-gray-300 mb-8">
          Ocorreu um erro inesperado. Por favor, tente novamente.
        </p>
        <Button onClick={reset} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    </div>
  );
} 