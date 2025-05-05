"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Lista de rotas que não requerem autenticação
    const publicRoutes = ["/login", "/register"];
    
    // Se o carregamento terminou e não há usuário, redirecionar para login
    if (!loading && !user && !publicRoutes.includes(pathname)) {
      router.push("/login");
    }
    
    // Se o usuário está autenticado e tenta acessar login/registro, redirecionar para home
    if (!loading && user && publicRoutes.includes(pathname)) {
      router.push("/");
    }
  }, [user, loading, pathname, router]);

  // Se ainda está carregando ou se o usuário não está autenticado e não está em rota pública, 
  // retornar null (não renderizar os filhos)
  const publicRoutes = ["/login", "/register"];
  if (loading || (!user && !publicRoutes.includes(pathname))) {
    return null;
  }

  // Caso contrário, renderizar os filhos
  return <>{children}</>;
} 