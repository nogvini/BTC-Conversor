import { NextRequest, NextResponse } from 'next/server';
import { createLNMarketsClient } from '@/lib/ln-markets-api';
import { getLNMarketsConfig } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  try {
    console.log('[API /api/ln-markets/withdrawals] Iniciando requisição');
    
    const body = await request.json();
    const { userEmail, configId } = body;

    if (!userEmail) {
      console.error('[API /api/ln-markets/withdrawals] Email do usuário não fornecido');
      return NextResponse.json(
        { success: false, error: 'Email do usuário é obrigatório' },
        { status: 400 }
      );
    }

    if (!configId) {
      console.error('[API /api/ln-markets/withdrawals] ID da configuração não fornecido');
      return NextResponse.json(
        { success: false, error: 'ID da configuração é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar configuração específica
    const config = getLNMarketsConfig(userEmail, configId);
    if (!config) {
      console.error('[API /api/ln-markets/withdrawals] Configuração não encontrada:', configId);
      return NextResponse.json(
        { success: false, error: 'Configuração LN Markets não encontrada' },
        { status: 404 }
      );
    }

    if (!config.isActive) {
      console.error('[API /api/ln-markets/withdrawals] Configuração inativa:', configId);
      return NextResponse.json(
        { success: false, error: 'Configuração está inativa' },
        { status: 400 }
      );
    }

    console.log('[API /api/ln-markets/withdrawals] Credenciais encontradas, criando cliente...');

    // Criar cliente LN Markets
    const client = createLNMarketsClient(config.credentials);
    
    // Buscar saques usando o método correto da biblioteca oficial
    console.log('[API /api/ln-markets/withdrawals] Buscando saques...');
    const result = await client.getWithdrawals();

    if (!result.success) {
      console.error('[API /api/ln-markets/withdrawals] Erro na API LN Markets:', result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    console.log('[API /api/ln-markets/withdrawals] Saques obtidos com sucesso:', {
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
    console.error('[API /api/ln-markets/withdrawals] Erro interno:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
} 