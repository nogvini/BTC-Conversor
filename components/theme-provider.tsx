"use client"
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Forçar tema escuro independente das configurações do sistema
  const forcedProps = {
    ...props,
    enableSystem: false,
    forcedTheme: "dark",
    disableTransitionOnChange: false,
    defaultTheme: "dark"
  }
  
  return <NextThemesProvider {...forcedProps}>{children}</NextThemesProvider>
}
