"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  // Verificar se estamos no cliente para evitar erros de hidratação
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Lista de rotas que não requerem autenticação
  const publicRoutes = ["/login", "/register"];
  const isPublicRoute = publicRoutes.includes(pathname);

  // Só executar verificações de rota no cliente
  useEffect(() => {
    if (!isClient) return;

    // Se o carregamento terminou e não há usuário, redirecionar para login
    // (apenas se não estiver em rota pública)
    if (!loading && !user && !isPublicRoute) {
      router.push("/login");
    }
    
    // Se o usuário está autenticado e tenta acessar login/registro, redirecionar para home
    if (!loading && user && isPublicRoute) {
      router.push("/");
    }
  }, [user, loading, pathname, router, isClient, isPublicRoute]);

  // Se não estamos no cliente, renderizar os filhos para SSR
  if (!isClient) {
    return <>{children}</>;
  }

  // Se está carregando, apenas mostrar os filhos para que o componente de loading seja visível
  if (loading) {
    return <>{children}</>;
  }

  // Casos de renderização baseados no estado de autenticação e tipo de rota
  if (!user && !isPublicRoute) {
    // Usuário não autenticado em rota protegida - não mostrar conteúdo
    // O redirecionamento acontecerá pelo useEffect
    return null;
  }

  // Em todos os outros casos, renderizar os filhos
  return <>{children}</>;
} 