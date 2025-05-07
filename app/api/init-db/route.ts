import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Desativar a opção de armazenamento em cache para essa API
export const dynamic = 'force-dynamic'

// Função para verificar e criar a tabela profiles se não existir
export async function GET() {
  try {
    // Criar cliente Supabase com credenciais de serviço para ter permissões de admin
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Variáveis de ambiente não configuradas', 
          details: {
            hasUrl: !!supabaseUrl,
            hasServiceKey: !!supabaseServiceKey
          } 
        },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const connectionStart = Date.now()
    let dbAccessible = false
    
    // Teste básico de conexão
    try {
      const { data: connectionTest, error: connectionError } = await supabase
        .from('information_schema.tables')
        .select('table_schema')
        .limit(1)
        .maybeSingle()
      
      dbAccessible = !connectionError && !!connectionTest
    } catch (connectionError) {
      console.error('Erro na conexão básica com o banco:', connectionError)
    }

    // Se não conseguimos conectar, retornar erro
    if (!dbAccessible) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Não foi possível conectar ao banco de dados Supabase', 
          responseTime: Date.now() - connectionStart,
          environment: process.env.NODE_ENV
        },
        { status: 503 }
      )
    }

    // Verificar se a tabela profiles existe
    const { data: existingTables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'profiles')

    if (tablesError) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Erro ao verificar tabelas: ${tablesError.message}`,
          details: tablesError
        },
        { status: 500 }
      )
    }

    // Se a tabela não existir, criá-la
    if (!existingTables || existingTables.length === 0) {
      const { error: createTableError } = await supabase.rpc('create_profiles_table')

      if (createTableError) {
        return NextResponse.json(
          { 
            success: false, 
            message: `Erro ao criar tabela: ${createTableError.message}`,
            details: createTableError 
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { success: true, message: 'Tabela profiles criada com sucesso!' },
        { status: 200 }
      )
    }

    // Verificar se há triggers/functions necessárias
    const { data: existingFunction, error: functionError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_schema', 'public')
      .eq('routine_name', 'handle_new_user')

    if (functionError) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Erro ao verificar funções: ${functionError.message}`,
          details: functionError
        },
        { status: 500 }
      )
    }

    // Contar registros na tabela profiles para diagnóstico adicional
    const { count: profileCount, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json(
      { 
        success: true, 
        message: 'Estrutura do banco de dados verificada com sucesso',
        responseTime: Date.now() - connectionStart,
        details: {
          profiles_table: true,
          handle_new_user_function: !!existingFunction?.length,
          profile_count: countError ? 'erro ao contar' : profileCount,
          environment: process.env.NODE_ENV
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao verificar banco de dados:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    )
  }
} 