"use client";

import React, { useEffect, useState } from "react";
import { AuthProvider } from "@/hooks/use-auth";

export function AuthProviderClient({ children }: { children: React.ReactNode }) {
  // Estado para verificar se estamos no navegador
  const [isMounted, setIsMounted] = useState(false);

  // Só renderizar o AuthProvider quando estamos no navegador
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Durante o SSR ou a fase inicial de hidratação, renderizamos apenas os filhos
  if (!isMounted) {
    return <>{children}</>;
  }

  // Uma vez no navegador, usamos o AuthProvider
  return <AuthProvider>{children}</AuthProvider>;
} 