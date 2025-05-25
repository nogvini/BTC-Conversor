"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { fetchLNMarketsTrades } from "@/lib/ln-markets-client";
import { retrieveLNMarketsMultipleConfigs } from "@/lib/encryption";
import { convertTradeToProfit } from "@/lib/ln-markets-converters";

export default function TestTradesPage() {
  const { session } = useAuth();
  const { user } = session;
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runTradesTest = async () => {
    if (!user?.email) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setResults(null);

    try {
      console.log('[TestTrades] Iniciando teste completo de trades...');

      // 1. Verificar configurações
      const configs = retrieveLNMarketsMultipleConfigs(user.email);
      console.log('[TestTrades] Configurações encontradas:', configs);

      if (!configs || configs.configs.length === 0) {
        throw new Error('Nenhuma configuração LN Markets encontrada');
      }

      const activeConfig = configs.configs.find(c => c.isActive);
      if (!activeConfig) {
        throw new Error('Nenhuma configuração ativa encontrada');
      }

      console.log('[TestTrades] Configuração ativa:', activeConfig);

      // 2. Testar requisição à API
      console.log('[TestTrades] Fazendo requisição à API...');
      const response = await fetchLNMarketsTrades(user.email, activeConfig.id);
      console.log('[TestTrades] Resposta da API:', response);

      if (!response.success) {
        throw new Error(`Erro na API: ${response.error}`);
      }

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Dados de resposta inválidos');
      }

      // 3. Testar conversão de trades
      const trades = response.data;
      console.log('[TestTrades] Testando conversão de trades...');

      const conversionResults = [];
      const conversionErrors = [];
      const dateAnalysis = {
        tradesWithClosedAt: 0,
        tradesWithUpdatedAt: 0,
        tradesWithCreatedAt: 0,
        tradesWithoutAnyDate: 0,
        dateFormats: new Set(),
        sampleDates: []
      };

      for (const trade of trades) {
        try {
          console.log('[TestTrades] Analisando trade:', trade);
          
          // Análise de datas
          if (trade.closed_at) {
            dateAnalysis.tradesWithClosedAt++;
            dateAnalysis.dateFormats.add(`closed_at: ${typeof trade.closed_at}`);
            if (dateAnalysis.sampleDates.length < 5) {
              dateAnalysis.sampleDates.push({
                source: 'closed_at',
                value: trade.closed_at,
                type: typeof trade.closed_at,
                tradeId: trade.id
              });
            }
          }
          
          if (trade.updated_at) {
            dateAnalysis.tradesWithUpdatedAt++;
            dateAnalysis.dateFormats.add(`updated_at: ${typeof trade.updated_at}`);
            if (dateAnalysis.sampleDates.length < 5) {
              dateAnalysis.sampleDates.push({
                source: 'updated_at',
                value: trade.updated_at,
                type: typeof trade.updated_at,
                tradeId: trade.id
              });
            }
          }
          
          if (trade.created_at) {
            dateAnalysis.tradesWithCreatedAt++;
            dateAnalysis.dateFormats.add(`created_at: ${typeof trade.created_at}`);
            if (dateAnalysis.sampleDates.length < 5) {
              dateAnalysis.sampleDates.push({
                source: 'created_at',
                value: trade.created_at,
                type: typeof trade.created_at,
                tradeId: trade.id
              });
            }
          }
          
          if (!trade.closed_at && !trade.updated_at && !trade.created_at) {
            dateAnalysis.tradesWithoutAnyDate++;
          }

          const converted = convertTradeToProfit(trade);
          conversionResults.push({
            original: trade,
            converted,
            status: 'success'
          });
        } catch (error: any) {
          console.error('[TestTrades] Erro na conversão:', error);
          conversionErrors.push({
            original: trade,
            error: error.message,
            status: 'error'
          });
        }
      }

      // 4. Compilar resultados
      const testResults = {
        configTest: {
          hasConfigs: !!configs,
          totalConfigs: configs?.configs.length || 0,
          activeConfigId: activeConfig.id,
          activeConfigName: activeConfig.name,
          credentialsValid: !!(activeConfig.credentials?.key && activeConfig.credentials?.secret && activeConfig.credentials?.passphrase)
        },
        apiTest: {
          success: response.success,
          hasData: !!response.data,
          dataType: typeof response.data,
          isArray: Array.isArray(response.data),
          totalTrades: trades.length,
          closedTrades: trades.filter(t => t.closed).length,
          openTrades: trades.filter(t => !t.closed).length
        },
        dateAnalysis: {
          ...dateAnalysis,
          dateFormats: Array.from(dateAnalysis.dateFormats)
        },
        conversionTest: {
          totalProcessed: trades.length,
          successfulConversions: conversionResults.length,
          failedConversions: conversionErrors.length,
          conversionResults: conversionResults.slice(0, 3), // Primeiras 3 conversões
          conversionErrors
        },
        tradesData: trades.slice(0, 3) // Primeiros 3 trades para análise
      };

      console.log('[TestTrades] Resultados do teste:', testResults);
      setResults(testResults);

      toast({
        title: "✅ Teste concluído",
        description: `${testResults.apiTest.totalTrades} trades encontrados, ${testResults.conversionTest.successfulConversions} conversões bem-sucedidas`,
        variant: "default"
      });

    } catch (error: any) {
      console.error('[TestTrades] Erro no teste:', error);
      
      setResults({
        error: error.message,
        timestamp: new Date().toISOString()
      });

      toast({
        title: "❌ Erro no teste",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card className="bg-black/30 border border-purple-700/40">
        <CardHeader>
          <CardTitle className="text-purple-400">🧪 Teste de Importação de Trades</CardTitle>
          <CardDescription>
            Página de diagnóstico para identificar problemas com datas de trades LN Markets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={runTradesTest}
            disabled={isLoading || !user?.email}
            className="w-full"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Executando teste...
              </>
            ) : (
              "🔍 Executar Teste de Trades"
            )}
          </Button>

          {!user?.email && (
            <p className="text-red-400 text-sm">
              ⚠️ Usuário não autenticado. Faça login para continuar.
            </p>
          )}
        </CardContent>
      </Card>

      {results && (
        <Card className="bg-black/30 border border-green-700/40">
          <CardHeader>
            <CardTitle className="text-green-400">📊 Resultados do Teste</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-black/50 p-4 rounded-lg text-xs overflow-auto max-h-96 text-green-300">
              {JSON.stringify(results, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 