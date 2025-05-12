# Tarefas: Raid Bitcoin Toolkit

## Prioridade Alta

### A1. Sistema de Autenticação
- [ ] **A1.1.** Investigar e otimizar o delay no processo de login.
  - [ ] Realizar profiling do processo de login para identificar gargalos.
  - [ ] Otimizar inicialização do AuthProvider.
  - [ ] Implementar lazy loading para componentes não críticos durante o login.
- [ ] **A1.2.** Corrigir o problema de carregamento infinito na home.
  - [ ] Verificar a hierarquia de componentes e uso do hook useAuth.
  - [ ] Garantir que useAuth seja usado apenas dentro do escopo do AuthProvider.
- [ ] **A1.3.** Melhorar feedback visual durante o processo de autenticação.
  - [ ] Adicionar indicadores de carregamento mais visíveis.
  - [ ] Implementar mensagens de status para informar o usuário.
- [ ] **A1.4.** Revisar e otimizar a implementação do padrão Singleton.
  - [ ] Reduzir overhead na comunicação entre abas.
  - [ ] Melhorar gestão de eventos na BroadcastChannel.
- [ ] **A1.5.** Implementar funcionalidade "Lembrar-me".
  - [ ] Adicionar opção no formulário de login.
  - [ ] Configurar persistência de sessão por período estendido.

### A2. Calculadora de Lucros - Sistema de Múltiplos Relatórios
- [x] **A2.1.** Implementar interface para criação e seleção de relatórios.
  - [x] Design do modal de criação de novo relatório.
  - [x] Implementar dropdown/seletor de relatório ativo.
- [x] **A2.2.** Desenvolver sistema de armazenamento para múltiplos relatórios.
  - [x] Adaptar estrutura de dados no localStorage.
  - [x] Adicionar suporte para sincronização na nuvem (opcional para usuários logados).
- [x] **A2.3.** Criar visualização comparativa entre relatórios.
  - [x] Implementar gráficos comparativos de performance.
  - [x] Adicionar tabela de resumo consolidando dados de múltiplos relatórios.
- [x] **A2.4.** Adaptar funcionalidades de importação/exportação.
  - [x] Modificar sistema para exportar relatórios selecionados ou todos.
  - [x] Garantir que importação respeite a estrutura de múltiplos relatórios.

### A3. Otimizações de Performance
- [ ] **A3.1.** Reduzir tempo de carregamento inicial.
  - [ ] Implementar code splitting mais granular.
  - [ ] Otimizar carregamento de recursos estáticos.
- [ ] **A3.2.** Melhorar renderização de listas e tabelas grandes.
  - [ ] Implementar virtualização ou paginação para dados extensos.
  - [ ] Otimizar re-renderizações desnecessárias.
- [ ] **A3.3.** Revisitar sistema de cache.
  - [ ] Melhorar estratégia de cache para dados de cotação.
  - [ ] Implementar mecanismos de invalidação inteligente.

## Prioridade Média

### B1. Expansão do Conversor
- [ ] **B1.1.** Adicionar suporte para mais moedas.
  - [ ] Integrar Euro e outras moedas principais.
  - [ ] Permitir configuração de moeda padrão no perfil do usuário.
- [ ] **B1.2.** Implementar atualização automática de cotações.
  - [ ] Adicionar opção de frequência de atualização.
  - [ ] Melhorar indicadores visuais de cotação atualizada/desatualizada.
- [ ] **B1.3.** Otimizar fluxo de fallback para dados offline.
  - [ ] Melhorar sistema de cache local para cotações.
  - [ ] Adicionar mensagem clara quando usando dados offline.

### B2. Melhorias nos Gráficos
- [ ] **B2.1.** Adicionar indicadores técnicos básicos.
  - [ ] Implementar médias móveis.
  - [ ] Adicionar indicador de RSI.
- [ ] **B2.2.** Melhorar responsividade em dispositivos móveis.
  - [ ] Otimizar layout para telas pequenas.
  - [ ] Implementar gestos touch para navegação no gráfico.
- [ ] **B2.3.** Permitir personalização de visualização.
  - [ ] Adicionar opção de intervalo personalizado.
  - [ ] Implementar persistência de configurações preferidas.

### B3. UX/UI Geral
- [ ] **B3.1.** Refinar navegação entre seções principais.
  - [ ] Melhorar menu móvel.
  - [ ] Otimizar transições entre páginas.
- [ ] **B3.2.** Implementar tutoriais para novos usuários.
  - [ ] Criar tour guiado para principais funcionalidades.
  - [ ] Adicionar tooltips para elementos de UI importantes.
- [ ] **B3.3.** Melhorar acessibilidade.
  - [ ] Revisar contraste e tamanho de fontes.
  - [ ] Garantir suporte adequado para leitores de tela.

## Prioridade Baixa

### C1. Recursos Adicionais
- [ ] **C1.1.** Implementar notificações push.
  - [ ] Alertas de mudanças significativas de preço.
  - [ ] Lembretes personalizáveis.
- [ ] **C1.2.** Adicionar visualização de dados em tabela.
  - [ ] Complementar gráficos com dados tabulares detalhados.
  - [ ] Permitir exportação destes dados.
- [ ] **C1.3.** Implementar temas personalizáveis.
  - [ ] Mais opções além do claro/escuro padrão.
  - [ ] Permitir personalização de cores principais.

### C2. Integração com Serviços Externos
- [ ] **C2.1.** Adicionar suporte para login com redes sociais.
  - [ ] Google, Facebook, Twitter.
  - [ ] Vincular contas existentes.
- [ ] **C2.2.** Explorar integração com APIs de exchanges.
  - [ ] Importação automática de transações.
  - [ ] Visualização de saldo em tempo real.
- [ ] **C2.3.** Implementar compartilhamento de relatórios.
  - [ ] Exportação para formatos compartilháveis.
  - [ ] Opções de compartilhamento direto via link.

### C3. Documentação e Melhorias Internas
- [ ] **C3.1.** Criar documentação abrangente.
  - [ ] Guia de usuário completo.
  - [ ] FAQ e solução de problemas comuns.
- [ ] **C3.2.** Melhorar estrutura de código.
  - [ ] Revisar organização de componentes.
  - [ ] Documentar principais padrões e decisões para facilitar manutenção.
- [ ] **C3.3.** Configurar testes automatizados.
  - [ ] Testes unitários para lógica crucial.
  - [ ] Testes de integração para fluxos principais.

## Próximas Ações Imediatas

1. **Iniciar investigação do delay no login (A1.1)**
   - Responsável: [A definir]
   - Prazo: [A definir]
   - Métricas: Redução do tempo de login em pelo menos 70%.

2. **Corrigir problema de carregamento infinito na home (A1.2)**
   - Responsável: [A definir]
   - Prazo: [A definir]
   - Critério de Sucesso: Eliminação completa do problema em todas as condições de teste.

3. **Iniciar implementação da interface para múltiplos relatórios (A2.1)**
   - Responsável: [A definir]
   - Prazo: [A definir]
   - Entregáveis: UI funcional para criação e seleção de relatórios.

## Sprint 1: Autenticação e Performance Crítica

### Problemas de Autenticação

- [x] Corrigir o tempo de expiração dos toasts (de 1000000ms para 5000ms).
- [x] Verificar a hierarquia de componentes e uso do hook useAuth.
- [x] Garantir que useAuth seja usado apenas dentro do escopo do AuthProvider.
- [x] Criar componente SafeNavigationBar para carregamento seguro do navegador.
- [x] Implementar memoização no hook useAuth para reduzir renderizações.
- [x] Adicionar indicadores visuais de carregamento durante autenticação.
- [x] Otimizar tempos de resposta do login.
- [x] Implementar mecanismo de timeout para carregamento de perfil.
- [x] Adicionar detecção de problemas de conexão.

### Melhorias para Múltiplos Relatórios na Calculadora

- [x] Projetar estrutura de dados para múltiplos relatórios.
- [x] Implementar UI para seleção e gerenciamento de relatórios.
- [x] Adaptar o armazenamento local para suportar múltiplos relatórios.
- [x] Desenvolver visualizações comparativas entre relatórios.

## Sprint 2: Desempenho e UX

### Otimizações de Performance

- [ ] Implementar virtualização para listas longas.
- [ ] Otimizar renderização de componentes usando memo/useMemo.
- [ ] Adicionar suspense e streaming para componentes pesados.
- [ ] Implementar Intersection Observer para carregamento lazy.

### Melhorias de UX

- [ ] Adicionar animações suaves nas transições entre páginas.
- [ ] Melhorar feedback visual em ações do usuário.
- [ ] Implementar modo escuro/claro.
- [ ] Adicionar atalhos de teclado para ações comuns.

## Sprint 3: Funcionalidades Avançadas

### Análise e Visualização

- [ ] Implementar gráficos avançados de análise de portfolio.
- [ ] Adicionar alertas de preço e notificações.
- [ ] Desenvolver dashboard personalizado.
- [ ] Criar relatório de performance mensal/anual.

### Integração e Exportação

- [ ] Implementar integração com APIs de exchanges.
- [ ] Adicionar importação de transações de CSV de exchanges populares.
- [ ] Implementar exportação avançada para Excel/CSV.
- [ ] Criar sistema de backup/restauração de dados.

## Sprint 4: Infraestrutura e Segurança

### Backend e Sincronização

- [ ] Implementar sincronização com backend.
- [ ] Desenvolver sistema de conta/login.
- [ ] Adicionar suporte a múltiplos dispositivos.
- [ ] Implementar notificações push.

### Segurança

- [ ] Implementar criptografia de dados sensíveis.
- [ ] Adicionar autenticação de dois fatores.
- [ ] Implementar timeout de sessão.
- [ ] Adicionar proteção contra ataques de força bruta.

## Sprint Atual: Sprint 2 - Melhorias de Autenticação e Novos Recursos

### A. Calculadora de Lucros - Melhorias
- [x] **A1**: Implementar botões para remoção em massa de aportes e lucros/perdas
- [x] **A2**: Criar sistema de múltiplos relatórios na calculadora
  - [x] Interface para seleção de relatórios
  - [x] CRUD de relatórios (criar, ler, atualizar, excluir)
  - [x] Armazenamento local de múltiplos relatórios
  - [x] Migração de dados legados
  - [x] Comparação visual entre relatórios
- [ ] **A3**: Adicionar funcionalidade de compartilhamento de relatórios

### B. Sistema de Autenticação - Otimizações
- [ ] **B1**: Melhorar desempenho do processo de login
  - [ ] Identificar causa do delay no processo de login
  - [ ] Implementar otimizações para reduzir o tempo de espera
  - [ ] Aprimorar feedback visual durante o processo
- [ ] **B2**: Solucionar problema de carregamento infinito na home
  - [ ] Identificar causa raiz do problema
  - [ ] Implementar correção mantendo a consistência do sistema
- [ ] **B3**: Implementar opção "Lembrar-me" no login

### C. Melhorias de UI/UX
- [ ] **C1**: Aprimorar a experiência mobile
  - [ ] Otimizar layouts para dispositivos móveis
  - [ ] Melhorar interações touch
  - [ ] Testar em diferentes tamanhos de tela
- [ ] **C2**: Implementar transições e animações
  - [ ] Adicionar animações sutis nas transições entre páginas
  - [ ] Animar componentes interativos (botões, menus)
  - [ ] Garantir que as animações não prejudiquem a performance

### D. Infraestrutura e CI/CD
- [x] **D1**: Resolver problemas de build no Vercel
  - [x] Corrigir incompatibilidade do Recharts com SSR
  - [x] Configurar corretamente o arquivo vercel.json
  - [x] Assegurar que o build seja bem-sucedido em todos os ambientes
  - [x] Adaptar configuração para Next.js 15.2.4
  - [x] Corrigir problemas com polyfills e módulos externos
- [ ] **D2**: Implementar pipeline de CI/CD
  - [ ] Configurar testes automatizados
  - [ ] Implementar verificações de qualidade de código
  - [ ] Automatizar o processo de deploy

### E. Documentação
- [ ] **E1**: Criar documentação para desenvolvedores
  - [ ] Documentar estrutura do projeto
  - [ ] Explicar fluxos de trabalho e padrões adotados
  - [ ] Criar guia de contribuição
- [ ] **E2**: Elaborar manual do usuário
  - [ ] Documentar funcionalidades principais
  - [ ] Criar tutoriais passo a passo
  - [ ] Incluir seção de perguntas frequentes

## Tarefas Concluídas

### Sprint 1 - Funcionalidades Base
- [x] Implementar estrutura base do projeto com Next.js e TypeScript
- [x] Configurar Tailwind CSS e componentes UI
- [x] Implementar sistema de autenticação com Supabase
- [x] Criar conversor de moedas (BTC, SATS, USD, BRL)
- [x] Desenvolver visualização de gráficos de preços
- [x] Implementar calculadora de lucros básica
- [x] Adicionar funcionalidades de importação/exportação
- [x] Corrigir problema de duplicação de toasts
- [x] Implementar padrão Singleton para o cliente Supabase
- [x] Adicionar sistema de comunicação entre abas

## Backlog
- [ ] Implementar sistema de alertas de preço
- [ ] Criar dashboard personalizado
- [ ] Adicionar suporte para múltiplas carteiras
- [ ] Implementar cálculos avançados de ROI
- [ ] Adicionar suporte para outros idiomas
- [ ] Desenvolver modo offline
- [ ] Implementar sistema de backup na nuvem
- [ ] Adicionar suporte para outras criptomoedas além de Bitcoin 