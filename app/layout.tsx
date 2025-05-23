// import type { Metadata } from "next" // COMENTADO
import "./globals.css" // Mantenha por enquanto, mas pode ser um candidato se o problema persistir
// import { Inter } from "next/font/google" // COMENTADO
// import { ThemeProvider } from "@/components/theme-provider" // COMENTADO
// import { AuthProviderClient } from "@/components/auth-provider-client" // COMENTADO
// import { ClientAppHeader } from "@/components/client-app-header" // COMENTADO
// import ReportsInitializer from "./reports-initializer" // COMENTADO

// const inter = Inter({ subsets: ["latin"] }) // COMENTADO

/* // COMENTADO
export const metadata: Metadata = {
  title: "Raid Bitcoin Toolkit",
  description: "Converta Bitcoin para diferentes moedas e acompanhe o mercado",
}
*/

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  console.log("!!!!!!!!!!!!!!!! ROOT LAYOUT EXECUTADO (COM IMPORTAÇÕES COMENTADAS) !!!!!!!!!!!!!!!!");
  return (
    <html lang="pt-BR" suppressHydrationWarning className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="only dark" />
        <meta name="theme-color" content="#1e1b4b" />
        {/* <meta name="force-rendering" content="webkit" /> Removido temporariamente se causar problemas */}
      </head>
      {/* <body className={inter.className}> */}
      <body> {/* Classe da fonte removida temporariamente */}
        <div>INICIALIZAÇÃO SUPER BÁSICA</div> {/* Conteúdo super básico */}
        {/* <AuthProviderClient>
          <ThemeProvider>
            <ReportsInitializer />
            <ClientAppHeader />
            <main className="pt-16">
              {children}
            </main>
          </ThemeProvider>
        </AuthProviderClient> */}
      </body>
    </html>
  )
}
