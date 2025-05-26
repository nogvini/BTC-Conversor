"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Report } from "@/lib/calculator-types";

// Tipos de eventos que podem ser disparados
export type ReportEventType = 
  | 'report-selected'
  | 'report-updated'
  | 'investment-added'
  | 'investment-deleted'
  | 'profit-added'
  | 'profit-deleted'
  | 'withdrawals-updated'
  | 'data-imported'
  | 'bulk-operation-completed';

// Detalhes do evento
export interface ReportEvent {
  type: ReportEventType;
  reportId?: string;
  timestamp: number;
  data?: any;
}

// Interface do contexto
interface ReportEventsContextType {
  lastEvent: ReportEvent | null;
  emitEvent: (type: ReportEventType, reportId?: string, data?: any) => void;
  subscribeToEvent: (callback: (event: ReportEvent) => void) => () => void;
}

// Criar contexto com valor padrão
const ReportEventsContext = createContext<ReportEventsContextType>({
  lastEvent: null,
  emitEvent: () => {},
  subscribeToEvent: () => () => {},
});

// Hook personalizado para usar o contexto
export const useReportEvents = () => useContext(ReportEventsContext);

// Provedor do contexto
export function ReportEventsProvider({ children }: { children: React.ReactNode }) {
  const [lastEvent, setLastEvent] = useState<ReportEvent | null>(null);
  const [listeners, setListeners] = useState<((event: ReportEvent) => void)[]>([]);

  // Função para emitir eventos
  const emitEvent = useCallback((type: ReportEventType, reportId?: string, data?: any) => {
    const event: ReportEvent = {
      type,
      reportId,
      timestamp: Date.now(),
      data,
    };

    console.log(`[ReportEvents] Emitindo evento: ${type}`, { reportId, data });
    setLastEvent(event);
    
    // Notificar todos os listeners
    listeners.forEach(listener => listener(event));
  }, [listeners]);

  // Função para se inscrever em eventos
  const subscribeToEvent = useCallback((callback: (event: ReportEvent) => void) => {
    setListeners(prev => [...prev, callback]);
    
    // Retornar função para cancelar a inscrição
    return () => {
      setListeners(prev => prev.filter(listener => listener !== callback));
    };
  }, []);

  return (
    <ReportEventsContext.Provider value={{ lastEvent, emitEvent, subscribeToEvent }}>
      {children}
    </ReportEventsContext.Provider>
  );
} 