import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(request: NextRequest) {
  // Inicializar o cliente Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Obter o token de autenticação do cookie
  const authCookie = request.cookies.get('sb-auth-token')?.value
  
  // Verificar se o usuário está autenticado
  let isAuthenticated = false
  if (authCookie) {
    const { data, error } = await supabase.auth.getUser()
    isAuthenticated = !!data.user && !error
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

  return NextResponse.next()
}

// Configurar as páginas que devem passar pelo middleware
export const config = {
  matcher: ['/private/:path*', '/auth'],
} 