"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { fetchLNMarketsDeposits } from "@/lib/ln-markets-client";
import { retrieveLNMarketsMultipleConfigs } from "@/lib/encryption";
import { convertDepositToInvestment } from "@/lib/ln-markets-converters";

export default function TestDepositsPage() {
  const { session } = useAuth();
  const { user } = session;
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runDepositsTest = async () => {
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
      console.log('[TestDeposits] Iniciando teste completo de depósitos...');

      // 1. Verificar configurações
      const configs = retrieveLNMarketsMultipleConfigs(user.email);
      console.log('[TestDeposits] Configurações encontradas:', configs);

      if (!configs || configs.configs.length === 0) {
        throw new Error('Nenhuma configuração LN Markets encontrada');
      }

      const activeConfig = configs.configs.find(c => c.isActive);
      if (!activeConfig) {
        throw new Error('Nenhuma configuração ativa encontrada');
      }

      console.log('[TestDeposits] Configuração ativa:', activeConfig);

      // 2. Testar requisição à API
      console.log('[TestDeposits] Fazendo requisição à API...');
      const response = await fetchLNMarketsDeposits(user.email, activeConfig.id);
      console.log('[TestDeposits] Resposta da API:', response);

      if (!response.success) {
        throw new Error(`Erro na API: ${response.error}`);
      }

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Dados de resposta inválidos');
      }

      // 3. Testar conversão de depósitos
      const deposits = response.data;
      console.log('[TestDeposits] Testando conversão de depósitos...');

      const conversionResults = [];
      const conversionErrors = [];

      for (const deposit of deposits) {
        try {
          console.log('[TestDeposits] Convertendo depósito:', deposit);
          const converted = convertDepositToInvestment(deposit);
          conversionResults.push({
            original: deposit,
            converted,
            status: 'success'
          });
        } catch (error: any) {
          console.error('[TestDeposits] Erro na conversão:', error);
          conversionErrors.push({
            original: deposit,
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
          totalDeposits: deposits.length,
          confirmedDeposits: deposits.filter(d => d.status === 'confirmed').length,
          pendingDeposits: deposits.filter(d => d.status !== 'confirmed').length
        },
        conversionTest: {
          totalProcessed: deposits.length,
          successfulConversions: conversionResults.length,
          failedConversions: conversionErrors.length,
          conversionResults,
          conversionErrors
        },
        depositsData: deposits.slice(0, 5) // Primeiros 5 depósitos para análise
      };

      console.log('[TestDeposits] Resultados do teste:', testResults);
      setResults(testResults);

      toast({
        title: "✅ Teste concluído",
        description: `${testResults.apiTest.totalDeposits} depósitos encontrados, ${testResults.conversionTest.successfulConversions} conversões bem-sucedidas`,
        variant: "default"
      });

    } catch (error: any) {
      console.error('[TestDeposits] Erro no teste:', error);
      
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
          <CardTitle className="text-purple-400">🧪 Teste de Importação de Depósitos</CardTitle>
          <CardDescription>
            Página de diagnóstico para identificar problemas na importação de depósitos LN Markets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={runDepositsTest}
            disabled={isLoading || !user?.email}
            className="w-full"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Executando teste...
              </>
            ) : (
              "🔍 Executar Teste Completo"
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