"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Camera, Save, User } from "lucide-react"
import { PageTransition } from "@/components/page-transition"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

// Esquema de validação para o perfil
const profileSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  avatar_url: z.string().optional(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

export default function UserProfile() {
  const { session, updateProfile } = useAuth()
  const { toast } = useToast()
  const { user, isLoading } = session
  const [isSaving, setIsSaving] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isFormReady, setIsFormReady] = useState(false)
  
  // Inicializar o formulário com valores vazios
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      avatar_url: "",
    },
  })
  
  // Atualizar os valores do formulário quando o usuário for carregado
  useEffect(() => {
    if (user) {
      // Resetar o formulário quando obtermos os dados do usuário
      profileForm.reset({
        name: user.name || "",
        avatar_url: user.avatar_url || "",
      })
      
      // Marcar o formulário como pronto
      setIsFormReady(true)
    }
  }, [user, profileForm])

  // Obter as iniciais do nome do usuário para o avatar
  const getInitials = () => {
    if (!user?.name) return "U"
    
    const names = user.name.split(" ")
    if (names.length === 1) return names[0].charAt(0).toUpperCase()
    
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase()
  }

  // Função para atualizar o perfil
  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return

    try {
      setIsSaving(true)
      
      const { error } = await updateProfile({
        name: data.name,
        avatar_url: data.avatar_url,
      })
      
      if (error) {
        throw error
      }
      
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
        variant: "success",
      })
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message || "Ocorreu um erro ao atualizar seu perfil.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Se estiver carregando, mostrar um indicador
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
      </div>
    )
  }

  // Se não houver usuário, exibir mensagem
  if (!user) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Perfil indisponível</CardTitle>
          <CardDescription>
            Você precisa estar conectado para visualizar seu perfil.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <PageTransition>
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Meu Perfil</CardTitle>
          <CardDescription>
            Visualize e edite suas informações pessoais
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-purple-700/30">
                <AvatarImage 
                  src={avatarPreview || user.avatar_url || ""} 
                  alt={user.name || "Usuário"} 
                />
                <AvatarFallback className="bg-primary/20 text-primary text-3xl">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <Button 
                size="icon" 
                variant="secondary" 
                className="absolute -bottom-2 -right-2 rounded-full h-8 w-8"
                disabled={true} // Funcionalidade a ser implementada futuramente
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Membro desde {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>
          
          {!isFormReady ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-4" />
              <p className="text-sm text-muted-foreground">Carregando dados do perfil...</p>
            </div>
          ) : (
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={profileForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Seu nome" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    value={user.email} 
                    disabled 
                    className="bg-black/30"
                  />
                  <p className="text-xs text-muted-foreground">
                    O email não pode ser alterado.
                  </p>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full mt-4" 
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar alterações
                    </>
                  )}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </PageTransition>
  )
} 