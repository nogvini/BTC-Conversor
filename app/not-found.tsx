import Link from "next/link";
import { Bitcoin } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-950 via-[#0c0e1d] to-black">
      <div className="flex items-center gap-2 mb-8">
        <Bitcoin className="h-10 w-10 text-indigo-500" />
        <h1 className="text-3xl font-bold text-indigo-300">Raid Bitcoin</h1>
      </div>
      
      <div className="max-w-md w-full p-8 bg-black/40 backdrop-blur-sm border border-indigo-900/30 rounded-xl text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Página não encontrada</h2>
        <p className="text-indigo-300 mb-6">
          A página que você está procurando não existe ou foi movida para outro local.
        </p>
        
        <Link href="/">
          <Button className="bg-indigo-800 hover:bg-indigo-700">
            Voltar para a página inicial
          </Button>
        </Link>
      </div>
    </div>
  );
} 