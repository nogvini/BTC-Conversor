import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Mascara um endereço de e-mail para exibição, preservando os primeiros caracteres
 * e o domínio, substituindo o restante por caracteres de ocultação.
 * 
 * @param email O endereço de e-mail a ser mascarado
 * @param visibleChars Número de caracteres visíveis no início (padrão: 3)
 * @returns E-mail mascarado (ex: "joh•••@example.com")
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '';
  return email.replace(/(.{3})(.*)(@.*)/, '$1•••$3');
}
