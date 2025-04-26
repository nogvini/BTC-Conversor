import BitcoinConverter from "@/components/bitcoin-converter"
import { Toaster } from "@/components/ui/toaster"

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-4 py-8 md:py-12">
      <BitcoinConverter />
      <Toaster />
    </main>
  )
}
