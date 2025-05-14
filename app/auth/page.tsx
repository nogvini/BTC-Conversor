"use client";

import { AuthForm } from '@/components/auth-form'; // Importação direta

// Página estática que renderiza uma interface simples
// Marcada como edge runtime para evitar problemas com SSR
export const runtime = "edge";
export const dynamic = "force-dynamic";

export default function AuthPage() {
  console.log('!!!! [AuthPage] Renderizando AuthPage com AuthForm importado DIRETAMENTE !!!!');
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-black via-purple-950 to-black">
      <AuthForm />
    </div>
  );
} 