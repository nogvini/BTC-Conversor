"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Camera, Save, User, Eye, EyeOff, Key, TestTube2, Shield, Trash2, Zap, Plus, Star } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

// Imports para LN Markets
import type { LNMarketsCredentials, LNMarketsAPIConfig, LNMarketsMultipleConfig } from "@/components/types/ln-markets-types"
import { 
  storeLNMarketsCredentials, 
  retrieveLNMarketsCredentials, 
  removeLNMarketsCredentials,
  maskSensitiveData,
  retrieveLNMarketsMultipleConfigs,
  addLNMarketsConfig,
  updateLNMarketsConfig,
  removeLNMarketsConfig,
  setDefaultLNMarketsConfig,
  getLNMarketsConfig
} from "@/lib/encryption"

// Função para testar credenciais via API route
const testLNMarketsCredentials = async (credentials: LNMarketsCredentials): Promise<boolean> => {
  try {
    console.log('[User Profile] Testando credenciais via API...');
    
    const response = await fetch('/api/ln-markets/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ credentials }),
    });

    const data = await response.json();
    
    console.log('[User Profile] Resposta do teste:', {
      ok: response.ok,
      success: data.success,
      error: data.error
    });

    return response.ok && data.success;
  } catch (error) {
    console.error('[User Profile] Erro ao testar credenciais:', error);
    return false;
  }
};

// CSS personalizado para responsividade
const customStyles = `
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }
  
  .config-card {
    transition: all 0.3s ease;
  }
  
  .config-card:hover {
    border-color: rgb(147 51 234 / 0.6);
    background-color: rgb(147 51 234 / 0.05);
  }
  
  .config-field {
    min-height: 60px;
    transition: all 0.2s ease;
  }
  
  .config-field:hover {
    background-color: rgb(0 0 0 / 0.4);
  }
  
  @media (max-width: 640px) {
    .config-actions {
      justify-content: center;
    }
    
    .config-field {
      min-height: 50px;
    }
  }
`;

// Esquema de validação para o perfil
const profileSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  avatar_url: z.string().optional(),
})

// Esquema de validação para credenciais LN Markets
const lnMarketsSchema = z.object({
  key: z.string().min(10, "API Key deve ter pelo menos 10 caracteres"),
  secret: z.string().min(10, "API Secret deve ter pelo menos 10 caracteres"),
  passphrase: z.string().min(1, "API Passphrase é obrigatório"),
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
    key: false,
    secret: false,
    passphrase: false,
  })
  
  // Estados para múltiplas configurações LN Markets
  const [multipleConfigs, setMultipleConfigs] = useState<LNMarketsMultipleConfig | null>(null);
  const [isAddingNewConfig, setIsAddingNewConfig] = useState(false);
  const [newConfigForm, setNewConfigForm] = useState({
    name: "",
    description: "",
    key: "",
    secret: "",
    passphrase: "",
    network: "mainnet" as "mainnet" | "testnet"
  });
  
  // Estado para controlar a exibição do diálogo de confirmação de exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [configToDelete, setConfigToDelete] = useState<{ id: string, name: string } | null>(null)
  
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
      key: "",
      secret: "",
      passphrase: "",
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

  // Effect para carregar múltiplas configurações
  useEffect(() => {
    if (user?.email) {
      const configs = retrieveLNMarketsMultipleConfigs(user.email);
      setMultipleConfigs(configs);
    }
  }, [user?.email]);

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
        key: "",
        secret: "",
        passphrase: "",
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

  // Funções para gerenciar configurações
  const handleAddNewConfig = async () => {
    if (!user?.email || !newConfigForm.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome da configuração é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    // Validar se todos os campos estão preenchidos
    if (!newConfigForm.key || !newConfigForm.secret || !newConfigForm.passphrase) {
      toast({
        title: "Erro",
        description: "Todos os campos da API são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const newConfig = {
      name: newConfigForm.name.trim(),
      description: newConfigForm.description.trim() || undefined,
      credentials: {
        key: newConfigForm.key,
        secret: newConfigForm.secret,
        passphrase: newConfigForm.passphrase,
        network: newConfigForm.network,
        isConfigured: true
      },
      isActive: true
    };

    const configId = addLNMarketsConfig(user.email, newConfig);
    
    if (configId) {
      // Recarregar configurações
      const updatedConfigs = retrieveLNMarketsMultipleConfigs(user.email);
      setMultipleConfigs(updatedConfigs);
      
      // Resetar formulário
      setNewConfigForm({
        name: "",
        description: "",
        key: "",
        secret: "",
        passphrase: "",
        network: "mainnet" as "mainnet" | "testnet"
      });
      setIsAddingNewConfig(false);
      
      toast({
        title: "Configuração Adicionada",
        description: `Configuração "${newConfig.name}" foi adicionada com sucesso.`,
        variant: "default",
      });
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a configuração.",
        variant: "destructive",
      });
    }
  };

  // Função para iniciar o processo de remoção da configuração
  const initiateRemoveConfig = (configId: string, configName: string) => {
    setConfigToDelete({ id: configId, name: configName });
    setDeleteDialogOpen(true);
  };

  // Função para confirmar a remoção da configuração
  const confirmRemoveConfig = () => {
    if (!user?.email || !configToDelete) return;

    const success = removeLNMarketsConfig(user.email, configToDelete.id);
    
    if (success) {
      const updatedConfigs = retrieveLNMarketsMultipleConfigs(user.email);
      setMultipleConfigs(updatedConfigs);
      
      toast({
        title: "Configuração Removida",
        description: `Configuração "${configToDelete.name}" foi removida com sucesso.`,
        variant: "default",
      });
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível remover a configuração.",
        variant: "destructive",
      });
    }

    // Limpar o estado após a operação
    setConfigToDelete(null);
  };

  const handleSetDefaultConfig = (configId: string) => {
    if (!user?.email) return;

    const success = setDefaultLNMarketsConfig(user.email, configId);
    
    if (success) {
      const updatedConfigs = retrieveLNMarketsMultipleConfigs(user.email);
      setMultipleConfigs(updatedConfigs);
      
      toast({
        title: "Configuração Padrão",
        description: "Nova configuração padrão definida com sucesso.",
        variant: "default",
      });
    }
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
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
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

        {/* Seção LN Markets - Múltiplas Configurações */}
        <Card className="bg-black/30 backdrop-blur-sm border border-purple-700/40">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Configurações LN Markets
                </CardTitle>
                <CardDescription>
                  Gerencie múltiplas contas da API LN Markets para importação de dados
                </CardDescription>
              </div>
              <Button
                onClick={() => setIsAddingNewConfig(true)}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Nova Configuração
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Lista de configurações existentes */}
            {multipleConfigs && multipleConfigs.configs.length > 0 ? (
              <div className="space-y-4">
                {multipleConfigs.configs.map((config) => (
                  <div key={config.id} className="p-4 border border-purple-700/30 rounded-lg overflow-hidden config-card">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-medium text-white truncate max-w-[200px]">
                            {config.name}
                          </h3>
                          {multipleConfigs.defaultConfigId === config.id && (
                            <Badge variant="default" className="text-xs shrink-0">Padrão</Badge>
                          )}
                        </div>
                        {config.description && (
                          <p className="text-sm text-purple-300 break-words line-clamp-2 mb-1">
                            {config.description}
                          </p>
                        )}
                        <p className="text-xs text-purple-400 break-all">
                          <span className="inline-block">Rede: {config.credentials.network}</span>
                          <span className="hidden sm:inline"> • </span>
                          <span className="block sm:inline">Criada: {new Date(config.createdAt).toLocaleDateString()}</span>
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 shrink-0 config-actions">
                        {multipleConfigs.defaultConfigId !== config.id && (
                          <Button
                            onClick={() => handleSetDefaultConfig(config.id)}
                            size="sm"
                            variant="outline"
                            className="border-yellow-500 text-yellow-400 min-w-[40px]"
                            title="Definir como padrão"
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        
                        <Button
                          onClick={() => initiateRemoveConfig(config.id, config.name)}
                          size="sm"
                          variant="outline"
                          className="border-red-500 text-red-400 min-w-[40px]"
                          title="Remover configuração"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Informações mascaradas da API - Layout responsivo melhorado */}
                    <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-1 lg:grid-cols-3 gap-3">
                      <div className="bg-black/20 p-3 rounded border border-purple-700/20 config-field">
                        <span className="text-purple-400 text-xs font-medium block mb-1">API Key:</span>
                        <p className="text-white font-mono text-xs break-all select-all">
                          {maskSensitiveData(config.credentials.key, 6)}
                        </p>
                      </div>
                      <div className="bg-black/20 p-3 rounded border border-purple-700/20 config-field">
                        <span className="text-purple-400 text-xs font-medium block mb-1">Secret:</span>
                        <p className="text-white font-mono text-xs break-all select-all">
                          {maskSensitiveData(config.credentials.secret, 6)}
                        </p>
                      </div>
                      <div className="bg-black/20 p-3 rounded border border-purple-700/20 config-field">
                        <span className="text-purple-400 text-xs font-medium block mb-1">Passphrase:</span>
                        <p className="text-white font-mono text-xs break-all select-all">
                          {maskSensitiveData(config.credentials.passphrase, 4)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // CORRIGIDO: Só mostrar mensagem de "nenhuma configuração" se não estiver adicionando nova
              !isAddingNewConfig && (
                <div className="text-center py-8">
                  <Zap className="h-12 w-12 text-purple-400 mx-auto mb-3" />
                  <p className="text-purple-300">Nenhuma configuração LN Markets encontrada</p>
                  <p className="text-sm text-purple-400">Adicione sua primeira configuração para começar</p>
                </div>
              )
            )}

            {/* Formulário para nova configuração */}
            {isAddingNewConfig && (
              <div className="p-4 border border-green-500/30 rounded-lg bg-green-500/5">
                <h3 className="font-medium text-white mb-4 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Configuração LN Markets
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-400 mb-1">
                      Nome da Configuração *
                    </label>
                    <input
                      type="text"
                      value={newConfigForm.name}
                      onChange={(e) => setNewConfigForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-black/50 border border-purple-700/50 rounded-md text-white"
                      placeholder="Ex: Conta Principal, Trading Account"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-purple-400 mb-1">
                      Rede
                    </label>
                    <select
                      value={newConfigForm.network}
                      onChange={(e) => setNewConfigForm(prev => ({ ...prev, network: e.target.value as "mainnet" | "testnet" }))}
                      className="w-full px-3 py-2 bg-black/50 border border-purple-700/50 rounded-md text-white"
                    >
                      <option value="mainnet">Mainnet</option>
                      <option value="testnet">Testnet</option>
                    </select>
                  </div>


                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-purple-400 mb-1">
                    Descrição (opcional)
                  </label>
                  <textarea
                    value={newConfigForm.description}
                    onChange={(e) => setNewConfigForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-black/50 border border-purple-700/50 rounded-md text-white resize-none"
                    rows={2}
                    placeholder="Descrição da configuração..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-400 mb-1">
                      API Key *
                    </label>
                    <input
                      type="text"
                      value={newConfigForm.key}
                      onChange={(e) => setNewConfigForm(prev => ({ ...prev, key: e.target.value }))}
                      className="w-full px-3 py-2 bg-black/50 border border-purple-700/50 rounded-md text-white"
                      placeholder="Sua API Key"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-purple-400 mb-1">
                      Secret *
                    </label>
                    <input
                      type="password"
                      value={newConfigForm.secret}
                      onChange={(e) => setNewConfigForm(prev => ({ ...prev, secret: e.target.value }))}
                      className="w-full px-3 py-2 bg-black/50 border border-purple-700/50 rounded-md text-white"
                      placeholder="Seu Secret"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-purple-400 mb-1">
                      Passphrase *
                    </label>
                    <input
                      type="password"
                      value={newConfigForm.passphrase}
                      onChange={(e) => setNewConfigForm(prev => ({ ...prev, passphrase: e.target.value }))}
                      className="w-full px-3 py-2 bg-black/50 border border-purple-700/50 rounded-md text-white"
                      placeholder="Sua Passphrase"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-6">
                  <Button
                    onClick={handleAddNewConfig}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Salvar Configuração
                  </Button>
                  
                  <Button
                    onClick={() => {
                      setIsAddingNewConfig(false);
                      setNewConfigForm({
                        name: "",
                        description: "",
                        key: "",
                        secret: "",
                        passphrase: "",
                        network: "mainnet" as "mainnet" | "testnet"
                      });
                    }}
                    variant="outline"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de confirmação para excluir configuração */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-zinc-900 border border-purple-700/30">
            <AlertDialogHeader>
              <AlertDialogTitle>Remover Configuração</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover a configuração "{configToDelete?.name}"?
                <br />
                <span className="text-yellow-500">Esta ação não pode ser desfeita.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-purple-700/30">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmRemoveConfig}
                className="bg-red-600 hover:bg-red-700"
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageTransition>
  )
} 