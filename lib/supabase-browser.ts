'use client'

import { createBrowserClient } from '@supabase/ssr'

// Usando variáveis de ambiente com fallback para valores hardcoded
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sqnxrzndkppbwqdmvzer.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxbnhyem5ka3BwYndxZG12emVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MDA0NDMsImV4cCI6MjA2MTk3NjQ0M30.yaMQFTEWoNT3OeOCq-P05w39hpe1ppDcMp4DR7gVMRw'

// Criar o cliente Supabase com tratamento de erro
export const supabaseBrowser = createBrowserClient(
  supabaseUrl,
  supabaseKey,
  {
    // Este objeto permite configurações adicionais
    global: {
      fetch: (...args) => {
        return fetch(...args).catch(error => {
          console.warn('Erro na requisição Supabase:', error);
          throw error;
        });
      }
    }
  }
)

export default supabaseBrowser 