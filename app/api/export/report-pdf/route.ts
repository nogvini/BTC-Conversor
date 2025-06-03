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

// CORREÇÃO: Gerenciamento melhorado do navegador para evitar "Target closed"
// Não usar cache de navegador que pode causar problemas
let _browserPromise: Promise<any> | null = null;

// Função para obter uma instância do navegador com configurações robustas
async function getBrowser() {
  try {
    // Verificar o ambiente de execução
    const isVercel = process.env.VERCEL === '1';
    const isProduction = process.env.NODE_ENV === 'production';
    
    console.log(`[Browser] Ambiente: ${isVercel ? 'Vercel' : 'Local'}, Produção: ${isProduction}`);
    
    // Configurações otimizadas para evitar "Target closed"
    const browserArgs = [
      ...chromium.args,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-acceleration',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-images', // Acelerar carregamento
      '--disable-javascript', // Não precisamos de JS para PDF
      '--run-all-compositor-stages-before-draw',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-ipc-flooding-protection',
      '--memory-pressure-off'
    ];

    const browser = await puppeteer.launch({
      args: browserArgs,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
      ignoreDefaultArgs: ['--disable-extensions'],
      // CORREÇÃO: Configurações específicas para evitar "Target closed"
      handleSIGINT: false,
      handleSIGTERM: false,
      handleSIGHUP: false,
      dumpio: false, // Evitar logs desnecessários
      pipe: false,   // Usar websocket em vez de pipe
      timeout: 30000 // Timeout para launch
    });
    
    console.log('[Browser] Navegador inicializado com sucesso');
    return browser;
    
  } catch (error) {
    console.error('[Browser] Erro ao inicializar o navegador:', error);
    throw new Error(`Falha ao inicializar navegador: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
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
  let page = null;
  const startTime = Date.now();
  
  try {
    console.log('=== INICIANDO EXPORTAÇÃO PDF (VERSÃO ROBUSTA) ===');
    console.log(`[Timing] Início: ${new Date().toISOString()}`);
    
    // Parse e validação do corpo da requisição
    const body = await request.json().catch(e => {
      console.error('[Request] Erro ao fazer parse do corpo da requisição:', e);
      throw new Error('Corpo da requisição inválido ou malformado');
    });
    
    console.log('[Request] Dados recebidos na API:', {
      hasReport: !!body.report,
      displayCurrency: body.displayCurrency,
      hasCurrentRates: !!body.currentRates,
      chartsCount: body.capturedCharts?.length || 0
    });
    
    // Validação com schema Zod
    const parsedBody = exportRequestSchema.safeParse(body);
    if (!parsedBody.success) {
      console.error('[Validation] Validação de schema falhou:', parsedBody.error.errors);
      return NextResponse.json({ 
        error: 'Dados de requisição inválidos', 
        details: parsedBody.error.errors 
      }, { status: 400 });
    }

    const { report, displayCurrency, reportPeriodDescription, currentRates, capturedCharts } = parsedBody.data;
    
    console.log('[Validation] Dados validados:', {
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
    console.log('[Processing] === PROCESSANDO DADOS DO RELATÓRIO ===');
    
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

    console.log('[Processing] Dados processados com sucesso:', {
      reportName: processedData.reportName,
      totalInvestmentsBtc: processedData.totalInvestmentsBtc,
      totalProfitsBtc: processedData.totalProfitsBtc,
      roi: processedData.roi
    });

    // Gerar HTML do relatório
    console.log('[HTML] === GERANDO HTML DO RELATÓRIO ===');
    const htmlContent = generateSimpleReportHtml(processedData);

    if (!htmlContent || htmlContent.length < 100) {
      throw new Error('HTML do relatório não foi gerado corretamente');
    }

    console.log(`[HTML] HTML gerado com sucesso, tamanho: ${htmlContent.length} caracteres`);

    // CORREÇÃO: Gerar PDF usando Puppeteer com tratamento robusto
    console.log('[PDF] === GERANDO PDF ===');
    
    // Inicializar navegador
    browser = await getBrowser();
    
    if (!browser) {
      throw new Error('Falha ao inicializar o navegador');
    }
    
    console.log('[PDF] Navegador inicializado, criando página...');
    
    // Criar página com configurações otimizadas
    page = await browser.newPage();
    
    // CORREÇÃO: Configurar página para evitar problemas
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1 });
    
    // CORREÇÃO: Desabilitar recursos desnecessários
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'script'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    console.log('[PDF] Página configurada, carregando conteúdo HTML...');

    // CORREÇÃO: Configurar conteúdo com timeout adequado e aguardar carregamento
    await page.setContent(htmlContent, {
      waitUntil: ['domcontentloaded'],
      timeout: 30000, // Reduzido para 30 segundos
    });
    
    console.log('[PDF] Conteúdo carregado, aguardando estabilização...');
    
    // CORREÇÃO: Aguardar um pouco para garantir que tudo foi renderizado
    await page.waitForTimeout(2000);

    console.log('[PDF] Gerando buffer do PDF...');

    // CORREÇÃO: Gerar o PDF com configurações otimizadas e timeout
    const pdfBuffer = await Promise.race([
      page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: false,
        margin: {
          top: '1cm',
          right: '1cm',
          bottom: '1cm',
          left: '1cm',
        },
        displayHeaderFooter: false,
        timeout: 30000 // Timeout específico para PDF
      }),
      // CORREÇÃO: Timeout de segurança
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout na geração do PDF')), 35000)
      )
    ]) as Buffer;

    console.log('[PDF] Buffer do PDF gerado, fechando página...');

    // CORREÇÃO: Fechar página antes de verificar buffer
    if (page && !page.isClosed()) {
      await page.close();
      page = null;
    }

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Buffer do PDF está vazio');
    }

    const processingTime = Date.now() - startTime;
    console.log(`[Success] === PDF GERADO COM SUCESSO ===`);
    console.log(`[Success] Tamanho do PDF: ${pdfBuffer.length} bytes`);
    console.log(`[Success] Tempo de processamento: ${processingTime}ms`);

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
    const processingTime = Date.now() - startTime;
    console.error('[Error] === ERRO NA GERAÇÃO DO PDF ===');
    console.error('[Error] Erro detalhado:', error);
    console.error('[Error] Stack trace:', error instanceof Error ? error.stack : 'N/A');
    console.error(`[Error] Tempo até erro: ${processingTime}ms`);

    // CORREÇÃO: Detectar erros específicos do Puppeteer
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    const isProtocolError = errorMessage.includes('Protocol error') || errorMessage.includes('Target closed');
    const isTimeoutError = errorMessage.includes('timeout') || errorMessage.includes('Timeout');
    
    if (isProtocolError) {
      console.error('[Error] Erro de protocolo do Puppeteer detectado - possível problema de timing ou recursos');
    }
    
    if (isTimeoutError) {
      console.error('[Error] Erro de timeout detectado - processamento muito lento');
    }

    // Retornar erro detalhado mas seguro
    const isDevEnv = process.env.NODE_ENV === 'development';
    
    return NextResponse.json({
      error: 'Erro interno do servidor ao gerar PDF',
      details: errorMessage,
      type: isProtocolError ? 'protocol_error' : isTimeoutError ? 'timeout_error' : 'general_error',
      processingTime: `${processingTime}ms`,
      ...(isDevEnv && { stack: error instanceof Error ? error.stack : undefined })
    }, { status: 500 });

  } finally {
    const finalTime = Date.now() - startTime;
    console.log(`[Cleanup] Iniciando limpeza de recursos... (tempo total: ${finalTime}ms)`);
    
    // CORREÇÃO: Limpeza robusta de recursos
    try {
      // Fechar página se ainda estiver aberta
      if (page && !page.isClosed()) {
        console.log('[Cleanup] Fechando página...');
        await page.close();
      }
    } catch (pageError) {
      console.error('[Cleanup] Erro ao fechar página:', pageError);
    }
    
    try {
      // Fechar navegador se ainda estiver aberto
      if (browser) {
        console.log('[Cleanup] Fechando navegador...');
        await browser.close();
      }
    } catch (browserError) {
      console.error('[Cleanup] Erro ao fechar navegador:', browserError);
    }
    
    // Limpar cache do navegador
    _browserPromise = null;
    
    console.log(`[Cleanup] Limpeza concluída. Tempo total: ${finalTime}ms`);
  }
} 