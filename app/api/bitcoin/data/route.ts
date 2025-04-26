import { NextResponse } from 'next/server';
import { fetchAllAppData } from '@/lib/server-api';

// GET /api/bitcoin/data
export async function GET() {
  try {
    // Buscar todos os dados necessários
    const data = await fetchAllAppData();
    
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