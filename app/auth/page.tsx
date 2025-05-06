import AuthForm from "@/components/auth-form"
import { Toaster } from "@/components/ui/toaster"

export default function AuthPage() {
  return (
    <main className="min-h-screen p-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <AuthForm />
      </div>
      <Toaster />
    </main>
  )
} 