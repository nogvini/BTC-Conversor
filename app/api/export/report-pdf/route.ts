import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import ReactDOMServer from 'react-dom/server';
import puppeteer from 'puppeteer';
import ReportHtmlTemplate from '@/components/report-html-template';
import { prepareReportFoundationData, calculateReportMetrics } from '@/lib/report-processing';
import { ExportedReport, ReportMetadata, CalculatedReportData, OperationData } from '@/lib/export-types';
import MonthlyPLChart from '@/components/charts/monthly-pl-chart';
import React from 'react';
// import { Report } from '@/lib/calculator-types'; // Descomente e defina quando o tipo Report estiver claro

// TODO: Substituir z.any() por um schema Zod detalhado para o objeto Report 
// quando a estrutura de lib/calculator-types.ts -> Report estiver totalmente definida.
const exportRequestSchema = z.object({
  // report: ReportSchema, // Idealmente
  report: z.any(), 
  displayCurrency: z.enum(['BRL', 'USD']),
  reportPeriodDescription: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsedBody = exportRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsedBody.error.errors }, { status: 400 });
    }

    const { report: rawReport, displayCurrency, reportPeriodDescription: customPeriodDescription } = parsedBody.data;
    // Realizar um type cast aqui. O ideal é ter o ReportSchema validando a estrutura.
    const report = rawReport as any; // Substituir 'any' pelo tipo 'Report' importado

    if (!report || !report.name) {
        return NextResponse.json({ error: 'Report data or report name is missing' }, { status: 400 });
    }

    const foundationData = await prepareReportFoundationData(report);

    const reportName = report.name;
    const periodDescription = customPeriodDescription || `${foundationData.firstOperationDate} - ${foundationData.lastOperationDate}`;
    
    const calculatedMetricsInput = {
        enrichedOperations: foundationData.enrichedOperations,
        firstOperationDate: foundationData.firstOperationDate,
        lastOperationDate: foundationData.lastOperationDate,
        baseCurrency: 'BTC' as const, // Assumindo BTC como base, conforme implementações anteriores
        initialPortfolioBtc: report.initialInvestment?.btcAmount || 0,
        initialPortfolioCost: report.initialInvestment?.valueInFiat || 0, // Supondo que valueInFiat seja o custo na moeda de display original do aporte inicial
        targetCurrency: displayCurrency,
        quotations: foundationData.quotations,
        // Os campos abaixo não são esperados por calculateReportMetrics, mas sim pela ExportedReport
        // reportName: reportName,
        // reportPeriodDescription: periodDescription,
    };

    const calculatedReportData: CalculatedReportData = calculateReportMetrics(calculatedMetricsInput);

    // Gerar SVG do Gráfico de P/L Mensal
    let monthlyPLChartSvg: string | undefined = undefined;
    if (calculatedReportData.monthlyBreakdown && calculatedReportData.monthlyBreakdown.length > 0) {
      try {
        const chartWidth = 780;
        const chartHeight = 350;

        // Instanciação do componente de forma mais explícita para evitar erros de parsing
        const monthlyPLChartElement = React.createElement(MonthlyPLChart, {
          data: calculatedReportData.monthlyBreakdown,
          currency: displayCurrency,
          width: chartWidth,
          height: chartHeight,
        });
        
        monthlyPLChartSvg = ReactDOMServer.renderToStaticMarkup(monthlyPLChartElement);

      } catch (chartError) {
        console.error('Error generating Monthly P/L chart SVG:', chartError);
      }
    }

    const reportMetadata: ReportMetadata = {
      reportName: reportName,
      generatedAt: new Date().toISOString(),
      periodDescription: periodDescription,
      displayCurrency: displayCurrency,
    };

    const exportedReportData: ExportedReport = {
      metadata: reportMetadata,
      data: calculatedReportData,
      operations: foundationData.enrichedOperations as OperationData[],
      chartsSvg: {
        monthlyPL: monthlyPLChartSvg,
      },
    };

    // Usar React.createElement para renderizar ReportHtmlTemplate para string HTML
    const reportHtmlElement = React.createElement(ReportHtmlTemplate, { 
      reportData: exportedReportData 
    });
    const htmlString = ReactDOMServer.renderToStaticMarkup(reportHtmlElement);

    // Configure o Puppeteer para ambientes serverless se necessário (ex: Vercel)
    // Pode ser necessário usar chrome-aws-lambda ou puppeteer-core com um executável gerenciado.
    const browser = await puppeteer.launch({ 
        headless: 'new', 
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            // Abaixo são flags adicionais que podem ser necessárias em alguns ambientes Linux:
            // '--disable-dev-shm-usage',
            // '--disable-accelerated-2d-canvas',
            // '--no-first-run',
            // '--no-zygote',
            // '--single-process', // Isso não é recomendado para todas as situações
            // '--disable-gpu'
        ]
    });
    const page = await browser.newPage();
    
    // Para garantir que estilos (Tailwind ou inline) sejam aplicados e imagens carregadas (se houver)
    await page.setContent(htmlString, { waitUntil: 'networkidle0' }); 

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true, // Importante para que cores de fundo e imagens sejam impressas
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm',
      },
    });

    await browser.close();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${reportName.replace(/[^a-zA-Z0-9_\-\.]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error generating PDF report:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to generate PDF report', details: errorMessage }, { status: 500 });
  }
} 