import { redirect } from 'next/navigation'

export default function ConverterPage() {
  // Redireciona para a página principal com a aba do conversor ativa
  redirect('/?tab=converter')
} 