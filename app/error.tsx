'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, Bitcoin } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Logar o erro para análise
    console.error('Erro na aplicação:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-950 via-[#0c0e1d] to-black">
      <div className="flex items-center gap-2 mb-8">
        <Bitcoin className="h-10 w-10 text-indigo-500" />
        <h1 className="text-3xl font-bold text-indigo-300">Raid Bitcoin</h1>
      </div>
      
      <div className="max-w-md w-full p-8 bg-black/40 backdrop-blur-sm border border-indigo-900/30 rounded-xl text-center">
        <div className="flex justify-center mb-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">Algo deu errado</h2>
        <p className="text-indigo-300 mb-6">
          Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={reset}
            className="bg-indigo-800 hover:bg-indigo-700"
          >
            Tentar novamente
          </Button>
          
          <Link href="/">
            <Button variant="outline" className="border-indigo-700 text-indigo-300">
              Voltar para a página inicial
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
} 