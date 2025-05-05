import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  try {
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req, res })
    
    // Verificar a sessão
    const { data: { session } } = await supabase.auth.getSession()
    
    // Rotas que não requerem autenticação
    const isAuthPage = req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/register'
    
    // Verificar se é uma rota de API, recursos estáticos ou favicon
    const isPublicPath = req.nextUrl.pathname.startsWith('/api') || 
                          req.nextUrl.pathname.startsWith('/_next') || 
                          req.nextUrl.pathname === '/favicon.ico'
    
    // Se é um arquivo público, ignorar o middleware
    if (isPublicPath) {
      return res
    }
    
    // Se não está autenticado e não está em uma página de autenticação, redirecionar para login
    if (!session && !isAuthPage) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    
    // Se está autenticado e está em uma página de autenticação, redirecionar para home
    if (session && isAuthPage) {
      return NextResponse.redirect(new URL('/', req.url))
    }
    
    return res
  } catch (error) {
    console.error('Erro no middleware:', error)
    // Em caso de erro, permitir a passagem sem bloqueio para evitar falha total
    return NextResponse.next()
  }
}

// Aplicar middleware apenas a caminhos específicos
export const config = {
  matcher: [
    // Aplicar a todas as rotas exceto API, estáticos, etc.
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 