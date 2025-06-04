"use client";

import { useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseReportChangeOptions {
  onReportChange?: (reportId: string, reportName?: string) => void;
  enableToast?: boolean;
  debounceMs?: number;
}

interface UseReportChangeReturn {
  handleReportChange: (
    currentReportId: string | null,
    previousReportId: string | null,
    reportName?: string
  ) => void;
}

export function useReportChange(options: UseReportChangeOptions = {}): UseReportChangeReturn {
  const { 
    onReportChange, 
    enableToast = true, 
    debounceMs = 150 
  } = options;

  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastToastRef = useRef<number>(0);

  // Função para mostrar toast com debounce
  const showToastWithDebounce = useCallback((reportName: string) => {
    const now = Date.now();
    
    // Prevenir toasts muito frequentes (mínimo 2 segundos entre toasts)
    if (now - lastToastRef.current < 2000) {
      return;
    }

    lastToastRef.current = now;
    
    toast({
      title: "Relatório alterado",
      description: `Agora visualizando: ${reportName}`,
      duration: 3000,
    });
  }, [toast]);

  // Função principal para lidar com mudança de relatório
  const handleReportChange = useCallback((
    currentReportId: string | null,
    previousReportId: string | null,
    reportName?: string
  ) => {
    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Verificar se houve mudança real
    if (!currentReportId || currentReportId === previousReportId) {
      return;
    }

    console.log('[useReportChange] Relatório ativo mudou:', {
      de: previousReportId,
      para: currentReportId,
      nomeRelatorio: reportName
    });

    // Aplicar debounce
    timeoutRef.current = setTimeout(() => {
      // Chamar callback personalizado se fornecido
      if (onReportChange) {
        onReportChange(currentReportId, reportName);
      }

      // Mostrar toast se habilitado e não for a primeira carga
      if (enableToast && previousReportId !== null && reportName) {
        showToastWithDebounce(reportName);
      }
    }, debounceMs);
  }, [onReportChange, enableToast, debounceMs, showToastWithDebounce]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    handleReportChange
  };
} 