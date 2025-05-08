"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

// Componente de carregamento
const SettingsLoading = () => (
  <div className="min-h-screen p-4 pt-24 md:pt-28 pb-8 md:pb-12">
    <div className="max-w-4xl mx-auto text-center">
      <h1 className="text-2xl font-bold mb-4">Configurações</h1>
      <div className="py-8 flex flex-col items-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="mt-2 text-sm text-gray-500">Carregando configurações...</p>
      </div>
    </div>
  </div>
);

// Componente de configurações carregado dinamicamente
const UserSettings = dynamic(() => import("@/components/user-settings"), {
  ssr: false,
  loading: SettingsLoading,
});

// Componente de verificação de autenticação carregado dinamicamente
const RequireAuth = dynamic(
  () => import("@/components/require-auth").then(mod => mod.RequireAuth),
  { ssr: false }
);

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <SettingsLoading />;
  }

  return (
    <RequireAuth>
      <UserSettings />
    </RequireAuth>
  );
} 