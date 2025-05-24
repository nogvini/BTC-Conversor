import { NextRequest, NextResponse } from 'next/server';
import { createLNMarketsClient } from '@/lib/ln-markets-api';
import type { LNMarketsCredentials } from '@/components/types/ln-markets-types';

export async function POST(request: NextRequest) {
  try {
    console.log('[API LN Markets Withdrawals] Requisição recebida');
    
    const body = await request.json();
    console.log('[API LN Markets Withdrawals] Body recebido:', {
      hasCredentials: !!body.credentials,
      credentialsKeys: body.credentials ? Object.keys(body.credentials) : []
    });
    
    const { credentials } = body;
    
    if (!credentials) {
      console.log('[API LN Markets Withdrawals] Erro: Credenciais não fornecidas');
      return NextResponse.json(
        { error: 'Credenciais LN Markets são obrigatórias' },
        { status: 400 }
      );
    }

    // Validar credenciais mais detalhadamente
    const missingFields = [];
    if (!credentials.key) missingFields.push('key');
    if (!credentials.secret) missingFields.push('secret');
    if (!credentials.passphrase) missingFields.push('passphrase');
    if (!credentials.network) missingFields.push('network');
    
    if (missingFields.length > 0) {
      console.log('[API LN Markets Withdrawals] Erro: Campos obrigatórios faltando:', missingFields);
      return NextResponse.json(
        { error: `Credenciais LN Markets incompletas. Campos faltando: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    const lnCredentials: LNMarketsCredentials = {
      key: credentials.key,
      secret: credentials.secret,
      passphrase: credentials.passphrase,
      network: credentials.network,
      isConfigured: true
    };

    console.log('[API LN Markets Withdrawals] Credenciais validadas:', {
      key: lnCredentials.key ? `${lnCredentials.key.substring(0, 8)}...` : 'N/A',
      network: lnCredentials.network,
      hasSecret: !!lnCredentials.secret,
      hasPassphrase: !!lnCredentials.passphrase
    });

    // Criar cliente LN Markets
    const client = createLNMarketsClient(lnCredentials);
    
    console.log('[API LN Markets Withdrawals] Cliente criado, fazendo requisição...');
    
    // Buscar saques
    const response = await client.getWithdrawals();
    
    console.log('[API LN Markets Withdrawals] Resposta recebida:', {
      success: response.success,
      hasData: !!response.data,
      dataLength: response.data ? (Array.isArray(response.data) ? response.data.length : 'não é array') : 0,
      error: response.error
    });
    
    if (response.success) {
      return NextResponse.json({
        success: true,
        data: response.data
      });
    } else {
      console.log('[API LN Markets Withdrawals] Erro da API LN Markets:', response.error);
      return NextResponse.json(
        { 
          success: false,
          error: response.error || 'Erro ao buscar saques da LN Markets'
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[API LN Markets Withdrawals] Erro crítico:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
} 