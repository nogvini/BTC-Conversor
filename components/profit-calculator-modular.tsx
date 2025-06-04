"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useReports } from "@/hooks/use-reports";
import { useAuth } from "@/hooks/use-auth";
import { useDefaultCurrency } from "@/hooks/use-default-currency";
import { Calculator, Upload, BarChart2, Calendar } from "lucide-react";

// Hook personalizado para mudança de relatório
import { useReportChange } from "@/hooks/use-report-change";

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
  const [lastActiveReportId, setLastActiveReportId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("history");

  // Hook de relatórios
  const { 
    reports: reportsCollection, 
    activeReport: currentActiveReportObjectFromHook,
    activeReportId: activeReportIdFromHook,
    isLoaded: reportsDataLoaded
  } = useReports();

  // Determinar qual fonte de dados usar
  const effectiveActiveReportId = activeReportData?.id || currentActiveReportObjectFromHook?.id;
  const effectiveActiveReport = activeReportData?.report || currentActiveReportObjectFromHook;

  // Hook personalizado para mudança de relatório
  const { handleReportChange } = useReportChange({
    onReportChange: (reportId, reportName) => {
      console.log('[ProfitCalculatorModular] Relatório mudou via callback:', { reportId, reportName });
      
      // Forçar recarregamento
      setComponentKey(prev => prev + 1);
      setLocalForceUpdate(prev => prev + 1);
    },
    enableToast: true,
    debounceMs: 150
  });

  // Effect para detectar mudança de relatório
  useEffect(() => {
    handleReportChange(
      effectiveActiveReportId,
      lastActiveReportId,
      effectiveActiveReport?.name
    );
    
    // Atualizar o último relatório ativo conhecido
    if (effectiveActiveReportId !== lastActiveReportId) {
      setLastActiveReportId(effectiveActiveReportId);
    }
  }, [effectiveActiveReportId, lastActiveReportId, effectiveActiveReport?.name, handleReportChange]);

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
            key={`history-${componentKey}-${effectiveActiveReportId || 'no-report'}`}
            {...sharedProps}
          />
        </TabsContent>

        {/* Gráficos */}
        <TabsContent value="charts" className="mt-6">
          <ProfitCalculatorCharts 
            key={`charts-${componentKey}-${effectiveActiveReportId || 'no-report'}`}
            {...sharedProps}
          />
        </TabsContent>

        {/* Importação */}
        <TabsContent value="import" className="mt-6">
          <ProfitCalculatorImport 
            key={`import-${componentKey}-${effectiveActiveReportId || 'no-report'}`}
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
              <p><strong>Último ID:</strong> {lastActiveReportId || 'N/A'}</p>
              <p><strong>Atual ID:</strong> {effectiveActiveReportId || 'N/A'}</p>
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