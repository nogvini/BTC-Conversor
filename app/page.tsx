import BitcoinConverter from "@/components/bitcoin-converter"
import { ThemeProvider } from "@/components/theme-provider"

export default function Home() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <main className="min-h-screen bg-background p-4 py-8">
        <BitcoinConverter />
      </main>
    </ThemeProvider>
  )
}
