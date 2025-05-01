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

## Melhorias Recentes

### Otimização de Notificações
- Removidas notificações redundantes ao mudar o período no gráfico histórico
- Notificações de atualização de preço são mostradas apenas quando há mudanças significativas (>0.1%)
- Mantidas apenas notificações críticas para erros de conexão e dados em cache

### Tema Escuro Forçado
- A aplicação agora sempre usa o tema escuro, independente das preferências do navegador
- Melhor consistência visual entre dispositivos e usuários
- Otimizado para visualização de dados financeiros

### Exportação Excel
- Adicionada exportação de dados completos ou mensais
- Estatísticas detalhadas de rendimento e lucros incluídas
- Valores em BTC, USD e BRL disponíveis em todas as planilhas

### Filtro Mensal
- Implementado filtro por mês no histórico
- Visualização detalhada de aportes e lucros/perdas
- Estatísticas de rendimento por período

### Otimização de Requisições para Gráficos
- **Cache Local no Componente**: Mantém dados por período e moeda para navegação instantânea
- **Pré-carregamento Inteligente**: Carrega períodos adjacentes em segundo plano
- **Cache Global no Servidor**: Reduz chamadas à API externa com dados compartilhados
- **Cache no Navegador**: Usa headers HTTP para permitir cache local por 5 minutos

### Interface Responsiva
- Adaptações específicas para dispositivos móveis
- Menu de navegação otimizado para telas pequenas
- Visualização de gráficos adaptada para diferentes tamanhos de tela