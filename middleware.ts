import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareSupabaseClient } from './lib/middleware-supabase'

export async function middleware(request: NextRequest) {
  // Criar o cliente Supabase para o middleware
  const supabase = createMiddlewareSupabaseClient()
  
  // Se não for possível criar o cliente Supabase, permitir acesso sem verificação
  if (!supabase) {
    return NextResponse.next()
  }
  
  try {
    // Obter o token de autenticação do cookie
    const authCookie = request.cookies.get('sb-auth-token')?.value
    
    // Verificar se o usuário está autenticado
    let isAuthenticated = false
    if (authCookie) {
      try {
        const { data, error } = await supabase.auth.getUser()
        isAuthenticated = !!data.user && !error
      } catch (err) {
        console.error('Erro ao verificar autenticação:', err)
      }
    }

    // Se a rota for privada e o usuário não estiver autenticado, redirecionar para login
    const isPrivatePage = request.nextUrl.pathname.startsWith('/private')
    
    if (isPrivatePage && !isAuthenticated) {
      return NextResponse.redirect(new URL('/auth', request.url))
    }

    // Se o usuário estiver tentando acessar o login mas já estiver autenticado, redirecionar para home
    if (request.nextUrl.pathname === '/auth' && isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  } catch (error) {
    console.error('Erro no middleware de autenticação:', error)
    // Em caso de erro, permitir o acesso e deixar que a aplicação lide com a autenticação
  }

  return NextResponse.next()
}

// Configurar as páginas que devem passar pelo middleware
export const config = {
  matcher: ['/private/:path*', '/auth'],
} 