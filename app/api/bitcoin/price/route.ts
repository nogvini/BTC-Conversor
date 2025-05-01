import { NextResponse } from 'next/server';
import { updateCurrentPrice, forceUpdateAllData } from '@/lib/server-api';

// GET /api/bitcoin/price
export async function GET(request: Request) {
  try {
    // Verificar se estamos forçando atualização
    const url = new URL(request.url);
    const forceUpdate = url.searchParams.get('force') === 'true';
    
    console.log(`Rota de preço do Bitcoin chamada - forçar atualização: ${forceUpdate}`);
    
    if (forceUpdate) {
      // Forçar atualização de todos os dados
      console.log('Forçando atualização completa dos dados');
      const data = await forceUpdateAllData();
      
      // Retornar apenas os dados de preço
      return NextResponse.json(data.currentPrice, {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'X-Force-Update': 'true'
        }
      });
    } else {
      // Buscar apenas o preço atual
      const price = await updateCurrentPrice();
      
      // Retornar os dados como JSON
      return NextResponse.json(price, {
        headers: {
          'Cache-Control': 'public, max-age=30', // Cache por 30 segundos
          'X-Force-Update': 'false'
        }
      });
    }
  } catch (error) {
    console.error('Erro na rota de preço do Bitcoin:', error);
    return NextResponse.json(
      { error: 'Falha ao obter preço do Bitcoin' },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store'
        }
      }
    );
  }
} 