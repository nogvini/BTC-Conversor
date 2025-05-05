import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Verificar se está tentando acessar uma página protegida sem autenticação
  const isAuthPage = req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/register'
  
  // Se não está autenticado e não está em uma página de autenticação, redirecionar para login
  if (!session && !isAuthPage) {
    const redirectUrl = new URL('/login', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Se está autenticado e está em uma página de autenticação, redirecionar para home
  if (session && isAuthPage) {
    const redirectUrl = new URL('/', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

// Definir quais rotas serão protegidas pelo middleware
export const config = {
  matcher: [
    /*
     * Corresponder a todas as páginas, exceto:
     * - Arquivos de API (que começam com /api/)
     * - Arquivos estáticos (como imagens, arquivos JS, etc)
     * - Páginas de erros (_error, 404, etc)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 