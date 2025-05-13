import React from 'react';
import { ExportedReport, OperationData, MonthlyBreakdown } from '@/lib/export-types'; // Ajuste o caminho se necessário

interface ReportHtmlTemplateProps {
  reportData: ExportedReport;
}

// Função auxiliar para formatar números como moeda
const formatCurrency = (value: number | undefined | null, currency: 'BRL' | 'USD' | 'BTC') => {
  if (value === undefined || value === null) return '-';
  if (currency === 'BTC') {
    return `${value.toFixed(8)} BTC`;
  }
  return new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-US', {
    style: 'currency',
    currency: currency,
  }).format(value);
};

// Função auxiliar para formatar datas
const formatDate = (dateString: string | Date) => {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const ReportHtmlTemplate: React.FC<ReportHtmlTemplateProps> = ({ reportData }) => {
  const { metadata, data, operations, chartsSvg } = reportData;
  const displayCurrency = metadata.displayCurrency;

  const getDisplayValue = (valueUSD: number, valueBRL: number) => {
    return displayCurrency === 'BRL' ? valueBRL : valueUSD;
  };
  
  const getPricePerUnitForDisplay = (op: OperationData) => {
    if (displayCurrency === 'BRL') return op.pricePerUnitBRL;
    if (displayCurrency === 'USD') return op.pricePerUnitUSD;
    return op.pricePerUnit; // Fallback, though pricePerUnit is generic
  }

  const getTotalAmountForDisplay = (op: OperationData) => {
    if (displayCurrency === 'BRL') return op.totalAmountBRL;
    if (displayCurrency === 'USD') return op.totalAmountUSD;
    return op.totalAmount; // Fallback
  }

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>{metadata.reportName}</title>
        <style>{`
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
          .section-title { /* Pode ser removido se h2/h3 já cumprem o papel */
            font-size: 18px; 
            font-weight: bold; 
            margin-top: 20px; 
            margin-bottom: 10px; 
          }
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
        `}</style>
      </head>
      <body>
        <div className="container">
          <h1>{metadata.reportName}</h1>
          <p className="report-meta">
            Período: {metadata.periodDescription} | Gerado em: {formatDate(metadata.generatedAt)} | Moeda: {metadata.displayCurrency}
          </p>

          <h2>Resumo Geral</h2>
          <div className="summary-grid">
            <div className="summary-item">
              <strong>Saldo BTC Final</strong>
              <div>{formatCurrency(data.finalBtcBalance, 'BTC')}</div>
            </div>
            <div className="summary-item">
              <strong>Valor do Portfólio Final ({displayCurrency})</strong>
              <div>{formatCurrency(getDisplayValue(data.finalPortfolioValueInUSD, data.finalPortfolioValueInBRL), displayCurrency)}</div>
            </div>
            <div className="summary-item">
              <strong>Total de Aportes ({displayCurrency})</strong>
              <div>{formatCurrency(data.totalInvestmentsInDisplayCurrency, displayCurrency)}</div>
            </div>
            <div className="summary-item">
              <strong>Total de Retiradas ({displayCurrency})</strong>
              <div>{formatCurrency(data.totalWithdrawalsInDisplayCurrency, displayCurrency)}</div>
            </div>
            <div className="summary-item">
              <strong>Lucro/Prejuízo Realizado ({displayCurrency})</strong>
              <span className={data.realizedPeriodProfitLossInDisplayCurrency >= 0 ? 'text-green' : 'text-red'}>
                {formatCurrency(data.realizedPeriodProfitLossInDisplayCurrency, displayCurrency)}
              </span>
            </div>
            <div className="summary-item">
              <strong>Lucro/Prejuízo Não Realizado ({displayCurrency})</strong>
               <span className={data.unrealizedPeriodProfitLossInDisplayCurrency >= 0 ? 'text-green' : 'text-red'}>
                {formatCurrency(data.unrealizedPeriodProfitLossInDisplayCurrency, displayCurrency)}
              </span>
            </div>
            <div className="summary-item">
              <strong>Lucro/Prejuízo Geral do Período ({displayCurrency})</strong>
              <span className={data.overallPeriodProfitLossInDisplayCurrency >= 0 ? 'text-green' : 'text-red'}>
                {formatCurrency(data.overallPeriodProfitLossInDisplayCurrency, displayCurrency)}
              </span>
            </div>
            <div className="summary-item">
              <strong>ROI Acumulado no Período</strong>
              <span className={data.cumulativePeriodROI >= 0 ? 'text-green' : 'text-red'}>
                {data.cumulativePeriodROI.toFixed(2)}%
              </span>
            </div>
          </div>
          
          {data.monthlyBreakdown && data.monthlyBreakdown.length > 0 && (
            <>
              <h2>Detalhamento Mensal ({displayCurrency})</h2>
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
                    <th>Saldo {displayCurrency} (Fim Mês)</th>
                    <th>ROI Mensal</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthlyBreakdown.map((month, index) => (
                    <tr key={index}>
                      <td>{month.monthYear}</td>
                      <td>{formatCurrency(month.investmentsInDisplayCurrency, displayCurrency)}</td>
                      <td>{formatCurrency(month.withdrawalsInDisplayCurrency, displayCurrency)}</td>
                      <td className={month.realizedProfitLossInDisplayCurrency >= 0 ? 'text-green' : 'text-red'}>{formatCurrency(month.realizedProfitLossInDisplayCurrency, displayCurrency)}</td>
                      <td className={month.unrealizedProfitLossInDisplayCurrency >= 0 ? 'text-green' : 'text-red'}>{formatCurrency(month.unrealizedProfitLossInDisplayCurrency, displayCurrency)}</td>
                      <td className={month.overallProfitLossInDisplayCurrency >= 0 ? 'text-green' : 'text-red'}>{formatCurrency(month.overallProfitLossInDisplayCurrency, displayCurrency)}</td>
                      <td>{formatCurrency(month.endOfMonthBtcBalance, 'BTC')}</td>
                      <td>{formatCurrency(month.endOfMonthBalanceInDisplayCurrency, displayCurrency)}</td>
                      <td className={month.monthlyRoi >= 0 ? 'text-green' : 'text-red'}>{month.monthlyRoi.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <h2>Histórico de Operações</h2>
          {operations && operations.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Quantidade BTC</th>
                  <th>Preço Unitário ({displayCurrency})</th>
                  <th>Valor Total ({displayCurrency})</th>
                  <th>Contexto</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((op) => (
                  <tr key={op.id}>
                    <td>{formatDate(op.date)}</td>
                    <td>{op.type}</td>
                    <td>{formatCurrency(op.btcAmount, 'BTC')}</td>
                    <td>{formatCurrency(getPricePerUnitForDisplay(op), displayCurrency)}</td>
                    <td>{formatCurrency(getTotalAmountForDisplay(op), displayCurrency)}</td>
                    <td>{op.isProfitContext ? 'Realização de Lucro' : 'Aporte/Movimentação'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>Nenhuma operação no período.</p>
          )}

          {/* Seção de Gráficos */}
          {chartsSvg && (chartsSvg.monthlyPL || chartsSvg.portfolioEvolution) && (
            <>
              <h2>Gráficos</h2>
              
              {/* Gráfico de Lucro/Prejuízo Mensal */}
              {chartsSvg.monthlyPL && (
                <div className="chart-container" style={{ marginTop: '20px', marginBottom: '30px' }}>
                  <h3>Lucro/Prejuízo Mensal ({displayCurrency})</h3>
                  <div dangerouslySetInnerHTML={{ __html: chartsSvg.monthlyPL }} />
                </div>
              )}

              {/* Placeholder para outros gráficos, como Evolução do Portfólio */}
              {/* {chartsSvg.portfolioEvolution && (
                <div className="chart-container" style={{ marginTop: '20px', marginBottom: '30px' }}>
                  <h3>Evolução do Portfólio ({displayCurrency})</h3>
                  <div dangerouslySetInnerHTML={{ __html: chartsSvg.portfolioEvolution }} />
                </div>
              )} */}
            </>
          )}
          
          <div className="footer">
            Relatório gerado por BTC Monitor.
          </div>
        </div>
      </body>
    </html>
  );
};

export default ReportHtmlTemplate; 