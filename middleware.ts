import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  try {
    console.log('MIDDLEWARE_DEBUG: Tentando criar cliente Supabase...');
    const supabase = createMiddlewareClient(
      { request, response: NextResponse.next() },
      {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      }
    );
    console.log('MIDDLEWARE_DEBUG: Cliente Supabase aparentemente criado.');
    const { data: { session } } = await supabase.auth.getSession();
    console.log('MIDDLEWARE_DEBUG: Sessão obtida:', !!session);
    return NextResponse.next();
  } catch (error) {
    console.error('MIDDLEWARE_DEBUG: Erro CRÍTICO no middleware:', error);
    // Para ter certeza que o erro não está no NextResponse.next() dentro do catch
    // Retornar uma resposta de erro explícita pode ser melhor para o debug em produção.
    const errorResponse = new NextResponse(
      JSON.stringify({ error: 'Erro interno no middleware', details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
    return errorResponse; 
  }
}

export const config = {
  // Reduzir o matcher ao mínimo para teste, ex: apenas uma rota protegida e /auth
  // Ajuste para as rotas que você quer testar minimamente com o middleware.
  matcher: ['/profile/:path*', '/settings/:path*', '/calculator/:path*', '/admin/:path*', '/auth'], 
}; 