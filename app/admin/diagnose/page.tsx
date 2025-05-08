// Uma página estática simples sem qualquer componente client-side
export const dynamic = "force-dynamic";
export const runtime = "edge";

export default function DiagnosePage() {
  return (
    <main className="min-h-screen p-4 pt-24 md:pt-28 pb-8 md:pb-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Página de Diagnóstico</h1>
        <p className="mb-4">
          Esta página de diagnóstico permite verificar o estado do sistema.
        </p>
        
        <div className="p-4 border rounded-md bg-amber-50 text-amber-800 mb-6">
          <p>
            Para acessar as funcionalidades de diagnóstico, clique no botão abaixo:
          </p>
        </div>
        
        <div className="mt-4">
          <a 
            href="/admin/diagnose/client" 
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            Ir para Diagnóstico
          </a>
        </div>
      </div>
    </main>
  );
} 