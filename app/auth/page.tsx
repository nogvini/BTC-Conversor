// Página estática que renderiza uma interface simples
// Marcada como edge runtime para evitar problemas com SSR
export const runtime = "edge";
export const dynamic = "force-dynamic";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuthPage() {
  return (
    <main className="min-h-screen p-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-bold text-center">
              Acesso ao Raid Toolkit
            </CardTitle>
            <CardDescription className="text-center">
              Redirecionando para a página de login...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
            <div className="animate-pulse h-8 w-8 rounded-full bg-primary/20"></div>
            
            <p className="text-sm text-center text-muted-foreground mt-4">
              Se você não for redirecionado automaticamente, 
              <a href="/auth/login" className="underline font-medium ml-1">
                clique aqui
              </a>
            </p>
            
            <script 
              dangerouslySetInnerHTML={{ 
                __html: `
                  setTimeout(function() {
                    window.location.href = '/auth/login';
                  }, 500);
                `
              }} 
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
} 