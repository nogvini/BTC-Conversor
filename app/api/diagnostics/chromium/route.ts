export const runtime = 'nodejs';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { testChromiumSetup } from '@/lib/chromium-test';

/**
 * API para diagnóstico do Chromium
 * Use esta rota para verificar se o Chromium está configurado corretamente
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Iniciando diagnóstico do Chromium');
    
    // Verificar ambiente
    const isVercel = process.env.VERCEL === '1';
    const nodeEnv = process.env.NODE_ENV;
    const vercelEnv = process.env.VERCEL_ENV;
    
    console.log(`Ambiente: ${isVercel ? 'Vercel' : 'Local'}, NODE_ENV: ${nodeEnv}, VERCEL_ENV: ${vercelEnv}`);
    
    // Executar teste do Chromium
    const result = await testChromiumSetup();
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: {
        isVercel,
        nodeEnv,
        vercelEnv
      },
      chromiumTest: result,
    }, { status: result.success ? 200 : 500 });
    
  } catch (error) {
    console.error('Erro no diagnóstico do Chromium:', error);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 