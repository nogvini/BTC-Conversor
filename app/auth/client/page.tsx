// Página estática no Edge Runtime - zero código client durante a build
export const runtime = "edge";
export const dynamic = "force-dynamic";

export default function AuthClientPage() {
  return (
    <main className="min-h-screen p-4 flex items-center justify-center">
      <div className="w-full max-w-md text-center">
        <div className="bg-white dark:bg-gray-950 shadow-md rounded-lg p-8">
          <h1 className="text-2xl font-bold mb-4">Acesso ao Sistema</h1>
          <div className="animate-pulse h-8 w-8 mx-auto rounded-full bg-primary/20"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Inicializando o formulário de login...</p>
          
          <div id="auth-container" className="mt-6"></div>
          
          <script 
            dangerouslySetInnerHTML={{ 
              __html: `
                document.addEventListener('DOMContentLoaded', function() {
                  // Carregar o formulário usando iframe para evitar problemas de SSR
                  setTimeout(function() {
                    const container = document.getElementById('auth-container');
                    if (container) {
                      const iframe = document.createElement('iframe');
                      iframe.src = '/auth/form';
                      iframe.style.width = '100%';
                      iframe.style.height = '400px';
                      iframe.style.border = 'none';
                      iframe.style.overflow = 'hidden';
                      container.appendChild(iframe);
                    }
                  }, 300);
                });
              `
            }} 
          />
        </div>
      </div>
    </main>
  );
} 