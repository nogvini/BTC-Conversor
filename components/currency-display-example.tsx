"use client";

import { useDefaultCurrency } from "@/hooks/use-default-currency";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Banknote } from "lucide-react";

/**
 * Componente de exemplo que demonstra como usar o hook useDefaultCurrency
 * Este componente pode ser usado como referência para implementar a moeda padrão
 * em outros lugares da aplicação.
 */
export function CurrencyDisplayExample() {
  const { 
    defaultCurrency, 
    formatCurrency, 
    getDisplayCurrency, 
    isLoading,
    availableCurrencies 
  } = useDefaultCurrency();

  if (isLoading) {
    return (
      <Card className="bg-black/30 border border-purple-700/40">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-purple-700/30 rounded w-1/2 mb-2"></div>
            <div className="h-6 bg-purple-700/30 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currencyConfig = getDisplayCurrency();
  const exampleValue = 50000; // Valor de exemplo em USD

  return (
    <Card className="bg-black/30 border border-purple-700/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {defaultCurrency === 'USD' ? (
            <DollarSign className="h-5 w-5 text-green-400" />
          ) : (
            <Banknote className="h-5 w-5 text-blue-400" />
          )}
          Moeda Padrão do Usuário
        </CardTitle>
        <CardDescription>
          Configuração baseada nas preferências do usuário nas configurações LN Markets
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-purple-300">Moeda Ativa:</span>
          <Badge variant="default" className="bg-purple-600">
            {currencyConfig.currency} - {currencyConfig.name}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-purple-300">Símbolo:</span>
          <span className="font-mono text-lg text-white">{currencyConfig.symbol}</span>
        </div>

        <div className="border-t border-purple-700/30 pt-4">
          <h4 className="text-sm font-medium text-purple-300 mb-2">Exemplo de Formatação:</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Valor bruto:</span>
              <span className="font-mono text-white">{exampleValue}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Formatado:</span>
              <span className="font-mono text-lg text-green-400">
                {formatCurrency(exampleValue)}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-purple-700/30 pt-4">
          <h4 className="text-sm font-medium text-purple-300 mb-2">Moedas Disponíveis:</h4>
          <div className="flex gap-2">
            {availableCurrencies.map((currency) => (
              <Badge 
                key={currency.currency}
                variant={currency.currency === defaultCurrency ? "default" : "secondary"}
                className="text-xs"
              >
                {currency.symbol} {currency.currency}
              </Badge>
            ))}
          </div>
        </div>

        <div className="bg-purple-900/20 p-3 rounded-md border border-purple-700/30">
          <p className="text-xs text-purple-300">
            💡 <strong>Dica:</strong> A moeda padrão é definida nas configurações LN Markets do usuário. 
            Quando uma configuração é marcada como padrão e ativa, sua moeda preferida é aplicada 
            automaticamente em toda a aplicação.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default CurrencyDisplayExample; 