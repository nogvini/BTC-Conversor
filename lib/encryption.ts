import CryptoJS from 'crypto-js';
import type { LNMarketsCredentials } from '@/components/types/ln-markets-types';

// Chave base para criptografia (em produção, seria uma variável de ambiente)
const ENCRYPTION_KEY = 'btc-monitor-v1-encryption-key';

/**
 * Criptografa dados sensíveis
 */
export function encryptData(data: string): string {
  try {
    return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('Erro ao criptografar dados:', error);
    throw new Error('Falha na criptografia');
  }
}

/**
 * Descriptografa dados sensíveis
 */
export function decryptData(encryptedData: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Erro ao descriptografar dados:', error);
    throw new Error('Falha na descriptografia');
  }
}

/**
 * Criptografa credenciais LN Markets
 */
export function encryptLNMarketsCredentials(credentials: LNMarketsCredentials): string {
  try {
    const dataString = JSON.stringify(credentials);
    return encryptData(dataString);
  } catch (error) {
    console.error('Erro ao criptografar credenciais LN Markets:', error);
    throw new Error('Falha ao criptografar credenciais');
  }
}

/**
 * Descriptografa credenciais LN Markets
 */
export function decryptLNMarketsCredentials(encryptedData: string): LNMarketsCredentials {
  try {
    const decryptedString = decryptData(encryptedData);
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Erro ao descriptografar credenciais LN Markets:', error);
    throw new Error('Falha ao descriptografar credenciais');
  }
}

/**
 * Gera hash para validação de credenciais
 */
export function generateCredentialsHash(userEmail: string): string {
  return CryptoJS.SHA256(userEmail + ENCRYPTION_KEY).toString();
}

/**
 * Valida se o hash das credenciais está correto
 */
export function validateCredentialsHash(userEmail: string, hash: string): boolean {
  const expectedHash = generateCredentialsHash(userEmail);
  return expectedHash === hash;
}

/**
 * Mascara dados sensíveis para exibição
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (!data || data.length <= visibleChars) {
    return '*'.repeat(data?.length || 8);
  }
  
  const visible = data.substring(0, visibleChars);
  const masked = '*'.repeat(data.length - visibleChars);
  return visible + masked;
}

/**
 * Armazena credenciais criptografadas no localStorage
 */
export function storeLNMarketsCredentials(credentials: LNMarketsCredentials, userEmail: string): void {
  try {
    const encryptedCredentials = encryptLNMarketsCredentials(credentials);
    const credentialsHash = generateCredentialsHash(userEmail);
    
    localStorage.setItem('ln_markets_credentials', encryptedCredentials);
    localStorage.setItem('ln_markets_hash', credentialsHash);
  } catch (error) {
    console.error('Erro ao armazenar credenciais:', error);
    throw new Error('Falha ao salvar credenciais');
  }
}

/**
 * Recupera e descriptografa credenciais do localStorage
 */
export function retrieveLNMarketsCredentials(userEmail: string): LNMarketsCredentials | null {
  try {
    const encryptedCredentials = localStorage.getItem('ln_markets_credentials');
    const storedHash = localStorage.getItem('ln_markets_hash');
    
    if (!encryptedCredentials || !storedHash) {
      return null;
    }
    
    // Validar hash antes de descriptografar
    if (!validateCredentialsHash(userEmail, storedHash)) {
      console.warn('Hash de credenciais inválido');
      return null;
    }
    
    return decryptLNMarketsCredentials(encryptedCredentials);
  } catch (error) {
    console.error('Erro ao recuperar credenciais:', error);
    return null;
  }
}

/**
 * Remove credenciais do localStorage
 */
export function removeLNMarketsCredentials(): void {
  localStorage.removeItem('ln_markets_credentials');
  localStorage.removeItem('ln_markets_hash');
} 