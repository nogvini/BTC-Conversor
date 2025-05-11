import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow as fnsFormatDistanceToNow } from "date-fns"
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
