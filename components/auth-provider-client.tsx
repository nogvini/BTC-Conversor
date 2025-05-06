"use client";

import { AuthProvider } from "@/hooks/use-auth";

export function AuthProviderClient({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
} 