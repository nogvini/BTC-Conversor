import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')

    if (code) {
      const cookieStore = cookies()
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
      await supabase.auth.exchangeCodeForSession(code)
    }

    // URL para redirecionamento após autenticação
    return NextResponse.redirect(requestUrl.origin)
  } catch (error) {
    console.error('Erro no callback de autenticação:', error)
    // Em caso de erro, redirecionar para a página de login
    const requestUrl = new URL(request.url)
    return NextResponse.redirect(new URL('/login', requestUrl.origin))
  }
} 