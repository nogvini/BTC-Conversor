import { NextRequest, NextResponse } from 'next/server';
import { createLNMarketsClient } from '@/lib/ln-markets-api';

export async function POST(request: NextRequest) {
  try {
    console.log('[API /api/ln-markets/deposits] Iniciando requisição');
    
    const body = await request.json();
    const { credentials } = body;

    console.log('[API /api/ln-markets/deposits] Dados recebidos:', {
      hasCredentials: !!credentials,
      credentialsKeys: credentials ? Object.keys(credentials) : [],
      hasKey: !!credentials?.key,
      hasSecret: !!credentials?.secret,
      hasPassphrase: !!credentials?.passphrase,
      network: credentials?.network,
      isConfigured: credentials?.isConfigured
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
    
    // Buscar depósitos usando o método correto da biblioteca oficial
    console.log('[API /api/ln-markets/deposits] Buscando depósitos...');
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
      length: Array.isArray(result.data) ? result.data.length : 0
    });

    return NextResponse.json({
      success: true,
      data: result.data || [],
      hasData: !!(result.data && Array.isArray(result.data) && result.data.length > 0)
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