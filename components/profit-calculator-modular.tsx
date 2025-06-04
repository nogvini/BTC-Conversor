"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useReports } from "@/hooks/use-reports";
import { useAuth } from "@/hooks/use-auth";
import { useDefaultCurrency } from "@/hooks/use-default-currency";
import { Calculator, Upload, BarChart2, Calendar } from "lucide-react";

// Componentes modulares
import ProfitCalculatorImport from "./profit-calculator-import";
import ProfitCalculatorCharts from "./profit-calculator-charts";
import ProfitCalculatorHistory from "./profit-calculator-history";
import { ReportManager } from "./report-manager";

// Tipos
import type { ProfitCalculatorProps } from "./types/profit-calculator-types";

export default function ProfitCalculatorModular({ 
  btcToUsd, 
  brlToUsd, 
  appData, 
  activeReportData,
  onInvestmentAdd,
  onProfitAdd,
  onInvestmentDelete,
  onProfitDelete,
  onInvestmentsUpdate,
  onProfitsUpdate
}: ProfitCalculatorProps) {
  // Hooks
  const { toast } = useToast();
  const { session } = useAuth();
  const { user } = session;
  const { defaultCurrency } = useDefaultCurrency();

  // Estados para controle de re-renderização
  const [componentKey, setComponentKey] = useState(0);
  const [localForceUpdate, setLocalForceUpdate] = useState(0);
  const [activeTab, setActiveTab] = useState<string>("history");
  
  // Refs para rastrear mudanças
  const lastActiveReportIdRef = useRef<string | null>(null);
  const lastActiveReportNameRef = useRef<string | null>(null);
  const lastActiveReportUpdatedRef = useRef<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastToastTimeRef = useRef<number>(0);

  // Hook de relatórios
  const { 
    reports: reportsCollection, 
    activeReport: currentActiveReportObjectFromHook,
    activeReportId: activeReportIdFromHook,
    isLoaded: reportsDataLoaded
  } = useReports();

  // Determinar qual fonte de dados usar
  const effectiveActiveReportId = activeReportData?.id || activeReportIdFromHook;
  const effectiveActiveReport = activeReportData?.report || currentActiveReportObjectFromHook;

  // Função para detectar mudanças de relatório com debounce
  const detectReportChange = () => {
    const currentId = effectiveActiveReportId;
    const currentName = effectiveActiveReport?.name;
    const currentUpdated = effectiveActiveReport?.updatedAt || effectiveActiveReport?.lastUpdated;
    
    const previousId = lastActiveReportIdRef.current;
    const previousName = lastActiveReportNameRef.current;
    const previousUpdated = lastActiveReportUpdatedRef.current;

    // Verificar se houve mudança significativa
    const hasChanged = (
      currentId !== previousId ||
      currentName !== previousName ||
      currentUpdated !== previousUpdated
    );

    if (hasChanged && currentId) {
      console.log('[ProfitCalculatorModular] Mudança detectada:', {
        de: { id: previousId, name: previousName, updated: previousUpdated },
        para: { id: currentId, name: currentName, updated: currentUpdated }
      });

      // Limpar timeout anterior
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }

      // Aplicar debounce
      toastTimeoutRef.current = setTimeout(() => {
        // Forçar recarregamento dos componentes
        setComponentKey(prev => prev + 1);
        setLocalForceUpdate(prev => prev + 1);

        // Mostrar toast apenas se não for a primeira carga e passou tempo suficiente
        const now = Date.now();
        const shouldShowToast = (
          previousId !== null && 
          currentName && 
          previousId !== currentId &&
          (now - lastToastTimeRef.current) > 2000 // Mínimo 2 segundos entre toasts
        );

        if (shouldShowToast) {
          lastToastTimeRef.current = now;
          toast({
            title: "Relatório alterado",
            description: `Agora visualizando: ${currentName}`,
            duration: 3000,
          });
        }
      }, 150); // Debounce de 150ms
    }

    // Atualizar refs
    lastActiveReportIdRef.current = currentId;
    lastActiveReportNameRef.current = currentName;
    lastActiveReportUpdatedRef.current = currentUpdated;
  };

  // Effect para detectar mudanças de relatório
  useEffect(() => {
    detectReportChange();
  }, [
    effectiveActiveReportId, 
    effectiveActiveReport?.name, 
    effectiveActiveReport?.updatedAt,
    effectiveActiveReport?.lastUpdated
  ]);

  // Cleanup de timeouts
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Props compartilhadas para todos os componentes modulares
  const sharedProps = {
    btcToUsd,
    brlToUsd,
    effectiveActiveReport,
    effectiveActiveReportId
  };

  return (
    <div key={componentKey} className="space-y-6">
      {/* Cabeçalho com informações do relatório */}
      <Card className="bg-black/30 border border-purple-700/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calculadora de Lucros - Versão Modular
          </CardTitle>
          <CardDescription>
            Sistema refatorado com componentes modulares para melhor performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-1">
              <p className="text-sm text-gray-400">Relatório Ativo</p>
              <p className="font-medium text-purple-300">
                {effectiveActiveReport?.name || 'Nenhum relatório selecionado'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-400">Component Key</p>
              <p className="font-mono text-xs text-blue-400">{componentKey}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-400">Force Update</p>
              <p className="font-mono text-xs text-green-400">{localForceUpdate}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-400">Relatório ID</p>
              <p className="font-mono text-xs text-yellow-400">
                {effectiveActiveReportId?.substring(0, 8) || 'N/A'}...
              </p>
            </div>
          </div>
          
          {/* Gerenciador de Relatórios */}
          <ReportManager />
        </CardContent>
      </Card>

      {/* Abas modulares */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="charts" className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            Gráficos
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Importação
          </TabsTrigger>
        </TabsList>

        {/* Histórico e Dados */}
        <TabsContent value="history" className="mt-6">
          <ProfitCalculatorHistory 
            key={`history-${componentKey}-${effectiveActiveReportId || 'no-report'}-${localForceUpdate}`}
            {...sharedProps}
          />
        </TabsContent>

        {/* Gráficos */}
        <TabsContent value="charts" className="mt-6">
          <ProfitCalculatorCharts 
            key={`charts-${componentKey}-${effectiveActiveReportId || 'no-report'}-${localForceUpdate}`}
            {...sharedProps}
          />
        </TabsContent>

        {/* Importação */}
        <TabsContent value="import" className="mt-6">
          <ProfitCalculatorImport 
            key={`import-${componentKey}-${effectiveActiveReportId || 'no-report'}-${localForceUpdate}`}
            {...sharedProps}
          />
        </TabsContent>
      </Tabs>

      {/* Informações de debug (remover em produção) */}
      <Card className="bg-gray-900/50 border border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-sm">Debug Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p><strong>Current ID:</strong> {effectiveActiveReportId || 'N/A'}</p>
              <p><strong>Current Name:</strong> {effectiveActiveReport?.name || 'N/A'}</p>
              <p><strong>Timestamp:</strong> {new Date().toLocaleTimeString()}</p>
            </div>
            <div>
              <p><strong>Reports Loaded:</strong> {reportsDataLoaded ? '✅' : '❌'}</p>
              <p><strong>Has Active Report:</strong> {effectiveActiveReport ? '✅' : '❌'}</p>
              <p><strong>Current Tab:</strong> {activeTab}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 