import { NextRequest, NextResponse } from 'next/server';
import { createLNMarketsClient } from '@/lib/ln-markets-api';

export async function POST(request: NextRequest) {
  try {
    console.log('[API /api/ln-markets/deposits] Iniciando requisição');
    
    const body = await request.json();
    const { credentials, debug } = body;

    console.log('[API /api/ln-markets/deposits] Dados recebidos:', {
      hasCredentials: !!credentials,
      credentialsKeys: credentials ? Object.keys(credentials) : [],
      hasKey: !!credentials?.key,
      hasSecret: !!credentials?.secret,
      hasPassphrase: !!credentials?.passphrase,
      network: credentials?.network,
      isConfigured: credentials?.isConfigured,
      debugMode: !!debug
    });

    if (!credentials) {
      console.error('[API /api/ln-markets/deposits] Credenciais não fornecidas');
      return NextResponse.json(
        { success: false, error: 'Credenciais LN Markets são obrigatórias' },
        { status: 400 }
      );
    }

    // Validar credenciais
    if (!credentials.key || !credentials.secret || !credentials.passphrase || !credentials.network) {
      console.error('[API /api/ln-markets/deposits] Credenciais incompletas');
      return NextResponse.json(
        { success: false, error: 'Credenciais LN Markets incompletas' },
        { status: 400 }
      );
    }

    if (!credentials.isConfigured) {
      console.error('[API /api/ln-markets/deposits] Credenciais não configuradas');
      return NextResponse.json(
        { success: false, error: 'Credenciais LN Markets não estão configuradas' },
        { status: 400 }
      );
    }

    console.log('[API /api/ln-markets/deposits] Credenciais validadas, criando cliente...');

    // Criar cliente LN Markets
    const client = createLNMarketsClient(credentials);
    
    // MODO DEBUG: Investigar endpoints e métodos
    if (debug) {
      console.log('[API /api/ln-markets/deposits] 🔬 EXECUTANDO MODO DEBUG - INVESTIGAÇÃO DE DEPÓSITOS PERDIDOS');
      const debugResult = await client.debugDepositEndpoints();
      
      return NextResponse.json({
        success: true,
        debug: true,
        data: debugResult.data || [],
        debugResults: debugResult,
        message: 'Investigação de debug concluída - verifique os logs do console'
      });
    }
    
    // Buscar depósitos usando a busca super intensificada
    console.log('[API /api/ln-markets/deposits] Buscando depósitos com busca super intensificada...');
    const result = await client.getDeposits();

    if (!result.success) {
      console.error('[API /api/ln-markets/deposits] Erro na API LN Markets:', result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    console.log('[API /api/ln-markets/deposits] Depósitos obtidos com sucesso:', {
      hasData: !!result.data,
      isArray: Array.isArray(result.data),
      length: Array.isArray(result.data) ? result.data.length : 0,
      firstDeposit: Array.isArray(result.data) && result.data.length > 0 ? result.data[0] : null,
      lastDeposit: Array.isArray(result.data) && result.data.length > 0 ? result.data[result.data.length - 1] : null,
      allStatuses: Array.isArray(result.data) ? result.data.map(d => d.status) : [],
      statusDistribution: Array.isArray(result.data) ? 
        result.data.reduce((acc, d) => {
          acc[d.status] = (acc[d.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) : {}
    });

    return NextResponse.json({
      success: true,
      data: result.data || [],
      hasData: !!(result.data && Array.isArray(result.data) && result.data.length > 0),
      superIntensiveSearch: true,
      message: `Busca super intensificada concluída: ${Array.isArray(result.data) ? result.data.length : 0} depósitos encontrados`
    });

  } catch (error: any) {
    console.error('[API /api/ln-markets/deposits] Erro interno:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
} 