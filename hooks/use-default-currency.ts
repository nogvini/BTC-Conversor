import { useState, useEffect } from 'react';
import { useAuth } from './use-auth';
import { retrieveLNMarketsMultipleConfigs } from '@/lib/encryption';

export type DefaultCurrency = 'USD' | 'BRL';

interface DefaultCurrencyConfig {
  currency: DefaultCurrency;
  symbol: string;
  name: string;
}

const CURRENCY_CONFIGS: Record<DefaultCurrency, DefaultCurrencyConfig> = {
  USD: {
    currency: 'USD',
    symbol: '$',
    name: 'Dólar Americano'
  },
  BRL: {
    currency: 'BRL',
    symbol: 'R$',
    name: 'Real Brasileiro'
  }
};

export function useDefaultCurrency() {
  const { session } = useAuth();
  const { user } = session;
  const [defaultCurrency, setDefaultCurrency] = useState<DefaultCurrency>('USD');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.email) {
      try {
        // Buscar configurações LN Markets do usuário
        const configs = retrieveLNMarketsMultipleConfigs(user.email);
        
        if (configs && configs.configs.length > 0) {
          // Procurar pela configuração padrão primeiro
          const defaultConfig = configs.configs.find(config => 
            config.id === configs.defaultConfigId && config.isActive
          );
          
          if (defaultConfig && (defaultConfig as any).defaultCurrency) {
            setDefaultCurrency((defaultConfig as any).defaultCurrency);
          } else {
            // Se não houver configuração padrão, usar a primeira configuração ativa
            const activeConfig = configs.configs.find(config => 
              config.isActive && (config as any).defaultCurrency
            );
            
            if (activeConfig) {
              setDefaultCurrency((activeConfig as any).defaultCurrency);
            }
          }
        }
      } catch (error) {
        console.error('[useDefaultCurrency] Erro ao carregar moeda padrão:', error);
        // Manter USD como padrão em caso de erro
      }
    }
    
    setIsLoading(false);
  }, [user?.email]);

  const getCurrencyConfig = (currency?: DefaultCurrency): DefaultCurrencyConfig => {
    return CURRENCY_CONFIGS[currency || defaultCurrency];
  };

  const formatCurrency = (value: number, currency?: DefaultCurrency): string => {
    const config = getCurrencyConfig(currency);
    
    if (config.currency === 'BRL') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    } else {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(value);
    }
  };

  const getDisplayCurrency = () => {
    return getCurrencyConfig();
  };

  return {
    defaultCurrency,
    isLoading,
    getCurrencyConfig,
    formatCurrency,
    getDisplayCurrency,
    setDefaultCurrency, // Para permitir mudanças manuais se necessário
    availableCurrencies: Object.values(CURRENCY_CONFIGS)
  };
} 