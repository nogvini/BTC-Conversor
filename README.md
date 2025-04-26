# BTC Conversor

Aplicativo para conversão e monitoramento de preços de Bitcoin, com gráficos históricos e calculadora de lucros.

## Características

- Conversão entre BTC, Satoshis, USD e BRL
- Gráficos históricos de preços do Bitcoin
- Calculadora de lucros/perdas com investimentos
- Exportação de dados para Excel
- Interface responsiva para dispositivos móveis e desktop

## Arquitetura

O aplicativo utiliza uma arquitetura moderna com:

- Interface do usuário construída com Next.js e TailwindCSS
- APIs do servidor para buscar dados de preços e taxas
- Armazenamento persistente no servidor
- Componentes reutilizáveis e responsivos

## APIs Utilizadas

- CoinGecko: Preços e dados históricos do Bitcoin
- Exchange Rate API: Taxas de câmbio USD/BRL

## Como executar

1. Clone o repositório
2. Instale as dependências:
   ```
   npm install
   ```
3. Execute o servidor de desenvolvimento:
   ```
   npm run dev
   ```
4. Acesse o aplicativo em http://localhost:3000

## Estrutura do Projeto

- `/app`: Páginas e rotas do Next.js
- `/app/api`: APIs do servidor
- `/components`: Componentes da interface do usuário
- `/lib`: Bibliotecas e serviços de API
- `/data`: Armazenamento de dados no servidor