// Página estática no Edge Runtime - zero código cliente durante o build
export const runtime = "edge";
export const dynamic = "force-dynamic";

export default function SettingsManagePage() {
  return (
    <main className="min-h-screen p-4 pt-24 md:pt-28 pb-8 md:pb-12">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4">Configurações</h1>
        <div className="animate-pulse h-8 w-8 mx-auto rounded-full bg-primary/20"></div>
        
        <div id="settings-container" className="mt-8">
          <p className="text-muted-foreground">Carregando configurações...</p>
        </div>
        
        <script 
          dangerouslySetInnerHTML={{ 
            __html: `
              document.addEventListener('DOMContentLoaded', function() {
                // Redirecionamento para a versão cliente após um curto período
                setTimeout(function() {
                  window.location.href = '/settings/client';
                }, 500);
              });
            `
          }} 
        />
      </div>
    </main>
  );
} 