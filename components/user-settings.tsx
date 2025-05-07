"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Loader2, Save, RefreshCw } from "lucide-react"
import { PageTransition } from "@/components/page-transition"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Tipos para as configurações
type UserSettings = {
  theme: "system" | "dark" | "light"
  currency: "BRL" | "USD"
  autoRefresh: boolean
  refreshInterval: number // Em minutos
  notifications: boolean
}

// Configurações padrão
const defaultSettings: UserSettings = {
  theme: "system",
  currency: "BRL",
  autoRefresh: true,
  refreshInterval: 5,
  notifications: true,
}

export default function UserSettings() {
  const { session, retryConnection } = useAuth()
  const { toast } = useToast()
  const { user, isLoading } = session
  const [settings, setSettings] = useState<UserSettings>(defaultSettings)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("appearance")

  // Carregar configurações do localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSettings = localStorage.getItem("userSettings")
      if (savedSettings) {
        try {
          const parsedSettings = JSON.parse(savedSettings)
          setSettings(prevSettings => ({
            ...prevSettings,
            ...parsedSettings,
          }))
        } catch (e) {
          console.error("Erro ao carregar configurações:", e)
        }
      }
    }
  }, [])

  // Salvar configurações
  const saveSettings = () => {
    try {
      setIsSaving(true)
      
      // Salvar no localStorage
      localStorage.setItem("userSettings", JSON.stringify(settings))
      
      // Aplicar configurações
      applySettings()
      
      toast({
        title: "Configurações salvas",
        description: "Suas preferências foram atualizadas com sucesso.",
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "Erro ao salvar configurações",
        description: "Ocorreu um erro ao salvar suas preferências.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Aplicar configurações
  const applySettings = () => {
    // Aplicar tema
    if (settings.theme !== "system") {
      document.documentElement.classList.remove("light", "dark")
      document.documentElement.classList.add(settings.theme)
    } else {
      // Usar preferência do sistema
      document.documentElement.classList.remove("light", "dark")
    }
    
    // Outras configurações seriam aplicadas aqui quando implementadas
  }

  // Redefinir para configurações padrão
  const resetSettings = () => {
    setSettings(defaultSettings)
    toast({
      title: "Configurações redefinidas",
      description: "As configurações foram redefinidas para os valores padrão.",
      variant: "default",
    })
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
          <CardTitle>Configurações indisponíveis</CardTitle>
          <CardDescription>
            Você precisa estar conectado para acessar suas configurações.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <PageTransition>
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Configurações</CardTitle>
          <CardDescription>
            Personalize sua experiência no Raid Toolkit
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="appearance">Aparência</TabsTrigger>
              <TabsTrigger value="notifications">Notificações</TabsTrigger>
              <TabsTrigger value="data">Dados & Privacidade</TabsTrigger>
            </TabsList>
            
            <TabsContent value="appearance" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Tema</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="theme">Escolha o tema</Label>
                    <Select 
                      value={settings.theme} 
                      onValueChange={(value: any) => 
                        setSettings({ ...settings, theme: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um tema" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system">Sistema (Padrão)</SelectItem>
                        <SelectItem value="dark">Escuro</SelectItem>
                        <SelectItem value="light">Claro</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      O tema escuro é recomendado para uso noturno.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="currency">Moeda padrão</Label>
                    <Select 
                      value={settings.currency}
                      onValueChange={(value: any) => 
                        setSettings({ ...settings, currency: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a moeda" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRL">Real (R$)</SelectItem>
                        <SelectItem value="USD">Dólar (US$)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Moeda que será exibida por padrão na aplicação.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="notifications" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Preferências de notificação</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notifications" className="block">Notificações</Label>
                    <p className="text-xs text-muted-foreground">
                      Receba alertas sobre mudanças significativas no preço.
                    </p>
                  </div>
                  <Switch 
                    id="notifications" 
                    checked={settings.notifications} 
                    onCheckedChange={(checked) => 
                      setSettings({ ...settings, notifications: checked })
                    }
                  />
                </div>
              </div>

              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Atualização automática</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="autoRefresh" className="block">Atualizar preços</Label>
                    <p className="text-xs text-muted-foreground">
                      Atualiza automaticamente os preços das criptomoedas.
                    </p>
                  </div>
                  <Switch 
                    id="autoRefresh" 
                    checked={settings.autoRefresh} 
                    onCheckedChange={(checked) => 
                      setSettings({ ...settings, autoRefresh: checked })
                    }
                  />
                </div>
                
                {settings.autoRefresh && (
                  <div className="space-y-2">
                    <Label htmlFor="refreshInterval">Intervalo de atualização</Label>
                    <Select 
                      value={settings.refreshInterval.toString()}
                      onValueChange={(value) => 
                        setSettings({ ...settings, refreshInterval: parseInt(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o intervalo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 minuto</SelectItem>
                        <SelectItem value="5">5 minutos</SelectItem>
                        <SelectItem value="10">10 minutos</SelectItem>
                        <SelectItem value="15">15 minutos</SelectItem>
                        <SelectItem value="30">30 minutos</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Menor intervalo significa dados mais atualizados, mas maior uso de dados.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="data" className="space-y-6">
              <Alert className="bg-purple-900/20 border-purple-700/50">
                <AlertTitle>Utilização de dados</AlertTitle>
                <AlertDescription>
                  <p className="mt-1 text-sm">
                    Nosso aplicativo utiliza apenas os dados necessários para seu funcionamento.
                    Não compartilhamos suas informações com terceiros.
                  </p>
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Conexão</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="block">Status da conexão</Label>
                    <p className="text-xs text-muted-foreground">
                      Se estiver enfrentando problemas, tente reconectar ao servidor.
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={retryConnection}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reconectar
                  </Button>
                </div>
              </div>

              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Redefinir configurações</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="block">Voltar ao padrão</Label>
                    <p className="text-xs text-muted-foreground">
                      Restaura todas as configurações para os valores padrão.
                    </p>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={resetSettings}
                  >
                    Redefinir
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end pt-4 border-t">
            <Button 
              onClick={saveSettings} 
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
                  Salvar configurações
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageTransition>
  )
} 