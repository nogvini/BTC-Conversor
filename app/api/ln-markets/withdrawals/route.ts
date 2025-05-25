import { NextRequest, NextResponse } from 'next/server';
import { createLNMarketsClient } from '@/lib/ln-markets-api';
import { getLNMarketsConfig, retrieveLNMarketsMultipleConfigs } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  try {
    console.log('[API /api/ln-markets/withdrawals] Iniciando requisição');
    
    const body = await request.json();
    const { userEmail, configId } = body;

    console.log('[API /api/ln-markets/withdrawals] Dados recebidos:', {
      userEmail: userEmail?.split('@')[0] + '@***',
      configId,
      hasUserEmail: !!userEmail,
      hasConfigId: !!configId,
      userEmailType: typeof userEmail,
      configIdType: typeof configId,
      userEmailLength: userEmail?.length,
      configIdLength: configId?.length
    });

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

    // DEBUG: Testar se a função retrieveLNMarketsMultipleConfigs funciona
    console.log('[API /api/ln-markets/withdrawals] Testando retrieveLNMarketsMultipleConfigs...');
    try {
      const allConfigs = retrieveLNMarketsMultipleConfigs(userEmail);
      console.log('[API /api/ln-markets/withdrawals] retrieveLNMarketsMultipleConfigs resultado:', {
        hasConfigs: !!allConfigs,
        configsCount: allConfigs?.configs?.length || 0,
        configIds: allConfigs?.configs?.map(c => ({ id: c.id, name: c.name, isActive: c.isActive })) || [],
        defaultConfigId: allConfigs?.defaultConfigId,
        searchingForId: configId,
        exactMatch: allConfigs?.configs?.find(c => c.id === configId)
      });
    } catch (retrieveError) {
      console.error('[API /api/ln-markets/withdrawals] Erro ao executar retrieveLNMarketsMultipleConfigs:', retrieveError);
    }

    // DEBUG: Testar se a função getLNMarketsConfig funciona
    console.log('[API /api/ln-markets/withdrawals] Testando getLNMarketsConfig...');
    try {
      const config = getLNMarketsConfig(userEmail, configId);
      
      console.log('[API /api/ln-markets/withdrawals] getLNMarketsConfig resultado:', {
        configFound: !!config,
        configId: config?.id,
        configName: config?.name,
        configIsActive: config?.isActive,
        hasCredentials: !!config?.credentials,
        configKeys: config ? Object.keys(config) : [],
        credentialsKeys: config?.credentials ? Object.keys(config.credentials) : []
      });
      
      if (!config) {
        console.error('[API /api/ln-markets/withdrawals] getLNMarketsConfig retornou null/undefined');
        
        // Tentar novamente com logs de debugging interno
        const debugConfig = getLNMarketsConfig(userEmail, configId);
        console.log('[API /api/ln-markets/withdrawals] Segunda tentativa getLNMarketsConfig:', debugConfig);
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Configuração LN Markets não encontrada',
            debug: {
              userEmail: userEmail?.split('@')[0] + '@***',
              configId,
              attemptedFunction: 'getLNMarketsConfig'
            }
          },
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

    } catch (getConfigError) {
      console.error('[API /api/ln-markets/withdrawals] Erro ao executar getLNMarketsConfig:', getConfigError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro interno ao buscar configuração: ' + getConfigError.message,
          debug: {
            userEmail: userEmail?.split('@')[0] + '@***',
            configId,
            errorMessage: getConfigError.message
          }
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('[API /api/ln-markets/withdrawals] Erro interno:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Erro interno do servidor',
        debug: {
          errorType: error.constructor.name,
          errorMessage: error.message,
          stack: error.stack?.split('\n').slice(0, 3)
        }
      },
      { status: 500 }
    );
  }
} 