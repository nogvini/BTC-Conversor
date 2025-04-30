import { NextResponse } from 'next/server';
import { getHistoricalData, forceUpdateHistoricalData } from '@/lib/server-api';

// Mapeamento de períodos para mais fácil identificação
const PERIOD_MAPPING = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365
};

// GET /api/bitcoin/historical?currency=usd&days=30&force=true&period=30d
export async function GET(request: Request) {
  try {
    // Obter parâmetros da requisição
    const { searchParams } = new URL(request.url);
    const currency = searchParams.get('currency') || 'usd';
    const periodParam = searchParams.get('period');
    let days = parseInt(searchParams.get('days') || '30', 10);
    const forceUpdate = searchParams.get('force') === 'true';
    
    // Se um período específico foi fornecido, converter para dias
    if (periodParam && PERIOD_MAPPING[periodParam as keyof typeof PERIOD_MAPPING]) {
      days = PERIOD_MAPPING[periodParam as keyof typeof PERIOD_MAPPING];
    }
    
    console.log(`API: Requisição de dados históricos - moeda: ${currency}, dias: ${days}${forceUpdate ? ', força atualização' : ''}`);
    
    // Validar parâmetros
    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'Parâmetro "days" inválido. Deve ser um número entre 1 e 365.' },
        { status: 400 }
      );
    }
    
    if (!['usd', 'brl'].includes(currency.toLowerCase())) {
      return NextResponse.json(
        { error: 'Parâmetro "currency" inválido. Deve ser "usd" ou "brl".' },
        { status: 400 }
      );
    }
    
    // Buscar dados históricos, com opção de forçar atualização
    const startTime = Date.now();
    let historicalData;
    
    try {
      historicalData = forceUpdate 
        ? await forceUpdateHistoricalData(currency.toLowerCase(), days)
        : await getHistoricalData(currency.toLowerCase(), days);
    } catch (error) {
      console.error('Erro ao obter dados históricos:', error);
      return NextResponse.json(
        { error: 'Não foi possível obter dados históricos do Bitcoin. Por favor, tente novamente mais tarde.' },
        { status: 503 }
      );
    }
    
    const endTime = Date.now();
    
    // Verificar se temos dados
    if (!historicalData || historicalData.length === 0) {
      return NextResponse.json(
        { error: 'Não há dados históricos disponíveis no momento. Por favor, tente novamente mais tarde.' },
        { status: 404 }
      );
    }
    
    // Verificar se estamos usando cache
    const isUsingCache = historicalData.some(item => item.isUsingCache);
    
    // Preparar os headers de resposta
    const headers = new Headers();
    headers.set('X-Data-Source', historicalData[0]?.source || 'tradingview');
    headers.set('X-Using-Cache', isUsingCache ? 'true' : 'false');
    headers.set('X-Response-Time', `${endTime - startTime}ms`);
    headers.set('X-Period', periodParam || `${days}d`);
    
    // Adicionar headers para cache do navegador
    // Permitir cache no navegador por até 5 minutos para reduzir requisições redundantes
    headers.set('Cache-Control', 'private, max-age=300');
    
    console.log(`API: Resposta enviada - fonte: ${historicalData[0]?.source || 'tradingview'}, cache: ${isUsingCache}, tempo: ${endTime - startTime}ms`);
    
    // Retornar os dados como JSON com os headers informativos
    return NextResponse.json(historicalData, {
      headers: Object.fromEntries(headers.entries())
    });
  } catch (error) {
    console.error('Erro na rota de dados históricos do Bitcoin:', error);
    return NextResponse.json(
      { error: 'Falha ao obter dados históricos do Bitcoin' },
      { status: 500 }
    );
  }
} 