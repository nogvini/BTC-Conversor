"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";
import {
  supabase,
  getCurrentUser,
  signIn as supabaseSignIn,
  signOut as supabaseSignOut,
  signUp as supabaseSignUp,
  UserCredentials,
  UserRegistration,
} from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (credentials: UserCredentials) => Promise<void>;
  signUp: (userData: UserRegistration) => Promise<void>;
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
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error("Erro ao verificar autenticação:", error);
      } finally {
        setLoading(false);
      }
    }

    loadUserSession();

    // Configurar listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
        }
        
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

  const signIn = async (credentials: UserCredentials) => {
    try {
      setLoading(true);
      const { user } = await supabaseSignIn(credentials);
      setUser(user);
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

  const signUp = async (userData: UserRegistration) => {
    try {
      setLoading(true);
      await supabaseSignUp(userData);
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
      await supabaseSignOut();
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