"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  FileText,
  AlertTriangle,
  TrendingUp,
  Loader2,
  File
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useReports } from "@/hooks/use-reports";

// Imports de tipos
import type { 
  ProfitCalculatorBaseProps, 
  ImportProgress, 
  ImportProgressState, 
  LNMarketsImportStats 
} from "./types/profit-calculator-shared-types";
import type { LNMarketsCredentials, LNMarketsAPIConfig, LNMarketsMultipleConfig } from "./types/ln-markets-types";

// Imports de bibliotecas LN Markets
import { retrieveLNMarketsCredentials, retrieveLNMarketsMultipleConfigs, getLNMarketsConfig } from "@/lib/encryption";
import { 
  convertTradeToProfit, 
  convertDepositToInvestment, 
  convertWithdrawalToRecord 
} from "@/lib/ln-markets-converters";
import { 
  fetchLNMarketsTrades,
  fetchLNMarketsDeposits,
  fetchLNMarketsWithdrawals
} from "@/lib/ln-markets-client";

interface ProfitCalculatorImportProps extends ProfitCalculatorBaseProps {
  // Props específicas do import se necessário
}

// Componente para indicador de progresso
function ImportProgressIndicator({ progress, type }: { progress: ImportProgress; type: string }) {
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (progress.status === 'loading' && !startTime) {
      setStartTime(Date.now());
    } else if (progress.status !== 'loading') {
      setStartTime(null);
      setEstimatedTimeRemaining(null);
    }
  }, [progress.status, startTime]);

  useEffect(() => {
    if (progress.status === 'loading' && startTime && progress.current > 0) {
      const elapsed = Date.now() - startTime;
      const rate = progress.current / elapsed;
      const remaining = (progress.total - progress.current) / rate;
      setEstimatedTimeRemaining(remaining);
    }
  }, [progress.current, progress.total, startTime, progress.status]);

  const getStatusColor = () => {
    switch (progress.status) {
      case 'loading': return 'bg-gradient-to-r from-blue-500 to-cyan-500';
      case 'complete': return 'bg-gradient-to-r from-green-500 to-emerald-500';
      case 'error': return 'bg-gradient-to-r from-red-500 to-rose-500';
      default: return 'bg-gradient-to-r from-gray-500 to-slate-500';
    }
  };

  const getStatusIcon = () => {
    switch (type) {
      case 'trades': return <TrendingUp className={cn("h-4 w-4 transition-all duration-300", 
        progress.status === 'loading' ? "animate-pulse text-blue-400" : 
        progress.status === 'complete' ? "text-green-400" : 
        progress.status === 'error' ? "text-red-400" : "text-gray-400")} />;
      case 'deposits': return <Download className={cn("h-4 w-4 transition-all duration-300", 
        progress.status === 'loading' ? "animate-bounce text-blue-400" : 
        progress.status === 'complete' ? "text-green-400" : 
        progress.status === 'error' ? "text-red-400" : "text-gray-400")} />;
      case 'withdrawals': return <Upload className={cn("h-4 w-4 transition-all duration-300", 
        progress.status === 'loading' ? "animate-pulse text-blue-400" : 
        progress.status === 'complete' ? "text-green-400" : 
        progress.status === 'error' ? "text-red-400" : "text-gray-400")} />;
      default: return null;
    }
  };

  const formatTimeRemaining = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s restantes`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s restantes`;
  };

  return (
    <div className="space-y-3 p-4 bg-black/20 border border-purple-700/30 rounded-lg backdrop-blur-sm transition-all duration-300 hover:bg-black/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <span className="text-sm font-medium text-white">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
          {progress.status === 'loading' && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping" style={{ animationDelay: '0.4s' }}></div>
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400">
            {progress.current} / {progress.total}
          </div>
          {estimatedTimeRemaining && progress.status === 'loading' && (
            <div className="text-xs text-blue-400">
              {formatTimeRemaining(estimatedTimeRemaining)}
            </div>
          )}
        </div>
      </div>
      
      <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
        <div 
          className={cn("h-full transition-all duration-300 ease-out", getStatusColor())}
          style={{ width: `${Math.min(progress.percentage, 100)}%` }}
        />
      </div>
      
      {progress.message && (
        <div className="text-xs text-gray-300 bg-black/30 px-2 py-1 rounded">
          {progress.message}
        </div>
      )}
    </div>
  );
}

export default function ProfitCalculatorImport({ 
  btcToUsd, 
  brlToUsd, 
  effectiveActiveReport,
  effectiveActiveReportId
}: ProfitCalculatorImportProps) {
  // Hooks
  const { toast } = useToast();
  const { session } = useAuth();
  const { user } = session;
  const { 
    addInvestment,
    addProfitRecord,
    addWithdrawal,
    associateAPIToReport,
    getReportAssociatedAPIs,
    hasMultipleAPIs
  } = useReports();

  // Estados
  const [lnMarketsCredentials, setLnMarketsCredentials] = useState<LNMarketsCredentials | null>(null);
  const [multipleConfigs, setMultipleConfigs] = useState<LNMarketsMultipleConfig | null>(null);
  const [selectedConfigForImport, setSelectedConfigForImport] = useState<string | null>(null);
  const [showConfigSelector, setShowConfigSelector] = useState(false);
  
  const [isImportingTrades, setIsImportingTrades] = useState(false);
  const [isImportingDeposits, setIsImportingDeposits] = useState(false);
  const [isImportingWithdrawals, setIsImportingWithdrawals] = useState(false);
  
  const [importStats, setImportStats] = useState<LNMarketsImportStats | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgressState>({
    trades: { current: 0, total: 0, percentage: 0, status: 'idle' },
    deposits: { current: 0, total: 0, percentage: 0, status: 'idle' },
    withdrawals: { current: 0, total: 0, percentage: 0, status: 'idle' }
  });

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const internalFileInputRef = useRef<HTMLInputElement>(null);
  const investmentCsvFileInputRef = useRef<HTMLInputElement>(null);
  const backupExcelFileInputRef = useRef<HTMLInputElement>(null);

  // Carregar credenciais ao montar o componente
  useEffect(() => {
    const loadCredentials = async () => {
      if (!user?.id) return;
      
      try {
        const credentials = await retrieveLNMarketsCredentials(user.id);
        setLnMarketsCredentials(credentials);
        
        const configs = await retrieveLNMarketsMultipleConfigs(user.id);
        setMultipleConfigs(configs);
      } catch (error) {
        console.error('Erro ao carregar credenciais:', error);
      }
    };

    loadCredentials();
  }, [user?.id]);

  // Funções de importação (placeholder - implementação completa seria copiada do arquivo original)
  const handleImportTrades = useCallback(async () => {
    setIsImportingTrades(true);
    // TODO: Implementar lógica de importação de trades
    setTimeout(() => {
      setIsImportingTrades(false);
      toast({
        title: "Importação Simulada",
        description: "Funcionalidade de importação será implementada aqui",
      });
    }, 2000);
  }, [toast]);

  const handleImportDeposits = useCallback(async () => {
    setIsImportingDeposits(true);
    // TODO: Implementar lógica de importação de depósitos
    setTimeout(() => {
      setIsImportingDeposits(false);
      toast({
        title: "Importação Simulada",
        description: "Funcionalidade de importação será implementada aqui",
      });
    }, 2000);
  }, [toast]);

  const handleImportWithdrawals = useCallback(async () => {
    setIsImportingWithdrawals(true);
    // TODO: Implementar lógica de importação de retiradas
    setTimeout(() => {
      setIsImportingWithdrawals(false);
      toast({
        title: "Importação Simulada",
        description: "Funcionalidade de importação será implementada aqui",
      });
    }, 2000);
  }, [toast]);

  return (
    <div className="space-y-6">
      <Card className="bg-black/20 border border-purple-700/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importação de Dados
          </CardTitle>
          <CardDescription>
            Importe dados de exchanges, arquivos CSV ou outros formatos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Seção LN Markets */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">LN Markets</h3>
            
            {!effectiveActiveReportId && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Selecione um relatório ativo para importar dados
                </AlertDescription>
              </Alert>
            )}
            
            {/* Seletor de configuração se houver múltiplas */}
            {multipleConfigs && Object.keys(multipleConfigs.configs).length > 1 && (
              <div className="space-y-2">
                <Label>Configuração da API</Label>
                <Select value={selectedConfigForImport || ""} onValueChange={setSelectedConfigForImport}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma configuração de API" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(multipleConfigs.configs).map(([id, config]) => (
                      <SelectItem key={id} value={id}>
                        {config.name || `Configuração ${id.substring(0, 8)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Botões de importação */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                onClick={handleImportTrades}
                disabled={isImportingTrades || !effectiveActiveReportId}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isImportingTrades ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <TrendingUp className="mr-2 h-4 w-4" />
                )}
                Importar Trades
              </Button>
              
              <Button 
                onClick={handleImportDeposits}
                disabled={isImportingDeposits || !effectiveActiveReportId}
                className="bg-green-600 hover:bg-green-700"
              >
                {isImportingDeposits ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Importar Depósitos
              </Button>
              
              <Button 
                onClick={handleImportWithdrawals}
                disabled={isImportingWithdrawals || !effectiveActiveReportId}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isImportingWithdrawals ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Importar Retiradas
              </Button>
            </div>
            
            {/* Progresso de importação */}
            {(importProgress.trades.status === 'loading' || 
              importProgress.deposits.status === 'loading' || 
              importProgress.withdrawals.status === 'loading') && (
              <div className="space-y-4">
                <h4 className="text-md font-medium text-white">Progresso da Importação</h4>
                
                {importProgress.trades.status === 'loading' && (
                  <ImportProgressIndicator progress={importProgress.trades} type="trades" />
                )}
                
                {importProgress.deposits.status === 'loading' && (
                  <ImportProgressIndicator progress={importProgress.deposits} type="deposits" />
                )}
                
                {importProgress.withdrawals.status === 'loading' && (
                  <ImportProgressIndicator progress={importProgress.withdrawals} type="withdrawals" />
                )}
              </div>
            )}
          </div>

          {/* Seção Importação de Arquivos */}
          <div className="space-y-4 border-t border-purple-700/30 pt-6">
            <h3 className="text-lg font-medium text-white">Importação de Arquivos</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="h-auto flex flex-col items-center justify-center p-6 border-purple-700/40 hover:bg-purple-900/20"
                onClick={() => csvFileInputRef.current?.click()}
              >
                <FileSpreadsheet className="h-8 w-8 mb-2 text-green-400" />
                <span className="font-medium">Importar CSV</span>
                <span className="text-xs text-muted-foreground text-center">
                  Investimentos, lucros e retiradas
                </span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto flex flex-col items-center justify-center p-6 border-purple-700/40 hover:bg-purple-900/20"
                onClick={() => backupExcelFileInputRef.current?.click()}
              >
                <FileText className="h-8 w-8 mb-2 text-blue-400" />
                <span className="font-medium">Restaurar Backup</span>
                <span className="text-xs text-muted-foreground text-center">
                  Arquivo Excel completo
                </span>
              </Button>
            </div>
          </div>

          {/* Estatísticas de importação */}
          {importStats && (
            <div className="space-y-4 border-t border-purple-700/30 pt-6">
              <h3 className="text-lg font-medium text-white">Estatísticas da Última Importação</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {importStats.trades && (
                  <Card className="bg-black/30 border border-purple-700/40">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <TrendingUp className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                        <div className="text-2xl font-bold text-white">{importStats.trades.imported}</div>
                        <div className="text-sm text-gray-400">Trades Importados</div>
                        {importStats.trades.duplicated > 0 && (
                          <div className="text-xs text-yellow-400 mt-1">
                            {importStats.trades.duplicated} duplicados
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {importStats.deposits && (
                  <Card className="bg-black/30 border border-purple-700/40">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <Download className="h-8 w-8 mx-auto mb-2 text-green-400" />
                        <div className="text-2xl font-bold text-white">{importStats.deposits.imported}</div>
                        <div className="text-sm text-gray-400">Depósitos Importados</div>
                        {importStats.deposits.duplicated > 0 && (
                          <div className="text-xs text-yellow-400 mt-1">
                            {importStats.deposits.duplicated} duplicados
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {importStats.withdrawals && (
                  <Card className="bg-black/30 border border-purple-700/40">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-orange-400" />
                        <div className="text-2xl font-bold text-white">{importStats.withdrawals.imported}</div>
                        <div className="text-sm text-gray-400">Retiradas Importadas</div>
                        {importStats.withdrawals.duplicated > 0 && (
                          <div className="text-xs text-yellow-400 mt-1">
                            {importStats.withdrawals.duplicated} duplicados
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inputs de arquivo (hidden) */}
      <input
        ref={csvFileInputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={() => {}} // TODO: Implementar handlers
      />
      <input
        ref={backupExcelFileInputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={() => {}} // TODO: Implementar handlers
      />
    </div>
  );
} 