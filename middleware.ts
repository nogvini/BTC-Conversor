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
      console.error('[Middleware] Variáveis Supabase não encontradas');
      console.error('[Middleware] NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
      console.error('[Middleware] NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!supabaseAnonKey);
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
    console.log('[Middleware] Verificando sessão...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('[Middleware] Erro de sessão:', sessionError.message);
      console.error('[Middleware] Código do erro:', sessionError.status);
      return NextResponse.redirect(new URL('/auth', request.url));
    }

    // Se não há sessão, redirecionar para auth
    if (!session) {
      console.log('[Middleware] Nenhuma sessão encontrada, redirecionando para /auth');
      return NextResponse.redirect(new URL('/auth', request.url));
    }

    // Se há sessão, verificar se o usuário está válido
    if (!session.user) {
      console.log('[Middleware] Sessão sem usuário, redirecionando para /auth');
      return NextResponse.redirect(new URL('/auth', request.url));
    }

    // Log da sessão válida
    console.log('[Middleware] Sessão válida encontrada');
    console.log('[Middleware] Usuário:', session.user.email);
    console.log('[Middleware] Permitindo acesso a:', pathname);
    
    return response;

  } catch (error) {
    console.error('[Middleware] Erro crítico:', error);
    console.error('[Middleware] Stack trace:', error instanceof Error ? error.stack : 'Sem stack trace');
    
    // Em caso de erro crítico, redirecionar para auth
    return NextResponse.redirect(new URL('/auth', request.url));
  }
}

export const config = {
  matcher: [
    // Proteger apenas rotas específicas que requerem autenticação
    '/profile',
    '/profile/(.*)',
    '/settings',
    '/settings/(.*)',
    '/admin',
    '/admin/(.*)'
  ],
}; 