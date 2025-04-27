import { NextResponse } from 'next/server';
import { getHistoricalData, forceUpdateHistoricalData } from '@/lib/server-api';

// GET /api/bitcoin/historical?currency=usd&days=30&force=true
export async function GET(request: Request) {
  try {
    // Obter parâmetros da requisição
    const { searchParams } = new URL(request.url);
    const currency = searchParams.get('currency') || 'usd';
    const days = parseInt(searchParams.get('days') || '30', 10);
    const forceUpdate = searchParams.get('force') === 'true';
    
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
    const historicalData = forceUpdate 
      ? await forceUpdateHistoricalData(currency.toLowerCase(), days)
      : await getHistoricalData(currency.toLowerCase(), days);
    
    // Retornar os dados como JSON
    return NextResponse.json(historicalData);
  } catch (error) {
    console.error('Erro na rota de dados históricos do Bitcoin:', error);
    return NextResponse.json(
      { error: 'Falha ao obter dados históricos do Bitcoin' },
      { status: 500 }
    );
  }
} 