"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { maskEmail } from "@/lib/utils";

export function UserMenu() {
  const { session, signOut } = useAuth();
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchUserProfile() {
      if (!session.user) return;
      
      try {
        setIsLoading(true);
        
        // Usar os dados do usuário já disponíveis no session
        setUsername(session.user.name || session.user.email?.split('@')[0] || "Usuário");
      } catch (error) {
        console.error("Erro ao buscar perfil:", error);
        setUsername(session.user.email?.split('@')[0] || "Usuário");
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserProfile();
  }, [session.user]);

  if (!session.user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8 border border-indigo-700/30">
            <AvatarImage src={session.user.avatar_url || ""} alt="Avatar" />
            <AvatarFallback className="bg-indigo-900 text-indigo-100">
              {username?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-indigo-950/90 backdrop-blur-sm border-indigo-900/40" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-indigo-200">
              {isLoading ? "Carregando..." : username}
            </p>
            <p className="text-xs leading-none text-indigo-400 truncate">
              {maskEmail(session.user.email)}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-indigo-800/30" />
        <DropdownMenuItem 
          className="text-indigo-300 focus:text-indigo-100 focus:bg-indigo-800/50"
          onClick={() => signOut()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 