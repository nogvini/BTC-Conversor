import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    message: "API funcionando corretamente",
    timestamp: new Date().toISOString() 
  })
}

// Desabilitar o cache para esta rota
export const dynamic = 'force-dynamic' 