import { NextResponse } from 'next/server';
import { updateCurrentPrice } from '@/lib/server-api';

// GET /api/bitcoin/price
export async function GET() {
  try {
    // Buscar apenas o preço atual
    const price = await updateCurrentPrice();
    
    // Retornar os dados como JSON
    return NextResponse.json(price);
  } catch (error) {
    console.error('Erro na rota de preço do Bitcoin:', error);
    return NextResponse.json(
      { error: 'Falha ao obter preço do Bitcoin' },
      { status: 500 }
    );
  }
} 