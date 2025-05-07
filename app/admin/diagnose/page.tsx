// Abordagem mais simples sem importações dinâmicas complexas
export const dynamic = "force-dynamic";

export default function DiagnosePage() {
  return (
    <main className="min-h-screen p-4 pt-24 md:pt-28 pb-8 md:pb-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Página de Diagnóstico</h1>
        <p>Esta página estará disponível após carregar no navegador.</p>
        <p className="text-sm text-muted-foreground mt-2">
          A versão completa desta ferramenta só funciona no lado do cliente.
        </p>
        {/* @ts-expect-error Async Server Component */}
        <ClientPage />
      </div>
    </main>
  );
}

// Importar o componente cliente de forma segura
import dynamic from "next/dynamic";
const ClientPage = dynamic(
  () => import("./client"),
  { ssr: false }
); 