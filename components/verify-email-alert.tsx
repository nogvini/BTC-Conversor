"use client"

import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { MailCheck, AlertTriangle, RefreshCw, Loader2, Mail, Clock } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

interface VerifyEmailAlertProps {
  email: string
  hasExpiredError?: boolean
}

export function VerifyEmailAlert({ email, hasExpiredError = false }: VerifyEmailAlertProps) {
  const { resendVerificationEmail } = useAuth()
  const { toast } = useToast()
  const [isResending, setIsResending] = useState(false)
  const [sentRecently, setSentRecently] = useState(false)
  const [resendCount, setResendCount] = useState(0)
  
  const handleResendEmail = async () => {
    if (isResending || !email) return
    
    setIsResending(true)
    
    try {
      const { error, sent } = await resendVerificationEmail(email)
      
      if (error) {
        throw error
      }
      
      if (sent) {
        // Incrementar contador de reenvios
        const newCount = resendCount + 1
        setResendCount(newCount)
        
        setSentRecently(true)
        toast({
          title: "Email enviado",
          description: "Verifique sua caixa de entrada para confirmar seu email.",
          variant: "success",
        })
        
        // Definir um tempo de espera mais longo se já houver muitos reenvios
        const cooldownTime = newCount > 2 ? 5 * 60 * 1000 : 2 * 60 * 1000 // 5 min ou 2 min
        
        // Resetar o estado após o tempo de cooldown
        setTimeout(() => {
          setSentRecently(false)
        }, cooldownTime)
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
  
  // Máscara o email para exibição
  const maskedEmail = email ? email.replace(/(.{2})(.*)(@.*)/, '$1****$3') : '***@***.com'
  
  return (
    <Alert className={`${hasExpiredError ? 'bg-red-900/20 border-red-700/50 text-red-200' : 'bg-yellow-900/20 border-yellow-700/50 text-yellow-300'} mb-6`}>
      {hasExpiredError ? <Clock className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
      <AlertTitle>
        {hasExpiredError ? "Link de verificação expirado" : "Verificação de email necessária"}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        {hasExpiredError ? (
          <p>
            O link de verificação para <strong>{maskedEmail}</strong> expirou ou é inválido.
            Solicite um novo link clicando no botão abaixo.
          </p>
        ) : (
          <p>
            Enviamos um email de verificação para <strong>{maskedEmail}</strong>. 
            Por favor, verifique sua caixa de entrada e a pasta de spam.
          </p>
        )}
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 mt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleResendEmail}
            disabled={isResending || sentRecently}
            className={hasExpiredError 
              ? "bg-red-900/30 border-red-700/50 hover:bg-red-800/50 text-red-200" 
              : "bg-yellow-900/30 border-yellow-700/50 hover:bg-yellow-800/50 text-yellow-200"
            }
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
                {hasExpiredError ? "Solicitar novo link" : "Reenviar email"}
              </>
            )}
          </Button>
          
          {sentRecently && (
            <span className="text-xs mt-2 sm:mt-0">
              Email enviado recentemente. Verifique sua caixa de entrada.
            </span>
          )}
        </div>
        
        <div className={`text-xs space-y-1 mt-2 ${hasExpiredError ? 'bg-red-950/40' : 'bg-yellow-950/40'} p-2 rounded`}>
          <p className="font-medium">Dicas:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Verifique sua pasta de spam ou lixo eletrônico</li>
            <li>Se você já verificou seu email, tente sair e entrar novamente</li>
            <li>Verifique se digitou o email corretamente</li>
            {hasExpiredError && (
              <>
                <li>Os links de verificação expiram após 24 horas</li>
                <li>Use o link mais recente enviado ao seu email</li>
              </>
            )}
          </ul>
        </div>
      </AlertDescription>
    </Alert>
  )
} 