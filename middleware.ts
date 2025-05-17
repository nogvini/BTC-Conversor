import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  // Crie um objeto de resposta inicial. Ele será usado e potencialmente modificado.
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  try {
    console.log('[Middleware] Iniciando middleware para:', request.nextUrl.pathname);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            // Importante: Atualize os cookies na requisição primeiro
            request.cookies.set({
              name,
              value,
              ...options,
            });
            // Crie uma nova resposta baseada na requisição atualizada (com os novos cookies)
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            // Então, defina o cookie na nova resposta que será enviada ao navegador
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

    console.log('[Middleware] Cliente Supabase SSR criado.');

    // Importante: Atualizar a sessão para garantir que esteja disponível para Server Components
    // e para que as regras de autenticação funcionem corretamente.
    const { data: { session } } = await supabase.auth.getSession();
    console.log('[Middleware] Sessão obtida (existe?):', !!session);

    // Lógica de proteção de rota (Exemplo)
    const { pathname } = request.nextUrl;

    // Se o usuário não estiver logado e tentar acessar uma rota protegida (não /auth)
    if (!session && !pathname.startsWith('/auth')) {
      // E a rota não for pública (ex: landing page, /api)
      // (você precisará definir suas rotas públicas)
      const publicPaths = ['/', '/about', '/partners']; // Adicione suas rotas públicas aqui
      const isPublicPath = publicPaths.includes(pathname) || pathname.startsWith('/api'); // Exemplo

      if (!isPublicPath) {
        console.log(`[Middleware] Usuário não autenticado tentando acessar rota protegida: ${pathname}. Redirecionando para /auth.`);
        return NextResponse.redirect(new URL('/auth', request.url));
      }
    }

    // Se o usuário ESTIVER logado e tentar acessar /auth
    if (session && pathname.startsWith('/auth')) {
      console.log(`[Middleware] Usuário autenticado tentando acessar ${pathname}. Redirecionando para /.`);
      return NextResponse.redirect(new URL('/', request.url));
    }

    console.log('[Middleware] Finalizado. Retornando resposta.');
    return response; // Retorna a resposta (pode ter cookies atualizados pelo Supabase)

  } catch (error) {
    console.error('[Middleware] Erro CRÍTICO no middleware:', error);
    // Evite vazar detalhes do erro em produção, mas para depuração:
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no middleware';
    // Retornar uma resposta de erro genérica para o cliente
    return new NextResponse(
      JSON.stringify({ success: false, error: 'Erro interno do servidor no middleware.', details: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export const config = {
  matcher: [
    // Aplicar a todas as rotas exceto arquivos estáticos e de imagem da API Next.js
    // Isso garante que o middleware rode para todas as suas páginas e rotas de API se necessário.
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 