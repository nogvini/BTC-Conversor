import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')

    if (code) {
      const cookieStore = cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value
            },
            set(name: string, value: string, options: any) {
              cookieStore.set(name, value, options)
            },
            remove(name: string, options: any) {
              cookieStore.set(name, '', { ...options, maxAge: 0 })
            },
          },
        }
      )
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