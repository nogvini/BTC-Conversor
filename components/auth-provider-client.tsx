"use client";

import React, { useEffect, useState } from "react";
import { AuthProvider } from "@/hooks/use-auth";
import { ConnectionStatus } from "./connection-status";
import { Loader2 } from "lucide-react";

export function AuthProviderClient({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    if (typeof window !== 'undefined') {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error("ERRO CRÍTICO: Variáveis de ambiente do Supabase (NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY) não estão definidas!");
      } else {
        console.log("AuthProviderClient: Variáveis de ambiente do Supabase parecem estar presentes.");
      }
    }
  }, []);

  if (!isMounted) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm">
        <div className="bg-black/60 p-6 rounded-lg border border-purple-800/30 flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-4" />
          <p className="text-white text-sm">Montando aplicação...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      {children}
      <ConnectionStatus />
    </AuthProvider>
  );
} 