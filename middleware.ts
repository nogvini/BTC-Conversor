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

    // Verificar se as variáveis de ambiente estão disponíveis
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('[Middleware] Variáveis de ambiente Supabase não encontradas, permitindo acesso sem verificação');
      return response;
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
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.warn('[Middleware] Erro ao obter sessão:', sessionError.message, '- Permitindo acesso');
      return response;
    }

    console.log('[Middleware] Sessão obtida (existe?):', !!session);

    // Lógica de proteção de rota (Exemplo)
    const { pathname } = request.nextUrl;

    // Definir rotas públicas (que não precisam de autenticação)
    const publicPaths = [
      '/', 
      '/about', 
      '/partners',
      '/auth',
      '/converter',
      '/calculator',
      '/chart'
    ];
    
    // Verificar se a rota atual é pública
    const isPublicPath = publicPaths.includes(pathname) || 
                        pathname.startsWith('/api') || 
                        pathname.startsWith('/_next') ||
                        pathname.startsWith('/favicon') ||
                        pathname.includes('.');

    // Se for uma rota pública, permitir acesso
    if (isPublicPath) {
      console.log('[Middleware] Rota pública acessada:', pathname);
      return response;
    }

    // Se o usuário não estiver logado e tentar acessar uma rota protegida
    if (!session) {
      console.log(`[Middleware] Usuário não autenticado tentando acessar rota protegida: ${pathname}. Redirecionando para /auth.`);
      return NextResponse.redirect(new URL('/auth', request.url));
    }

    // Se o usuário ESTIVER logado e tentar acessar /auth, redirecionar para home
    if (session && pathname.startsWith('/auth')) {
      console.log(`[Middleware] Usuário autenticado tentando acessar ${pathname}. Redirecionando para /.`);
      return NextResponse.redirect(new URL('/', request.url));
    }

    console.log('[Middleware] Finalizado. Retornando resposta.');
    return response; // Retorna a resposta (pode ter cookies atualizados pelo Supabase)

  } catch (error) {
    console.error('[Middleware] Erro CRÍTICO no middleware:', error);
    
    // Em caso de erro crítico, permitir acesso em vez de bloquear
    console.warn('[Middleware] Permitindo acesso devido a erro crítico');
    return response;
  }
}

export const config = {
  matcher: [
    // Aplicar middleware apenas às rotas que precisam de verificação de autenticação
    // Excluir arquivos estáticos, API routes, Next.js internals, e arquivos públicos
    '/((?!_next/static|_next/image|favicon|site\.webmanifest|.*\.ico|.*\.png|.*\.svg|.*\.jpg|.*\.jpeg|.*\.gif|.*\.webp|api/).*)',
  ],
}; 