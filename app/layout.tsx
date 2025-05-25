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
  keywords: ["bitcoin", "btc", "conversor", "calculadora", "crypto", "criptomoeda"],
  authors: [{ name: "Raid Team" }],
  creator: "Raid Team",
  publisher: "Raid Team",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
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
        url: '/favicon-192.png',
        type: 'image/png',
        sizes: '192x192',
      }
    ],
    shortcut: '/favicon.svg',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: "Raid Bitcoin Toolkit",
    description: "Converta Bitcoin para diferentes moedas e acompanhe o mercado",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Raid Bitcoin Toolkit",
    description: "Converta Bitcoin para diferentes moedas e acompanhe o mercado",
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#a855f7' },
    { media: '(prefers-color-scheme: light)', color: '#a855f7' }
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className="dark">
      <head>
        <meta name="color-scheme" content="dark" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="RaidToolkit" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#a855f7" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/favicon-192.png" />
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
