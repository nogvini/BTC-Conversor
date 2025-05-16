import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  try {
    // Criar o cliente Supabase para o middleware
    const supabase = createMiddlewareClient(
      {
        request,
        response: NextResponse.next(),
      }, 
      {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      }
    )
    
    // Verificar se o usuário está autenticado
    const { data: { session } } = await supabase.auth.getSession()
    const isAuthenticated = !!session
    
    // Se a rota for privada e o usuário não estiver autenticado, redirecionar para login
    const isPrivatePage = request.nextUrl.pathname.startsWith('/private')
    
    if (isPrivatePage && !isAuthenticated) {
      return NextResponse.redirect(new URL('/auth', request.url))
    }

    // Se o usuário estiver tentando acessar o login mas já estiver autenticado, redirecionar para home
    if (request.nextUrl.pathname === '/auth' && isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    
    // Continue a requisição
    return NextResponse.next()
  } catch (error) {
    console.error('Erro no middleware de autenticação:', error)
    // Em caso de erro, permitir o acesso e deixar que a aplicação lide com a autenticação
    return NextResponse.next()
  }
}

// Configurar as páginas que devem passar pelo middleware
export const config = {
  matcher: [
    '/profile/:path*',
    '/settings/:path*',
    '/calculator/:path*',
    '/admin/:path*',
    // Adicione outras rotas de primeiro nível que precisam de proteção, ex: '/dashboard/:path*'
    // '/private/:path*', // Remover se não for mais usado, ou manter se ainda relevante
    '/auth', // Para redirecionar usuários logados para fora do /auth
  ],
} 