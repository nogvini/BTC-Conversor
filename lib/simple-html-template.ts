import { SimpleReportData } from './simple-report-processing';

/**
 * Gera HTML para o relatório usando dados processados de forma simples
 */
export function generateSimpleReportHtml(data: SimpleReportData): string {
  const currencySymbol = data.displayCurrency === 'USD' ? '$' : 'R$';
  
  // Formatadores
  const formatCurrency = (value: number) => {
    return `${currencySymbol} ${value.toLocaleString('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const formatBtc = (value: number) => {
    return `${value.toFixed(8)} BTC`;
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return 'N/A';
    }
  };

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório Bitcoin - ${data.reportName}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f8f9fa;
            padding: 20px;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #f59e0b;
            padding-bottom: 20px;
        }

        .header h1 {
            color: #f59e0b;
            font-size: 28px;
            margin-bottom: 10px;
        }

        .header .subtitle {
            color: #6b7280;
            font-size: 16px;
        }

        .section {
            margin-bottom: 30px;
        }

        .section h2 {
            color: #374151;
            font-size: 20px;
            margin-bottom: 15px;
            padding-left: 10px;
            border-left: 4px solid #f59e0b;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
        }

        .stat-card .label {
            color: #6b7280;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 5px;
        }

        .stat-card .value {
            font-size: 18px;
            font-weight: 600;
            color: #111827;
        }

        .stat-card .sub-value {
            font-size: 12px;
            color: #6b7280;
            margin-top: 2px;
        }

        .profit {
            color: #059669 !important;
        }

        .loss {
            color: #dc2626 !important;
        }

        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        .info-table th,
        .info-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }

        .info-table th {
            background-color: #f8f9fa;
            color: #374151;
            font-weight: 600;
        }

        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
        }

        .highlight {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }

        .highlight .big-number {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .highlight .description {
            font-size: 14px;
            opacity: 0.9;
        }

        .charts-section {
            margin: 30px 0;
            page-break-inside: avoid;
        }

        .chart-container {
            margin: 20px 0;
            text-align: center;
            page-break-inside: avoid;
        }

        .chart-title {
            font-size: 16px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 10px;
        }

        .chart-image {
            max-width: 100%;
            height: auto;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .container {
                box-shadow: none;
                border: none;
                margin: 0;
                padding: 20px;
            }

            .charts-section {
                page-break-before: auto;
                page-break-after: auto;
            }

            .chart-container {
                page-break-inside: avoid;
                margin: 15px 0;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>📊 ${data.reportName}</h1>
            <div class="subtitle">
                ${data.reportPeriod}<br>
                Gerado em ${formatDate(data.generatedAt)} • Moeda: ${data.displayCurrency}
            </div>
        </div>

        <!-- Resumo Principal -->
        <div class="section">
            <h2>📈 Resumo Financeiro</h2>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="label">Total Investido</div>
                    <div class="value">${formatCurrency(data.totalInvestmentsDisplay)}</div>
                    <div class="sub-value">${formatBtc(data.totalInvestmentsBtc)}</div>
                </div>

                <div class="stat-card">
                    <div class="label">Lucros/Perdas</div>
                    <div class="value ${data.totalProfitsBtc >= 0 ? 'profit' : 'loss'}">
                        ${formatCurrency(data.totalProfitsDisplay)}
                    </div>
                    <div class="sub-value">${formatBtc(data.totalProfitsBtc)}</div>
                </div>

                <div class="stat-card">
                    <div class="label">Saldo Final</div>
                    <div class="value">${formatCurrency(data.totalBalanceDisplay)}</div>
                    <div class="sub-value">${formatBtc(data.totalBalanceBtc)}</div>
                </div>

                <div class="stat-card">
                    <div class="label">ROI</div>
                    <div class="value ${data.roi >= 0 ? 'profit' : 'loss'}">
                        ${formatPercent(data.roi)}
                    </div>
                    <div class="sub-value">Retorno sobre investimento</div>
                </div>
            </div>

            ${data.roi >= 0 ? `
            <div class="highlight">
                <div class="big-number">+${formatPercent(data.roi)}</div>
                <div class="description">
                    Seus investimentos em Bitcoin resultaram em um retorno positivo de ${formatPercent(data.roi)}
                </div>
            </div>
            ` : `
            <div class="highlight" style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);">
                <div class="big-number">${formatPercent(data.roi)}</div>
                <div class="description">
                    Seus investimentos em Bitcoin resultaram em uma perda de ${formatPercent(Math.abs(data.roi))}
                </div>
            </div>
            `}
        </div>

        <!-- Análise Temporal -->
        <div class="section">
            <h2>⏰ Análise Temporal</h2>
            
            <table class="info-table">
                <tr>
                    <th>Métrica</th>
                    <th>Valor</th>
                </tr>
                <tr>
                    <td>Primeiro Aporte</td>
                    <td>${formatDate(data.primeiroAporteDate)}</td>
                </tr>
                <tr>
                    <td>Tempo de Investimento</td>
                    <td>${data.tempoTotalInvestimento}</td>
                </tr>
                <tr>
                    <td>Dias de Investimento</td>
                    <td>${data.diasDeInvestimento} dias</td>
                </tr>
                <tr>
                    <td>ROI Anualizado</td>
                    <td class="${data.roiAnualizadoPercent >= 0 ? 'profit' : 'loss'}">
                        ${formatPercent(data.roiAnualizadoPercent)}
                    </td>
                </tr>
                <tr>
                    <td>Média Diária de Lucro</td>
                    <td class="${data.mediaDiariaLucroBtc >= 0 ? 'profit' : 'loss'}">
                        ${formatBtc(data.mediaDiariaLucroBtc)}
                    </td>
                </tr>
                <tr>
                    <td>Média Diária de ROI</td>
                    <td class="${data.mediaDiariaRoiPercent >= 0 ? 'profit' : 'loss'}">
                        ${formatPercent(data.mediaDiariaRoiPercent)}
                    </td>
                </tr>
            </table>
        </div>

        <!-- Informações de Mercado -->
        <div class="section">
            <h2>💰 Cotações Atuais</h2>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="label">Bitcoin (USD)</div>
                    <div class="value">$ ${data.currentBtcPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div class="sub-value">Preço atual em dólares</div>
                </div>

                <div class="stat-card">
                    <div class="label">Bitcoin (BRL)</div>
                    <div class="value">R$ ${data.currentBtcPriceBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div class="sub-value">Preço atual em reais</div>
                </div>
            </div>
        </div>

        ${data.capturedCharts && data.capturedCharts.length > 0 ? `
        <!-- Gráficos -->
        <div class="section">
            <h2>📊 Gráficos e Visualizações</h2>
            
            <div class="charts-section">
                ${data.capturedCharts.map(chart => `
                <div class="chart-container">
                    <div class="chart-title">${chart.title}</div>
                    <img 
                        src="${chart.dataUrl}" 
                        alt="${chart.title}"
                        class="chart-image"
                        style="width: ${Math.min(chart.width, 700)}px; height: auto;"
                    />
                </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
            <p>
                Relatório gerado automaticamente pelo sistema BTC Monitor<br>
                Data e hora de geração: ${new Date(data.generatedAt).toLocaleString('pt-BR')}<br>
                <em>Este relatório utiliza cálculos simplificados baseados nos dados de investimentos e lucros registrados.</em>
            </p>
        </div>
    </div>
</body>
</html>
  `;
} 