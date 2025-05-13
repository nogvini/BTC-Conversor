export const runtime = 'nodejs'; // Forçar o runtime Node.js para esta rota

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
// import ReactDOMServer from 'react-dom/server'; // Removido
import puppeteer from 'puppeteer';
// Removidas importações de React e componentes de UI para o template principal
// import ReportHtmlTemplate from '@/components/report-html-template'; 
// import MonthlyPLChart from '@/components/charts/monthly-pl-chart';
// import React from 'react'; 
// import { renderComponentToStaticMarkup } from '@/lib/server-render-utils';
import { buildReportHtml } from '@/lib/html-template-builder'; // Adicionado
import { prepareReportFoundationData, calculateReportMetrics } from '@/lib/report-processing';
import { ExportedReport, ReportMetadata, CalculatedReportData, OperationData } from '@/lib/export-types';
// import { Report } from '@/lib/calculator-types';

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

    // Etapa 1: Preparar dados base (enriquecer operações, buscar cotações)
    // A função prepareReportFoundationData já foi fornecida e deve ser mantida.
    const foundationData = await prepareReportFoundationData(report);
    // console.log('Foundation Data:', foundationData);

    // Etapa 2: Calcular métricas financeiras
    // A função calculateReportMetrics já foi fornecida e deve ser mantida.
    const calculatedMetricsInput = {
        enrichedOperations: foundationData.enrichedOperations,
        historicalQuotesUSD: foundationData.historicalQuotesUSD,
        historicalQuotesBRL: foundationData.historicalQuotesBRL,
        reportDateRange: foundationData.reportDateRange,
        reportName: report.name, 
        reportPeriodDescription: customPeriodDescription || `${foundationData.reportDateRange?.minDate} - ${foundationData.reportDateRange?.maxDate}`,
        displayCurrency: displayCurrency,
    };
    const calculatedReportData: CalculatedReportData = calculateReportMetrics(calculatedMetricsInput);
    // console.log('Calculated Report Data:', calculatedReportData);

    // Etapa 3: Montar o objeto ExportedReport
    const reportMetadata: ReportMetadata = {
      reportName: report.name,
      generatedAt: new Date().toISOString(), // Corrigido para metadata
      periodDescription: calculatedMetricsInput.reportPeriodDescription, // Corrigido para metadata
      displayCurrency: displayCurrency, // Corrigido para metadata
    };

    const exportedReportData: ExportedReport = {
      metadata: reportMetadata,
      data: calculatedReportData,
      operations: foundationData.enrichedOperations as OperationData[],
      chartsSvg: { // Gráfico omitido por enquanto
        // monthlyPL: undefined, 
      },
    };
    // console.log('Exported Report Data for HTML builder:', exportedReportData);

    // Etapa 4: Gerar HTML usando o construtor manual
    const htmlString = buildReportHtml(exportedReportData);
    // console.log('Generated HTML String:', htmlString.substring(0, 500)); // Logar início do HTML

    // Etapa 5: Gerar PDF com Puppeteer (lógica existente mantida)
    const browser = await puppeteer.launch({ 
        headless: 'new', 
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // Adicionado para ambientes restritos
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            // '--single-process', // Comentado, geralmente não necessário e pode impactar performance
            '--disable-gpu' // Adicionado para ambientes server/CI
        ]
    });
    const page = await browser.newPage();
    await page.setContent(htmlString, { waitUntil: 'networkidle0' }); 
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
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
        'Content-Disposition': `attachment; filename="${report.name.replace(/[^a-zA-Z0-9_\-\.]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error generating PDF report:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to generate PDF report', details: errorMessage }, { status: 500 });
  }
} 