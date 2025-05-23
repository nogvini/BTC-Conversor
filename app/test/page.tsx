"use client"

export default function TestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">🧪 Página de Teste</h1>
        <p className="mb-4">Se você pode ver esta página, as rotas estão funcionando!</p>
        <div className="space-y-2">
          <a href="/profile" className="block text-blue-500 hover:underline">
            🔗 Testar /profile
          </a>
          <a href="/settings" className="block text-blue-500 hover:underline">
            🔗 Testar /settings
          </a>
          <a href="/admin/diagnose" className="block text-blue-500 hover:underline">
            🔗 Testar /admin/diagnose
          </a>
        </div>
      </div>
    </div>
  )
} 