"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { User, Settings, LogOut, Loader2, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

/**
 * Componente que exibe o menu de perfil do usuário
 */
export function ProfileMenu() {
  const { session, signOut, retryConnection } = useAuth()
  const { user, isLoading, error } = session
  const router = useRouter()
  const { toast } = useToast()
  
  const [showError, setShowError] = useState(false)
  const [errorTimeout, setErrorTimeout] = useState<NodeJS.Timeout | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  
  // Log de debugging
  useEffect(() => {
    console.log('[ProfileMenu] Estado atual:', {
      isLoading,
      hasUser: !!user,
      hasError: !!error,
      retryCount,
      showError
    });
  }, [isLoading, user, error, retryCount, showError]);
  
  // Efeito para mostrar erro após um período de carregamento
  useEffect(() => {
    // Limpar qualquer timeout existente
    if (errorTimeout) {
      clearTimeout(errorTimeout)
      setErrorTimeout(null)
    }
    
    // Se estiver carregando, configurar um timeout para mostrar erro
    if (isLoading && !user) {
      const timeout = setTimeout(() => {
        console.log('[ProfileMenu] Timeout de carregamento atingido, mostrando erro');
        setShowError(true)
      }, 10000) // 10 segundos para ser mais tolerante
      
      setErrorTimeout(timeout)
    } else {
      setShowError(false)
    }
    
    // Limpar o timeout quando o componente for desmontado
    return () => {
      if (errorTimeout) {
        clearTimeout(errorTimeout)
      }
    }
  }, [isLoading, user])
  
  // Efeito para iniciar tentativas de reconexão se houver erro
  useEffect(() => {
    if (error && !isLoading && retryCount < 2) { // Reduzido para 2 tentativas
      const retryTimeout = setTimeout(() => {
        console.log('[ProfileMenu] Tentando reconectar automaticamente, tentativa:', retryCount + 1)
        handleRetry()
      }, 3000 * (retryCount + 1)) // Backoff exponencial
      
      return () => clearTimeout(retryTimeout)
    }
  }, [error, isLoading, retryCount])
  
  // Função para tentar reconectar
  const handleRetry = () => {
    console.log('[ProfileMenu] Executando retry, count:', retryCount);
    setRetryCount(prev => prev + 1)
    retryConnection()
  }
  
  // Função para navegar para outras páginas
  const handleNavigate = (path: string) => {
    router.push(path)
  }
  
  // Função para fazer logout
  const handleSignOut = async () => {
    try {
      await signOut()
      toast({
        title: "Desconectado com sucesso",
        description: "Volte logo!",
        variant: "default",
      })
    } catch (error) {
      toast({
        title: "Erro ao desconectar",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      })
    }
  }

  // Se estiver carregando, mostrar um indicador ou fallback
  if (isLoading) {
    if (showError) {
      return (
        <div className="flex flex-col items-center space-y-2">
          <span className="text-xs text-muted-foreground">Não foi possível conectar ao serviço de autenticação.</span>
          <Button size="sm" variant="outline" onClick={handleRetry} className="text-xs px-2 py-1 h-7">
            <RefreshCw className="h-3 w-3 mr-1" />
            Reconectar
          </Button>
        </div>
      )
    }
    return (
      <div className="flex items-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Se não estiver autenticado, mostrar botão de login
  if (!user) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => router.push('/auth')}
        className="ml-auto"
      >
        Entrar
      </Button>
    )
  }

  // Obter as iniciais do nome do usuário para o avatar
  const getInitials = () => {
    if (!user.name) return "U"
    
    const names = user.name.split(" ")
    if (names.length === 1) return names[0].charAt(0).toUpperCase()
    
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase()
  }

  // Função para censurar o email
  const censorEmail = (email: string | undefined): string => {
    if (!email) return "E-mail não disponível";
    
    const [localPart, domain] = email.split('@');
    if (!domain || localPart.length <= 2) {
      // Retorna email não modificado se for inválido ou muito curto
      return email;
    }
    
    const firstChar = localPart[0];
    const lastChar = localPart[localPart.length - 1];
    const censoredPart = firstChar + "***" + lastChar;
    
    return `${censoredPart}@${domain}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.avatar_url || ""} alt={user.name || "Usuário"} />
            <AvatarFallback className="bg-primary/20 text-primary">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user.name || "Usuário"}</p>
            <p className="text-xs text-muted-foreground truncate">{censorEmail(user.email)}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleNavigate("/profile")}>
          <User className="mr-2 h-4 w-4" />
          <span>Meu Perfil</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleNavigate("/settings")}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Configurações</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 