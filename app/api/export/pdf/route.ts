import { NextRequest, NextResponse } from 'next/server';
// import puppeteer from 'puppeteer'; // Comentado ou removido se puppeteer-core for usado diretamente
import puppeteer from 'puppeteer-core'; // Usar puppeteer-core
import chromium from '@sparticuz/chromium'; // Nova importação
// import { алюминиевый } from 'stream/consumers'; // Comentado - parece ser um import perdido/incorreto

interface ExportOptions {
  exportFormat: 'excel' | 'pdf';
  reportSelectionType: 'active' | 'history' | 'manual';
  manualSelectedReportIds?: string[];
  periodSelectionType: 'all' | 'historyFilter' | 'specificMonth' | 'customRange';
  specificMonthDate?: string | null; // Datas como string ISO
  customStartDate?: string | null;
  customEndDate?: string | null;
  includeCharts?: boolean;
  includeSummarySection?: boolean;
  includeInvestmentsTableSection?: boolean;
  includeProfitsTableSection?: boolean;
  pdfDarkMode?: boolean; // NOVO
}

interface Investment {
  id: string;
  originalId?: string;
  date: string;
  amount: number;
  unit: "BTC" | "SATS";
}

interface ProfitRecord {
  id: string;
  originalId?: string;
  date: string;
  amount: number;
  unit: "BTC" | "SATS";
  isProfit: boolean;
}

interface ChartDataPoint {
  monthYear: string;
  totalInvestments: number;
  netProfits: number;
  totalProfits: number;
  totalLosses: number;
}

interface Payload {
  reportName: string;
  options: ExportOptions;
  investments: Investment[];
  profits: ProfitRecord[];
  summaryData: {
    totalInvestmentsBtc: number;
    totalProfitsBtc: number;
    totalLossesBtc: number;
    netProfitBtc: number;
    balanceBtc: number;
    currentRates: { btcToUsd: number; brlToUsd: number };
    displayCurrency: "USD" | "BRL";
    totalInvestmentsDisplay: number;
    totalProfitsDisplay: number;
    totalLossesDisplay: number;
    netProfitDisplay: number;
    averageRoi: number;
  };
  chartData: ChartDataPoint[];
}

// Função para gerar o HTML do relatório
const generateReportHTML = (data: Payload): string => {
  const { reportName, options, investments, profits, summaryData, chartData } = data;
  const { displayCurrency, currentRates, totalInvestmentsBtc, totalInvestmentsDisplay, totalProfitsBtc, totalProfitsDisplay, totalLossesBtc, totalLossesDisplay, netProfitBtc, netProfitDisplay, averageRoi } = summaryData;
  const { pdfDarkMode } = options; // NOVO - obter a opção de modo escuro

  const formatCurrencyValue = (value: number, currency: "USD" | "BRL" | "BTC" | "SATS") => {
    if (currency === "USD") return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (currency === "BRL") return `R$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (currency === "BTC") return `${value.toFixed(8)} BTC`;
    if (currency === "SATS") return `${value.toLocaleString()} SATS`;
    return value.toString();
  };

  const formatDate = (dateString: string | null | undefined, includeTime: boolean = false): string => {
    if (!dateString) return 'N/A';
    try {
      // Tentar normalizar para objeto Date primeiro, se for string
      const dateObj = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: includeTime ? '2-digit' : undefined, minute: includeTime ? '2-digit' : undefined });
    } catch (e) {
      return typeof dateString === 'string' ? dateString : 'Data Inválida';
    }
  };

  const getPeriodDescription = () => {
    switch (options.periodSelectionType) {
      case 'all':
        return 'Todos os dados';
      case 'specificMonth':
        return options.specificMonthDate ? formatDate(options.specificMonthDate) : 'Mês não especificado';
      case 'customRange':
        return (options.customStartDate && options.customEndDate) ? 
               `${formatDate(options.customStartDate)} - ${formatDate(options.customEndDate)}` : 'Intervalo não especificado';
      case 'historyFilter': // Supondo que você possa querer passar o filtro do histórico para o backend
        return 'Conforme filtro do histórico da aplicação'; // Melhorar isso se tiver os detalhes
      default:
        return 'Não especificado';
    }
  };

  let html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${reportName}</title>
      <script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          background-color: #f4f4f9;
          color: #333;
          font-size: 14px;
          line-height: 1.6;
        }
        .dark-mode {
          background-color: #0d1117 !important; /* GitHub Dark Background - !important para garantir */
          color: #c9d1d9; /* GitHub Dark Text */
          margin: 0;
          padding: 0; /* Adicionado para remover qualquer preenchimento do body no modo escuro */
        }
        .dark-mode .container {
          background-color: #161b22; /* GitHub Dark Paper Background */
          border-color: #30363d; /* GitHub Dark Border */
          margin: 0 auto; /* Manter centralizado, mas sem margem superior/inferior que cause borda */
          padding: 25px; /* Padding interno do container */
          /* Remover box-shadow que pode causar bordas se não for bem ajustado para PDF */
          box-shadow: none; 
          /* Garantir que o container ocupe a largura mas sem causar overflow que gere barras de rolagem no PDF */
          max-width: 100%; 
          width: 100%;
          border-radius: 0; /* Sem bordas arredondadas que podem parecer estranhas no PDF fullscreen */
        }
        .dark-mode h1, .dark-mode h2, .dark-mode h3 {
          color: #58a6ff; /* GitHub Dark Primary Link/Header */
        }
        .dark-mode h1 { border-bottom-color: #30363d; }
        .dark-mode h2 { border-bottom-color: #21262d; }
        .dark-mode table th {
          background-color: #1f2937; /* Azul escuro/cinza para cabeçalhos de tabela */
          color: #e5e7eb;
        }
        .dark-mode table td, .dark-mode table th {
          border-color: #30363d;
        }
        .dark-mode table tr:nth-child(even) {
          background-color: #1a202c; /* Um pouco mais claro que o container para contraste */
        }
        .dark-mode .section {
          background-color: #161b22;
          border-color: #30363d;
        }
        .dark-mode .summary-item {
          background-color: #21262c;
          border-left-color: #58a6ff;
        }
        .dark-mode .summary-item .label {
          color: #8b949e; /* GitHub Dark Secondary Text */
        }
        .dark-mode .summary-item .value {
          color: #c9d1d9;
        }
        .dark-mode .profit {
          color: #56d364 !important; /* GitHub Dark Green */
        }
        .dark-mode .loss {
          color: #f85149 !important; /* GitHub Dark Red */
        }
        .dark-mode .chart-container {
          border-color: #30363d;
          background-color: transparent; /* Gráficos geralmente têm seu próprio fundo */
        }
        .dark-mode .no-data {
          color: #8b949e;
        }

        .container {
          max-width: 800px;
          margin: 20px auto;
          background-color: #ffffff;
          padding: 25px;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        h1 { color: #4f46e5; text-align: center; border-bottom: 2px solid #6366f1; padding-bottom: 15px; margin-top:0; margin-bottom: 25px; font-size: 24px; }
        h2 { color: #6d28d9; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-top: 30px; margin-bottom: 15px; font-size: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; }
        th, td { border: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; vertical-align: middle; }
        th { background-color: #f3f4f6; color: #374151; font-weight: 600; }
        tr:nth-child(even) { background-color: #f9fafb; }
        .section { margin-bottom: 30px; padding: 20px; background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .summary-item { background-color: #f3f4f6; padding: 12px; border-radius: 6px; border-left: 4px solid #6366f1;}
        .summary-item .label { font-size: 0.85em; color: #4b5563; margin-bottom: 4px; display: block; }
        .summary-item .value { font-size: 1.1em; font-weight: 600; color: #1f2937; }
        .profit { color: #10b981 !important; }
        .loss { color: #ef4444 !important; }
        .chart-container { width: 100%; margin: 25px auto; padding: 15px; border: 1px solid #e5e7eb; border-radius: 6px; background-color: #fff; }
        .no-data { text-align: center; color: #6b7280; padding: 20px; font-style: italic; }
        @media print {
          body {
             margin: 0;
             padding: 0;
             background-color: #fff; /* Para impressão normal, fundo branco */
          }
          .dark-mode {
             background-color: #0d1117 !important; /* Manter o fundo escuro para impressão PDF em modo escuro */
          }
          .container {
             box-shadow: none;
             border-radius: 0;
             margin: 0 auto;
             padding: 20px; /* Padding para o conteúdo dentro do PDF */
             border: none;
             max-width: 100%;
             width: 100%;
          }
          .dark-mode .container {
             background-color: #161b22; /* Fundo do container no modo escuro para impressão */
             padding: 20px; /* Ajustar se necessário para impressão */
          }
          h1, h2 { page-break-after: avoid; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          .section { border: none; box-shadow: none; padding: 15px 0; }
        }
      </style>
    </head>
    <body class="${pdfDarkMode ? 'dark-mode' : ''}">
      <div class="container">
        <h1>Relatório de Performance: ${reportName}</h1>
  `;

  // Seção de Resumo
  if (options.includeSummarySection) {
    html += `
      <div class="section summary-section">
        <h2>Resumo Financeiro</h2>
        <div class="summary-grid">
          <div class="summary-item"><span class="label">Relatório(s):</span> <span class="value">${reportName}</span></div>
          <div class="summary-item"><span class="label">Período:</span> <span class="value">${getPeriodDescription()}</span></div>
          <div class="summary-item"><span class="label">Total Investido (BTC):</span> <span class="value">${totalInvestmentsBtc.toFixed(8)}</span></div>
          <div class="summary-item"><span class="label">Lucro Bruto (BTC):</span> <span class="value profit">${totalProfitsBtc.toFixed(8)}</span></div>
          <div class="summary-item"><span class="label">Prejuízo Bruto (BTC):</span> <span class="value loss">${totalLossesBtc.toFixed(8)}</span></div>
          <div class="summary-item"><span class="label">Lucro Líquido (BTC):</span> <span class="value ${netProfitBtc >= 0 ? 'profit' : 'loss'}">${netProfitBtc.toFixed(8)}</span></div>
          <div class="summary-item"><span class="label">Saldo Estimado (BTC):</span> <span class="value">${summaryData.balanceBtc.toFixed(8)}</span></div>
          <div class="summary-item"><span class="label">Saldo em ${displayCurrency}:</span> <span class="value">${formatCurrencyValue(summaryData.balanceBtc * (displayCurrency === 'USD' ? currentRates.btcToUsd : currentRates.btcToUsd * currentRates.brlToUsd), displayCurrency)}</span></div>
        </div>
      </div>
    `;
  }

  // Tabela de Investimentos
  if (options.includeInvestmentsTableSection) {
    html += `
      <div class="section investments-section">
        <h2>Investimentos Detalhados</h2>`;
    if (investments.length > 0) {
      html += `
        <table>
          <thead>
            <tr><th>Data</th><th>Quantidade</th><th>Unidade</th><th>Equivalente BTC</th></tr>
          </thead>
          <tbody>
            ${investments.map(inv => `
              <tr>
                <td>${formatDate(inv.date)}</td>
                <td>${inv.amount.toLocaleString()}</td>
                <td>${inv.unit}</td>
                <td>${(inv.unit === 'SATS' ? inv.amount / 100000000 : inv.amount).toFixed(8)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>`;
    } else {
      html += `<p class="no-data">Nenhum investimento registrado para o período selecionado.</p>`;
    }
    html += `</div>`;
  }

  // Tabela de Lucros/Perdas
  if (options.includeProfitsTableSection) {
    html += `
      <div class="section profits-section">
        <h2>Lucros e Prejuízos Detalhados</h2>`;
    if (profits.length > 0) {
      html += `
        <table>
          <thead>
            <tr><th>Data</th><th>Tipo</th><th>Quantidade</th><th>Unidade</th><th>Valor (BTC)</th></tr>
          </thead>
          <tbody>
            ${profits.map(prof => {
              const btcValue = prof.unit === 'SATS' ? prof.amount / 100000000 : prof.amount;
              return `
                <tr>
                  <td>${formatDate(prof.date)}</td>
                  <td class="${prof.isProfit ? 'profit' : 'loss'}">${prof.isProfit ? 'Lucro' : 'Perda'}</td>
                  <td>${prof.amount.toLocaleString()}</td>
                  <td>${prof.unit}</td>
                  <td class="${prof.isProfit ? 'profit' : 'loss'}">${(prof.isProfit ? '+' : '-')}${btcValue.toFixed(8)}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>`;
    } else {
      html += `<p class="no-data">Nenhum registro de lucro ou prejuízo para o período selecionado.</p>`;
    }
    html += `</div>`;
  }
  
  // Seção de Gráficos
  if (options.includeCharts && chartData.length > 0) {
    const chartLabels = chartData.map(d => formatDate(d.monthYear + '-01')); // Formatar para exibição
    const investmentValues = chartData.map(d => d.totalInvestments);
    const netProfitValues = chartData.map(d => d.netProfits);

    // Calcular dados para o gráfico de Evolução do Saldo
    let currentBalanceBtc = 0;
    const balanceEvolutionValues = chartData.map(d => {
      // Aqui, o saldo acumula com base no netProfits e nos novos investimentos do mês
      currentBalanceBtc += d.netProfits + d.totalInvestments; 
      return currentBalanceBtc;
    });
    
    // Dados para o Gráfico de Pizza (Distribuição de Lucros vs Perdas)
    let profitDistributionData: number[];
    let profitDistributionLabels: string[];
    let dynamicProfitDistributionColors: string[];

    const onlyProfits = totalProfitsBtc > 0 && totalLossesBtc === 0;
    const onlyLosses = totalLossesBtc > 0 && totalProfitsBtc === 0;
    const bothProfitAndLoss = totalProfitsBtc > 0 && totalLossesBtc > 0;

    // Cores base para modo claro
    const profitColorClear = 'rgba(34, 197, 94, 0.7)'; // Verde
    const lossColorClear = 'rgba(239, 68, 68, 0.7)';   // Vermelho
    const neutralColorClear = 'rgba(107, 114, 128, 0.7)'; // Cinza (para casos sem lucro/perda)

    // Cores base para modo escuro
    const profitColorDark = 'rgba(52, 211, 153, 0.7)'; // Verde claro
    const lossColorDark = 'rgba(248, 113, 113, 0.7)';   // Vermelho claro
    const neutralColorDark = 'rgba(156, 163, 175, 0.7)'; // Cinza claro

    const currentProfitColor = pdfDarkMode ? profitColorDark : profitColorClear;
    const currentLossColor = pdfDarkMode ? lossColorDark : lossColorClear;
    const currentNeutralColor = pdfDarkMode ? neutralColorDark : neutralColorClear;

    if (onlyProfits) {
      profitDistributionData = [totalProfitsBtc];
      profitDistributionLabels = ['Lucros Totais (BTC)'];
      dynamicProfitDistributionColors = [currentProfitColor];
    } else if (onlyLosses) {
      profitDistributionData = [Math.abs(totalLossesBtc)]; // Usar valor absoluto para o gráfico
      profitDistributionLabels = ['Perdas Totais (BTC)'];
      dynamicProfitDistributionColors = [currentLossColor];
    } else if (bothProfitAndLoss) {
      profitDistributionData = [totalProfitsBtc, Math.abs(totalLossesBtc)];
      profitDistributionLabels = ['Lucros Totais (BTC)', 'Perdas Totais (BTC)'];
      dynamicProfitDistributionColors = [currentProfitColor, currentLossColor];
    } else { // Sem lucros nem perdas (ex: apenas investimentos iniciais sem operações de profit/loss)
      profitDistributionData = [1]; // Valor simbólico para exibir o gráfico
      profitDistributionLabels = ['Sem Lucros ou Perdas Registrados'];
      dynamicProfitDistributionColors = [currentNeutralColor];
    }

    const textColor = pdfDarkMode ? '#c9d1d9' : '#333';
    const gridColor = pdfDarkMode ? 'rgba(201, 209, 217, 0.2)' : 'rgba(0, 0, 0, 0.1)';
    const tooltipBackgroundColor = pdfDarkMode ? '#161b22' : '#fff';
    const tooltipTitleColor = pdfDarkMode ? '#58a6ff' : '#333';
    const tooltipBodyColor = pdfDarkMode ? '#c9d1d9' : '#333';
    
    html += `
      <div class="section charts-section">
        <h2>Análise Gráfica</h2>
        
        <div class="chart-container" id="chartContainerMonthlyPerformance">
          <h3>Desempenho Mensal (BTC)</h3>
          <canvas id="monthlyPerformanceChart"></canvas>
        </div>
        
        <div class="chart-container" id="chartContainerBalanceEvolution">
          <h3>Evolução do Saldo Acumulado (BTC)</h3>
          <canvas id="balanceEvolutionChart"></canvas>
        </div>

        <div class="chart-container" id="chartContainerProfitDistribution">
          <h3>Distribuição de Lucros vs. Perdas (BTC)</h3>
          <canvas id="profitDistributionChart"></canvas>
        </div>

        <script>
          const darkMode = ${pdfDarkMode};
          const chartTextColor = '${textColor}';
          const chartGridColor = '${gridColor}';
          const chartTooltipBackgroundColor = '${tooltipBackgroundColor}';
          const chartTooltipTitleColor = '${tooltipTitleColor}';
          const chartTooltipBodyColor = '${tooltipBodyColor}';

          const chartLabels = ${JSON.stringify(chartLabels)};
          const investmentValues = ${JSON.stringify(investmentValues)};
          const netProfitValues = ${JSON.stringify(netProfitValues)};
          const balanceEvolutionValues = ${JSON.stringify(balanceEvolutionValues)};
          const profitDistributionData = ${JSON.stringify(profitDistributionData)};
          const profitDistributionLabels = ${JSON.stringify(profitDistributionLabels)};
          const dynamicPieColors = ${JSON.stringify(dynamicProfitDistributionColors)};

          // Gráfico de Desempenho Mensal (Investimentos vs Lucro Líquido)
          if (document.getElementById('monthlyPerformanceChart')) {
            new Chart(document.getElementById('monthlyPerformanceChart').getContext('2d'), {
              type: 'bar',
              data: {
                labels: chartLabels,
                datasets: [
                  {
                    label: 'Total Investimentos (BTC)',
                    data: investmentValues,
                    backgroundColor: darkMode ? 'rgba(94, 169, 255, 0.7)' : 'rgba(54, 162, 235, 0.7)', // Azul
                    borderColor: darkMode ? 'rgba(94, 169, 255, 1)' : 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                  },
                  {
                    label: 'Lucro Líquido (BTC)',
                    data: netProfitValues,
                    backgroundColor: darkMode ? 'rgba(52, 211, 153, 0.7)' : 'rgba(75, 192, 192, 0.7)', // Verde/Ciano
                    borderColor: darkMode ? 'rgba(52, 211, 153, 1)' : 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                  }
                ]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { color: chartTextColor },
                    grid: { color: chartGridColor }
                  },
                  x: {
                    ticks: { color: chartTextColor },
                    grid: { color: chartGridColor }
                  }
                },
                plugins: {
                  legend: { labels: { color: chartTextColor } },
                  tooltip: {
                    backgroundColor: chartTooltipBackgroundColor,
                    titleColor: chartTooltipTitleColor,
                    bodyColor: chartTooltipBodyColor,
                    borderColor: chartGridColor,
                    borderWidth: 1
                  }
                }
              }
            });
          }

          // Gráfico de Evolução do Saldo
          if (document.getElementById('balanceEvolutionChart')) {
            new Chart(document.getElementById('balanceEvolutionChart').getContext('2d'), {
              type: 'line',
              data: {
                labels: chartLabels,
                datasets: [{
                  label: 'Saldo Acumulado (BTC)',
                  data: balanceEvolutionValues,
                  borderColor: darkMode ? 'rgba(247, 147, 26, 1)' : 'rgba(255, 159, 64, 1)', // Laranja (cor do Bitcoin)
                  backgroundColor: darkMode ? 'rgba(247, 147, 26, 0.5)' : 'rgba(255, 159, 64, 0.5)',
                  fill: true,
                  tension: 0.1
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: false, // Saldo pode começar negativo ou variar muito
                    ticks: { color: chartTextColor },
                    grid: { color: chartGridColor }
                  },
                  x: {
                    ticks: { color: chartTextColor },
                    grid: { color: chartGridColor }
                  }
                },
                plugins: {
                  legend: { labels: { color: chartTextColor } },
                  tooltip: {
                    backgroundColor: chartTooltipBackgroundColor,
                    titleColor: chartTooltipTitleColor,
                    bodyColor: chartTooltipBodyColor,
                    borderColor: chartGridColor,
                    borderWidth: 1
                  }
                }
              }
            });
          }

          // Gráfico de Pizza - Distribuição de Lucros vs Perdas
          if (document.getElementById('profitDistributionChart')) {
            new Chart(document.getElementById('profitDistributionChart').getContext('2d'), {
              type: 'pie',
              data: {
                labels: profitDistributionLabels,
                datasets: [{
                  label: 'Distribuição (BTC)', // Label do dataset
                  data: profitDistributionData,
                  backgroundColor: dynamicPieColors,
                  hoverOffset: 4
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                    labels: { color: chartTextColor }
                  },
                  tooltip: {
                    backgroundColor: chartTooltipBackgroundColor,
                    titleColor: chartTooltipTitleColor,
                    bodyColor: chartTooltipBodyColor,
                    borderColor: chartGridColor,
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += context.parsed.toFixed(8) + ' BTC';
                            }
                            return label;
                        }
                    }
                  }
                }
              }
            });
          }
        </script>
      </div>
    `;
  } else if (options.includeCharts) {
    html += `
      <div class="section charts-section">
        <h2>Visualização Gráfica</h2>
        <p class="no-data">Não há dados suficientes para gerar gráficos para o período selecionado.</p>
      </div>
    `;
  }

  html += `
      </div> <!-- .container -->
    </body>
    </html>
  `;
  return html;
};

export async function POST(req: NextRequest) {
  console.log("API /api/export/pdf chamada");
  try {
    const payload = await req.json() as Payload;
    console.log("Payload recebido:", payload ? Object.keys(payload) : 'null');

    if (!payload || !payload.options) {
      return NextResponse.json({ message: 'Payload inválido ou opções ausentes.' }, { status: 400 });
    }

    // 1. Gerar o HTML do relatório
    const htmlContent = generateReportHTML(payload);
    // console.log("HTML Gerado:", htmlContent.substring(0, 500)); // Log para depuração

    // 2. Lançar o Puppeteer e gerar o PDF
    // Para Vercel, é recomendado usar chrome-aws-lambda
    // Exemplo: (requer instalação de chrome-aws-lambda e puppeteer-core)
    // const puppeteerCore = require('puppeteer-core'); // Removido
    // const chromium = require('chrome-aws-lambda'); // Removido

    // Configuração para @sparticuz/chromium
    // As opções podem precisar de ajuste fino com base na documentação do @sparticuz/chromium
    // mas geralmente são muito similares.
    const executablePath = process.env.NODE_ENV === 'production'
      ? await chromium.executablePath()
      : undefined; // Usar o executável padrão em desenvolvimento, ou especificar um local se necessário

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless === 'new' ? 'new' : true, // Adaptar para o novo modo headless se suportado/preferido
      ignoreHTTPSErrors: true,
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' }); // Esperar que tudo carregue, incluindo Chart.js
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true, // Importante para estilos e cores de fundo
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });
    await browser.close();

    // 3. Retornar o PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${payload.reportName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.pdf"`,
      },
    });

  } catch (error) {
    console.error("Erro na API de exportação PDF:", error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor ao gerar PDF.';
    return NextResponse.json({ message: errorMessage, details: error instanceof Error ? error.stack : null }, { status: 500 });
  }
} 