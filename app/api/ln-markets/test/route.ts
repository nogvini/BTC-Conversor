import { NextRequest, NextResponse } from 'next/server';
import { createLNMarketsClient } from '@/lib/ln-markets-api';
import type { LNMarketsCredentials } from '@/components/types/ln-markets-types';

export async function POST(request: NextRequest) {
  try {
    console.log('[API /api/ln-markets/test] Iniciando teste de credenciais');
    
    const body = await request.json();
    const { credentials } = body;

    if (!credentials) {
      console.error('[API /api/ln-markets/test] Credenciais não fornecidas');
      return NextResponse.json(
        { success: false, error: 'Credenciais são obrigatórias' },
        { status: 400 }
      );
    }

    // Validar estrutura das credenciais
    if (!credentials.key || !credentials.secret || !credentials.passphrase || !credentials.network) {
      console.error('[API /api/ln-markets/test] Credenciais incompletas');
      return NextResponse.json(
        { success: false, error: 'Credenciais incompletas' },
        { status: 400 }
      );
    }

    console.log('[API /api/ln-markets/test] Testando credenciais...', {
      network: credentials.network,
      hasKey: !!credentials.key,
      hasSecret: !!credentials.secret,
      hasPassphrase: !!credentials.passphrase
    });

    // Criar cliente e testar conexão
    const client = createLNMarketsClient(credentials);
    const result = await client.testConnection();

    if (!result.success) {
      console.error('[API /api/ln-markets/test] Teste falhou:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error || 'Falha na conexão com LN Markets'
      });
    }

    console.log('[API /api/ln-markets/test] Teste bem-sucedido');
    return NextResponse.json({
      success: true,
      message: 'Credenciais válidas'
    });

  } catch (error: any) {
    console.error('[API /api/ln-markets/test] Erro interno:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
} 