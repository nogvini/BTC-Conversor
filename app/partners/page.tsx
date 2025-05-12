import Image from 'next/image';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Parceiros - Raid Bitcoin Toolkit",
  description: "Conheça nossos parceiros. Seção em breve!",
};

export default function PartnersPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:px-6 lg:py-12">
      <h1 className="text-3xl font-bold tracking-tight text-purple-300 sm:text-4xl mb-6">
        Nossos Parceiros
      </h1>
      <p className="mb-12 text-lg text-gray-400">
        Estamos construindo conexões valiosas para aprimorar ainda mais o Raid Bitcoin Toolkit. Em breve, você conhecerá nossos parceiros aqui.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
        {[1, 2, 3].map((item) => (
          <div key={item} className="flex flex-col items-center bg-gray-950/50 dark:bg-black/40 p-6 rounded-lg border border-purple-700/30 shadow-lg shadow-purple-900/10">
            <div className="w-32 h-32 bg-gray-700/50 rounded-full mb-4 overflow-hidden flex items-center justify-center">
              {/* Usando um SVG placeholder inline simples como fallback */}
              <svg className="w-20 h-20 text-gray-500 filter blur-sm" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
              </svg>
              {/* 
              Alternativa com Image do Next.js se tiver um placeholder genérico:
              <Image 
                src="/placeholder-logo.svg" // Ou .png/.jpg
                alt="Logo Parceiro (Em breve)"
                width={128}
                height={128}
                className="object-cover filter blur-md"
              /> 
              */}
            </div>
            <div className="w-full h-6 bg-gray-700/60 rounded mb-2 filter blur-sm"></div>
            <p className="text-sm text-gray-500">(Em breve...)</p>
          </div>
        ))}
      </div>
    </div>
  );
} 