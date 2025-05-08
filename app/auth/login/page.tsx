// Página estática no Edge Runtime - zero código cliente durante o build
export const runtime = "edge";
export const dynamic = "force-dynamic";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="min-h-screen p-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-bold text-center">
              Acesso ao Raid Toolkit
            </CardTitle>
            <CardDescription className="text-center">
              Redirecionando...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="animate-pulse h-8 w-8 rounded-full bg-primary/20"></div>
            
            <p className="text-sm text-center text-muted-foreground mt-4">
              Carregando formulário de login...
            </p>
            
            <script 
              dangerouslySetInnerHTML={{ 
                __html: `
                  // Redirecionar para a página client
                  setTimeout(function() {
                    window.location.href = '/auth/client';
                  }, 300);
                `
              }} 
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
} 