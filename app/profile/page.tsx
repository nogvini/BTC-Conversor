"use client";

import { useState, useEffect } from "react";
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

// Componente de perfil carregado dinamicamente
const UserProfile = dynamic(() => import("@/components/user-profile"), {
  ssr: false,
  loading: ProfileLoading,
});

// Componente de verificação de autenticação carregado dinamicamente
const RequireAuth = dynamic(
  () => import("@/components/require-auth").then(mod => mod.RequireAuth),
  { ssr: false }
);

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <ProfileLoading />;
  }

  return (
    <RequireAuth>
      <UserProfile />
    </RequireAuth>
  );
} 