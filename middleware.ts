import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log('[Middleware] Verificando rota protegida:', pathname);

  try {
    // Verificar se as variáveis de ambiente estão disponíveis
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Middleware] Variáveis Supabase não encontradas');
      return NextResponse.redirect(new URL('/auth', request.url));
    }

    // Criar resposta que será modificada
    let response = NextResponse.next();

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            // Definir cookie no request para leitura imediata
            request.cookies.set({
              name,
              value,
              ...options,
            });
            // Definir cookie na resposta para persistir no navegador
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: CookieOptions) {
            // Remover cookie do request
            request.cookies.set({
              name,
              value: '',
              ...options,
            });
            // Remover cookie da resposta
            response.cookies.set({
              name,
              value: '',
              ...options,
            });
          },
        },
      }
    );

    // Obter o usuário (mais confiável que getSession para middleware)
    console.log('[Middleware] Verificando usuário...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log('[Middleware] Erro ao obter usuário:', userError.message);
      return NextResponse.redirect(new URL('/auth', request.url));
    }

    // Se não há usuário autenticado, redirecionar para auth
    if (!user) {
      console.log('[Middleware] Nenhum usuário autenticado, redirecionando para /auth');
      return NextResponse.redirect(new URL('/auth', request.url));
    }

    // Log do usuário válido
    console.log('[Middleware] Usuário autenticado encontrado:', user.email);
    console.log('[Middleware] Permitindo acesso a:', pathname);
    
    return response;

  } catch (error) {
    console.error('[Middleware] Erro crítico:', error);
    
    // Em caso de erro crítico, redirecionar para auth
    return NextResponse.redirect(new URL('/auth', request.url));
  }
}

export const config = {
  matcher: [
    // Interceptar apenas rotas específicas que precisam de autenticação
    '/profile',
    '/settings', 
    '/admin/:path*'
  ],
}; 