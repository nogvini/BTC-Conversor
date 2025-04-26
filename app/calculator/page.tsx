import { redirect } from 'next/navigation'

export default function CalculatorPage() {
  // Redireciona para a página principal com a aba da calculadora ativa
  redirect('/?tab=calculator')
} 