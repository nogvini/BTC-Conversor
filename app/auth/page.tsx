"use client";

// Página estática que renderiza uma interface simples
// Marcada como edge runtime para evitar problemas com SSR
export const runtime = "edge";
export const dynamic = "force-dynamic";

import AuthForm from "@/components/auth-form";

export default function AuthPage() {
  return (
    // Container principal para centralizar vertical e horizontalmente,
    // com altura mínima considerando o header (aprox. 4rem ou 64px)
    // e adicionando um padding superior para não colar no header.
    <main className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] pt-8 px-4">
      {/* Container para limitar a largura máxima do formulário */}
      <div className="w-full max-w-md">
        <AuthForm />
      </div>
    </main>
  );
} 