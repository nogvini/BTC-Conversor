import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
// import { createMiddlewareClient } from '@supabase/ssr' // Comentado para testar a importação abaixo
import * as supabaseSSR from '@supabase/ssr'; // Importar tudo para inspecionar

export async function middleware(request: NextRequest) {
  console.log('MIDDLEWARE_DEBUG: Conteúdo de supabaseSSR:', supabaseSSR); // Logar o módulo importado
  try {
    console.log('MIDDLEWARE_DEBUG: Tentando criar cliente Supabase...');
    
    // Verificar se createMiddlewareClient existe antes de chamar
    if (!supabaseSSR || typeof supabaseSSR.createMiddlewareClient !== 'function') {
      console.error('MIDDLEWARE_DEBUG: ERRO FATAL - createMiddlewareClient não é uma função em supabaseSSR:', supabaseSSR);
      // Retornar uma resposta de erro clara
      return new NextResponse(
        JSON.stringify({ error: 'Erro crítico: falha ao carregar dependência do middleware (Supabase)' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const response = NextResponse.next(); // Criar a resposta separadamente

    const supabase = supabaseSSR.createMiddlewareClient(
      { request, response }, // Passar request e response aqui
      {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      }
    );
    console.log('MIDDLEWARE_DEBUG: Cliente Supabase aparentemente criado.');
    const { data: { session } } = await supabase.auth.getSession();
    console.log('MIDDLEWARE_DEBUG: Sessão obtida:', !!session);
    
    // Se precisar manipular cookies, por exemplo, após signin/signout, você faria aqui usando o 'response' criado acima.
    // Ex: await supabase.auth.refreshSession(); // (que pode atualizar cookies)

    return response; // Retornar a resposta que pode ter sido modificada pelo Supabase client
  } catch (error) {
    console.error('MIDDLEWARE_DEBUG: Erro CRÍTICO no middleware:', error);
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