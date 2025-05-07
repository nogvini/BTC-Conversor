import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        status: "error",
        message: "Variáveis de ambiente do Supabase não configuradas"
      }, { status: 500 })
    }
    
    // Criar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Tentar fazer uma operação simples para verificar a conexão
    const { data, error } = await supabase.from('health_check').select('count').limit(1).maybeSingle()
    
    if (error && error.code === '42P01') {
      // A tabela não existe, mas a conexão funcionou
      return NextResponse.json({
        status: "success",
        message: "Conexão com Supabase estabelecida, mas tabela de verificação não existe",
      })
    } else if (error) {
      // Outro tipo de erro
      return NextResponse.json({
        status: "warning",
        message: "Conexão com Supabase estabelecida, mas encontramos um erro",
        error: error.message
      }, { status: 200 })
    }
    
    // Sucesso
    return NextResponse.json({
      status: "success",
      message: "Conexão com Supabase está funcionando corretamente",
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      message: "Erro ao conectar ao Supabase",
      error: error.message || "Erro desconhecido"
    }, { status: 500 })
  }
}

// Desabilitar o cache para esta rota
export const dynamic = 'force-dynamic' 