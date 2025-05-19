import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow as fnsFormatDistanceToNow, startOfDay as fnsStartOfDay } from "date-fns"
import { ptBR } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDistanceToNow(date: Date, options?: { addSuffix?: boolean }): string {
  return fnsFormatDistanceToNow(date, {
    locale: ptBR,
    addSuffix: options?.addSuffix || false,
  })
}

// Função para obter o início do dia (00:00:00)
export function startOfDay(date: Date): Date {
  return fnsStartOfDay(date)
}
