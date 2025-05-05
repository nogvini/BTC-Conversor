"use client";

import { ReactNode } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AuthLoading } from "@/components/auth-loading";

export function ClientWrapper({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <AuthLoading />
      {children}
    </AuthGuard>
  );
} 