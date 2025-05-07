"use client"

import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { MailCheck, AlertTriangle, RefreshCw, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

interface VerifyEmailAlertProps {
  email: string
}

export function VerifyEmailAlert({ email }: VerifyEmailAlertProps) {
  const { resendVerificationEmail } = useAuth()
  const { toast } = useToast()
  const [isResending, setIsResending] = useState(false)
  const [sentRecently, setSentRecently] = useState(false)
  
  const handleResendEmail = async () => {
    if (isResending || !email) return
    
    setIsResending(true)
    
    try {
      const { error, sent } = await resendVerificationEmail(email)
      
      if (error) {
        throw error
      }
      
      if (sent) {
        setSentRecently(true)
        toast({
          title: "Email enviado",
          description: "Verifique sua caixa de entrada para confirmar seu email.",
          variant: "success",
        })
        
        // Resetar o estado após 2 minutos
        setTimeout(() => {
          setSentRecently(false)
        }, 2 * 60 * 1000)
      }
    } catch (error: any) {
      toast({
        title: "Erro ao reenviar email",
        description: error.message || "Não foi possível enviar o email de verificação.",
        variant: "destructive",
      })
    } finally {
      setIsResending(false)
    }
  }
  
  return (
    <Alert className="bg-yellow-900/20 border border-yellow-700/50 text-yellow-300 mb-6">
      <AlertTriangle className="h-5 w-5" />
      <AlertTitle>Email não verificado</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          Você precisa verificar seu email antes de continuar. Verifique sua caixa de entrada, incluindo a pasta de spam.
        </p>
        
        <div className="flex items-center mt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleResendEmail}
            disabled={isResending || sentRecently}
            className="bg-yellow-900/30 border-yellow-700/50 hover:bg-yellow-800/50 text-yellow-200"
          >
            {isResending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : sentRecently ? (
              <>
                <MailCheck className="mr-2 h-4 w-4" />
                Email enviado
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reenviar email
              </>
            )}
          </Button>
          
          <span className="ml-2 text-xs">
            {sentRecently ? "Email enviado recentemente. Verifique sua caixa de entrada." : ""}
          </span>
        </div>
        
        <p className="text-xs">
          * Se você já verificou seu email, tente sair e entrar novamente.
        </p>
      </AlertDescription>
    </Alert>
  )
} 