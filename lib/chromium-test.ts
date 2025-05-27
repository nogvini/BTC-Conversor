/**
 * Teste da configuração do chromium para ambiente serverless
 * Este arquivo pode ser usado como referência para depurar problemas com o Puppeteer
 */

import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

/**
 * Inicia o navegador e retorna algumas informações úteis para diagnóstico
 */
export async function testChromiumSetup() {
  console.log('Iniciando teste do Chromium...');
  
  try {
    // Verificar ambiente
    const isVercel = process.env.VERCEL === '1';
    console.log(`Ambiente: ${isVercel ? 'Vercel' : 'Local'}`);
    
    // Verificar caminho do executável
    const execPath = await chromium.executablePath();
    console.log('Caminho do executável:', execPath);
    
    // Verificar argumentos
    console.log('Argumentos do Chromium:', chromium.args);
    
    // Iniciar navegador
    console.log('Tentando iniciar o navegador...');
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: execPath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
    
    // Verificar versão do navegador
    const version = await browser.version();
    console.log('Versão do navegador:', version);
    
    // Criar uma página
    const page = await browser.newPage();
    console.log('Página criada com sucesso');
    
    // Fechar recursos
    await page.close();
    await browser.close();
    
    return {
      success: true,
      executablePath: execPath,
      browserVersion: version,
      isVercel
    };
  } catch (error) {
    console.error('Erro durante o teste do Chromium:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      isVercel: process.env.VERCEL === '1'
    };
  }
} 