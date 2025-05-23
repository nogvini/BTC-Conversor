import { NextRequest, NextResponse } from 'next/server';
import { createLNMarketsClient } from '@/lib/ln-markets-api';
import type { LNMarketsCredentials } from '@/components/types/ln-markets-types';

export async function POST(request: NextRequest) {
  try {
    const { credentials } = await request.json();
    
    if (!credentials) {
      return NextResponse.json(
        { error: 'Credenciais LN Markets são obrigatórias' },
        { status: 400 }
      );
    }

    // Validar credenciais
    if (!credentials.apiKey || !credentials.secret || !credentials.passphrase) {
      return NextResponse.json(
        { error: 'Credenciais LN Markets incompletas' },
        { status: 400 }
      );
    }

    const lnCredentials: LNMarketsCredentials = {
      ...credentials,
      isConfigured: true
    };

    // Criar cliente LN Markets
    const client = createLNMarketsClient(lnCredentials);
    
    // Buscar trades
    const response = await client.getTrades();
    
    if (response.success) {
      return NextResponse.json({
        success: true,
        data: response.data
      });
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: response.error || 'Erro ao buscar trades da LN Markets'
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[API LN Markets Trades] Erro:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
} 