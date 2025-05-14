"use client"

import { useState, useEffect } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { AlertTriangle } from "lucide-react"
import { RefreshCw } from "lucide-react"
import { AlertCircle } from "lucide-react"
import { XCircle } from "lucide-react"
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
import { useRouter } from "next/navigation"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle
} from "@/components/ui/alert-dialog"

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

export function AuthForm({ type = "login" }: { type?: "login" | "register" }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<string>(type)
  const { signIn, signUp, retryConnection, isConnecting, connectionRetries, session } = useAuth()
  const { toast } = useToast()
  const [supabaseAvailable, setSupabaseAvailable] = useState(true)
  const [showEmailVerification, setShowEmailVerification] = useState(false)
  const [hasExpiredEmailLink, setHasExpiredEmailLink] = useState(false)
  const [emailForVerification, setEmailForVerification] = useState("")
  const [showNoProfileDialog, setShowNoProfileDialog] = useState(false)
  const [loginEmail, setLoginEmail] = useState("")
  const [loginError, setLoginError] = useState<string | null>(null)
  const [registerError, setRegisterError] = useState<string | null>(null)
  const [redirectInProgress, setRedirectInProgress] = useState(false)

  // Verificar se já há um usuário logado e redirecionar para a página inicial
  useEffect(() => {
    // Se há um usuário autenticado e não estamos carregando, redirecionar
    if (session.user && !session.isLoading && !redirectInProgress) {
      console.log('Usuário já autenticado, redirecionando para a página inicial...');
      
      // Marcar que o redirecionamento já está em andamento para evitar múltiplas chamadas
      setRedirectInProgress(true);
      
      toast({
        title: "Você já está logado",
        description: "Redirecionando para a página inicial...",
        variant: "default",
      });
      
      // Usar redirecionamento direto via window.location para garantir navegação completa
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    }
  }, [session.user, session.isLoading, toast, redirectInProgress]);

  // Verificar se há parâmetros na URL que indicam erro no link de verificação
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.hash.substring(1));
      const error = urlParams.get('error');
      const errorCode = urlParams.get('error_code');
      const errorDescription = urlParams.get('error_description');
      
      // Verificar se é um erro de token expirado (OTP expirado)
      if (error === 'access_denied' && errorCode === 'otp_expired') {
        console.log('Link de verificação expirado detectado:', errorDescription);
        setHasExpiredEmailLink(true);
        setShowEmailVerification(true);
        
        // Tentar extrair o email do erro ou usar o último email conhecido
        const emailMatch = errorDescription?.match(/for\s+(.+@.+\..+)/i);
        if (emailMatch && emailMatch[1]) {
          setEmailForVerification(emailMatch[1]);
        }
        
        toast({
          title: "Link expirado",
          description: "O link de verificação expirou. Solicite um novo.",
          variant: "destructive",
        });
        
        // Limpar a URL para não mostrar o erro repetidamente em reloads
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    }
  }, [toast]);

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
      // Erro de configuração do sistema
      if (error.message.includes("Erro de configuração do sistema") ||
          error.message.includes("Entre em contato com o administrador")) {
        setSupabaseAvailable(false)
        return "Erro de configuração do sistema. Entre em contato com o administrador."
      }
      
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
    mode: "onChange"
  })
  console.log('[AuthForm] Componente AuthForm RENDERIZADO.'); // Log de renderização

  // Formulário de cadastro
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onChange"
  })

  // Função para realizar login
  const onLoginSubmit = async (data: LoginFormValues) => {
    console.log('!!!! [AuthForm] onLoginSubmit CHAMADA - PRIMEIRO LOG !!!!', data); // <--- LOG MAIS ALTO POSSÍVEL

    console.log('[AuthForm] onLoginSubmit INICIADO. Dados do formulário:', data); // LOG 1

    // Resetar mensagem de erro ao tentar novamente
    setLoginError(null)
    
    // Verificar primeiro se o Supabase está disponível
    if (!supabaseAvailable) {
      toast({
        title: "Serviço indisponível",
        description: "Não foi possível conectar ao serviço de autenticação. Tente novamente mais tarde.",
        variant: "destructive",
      })
      return
    }

    // ADICIONAR VERIFICAÇÃO DE SEGURANÇA
    if (!session) { // session aqui é o objeto completo do useAuth()
      console.error('[AuthForm] onLoginSubmit: ERRO CRÍTICO - AuthContext (session do useAuth) é NULO OU INDEFINIDO!');
      toast({
        title: "Erro Interno",
        description: "Contexto de autenticação não disponível.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    console.log('[AuthForm] onLoginSubmit: AuthContext (session do useAuth) obtido:', session); // LOG 2
    console.log('[AuthForm] onLoginSubmit: Verificando session.signIn - typeof:', typeof signIn); // LOG 3 (signIn já está desestruturado)

    if (typeof signIn !== 'function') {
      console.error('[AuthForm] onLoginSubmit: ERRO CRÍTICO - signIn (desestruturado de useAuth) NÃO é uma função!');
      toast({
        title: "Erro Interno",
        description: "Funcionalidade de login indisponível (signIn inválido).",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true)
      setLoginEmail(data.email)
      console.log('[AuthForm] onLoginSubmit: TENTANDO CHAMAR signIn com email:', data.email); // LOG 4
      
      const { error, profileNotFound } = await signIn(data.email, data.password)
      
      console.log('[AuthForm] onLoginSubmit: Resultado de signIn:', { error, profileNotFound }); // LOG 5
      
      if (error) {
        throw error
      }

      // Verificar se o perfil não foi encontrado
      if (profileNotFound) {
        console.log('Perfil não encontrado para o usuário:', data.email)
        
        setShowNoProfileDialog(true)
        return
      }
      
      // Verificação bem-sucedida, esconder alerta de verificação de email
      setShowEmailVerification(false)
      
      // Exibir toast de sucesso
      toast({
        title: "Login realizado com sucesso",
        description: "Bem-vindo de volta! Redirecionando...",
        variant: "success",
      })
      
      // Simplificar o processo de redirecionamento
      console.log('REDIRECIONAMENTO DIRETO: Indo para a página inicial...')
      
      // Desativar o estado de loading
      setIsLoading(false)
      
      // Redirecionamento direto sem atrasos ou complicações
      window.location.href = '/'
      
    } catch (error: any) {
      // Usar a função auxiliar para tratar o erro
      const message = handleSupabaseError(error)
      console.error('Erro durante login:', error)
      
      // Definir a mensagem de erro para exibição no formulário
      setLoginError(message)
      
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
    console.log('[AuthForm] onLoginSubmit FINALIZADO.'); // LOG 7
  }

  // Função para realizar cadastro
  const onRegisterSubmit = async (data: RegisterFormValues) => {
    // Resetar mensagem de erro ao tentar novamente
    setRegisterError(null)

    // Verificar primeiro se o Supabase está disponível
    if (!supabaseAvailable) {
      toast({
        title: "Serviço indisponível",
        description: "Não foi possível conectar ao serviço de autenticação. Tente novamente mais tarde.",
        variant: "destructive",
      })
      return
    }

    // ADICIONAR VERIFICAÇÃO DE SEGURANÇA
    if (typeof signUp !== 'function') {
      console.error("AuthForm: signUp function is not available or not a function.", { signUpFunction: signUp });
      toast({
        title: "Erro Interno",
        description: "A funcionalidade de cadastro está temporariamente indisponível. Tente novamente mais tarde.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
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
      
      // Definir a mensagem de erro para exibição no formulário
      setRegisterError(message)
      
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

    // ADICIONAR VERIFICAÇÃO DE SEGURANÇA
    if (typeof retryConnection !== 'function') {
      console.error("AuthForm: retryConnection function is not available or not a function.", { retryConnectionFunction: retryConnection });
      toast({
        title: "Erro Interno",
        description: "A funcionalidade de reconexão está temporariamente indisponível.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
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

  // Efeito para debug - monitorar a sessão atual
  useEffect(() => {
    if (session.user) {
      console.log('Sessão atual:', { 
        usuarioLogado: true, 
        id: session.user.id,
        email: session.user.email
      });
    } else if (!session.isLoading) {
      console.log('Nenhum usuário logado');
    }
  }, [session]);

  // Função para lidar com o fechamento do diálogo de perfil não encontrado
  const handleNoProfileDialogClose = () => {
    setShowNoProfileDialog(false)
    // Mudar para a aba de registro e preencher o email
    setActiveTab("register")
    
    // Preencher o email automaticamente no formulário de registro
    if (loginEmail) {
      registerForm.setValue("email", loginEmail)
    }
    
    // Log de debug
    console.log('Diálogo de perfil não encontrado fechado, mudando para a aba de registro')
  }

  // Função para limpar erros quando o usuário muda de aba
  useEffect(() => {
    setLoginError(null);
    setRegisterError(null);
  }, [activeTab]);

  // Adicionar um componente de alerta para problemas de configuração
  function ConfigurationErrorAlert() {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle>Configuração incorreta</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            O sistema não está configurado corretamente. As variáveis de ambiente
            necessárias para o Supabase não estão definidas.
          </p>
          <div className="bg-black/30 p-3 rounded text-xs font-mono mt-2 border border-red-500/30">
            <p>Crie um arquivo <strong>.env.local</strong> na raiz do projeto com:</p>
            <pre className="mt-2 text-gray-300">
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
            </pre>
          </div>
          <p className="text-sm mt-2">
            Após criar o arquivo, reinicie o servidor de desenvolvimento.
          </p>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <PageTransition>
      {/* AlertDialog para perfil não encontrado */}
      <AlertDialog open={showNoProfileDialog} onOpenChange={setShowNoProfileDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Perfil não registrado</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Suas credenciais de autenticação estão corretas, mas você ainda não possui um perfil completo no sistema.
              </p>
              <p>
                Isso pode acontecer se:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Você se cadastrou anteriormente mas não completou o registro</li>
                <li>Sua conta foi criada por um administrador sem um perfil associado</li>
              </ul>
              <p className="font-medium text-primary">
                Por favor, preencha o formulário de cadastro para criar seu perfil e acessar o sistema.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleNoProfileDialogClose}>
              Ir para o cadastro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
          
          {/* Alerta para erros de configuração do sistema */}
          {!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? (
            <ConfigurationErrorAlert />
          ) : null}
          
          {/* Ferramentas de desenvolvimento - Apenas visíveis em modo de desenvolvimento */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-slate-800 rounded-md p-3 mb-4 border border-slate-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-400">MODO DE DESENVOLVIMENTO</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={testDatabaseConnection}
                  disabled={isLoading}
                  className="text-xs px-2 h-7"
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <AlertCircle className="h-3 w-3 mr-1" />
                  )}
                  Testar Conexão DB
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                <div>Status de conexão: 
                  <span className={supabaseAvailable ? "text-green-400 ml-1" : "text-red-400 ml-1"}>
                    {supabaseAvailable ? "Conectado" : "Desconectado"}
                  </span>
                </div>
                <div>Tentativas: <span className="text-amber-400">{connectionRetries}</span></div>
                <div>Tab ativa: <span className="text-amber-400">{activeTab}</span></div>
                <div>Ambiente: <span className="text-amber-400">{process.env.NODE_ENV}</span></div>
              </div>
            </div>
          )}
          
          {/* Alerta de verificação de email */}
          {showEmailVerification && (
            <VerifyEmailAlert 
              email={emailForVerification || loginForm.getValues().email} 
              hasExpiredError={hasExpiredEmailLink}
            />
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Cadastro</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              {loginError && (
                <Alert variant="destructive" className="mb-4">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Erro de autenticação</AlertTitle>
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}
              
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="seu@email.com" 
                            type="email" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e);
                              // Limpar erro quando o usuário começa a corrigir o campo
                              if (loginError) setLoginError(null);
                            }}
                            className={loginError ? "border-red-500 focus-visible:ring-red-500" : ""}
                          />
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
                          <Input 
                            type="password" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e);
                              // Limpar erro quando o usuário começa a corrigir o campo
                              if (loginError) setLoginError(null);
                            }}
                            className={loginError ? "border-red-500 focus-visible:ring-red-500" : ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="text-xs text-muted-foreground mt-1 mb-2">
                    <p>
                      Esqueceu sua senha? Entre em contato com o administrador do sistema.
                    </p>
                  </div>
                  
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
              {registerError && (
                <Alert variant="destructive" className="mb-4">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Erro no cadastro</AlertTitle>
                  <AlertDescription>{registerError}</AlertDescription>
                </Alert>
              )}
              
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Seu nome" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e);
                              if (registerError) setRegisterError(null);
                            }}
                            className={registerError ? "border-red-500 focus-visible:ring-red-500" : ""}
                          />
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
                          <Input 
                            placeholder="seu@email.com" 
                            type="email" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e);
                              if (registerError) setRegisterError(null);
                            }}
                            className={registerError ? "border-red-500 focus-visible:ring-red-500" : ""}
                          />
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
                          <Input 
                            type="password" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e);
                              if (registerError) setRegisterError(null);
                            }}
                            className={registerError ? "border-red-500 focus-visible:ring-red-500" : ""}
                          />
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
                          <Input 
                            type="password" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e);
                              if (registerError) setRegisterError(null);
                            }}
                            className={registerError ? "border-red-500 focus-visible:ring-red-500" : ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="text-xs text-muted-foreground mt-1 mb-2">
                    <p>
                      Ao se cadastrar, você concorda com os termos de uso e política de privacidade.
                    </p>
                  </div>
                  
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

export default AuthForm 