export const runtime = 'nodejs'; // Forçar o runtime Node.js para esta rota
export const maxDuration = 60; // Aumentar para 60 segundos para permitir o processamento

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
// Usar processamento simples como principal
import { processSimpleReportData } from '@/lib/simple-report-processing';
import { generateSimpleReportHtml } from '@/lib/simple-html-template';
// REMOVIDO: Importações complexas não utilizadas que podem causar conflitos
// import { buildReportHtml } from '@/lib/html-template-builder';
// import { prepareReportFoundationData, calculateReportMetrics } from '@/lib/report-processing';
// import { ExportedReport, ReportMetadata, CalculatedReportData, OperationData } from '@/lib/export-types';

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

// Schema de validação melhorado
const exportRequestSchema = z.object({
  report: z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Nome do relatório é obrigatório"),
    investments: z.array(z.any()).default([]),
    profits: z.array(z.any()).default([]),
    withdrawals: z.array(z.any()).default([])
  }),
  displayCurrency: z.enum(['BRL', 'USD']),
  reportPeriodDescription: z.string().optional().default(''),
  // Cotações atuais obrigatórias
  currentRates: z.object({
    btcToUsd: z.number().positive("Cotação BTC->USD deve ser positiva"),
    brlToUsd: z.number().positive("Cotação BRL->USD deve ser positiva"), 
    timestamp: z.string()
  }),
  // Gráficos opcionais
  capturedCharts: z.array(z.object({
    id: z.string(),
    title: z.string(),
    dataUrl: z.string(),
    width: z.number(),
    height: z.number()
  })).optional().default([])
});

export async function POST(request: NextRequest) {
  let browser = null;
  
  try {
    console.log('=== INICIANDO EXPORTAÇÃO PDF (MELHORADA) ===');
    
    // Parse e validação do corpo da requisição
    const body = await request.json().catch(e => {
      console.error('Erro ao fazer parse do corpo da requisição:', e);
      throw new Error('Corpo da requisição inválido ou malformado');
    });
    
    console.log('Dados recebidos na API:', {
      hasReport: !!body.report,
      displayCurrency: body.displayCurrency,
      hasCurrentRates: !!body.currentRates,
      chartsCount: body.capturedCharts?.length || 0
    });
    
    // Validação com schema Zod
    const parsedBody = exportRequestSchema.safeParse(body);
    if (!parsedBody.success) {
      console.error('Validação de schema falhou:', parsedBody.error.errors);
      return NextResponse.json({ 
        error: 'Dados de requisição inválidos', 
        details: parsedBody.error.errors 
      }, { status: 400 });
    }

    const { report, displayCurrency, reportPeriodDescription, currentRates, capturedCharts } = parsedBody.data;
    
    console.log('Dados validados:', {
      reportName: report.name,
      investmentsCount: report.investments.length,
      profitsCount: report.profits.length,
      withdrawalsCount: report.withdrawals.length,
      displayCurrency,
      btcToUsd: currentRates.btcToUsd,
      brlToUsd: currentRates.brlToUsd,
      chartsCount: capturedCharts.length
    });

    // Processar dados do relatório usando lógica simples e robusta
    console.log('=== PROCESSANDO DADOS DO RELATÓRIO ===');
    
    const processedData = processSimpleReportData(
      report,
      displayCurrency,
      currentRates.btcToUsd,
      currentRates.brlToUsd,
      reportPeriodDescription,
      capturedCharts
    );

    if (!processedData || !processedData.reportName) {
      throw new Error('Falha no processamento dos dados do relatório');
    }

    console.log('Dados processados com sucesso:', {
      reportName: processedData.reportName,
      totalInvestmentsBtc: processedData.totalInvestmentsBtc,
      totalProfitsBtc: processedData.totalProfitsBtc,
      roi: processedData.roi
    });

    // Gerar HTML do relatório
    console.log('=== GERANDO HTML DO RELATÓRIO ===');
    const htmlContent = generateSimpleReportHtml(processedData);

    if (!htmlContent || htmlContent.length < 100) {
      throw new Error('HTML do relatório não foi gerado corretamente');
    }

    console.log(`HTML gerado com sucesso, tamanho: ${htmlContent.length} caracteres`);

    // Gerar PDF usando Puppeteer
    console.log('=== GERANDO PDF ===');
    browser = await getBrowser();
    
    if (!browser) {
      throw new Error('Falha ao inicializar o navegador');
    }
    
    const page = await browser.newPage();

    // Configurar a página com timeout adequado
    await page.setContent(htmlContent, {
      waitUntil: ['domcontentloaded', 'networkidle0'],
      timeout: 45000, // 45 segundos
    });

    // Gerar o PDF com configurações otimizadas
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      margin: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm',
      },
      // Adicionar metadados
      displayHeaderFooter: false,
    });

    await page.close();

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Buffer do PDF está vazio');
    }

    console.log(`=== PDF GERADO COM SUCESSO ===`);
    console.log(`Tamanho do PDF: ${pdfBuffer.length} bytes`);

    // Preparar nome do arquivo
    const sanitizedName = processedData.reportName.replace(/[^a-zA-Z0-9\-_]/g, '-');
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `relatorio-${sanitizedName}-${timestamp}.pdf`;

    // Retornar o PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    });

  } catch (error) {
    console.error('=== ERRO NA GERAÇÃO DO PDF ===');
    console.error('Erro detalhado:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');

    // Retornar erro detalhado mas seguro
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    const isDevEnv = process.env.NODE_ENV === 'development';
    
    return NextResponse.json({
      error: 'Erro interno do servidor ao gerar PDF',
      details: errorMessage,
      ...(isDevEnv && { stack: error instanceof Error ? error.stack : undefined })
    }, { status: 500 });

  } finally {
    // Sempre fechar o navegador
    if (browser) {
      try {
        await browser.close();
        console.log('Navegador fechado com sucesso');
      } catch (closeError) {
        console.error('Erro ao fechar navegador:', closeError);
      }
    }
    
    // Limpar cache do navegador se necessário
    if (_browserPromise) {
      _browserPromise = null;
    }
  }
} 