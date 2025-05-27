import { Metadata } from "next";
import DiagnoseClient from "./client";

export const metadata: Metadata = {
  title: "Diagnóstico do Sistema | BTC Monitor",
  description: "Ferramentas de diagnóstico para resolver problemas no sistema",
};

export default function DiagnosePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Diagnóstico do Sistema</h1>
      <DiagnoseClient />
    </div>
  );
} 