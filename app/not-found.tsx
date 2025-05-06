"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 p-8 rounded-lg border border-purple-800/50 shadow-xl max-w-md mx-auto">
        <h1 className="text-4xl font-bold text-white mb-4">Página Não Encontrada</h1>
        <p className="text-gray-300 mb-8">
          Desculpe, a página que você está procurando não existe ou foi movida.
        </p>
        <Link href="/">
          <Button className="gap-2">
            <Home className="h-4 w-4" />
            Voltar para a página inicial
          </Button>
        </Link>
      </div>
    </div>
  );
} 