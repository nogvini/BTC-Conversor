// Página estática no Edge Runtime - zero código cliente durante o build
export const runtime = "edge";
export const dynamic = "force-dynamic";

export default function ProfileViewPage() {
  return (
    <main className="min-h-screen p-4 pt-24 md:pt-28 pb-8 md:pb-12">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4">Perfil do Usuário</h1>
        <div className="animate-pulse h-8 w-8 mx-auto rounded-full bg-primary/20"></div>
        
        <div id="profile-container" className="mt-8">
          <p className="text-muted-foreground">Carregando perfil...</p>
        </div>
        
        <script 
          dangerouslySetInnerHTML={{ 
            __html: `
              document.addEventListener('DOMContentLoaded', function() {
                // Carregar o script do perfil de forma dinâmica
                const profileScript = document.createElement('script');
                profileScript.src = '/js/profile-loader.js';
                profileScript.type = 'module';
                document.body.appendChild(profileScript);
                
                // Alternativa de fallback após um curto período
                setTimeout(function() {
                  window.location.href = '/profile/client';
                }, 1000);
              });
            `
          }} 
        />
      </div>
    </main>
  );
} 