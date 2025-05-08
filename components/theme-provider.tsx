"use client"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeConfig = {
    attribute: "class",
    enableSystem: false,
    forcedTheme: "dark",
    disableTransitionOnChange: false,
    defaultTheme: "dark"
  }
  
  return <NextThemesProvider {...themeConfig}>{children}</NextThemesProvider>
}
