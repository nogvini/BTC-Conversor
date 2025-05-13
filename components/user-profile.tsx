"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { censorEmail } from "@/lib/utils"
import { CheckCircle2 } from "lucide-react"

// Importar as novas funções da API do cliente
import {
  saveLnMarketsCredentials,
  testLnMarketsConnection,
  fetchLnMarketsCredentialsStatus,
} from "@/lib/client-api"

const UserProfile: React.FC = () => {
  const { user, session, isLoading, error: authError } = useAuth()
  const { toast } = useToast()

  // State for Personal Information
  const [name, setName] = useState<string>("")
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false)
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false)

  // State for LNMarkets Credentials
  const [lnMarketsApiKey, setLnMarketsApiKey] = useState<string>("")
  const [lnMarketsApiSecret, setLnMarketsApiSecret] = useState<string>("")
  const [lnMarketsApiPassphrase, setLnMarketsApiPassphrase] = useState<string>("")
  const [isSavingLnMarkets, setIsSavingLnMarkets] = useState<boolean>(false)
  const [isTestingLnMarkets, setIsTestingLnMarkets] = useState<boolean>(false)
  const [lnMarketsConfigured, setLnMarketsConfigured] = useState<boolean | null>(null)

  useEffect(() => {
    if (user) {
      setName(user.name || user.email?.split('@')[0] || "")

      // Fetch LNMarkets credentials status usando a função importada
      const fetchStatus = async () => {
        try {
          setLnMarketsConfigured(null)
          const status = await fetchLnMarketsCredentialsStatus()
          setLnMarketsConfigured(status.configured)
          if (status.configured) {
            console.log("Credenciais LNMarkets já configuradas (status via client-api).")
          }
        } catch (fetchError: any) {
          console.error("Erro ao buscar status das credenciais LNMarkets (via client-api):", fetchError)
          toast({
            title: "Erro ao verificar credenciais",
            description: fetchError.message || "Não foi possível verificar o status das credenciais LNMarkets.",
            variant: "destructive",
          })
          setLnMarketsConfigured(false)
        }
      }
      fetchStatus()
    }
  }, [user, toast])

  const handleUpdateProfile = async () => {
    if (!user) return
    setIsSavingProfile(true)
    console.log("Atualizando perfil:", { name })
    try {
      // TODO: Substituir pela chamada real ao Supabase ou backend
      // await supabase.auth.updateUser({ data: { name } });
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Simular chamada
      toast({
        title: "Perfil Atualizado",
        description: "Suas informações foram salvas com sucesso.",
        variant: "default",
      })
      setIsEditingProfile(false)
    } catch (updateError: any) {
      toast({
        title: "Erro ao atualizar perfil",
        description: updateError.message || "Não foi possível salvar suas informações.",
        variant: "destructive",
      })
    }
    setIsSavingProfile(false)
  }

  const handleSaveLnMarketsCredentials = async () => {
    if (!user) return
    if (!lnMarketsApiKey || !lnMarketsApiSecret || !lnMarketsApiPassphrase) {
      toast({
        title: "Campos Obrigatórios",
        description: "Por favor, preencha todos os campos de credenciais da LNMarkets.",
        variant: "destructive",
      })
      return
    }
    setIsSavingLnMarkets(true)
    try {
      // Chamar a função importada de client-api
      await saveLnMarketsCredentials({
        apiKey: lnMarketsApiKey,
        apiSecret: lnMarketsApiSecret,
        apiPassphrase: lnMarketsApiPassphrase,
      })
      toast({
        title: `Credenciais ${lnMarketsConfigured ? "Atualizadas" : "Salvas"}`,
        description: "Suas credenciais LNMarkets foram armazenadas com segurança.",
        variant: "default",
      })
      setLnMarketsConfigured(true)
      // Opcional: Limpar campos após salvar? Decidir UX.
      // setLnMarketsApiKey(""); 
      // setLnMarketsApiSecret("");
      // setLnMarketsApiPassphrase("");
    } catch (saveError: any) {
      toast({
        title: "Erro ao Salvar Credenciais",
        description: saveError.message || "Não foi possível salvar suas credenciais LNMarkets.",
        variant: "destructive",
      })
    } finally {
      setIsSavingLnMarkets(false)
    }
  }
  
  // Test Connection Handler
  const handleTestLnMarketsConnection = async () => {
    if (!user) return
    if (!lnMarketsApiKey || !lnMarketsApiSecret || !lnMarketsApiPassphrase) {
       toast({
        title: "Credenciais Ausentes",
        description: "Preencha os campos de API Key, Secret e Passphrase para testar a conexão.",
        variant: "destructive",
      })
      return
    }
    setIsTestingLnMarkets(true)
    toast({ title: "Testando Conexão...", description: "Aguarde um momento." })
    try {
      // Chamar a função importada de client-api
      await testLnMarketsConnection({
        apiKey: lnMarketsApiKey,
        apiSecret: lnMarketsApiSecret,
        apiPassphrase: lnMarketsApiPassphrase,
      })
      toast({ 
        title: "Conexão Bem-Sucedida!", 
        description: "As credenciais da LNMarkets são válidas.", 
        variant: "default" // Usar 'success' se disponível
      })
    } catch (testError: any) {
      toast({ 
        title: "Falha na Conexão", 
        description: testError.message || "Não foi possível conectar à LNMarkets. Verifique suas credenciais.", 
        variant: "destructive" 
      })
    } finally {
      setIsTestingLnMarkets(false)
    }
  }

  if (isLoading || lnMarketsConfigured === null) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-1/4 mb-2" />
        <Skeleton className="h-4 w-1/2 mb-6" />
        {/* Skeleton for Profile Card */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3 mb-1" />
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-24" />
          </CardFooter>
        </Card>
        {/* Skeleton for LNMarkets Card */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3 mb-1" />
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (authError) {
    return (
      <div className="text-red-500 p-4 md:p-6 max-w-3xl mx-auto">
        Erro ao carregar perfil: {authError.message}
      </div>
    )
  }

  if (!user || !session) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        Você precisa estar logado para ver seu perfil.
      </div>
    )
  }

  const displayEmail = censorEmail(user.email)

  return (
    <div className="space-y-8 p-4 md:p-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Meu Perfil</h1>
        <p className="text-muted-foreground">
          Gerencie as informações da sua conta e integrações.
        </p>
      </div>

      <Card className="bg-background/70 dark:bg-black/60 border border-border shadow-md rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl">Informações Pessoais</CardTitle>
          <CardDescription className="text-muted-foreground">
            Visualize e edite seus dados pessoais.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email-profile">Email</Label>
            <Input
              id="email-profile"
              value={displayEmail}
              readOnly
              disabled
              className="bg-muted/70 dark:bg-muted/50 cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              Seu email não pode ser alterado.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name-profile">Nome</Label>
            <Input
              id="name-profile"
              value={name}
              onChange={(e) => setName(e.target.value)}
              readOnly={!isEditingProfile}
              disabled={isSavingProfile}
              className={
                !isEditingProfile
                  ? "bg-muted/70 dark:bg-muted/50"
                  : "bg-background dark:bg-black/80 border-primary/50 focus-visible:ring-primary"
              }
            />
          </div>
          {/* Avatar funcionalidade pode ser adicionada aqui depois */}
        </CardContent>
        <CardFooter className="flex justify-end space-x-2 pt-4">
          {isEditingProfile ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditingProfile(false)
                  // Reset name to original if changes are cancelled
                  if (user) setName(user.name || user.email?.split('@')[0] || "")
                }}
                disabled={isSavingProfile}
              >
                Cancelar
              </Button>
              <Button onClick={handleUpdateProfile} disabled={isSavingProfile} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {isSavingProfile ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditingProfile(true)} variant="outline">Editar Perfil</Button>
          )}
        </CardFooter>
      </Card>

      {/* LNMarkets Credentials Card */}
      <Card className="bg-background/70 dark:bg-black/60 border border-border shadow-md rounded-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">Credenciais LNMarkets</CardTitle>
            {lnMarketsConfigured && (
              <span className="flex items-center text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Configurado
              </span>
            )}
          </div>
          <CardDescription className="text-muted-foreground pt-1">
            Conecte sua conta LNMarkets para importar dados. Suas credenciais
            são enviadas diretamente para nosso servidor seguro.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="lnm-api-key">API Key</Label>
            <Input
              id="lnm-api-key"
              type="password"
              value={lnMarketsApiKey}
              onChange={(e) => setLnMarketsApiKey(e.target.value)}
              placeholder="Sua API Key da LNMarkets"
              disabled={isSavingLnMarkets}
              className="bg-background dark:bg-black/80 border-input focus-visible:ring-primary"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lnm-api-secret">API Secret</Label>
            <Input
              id="lnm-api-secret"
              type="password"
              value={lnMarketsApiSecret}
              onChange={(e) => setLnMarketsApiSecret(e.target.value)}
              placeholder="Seu API Secret da LNMarkets"
              disabled={isSavingLnMarkets}
              className="bg-background dark:bg-black/80 border-input focus-visible:ring-primary"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lnm-api-passphrase">API Passphrase</Label>
            <Input
              id="lnm-api-passphrase"
              type="password"
              value={lnMarketsApiPassphrase}
              onChange={(e) => setLnMarketsApiPassphrase(e.target.value)}
              placeholder="Sua API Passphrase da LNMarkets"
              disabled={isSavingLnMarkets}
              className="bg-background dark:bg-black/80 border-input focus-visible:ring-primary"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center pt-4">
          <Button 
            variant="outline" 
            onClick={handleTestLnMarketsConnection}
            disabled={isSavingLnMarkets || isTestingLnMarkets || !lnMarketsApiKey || !lnMarketsApiSecret || !lnMarketsApiPassphrase}
          >
            {isTestingLnMarkets ? "Testando..." : "Testar Conexão"}
          </Button>
          <Button
            onClick={handleSaveLnMarketsCredentials}
            disabled={isSavingLnMarkets || isTestingLnMarkets || !lnMarketsApiKey || !lnMarketsApiSecret || !lnMarketsApiPassphrase}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isSavingLnMarkets
              ? "Salvando..."
              : lnMarketsConfigured ? "Atualizar Credenciais" : "Salvar Credenciais"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default UserProfile 