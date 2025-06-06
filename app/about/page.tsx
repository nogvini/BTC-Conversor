import { Bitcoin, Calculator, Info, LineChart, Settings, Users, Handshake } from "lucide-react";
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Sobre Nós - Raid Bitcoin Toolkit",
  description: "Saiba mais sobre as funcionalidades do Raid Bitcoin Toolkit.",
};

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:px-6 lg:py-12">
      <h1 className="text-3xl font-bold tracking-tight text-purple-300 sm:text-4xl mb-6">
        Sobre o Raid Bitcoin Toolkit
      </h1>
      <p className="mb-8 text-lg text-gray-400">
        Nossa missão é fornecer ferramentas intuitivas e poderosas para que você navegue no mundo do Bitcoin com confiança.
        Explore nossas principais funcionalidades:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* Card Conversor */}
        <Link href="/converter" className="block h-full">
          <div className="h-full bg-gray-950/50 dark:bg-black/40 p-6 md:p-8 rounded-lg border border-purple-700/30 shadow-lg shadow-purple-900/10 hover:border-purple-600/50 hover:bg-purple-900/10 transition-all cursor-pointer flex flex-col min-h-[280px]">
            <div className="flex items-center mb-4">
              <Bitcoin className="h-8 w-8 text-amber-400 mr-3 flex-shrink-0" />
              <h2 className="text-xl font-semibold text-purple-300">Conversor BTC/SATS</h2>
            </div>
            <p className="text-gray-400 flex-grow">
              Converta facilmente valores entre Bitcoin (BTC), Satoshis (SATS), Dólar Americano (USD) e Real Brasileiro (BRL).
              Mantenha-se atualizado com as cotações mais recentes.
            </p>
          </div>
        </Link>
        
        {/* Card Gráfico */}
        <Link href="/chart" className="block h-full">
          <div className="h-full bg-gray-950/50 dark:bg-black/40 p-6 md:p-8 rounded-lg border border-purple-700/30 shadow-lg shadow-purple-900/10 hover:border-purple-600/50 hover:bg-purple-900/10 transition-all cursor-pointer flex flex-col min-h-[280px]">
            <div className="flex items-center mb-4">
              <LineChart className="h-8 w-8 text-green-500 mr-3 flex-shrink-0" />
              <h2 className="text-xl font-semibold text-purple-300">Gráfico Histórico</h2>
            </div>
            <p className="text-gray-400 flex-grow">
              Visualize a evolução do preço do Bitcoin ao longo do tempo. Analise tendências e tome decisões informadas sobre seus investimentos.
            </p>
          </div>
        </Link>
        
        {/* Card Calculadora */}
        <Link href="/calculator" className="block h-full">
          <div className="h-full bg-gray-950/50 dark:bg-black/40 p-6 md:p-8 rounded-lg border border-purple-700/30 shadow-lg shadow-purple-900/10 hover:border-purple-600/50 hover:bg-purple-900/10 transition-all cursor-pointer flex flex-col min-h-[280px]">
            <div className="flex items-center mb-4">
              <Calculator className="h-8 w-8 text-blue-500 mr-3 flex-shrink-0" />
              <h2 className="text-xl font-semibold text-purple-300">Calculadora de Lucro</h2>
            </div>
            <p className="text-gray-400 flex-grow">
              Estime o lucro potencial de seus investimentos em Bitcoin com base em diferentes cenários de compra e venda.
            </p>
          </div>
        </Link>
        
        {/* Card Perfil */}
        <Link href="/profile" className="block h-full">
          <div className="h-full bg-gray-950/50 dark:bg-black/40 p-6 md:p-8 rounded-lg border border-purple-700/30 shadow-lg shadow-purple-900/10 hover:border-purple-600/50 hover:bg-purple-900/10 transition-all cursor-pointer flex flex-col min-h-[280px]">
            <div className="flex items-center mb-4">
              <Users className="h-8 w-8 text-purple-400 mr-3 flex-shrink-0" />
              <h2 className="text-xl font-semibold text-purple-300">Perfil de Usuário</h2>
            </div>
            <p className="text-gray-400 flex-grow">
              Gerencie suas informações pessoais e visualize seus dados de forma segura.
            </p>
          </div>
        </Link>
        
        {/* Card Configurações */}
        <Link href="/settings" className="block h-full">
          <div className="h-full bg-gray-950/50 dark:bg-black/40 p-6 md:p-8 rounded-lg border border-purple-700/30 shadow-lg shadow-purple-900/10 hover:border-purple-600/50 hover:bg-purple-900/10 transition-all cursor-pointer flex flex-col min-h-[280px]">
            <div className="flex items-center mb-4">
              <Settings className="h-8 w-8 text-gray-500 mr-3 flex-shrink-0" />
              <h2 className="text-xl font-semibold text-purple-300">Configurações</h2>
            </div>
            <p className="text-gray-400 flex-grow">
              Personalize a aparência e o comportamento da aplicação de acordo com suas preferências.
            </p>
          </div>
        </Link>

        {/* Card Parceiros */}
        <div className="h-full bg-gray-950/50 dark:bg-black/40 p-6 md:p-8 rounded-lg border border-purple-700/30 shadow-lg shadow-purple-900/10 hover:border-purple-600/50 hover:bg-purple-900/10 transition-all opacity-75 flex flex-col min-h-[280px]">
          <div className="flex items-center mb-4">
            <Handshake className="h-8 w-8 text-teal-500 mr-3 flex-shrink-0" />
            <h2 className="text-xl font-semibold text-purple-300">Parceiros</h2>
          </div>
          <div className="flex-grow">
            <p className="text-gray-400 mb-2">
              Conheça as empresas e projetos que colaboram conosco para trazer a melhor experiência para você.
            </p>
            <p className="text-xs text-purple-400 italic">Em breve</p>
          </div>
        </div>
        
      </div>

      <div className="mt-12 text-center">
        <p className="text-gray-500">Estamos constantemente trabalhando para adicionar novas funcionalidades e melhorar sua experiência.</p>
      </div>

    </div>
  );
} 