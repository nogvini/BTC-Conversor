"use client";

import { useState, useEffect, Suspense } from "react";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

// Componente de carregamento
const ProfileLoading = () => (
  <div className="min-h-screen p-4 pt-24 md:pt-28 pb-8 md:pb-12">
    <div className="max-w-4xl mx-auto text-center">
      <h1 className="text-2xl font-bold mb-4">Perfil do Usuário</h1>
      <div className="py-8 flex flex-col items-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="mt-2 text-sm text-gray-500">Carregando perfil...</p>
      </div>
    </div>
  </div>
);

// Componente de perfil carregado estaticamente para evitar problemas com hooks
const UserProfile = dynamic(() => import("@/components/user-profile"), {
  ssr: false,
  loading: () => <ProfileLoading />
});

// Componente de verificação de autenticação carregado estaticamente
const RequireAuth = dynamic(
  () => import("@/components/require-auth").then(mod => mod.RequireAuth),
  { ssr: false, loading: () => <ProfileLoading /> }
);

// Componente de wrapper para garantir que o componente de perfil
// seja renderizado apenas no cliente, sem problemas de hidratação
const ClientProfile = () => {
  return (
    <RequireAuth>
      <UserProfile />
    </RequireAuth>
  );
};

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Renderizar apenas um esqueleto até que o componente esteja montado no cliente
  if (!mounted) {
    return <ProfileLoading />;
  }

  // Usar Suspense para envolver o componente cliente, melhorando a hidratação
  return (
    <Suspense fallback={<ProfileLoading />}>
      <ClientProfile />
    </Suspense>
  );
} 