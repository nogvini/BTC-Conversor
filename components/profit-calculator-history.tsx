"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar,
  TrendingUp,
  Wallet,
  Upload,
  Download,
  Trash2,
  Edit,
  Plus,
  Filter,
  Eye,
  EyeOff
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useReports } from "@/hooks/use-reports";
import { useDefaultCurrency } from "@/hooks/use-default-currency";

// Imports de tipos
import type { 
  ProfitCalculatorBaseProps, 
  HistoryFilterPeriod,
  HistoryViewMode 
} from "./types/profit-calculator-shared-types";

interface ProfitCalculatorHistoryProps extends ProfitCalculatorBaseProps {
  // Props específicas do histórico se necessário
}

// Componente para card de estatísticas
function HistoryStatsCard({ title, value, icon, change, valueColor }: {
  title: string;
  value: string;
  icon: React.ReactNode;
  change?: number;
  valueColor?: string;
}) {
  return (
    <Card className="bg-black/20 border border-purple-700/30 hover:bg-black/30 transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {icon}
            <p className="text-sm font-medium text-gray-300">{title}</p>
          </div>
          {change !== undefined && (
            <Badge variant={change >= 0 ? "default" : "destructive"} className="text-xs">
              {change >= 0 ? "+" : ""}{change.toFixed(1)}%
            </Badge>
          )}
        </div>
        <p className={cn("text-2xl font-bold mt-2", valueColor || "text-white")}>{value}</p>
      </CardContent>
    </Card>
  );
}

export default function ProfitCalculatorHistory({ 
  btcToUsd, 
  brlToUsd, 
  effectiveActiveReport,
  effectiveActiveReportId
}: ProfitCalculatorHistoryProps) {
  // Hooks
  const { toast } = useToast();
  const { formatCurrency } = useDefaultCurrency();
  const { 
    deleteInvestment,
    deleteProfitRecord,
    deleteWithdrawal
  } = useReports();

  // Estados
  const [historyFilterPeriod, setHistoryFilterPeriod] = useState<HistoryFilterPeriod>("3m");
  const [historyViewMode, setHistoryViewMode] = useState<HistoryViewMode>("active");
  const [historyCustomStartDate, setHistoryCustomStartDate] = useState<Date | undefined>(undefined);
  const [historyCustomEndDate, setHistoryCustomEndDate] = useState<Date | undefined>(undefined);
  const [historyActiveTab, setHistoryActiveTab] = useState<string>("overview");
  const [dataRefreshKey, setDataRefreshKey] = useState(0);

  // Effect para reagir a mudanças de relatório
  useEffect(() => {
    console.log('[ProfitCalculatorHistory] Relatório alterado:', effectiveActiveReportId, effectiveActiveReport?.name);
    setDataRefreshKey(prev => prev + 1);
  }, [effectiveActiveReportId, effectiveActiveReport?.name, effectiveActiveReport?.updatedAt]);

  // Dados mockados para demonstração
  const mockInvestments = useMemo(() => [
    { id: '1', date: '2024-01-15', amount: 1000, currency: 'USD', source: 'Manual', btcAmount: 0.025 },
    { id: '2', date: '2024-02-10', amount: 2000, currency: 'USD', source: 'LN Markets', btcAmount: 0.045 },
    { id: '3', date: '2024-03-05', amount: 1500, currency: 'USD', source: 'CSV Import', btcAmount: 0.035 },
  ], []);

  const mockProfits = useMemo(() => [
    { id: '1', date: '2024-01-20', amount: 150, currency: 'USD', type: 'Trading', btcAmount: 0.0035 },
    { id: '2', date: '2024-02-15', amount: -50, currency: 'USD', type: 'Trading', btcAmount: -0.0012 },
    { id: '3', date: '2024-03-10', amount: 300, currency: 'USD', type: 'Holding', btcAmount: 0.0071 },
  ], []);

  const mockWithdrawals = useMemo(() => [
    { id: '1', date: '2024-01-25', amount: 500, currency: 'USD', destination: 'Wallet', btcAmount: 0.012 },
    { id: '2', date: '2024-03-15', amount: 800, currency: 'USD', destination: 'Exchange', btcAmount: 0.019 },
  ], []);

  // Estatísticas resumidas
  const stats = useMemo(() => {
    const totalInvestments = mockInvestments.reduce((acc, inv) => acc + inv.amount, 0);
    const totalProfits = mockProfits.reduce((acc, profit) => acc + profit.amount, 0);
    const totalWithdrawals = mockWithdrawals.reduce((acc, withdrawal) => acc + withdrawal.amount, 0);
    const balance = totalInvestments + totalProfits - totalWithdrawals;

    return {
      totalInvestments,
      totalProfits,
      totalWithdrawals,
      balance,
      profitPercentage: totalInvestments > 0 ? (totalProfits / totalInvestments) * 100 : 0
    };
  }, [mockInvestments, mockProfits, mockWithdrawals]);

  // Função para formatar valores
  const formatValue = (amount: number, currency: string) => {
    return `${currency === 'USD' ? '$' : currency === 'BRL' ? 'R$' : ''}${amount.toLocaleString()}`;
  };

  // Função para formatar BTC
  const formatBtc = (amount: number) => {
    return `${amount.toFixed(8)} BTC`;
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho com filtros */}
      <Card className="bg-black/20 border border-purple-700/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Histórico e Análises
          </CardTitle>
          <CardDescription>
            Visualize e gerencie seus dados históricos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={historyFilterPeriod} onValueChange={(value: HistoryFilterPeriod) => setHistoryFilterPeriod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">Último mês</SelectItem>
                  <SelectItem value="3m">Últimos 3 meses</SelectItem>
                  <SelectItem value="6m">Últimos 6 meses</SelectItem>
                  <SelectItem value="1y">Último ano</SelectItem>
                  <SelectItem value="all">Todos os dados</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Visualização</Label>
              <Select value={historyViewMode} onValueChange={(value: HistoryViewMode) => setHistoryViewMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Relatório Ativo</SelectItem>
                  <SelectItem value="all">Todos os Relatórios</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {historyFilterPeriod === 'custom' && (
              <div className="space-y-2">
                <Label>Data Personalizada</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {historyCustomStartDate ? format(historyCustomStartDate, "dd/MM/yyyy") : "Início"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={historyCustomStartDate}
                        onSelect={setHistoryCustomStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {historyCustomEndDate ? format(historyCustomEndDate, "dd/MM/yyyy") : "Fim"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={historyCustomEndDate}
                        onSelect={setHistoryCustomEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <HistoryStatsCard
          title="Total Investido"
          value={formatValue(stats.totalInvestments, 'USD')}
          icon={<Download className="h-4 w-4 text-blue-400" />}
          valueColor="text-blue-400"
        />
        
        <HistoryStatsCard
          title="Total Lucros"
          value={formatValue(stats.totalProfits, 'USD')}
          icon={<TrendingUp className="h-4 w-4 text-green-400" />}
          change={stats.profitPercentage}
          valueColor={stats.totalProfits >= 0 ? "text-green-400" : "text-red-400"}
        />
        
        <HistoryStatsCard
          title="Total Retirado"
          value={formatValue(stats.totalWithdrawals, 'USD')}
          icon={<Upload className="h-4 w-4 text-orange-400" />}
          valueColor="text-orange-400"
        />
        
        <HistoryStatsCard
          title="Saldo Total"
          value={formatValue(stats.balance, 'USD')}
          icon={<Wallet className="h-4 w-4 text-purple-400" />}
          valueColor="text-purple-400"
        />
      </div>

      {/* Abas de dados */}
      <Tabs value={historyActiveTab} onValueChange={setHistoryActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="investments">Investimentos</TabsTrigger>
          <TabsTrigger value="profits">Lucros</TabsTrigger>
          <TabsTrigger value="withdrawals">Retiradas</TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="mt-6">
          <Card className="bg-black/20 border border-purple-700/30">
            <CardHeader>
              <CardTitle>Resumo Geral</CardTitle>
              <CardDescription>
                Informações consolidadas do relatório ativo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {effectiveActiveReport ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-medium text-purple-300">Informações do Relatório</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Nome:</span>
                          <span className="text-white">{effectiveActiveReport.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Criado em:</span>
                          <span className="text-white">
                            {effectiveActiveReport.createdAt ? 
                              format(new Date(effectiveActiveReport.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : 
                              'N/A'
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Última atualização:</span>
                          <span className="text-white">
                            {effectiveActiveReport.updatedAt ? 
                              format(new Date(effectiveActiveReport.updatedAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : 
                              'N/A'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium text-purple-300">Estatísticas Rápidas</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total de registros:</span>
                          <span className="text-white">
                            {(effectiveActiveReport.investments?.length || 0) + 
                             (effectiveActiveReport.profits?.length || 0) + 
                             (effectiveActiveReport.withdrawals?.length || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Rentabilidade:</span>
                          <span className={cn("font-medium", stats.profitPercentage >= 0 ? "text-green-400" : "text-red-400")}>
                            {stats.profitPercentage >= 0 ? '+' : ''}{stats.profitPercentage.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Status:</span>
                          <Badge variant="default" className="bg-green-500/20 text-green-400">
                            Ativo
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Atividade recente */}
                  <div className="border-t border-purple-700/30 pt-4">
                    <h4 className="font-medium text-purple-300 mb-3">Atividade Recente</h4>
                    <div className="space-y-2">
                      {[...mockInvestments, ...mockProfits, ...mockWithdrawals]
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 5)
                        .map((item, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-black/30 rounded text-sm">
                            <div className="flex items-center gap-2">
                              {'btcAmount' in item && 'currency' in item ? (
                                'type' in item ? (
                                  <TrendingUp className="h-4 w-4 text-green-400" />
                                ) : 'source' in item ? (
                                  <Download className="h-4 w-4 text-blue-400" />
                                ) : (
                                  <Upload className="h-4 w-4 text-orange-400" />
                                )
                              ) : null}
                              <span className="text-gray-300">
                                {format(new Date(item.date), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            </div>
                            <span className={cn("font-medium", 
                              'type' in item && item.amount < 0 ? "text-red-400" : "text-green-400"
                            )}>
                              {formatValue(item.amount, item.currency)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Selecione um relatório para visualizar o histórico</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Investimentos */}
        <TabsContent value="investments" className="mt-6">
          <Card className="bg-black/20 border border-purple-700/30">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Investimentos</span>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Valor (USD)</TableHead>
                      <TableHead>Valor (BTC)</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockInvestments.map((investment) => (
                      <TableRow key={investment.id}>
                        <TableCell>
                          {format(new Date(investment.date), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-medium text-blue-400">
                          {formatValue(investment.amount, investment.currency)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatBtc(investment.btcAmount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{investment.source}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400 hover:text-red-300">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lucros */}
        <TabsContent value="profits" className="mt-6">
          <Card className="bg-black/20 border border-purple-700/30">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Lucros e Perdas</span>
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Valor (USD)</TableHead>
                      <TableHead>Valor (BTC)</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockProfits.map((profit) => (
                      <TableRow key={profit.id}>
                        <TableCell>
                          {format(new Date(profit.date), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className={cn("font-medium", 
                          profit.amount >= 0 ? "text-green-400" : "text-red-400"
                        )}>
                          {profit.amount >= 0 ? '+' : ''}{formatValue(profit.amount, profit.currency)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {profit.btcAmount >= 0 ? '+' : ''}{formatBtc(profit.btcAmount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{profit.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400 hover:text-red-300">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Retiradas */}
        <TabsContent value="withdrawals" className="mt-6">
          <Card className="bg-black/20 border border-purple-700/30">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Retiradas</span>
                <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Valor (USD)</TableHead>
                      <TableHead>Valor (BTC)</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockWithdrawals.map((withdrawal) => (
                      <TableRow key={withdrawal.id}>
                        <TableCell>
                          {format(new Date(withdrawal.date), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-medium text-orange-400">
                          {formatValue(withdrawal.amount, withdrawal.currency)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatBtc(withdrawal.btcAmount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{withdrawal.destination}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400 hover:text-red-300">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 