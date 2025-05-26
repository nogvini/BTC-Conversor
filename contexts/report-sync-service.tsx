"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useReportEvents, ReportEvent } from "./report-events-context";
import { useReports } from "@/hooks/use-reports";

// Tipo para dados sincronizados
interface SyncedReportData {
  lastEventTimestamp: number;
  activeReportId: string | undefined;
  needsRefresh: boolean;
}

// Interface do contexto
interface ReportSyncContextType {
  syncedData: SyncedReportData;
  refreshData: () => void;
}

// Criar contexto
const ReportSyncContext = createContext<ReportSyncContextType>({
  syncedData: {
    lastEventTimestamp: 0,
    activeReportId: undefined,
    needsRefresh: false
  },
  refreshData: () => {}
});

// Hook para usar o contexto
export const useReportSync = () => useContext(ReportSyncContext);

// Provedor do contexto
export function ReportSyncProvider({ children }: { children: React.ReactNode }) {
  const { subscribeToEvent } = useReportEvents();
  const { activeReportId } = useReports();
  
  // Estado para dados sincronizados
  const [syncedData, setSyncedData] = useState<SyncedReportData>({
    lastEventTimestamp: Date.now(),
    activeReportId,
    needsRefresh: false
  });
  
  // Função para forçar atualização
  const refreshData = () => {
    setSyncedData(prev => ({
      ...prev,
      lastEventTimestamp: Date.now(),
      needsRefresh: true
    }));
  };
  
  // Atualizar quando o relatório ativo mudar
  useEffect(() => {
    setSyncedData(prev => ({
      ...prev,
      activeReportId,
      needsRefresh: true
    }));
  }, [activeReportId]);
  
  // Reagir a eventos de relatório
  useEffect(() => {
    const handleReportEvent = (event: ReportEvent) => {
      console.log('[ReportSync] Evento recebido:', event);
      
      // Atualizar dados sincronizados
      setSyncedData(prev => ({
        ...prev,
        lastEventTimestamp: event.timestamp,
        needsRefresh: true
      }));
    };
    
    // Inscrever-se para receber eventos
    const unsubscribe = subscribeToEvent(handleReportEvent);
    
    // Cancelar inscrição ao desmontar
    return () => {
      unsubscribe();
    };
  }, [subscribeToEvent]);
  
  return (
    <ReportSyncContext.Provider value={{ syncedData, refreshData }}>
      {children}
    </ReportSyncContext.Provider>
  );
} 