import { Metadata } from "next";
import RegisterClient from "./client";

export const metadata: Metadata = {
  title: "Cadastro - Raid Bitcoin Toolkit",
  description: "Crie uma conta para acessar o Raid Bitcoin Toolkit",
};

export default function RegisterPage() {
  return <RegisterClient />;
} 