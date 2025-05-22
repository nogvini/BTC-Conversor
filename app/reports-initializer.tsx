"use client";

import { useEffect } from "react";
import { initializeReportsStore } from "@/hooks/use-reports";

export default function ReportsInitializer() {
  useEffect(() => {
    console.log("[ReportsInitializer] Chamando initializeReportsStore...");
    initializeReportsStore();
    console.log("[ReportsInitializer] initializeReportsStore chamado.");
  }, []);

  return null; // Este componente não renderiza nada visualmente
} 