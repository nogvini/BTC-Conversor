"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';

export function SessionExpiredHandler() {
  const [isExpired, setIsExpired] = useState(false);
  const [inconsistentState, setInconsistentState] = useState(false);
  const router = useRouter();
  const { session, isConnecting } = useAuth();

  // Verificar por sessão expirada usando o estado de autenticação
  useEffect(() => {
    // Se não estiver carregando e o cliente está conectado, verificar estado inconsistente
    if (!session.isLoading && !isConnecting) {
      // Verificar se há evento de login mas sem dados de usuário (estado inconsistente)
      if (session.error?.message === 'Sessão expirada') {
        console.log('Sessão expirada detectada pelo useAuth');
        setIsExpired(true);
      }
    }
  }, [session, isConnecting]);

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
        errorString.includes('Authentication error') ||
        errorString.includes('token expirado') ||
        errorString.includes('token expired')
      ) {
        setIsExpired(true);
      }
      originalConsoleError(...args);
    };

    // Ouvir eventos de console.log que indicam problemas
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      const logString = args.join(' ');
      // Detectar eventos de login com estado inconsistente
      if (
        (logString.includes('Evento de autenticação recebido: SIGNED_IN') && 
         !session.user && !session.isLoading) ||
        logString.includes('Sessão expirada') ||
        logString.includes('sessão expirada')
      ) {
        setInconsistentState(true);
        setTimeout(() => {
          // Se ainda estiver em estado inconsistente após 3 segundos, mostrar diálogo
          if (!session.user && !session.isLoading) {
            setIsExpired(true);
          }
        }, 3000);
      }
      originalConsoleLog(...args);
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
              console.log('Sessão expirada detectada no localStorage');
              localStorage.removeItem('supabase_session');
              setIsExpired(true);
              clearInterval(checkSessionExpiryInterval);
            }
          }
        } else if (!session.user && !session.isLoading && localStorage.getItem('last_logged_in')) {
          // Se não há sessão, mas havia um login anterior
          console.log('Sessão perdida, mas havia login anterior');
          setIsExpired(true);
        }
      } catch (e) {
        // Ignorar erros de parsing
      }
    }, 15000); // Verificar a cada 15 segundos

    // Limpar ao desmontar
    return () => {
      console.error = originalConsoleError;
      console.log = originalConsoleLog;
      clearInterval(checkSessionExpiryInterval);
    };
  }, [session]);

  const handleLogin = () => {
    // Limpar dados de sessão expirada
    localStorage.removeItem('supabase_session');
    
    // Se estava logado anteriormente, registrar isso
    if (session.user?.email) {
      localStorage.setItem('last_logged_in', 'true');
    }
    
    // Redirecionar para a página de login com indicador de sessão expirada
    router.push('/auth?expired=true');
    
    // Fechar o diálogo
    setIsExpired(false);
    setInconsistentState(false);
  };

  return (
    <>
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

      {/* Diálogo para estado inconsistente de autenticação */}
      <Dialog open={inconsistentState && !isExpired} onOpenChange={(open) => {
        // Apenas permitir fechar o diálogo se o usuário clicar em algum dos botões
        if (!open) {
          setInconsistentState(false);
        }
      }}>
        <DialogContent className="sm:max-w-md bg-black/90 border-purple-700/50">
          <DialogHeader>
            <DialogTitle>Estado de Autenticação Inconsistente</DialogTitle>
            <DialogDescription>
              O sistema detectou um problema com sua sessão.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-purple-950/20 p-3 rounded-md border border-purple-800/30 my-2 text-xs">
            <p className="mb-2">Informações de diagnóstico:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Usuário logado: {session.user ? 'Sim' : 'Não'}</li>
              <li>Em carregamento: {session.isLoading ? 'Sim' : 'Não'}</li>
              <li>Erro: {session.error ? session.error.message : 'Nenhum'}</li>
            </ul>
          </div>
          <DialogFooter className="sm:justify-between flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="bg-black/30 border-purple-700/50 hover:bg-purple-900/20"
            >
              Recarregar
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
    </>
  );
} 