import type { Metadata, Viewport } from "next"
import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProviderClient } from "@/components/auth-provider-client"
import { ClientAppHeader } from "@/components/client-app-header"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Raid Bitcoin Toolkit",
  description: "Converta Bitcoin para diferentes moedas e acompanhe o mercado",
  icons: {
    icon: [
      {
        url: '/favicon.svg',
        type: 'image/svg+xml',
      },
      {
        url: '/favicon.ico',
        type: 'image/x-icon',
        sizes: '16x16 32x32',
      },
      {
        url: '/favicon-192.png',
        type: 'image/png',
        sizes: '192x192',
      },
      {
        url: '/favicon-512.png',
        type: 'image/png',
        sizes: '512x512',
      }
    ],
    apple: [
      {
        url: '/favicon.svg',
        type: 'image/svg+xml',
      }
    ],
    shortcut: '/favicon.svg',
  },
  manifest: '/site.webmanifest',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#a855f7',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className="dark">
      <head>
        <meta name="color-scheme" content="only dark" />
        <meta name="force-rendering" content="webkit" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <AuthProviderClient>
          <ThemeProvider>
            <ClientAppHeader />
            <main className="pt-16">
              {children}
            </main>
          </ThemeProvider>
        </AuthProviderClient>
      </body>
    </html>
  )
}
