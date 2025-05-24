import { NextRequest, NextResponse } from 'next/server';
import { createLNMarketsClient } from '@/lib/ln-markets-api';
import { getLNMarketsConfig } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  try {
    console.log('[API /api/ln-markets/deposits] Iniciando requisição');
    
    const body = await request.json();
    const { userEmail, configId } = body;

    if (!userEmail) {
      console.error('[API /api/ln-markets/deposits] Email do usuário não fornecido');
      return NextResponse.json(
        { success: false, error: 'Email do usuário é obrigatório' },
        { status: 400 }
      );
    }

    if (!configId) {
      console.error('[API /api/ln-markets/deposits] ID da configuração não fornecido');
      return NextResponse.json(
        { success: false, error: 'ID da configuração é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar configuração específica
    const config = getLNMarketsConfig(userEmail, configId);
    if (!config) {
      console.error('[API /api/ln-markets/deposits] Configuração não encontrada:', configId);
      return NextResponse.json(
        { success: false, error: 'Configuração LN Markets não encontrada' },
        { status: 404 }
      );
    }

    if (!config.isActive) {
      console.error('[API /api/ln-markets/deposits] Configuração inativa:', configId);
      return NextResponse.json(
        { success: false, error: 'Configuração está inativa' },
        { status: 400 }
      );
    }

    console.log('[API /api/ln-markets/deposits] Credenciais encontradas, criando cliente...');

    // Criar cliente LN Markets
    const client = createLNMarketsClient(config.credentials);
    
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