"use client";

// Página estática que renderiza uma interface simples
// Marcada como edge runtime para evitar problemas com SSR
export const runtime = "edge";
export const dynamic = "force-dynamic";

export default function AuthPage() {
  console.log('!!!! [AuthPage] Renderizando AuthPage SUPER SIMPLES !!!!');
  return (
    <div style={{ padding: '50px', textAlign: 'center', backgroundColor: '#111', color: '#fff', minHeight: '100vh' }}>
      <h1>Página de Autenticação (Teste Mínimo)</h1>
      <p>Este é o conteúdo mais básico possível para /auth.</p>
      <p>Se o erro "r is not a function" ainda ocorrer ao navegar para cá, o problema é mais profundo na infraestrutura de roteamento ou nos providers.</p>
    </div>
  );
} 