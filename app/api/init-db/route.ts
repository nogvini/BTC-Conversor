import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  // Verificar se estamos em ambiente de produção ou desenvolvimento
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DB_INIT) {
    return NextResponse.json(
      { success: false, message: 'Esta rota está disponível apenas em ambiente de desenvolvimento.' },
      { status: 403 }
    )
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { success: false, message: 'Variáveis de ambiente do Supabase não estão definidas.' },
      { status: 500 }
    )
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Criar tabela de perfis se não existir
    const { error: profileTableError } = await supabase.rpc('create_profiles_if_not_exists')

    if (profileTableError) {
      // Se a função RPC não existir, criar a tabela diretamente
      const { error } = await supabase.from('profiles').select('count').limit(1)
      
      if (error && error.code === '42P01') { // Erro de tabela não existe
        const createTableResult = await supabase.rpc('execute_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS public.profiles (
              id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
              name TEXT,
              avatar_url TEXT,
              email TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            -- Adicionar políticas de segurança RLS
            ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

            -- Criar política: usuários podem ver qualquer perfil
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Profiles are viewable by everyone'
              ) THEN
                CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
                  FOR SELECT USING (true);
              END IF;
            END
            $$;

            -- Criar política: usuários podem editar apenas o próprio perfil
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
              ) THEN
                CREATE POLICY "Users can update own profile" ON public.profiles
                  FOR UPDATE USING (auth.uid() = id);
              END IF;
            END
            $$;

            -- Criar função para atualizar o campo updated_at
            CREATE OR REPLACE FUNCTION update_modified_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            -- Criar trigger para atualizar o campo updated_at
            DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
            CREATE TRIGGER set_profiles_updated_at
            BEFORE UPDATE ON public.profiles
            FOR EACH ROW
            EXECUTE FUNCTION update_modified_column();
          `
        })

        if (createTableResult.error) {
          throw createTableResult.error
        }
      } else if (error) {
        throw error
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Banco de dados inicializado com sucesso' 
    })
  } catch (error: any) {
    console.error('Erro ao inicializar banco de dados:', error)
    
    return NextResponse.json(
      { success: false, message: 'Erro ao inicializar banco de dados: ' + error.message },
      { status: 500 }
    )
  }
}

// Desabilitar o cache para esta rota
export const dynamic = 'force-dynamic' 