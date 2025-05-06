"use client"

import { RequireAuth } from "@/components/require-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageTransition } from "@/components/page-transition"
import { useAuth } from "@/hooks/use-auth"

export default function PrivatePage() {
  const { session } = useAuth()
  
  return (
    <RequireAuth>
      <main className="min-h-screen p-4 py-8 md:py-12">
        <PageTransition>
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle>Área Restrita</CardTitle>
              <CardDescription>
                Bem-vindo à área restrita do Raid Bitcoin Toolkit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>
                  Olá, <span className="font-medium">{session.user?.name || session.user?.email}</span>!
                </p>
                <p>
                  Esta é uma página de demonstração de área restrita. Apenas usuários autenticados podem ver este conteúdo.
                </p>
                <p>
                  Você pode adicionar mais funcionalidades exclusivas para usuários cadastrados aqui.
                </p>
              </div>
            </CardContent>
          </Card>
        </PageTransition>
      </main>
    </RequireAuth>
  )
} 