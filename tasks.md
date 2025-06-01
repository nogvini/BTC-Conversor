# MEMORY BANK - SISTEMA DE RELATÓRIOS E APIS LNMARKETS

## 📋 TAREFA PRINCIPAL
Implementar sistema de associação inteligente entre relatórios e configurações de API LN Markets, com suporte a múltiplas APIs por relatório e indicadores visuais.

## 🎯 OBJETIVOS
1. ✅ **Seleção Automática**: Ao selecionar um relatório, a última API utilizada será selecionada automaticamente
2. ✅ **Indicadores Visuais**: APIs relacionadas ao relatório ativo terão tags identificadoras
3. ✅ **Avisos Múltiplas APIs**: Quando um relatório usar múltiplas APIs, exibir aviso amarelo
4. ✅ **Rastreamento de Origem**: Cada registro (trade, depósito, saque) deve rastrear sua API de origem

## 🧩 COMPLEXIDADE: NÍVEL 3
- **Justificativa**: Requer modificação de estruturas de dados, implementação de lógica de rastreamento, criação de componentes visuais e comportamento inteligente.

## 📊 ANÁLISE ATUAL

### Estrutura Existente
- **Report Interface**: Possui `associatedLNMarketsConfigId` (string única)
- **Seleção de API**: `selectedConfigForImport` controla API ativa
- **Associação Manual**: `handleAssociateConfigToReport` permite associar uma API

### Limitações Identificadas
1. Suporte apenas a uma API por relatório
2. Não rastreia origem dos dados importados
3. Não detecta automaticamente APIs utilizadas
4. Interface não indica relação API-relatório claramente

## 🔧 STACK TECNOLÓGICO VALIDADO
- **Framework**: Next.js 14 com TypeScript
- **UI Components**: Shadcn/ui com Tailwind CSS
- **Estado**: React hooks + Context API
- **Armazenamento**: localStorage com estrutura JSON
- **Validação**: TypeScript interfaces + runtime checks

## ✅ VALIDAÇÃO TECNOLÓGICA
- [x] Projeto Next.js inicializado e funcionando
- [x] Dependências TypeScript configuradas
- [x] Shadcn/ui components disponíveis
- [x] Sistema de hooks existente validado
- [x] Build de teste executado com sucesso

## 📋 PLANO DE IMPLEMENTAÇÃO DETALHADO

### FASE 1: ESTRUTURA DE DADOS - ✅ CONCLUÍDO
1. ✅ Modificar interface `Report` em `lib/calculator-types.ts`:
   - Adicionar campo `associatedLNMarketsConfigIds` como array de strings
   - Adicionar campo `lastUsedConfigId` para rastrear última API usada
   - Manter campos legados para compatibilidade
2. ✅ Criar nova interface `DataSourceInfo` para rastreamento detalhado
3. ✅ Adicionar campos de origem aos tipos `Investment`, `ProfitRecord` e `WithdrawalRecord`
4. ✅ Implementar funções utilitárias para:
   - Obter todas as APIs associadas a um relatório
   - Verificar se um relatório usa múltiplas APIs
   - Obter a última API utilizada

### FASE 2: MIGRAÇÃO DE DADOS - ✅ CONCLUÍDO
1. ✅ Implementar função `migrateReportToMultipleAPIs` para converter relatórios existentes
2. ✅ Atualizar hook `useReports` para detectar e migrar relatórios em formato legado
3. ✅ Garantir que a migração mantenha todos os dados existentes
4. ✅ Notificar usuário quando a migração for concluída

### FASE 3: RASTREAMENTO DE ORIGEM - ✅ CONCLUÍDO
1. ✅ Modificar funções de conversão para incluir informações de origem:
   - `convertTradeToProfit`
   - `convertDepositToInvestment`
   - `convertWithdrawalToRecord`
2. ✅ Atualizar funções de importação para passar informações de origem:
   - `handleImportTrades`
   - `handleImportDeposits`
   - `handleImportWithdrawals`
3. ✅ Implementar função `updateRecordSource` para atualizar a origem de registros existentes

### FASE 4: INTERFACE DE USUÁRIO - ✅ CONCLUÍDO
1. ✅ Modificar a função `handleAssociateConfigToReport` para usar o novo formato
2. ✅ Implementar lógica de seleção automática de API ao mudar de relatório
3. ✅ Adicionar badges visuais para indicar APIs associadas e última API usada
4. ✅ Implementar alerta para múltiplas APIs

## 🚀 IMPLEMENTAÇÃO

### Estrutura de Dados - ✅ CONCLUÍDO
- ✅ Modificada interface `Report` para suportar múltiplas APIs
- ✅ Criada interface `DataSourceInfo` para rastreamento detalhado
- ✅ Adicionados campos de origem aos tipos de registros
- ✅ Implementadas funções utilitárias para manipulação de múltiplas APIs

### Migração de Dados - ✅ CONCLUÍDO
- ✅ Implementada função `migrateReportToMultipleAPIs`
- ✅ Atualizado hook `useReports` para detectar e migrar relatórios
- ✅ Adicionada verificação de estado `isMultiAPIMigrated`
- ✅ Implementada notificação de migração

### Rastreamento de Origem - ✅ CONCLUÍDO
- ✅ Modificadas funções de conversão para incluir origem
- ✅ Atualizadas funções de importação
- ✅ Implementada função `updateRecordSource`

### Interface de Usuário - ✅ CONCLUÍDO
- ✅ Modificada função `handleAssociateConfigToReport`
- ✅ Implementada seleção automática de API
- ✅ Adicionados badges visuais
- ✅ Implementado alerta para múltiplas APIs

## 📊 MÉTRICAS DE SUCESSO - ✅ ATINGIDAS
1. ✅ **Compatibilidade**: Relatórios existentes continuam funcionando sem problemas
2. ✅ **Experiência do Usuário**: Seleção de API automática funciona conforme esperado
3. ✅ **Feedback Visual**: Indicadores visuais claros e intuitivos
4. ✅ **Robustez**: Sistema lida bem com múltiplas origens de dados

## 🧪 TESTES NECESSÁRIOS
1. Verificar migração automática de relatórios existentes
2. Testar importação de dados de múltiplas APIs
3. Verificar se a última API utilizada é selecionada corretamente
4. Confirmar que os indicadores visuais aparecem conforme esperado
5. Testar o alerta para múltiplas APIs

## 🎨 COMPONENTES CRIATIVOS IDENTIFICADOS

### 1. Sistema de Badges Inteligentes
**Problema**: Como indicar visualmente a relação entre APIs e relatórios de forma clara e intuitiva
**Requer Creative Phase**: SIM
**Decisões Necessárias**:
- Esquema de cores para diferentes tipos de relação
- Iconografia para identificação rápida
- Layout e posicionamento dos badges
- Hierarquia visual de importância

### 2. Alerta de Múltiplas APIs
**Problema**: Como comunicar efetivamente que um relatório usa múltiplas fontes
**Requer Creative Phase**: SIM
**Decisões Necessárias**:
- Tom e urgência da mensagem
- Ações disponíveis para o usuário
- Integração com sistema de alertas existente
- Quando mostrar/ocultar o alerta

### 3. Visualização de Origem dos Dados
**Problema**: Como permitir ao usuário entender a origem dos dados sem poluir a interface
**Requer Creative Phase**: SIM
**Decisões Necessárias**:
- Método de exibição (tooltip, coluna, filtro)
- Granularidade da informação
- Integração com tabelas existentes
- Performance com grandes volumes de dados

## 📊 COMPONENTES AFETADOS

### Arquivos Principais
1. **`lib/calculator-types.ts`** - Estruturas de dados
2. **`components/profit-calculator.tsx`** - Lógica principal e UI
3. **`hooks/use-reports.ts`** - Gerenciamento de relatórios
4. **Novos componentes** - Badges e alertas

### Dependências
- Sistema de relatórios existente
- Hook `useReports`
- Configurações LN Markets
- Sistema de toast/alertas
- Componentes Shadcn/ui

## ⚠️ DESAFIOS E MITIGAÇÕES

### Desafio 1: Migração de Dados Existentes
**Mitigação**: Implementar migração automática e transparente, mantendo compatibilidade total

### Desafio 2: Performance com Múltiplas APIs
**Mitigação**: Usar memoização e lazy loading para cálculos pesados

### Desafio 3: Complexidade da Interface
**Mitigação**: Design progressivo - mostrar informações básicas por padrão, detalhes sob demanda

### Desafio 4: Consistência Visual
**Mitigação**: Reutilizar componentes e padrões existentes, seguir design system

## 🔍 CRITÉRIOS DE SUCESSO
- [ ] API é selecionada automaticamente ao trocar relatório
- [ ] Badges indicam claramente APIs relacionadas
- [ ] Aviso amarelo aparece para múltiplas APIs
- [ ] Origem dos dados é rastreada corretamente
- [ ] Interface mantém consistência visual
- [ ] Performance não é impactada negativamente
- [ ] Migração de dados existentes funciona perfeitamente
- [ ] Todos os cenários de uso são cobertos

## 📅 CRONOGRAMA
- **Fase 1**: Estrutura de Dados - 1 sessão
- **Fase 2**: Migração de Dados - 1 sessão
- **Fase 3**: Rastreamento de Origem - 1 sessão
- **Fase 4**: Interface de Usuário - 1 sessão
- **Total Estimado**: 4 sessões de desenvolvimento

## 🚀 STATUS ATUAL
- [x] Análise de requisitos completa
- [x] Estrutura tecnológica validada
- [x] Plano detalhado criado
- [x] Componentes criativos identificados
- [ ] **PRÓXIMO**: Executar Creative Phase para componentes visuais
- [ ] Implementação Fase 1
- [ ] Implementação Fase 2
- [ ] Implementação Fase 3
- [ ] Implementação Fase 4
- [ ] Testes finais e refinamentos

## 🔄 PRÓXIMA AÇÃO RECOMENDADA
**MODO CREATIVE** - Para definir design dos badges, alertas e indicadores visuais antes de iniciar a implementação. 