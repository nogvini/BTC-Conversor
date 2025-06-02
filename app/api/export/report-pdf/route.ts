export const runtime = 'nodejs'; // Forçar o runtime Node.js para esta rota
export const maxDuration = 60; // Aumentar para 60 segundos para permitir o processamento

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
// import ReactDOMServer from 'react-dom/server'; // Removido
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
// Removidas importações de React e componentes de UI para o template principal
// import ReportHtmlTemplate from '@/components/report-html-template'; 
// import MonthlyPLChart from '@/components/charts/monthly-pl-chart';
// import React from 'react'; 
// import { renderComponentToStaticMarkup } from '@/lib/server-render-utils';
import { buildReportHtml } from '@/lib/html-template-builder'; // Adicionado
import { prepareReportFoundationData, calculateReportMetrics } from '@/lib/report-processing';
import { ExportedReport, ReportMetadata, CalculatedReportData, OperationData } from '@/lib/export-types';
// import { Report } from '@/lib/calculator-types';

// Usar o Chromium otimizado para Vercel e similares
let _browserPromise: Promise<any> | null = null;

// Função para obter uma instância do navegador
async function getBrowser() {
  if (!_browserPromise) {
    _browserPromise = (async () => {
      // Verificar o ambiente de execução
      const isVercel = process.env.VERCEL === '1';
      console.log(`Ambiente detectado: ${isVercel ? 'Vercel' : 'Local'}`);
      
      try {
        // Configuração otimizada para ambiente serverless
        return puppeteer.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
        });
      } catch (error) {
        console.error('Erro ao inicializar o navegador:', error);
        throw error;
      }
    })();
  }
  return _browserPromise;
}

// TODO: Substituir z.any() por um schema Zod detalhado para o objeto Report 
// quando a estrutura de lib/calculator-types.ts -> Report estiver totalmente definida.
const exportRequestSchema = z.object({
  // report: ReportSchema, // Idealmente
  report: z.any(), 
  displayCurrency: z.enum(['BRL', 'USD']),
  reportPeriodDescription: z.string().optional(),
  // NOVO: Adicionar schema para cotações atuais
  currentRates: z.object({
    btcToUsd: z.number().positive(),
    brlToUsd: z.number().positive(),
    timestamp: z.string()
  }).optional(),
});

export async function POST(request: NextRequest) {
  let browser = null;
  
  try {
    console.log('Iniciando processamento de exportação PDF');
    
    const body = await request.json().catch(e => {
      console.error('Erro ao fazer parse do corpo da requisição:', e);
      return null;
    });
    
    if (!body) {
      return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 });
    }
    
    console.log('=== DADOS RECEBIDOS NA API ===');
    console.log('Estrutura do body:', {
      hasReport: !!body.report,
      displayCurrency: body.displayCurrency,
      reportPeriodDescription: body.reportPeriodDescription,
      hasCurrentRates: !!body.currentRates
    });
    
    if (body.currentRates) {
      console.log('Cotações atuais recebidas:', {
        btcToUsd: body.currentRates.btcToUsd,
        brlToUsd: body.currentRates.brlToUsd,
        timestamp: body.currentRates.timestamp
      });
    }
    
    if (body.report) {
      console.log('Detalhes do relatório recebido:', {
        id: body.report.id,
        name: body.report.name,
        investmentsCount: body.report.investments?.length || 0,
        profitsCount: body.report.profits?.length || 0,
        withdrawalsCount: body.report.withdrawals?.length || 0
      });
      
      if (body.report.investments?.length) {
        console.log('Primeiros 2 investimentos da API:', body.report.investments.slice(0, 2));
      }
      if (body.report.profits?.length) {
        console.log('Primeiros 2 lucros da API:', body.report.profits.slice(0, 2));
      }
    }
    
    const parsedBody = exportRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      console.error('Validação de schema falhou:', parsedBody.error.errors);
      return NextResponse.json({ error: 'Dados de requisição inválidos', details: parsedBody.error.errors }, { status: 400 });
    }

    const { report: rawReport, displayCurrency, reportPeriodDescription: customPeriodDescription, currentRates } = parsedBody.data;
    
    if (!rawReport) {
      return NextResponse.json({ error: 'Dados do relatório ausentes' }, { status: 400 });
    }
    
    const report = rawReport as any;

    if (!report.name) {
        return NextResponse.json({ error: 'Nome do relatório ausente' }, { status: 400 });
    }
    
    // Garantir que o relatório tenha as propriedades obrigatórias
    if (!Array.isArray(report.investments)) {
      console.warn('Array de investimentos ausente ou inválido, usando array vazio');
      report.investments = [];
    }
    
    if (!Array.isArray(report.profits)) {
      console.warn('Array de lucros ausente ou inválido, usando array vazio');
      report.profits = [];
    }
    
    if (!Array.isArray(report.withdrawals)) {
      console.warn('Array de saques ausente ou inválido, usando array vazio');
      report.withdrawals = [];
    }
    
    console.log('Estrutura do relatório validada, preparando dados de fundação...');

    // CORREÇÃO CRÍTICA: Passar as cotações atuais para prepareReportFoundationData
    const foundationData = await prepareReportFoundationData(report, currentRates).catch(e => {
      console.error('Erro ao preparar dados de fundação:', e);
      return null;
    });
    
    if (!foundationData) {
      return NextResponse.json({ error: 'Falha ao preparar dados base do relatório' }, { status: 500 });
    }

    const enrichedOperations = foundationData.enrichedOperations || [];
    const historicalQuotesUSD = foundationData.historicalQuotesUSD || new Map();
    const historicalQuotesBRL = foundationData.historicalQuotesBRL || new Map();
    const reportDateRange = foundationData.reportDateRange || { 
      minDate: new Date().toISOString().split('T')[0], 
      maxDate: new Date().toISOString().split('T')[0] 
    };

    console.log('Dados de fundação processados, calculando métricas...');

    // Etapa 2: Calcular métricas financeiras
    const calculatedMetricsInput = {
        enrichedOperations,
        historicalQuotesUSD,
        historicalQuotesBRL,
        reportDateRange,
        reportName: report.name, 
        reportPeriodDescription: customPeriodDescription || `${reportDateRange?.minDate} - ${reportDateRange?.maxDate}`,
        displayCurrency: displayCurrency,
    };
    
    const calculatedReportData: CalculatedReportData = calculateReportMetrics(calculatedMetricsInput);

    console.log('Métricas calculadas, construindo objeto de relatório exportado...');

    // Etapa 3: Montar o objeto ExportedReport
    const reportMetadata: ReportMetadata = {
      reportName: report.name,
      generatedAt: new Date().toISOString(),
      periodDescription: calculatedMetricsInput.reportPeriodDescription,
      displayCurrency: displayCurrency,
    };

    const exportedReportData: ExportedReport = {
      metadata: reportMetadata,
      data: calculatedReportData,
      operations: enrichedOperations as OperationData[],
      chartsSvg: {},
    };

    console.log('Objeto de relatório exportado construído, gerando HTML...');

    // Etapa 4: Gerar HTML
    const htmlString = buildReportHtml(exportedReportData);
    
    if (!htmlString || htmlString.length < 100) {
      console.error('HTML gerado inválido ou muito curto');
      return NextResponse.json({ error: 'Falha ao gerar HTML do relatório' }, { status: 500 });
    }

    console.log('HTML gerado com sucesso, iniciando Puppeteer...');

    // Etapa 5: Gerar PDF com Puppeteer
    try {
      browser = await getBrowser();
      console.log('Browser iniciado, criando nova página...');
      
      const page = await browser.newPage();
      console.log('Página criada, configurando conteúdo...');
      
      await page.setContent(htmlString, { 
        waitUntil: 'networkidle0',
        timeout: 30000 // 30 segundos de timeout
      });
      
      console.log('Conteúdo carregado na página, gerando PDF...');
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
        timeout: 30000 // 30 segundos de timeout
      });
      
      console.log('PDF gerado com sucesso, tamanho:', pdfBuffer.length, 'bytes');
      
      await page.close();
      
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${report.name.replace(/[^a-zA-Z0-9_\-\.]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`,
        },
      });
    } catch (browserError) {
      console.error('Erro ao processar com Puppeteer:', browserError);
      
      // Resetar a promessa do browser para forçar nova instância na próxima chamada
      _browserPromise = null;
      
      throw browserError; // Relançar para tratamento no catch externo
    }

  } catch (error) {
    console.error('Erro fatal ao gerar relatório PDF:', error);
    
    // Garantir que a página seja fechada em caso de erro
    if (browser) {
      try {
        const pages = await browser.pages();
        await Promise.all(pages.map(page => page.close()));
      } catch (closeError) {
        console.error('Erro ao fechar páginas do browser:', closeError);
      }
    }
    
    // Resetar a promessa do browser para forçar nova instância na próxima chamada
    _browserPromise = null;
    
    const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido';
    const errorStack = error instanceof Error ? error.stack : 'Stack não disponível';
    
    return NextResponse.json({ 
      error: 'Falha ao gerar relatório PDF', 
      details: errorMessage,
      stack: errorStack
    }, { status: 500 });
  }
} 