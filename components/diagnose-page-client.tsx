"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle, RefreshCw, FileX, ExternalLink } from 'lucide-react';

export default function DiagnosePageClient() {
  const [loading, setLoading] = useState(false);
  const [chromiumResult, setChromiumResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testChromium = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/diagnostics/chromium');
      const data = await response.json();
      
      setChromiumResult(data);
      
      if (!response.ok) {
        setError(`Erro ${response.status}: ${data.error || 'Falha no diagnóstico'}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const testPdfExport = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Dados mínimos para teste de PDF
      const testReport = {
        id: 'test-report',
        name: 'Relatório de Teste',
        description: 'Relatório para teste de exportação PDF',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        investments: [
          {
            id: 'test-inv-1',
            date: new Date().toISOString(),
            amount: 1000,
            unit: 'BTC',
          }
        ],
        profits: [],
        withdrawals: []
      };
      
      const requestData = {
        report: testReport,
        displayCurrency: 'USD',
        reportPeriodDescription: 'Teste de diagnóstico'
      };
      
      const response = await fetch('/api/export/report-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro ${response.status}: ${errorData.error || errorData.details || 'Falha na exportação'}`);
      }
      
      // Se chegou aqui, o PDF foi gerado com sucesso
      const blob = await response.blob();
      
      // Criar um URL para download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'teste-relatorio.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setChromiumResult({
        pdfTest: {
          success: true,
          message: 'PDF gerado com sucesso',
          size: `${(blob.size / 1024).toFixed(2)} KB`
        }
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setChromiumResult({
        pdfTest: {
          success: false,
          error: err instanceof Error ? err.message : 'Erro desconhecido'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Diagnóstico do Sistema</CardTitle>
          <CardDescription>
            Ferramentas para diagnosticar problemas no ambiente serverless
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={testChromium} 
              disabled={loading}
              variant="outline"
            >
              {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
              Testar Chromium
            </Button>
            
            <Button 
              onClick={testPdfExport} 
              disabled={loading}
              variant="default"
            >
              {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
              Testar Exportação PDF
            </Button>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {chromiumResult && (
            <div className="space-y-4 mt-4">
              <h3 className="text-lg font-medium">Resultado do Diagnóstico</h3>
              
              {chromiumResult.chromiumTest && (
                <div className="rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Chromium</h4>
                    <Badge variant={chromiumResult.chromiumTest.success ? "success" : "destructive"}>
                      {chromiumResult.chromiumTest.success ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <FileX className="h-3 w-3 mr-1" />
                      )}
                      {chromiumResult.chromiumTest.success ? "OK" : "Falha"}
                    </Badge>
                  </div>
                  
                  <Separator className="my-2" />
                  
                  <div className="space-y-2 text-sm">
                    {chromiumResult.chromiumTest.success ? (
                      <>
                        <div className="grid grid-cols-3 gap-1">
                          <span className="font-medium">Caminho:</span>
                          <span className="col-span-2 break-all">{chromiumResult.chromiumTest.executablePath}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <span className="font-medium">Versão:</span>
                          <span className="col-span-2">{chromiumResult.chromiumTest.browserVersion}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-1">
                          <span className="font-medium">Erro:</span>
                          <span className="col-span-2 text-red-500">{chromiumResult.chromiumTest.error}</span>
                        </div>
                      </>
                    )}
                    
                    <div className="grid grid-cols-3 gap-1">
                      <span className="font-medium">Ambiente:</span>
                      <span className="col-span-2">
                        {chromiumResult.environment?.isVercel ? 'Vercel' : 'Local'} ({chromiumResult.environment?.nodeEnv})
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {chromiumResult.pdfTest && (
                <div className="rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Teste de PDF</h4>
                    <Badge variant={chromiumResult.pdfTest.success ? "success" : "destructive"}>
                      {chromiumResult.pdfTest.success ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <FileX className="h-3 w-3 mr-1" />
                      )}
                      {chromiumResult.pdfTest.success ? "OK" : "Falha"}
                    </Badge>
                  </div>
                  
                  <Separator className="my-2" />
                  
                  <div className="space-y-2 text-sm">
                    {chromiumResult.pdfTest.success ? (
                      <>
                        <div className="grid grid-cols-3 gap-1">
                          <span className="font-medium">Status:</span>
                          <span className="col-span-2">{chromiumResult.pdfTest.message}</span>
                        </div>
                        {chromiumResult.pdfTest.size && (
                          <div className="grid grid-cols-3 gap-1">
                            <span className="font-medium">Tamanho:</span>
                            <span className="col-span-2">{chromiumResult.pdfTest.size}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-1">
                          <span className="font-medium">Erro:</span>
                          <span className="col-span-2 text-red-500">{chromiumResult.pdfTest.error}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground flex justify-between">
          <span>Última verificação: {chromiumResult?.timestamp ? new Date(chromiumResult.timestamp).toLocaleString() : 'Nunca'}</span>
          <a 
            href="https://vercel.com/docs/functions/serverless-functions/runtimes/node-js#nodejs-function-limitations" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center text-blue-500 hover:underline"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Documentação
          </a>
        </CardFooter>
      </Card>
    </div>
  );
} 