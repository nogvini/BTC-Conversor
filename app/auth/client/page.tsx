"use client";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const AuthForm = dynamic(() => import("../form/page"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center min-h-[300px]">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  ),
});

export default function AuthClientPage() {
  return (
    <main className="min-h-screen p-4 flex items-center justify-center">
      <div className="w-full max-w-md text-center">
        <div className="bg-white dark:bg-gray-950 shadow-md rounded-lg p-8">
          <h1 className="text-2xl font-bold mb-4">Acesso ao Sistema</h1>
          <AuthForm />
        </div>
      </div>
    </main>
  );
} 