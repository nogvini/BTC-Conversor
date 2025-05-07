"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

// Marcar a página como dinâmica
export const dynamic = "force-dynamic";

// Componente de carregamento
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
  </div>
);

// Importações dinâmicas
const RequireAuth = dynamic(
  () => import("@/components/require-auth").then(mod => mod.RequireAuth),
  { ssr: false }
);

const UserSettings = dynamic(
  () => import("@/components/user-settings"),
  { ssr: false, loading: LoadingFallback }
);

const PageTransition = dynamic(
  () => import("@/components/page-transition").then(mod => mod.PageTransition),
  { ssr: false }
);

export default function SettingsManagePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <main className="min-h-screen p-4 pt-24 md:pt-28 pb-8 md:pb-12">
        <LoadingFallback />
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 pt-24 md:pt-28 pb-8 md:pb-12">
      <RequireAuth>
        <PageTransition>
          <UserSettings />
        </PageTransition>
      </RequireAuth>
    </main>
  );
} 