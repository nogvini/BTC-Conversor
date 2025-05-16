import { NextResponse } from 'next/server';
import { fetchAllAppData, forceUpdateAllData } from '@/lib/server-api';
import { ApiError, RateLimitError, ExternalApiError } from '@/lib/errors';

// GET /api/bitcoin/data
export async function GET(request: Request) {
  try {
    // Verificar se devemos forçar a atualização (ignorar cache)
    const url = new URL(request.url);
    const forceUpdate = url.searchParams.get('force') === 'true';
    
    // Buscar dados, com ou sem cache dependendo do parâmetro force
    const data = forceUpdate 
      ? await forceUpdateAllData() 
      : await fetchAllAppData();
    
    // Retornar os dados como JSON
    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro na rota GET /api/bitcoin/data:', error);

    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: error.message, details: 'API externa atingiu o limite de taxa.' },
        { status: error.status }
      );
    }
    if (error instanceof ExternalApiError) {
      return NextResponse.json(
        { error: error.message, details: 'Falha ao comunicar com API externa.' },
        { status: error.status }
      );
    }
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    
    // Erro genérico não previsto
    return NextResponse.json(
      { error: 'Falha interna ao obter dados do Bitcoin' },
      { status: 500 }
    );
  }
} 