"use client";

import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function AuthLoading() {
  const { session } = useAuth();
  const { isLoading } = session;

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/20 backdrop-blur-sm">
      <div className="bg-black/60 p-6 rounded-lg border border-purple-800/30 flex flex-col items-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-4" />
        <p className="text-white text-sm">Autenticando...</p>
        <p className="text-white/50 text-xs mt-1">Aguarde um momento</p>
      </div>
    </div>
  );
} 