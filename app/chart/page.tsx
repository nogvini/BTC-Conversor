import { redirect } from 'next/navigation'

export default function ChartPage() {
  // Redireciona para a página principal com a aba de gráficos ativa
  redirect('/?tab=chart')
} 