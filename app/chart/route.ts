import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Esta função será executada no servidor e evita o problema de renderização estática
export function GET(request: NextRequest) {
  // Redirecionamento simples para a página principal com a tab chart
  return NextResponse.redirect(new URL('/?tab=chart', request.url), 307)
} 