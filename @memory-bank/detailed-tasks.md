# Tarefas Detalhadas - Raid Bitcoin Toolkit

Este documento detalha as tarefas para o desenvolvimento do Raid Bitcoin Toolkit, com ênfase em unidades menores e mais gerenciáveis. As tarefas estão organizadas por área funcional e prioridade, com estimativas de complexidade.

## Sistema de Autenticação

### A1.1: Investigação e Otimização do Delay no Login
- **Complexidade**: Alta
- **Prioridade**: Crítica

#### A1.1.1: Profiling do Login
- [ ] Adicionar timestamps nos pontos-chave do processo de login para identificar atrasos
- [ ] Comparar tempos entre diferentes ambientes (desenvolvimento/produção)
- [ ] Documentar resultados e compartilhar com a equipe

#### A1.1.2: Análise do AuthProvider
- [ ] Revisar o código do AuthProvider para identificar operações bloqueantes
- [ ] Verificar chamadas ao Supabase durante inicialização do AuthProvider
- [ ] Analisar comunicação entre abas durante o login

#### A1.1.3: Otimização do Hook useAuth
- [ ] Implementar memorização (useMemo/useCallback) para prevenir renderizações desnecessárias
- [ ] Eliminar renders redundantes verificando dependências dos hooks
- [ ] Otimizar chamadas a métodos do Supabase

#### A1.1.4: Lazy Loading de Componentes
- [ ] Identificar componentes não críticos no fluxo de login
- [ ] Implementar carregamento dinâmico com dynamic imports do Next.js
- [ ] Testar performance de carregamento após alterações

### A1.2: Correção do Carregamento Infinito na Home
- **Complexidade**: Média
- **Prioridade**: Crítica

#### A1.2.1: Análise do Problema
- [ ] Reproduzir o problema em ambiente de desenvolvimento
- [ ] Adicionar logs para identificar onde o ciclo infinito ocorre
- [ ] Verificar ordem de inicialização de componentes na home

#### A1.2.2: Correção da Hierarquia de Componentes
- [ ] Garantir que useAuth seja usado apenas dentro de AuthProvider
- [ ] Reestruturar layout.tsx para garantir AuthProvider ativo
- [ ] Implementar verificação de disponibilidade do contexto de autenticação

#### A1.2.3: Implementação de Fallbacks
- [ ] Criar componentes de fallback para exibir durante o carregamento
- [ ] Adicionar timeout para evitar ciclos infinitos
- [ ] Implementar recuperação de erros durante inicialização

### A1.3: Melhoria de Feedback Visual na Autenticação
- **Complexidade**: Baixa
- **Prioridade**: Alta

#### A1.3.1: Indicadores de Carregamento
- [ ] Adicionar componente de spinner durante autenticação
- [ ] Implementar skeleton screens para conteúdo que depende de dados
- [ ] Criar transições suaves entre estados de carregamento

#### A1.3.2: Mensagens de Status
- [ ] Implementar mensagens informativas durante os passos de autenticação
- [ ] Adicionar mensagens de erro detalhadas e acionáveis
- [ ] Criar sistema de notificações para alertas de autenticação

#### A1.3.3: Melhorias de UX no Formulário
- [ ] Desabilitar botões durante o processamento de login/registro
- [ ] Adicionar validação em tempo real dos campos de formulário
- [ ] Melhorar design visual dos estados de validação

### A1.4: Otimização do Padrão Singleton
- **Complexidade**: Alta
- **Prioridade**: Alta

#### A1.4.1: Refatoração do Singleton
- [ ] Revisar implementação do padrão Singleton para o cliente Supabase
- [ ] Otimizar para performance inicial vs. comunicação entre abas
- [ ] Implementar tratamento de exceções mais robusto

#### A1.4.2: Melhoria da Comunicação entre Abas
- [ ] Revisar uso da API BroadcastChannel
- [ ] Otimizar frequência e payload dos eventos transmitidos
- [ ] Implementar reconexão automática em caso de falha

#### A1.4.3: Testes e Validação
- [ ] Criar casos de teste para cenários com múltiplas abas
- [ ] Verificar uso de memória e CPU em diferentes cenários
- [ ] Validar comportamento em diferentes navegadores

### A1.5: Funcionalidade "Lembrar-me"
- **Complexidade**: Média
- **Prioridade**: Média

#### A1.5.1: UI para "Lembrar-me"
- [ ] Adicionar checkbox no formulário de login
- [ ] Persistir preferência do usuário
- [ ] Estilizar de acordo com o design system

#### A1.5.2: Implementação no Backend
- [ ] Configurar Supabase para sessões prolongadas
- [ ] Implementar lógica para gerenciar expiração de sessão
- [ ] Garantir segurança com refresh tokens

#### A1.5.3: Sincronização entre Dispositivos
- [ ] Garantir que sessões sejam válidas entre dispositivos
- [ ] Implementar lista de dispositivos logados (opcional)
- [ ] Adicionar opção para encerrar sessões remotamente

## Calculadora de Lucros - Múltiplos Relatórios

### A2.1: Interface para Criação e Seleção de Relatórios
- **Complexidade**: Média
- **Prioridade**: Alta

#### A2.1.1: Modal de Criação de Relatórios
- [ ] Implementar UI do modal de criação
- [ ] Adicionar campos para nome, descrição e configuração do relatório
- [ ] Criar validações para evitar nomes duplicados

#### A2.1.2: Seletor de Relatório Ativo
- [ ] Desenvolver dropdown/combobox para seleção
- [ ] Implementar design responsivo para o seletor
- [ ] Adicionar shortcut para troca rápida entre relatórios

#### A2.1.3: Gerenciamento de Relatórios
- [ ] Criar interface para editar/excluir relatórios
- [ ] Implementar confirmação antes de excluir relatório
- [ ] Adicionar funcionalidade de duplicar relatório existente

### A2.2: Sistema de Armazenamento para Múltiplos Relatórios
- **Complexidade**: Alta
- **Prioridade**: Alta

#### A2.2.1: Estrutura de Dados
- [ ] Projetar esquema de dados para múltiplos relatórios
- [ ] Implementar migração de dados existentes para nova estrutura
- [ ] Criar sistema de IDs únicos para relatórios

#### A2.2.2: Persistência em localStorage
- [ ] Adaptar sistema de armazenamento para múltiplos relatórios
- [ ] Implementar compressão de dados para otimizar espaço
- [ ] Criar sistema de backup automático

#### A2.2.3: Sincronização na Nuvem (Opcional)
- [ ] Projetar estrutura de dados no Supabase
- [ ] Implementar sincronização bidirecional entre localStorage e nuvem
- [ ] Desenvolver reconciliação de conflitos

### A2.3: Visualização Comparativa entre Relatórios
- **Complexidade**: Alta
- **Prioridade**: Média

#### A2.3.1: Gráficos Comparativos
- [ ] Desenvolver gráficos para comparar performance entre relatórios
- [ ] Implementar seleção de métricas para comparação
- [ ] Adicionar opções de visualização (barras, linhas, etc.)

#### A2.3.2: Tabela de Resumo Consolidado
- [ ] Criar tabela para mostrar dados resumidos de múltiplos relatórios
- [ ] Implementar filtragem e ordenação na tabela
- [ ] Adicionar destacamento visual para valores importantes

#### A2.3.3: Dashboard Customizável
- [ ] Desenvolver interface para personalizar visualizações
- [ ] Permitir salvar layouts favoritos
- [ ] Implementar visualização em tela cheia

### A2.4: Adaptação das Funcionalidades de Importação/Exportação
- **Complexidade**: Média
- **Prioridade**: Alta

#### A2.4.1: Exportação por Relatório
- [ ] Adaptar sistema atual para exportar relatórios específicos
- [ ] Implementar seleção múltipla de relatórios para exportação
- [ ] Criar metadados de relatório no arquivo exportado

#### A2.4.2: Importação com Suporte a Relatórios
- [ ] Adaptar parser para reconhecer estrutura de múltiplos relatórios
- [ ] Implementar UI para mapear dados importados para relatórios
- [ ] Adicionar detecção de conflitos na importação

#### A2.4.3: Melhorias no Sistema de Importação
- [ ] Otimizar o processamento de arquivos grandes
- [ ] Adicionar preview dos dados antes da importação
- [ ] Implementar validação mais robusta dos dados

## Otimizações de Performance

### A3.1: Redução do Tempo de Carregamento Inicial
- **Complexidade**: Média
- **Prioridade**: Alta

#### A3.1.1: Code Splitting
- [ ] Implementar dynamic imports para componentes grandes
- [ ] Configurar code splitting por rota
- [ ] Medir e comparar tempos de carregamento antes/depois

#### A3.1.2: Otimização de Recursos Estáticos
- [ ] Comprimir e otimizar imagens
- [ ] Implementar lazy loading de imagens
- [ ] Configurar font-display para evitar bloqueio de renderização

#### A3.1.3: Preload de Dados Críticos
- [ ] Identificar dados críticos para experiência inicial
- [ ] Implementar preload estratégico desses dados
- [ ] Considerar uso de técnicas de streaming SSR do Next.js

### A3.2: Renderização de Listas e Tabelas
- **Complexidade**: Alta
- **Prioridade**: Média

#### A3.2.1: Virtualização
- [ ] Implementar virtualização para listas longas
- [ ] Testar performance com diferentes quantidades de dados
- [ ] Otimizar recálculo de heights durante scroll

#### A3.2.2: Paginação Eficiente
- [ ] Desenvolver sistema de paginação cliente/servidor
- [ ] Implementar navegação por teclado na paginação
- [ ] Adicionar opções de tamanho de página

#### A3.2.3: Otimização de Re-renderizações
- [ ] Implementar useMemo e useCallback estrategicamente
- [ ] Introduzir memo() para componentes de lista
- [ ] Usar React DevTools para identificar e resolver renderizações desnecessárias

### A3.3: Sistema de Cache
- **Complexidade**: Alta
- **Prioridade**: Média

#### A3.3.1: Cache de Cotações
- [ ] Implementar sistema de cache com TTL (time-to-live)
- [ ] Adicionar invalidação seletiva de cache
- [ ] Criar sistema de fallback para dados offline

#### A3.3.2: Cache de Dados Históricos
- [ ] Desenvolver estratégia de cache para dados históricos
- [ ] Implementar carregamento progressivo de períodos
- [ ] Otimizar armazenamento para reduzir uso de memória

#### A3.3.3: Service Worker (PWA)
- [ ] Configurar service worker para cache de recursos
- [ ] Implementar estratégias de cache para APIs
- [ ] Desenvolver experiência offline básica

## Próximos Sprints

### Sprint 1: Autenticação e Performance Crítica (5 dias)
- Implementar A1.1.1 a A1.1.3: Profiling e otimizações iniciais do login
- Implementar A1.2.1 a A1.2.3: Correção do carregamento infinito
- Implementar A1.3.1: Adicionar indicadores de carregamento

### Sprint 2: Múltiplos Relatórios - Fundação (5 dias)
- Implementar A2.1.1 a A2.1.2: Modal de criação e seletor de relatórios
- Implementar A2.2.1: Projetar e implementar estrutura de dados
- Implementar A3.1.1: Code splitting inicial

### Sprint 3: Experiência do Usuário e Otimizações (5 dias)
- Implementar A1.3.2 a A1.3.3: Melhorias completas de feedback visual
- Implementar A2.2.2: Persistência no localStorage
- Implementar A3.2.1: Virtualização para listas longas

### Sprint 4: Finalização de Múltiplos Relatórios (5 dias)
- Implementar A2.1.3: Gerenciamento completo de relatórios
- Implementar A2.3.1 a A2.3.2: Visualizações comparativas
- Implementar A2.4.1 a A2.4.2: Adaptação de importação/exportação

## Plano Detalhado: Correção Urgente da Navegação Entre Abas

### Contexto do Problema
Após a remoção do componente `SafeNavigationBar` duplicado do `BitcoinConverter`, as abas não estão sendo carregadas corretamente quando o usuário clica nas opções do menu de navegação (Conversor, Gráficos, Calculadora). A mudança que resolveu o problema de menu duplicado quebrou a comunicação entre a navegação e o conteúdo das abas.

### Causas Prováveis
1. **Perda do estado compartilhado**: O hook `useActiveTab()` utilizado em ambos (navegação e conteúdo) não está sincronizando corretamente.
2. **Falha na atualização do conteúdo**: O componente `BitcoinConverter` não está respondendo às mudanças de parâmetros de URL.
3. **Arquitetura de navegação inconsistente**: A refatoração removeu a navegação interna, mas o `BitcoinConverter` ainda espera que exista uma navegação dentro dele.

### Abordagem de Correção

#### Passo 1: Diagnóstico Detalhado
- Verificar como o hook `useActiveTab()` é implementado e se ele está funcionando corretamente com a mudança de parâmetros URL.
- Verificar se o componente `BitcoinConverter` ainda espera renderizar um `TabsContent` baseado no valor de `activeTab`.
- Verificar se existe algum conflito entre a navegação em `app/page.tsx` e a lógica de abas no `BitcoinConverter`.

#### Passo 2: Implementação da Correção (Opções)

**Opção A: Corrigir a Estrutura Atual**
- Manter a navegação principal em `app/page.tsx` 
- Modificar o componente `BitcoinConverter` para:
  1. Escutar corretamente as mudanças de URL/parâmetros
  2. Ajustar a renderização de conteúdo baseado no valor atualizado de `activeTab`
  3. Usar um efeito específico para reagir a mudanças no parâmetro 'tab' da URL

**Opção B: Reestruturar a Navegação**
- Mover toda a lógica de navegação para `app/page.tsx`
- Criar componentes separados para cada aba (ConverterContent, ChartContent, CalculatorContent)
- Renderizar o componente correto com base no valor do parâmetro 'tab', sem depender da lógica interna do `BitcoinConverter`

**Opção C: Voltar à Abordagem Original com Ajustes**
- Restaurar o `SafeNavigationBar` dentro do `BitcoinConverter` mas com uma flag para desativar a renderização visual
- Manter apenas a lógica de gerenciamento de abas, sem duplicar visualmente os menus

#### Passo 3: Testes Abrangentes
- Testar a navegação em todos os cenários (desktop/mobile)
- Verificar se o conteúdo correto é exibido para cada aba
- Verificar se o histórico de navegação do navegador funciona corretamente com os botões voltar/avançar
- Garantir que não há efeitos colaterais em outras funcionalidades

### Implementação Recomendada
A **Opção A** parece a mais direta e de menor impacto, uma vez que preserva a estrutura atual. O problema provavelmente está na sincronização do estado, não na arquitetura geral.

### Mudanças de Código Necessárias

1. **Modificar o hook `useActiveTab`** para garantir que ele reage corretamente às mudanças de URL:
```tsx
// Adicionar force update
useEffect(() => {
  const tabParam = searchParams.get('tab') as Tab;
  if (tabParam && (tabParam === 'chart' || tabParam === 'calculator' || tabParam === 'converter')) {
    setActiveTab(tabParam);
  }
}, [searchParams]); // Dependência simplificada para reagir apenas a mudanças nos parâmetros
```

2. **Ajustar o `BitcoinConverter`** para garantir que ele sincroniza o estado corretamente:
```tsx
// Adicionar um useEffect específico para forçar recarregamento do conteúdo
useEffect(() => {
  // Forçar atualização do conteúdo quando activeTab mudar
  console.log("Tab changed to:", activeTab);
  // Possivelmente adicionar um forceUpdate ou manipulação específica aqui
}, [activeTab]);
```

### Métricas de Sucesso
- Navegação funcionando em todos os botões e abas
- Não há menus duplicados
- Transições entre abas são suaves e previsíveis
- Dados são preservados ao navegar entre abas 

# Plano de Integração da API LNMarkets

Este plano detalha os passos para integrar a API da LNMarkets ao Raid Bitcoin Toolkit, permitindo aos usuários importar seus depósitos e transações (trades) para o sistema de relatórios.

## Fase 1: Configuração da API LNMarkets no Perfil do Usuário (`user-profile.tsx`)

### 1.1. Identificação dos Campos de API Necessários
- **Tarefa:** Pesquisar e confirmar as credenciais exatas exigidas pela LNMarkets para autenticação de API (API Key, API Secret, Passphrase, etc.).
- **Status:** ✅ Concluído.

### 1.2. Desenvolvimento da Interface do Usuário (UI) e Backend para Credenciais
- **Tarefa:** Adicionar campos no formulário de `user-profile.tsx` para:
    - API Key da LNMarkets
    - API Secret da LNMarkets (ou equivalente)
    - API Passphrase da LNMarkets
- **Tarefa:** Adicionar um botão "Salvar Credenciais LNMarkets".
- **Status Frontend:** ✅ Concluído (Campos e botão adicionados em `user-profile.tsx`).
- **Consideração de Segurança (Backend):**
    - **Preferencial:** As credenciais serão armazenadas de forma segura no backend (Supabase), criptografadas e associadas ao ID do usuário.
    - **Ação Backend:** Criar um novo endpoint/tabela no Supabase para armazenar estas credenciais.
    - **Status Backend:** ⚪️ Pendente (Tabela `user_lnmarkets_credentials` criada. Lógica de endpoint e criptografia pendente).

### 1.3. Validação e Feedback da Configuração
- **Tarefa:** Implementar um botão "Testar Conexão" em `user-profile.tsx`.
    - Esta função fará uma chamada básica à API da LNMarkets (ex: buscar informações do usuário ou saldo) para validar as credenciais, via backend.
- **Status Frontend:** ✅ Concluído (Botão e estrutura da chamada simulada no frontend).
- **Status Backend:** ⚪️ Pendente (Lógica do endpoint de teste pendente).
- **Tarefa:** Fornecer feedback visual (toast/mensagem) ao usuário sobre o sucesso/falha ao salvar ou testar as credenciais.
- **Status:** ✅ Concluído (Toasts implementados no frontend).

## Fase 2: Lógica de Fetch e Transformação de Dados da LNMarkets

### 2.1. Criação de Funções de Serviço da API
- **Tarefa:** No diretório `lib/` (ex: `lib/lnmarkets-api.ts` ou `lib/client-api.ts`), criar as seguintes funções:
    - `fetchLnMarketsDeposits(apiKey, apiSecret)`:
        - Fará a requisição ao endpoint `getDeposits` da LNMarkets.
        - Lida com a autenticação conforme especificado pela LNMarkets.
        - Realiza o tratamento de erros da API.
    - `fetchLnMarketsTrades(apiKey, apiSecret)`:
        - Fará a requisição ao endpoint `getTrades` da LNMarkets.
        - Lida com a autenticação.
        - Realiza o tratamento de erros da API.
    - **Consideração:** Verificar se a API LNMarkets requer paginação para os endpoints `getDeposits` e `getTrades`. Se sim, implementar lógica de paginação.
- **Status:** Pendente.

### 2.2. Transformação de Dados
- **Tarefa:** Implementar lógica para mapear os dados recebidos da LNMarkets para os formatos internos da aplicação:
    - **Depósitos LNMarkets** -> Interface `Investment` (usada em `profit-calculator.tsx`):
        - Mapear campos como data, valor, e possivelmente um ID original.
        - Definir a `unit` (BTC/SATS) com base nos dados da LNMarkets.
    - **Trades LNMarkets** -> Interface `ProfitRecord` (usada em `profit-calculator.tsx`):
        - Mapear campos como data de fechamento (`closed_ts`), ID original.
        - Calcular o valor líquido do trade: `pl - opening_fee - closing_fee - sum_carry_fees`.
        - Determinar `isProfit` com base no valor líquido.
        - Definir a `unit` (BTC/SATS).
- **Status:** Pendente.

## Fase 3: Integração com o Calculador de Lucros (`profit-calculator.tsx`)

### 3.1. Interface do Usuário para Importação LNMarkets
- **Tarefa:** Em `profit-calculator.tsx`, na aba "Registrar" ou em uma nova seção de importação:
    - Adicionar um botão "Importar Dados da LNMarkets".
    - **Consideração:** Se as credenciais não estiverem configuradas, o botão deve estar desabilitado ou levar o usuário à página de perfil para configurá-las.
- **Status:** Pendente.

### 3.2. Lógica de Importação de Dados
- **Tarefa:** Implementar a funcionalidade do botão "Importar Dados da LNMarkets":
    1.  Recuperar credenciais da LNMarkets do usuário (via Supabase/backend).
    2.  Se não configuradas, notificar o usuário.
    3.  Chamar `fetchLnMarketsDeposits` e `fetchLnMarketsTrades`.
    4.  Chamar as funções de transformação de dados.
    5.  **Gerenciamento de Relatórios:**
        - **MVP (Opção 1 - Mais Simples):**
            - Perguntar ao usuário se deseja adicionar os dados importados aos registros atuais.
            - Exibir um resumo dos dados a serem importados (X depósitos, Y trades).
            - Implementar prevenção de duplicatas usando o ID original da LNMarkets (se disponível e mapeado para `originalId` em `Investment`/`ProfitRecord`).
        - **Completo (Opção 2 - Requer Refatoração):**
            - Permitir ao usuário selecionar um relatório existente (se `profit-calculator.tsx` for refatorado para suportar múltiplos relatórios nomeados).
            - Permitir ao usuário criar um novo relatório nomeado para esses dados.
    6.  Adicionar os dados transformados (`Investment[]`, `ProfitRecord[]`) aos arrays de estado (`investments`, `profits`) do relatório selecionado/atual.
    7.  Fornecer feedback (toast) sobre o resultado da importação (sucesso, número de itens, falhas).
- **Status:** Pendente.

## Considerações Gerais e Melhorias Futuras

- **Gerenciamento de Estado das Credenciais:** Definir como as credenciais salvas serão acessadas de forma segura pelo frontend para as chamadas de API.
- **Tratamento de Erros Abrangente:** Em todas as etapas de chamada de API, transformação e importação.
- **Testes:** Testar a integração com dados reais (sandbox da LNMarkets, se disponível) ou mockados.
- **Refatoração para Múltiplos Relatórios (Opcional):** Avaliar a necessidade e o esforço para modificar `profit-calculator.tsx` para suportar múltiplos relatórios nomeados, o que melhoraria a usabilidade da importação de fontes externas.
- **Segurança:** Reforçar que chaves de API NUNCA devem ser expostas no código frontend ou em URLs. O backend é crucial para o armazenamento seguro. 