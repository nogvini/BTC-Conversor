"use client";

// Página estática que renderiza uma interface simples
// Marcada como edge runtime para evitar problemas com SSR
export const runtime = "edge";
export const dynamic = "force-dynamic";

import dynamic from 'next/dynamic';

// Aplicar lazy loading ao AuthForm
const AuthForm = dynamic(() => import('@/components/auth-form').then(mod => mod.AuthForm), {
  loading: () => (
    <div className="flex flex-col items-center justify-center space-y-4 p-8 bg-black/20 rounded-lg shadow-xl shadow-purple-900/10 border border-purple-700/40 w-full max-w-md">
      <div className="animate-pulse flex flex-col items-center space-y-4 w-full">
        <div className="h-8 bg-purple-700/30 rounded w-3/4"></div>
        <div className="h-4 bg-purple-700/30 rounded w-1/2"></div>
        <div className="space-y-3 w-full pt-4">
          <div className="h-10 bg-purple-700/30 rounded w-full"></div>
          <div className="h-10 bg-purple-700/30 rounded w-full"></div>
          <div className="h-10 bg-purple-800/40 rounded w-full mt-2"></div>
        </div>
      </div>
    </div>
  ),
  ssr: false 
});

export default function AuthPage() {
  console.log('!!!! [AuthPage] Renderizando AuthPage SIMPLES !!!!');
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Página de Autenticação (Versão de Teste)</h1>
      <p>Se você está vendo esta mensagem, a navegação básica para /auth funcionou.</p>
      <p>O AuthForm NÃO está sendo renderizado nesta versão de teste.</p>
    </div>
  );
} 