export const runtime = 'nodejs'; // Forçar o runtime Node.js para esta rota
export const maxDuration = 60; // Aumentar para 60 segundos para permitir o processamento

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
// Usar processamento simples
import { processSimpleReportData } from '@/lib/simple-report-processing';
import { generateSimpleReportHtml } from '@/lib/simple-html-template';
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
  // NOVO: Adicionar schema para gráficos capturados
  capturedCharts: z.array(z.object({
    id: z.string(),
    title: z.string(),
    dataUrl: z.string(),
    width: z.number(),
    height: z.number()
  })).optional()
});

export async function POST(request: NextRequest) {
  let browser = null;
  
  try {
    console.log('=== INICIANDO PROCESSAMENTO SIMPLES DE EXPORTAÇÃO PDF ===');
    
    const body = await request.json().catch(e => {
      console.error('Erro ao fazer parse do corpo da requisição:', e);
      return null;
    });
    
    if (!body) {
      return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 });
    }
    
    console.log('=== DADOS RECEBIDOS NA API (PROCESSAMENTO SIMPLES) ===');
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

    const { report: rawReport, displayCurrency, reportPeriodDescription: customPeriodDescription, currentRates, capturedCharts } = parsedBody.data;
    
    if (!rawReport) {
      return NextResponse.json({ error: 'Dados do relatório ausentes' }, { status: 400 });
    }
    
    const report = rawReport as any;

    if (!report.name) {
        return NextResponse.json({ error: 'Nome do relatório ausente' }, { status: 400 });
    }
    
    // Verificar se temos cotações atuais
    if (!currentRates || !currentRates.btcToUsd || !currentRates.brlToUsd) {
      return NextResponse.json({ 
        error: 'Cotações atuais necessárias para o processamento simples',
        details: 'btcToUsd e brlToUsd são obrigatórios'
      }, { status: 400 });
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
    
    console.log('=== PROCESSANDO DADOS COM LÓGICA SIMPLES ===');

    // Log dos gráficos recebidos
    if (capturedCharts && capturedCharts.length > 0) {
      console.log(`[PDF Export] ${capturedCharts.length} gráficos recebidos:`, 
        capturedCharts.map(chart => ({ id: chart.id, title: chart.title, dataSize: chart.dataUrl.length })));
    } else {
      console.log('[PDF Export] Nenhum gráfico recebido');
    }

    // USAR PROCESSAMENTO SIMPLES EM VEZ DO COMPLEXO
    const processedData = processSimpleReportData(
      report,
      displayCurrency,
      currentRates.btcToUsd,
      currentRates.brlToUsd,
      customPeriodDescription,
      capturedCharts
    );

    console.log('Dados processados:', {
      reportName: processedData.reportName,
      totalInvestmentsBtc: processedData.totalInvestmentsBtc,
      totalProfitsBtc: processedData.totalProfitsBtc,
      totalBalanceBtc: processedData.totalBalanceBtc,
      roi: processedData.roi,
      displayCurrency: processedData.displayCurrency
    });

    // Gerar HTML usando template simples
    console.log('=== GERANDO HTML COM TEMPLATE SIMPLES ===');
    const htmlContent = generateSimpleReportHtml(processedData);

    console.log('HTML gerado com sucesso, tamanho:', htmlContent.length, 'caracteres');

    // Gerar PDF
    console.log('=== INICIANDO GERAÇÃO DO PDF ===');
    browser = await getBrowser();
    const page = await browser.newPage();

    // Configurar a página
    await page.setContent(htmlContent, {
      waitUntil: ['domcontentloaded', 'networkidle0'],
      timeout: 30000,
    });

    // Gerar o PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm',
      },
    });

    await page.close();

    console.log('=== PDF GERADO COM SUCESSO ===');
    console.log('Tamanho do PDF:', pdfBuffer.length, 'bytes');

    // Retornar o PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="relatorio-${processedData.reportName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('=== ERRO NA GERAÇÃO DO PDF (PROCESSAMENTO SIMPLES) ===');
    console.error('Erro detalhado:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');

    return NextResponse.json({
      error: 'Erro interno do servidor ao gerar PDF',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });

  } finally {
    // Fechar o navegador se estiver aberto
    if (browser) {
      try {
        await browser.close();
        console.log('Navegador fechado com sucesso');
      } catch (closeError) {
        console.error('Erro ao fechar navegador:', closeError);
      }
    }
  }
} 