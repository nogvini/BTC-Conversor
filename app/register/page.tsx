import { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { Bitcoin } from "lucide-react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth-guard";

export const metadata: Metadata = {
  title: "Cadastro - Raid Bitcoin Toolkit",
  description: "Crie uma conta para acessar o Raid Bitcoin Toolkit",
};

export default function RegisterPage() {
  return (
    <AuthGuard>
      <main className="min-h-screen flex flex-col items-center justify-center p-4 py-8 md:py-12 bg-gradient-to-br from-indigo-950 via-[#0c0e1d] to-black">
        <Link 
          href="/" 
          className="flex items-center gap-2 mb-8 text-2xl font-bold text-indigo-300 hover:text-indigo-200 transition-colors"
        >
          <Bitcoin className="h-8 w-8 text-indigo-500" />
          <span>Raid Bitcoin</span>
        </Link>
        
        <AuthForm type="register" />
        
        <p className="mt-8 text-sm text-indigo-400/70 text-center max-w-md">
          Ao criar uma conta, você concorda com nossos termos de uso e política de privacidade.
        </p>
      </main>
    </AuthGuard>
  );
} 