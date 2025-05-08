"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

// Componente de carregamento
const SettingsFormLoading = () => (
  <div className="py-8 flex flex-col items-center">
    <Loader2 className="h-8 w-8 animate-spin" />
    <p className="mt-2 text-sm text-gray-500">Carregando configurações...</p>
  </div>
);

// Componente de configurações carregado dinamicamente
const UserSettings = dynamic(() => import("@/components/user-settings"), {
  ssr: false,
  loading: SettingsFormLoading,
});

// Componente de verificação de autenticação carregado dinamicamente
const RequireAuth = dynamic(
  () => import("@/components/require-auth").then(mod => mod.RequireAuth),
  { ssr: false }
);

export default function SettingsFormPage() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <SettingsFormLoading />;
  }

  return (
    <RequireAuth>
      <UserSettings />
    </RequireAuth>
  );
} 