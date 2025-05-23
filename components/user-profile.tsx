"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Camera, Save, User, Eye, EyeOff, Key, TestTube2, Shield, Trash2 } from "lucide-react"
import { PageTransition } from "@/components/page-transition"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"

// Imports para LN Markets
import type { LNMarketsCredentials } from "@/components/types/ln-markets-types"
import { 
  storeLNMarketsCredentials, 
  retrieveLNMarketsCredentials, 
  removeLNMarketsCredentials,
  maskSensitiveData 
} from "@/lib/encryption"
import { testLNMarketsCredentials } from "@/lib/ln-markets-api"

// Esquema de validação para o perfil
const profileSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  avatar_url: z.string().optional(),
})

// Esquema de validação para credenciais LN Markets
const lnMarketsSchema = z.object({
  apiKey: z.string().min(10, "API Key deve ter pelo menos 10 caracteres"),
  apiSecret: z.string().min(10, "API Secret deve ter pelo menos 10 caracteres"),
  apiPassphrase: z.string().min(1, "API Passphrase é obrigatório"),
  network: z.enum(['mainnet', 'testnet'], { 
    required_error: "Selecione uma rede" 
  }),
})

type ProfileFormValues = z.infer<typeof profileSchema>
type LNMarketsFormValues = z.infer<typeof lnMarketsSchema>

// Função para mascarar email
const maskEmail = (email: string): string => {
  if (!email) return "";
  
  const [username, domain] = email.split('@');
  if (!username || !domain) return email;
  
  // Se o nome de usuário for muito curto, manter pelo menos 1 caractere
  const visibleChars = Math.max(1, Math.min(2, Math.floor(username.length / 3)));
  const maskedUsername = username.substring(0, visibleChars) + 
                         '*'.repeat(username.length - visibleChars);
  
  return `${maskedUsername}@${domain}`;
}

export default function UserProfile() {
  const { session, updateProfile } = useAuth()
  const { toast } = useToast()
  const { user, isLoading } = session
  const [isSaving, setIsSaving] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isFormReady, setIsFormReady] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  
  // Estados para LN Markets
  const [lnMarketsCredentials, setLnMarketsCredentials] = useState<LNMarketsCredentials | null>(null)
  const [showLNMarketsForm, setShowLNMarketsForm] = useState(false)
  const [isTestingCredentials, setIsTestingCredentials] = useState(false)
  const [isSavingLNMarkets, setIsSavingLNMarkets] = useState(false)
  const [showSensitiveFields, setShowSensitiveFields] = useState({
    apiKey: false,
    apiSecret: false,
    apiPassphrase: false,
  })
  
  // Inicializar o formulário com valores vazios
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      avatar_url: "",
    },
  })

  // Formulário LN Markets
  const lnMarketsForm = useForm<LNMarketsFormValues>({
    resolver: zodResolver(lnMarketsSchema),
    defaultValues: {
      apiKey: "",
      apiSecret: "",
      apiPassphrase: "",
      network: "mainnet",
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
      
      // Carregar credenciais LN Markets
      const savedCredentials = retrieveLNMarketsCredentials(user.email);
      if (savedCredentials) {
        setLnMarketsCredentials(savedCredentials);
      }
      
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

  // Função para testar credenciais LN Markets
  const handleTestCredentials = async (data: LNMarketsFormValues) => {
    if (!user) return;

    setIsTestingCredentials(true);
    try {
      const credentials: LNMarketsCredentials = {
        ...data,
        isConfigured: false,
      };

      const isValid = await testLNMarketsCredentials(credentials);
      
      if (isValid) {
        toast({
          title: "Credenciais válidas",
          description: "Conexão com LN Markets estabelecida com sucesso.",
          variant: "default",
        });
        return true;
      } else {
        toast({
          title: "Credenciais inválidas",
          description: "Não foi possível conectar com a API LN Markets.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error: any) {
      toast({
        title: "Erro ao testar credenciais",
        description: error.message || "Erro desconhecido ao testar API.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsTestingCredentials(false);
    }
  };

  // Função para salvar credenciais LN Markets
  const handleSaveLNMarkets = async (data: LNMarketsFormValues) => {
    if (!user) return;

    setIsSavingLNMarkets(true);
    try {
      // Primeiro testar credenciais
      const isValid = await handleTestCredentials(data);
      if (!isValid) {
        setIsSavingLNMarkets(false);
        return;
      }

      const credentials: LNMarketsCredentials = {
        ...data,
        isConfigured: true,
      };

      // Salvar credenciais criptografadas
      storeLNMarketsCredentials(credentials, user.email);
      setLnMarketsCredentials(credentials);
      setShowLNMarketsForm(false);

      // Limpar formulário
      lnMarketsForm.reset({
        apiKey: "",
        apiSecret: "",
        apiPassphrase: "",
        network: "mainnet",
      });

      toast({
        title: "Credenciais salvas",
        description: "Configuração LN Markets salva com segurança.",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar credenciais",
        description: error.message || "Erro ao salvar configuração.",
        variant: "destructive",
      });
    } finally {
      setIsSavingLNMarkets(false);
    }
  };

  // Função para remover credenciais
  const handleRemoveCredentials = () => {
    removeLNMarketsCredentials();
    setLnMarketsCredentials(null);
    toast({
      title: "Credenciais removidas",
      description: "Configuração LN Markets foi removida.",
      variant: "default",
    });
  };

  // Função para alternar a visibilidade do email
  const toggleEmailVisibility = () => {
    setShowEmail(prev => !prev);
  }

  // Função para alternar visibilidade dos campos sensíveis
  const toggleSensitiveField = (field: keyof typeof showSensitiveFields) => {
    setShowSensitiveFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

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
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Seção do Perfil */}
        <Card className="bg-black/30 border border-purple-700/40">
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
                    <div className="relative">
                      <Input 
                        value={showEmail ? user.email : maskEmail(user.email)} 
                        disabled 
                        className="bg-black/30 pr-10"
                      />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full w-10 rounded-l-none"
                              onClick={toggleEmailVisibility}
                            >
                              {showEmail ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{showEmail ? "Ocultar email" : "Mostrar email"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      O email não pode ser alterado. {!showEmail && 
                      <button 
                        type="button" 
                        onClick={toggleEmailVisibility}
                        className="text-primary hover:underline focus:outline-none"
                      >
                        Mostrar email completo
                      </button>}
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

        {/* Seção LN Markets API */}
        <Card className="bg-black/30 border border-purple-700/40">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Configuração LN Markets API
                </CardTitle>
                <CardDescription>
                  Configure suas credenciais para importação automática de dados
                </CardDescription>
              </div>
              {lnMarketsCredentials?.isConfigured && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={handleRemoveCredentials}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Remover credenciais</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {lnMarketsCredentials?.isConfigured ? (
              <div className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    ✅ Credenciais LN Markets configuradas e criptografadas
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">API Key</Label>
                    <p className="text-sm font-mono bg-black/50 p-2 rounded border">
                      {maskSensitiveData(lnMarketsCredentials.apiKey)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Rede</Label>
                    <p className="text-sm bg-black/50 p-2 rounded border capitalize">
                      {lnMarketsCredentials.network}
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setShowLNMarketsForm(true)}
                  className="w-full"
                >
                  Reconfigurar Credenciais
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <Key className="h-4 w-4" />
                  <AlertDescription>
                    Configure suas credenciais LN Markets para importar automaticamente trades, depósitos e saques.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={() => setShowLNMarketsForm(true)}
                  className="w-full"
                >
                  <Key className="mr-2 h-4 w-4" />
                  Configurar LN Markets API
                </Button>
              </div>
            )}

            {/* Formulário LN Markets */}
            {showLNMarketsForm && (
              <div className="mt-6 p-4 border border-purple-700/40 rounded-lg bg-black/20">
                <Form {...lnMarketsForm}>
                  <form onSubmit={lnMarketsForm.handleSubmit(handleSaveLNMarkets)} className="space-y-4">
                    <FormField
                      control={lnMarketsForm.control}
                      name="apiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Key</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showSensitiveFields.apiKey ? "text" : "password"}
                                placeholder="Sua API Key"
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full w-10"
                                onClick={() => toggleSensitiveField('apiKey')}
                              >
                                {showSensitiveFields.apiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={lnMarketsForm.control}
                      name="apiSecret"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Secret</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showSensitiveFields.apiSecret ? "text" : "password"}
                                placeholder="Seu API Secret"
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full w-10"
                                onClick={() => toggleSensitiveField('apiSecret')}
                              >
                                {showSensitiveFields.apiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={lnMarketsForm.control}
                      name="apiPassphrase"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Passphrase</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showSensitiveFields.apiPassphrase ? "text" : "password"}
                                placeholder="Sua API Passphrase"
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full w-10"
                                onClick={() => toggleSensitiveField('apiPassphrase')}
                              >
                                {showSensitiveFields.apiPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={lnMarketsForm.control}
                      name="network"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rede</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a rede" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="mainnet">Mainnet (Produção)</SelectItem>
                              <SelectItem value="testnet">Testnet (Teste)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={lnMarketsForm.handleSubmit(handleTestCredentials)}
                        disabled={isTestingCredentials}
                        className="flex-1"
                      >
                        {isTestingCredentials ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Testando...
                          </>
                        ) : (
                          <>
                            <TestTube2 className="mr-2 h-4 w-4" />
                            Testar
                          </>
                        )}
                      </Button>

                      <Button
                        type="submit"
                        disabled={isSavingLNMarkets}
                        className="flex-1"
                      >
                        {isSavingLNMarkets ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Salvar
                          </>
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowLNMarketsForm(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  )
} 