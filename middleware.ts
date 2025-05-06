import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(request: NextRequest) {
  // Inicializar o cliente Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  
  // Verificar se as credenciais do Supabase estão disponíveis
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Credenciais do Supabase não disponíveis no middleware - permitindo acesso')
    return NextResponse.next()
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)

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

  return NextResponse.next()
}

// Configurar as páginas que devem passar pelo middleware
export const config = {
  matcher: ['/private/:path*', '/auth'],
} 