"use client"

import { useState, useEffect } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, AlertTriangle, RefreshCw, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { PageTransition } from "@/components/page-transition"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { VerifyEmailAlert } from "@/components/verify-email-alert"

// Esquema de validação para login
const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
})

// Esquema de validação para cadastro
const registerSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
})

type LoginFormValues = z.infer<typeof loginSchema>
type RegisterFormValues = z.infer<typeof registerSchema>

export default function AuthForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("login")
  const { signIn, signUp, retryConnection, isConnecting, connectionRetries } = useAuth()
  const { toast } = useToast()
  const [supabaseAvailable, setSupabaseAvailable] = useState(true)
  const [showEmailVerification, setShowEmailVerification] = useState(false)
  const [emailForVerification, setEmailForVerification] = useState("")

  // Efeito para verificar se o Supabase está disponível
  useEffect(() => {
    // Definir como indisponível se houver muitas tentativas de reconexão 
    // ou se estiver tentando reconectar (já falhou pelo menos uma vez)
    if (connectionRetries > 2 || isConnecting) {
      setSupabaseAvailable(false)
    } else {
      setSupabaseAvailable(true)
    }
  }, [connectionRetries, isConnecting])

  // Função auxiliar para detectar erros específicos do Supabase e
  // falhas de conexão com base no erro recebido
  const handleSupabaseError = (error: any): string => {
    // Mensagem padrão
    let message = "Ocorreu um erro inesperado."
    
    if (!error) return message
    
    // Verificar se é erro de conexão ou cliente não disponível
    if (typeof error.message === 'string') {
      // Erros de cliente não disponível
      if (error.message.includes("Cliente Supabase não disponível") || 
          error.message.includes("connection") || 
          error.message.includes("network") ||
          error.message.includes("Failed to fetch") ||
          error.message.includes("NetworkError") ||
          error.message.includes("timeout")) {
        
        setSupabaseAvailable(false)
        return "Serviço de autenticação indisponível no momento."
      }
      
      // Erros específicos de autenticação
      if (error.message.includes("Invalid login")) {
        return "Email ou senha incorretos."
      }
      
      if (error.message.includes("already registered")) {
        return "Este email já está cadastrado."
      }
      
      // Outros erros com mensagem - usar a própria mensagem
      if (error.message.length > 0) {
        return error.message
      }
    }
    
    return message
  }

  // Formulário de login
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  // Formulário de cadastro
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  // Função para realizar login
  const onLoginSubmit = async (data: LoginFormValues) => {
    // Verificar primeiro se o Supabase está disponível
    if (!supabaseAvailable) {
      toast({
        title: "Serviço indisponível",
        description: "Não foi possível conectar ao serviço de autenticação. Tente novamente mais tarde.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      const { error } = await signIn(data.email, data.password)
      
      if (error) {
        throw error
      }
      
      // Verificação bem-sucedida, esconder alerta de verificação de email
      setShowEmailVerification(false)
      
      toast({
        title: "Login realizado com sucesso",
        description: "Bem-vindo de volta!",
        variant: "success",
      })
    } catch (error: any) {
      // Usar a função auxiliar para tratar o erro
      const message = handleSupabaseError(error)
      
      // Verificar se o erro é relacionado a email não confirmado
      if (error?.message?.includes("Email not confirmed") || 
          error?.message?.includes("not verified") ||
          error?.message?.includes("não confirmado")) {
        
        // Mostrar mensagem específica e ativar alerta de verificação
        setShowEmailVerification(true)
        
        toast({
          title: "Email não verificado",
          description: "Por favor, verifique seu email para ativar sua conta.",
          variant: "warning",
        })
      } else {
        toast({
          title: "Erro ao fazer login",
          description: message,
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Função para realizar cadastro
  const onRegisterSubmit = async (data: RegisterFormValues) => {
    // Verificar primeiro se o Supabase está disponível
    if (!supabaseAvailable) {
      toast({
        title: "Serviço indisponível",
        description: "Não foi possível conectar ao serviço de autenticação. Tente novamente mais tarde.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      const { error } = await signUp(data.email, data.password, data.name)
      
      if (error) {
        throw error
      }
      
      // Ativar alerta de verificação de email e salvar o email
      setShowEmailVerification(true)
      setEmailForVerification(data.email)
      
      toast({
        title: "Cadastro realizado com sucesso",
        description: "Um link de confirmação foi enviado para seu email. Por favor, clique nele para ativar sua conta.",
        variant: "success",
        duration: 6000, // Duração maior para dar tempo de ler
      })
      
      // Limpar formulário e mudar para login
      registerForm.reset()
      setActiveTab("login")
    } catch (error: any) {
      // Usar a função auxiliar para tratar o erro
      const message = handleSupabaseError(error)
      
      toast({
        title: "Erro ao fazer cadastro",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Função para tentar reconectar ao Supabase
  const handleRetryConnection = () => {
    setIsLoading(true)
    
    // Exibir mensagem indicando tentativa de reconexão
    toast({
      title: "Tentando reconectar",
      description: "Aguarde enquanto nos reconectamos ao serviço...",
      variant: "default",
    })
    
    // Chamar a função de reconexão
    retryConnection()
    
    // Verificar resultado após um tempo razoável
    setTimeout(() => {
      // Se connectionRetries continuar alto, a reconexão falhou
      if (connectionRetries > 3) {
        setSupabaseAvailable(false)
        toast({
          title: "Falha na conexão",
          description: "Não foi possível conectar ao serviço. Tente novamente mais tarde.",
          variant: "destructive",
        })
      } else {
        // Reconexão bem-sucedida
        setSupabaseAvailable(true)
        toast({
          title: "Conectado com sucesso",
          description: "A conexão com o serviço foi restabelecida.",
          variant: "success",
        })
      }
      setIsLoading(false)
    }, 3000) // Aumentado para 3 segundos para dar tempo ao processo de reconexão
  }

  // Função para testar a conexão com o banco de dados
  const testDatabaseConnection = async () => {
    try {
      setIsLoading(true);
      toast({
        title: "Verificando banco de dados",
        description: "Tentando conectar ao Supabase...",
        variant: "default",
      });
      
      // Chamar a API de inicialização do banco
      const res = await fetch('/api/init-db');
      const data = await res.json();
      
      console.log('Resposta da API init-db:', data);
      
      if (data.success) {
        toast({
          title: "Conexão bem-sucedida",
          description: data.message,
          variant: "success",
        });
      } else {
        toast({
          title: "Erro na conexão",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      toast({
        title: "Falha na conexão",
        description: "Não foi possível se comunicar com a API. Verifique o console para mais detalhes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageTransition>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-bold text-center">
            Acesso ao Raid Toolkit
          </CardTitle>
          <CardDescription className="text-center">
            Entre com sua conta ou crie uma nova para salvar suas preferências
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!supabaseAvailable && (
            <Alert variant="destructive" className="mb-6 alert-supabase-error">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Serviço indisponível</AlertTitle>
              <AlertDescription className="flex flex-col md:flex-row items-start md:items-center mt-2">
                <span>Não foi possível conectar ao serviço de autenticação.</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2 md:mt-0 md:ml-2 hover:bg-red-900/20 border-red-700/50"
                  onClick={handleRetryConnection}
                  disabled={isLoading || isConnecting}
                >
                  {isLoading || isConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-3 w-3" />
                      Tentar novamente
                    </>
                  )}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Botão de diagnóstico para desenvolvedores */}
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={testDatabaseConnection}
              disabled={isLoading}
              className="text-xs px-2 h-8 opacity-70 hover:opacity-100"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <AlertCircle className="h-3 w-3 mr-1" />
              )}
              Testar Conexão DB
            </Button>
          </div>
          
          {/* Alerta de verificação de email */}
          {showEmailVerification && (
            <VerifyEmailAlert email={emailForVerification || loginForm.getValues().email} />
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Cadastro</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="seu@email.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu nome" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="seu@email.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Senha</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cadastrando...
                      </>
                    ) : (
                      "Cadastrar"
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-4">
          <p className="text-sm text-muted-foreground">
            {activeTab === "login" 
              ? "Não tem uma conta? " 
              : "Já tem uma conta? "}
            <Button 
              variant="link" 
              className="px-0" 
              onClick={() => setActiveTab(activeTab === "login" ? "register" : "login")}
            >
              {activeTab === "login" ? "Cadastre-se" : "Faça login"}
            </Button>
          </p>
        </CardFooter>
      </Card>
    </PageTransition>
  )
} 