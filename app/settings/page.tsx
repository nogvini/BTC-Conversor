// Página estática com redirecionamento para a versão cliente
export const runtime = "edge";
export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <main className="min-h-screen p-4 pt-24 md:pt-28 pb-8 md:pb-12">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4">Configurações</h1>
        <p className="mb-4">Carregando suas configurações...</p>
        
        <div className="mt-4 flex justify-center">
          <div className="animate-pulse h-8 w-8 rounded-full bg-primary/20"></div>
        </div>
        
        <script 
          dangerouslySetInnerHTML={{ 
            __html: `
              setTimeout(function() {
                window.location.href = '/settings/manage';
              }, 200);
            `
          }} 
        />
      </div>
    </main>
  );
} 