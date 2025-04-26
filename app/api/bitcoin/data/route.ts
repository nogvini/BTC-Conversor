import { NextResponse } from 'next/server';
import { fetchAllAppData, forceUpdateAllData } from '@/lib/server-api';

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
    console.error('Erro na rota de dados do Bitcoin:', error);
    return NextResponse.json(
      { error: 'Falha ao obter dados do Bitcoin' },
      { status: 500 }
    );
  }
} 