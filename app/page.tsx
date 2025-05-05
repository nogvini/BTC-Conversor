import { Suspense } from "react"
import { PageTransition } from "@/components/page-transition"
import { NavigationBar } from "@/components/ui/navigation-bar"
import { Toaster } from "@/components/ui/toaster"
import BitcoinConverter from "@/components/bitcoin-converter"
import { ClientWrapper } from "@/components/client-wrapper"

export default function Home() {
  return (
    <ClientWrapper>
      <main className="min-h-screen p-4 py-8 md:py-12">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <NavigationBar />
          </div>
          
          <Suspense fallback={<div>Carregando...</div>}>
            <PageTransition>
              <BitcoinConverter />
            </PageTransition>
          </Suspense>
        </div>
        <Toaster />
      </main>
    </ClientWrapper>
  )
}
