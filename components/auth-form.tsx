"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { UserCredentials, UserRegistration } from "@/lib/supabase";
import { PageTransition } from "./page-transition";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Esquema de validação para o formulário de login
const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
});

// Esquema de validação para o formulário de cadastro (estende o esquema de login)
const registerSchema = loginSchema.extend({
  username: z.string().min(3, "O nome de usuário deve ter no mínimo 3 caracteres"),
  confirmPassword: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

type AuthFormProps = {
  type: "login" | "register";
};

export function AuthForm({ type }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn, signUp } = useAuth();
  
  const isRegister = type === "register";
  const schema = isRegister ? registerSchema : loginSchema;

  const form = useForm<LoginFormValues | RegisterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      ...(isRegister && { username: "", confirmPassword: "" }),
    },
  });

  async function onSubmit(values: LoginFormValues | RegisterFormValues) {
    setIsLoading(true);
    setError(null);
    
    try {
      if (isRegister) {
        // Cadastrar novo usuário
        const registerData = values as RegisterFormValues;
        await signUp({
          email: registerData.email,
          password: registerData.password,
          username: registerData.username,
        });
      } else {
        // Fazer login
        const loginData = values as LoginFormValues;
        await signIn({
          email: loginData.email,
          password: loginData.password,
        });
      }
    } catch (error: any) {
      console.error("Erro de autenticação:", error);
      // Traduzir mensagens de erro comuns do Supabase
      const errorMessage = error.message || "";
      let translatedError = "";
      
      if (errorMessage.includes("Invalid login credentials")) {
        translatedError = "Credenciais inválidas. Verifique seu email e senha.";
      } else if (errorMessage.includes("Email not confirmed")) {
        translatedError = "Email não confirmado. Verifique sua caixa de entrada.";
      } else if (errorMessage.includes("User already registered")) {
        translatedError = "Este email já está registrado. Tente fazer login.";
      } else {
        translatedError = "Ocorreu um erro. Tente novamente mais tarde.";
      }
      
      setError(translatedError);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <PageTransition>
      <Card className="w-full max-w-md mx-auto border-indigo-900/30 bg-black/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl text-center text-indigo-300">
            {isRegister ? "Criar nova conta" : "Entrar na sua conta"}
          </CardTitle>
          <CardDescription className="text-center text-indigo-400/80">
            {isRegister 
              ? "Preencha os dados abaixo para criar sua conta" 
              : "Entre com suas credenciais para acessar o sistema"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4 bg-red-900/20 border-red-800/50 text-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {isRegister && (
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-indigo-200">Nome de usuário</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Digite seu nome de usuário" 
                          disabled={isLoading} 
                          {...field}
                          className="border-indigo-900/50 bg-indigo-950/40 focus-visible:ring-indigo-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-indigo-200">Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Digite seu email" 
                        type="email" 
                        disabled={isLoading} 
                        {...field}
                        className="border-indigo-900/50 bg-indigo-950/40 focus-visible:ring-indigo-500" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-indigo-200">Senha</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Digite sua senha" 
                        type="password" 
                        disabled={isLoading} 
                        {...field}
                        className="border-indigo-900/50 bg-indigo-950/40 focus-visible:ring-indigo-500" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {isRegister && (
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-indigo-200">Confirmar senha</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Confirme sua senha" 
                          type="password" 
                          disabled={isLoading} 
                          {...field}
                          className="border-indigo-900/50 bg-indigo-950/40 focus-visible:ring-indigo-500" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <Button 
                type="submit" 
                className="w-full bg-indigo-800 hover:bg-indigo-700" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isRegister ? "Criando conta..." : "Entrando..."}
                  </>
                ) : (
                  isRegister ? "Criar conta" : "Entrar"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center text-indigo-300/80">
            {isRegister ? "Já tem uma conta?" : "Não tem uma conta?"}
            <Link 
              href={isRegister ? "/login" : "/register"} 
              className="ml-1 font-semibold text-indigo-400 hover:text-indigo-300"
            >
              {isRegister ? "Entrar" : "Criar conta"}
            </Link>
          </div>
        </CardFooter>
      </Card>
    </PageTransition>
  );
} 