import { useState, useEffect } from 'react';
import { useAuth } from './use-auth';

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
  const [defaultCurrency, setDefaultCurrencyState] = useState<DefaultCurrency>('USD');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Carregar moeda padrão das configurações do usuário (localStorage)
    try {
      const savedSettings = localStorage.getItem("userSettings");
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        if (parsedSettings.currency && (parsedSettings.currency === 'USD' || parsedSettings.currency === 'BRL')) {
          setDefaultCurrencyState(parsedSettings.currency);
        }
      }
    } catch (error) {
      console.error('[useDefaultCurrency] Erro ao carregar moeda padrão:', error);
      // Manter USD como padrão em caso de erro
    }
    
    setIsLoading(false);
  }, []);

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

  const setDefaultCurrency = (currency: DefaultCurrency) => {
    setDefaultCurrencyState(currency);
    
    // Atualizar também no localStorage para persistir
    try {
      const savedSettings = localStorage.getItem("userSettings");
      const currentSettings = savedSettings ? JSON.parse(savedSettings) : {};
      const updatedSettings = { ...currentSettings, currency };
      localStorage.setItem("userSettings", JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('[useDefaultCurrency] Erro ao salvar moeda padrão:', error);
    }
  };

  return {
    defaultCurrency,
    isLoading,
    getCurrencyConfig,
    formatCurrency,
    getDisplayCurrency,
    setDefaultCurrency,
    availableCurrencies: Object.values(CURRENCY_CONFIGS)
  };
} 