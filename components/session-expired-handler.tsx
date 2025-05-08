"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export function SessionExpiredHandler() {
  const [isExpired, setIsExpired] = useState(false);
  const router = useRouter();

  // Verificar por erros de autenticação nos logs do console
  useEffect(() => {
    // Substituir o console.error para capturar erros de autenticação
    const originalConsoleError = console.error;
    console.error = (...args) => {
      // Verificar se é um erro de autenticação
      const errorString = args.join(' ');
      if (
        errorString.includes('useAuth deve ser usado dentro de um AuthProvider') ||
        errorString.includes('sessão expirada') ||
        errorString.includes('Authentication error')
      ) {
        setIsExpired(true);
      }
      originalConsoleError(...args);
    };

    // Verificar também por expiração no localStorage
    const checkSessionExpiryInterval = setInterval(() => {
      try {
        const sessionStr = localStorage.getItem('supabase_session');
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          if (session && session.expires_at) {
            // Verificar se a sessão expirou
            const expiresAt = session.expires_at * 1000; // Converter para milissegundos
            if (Date.now() > expiresAt) {
              setIsExpired(true);
              clearInterval(checkSessionExpiryInterval);
            }
          }
        }
      } catch (e) {
        // Ignorar erros de parsing
      }
    }, 30000); // Verificar a cada 30 segundos

    // Limpar ao desmontar
    return () => {
      console.error = originalConsoleError;
      clearInterval(checkSessionExpiryInterval);
    };
  }, []);

  const handleLogin = () => {
    // Limpar dados de sessão expirada
    localStorage.removeItem('supabase_session');
    
    // Redirecionar para a página de login
    router.push('/auth');
    
    // Fechar o diálogo
    setIsExpired(false);
  };

  return (
    <Dialog open={isExpired} onOpenChange={(open) => {
      // Apenas permitir fechar o diálogo se o usuário clicar em algum dos botões
      if (!open) {
        // Não fazer nada, precisamos manter o diálogo aberto
      }
    }}>
      <DialogContent className="sm:max-w-md bg-black/90 border-purple-700/50">
        <DialogHeader>
          <DialogTitle>Sessão Expirada</DialogTitle>
          <DialogDescription>
            Sua sessão expirou ou você precisa fazer login novamente para continuar.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-purple-950/20 p-3 rounded-md border border-purple-800/30 my-2 text-sm">
          Para continuar usando o aplicativo, você precisa fazer login novamente.
        </div>
        <DialogFooter className="sm:justify-between flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="bg-black/30 border-purple-700/50 hover:bg-purple-900/20"
          >
            Tentar Novamente
          </Button>
          <Button 
            onClick={handleLogin}
            className="bg-purple-700 hover:bg-purple-600"
          >
            Fazer Login
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 