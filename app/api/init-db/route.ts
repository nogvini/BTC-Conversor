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
        { success: false, message: 'Variáveis de ambiente não configuradas' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verificar se a tabela profiles existe
    const { data: existingTables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'profiles')

    if (tablesError) {
      return NextResponse.json(
        { success: false, message: `Erro ao verificar tabelas: ${tablesError.message}` },
        { status: 500 }
      )
    }

    // Se a tabela não existir, criá-la
    if (!existingTables || existingTables.length === 0) {
      const { error: createTableError } = await supabase.rpc('create_profiles_table')

      if (createTableError) {
        return NextResponse.json(
          { success: false, message: `Erro ao criar tabela: ${createTableError.message}` },
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
        { success: false, message: `Erro ao verificar funções: ${functionError.message}` },
        { status: 500 }
      )
    }

    // Se a função não existir, podemos criá-la se necessário
    if (!existingFunction || existingFunction.length === 0) {
      // Verificamos apenas, mas não criamos automaticamente pelo risco de segurança
      console.log('Função handle_new_user não encontrada - será necessário criar manualmente')
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Estrutura do banco de dados verificada',
        details: {
          profiles_table: true,
          handle_new_user_function: !!existingFunction?.length
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao verificar banco de dados:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Erro desconhecido' 
      },
      { status: 500 }
    )
  }
} 