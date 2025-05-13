import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { MonthlyBreakdown } from '@/lib/export-types';

interface MonthlyPLChartProps {
  data: MonthlyBreakdown[];
  currency: 'BRL' | 'USD';
  width?: number;
  height?: number;
}

const PositiveColor = '#10B981'; // Verde (igual ao do template)
const NegativeColor = '#EF4444'; // Vermelho (igual ao do template)
// Cores para P/L não realizado - podem ser mais neutras ou distintas
const UnrealizedPositiveColor = '#3B82F6'; // Azul
const UnrealizedNegativeColor = '#F97316'; // Laranja

const formatCurrencyForAxis = (value: number, currency: 'BRL' | 'USD') => {
  if (currency === 'BRL') {
    return `R$${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const CustomTooltip: React.FC<any> = ({ active, payload, label, currency }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ backgroundColor: '#fff', border: '1px solid #ccc', padding: '10px', fontSize: '12px' }}>
        <p style={{ margin: 0, fontWeight: 'bold' }}>{`Mês: ${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} style={{ margin: '2px 0', color: entry.color }}>
            {`${entry.name}: ${formatCurrencyForAxis(entry.value, currency)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const MonthlyPLChart: React.FC<MonthlyPLChartProps> = ({ data, currency, width = 780, height = 350 }) => {
  if (!data || data.length === 0) {
    return <div style={{textAlign: 'center', padding: '20px', fontSize: '14px'}}>Não há dados mensais suficientes para exibir o gráfico.</div>;
  }

  const chartData = data.map(item => ({
    monthYear: item.monthYear,
    realizedPnl: item.realizedProfitLossInDisplayCurrency,
    unrealizedPnl: item.unrealizedProfitLossInDisplayCurrency,
    overallPnl: item.overallProfitLossInDisplayCurrency,
  }));

  // Para renderização no servidor (SVG estático), ResponsiveContainer pode não ser ideal.
  // Vamos usar dimensões fixas que passamos por props, com fallback.

  return (
    // Removido ResponsiveContainer para renderização de SVG estático no servidor
    <BarChart
      width={width} 
      height={height}
      data={chartData}
      margin={{
        top: 5,
        right: 30,
        left: 20,
        bottom: 5,
      }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#D1D5DB" />
      <XAxis dataKey="monthYear" tick={{ fontSize: 10 }} />
      <YAxis tickFormatter={(value) => formatCurrencyForAxis(value, currency)} tick={{ fontSize: 10 }} />
      <Tooltip content={<CustomTooltip currency={currency} />} />
      <Legend wrapperStyle={{ fontSize: '12px'}} />
      <Bar dataKey="realizedPnl" name={`P/L Realizado (${currency})`} unit={currency} >
        {chartData.map((entry, index) => (
          <Cell key={`cell-realized-${index}`} fill={entry.realizedPnl >= 0 ? PositiveColor : NegativeColor} />
        ))}
      </Bar>
      <Bar dataKey="unrealizedPnl" name={`P/L Não Realizado (${currency})`} unit={currency} >
        {chartData.map((entry, index) => (
            // Para P/L não realizado, podemos usar cores diferentes ou as mesmas de P/L
            // Aqui estou usando cores distintas para P/L não realizado
          <Cell key={`cell-unrealized-${index}`} fill={entry.unrealizedPnl >= 0 ? UnrealizedPositiveColor : UnrealizedNegativeColor} />
        ))}
      </Bar>
      {/* Poderia adicionar uma Line para overallPnl se desejado 
      <Line type="monotone" dataKey="overallPnl" stroke="#ff7300" name={`P/L Geral (${currency})`} /> 
      */}
    </BarChart>
  );
};

export default MonthlyPLChart; 