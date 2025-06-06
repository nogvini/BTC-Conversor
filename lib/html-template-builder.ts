import { ExportedReport, OperationData, MonthlyBreakdown } from './export-types';

// Funções auxiliares de formatação (adaptadas de ReportHtmlTemplate.tsx)
const formatCurrency = (value: number | undefined | null, currency: 'BRL' | 'USD' | 'BTC') => {
  // Se o valor for undefined, null, NaN ou Infinity, retornar um placeholder
  if (value === undefined || value === null || isNaN(value) || !isFinite(value)) {
    return currency === 'BTC' ? '0.00000000 BTC' : currency === 'BRL' ? 'R$ 0,00' : '$0.00';
  }
  
  // Tratar valores muito grandes ou muito pequenos para evitar erros
  if (Math.abs(value) > 1e15) {
    return currency === 'BTC' ? 
      `${value > 0 ? '' : '-'}∞ BTC` : 
      new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-US', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 2,
      }).format(value > 0 ? 1e15 : -1e15);
  }
  
  // Formatação normal para valores válidos
  if (currency === 'BTC') {
    const fixedValue = value.toFixed(8).replace(/\.?0+$/, ''); // Remove zeros à direita
    return `${fixedValue} BTC`;
  }
  
  return new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatDate = (dateString: string | Date) => {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

// Função segura para formatar números com verificação de undefined/null
const safeToFixed = (value: number | undefined | null, digits: number = 2): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.00';
  }
  return value.toFixed(digits);
};

const getStyles = () => `
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    margin: 0;
    padding: 0;
    color: #1F2937; /* Cinza Escuro */
    background-color: #FFFFFF;
    line-height: 1.6;
  }
  .container {
    padding: 25px;
    max-width: 840px; /* Aumentado para melhor espaçamento */
    margin: auto;
  }
  h1 {
    color: #2563EB; /* Azul Primário */
    font-size: 28px;
    text-align: center;
    margin-bottom: 15px;
    font-weight: 600;
  }
  h2 {
    color: #2563EB; /* Azul Primário */
    font-size: 22px;
    margin-top: 35px;
    margin-bottom: 20px;
    border-bottom: 2px solid #60A5FA; /* Azul Secundário */
    padding-bottom: 8px;
    font-weight: 500;
  }
  h3 {
    color: #4B5563; /* Cinza Médio */
    font-size: 18px;
    margin-top: 25px;
    margin-bottom: 12px;
    font-weight: 500;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 15px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }
  th, td {
    border: 1px solid #D1D5DB; /* Cinza Borda */
    padding: 10px 12px; /* Aumentado padding */
    text-align: left;
    font-size: 13px; /* Levemente aumentado */
    vertical-align: top; /* Melhor alinhamento vertical */
  }
  th {
    background-color: #F3F4F6; /* Cinza Claro */
    color: #4B5563; /* Cinza Médio */
    font-weight: 600; /* Aumentado peso da fonte */
    text-transform: uppercase; /* Caixa alta para cabeçalhos */
    font-size: 11px; /* Menor para cabeçalhos */
    letter-spacing: 0.5px;
  }
  tr:nth-child(even) td { /* Linhas alternadas */
    background-color: #F9FAFB; /* Um cinza ainda mais claro */
  }
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); /* Ajustado minmax */
    gap: 20px;
    margin-bottom: 25px;
  }
  .summary-item {
    background-color: #F3F4F6; /* Cinza Claro */
    padding: 20px;
    border-radius: 8px; /* Bordas mais arredondadas */
    box-shadow: 0 2px 5px rgba(0,0,0,0.08);
    border-left: 4px solid #60A5FA; /* Azul Secundário como destaque */
  }
  .summary-item strong {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    color: #1F2937; /* Cinza Escuro */
    font-weight: 600;
  }
  .summary-item span, .summary-item div { /* Para os valores */
    font-size: 16px;
    font-weight: 500;
  }
  .text-green { color: #10B981 !important; /* Verde */ }
  .text-red { color: #EF4444 !important; /* Vermelho */ }
  .report-meta {
    text-align: center;
    font-size: 12px;
    margin-bottom: 25px;
    color: #4B5563; /* Cinza Médio */
  }
  .footer {
    text-align: center;
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid #D1D5DB; /* Cinza Borda */
    font-size: 12px;
    color: #6B7280; /* gray-500 */
  }
  .chart-container h3 {
    margin-top: 0;
    margin-bottom: 15px;
    text-align: center;
  }
`;

export function buildReportHtml(reportData: ExportedReport): string {
  const { metadata, data, operations, chartsSvg } = reportData;
  const displayCurrency = metadata.displayCurrency;

  const getDisplayValue = (valueUSD: number | undefined, valueBRL: number | undefined) => {
    if (valueUSD === undefined && valueBRL === undefined) return '-';
    return displayCurrency === 'BRL' ? (valueBRL ?? valueUSD) : (valueUSD ?? valueBRL);
  };

  const getPricePerUnitForDisplay = (op: OperationData) => {
    if (displayCurrency === 'BRL') return op.pricePerUnitBRL;
    if (displayCurrency === 'USD') return op.pricePerUnitUSD;
    // Fallback se a displayCurrency não for BRL nem USD, ou se os campos específicos não estiverem definidos.
    // Isso não deve acontecer com a lógica atual, mas é um guarda.
    return op.pricePerUnitBRL ?? op.pricePerUnitUSD ?? op.pricePerUnit; 
  };

  const getTotalAmountForDisplay = (op: OperationData) => {
    if (displayCurrency === 'BRL') return op.totalAmountBRL;
    if (displayCurrency === 'USD') return op.totalAmountUSD;
    return op.totalAmountBRL ?? op.totalAmountUSD ?? op.totalAmount;
  };
  
  let operationsHtml = '';
  if (operations && operations.length > 0) {
    operationsHtml = `
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Tipo</th>
            <th>Quantidade BTC</th>
            <th>Preço Unitário (${displayCurrency})</th>
            <th>Valor Total (${displayCurrency})</th>
            <th>Contexto</th>
          </tr>
        </thead>
        <tbody>
          ${operations.map(op => `
            <tr>
              <td>${formatDate(op.date)}</td>
              <td>${op.type}</td>
              <td>${formatCurrency(op.btcAmount, 'BTC')}</td>
              <td>${formatCurrency(getPricePerUnitForDisplay(op), displayCurrency)}</td>
              <td>${formatCurrency(getTotalAmountForDisplay(op), displayCurrency)}</td>
              <td>${op.isProfitContext ? 'Realização de Lucro' : 'Aporte/Movimentação'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else {
    operationsHtml = '<p>Nenhuma operação no período.</p>';
  }

  let monthlyBreakdownHtml = '';
  if (data.monthlyBreakdown && data.monthlyBreakdown.length > 0) {
    monthlyBreakdownHtml = `
      <h2>Detalhamento Mensal (${displayCurrency})</h2>
      <table>
        <thead>
          <tr>
            <th>Mês/Ano</th>
            <th>Aportes</th>
            <th>Retiradas</th>
            <th>P/L Realizado</th>
            <th>P/L Não Realizado</th>
            <th>P/L Geral</th>
            <th>Saldo BTC (Fim Mês)</th>
            <th>Saldo ${displayCurrency} (Fim Mês)</th>
            <th>ROI Mensal</th>
          </tr>
        </thead>
        <tbody>
          ${data.monthlyBreakdown.map(month => `
            <tr>
              <td>${month.monthYear}</td>
              <td>${formatCurrency(month.investmentsInDisplayCurrency, displayCurrency)}</td>
              <td>${formatCurrency(month.withdrawalsInDisplayCurrency, displayCurrency)}</td>
              <td class="${(month.realizedProfitLossInDisplayCurrency || 0) >= 0 ? 'text-green' : 'text-red'}">${formatCurrency(month.realizedProfitLossInDisplayCurrency, displayCurrency)}</td>
              <td class="${(month.unrealizedProfitLossInDisplayCurrency || 0) >= 0 ? 'text-green' : 'text-red'}">${formatCurrency(month.unrealizedProfitLossInDisplayCurrency, displayCurrency)}</td>
              <td class="${(month.overallProfitLossInDisplayCurrency || 0) >= 0 ? 'text-green' : 'text-red'}">${formatCurrency(month.overallProfitLossInDisplayCurrency, displayCurrency)}</td>
              <td>${formatCurrency(month.endOfMonthBtcBalance, 'BTC')}</td>
              <td>${formatCurrency(month.endOfMonthBalanceInDisplayCurrency, displayCurrency)}</td>
              <td class="${(month.monthlyRoi || 0) >= 0 ? 'text-green' : 'text-red'}">${safeToFixed(month.monthlyRoi, 2)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  // O SVG do gráfico é omitido por enquanto, mas o placeholder para a seção é mantido.
  let chartsHtml = '';
  if (chartsSvg && chartsSvg.monthlyPL) {
    chartsHtml = `
      <h2>Gráficos</h2>
      <div class="chart-container" style="margin-top: 20px; margin-bottom: 30px;">
        <h3>Lucro/Prejuízo Mensal (${displayCurrency})</h3>
        <div>${chartsSvg.monthlyPL}</div>
      </div>
    `;
  } else if (chartsSvg) { // Se chartsSvg existir mas sem monthlyPL, ainda mostrar o título da seção se planejarmos outros.
    chartsHtml = '<h2>Gráficos</h2><p style="text-align:center; color: #777;">Gráfico não disponível.</p>';
  }


  return `
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>${metadata.reportName}</title>
        <style>${getStyles()}</style>
      </head>
      <body>
        <div class="container">
          <h1>${metadata.reportName}</h1>
          <p class="report-meta">
            Período: ${metadata.periodDescription} | Gerado em: ${formatDate(metadata.generatedAt)} | Moeda: ${metadata.displayCurrency}
          </p>

          <h2>Resumo Geral</h2>
          <div class="summary-grid">
            <div class="summary-item">
              <strong>Saldo BTC Final</strong>
              <div>${formatCurrency(data.finalBtcBalance, 'BTC')}</div>
            </div>
            <div class="summary-item">
              <strong>Valor do Portfólio Final (${displayCurrency})</strong>
              <div>${formatCurrency(getDisplayValue(data.finalPortfolioValueInUSD, data.finalPortfolioValueInBRL), displayCurrency)}</div>
            </div>
            <div class="summary-item">
              <strong>Total de Aportes (${displayCurrency})</strong>
              <div>${formatCurrency(data.totalInvestmentsInDisplayCurrency, displayCurrency)}</div>
            </div>
            <div class="summary-item">
              <strong>Total de Retiradas (${displayCurrency})</strong>
              <div>${formatCurrency(data.totalWithdrawalsInDisplayCurrency, displayCurrency)}</div>
            </div>
            <div class="summary-item">
              <strong>Lucro/Prejuízo Realizado (${displayCurrency})</strong>
              <span class="${(data.realizedPeriodProfitLossInDisplayCurrency || 0) >= 0 ? 'text-green' : 'text-red'}">
                ${formatCurrency(data.realizedPeriodProfitLossInDisplayCurrency, displayCurrency)}
              </span>
            </div>
            <div class="summary-item">
              <strong>Lucro/Prejuízo Não Realizado (${displayCurrency})</strong>
              <span class="${(data.unrealizedPeriodProfitLossInDisplayCurrency || 0) >= 0 ? 'text-green' : 'text-red'}">
                ${formatCurrency(data.unrealizedPeriodProfitLossInDisplayCurrency, displayCurrency)}
              </span>
            </div>
            <div class="summary-item">
              <strong>Lucro/Prejuízo Geral do Período (${displayCurrency})</strong>
              <span class="${(data.overallPeriodProfitLossInDisplayCurrency || 0) >= 0 ? 'text-green' : 'text-red'}">
                ${formatCurrency(data.overallPeriodProfitLossInDisplayCurrency, displayCurrency)}
              </span>
            </div>
            <div class="summary-item">
              <strong>ROI Acumulado no Período</strong>
              <span class="${(data.cumulativePeriodROI || 0) >= 0 ? 'text-green' : 'text-red'}">
                ${safeToFixed(data.cumulativePeriodROI, 2)}%
              </span>
            </div>
          </div>
          
          ${monthlyBreakdownHtml}

          <h2>Histórico de Operações</h2>
          ${operationsHtml}

          ${chartsHtml} {/* Renderiza a seção de gráficos ou a mensagem de indisponibilidade */}

          <div class="footer">
            Relatório gerado por BTC Monitor.
          </div>
        </div>
      </body>
    </html>
  `;
} 