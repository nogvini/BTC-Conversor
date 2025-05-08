import { Metadata } from "next";
import LoginClient from "./client";

export const metadata: Metadata = {
  title: "Entrar - Raid Bitcoin Toolkit",
  description: "Faça login para acessar o Raid Bitcoin Toolkit",
};

export default function LoginPage() {
  return <LoginClient />;
} 