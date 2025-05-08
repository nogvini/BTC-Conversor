"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

// Componente de carregamento
const ProfileFormLoading = () => (
  <div className="py-8 flex flex-col items-center">
    <Loader2 className="h-8 w-8 animate-spin" />
    <p className="mt-2 text-sm text-gray-500">Carregando perfil...</p>
  </div>
);

// Componente de perfil carregado dinamicamente
const UserProfile = dynamic(() => import("@/components/user-profile"), {
  ssr: false,
  loading: ProfileFormLoading,
});

// Componente de verificação de autenticação carregado dinamicamente
const RequireAuth = dynamic(
  () => import("@/components/require-auth").then(mod => mod.RequireAuth),
  { ssr: false }
);

export default function ProfileFormPage() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <ProfileFormLoading />;
  }

  return (
    <RequireAuth>
      <UserProfile />
    </RequireAuth>
  );
} 