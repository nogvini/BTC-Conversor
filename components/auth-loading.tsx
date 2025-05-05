"use client";

import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";

export function AuthLoading() {
  const { loading } = useAuth();

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex flex-col items-center space-y-4 bg-indigo-950/50 p-8 rounded-lg border border-indigo-900/50 shadow-xl">
        <Loader2 className="h-12 w-12 text-indigo-400 animate-spin" />
        <p className="text-indigo-300 font-medium">
          Verificando autenticação...
        </p>
      </div>
    </div>
  );
} 