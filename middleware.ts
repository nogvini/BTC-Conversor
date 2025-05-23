import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log('[Middleware] Verificando rota protegida:', pathname);

  // Crie um objeto de resposta inicial
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  try {
    // Verificar se as variáveis de ambiente estão disponíveis
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('[Middleware] Variáveis Supabase não encontradas, redirecionando para auth');
      return NextResponse.redirect(new URL('/auth', request.url));
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value,
              ...options,
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({
              name,
              value: '',
              ...options,
            });
          },
        },
      }
    );

    // Verificar sessão
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.warn('[Middleware] Erro de sessão:', sessionError.message);
      return NextResponse.redirect(new URL('/auth', request.url));
    }

    // Se não há sessão, redirecionar para auth
    if (!session) {
      console.log('[Middleware] Nenhuma sessão encontrada, redirecionando para /auth');
      return NextResponse.redirect(new URL('/auth', request.url));
    }

    // Se há sessão, permitir acesso
    console.log('[Middleware] Sessão válida, permitindo acesso a:', pathname);
    return response;

  } catch (error) {
    console.error('[Middleware] Erro crítico:', error);
    // Em caso de erro crítico, redirecionar para auth em vez de permitir acesso
    return NextResponse.redirect(new URL('/auth', request.url));
  }
}

export const config = {
  matcher: [
    // Aplicar middleware APENAS às rotas de páginas que precisam de verificação
    // Excluir TODOS os arquivos estáticos, APIs e recursos
    '/profile/:path*',
    '/settings/:path*',
    '/admin/:path*'
  ],
}; 