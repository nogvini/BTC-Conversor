"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BriefcaseIcon, LayoutDashboardIcon, WrenchIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Painel de Administração | BTC Monitor",
  description: "Painel de administração para gerenciar o sistema",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isClient, setIsClient] = useState(false);

  // Verificar se estamos no lado do cliente
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Durante SSR ou logo após a hidratação, mostramos um loader
  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Quando já estamos no lado do cliente, mostramos o conteúdo normal
  return (
    <div className="flex min-h-screen flex-col space-y-6">
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <BriefcaseIcon className="h-6 w-6" />
            <h1 className="text-xl font-bold">Administração</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/">
                Voltar ao Site
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <div className="container grid gap-12">
        <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
          <aside className="lg:w-1/5">
            <Tabs defaultValue="diagnose" className="w-full" orientation="vertical">
              <TabsList className="grid w-full grid-cols-1 gap-2">
                <TabsTrigger value="dashboard" asChild>
                  <Link href="/admin" className="flex items-center gap-2">
                    <LayoutDashboardIcon className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </TabsTrigger>
                <TabsTrigger value="diagnose" asChild>
                  <Link href="/admin/diagnose" className="flex items-center gap-2">
                    <WrenchIcon className="h-4 w-4" />
                    <span>Diagnóstico</span>
                  </Link>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </aside>
          <div className="flex-1 lg:max-w-4xl">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
} 