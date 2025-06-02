import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  try {
    // Verificar se as variáveis de ambiente estão disponíveis
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      // NÃO redirecionar, deixar o front-end lidar com isso
      return NextResponse.next();
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
            request.cookies.set({ name, value, ...options });
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({ name, value: '', ...options });
            response.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    // Obter o usuário com timeout muito curto
    
    // Promise com timeout de apenas 3 segundos
    const userPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 3000)
    );

    try {
      const { data: { user }, error: userError } = await Promise.race([
        userPromise,
        timeoutPromise
      ]) as any;
      
      if (userError) {
        return NextResponse.next(); // Permitir acesso e deixar front-end decidir
      }

      if (!user) {
        return NextResponse.redirect(new URL('/auth', request.url));
      }

      return response;

    } catch (timeoutError) {
      return NextResponse.next(); // Em caso de timeout, permitir e deixar front-end decidir
    }

  } catch (error) {
    return NextResponse.next(); // Sempre permitir em caso de erro crítico
  }
}

export const config = {
  matcher: [
    '/profile',
    '/settings'
  ],
}; 