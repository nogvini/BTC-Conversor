"use client"

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
import { Loader2, LogOut, User, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

export function ProfileMenu() {
  const { session, signOut } = useAuth()
  const { toast } = useToast()
  const { user, isLoading } = session
  const router = useRouter()
  const [showError, setShowError] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isLoading) {
      timeoutRef.current = setTimeout(() => {
        setShowError(true)
      }, 5000)
    } else {
      setShowError(false)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [isLoading])

  const handleRetry = () => {
    setShowError(false)
    window.location.reload()
  }

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
  
  const handleNavigate = (path: string) => {
    router.push(path)
  }

  // Se estiver carregando, mostrar um indicador ou fallback
  if (isLoading) {
    if (showError) {
      return (
        <div className="flex flex-col items-center space-y-2">
          <span className="text-xs text-muted-foreground">Não foi possível conectar ao serviço de autenticação.</span>
          <Button size="sm" variant="outline" onClick={handleRetry}>
            Tentar novamente
          </Button>
          <Button size="sm" variant="ghost" onClick={() => router.push('/auth')}>
            Ir para Login
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

  // Se não estiver autenticado, não mostrar nada
  if (!user) {
    return null
  }

  // Obter as iniciais do nome do usuário para o avatar
  const getInitials = () => {
    if (!user.name) return "U"
    
    const names = user.name.split(" ")
    if (names.length === 1) return names[0].charAt(0).toUpperCase()
    
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase()
  }

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
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
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