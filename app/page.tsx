import BitcoinConverter from "@/components/bitcoin-converter"
import { Toaster } from "@/components/ui/toaster"
import { Suspense } from "react"
import { PageTransition } from "@/components/page-transition"

export default function Home() {
  return (
    <main className="min-h-screen p-4 py-8 md:py-12">
      <Suspense fallback={<div>Carregando...</div>}>
        <PageTransition>
          <BitcoinConverter />
        </PageTransition>
      </Suspense>
      <Toaster />
    </main>
  )
}
