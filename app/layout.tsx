"use client";

import type { Metadata } from "next"
import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProviderClient } from "@/components/auth-provider-client"
import { ClientAppHeader } from "@/components/client-app-header"
import { useEffect } from "react"
import { initializeReportsStore } from "@/hooks/use-reports"

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
  useEffect(() => {
    console.log("[RootLayout] Chamando initializeReportsStore...");
    initializeReportsStore();
    console.log("[RootLayout] initializeReportsStore chamado.");
  }, []);

  return (
    <html lang="pt-BR" suppressHydrationWarning className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="only dark" />
        <meta name="theme-color" content="#1e1b4b" />
        <meta name="force-rendering" content="webkit" />
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
