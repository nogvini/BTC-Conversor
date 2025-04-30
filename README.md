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

## Melhorias recentes

### Otimização de Requisições para Gráficos

Implementamos um sistema de cache em múltiplas camadas para melhorar a experiência ao alternar entre diferentes períodos de visualização:

1. **Cache Local no Componente**: 
   - Mantém dados por período e moeda
   - Evita requisições desnecessárias durante navegação
   - Atualiza em segundo plano se dados tiverem mais de 10 minutos

2. **Pré-carregamento Inteligente**:
   - Carrega automaticamente períodos adjacentes em segundo plano
   - Quando o usuário visualiza um período (ex: 30 dias), os períodos próximos (7 dias e 90 dias) são pré-carregados

3. **Cache Global no Servidor**:
   - Dados compartilhados entre todos os usuários
   - Reduz chamadas à API externa
   - Atualiza dados em segundo plano para manter-se atual

4. **Cache no Navegador**:
   - Usa headers HTTP para permitir cache local por 5 minutos
   - Integração com TradingView como fonte preferencial de dados

### Como funciona

Quando um usuário seleciona um período para visualizar (ex: 7 dias, 30 dias, etc.):

1. Sistema verifica se os dados já estão em cache local
2. Se estiverem disponíveis e atualizados, mostra instantaneamente
3. Se não, busca do servidor (que pode ter em cache também)
4. Em segundo plano, pré-carrega períodos adjacentes para transição suave
5. Ao mudar de período, não precisa mais aguardar requisições adicionais

Esta abordagem proporciona uma experiência fluida ao navegar entre diferentes períodos de tempo, reduzindo drasticamente o número de requisições à API externa.