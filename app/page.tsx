import BitcoinConverter from "@/components/bitcoin-converter"
import { Toaster } from "@/components/ui/toaster"
import { Suspense } from "react"

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-4 py-8 md:py-12">
      <Suspense fallback={<div>Carregando...</div>}>
        <BitcoinConverter />
      </Suspense>
      <Toaster />
    </main>
  )
}
