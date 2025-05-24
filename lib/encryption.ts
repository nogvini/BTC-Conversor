import CryptoJS from 'crypto-js';
import type { LNMarketsCredentials, LNMarketsAPIConfig, LNMarketsMultipleConfig } from '@/components/types/ln-markets-types';

// Chave base para criptografia (em produção, seria uma variável de ambiente)
const ENCRYPTION_KEY = 'btc-monitor-v1-encryption-key';

/**
 * Criptografa dados sensíveis
 */
export function encryptData(data: string, userEmail?: string): string {
  try {
    const key = userEmail ? `${ENCRYPTION_KEY}_${hashUserEmail(userEmail)}` : ENCRYPTION_KEY;
    return CryptoJS.AES.encrypt(data, key).toString();
  } catch (error) {
    console.error('Erro ao criptografar dados:', error);
    throw new Error('Falha na criptografia');
  }
}

/**
 * Descriptografa dados sensíveis
 */
export function decryptData(encryptedData: string, userEmail?: string): string {
  try {
    const key = userEmail ? `${ENCRYPTION_KEY}_${hashUserEmail(userEmail)}` : ENCRYPTION_KEY;
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
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
  const dataToEncrypt = {
    key: credentials.key,
    secret: credentials.secret,
    passphrase: credentials.passphrase,
    network: credentials.network,
    isConfigured: credentials.isConfigured
  };
  
  return CryptoJS.AES.encrypt(JSON.stringify(dataToEncrypt), ENCRYPTION_KEY).toString();
}

/**
 * Descriptografa credenciais LN Markets
 */
export function decryptLNMarketsCredentials(encryptedData: string): LNMarketsCredentials {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
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
 * Gera hash do email do usuário para uso como chave
 */
export function hashUserEmail(userEmail: string): string {
  return CryptoJS.SHA256(userEmail).toString().substring(0, 16);
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

// NOVAS FUNÇÕES para múltiplas configurações

/**
 * Gera um ID único para configuração
 */
export function generateConfigId(): string {
  return `lnm_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Salva múltiplas configurações LN Markets criptografadas
 */
export function saveLNMarketsMultipleConfigs(userEmail: string, multipleConfig: LNMarketsMultipleConfig): boolean {
  try {
    if (!userEmail) {
      console.error('[Encryption] Email do usuário é obrigatório');
      return false;
    }

    const userHash = hashUserEmail(userEmail);
    const configKey = `lnmarkets_multiple_${userHash}`;
    
    // Criptografar cada configuração individual
    const encryptedConfigs = multipleConfig.configs.map(config => ({
      ...config,
      credentials: {
        ...config.credentials,
        key: encryptData(config.credentials.key, userEmail),
        secret: encryptData(config.credentials.secret, userEmail),
        passphrase: encryptData(config.credentials.passphrase, userEmail),
      }
    }));

    const encryptedMultipleConfig: LNMarketsMultipleConfig = {
      ...multipleConfig,
      configs: encryptedConfigs
    };

    localStorage.setItem(configKey, JSON.stringify(encryptedMultipleConfig));
    console.log('[Encryption] Múltiplas configurações LN Markets salvas com sucesso');
    return true;
  } catch (error) {
    console.error('[Encryption] Erro ao salvar múltiplas configurações:', error);
    return false;
  }
}

/**
 * Recupera múltiplas configurações LN Markets descriptografadas
 */
export function retrieveLNMarketsMultipleConfigs(userEmail: string): LNMarketsMultipleConfig | null {
  try {
    if (!userEmail) {
      console.warn('[Encryption] Email do usuário é obrigatório');
      return null;
    }

    const userHash = hashUserEmail(userEmail);
    const configKey = `lnmarkets_multiple_${userHash}`;
    
    const encryptedData = localStorage.getItem(configKey);
    if (!encryptedData) {
      console.log('[Encryption] Nenhuma configuração múltipla encontrada');
      
      // Verificar se existe configuração única e migrar
      const singleConfig = retrieveLNMarketsCredentials(userEmail);
      if (singleConfig && singleConfig.isConfigured) {
        console.log('[Encryption] Migrando configuração única para múltipla');
        return migrateSingleConfigToMultiple(userEmail, singleConfig);
      }
      
      return {
        configs: [],
        lastUpdated: new Date().toISOString()
      };
    }

    const encryptedMultipleConfig: LNMarketsMultipleConfig = JSON.parse(encryptedData);
    
    // Descriptografar cada configuração
    const decryptedConfigs = encryptedMultipleConfig.configs.map(config => ({
      ...config,
      credentials: {
        ...config.credentials,
        key: decryptData(config.credentials.key, userEmail),
        secret: decryptData(config.credentials.secret, userEmail),
        passphrase: decryptData(config.credentials.passphrase, userEmail),
      }
    }));

    return {
      ...encryptedMultipleConfig,
      configs: decryptedConfigs
    };
  } catch (error) {
    console.error('[Encryption] Erro ao recuperar múltiplas configurações:', error);
    return null;
  }
}

/**
 * Adiciona uma nova configuração LN Markets
 */
export function addLNMarketsConfig(userEmail: string, config: Omit<LNMarketsAPIConfig, 'id' | 'createdAt' | 'updatedAt'>): string | null {
  try {
    const currentConfigs = retrieveLNMarketsMultipleConfigs(userEmail);
    if (!currentConfigs) return null;

    const newConfigId = generateConfigId();
    const now = new Date().toISOString();
    
    const newConfig: LNMarketsAPIConfig = {
      ...config,
      id: newConfigId,
      createdAt: now,
      updatedAt: now
    };

    const updatedConfigs: LNMarketsMultipleConfig = {
      configs: [...currentConfigs.configs, newConfig],
      defaultConfigId: currentConfigs.defaultConfigId || newConfigId, // Primeira config vira padrão
      lastUpdated: now
    };

    const success = saveLNMarketsMultipleConfigs(userEmail, updatedConfigs);
    return success ? newConfigId : null;
  } catch (error) {
    console.error('[Encryption] Erro ao adicionar configuração:', error);
    return null;
  }
}

/**
 * Atualiza uma configuração LN Markets existente
 */
export function updateLNMarketsConfig(userEmail: string, configId: string, updates: Partial<Omit<LNMarketsAPIConfig, 'id' | 'createdAt'>>): boolean {
  try {
    const currentConfigs = retrieveLNMarketsMultipleConfigs(userEmail);
    if (!currentConfigs) return false;

    const configIndex = currentConfigs.configs.findIndex(c => c.id === configId);
    if (configIndex === -1) {
      console.error('[Encryption] Configuração não encontrada:', configId);
      return false;
    }

    const updatedConfig = {
      ...currentConfigs.configs[configIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    const updatedConfigs: LNMarketsMultipleConfig = {
      ...currentConfigs,
      configs: [
        ...currentConfigs.configs.slice(0, configIndex),
        updatedConfig,
        ...currentConfigs.configs.slice(configIndex + 1)
      ],
      lastUpdated: new Date().toISOString()
    };

    return saveLNMarketsMultipleConfigs(userEmail, updatedConfigs);
  } catch (error) {
    console.error('[Encryption] Erro ao atualizar configuração:', error);
    return false;
  }
}

/**
 * Remove uma configuração LN Markets
 */
export function removeLNMarketsConfig(userEmail: string, configId: string): boolean {
  try {
    const currentConfigs = retrieveLNMarketsMultipleConfigs(userEmail);
    if (!currentConfigs) return false;

    const filteredConfigs = currentConfigs.configs.filter(c => c.id !== configId);
    
    // Se removeu a configuração padrão, definir nova padrão
    let newDefaultId = currentConfigs.defaultConfigId;
    if (currentConfigs.defaultConfigId === configId) {
      newDefaultId = filteredConfigs.length > 0 ? filteredConfigs[0].id : undefined;
    }

    const updatedConfigs: LNMarketsMultipleConfig = {
      configs: filteredConfigs,
      defaultConfigId: newDefaultId,
      lastUpdated: new Date().toISOString()
    };

    return saveLNMarketsMultipleConfigs(userEmail, updatedConfigs);
  } catch (error) {
    console.error('[Encryption] Erro ao remover configuração:', error);
    return false;
  }
}

/**
 * Define uma configuração como padrão
 */
export function setDefaultLNMarketsConfig(userEmail: string, configId: string): boolean {
  try {
    const currentConfigs = retrieveLNMarketsMultipleConfigs(userEmail);
    if (!currentConfigs) return false;

    const configExists = currentConfigs.configs.some(c => c.id === configId);
    if (!configExists) {
      console.error('[Encryption] Configuração não encontrada:', configId);
      return false;
    }

    const updatedConfigs: LNMarketsMultipleConfig = {
      ...currentConfigs,
      defaultConfigId: configId,
      lastUpdated: new Date().toISOString()
    };

    return saveLNMarketsMultipleConfigs(userEmail, updatedConfigs);
  } catch (error) {
    console.error('[Encryption] Erro ao definir configuração padrão:', error);
    return false;
  }
}

/**
 * Obtém uma configuração específica
 */
export function getLNMarketsConfig(userEmail: string, configId: string): LNMarketsAPIConfig | null {
  try {
    const currentConfigs = retrieveLNMarketsMultipleConfigs(userEmail);
    if (!currentConfigs) return null;

    return currentConfigs.configs.find(c => c.id === configId) || null;
  } catch (error) {
    console.error('[Encryption] Erro ao obter configuração:', error);
    return null;
  }
}

/**
 * Migra configuração única para o sistema múltiplo
 */
function migrateSingleConfigToMultiple(userEmail: string, singleConfig: LNMarketsCredentials): LNMarketsMultipleConfig {
  const configId = generateConfigId();
  const now = new Date().toISOString();
  
  const migratedConfig: LNMarketsAPIConfig = {
    id: configId,
    name: "Conta Principal",
    description: "Migrada automaticamente da configuração única",
    credentials: singleConfig,
    isActive: true,
    createdAt: now,
    updatedAt: now
  };

  const multipleConfig: LNMarketsMultipleConfig = {
    configs: [migratedConfig],
    defaultConfigId: configId,
    lastUpdated: now
  };

  // Salvar nova estrutura
  saveLNMarketsMultipleConfigs(userEmail, multipleConfig);
  
  // Remover configuração única antiga
  const userHash = hashUserEmail(userEmail);
  localStorage.removeItem(`lnmarkets_${userHash}`);
  
  console.log('[Encryption] Migração concluída: configuração única → múltipla');
  return multipleConfig;
} 