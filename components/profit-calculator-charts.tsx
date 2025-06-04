"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  BarChart2,
  PieChart as PieChartIcon,
  TrendingUp,
  Calendar,
  Filter
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts";
import { format as formatDateFn, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";

// Imports de tipos
import type { 
  ProfitCalculatorBaseProps, 
  ChartDataPoint,
  HistoryFilterPeriod,
  HistoryViewMode 
} from "./types/profit-calculator-shared-types";

interface ProfitCalculatorChartsProps extends ProfitCalculatorBaseProps {
  // Props específicas dos gráficos se necessário
}

// Cores dos gráficos
const CHART_COLORS = {
  investments: '#3b82f6', // blue-500
  profits: '#10b981',     // emerald-500
  balance: '#f59e0b',     // amber-500
  area: ['#8b5cf6', '#06b6d4', '#10b981'], // purple, cyan, emerald
};

export default function ProfitCalculatorCharts({ 
  btcToUsd, 
  brlToUsd, 
  effectiveActiveReport,
  effectiveActiveReportId
}: ProfitCalculatorChartsProps) {
  // Estados
  const [chartDisplayUnit, setChartDisplayUnit] = useState<"btc" | "usd" | "brl">("btc");
  const [chartType, setChartType] = useState<"line" | "bar" | "area">("bar");
  const [chartTimeframe, setChartTimeframe] = useState<"daily" | "monthly">("monthly");
  const [chartViewMode, setChartViewMode] = useState<HistoryViewMode>("active");
  const [chartVisibleSeries, setChartVisibleSeries] = useState({
    investments: true,
    profits: true,
    balance: true
  });
  const [dataRefreshKey, setDataRefreshKey] = useState(0);

  // Effect para reagir a mudanças de relatório
  useEffect(() => {
    console.log('[ProfitCalculatorCharts] Relatório alterado:', effectiveActiveReportId, effectiveActiveReport?.name);
    setDataRefreshKey(prev => prev + 1);
  }, [effectiveActiveReportId, effectiveActiveReport?.name, effectiveActiveReport?.updatedAt]);

  // Dados mockados para demonstração
  const mockChartData: ChartDataPoint[] = useMemo(() => {
    if (!effectiveActiveReport) return [];
    
    // Simular dados baseados no relatório atual
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    return months.map((month, index) => ({
      date: `2024-${(index + 1).toString().padStart(2, '0')}-01`,
      month,
      investments: (index + 1) * 1000 + Math.random() * 500,
      profits: (index + 1) * 200 + Math.random() * 300,
      balance: (index + 1) * 1200 + Math.random() * 600
    }));
  }, [effectiveActiveReport]);

  // Função para formatar valores de acordo com a unidade selecionada
  const formatChartValue = (value: number): string => {
    switch (chartDisplayUnit) {
      case 'btc':
        return `${(value / btcToUsd).toFixed(8)} BTC`;
      case 'usd':
        return `$${value.toLocaleString()}`;
      case 'brl':
        return `R$ ${(value * brlToUsd).toLocaleString()}`;
      default:
        return value.toString();
    }
  };

  // Componente de tooltip customizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/90 border border-purple-700/50 rounded-lg p-3 shadow-lg">
          <p className="text-purple-300 font-medium">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.dataKey}: ${formatChartValue(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Gráfico de barras
  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={mockChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis 
          dataKey="month" 
          stroke="#9ca3af"
          fontSize={12}
        />
        <YAxis 
          stroke="#9ca3af"
          fontSize={12}
          tickFormatter={(value) => formatChartValue(value)}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        
        {chartVisibleSeries.investments && (
          <Bar 
            dataKey="investments" 
            fill={CHART_COLORS.investments} 
            name="Investimentos"
            radius={[2, 2, 0, 0]}
          />
        )}
        {chartVisibleSeries.profits && (
          <Bar 
            dataKey="profits" 
            fill={CHART_COLORS.profits} 
            name="Lucros"
            radius={[2, 2, 0, 0]}
          />
        )}
        {chartVisibleSeries.balance && (
          <Bar 
            dataKey="balance" 
            fill={CHART_COLORS.balance} 
            name="Saldo"
            radius={[2, 2, 0, 0]}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );

  // Gráfico de linhas
  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={mockChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis 
          dataKey="month" 
          stroke="#9ca3af"
          fontSize={12}
        />
        <YAxis 
          stroke="#9ca3af"
          fontSize={12}
          tickFormatter={(value) => formatChartValue(value)}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        
        {chartVisibleSeries.investments && (
          <Line 
            type="monotone" 
            dataKey="investments" 
            stroke={CHART_COLORS.investments} 
            strokeWidth={2}
            name="Investimentos"
            dot={{ fill: CHART_COLORS.investments, strokeWidth: 2, r: 4 }}
          />
        )}
        {chartVisibleSeries.profits && (
          <Line 
            type="monotone" 
            dataKey="profits" 
            stroke={CHART_COLORS.profits} 
            strokeWidth={2}
            name="Lucros"
            dot={{ fill: CHART_COLORS.profits, strokeWidth: 2, r: 4 }}
          />
        )}
        {chartVisibleSeries.balance && (
          <Line 
            type="monotone" 
            dataKey="balance" 
            stroke={CHART_COLORS.balance} 
            strokeWidth={2}
            name="Saldo"
            dot={{ fill: CHART_COLORS.balance, strokeWidth: 2, r: 4 }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );

  // Gráfico de área
  const renderAreaChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={mockChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis 
          dataKey="month" 
          stroke="#9ca3af"
          fontSize={12}
        />
        <YAxis 
          stroke="#9ca3af"
          fontSize={12}
          tickFormatter={(value) => formatChartValue(value)}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        
        {chartVisibleSeries.investments && (
          <Area 
            type="monotone" 
            dataKey="investments" 
            stackId="1"
            stroke={CHART_COLORS.investments} 
            fill={CHART_COLORS.investments}
            fillOpacity={0.6}
            name="Investimentos"
          />
        )}
        {chartVisibleSeries.profits && (
          <Area 
            type="monotone" 
            dataKey="profits" 
            stackId="1"
            stroke={CHART_COLORS.profits} 
            fill={CHART_COLORS.profits}
            fillOpacity={0.6}
            name="Lucros"
          />
        )}
        {chartVisibleSeries.balance && (
          <Area 
            type="monotone" 
            dataKey="balance" 
            stackId="1"
            stroke={CHART_COLORS.balance} 
            fill={CHART_COLORS.balance}
            fillOpacity={0.6}
            name="Saldo"
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );

  // Gráfico de pizza para distribuição
  const pieData = useMemo(() => [
    { name: 'Investimentos', value: mockChartData.reduce((acc, item) => acc + item.investments, 0), color: CHART_COLORS.investments },
    { name: 'Lucros', value: mockChartData.reduce((acc, item) => acc + item.profits, 0), color: CHART_COLORS.profits },
    { name: 'Saldo', value: mockChartData.reduce((acc, item) => acc + item.balance, 0), color: CHART_COLORS.balance }
  ], [mockChartData]);

  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
        >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatChartValue(Number(value))} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );

  // Renderizar gráfico baseado no tipo selecionado
  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return renderLineChart();
      case 'area':
        return renderAreaChart();
      case 'bar':
      default:
        return renderBarChart();
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-black/20 border border-purple-700/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5" />
            Gráficos e Visualizações
          </CardTitle>
          <CardDescription>
            Visualize seus dados de investimentos e lucros
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Controles dos gráficos */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-black/30 rounded-lg border border-purple-700/20">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tipo de Gráfico</Label>
              <Select value={chartType} onValueChange={(value: "line" | "bar" | "area") => setChartType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Barras</SelectItem>
                  <SelectItem value="line">Linhas</SelectItem>
                  <SelectItem value="area">Área</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Unidade</Label>
              <Select value={chartDisplayUnit} onValueChange={(value: "btc" | "usd" | "brl") => setChartDisplayUnit(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="btc">Bitcoin (BTC)</SelectItem>
                  <SelectItem value="usd">Dólar (USD)</SelectItem>
                  <SelectItem value="brl">Real (BRL)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Período</Label>
              <Select value={chartTimeframe} onValueChange={(value: "daily" | "monthly") => setChartTimeframe(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Visualização</Label>
              <Select value={chartViewMode} onValueChange={(value: HistoryViewMode) => setChartViewMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Relatório Ativo</SelectItem>
                  <SelectItem value="all">Todos os Relatórios</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Controles de séries visíveis */}
          <div className="space-y-3 p-4 bg-black/30 rounded-lg border border-purple-700/20">
            <Label className="text-sm font-medium">Séries Visíveis</Label>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="investments-toggle"
                  checked={chartVisibleSeries.investments}
                  onCheckedChange={(checked) => setChartVisibleSeries(prev => ({ ...prev, investments: checked }))}
                />
                <Label htmlFor="investments-toggle" className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: CHART_COLORS.investments }}></div>
                  Investimentos
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="profits-toggle"
                  checked={chartVisibleSeries.profits}
                  onCheckedChange={(checked) => setChartVisibleSeries(prev => ({ ...prev, profits: checked }))}
                />
                <Label htmlFor="profits-toggle" className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: CHART_COLORS.profits }}></div>
                  Lucros
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="balance-toggle"
                  checked={chartVisibleSeries.balance}
                  onCheckedChange={(checked) => setChartVisibleSeries(prev => ({ ...prev, balance: checked }))}
                />
                <Label htmlFor="balance-toggle" className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: CHART_COLORS.balance }}></div>
                  Saldo
                </Label>
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <Tabs defaultValue="main" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="main">Gráfico Principal</TabsTrigger>
              <TabsTrigger value="distribution">Distribuição</TabsTrigger>
            </TabsList>
            
            <TabsContent value="main" className="mt-6">
              <Card className="bg-black/20 border border-purple-700/30">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {chartType === 'bar' ? 'Gráfico de Barras' : 
                     chartType === 'line' ? 'Gráfico de Linhas' : 'Gráfico de Área'}
                  </CardTitle>
                  <CardDescription>
                    Evolução temporal dos dados em {chartDisplayUnit.toUpperCase()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {effectiveActiveReport ? renderChart() : (
                    <div className="flex items-center justify-center h-[400px] text-gray-400">
                      <div className="text-center">
                        <BarChart2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Selecione um relatório para visualizar os gráficos</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="distribution" className="mt-6">
              <Card className="bg-black/20 border border-purple-700/30">
                <CardHeader>
                  <CardTitle className="text-lg">Distribuição por Categoria</CardTitle>
                  <CardDescription>
                    Proporção dos valores totais em {chartDisplayUnit.toUpperCase()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {effectiveActiveReport ? renderPieChart() : (
                    <div className="flex items-center justify-center h-[400px] text-gray-400">
                      <div className="text-center">
                        <PieChartIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Selecione um relatório para visualizar a distribuição</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Estatísticas resumidas */}
          {effectiveActiveReport && mockChartData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-black/30 border border-purple-700/40">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {formatChartValue(mockChartData.reduce((acc, item) => acc + item.investments, 0))}
                  </div>
                  <div className="text-sm text-gray-400">Total Investido</div>
                </CardContent>
              </Card>
              
              <Card className="bg-black/30 border border-purple-700/40">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {formatChartValue(mockChartData.reduce((acc, item) => acc + item.profits, 0))}
                  </div>
                  <div className="text-sm text-gray-400">Total Lucros</div>
                </CardContent>
              </Card>
              
              <Card className="bg-black/30 border border-purple-700/40">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-amber-400">
                    {formatChartValue(mockChartData.reduce((acc, item) => acc + item.balance, 0))}
                  </div>
                  <div className="text-sm text-gray-400">Saldo Total</div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 