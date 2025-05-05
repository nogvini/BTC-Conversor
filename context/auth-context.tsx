"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";
import supabaseBrowser from "@/lib/supabase-browser";
import { toast } from "@/components/ui/use-toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (credentials: { email: string; password: string }) => Promise<void>;
  signUp: (userData: { email: string; password: string; username: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Verificar sessão ao carregar e configurar listener para mudanças de autenticação
  useEffect(() => {
    async function loadUserSession() {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession();
        setUser(session?.user || null);
      } catch (error) {
        console.error("Erro ao verificar autenticação:", error);
      } finally {
        setLoading(false);
      }
    }

    loadUserSession();

    // Configurar listener para mudanças de autenticação
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
        setLoading(false);
      }
    );

    // Limpar listener ao desmontar o componente
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Verificar se o usuário tem acesso à rota atual
  useEffect(() => {
    const publicRoutes = ['/login', '/register'];
    
    if (!loading) {
      if (!user && !publicRoutes.includes(pathname)) {
        router.push('/login');
      } else if (user && publicRoutes.includes(pathname)) {
        router.push('/');
      }
    }
  }, [user, loading, pathname, router]);

  const signIn = async ({ email, password }: { email: string; password: string }) => {
    try {
      setLoading(true);
      const { data, error } = await supabaseBrowser.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      setUser(data.user);
      router.push('/');
      toast({
        title: "Login realizado com sucesso",
        description: "Bem-vindo de volta!",
      });
    } catch (error: any) {
      const errorMessage = error.message || "Credenciais inválidas";
      console.error("Erro no login:", errorMessage);
      toast({
        title: "Erro no login",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async ({ email, password, username }: { email: string; password: string; username: string }) => {
    try {
      setLoading(true);
      
      // 1. Criar o usuário na autenticação
      const { data: authData, error: authError } = await supabaseBrowser.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      // 2. Se o usuário foi criado, inserir perfil
      if (authData.user) {
        const { error: profileError } = await supabaseBrowser
          .from('profiles')
          .insert([
            { 
              user_id: authData.user.id,
              username,
            }
          ]);

        if (profileError) throw profileError;
      }

      toast({
        title: "Cadastro realizado com sucesso",
        description: "Faça login para continuar",
      });
      router.push('/login');
    } catch (error: any) {
      const errorMessage = error.message || "Não foi possível criar a conta";
      console.error("Erro no cadastro:", errorMessage);
      toast({
        title: "Erro no cadastro",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabaseBrowser.auth.signOut();
      setUser(null);
      router.push('/login');
      toast({
        title: "Logout realizado com sucesso",
      });
    } catch (error: any) {
      const errorMessage = error.message || "Erro ao sair";
      console.error("Erro ao fazer logout:", errorMessage);
      toast({
        title: "Erro ao sair",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
} 