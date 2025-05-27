# Configuração do Chromium em Ambiente Serverless

Este documento descreve a configuração necessária para executar o Puppeteer com Chromium em ambientes serverless como a Vercel.

## Problema Original

Ao tentar executar o Puppeteer em um ambiente serverless, encontramos o seguinte erro:

```
Erro fatal ao gerar relatório PDF: Error: Tried to find the browser at the configured path (node_modules/@sparticuz/chromium/bin), but no executable was found.
```

## Solução

Para resolver este problema, implementamos as seguintes alterações:

1. **Uso do @sparticuz/chromium**: Este pacote é otimizado para ambientes serverless e fornece binários do Chromium compatíveis com a Vercel.

2. **Configuração do Puppeteer**: Usamos o puppeteer-core em vez do puppeteer completo e configuramos para usar o caminho do executável fornecido pelo @sparticuz/chromium.

3. **Configuração da Vercel**: Ajustamos o arquivo vercel.json para fornecer memória adequada e tempo de execução para as funções serverless.

## Configuração do Chromium

```typescript
// Importações
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

// Função para obter uma instância do navegador
async function getBrowser() {
  return puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });
}
```

## Configuração vercel.json

```json
{
  "functions": {
    "app/api/export/report-pdf/route.ts": {
      "memory": 3008,
      "maxDuration": 60
    }
  }
}
```

## Variáveis de Ambiente

```
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

## Ferramentas de Diagnóstico

Para facilitar a identificação de problemas, criamos:

1. **API de Diagnóstico**: `/api/diagnostics/chromium` - Verifica a instalação do Chromium e retorna informações detalhadas.

2. **Página de Diagnóstico**: `/admin/diagnose` - Interface para executar testes de diagnóstico e visualizar resultados.

## Limitações do Ambiente Serverless

- **Memória**: As funções precisam de pelo menos 3GB de RAM para o Chromium funcionar corretamente.
- **Tempo de execução**: Limitado a 60 segundos na Vercel, o que deve ser suficiente para a maioria dos PDFs.
- **Armazenamento temporário**: Limitado, portanto não é recomendado gerar PDFs muito grandes.

## Recomendações

1. **Otimização de HTML**: Mantenha o HTML para o PDF o mais simples possível para reduzir o tempo de renderização.
2. **Memória Cache**: Considere armazenar PDFs gerados frequentemente em um serviço de armazenamento como o Supabase Storage.
3. **Monitoramento**: Use logs detalhados para identificar problemas de desempenho ou falhas. 