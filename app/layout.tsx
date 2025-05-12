import type { Metadata } from "next"
import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProviderClient } from "@/components/auth-provider-client"
import dynamic from 'next/dynamic'

const AppHeader = dynamic(() => 
  import('@/components/ui/app-header').then((mod) => mod.AppHeader),
  {
    ssr: false,
    loading: () => <div className="sticky top-0 z-50 w-full h-16 border-b border-purple-700/30 bg-background/90 backdrop-blur-lg dark:bg-black/80"></div>
  }
)

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Raid Bitcoin Toolkit",
  description: "Converta Bitcoin para diferentes moedas e acompanhe o mercado",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="color-scheme" content="only dark" />
        <meta name="theme-color" content="#1e1b4b" />
        <meta name="force-rendering" content="webkit" />
      </head>
      <body className={inter.className}>
        <AuthProviderClient>
          <ThemeProvider>
            <AppHeader />
            <main className="pt-16">
              {children}
            </main>
          </ThemeProvider>
        </AuthProviderClient>
      </body>
    </html>
  )
}
