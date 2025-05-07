"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { DiagnosePageClient } from "@/components/diagnose-page-client";

export default function DiagnoseClientPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    
    // Simular carregamento para dar tempo ao Supabase de se conectar
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Não mostrar nada durante SSR
  if (!mounted) return null;
  
  // Mostrar loader enquanto inicializa
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return <DiagnosePageClient />;
} 