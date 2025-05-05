import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://sqnxrzndkppbwqdmvzer.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxbnhyem5ka3BwYndxZG12emVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MDA0NDMsImV4cCI6MjA2MTk3NjQ0M30.yaMQFTEWoNT3OeOCq-P05w39hpe1ppDcMp4DR7gVMRw";

export const supabase = createClient(supabaseUrl, supabaseKey);

// Tipos para autenticação
export type UserCredentials = {
  email: string;
  password: string;
};

export type UserRegistration = UserCredentials & {
  username: string;
};

// Funções de autenticação
export async function signIn({ email, password }: UserCredentials) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signUp({ email, password, username }: UserRegistration) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) throw authError;

  if (authData.user) {
    // Criar um perfil para o usuário
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        { 
          user_id: authData.user.id,
          username,
        }
      ]);

    if (profileError) throw profileError;
  }

  return authData;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error) throw error;
  return data;
} 