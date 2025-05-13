# Tarefas: Raid Bitcoin Toolkit

## Visão Geral do Planejamento de Sprints
- **Sprint 1:** Autenticação e Performance Crítica
- **Sprint 2:** Múltiplos Relatórios - Fundação & Correções Calculadora (Sprint Atual)
- **Sprint 3:** Experiência do Usuário e Otimizações
- **Sprint 4:** Finalização de Múltiplos Relatórios
- **Sprint 5:** Polimento e Finalização

*Nota: O status das tarefas ([x] ou [ ]) será atualizado com base no `progress.md` e no andamento do desenvolvimento.*

## FOCO ATUAL / URGENTE

### [MEDIUM] Correções e Melhorias no Sistema de Exportação da Calculadora de Lucros - ID: EXPORT_FIX_001
- **Status:** Concluído
- **Descrição:** Resolver problemas identificados na funcionalidade de exportação avançada do `profit-calculator.tsx`, incluindo a sincronização da seleção de relatório, a navegação por mês e um erro que impede a exportação de dados existentes.
- **Requisitos Chave:**
    - [x] **Sincronização da Seleção de Relatório:** Garantir que a opção "Apenas o relatório ativo" no diálogo de exportação reflita em tempo real o relatório selecionado na aba "Registrar".
    - [x] **Navegação por Mês Aprimorada:** Substituir o pop-up de calendário para seleção de "Mês específico" na exportação por um indicador de mês com botões de seta para navegação (anterior/próximo).
    - [x] **Correção do Erro de Exportação:** Investigar e corrigir a causa do erro "Nenhum dado para exportar", assegurando que os dados do relatório ativo sejam corretamente identificados e processados para exportação.
    - [x] **Validação da Exportação:** Confirmar que o arquivo Excel gerado contém os dados corretos conforme as seleções do usuário (relatório, período).
- **Componentes Afetados Principais:** `components/profit-calculator.tsx`, potencialmente `hooks/use-reports.ts`.
- **Fases Sugeridas (do `tasks.md` original):**
    1.  **Diagnóstico e Investigação (Erro de Exportação):**
        - [x] Analisar a lógica de `exportData` e funções relacionadas.
        - [x] Depurar o fluxo de dados.
        - [x] Verificar interação de `exportReportSelectionType` e `manualSelectedReportIdsForExport` com `currentActiveReportObjectFromHook`.
    2.  **Correção do Erro de Exportação:**
        - [x] Implementar correções para passagem de dados do relatório ativo.
        - [x] Testar exportação com relatório ativo em diferentes cenários.
    3.  **Implementação da Sincronização de Seleção de Relatório:**
        - [x] Modificar diálogo de exportação para refletir `activeReportIdFromHook`.
    4.  **Revisão da Navegação por Mês na Exportação:**
        - [x] Remover `Popover` e `CalendarComponent` para `exportSpecificMonthDate`.
        - [x] Adicionar botões de seta para navegação mensal.
    5.  **Testes Integrados e Refinamentos:**
        - [x] Testar todas as funcionalidades de exportação.
        - [x] Verificar sincronização, navegação por mês e correção de erro.
---

## Sprint 2: Múltiplos Relatórios - Fundação & Correções Calculadora (Sprint Atual)
**Objetivo Principal do Sprint:** Estabelecer a base para o sistema de múltiplos relatórios, iniciar otimizações de performance e **resolver issues críticas da calculadora (Exportação)**.

| ID     | Tarefa                                       | Prioridade | Status | Observações                                   |
|--------|----------------------------------------------|------------|--------|-----------------------------------------------|
| A2.1.1 | Modal de Criação de Relatórios               | Alta       | [x]    | Concluído (ver `progress.md`)                  |
| A2.1.2 | Seletor de Relatório Ativo                   | Alta       | [x]    | Concluído (ver `progress.md`)                  |
| A2.2.1 | Estrutura de Dados para Múltiplos Relatórios | Alta       | [x]    | Concluído (ver `progress.md`)                  |
| A1.1.4 | Lazy Loading de Componentes (Autenticação)   | Alta       | [x]    | Implementado em `app/auth/page.tsx` para `AuthForm`. |
| A3.1.1 | Code Splitting (Geral)                       | Alta       | [ ]    |                                               |
| A1.4.1 | Refatoração do Singleton (Parte 1)           | Alta       | [ ]    |                                               |
| -      | EXPORT_FIX_001 (detalhado acima)             | Crítica    | Concluído | **Foco Principal da Sessão Atual**          |

---

## Sprint 1: Autenticação e Performance Crítica
**Objetivo Concluído (Parcialmente):** Problemas críticos de autenticação endereçados e feedback visual inicial melhorado. (Verificar `progress.md` para detalhes do que foi realmente concluído vs. planejado).

| ID     | Tarefa                                       | Prioridade | Status |
|--------|----------------------------------------------|------------|--------|
| A1.1.1 | Profiling do Login                           | Crítica    | [ ]    |
| A1.1.2 | Análise do AuthProvider                      | Crítica    | [ ]    |
| A1.1.3 | Otimização do Hook useAuth                   | Crítica    | [ ]    |
| A1.2.1 | Análise do Problema de Carregamento Infinito | Crítica    | [ ]    |
| A1.2.2 | Correção da Hierarquia de Componentes         | Crítica    | [ ]    |
| A1.2.3 | Implementação de Fallbacks (Autenticação)    | Alta       | [ ]    |
| A1.3.1 | Indicadores de Carregamento (Autenticação)   | Alta       | [x]    |

---

## Sprint 3: Experiência do Usuário e Otimizações
**Objetivo:** Melhorar a experiência do usuário e implementar otimizações de performance.

| ID     | Tarefa                               | Prioridade | Status |
|--------|--------------------------------------|------------|--------|
| A1.3.2 | Mensagens de Status (Autenticação)   | Alta       | [ ]    |
| A1.3.3 | Melhorias de UX no Formulário (Auth) | Alta       | [ ]    |
| A2.2.2 | Persistência em localStorage (Relatórios) | Alta    | [x]    |
| A3.2.1 | Virtualização para Listas            | Média      | [ ]    |
| A1.4.2 | Melhoria da Comunicação entre Abas   | Alta       | [ ]    |
| A3.1.2 | Otimização de Recursos Estáticos     | Alta       | [ ]    |
| A1.5.1 | UI para "Lembrar-me"                 | Média      | [ ]    |

---

## Sprint 4: Finalização de Múltiplos Relatórios
**Objetivo:** Finalizar o sistema de múltiplos relatórios e implementar visualizações comparativas.

| ID     | Tarefa                                       | Prioridade | Status |
|--------|----------------------------------------------|------------|--------|
| A2.1.3 | Gerenciamento de Relatórios (Edição/Exclusão) | Alta       | [x]    |
| A2.3.1 | Gráficos Comparativos (Relatórios)           | Média      | [x]    |
| A2.3.2 | Tabela de Resumo Consolidado (Relatórios)    | Média      | [x]    |
| A2.4.1 | Exportação por Relatório                     | Alta       | [ ]    |
| A2.4.2 | Importação com Suporte a Relatórios          | Alta       | [ ]    |
| A1.5.2 | Implementação "Lembrar-me" no Backend      | Média      | [ ]    |

---

## Sprint 5: Polimento e Finalização
**Objetivo:** Polir a experiência do usuário, resolver bugs pendentes e finalizar documentação.

| ID     | Tarefa                               | Prioridade | Status |
|--------|--------------------------------------|------------|--------|
| A1.4.3 | Testes e Validação do Singleton      | Alta       | [ ]    |
| A2.4.3 | Melhorias no Sistema de Importação   | Alta       | [ ]    |
| A3.1.3 | Preload de Dados Críticos            | Alta       | [ ]    |
| A3.2.3 | Otimização de Re-renderizações     | Média      | [ ]    |
| A3.3.1 | Cache de Cotações                    | Média      | [ ]    |
| A2.3.3 | Dashboard Customizável (Inicial)     | Baixa      | [ ]    |

---

## Quick Wins (Baixo Esforço, Alto Impacto)
*(Ver `quick-wins.md` para detalhes de implementação)*

- [ ] **QW-A1:** Melhorias Visuais de Feedback (Login)
- [ ] **QW-A2:** Lazy Loading da Página de Autenticação
- [ ] **QW-U1:** Toast de Cotação Atualizada (com variação %)
- [ ] **QW-U2:** Atalhos de Teclado (Navegação, Atualizar)
- [ ] **QW-U3:** Feedback para Estados Vazios (Calculadora, etc.)
- [ ] **QW-P1:** Otimização de Imagens (Next/Image)
- [ ] **QW-P2:** Cache de API com SWR (Cotações)
- [ ] **QW-P3:** Memoização de Componentes (Listas)
- [ ] **QW-C1:** Filtro Rápido por Data (Calculadora)
- [ ] **QW-C2:** Ordenação Flexível de Registros (Calculadora)
- [ ] **QW-G1:** Tooltip Aprimorado (Gráficos)
- [ ] **QW-G2:** Miniatura do Gráfico (BrushChart Recharts)
- [ ] **QW-A1 (Acessibilidade):** Foco Visual Aprimorado
- [ ] **QW-A2 (Acessibilidade):** Textos Alternativos e Labels ARIA

---

## Backlog Geral
*(Consolidado de `sprint-planning.md`)*

### Backlog Técnico
- [ ] Configuração de service worker para PWA (A3.3.3)
- [ ] Implementação de testes automatizados abrangentes (C3.3 do `tasks.md` original)
- [ ] Otimizações adicionais de SEO
- [ ] Migração para banco de dados (para usuários com muitos dados)

### Backlog de Produto
- [ ] Integração com APIs de exchanges (C2.2 do `tasks.md` original)
- [ ] Implementação de notificações push (C1.1 do `tasks.md` original)
- [ ] Suporte para login com redes sociais (C2.1 do `tasks.md` original)
- [ ] Temas personalizáveis adicionais (C1.3 do `tasks.md` original)
- [ ] Ferramentas avançadas de análise de investimentos
- [ ] Adicionar suporte para mais moedas no conversor (B1.1)
- [ ] Implementar atualização automática de cotações (B1.2)
- [ ] Adicionar indicadores técnicos básicos nos gráficos (B2.1)
- [ ] Permitir personalização de visualização nos gráficos (B2.3)
- [ ] Implementar tutoriais para novos usuários (B3.2)
- [ ] Melhorar acessibilidade geral (B3.3)
- [ ] Adicionar visualização de dados em tabela (C1.2)
- [ ] Implementar compartilhamento de relatórios (C2.3)
- [ ] Criar documentação abrangente para usuário e desenvolvedor (C3.1, C3.2)

---
## Tarefas do `tasks.md` Original (Status de Conclusão Verificado em `progress.md`)

### A1. Sistema de Autenticação (Referência `tasks.md` original)
- [ ] **A1.1.** Investigar e otimizar o delay no processo de login.
- [ ] **A1.2.** Corrigir o problema de carregamento infinito na home.
- [x] **A1.3.** Melhorar feedback visual durante o processo de autenticação. (Parcialmente, A1.3.1 concluída)
- [ ] **A1.4.** Revisar e otimizar a implementação do padrão Singleton.
- [ ] **A1.5.** Implementar funcionalidade "Lembrar-me".
- [ ] **A1.6.** Resolver problema de múltiplas instâncias de GoTrueClient.
- [ ] **A1.7.** Corrigir uso indevido do AuthProvider.

### A2. Calculadora de Lucros - Sistema de Múltiplos Relatórios (Referência `tasks.md` original)
- [x] **A2.1.** Implementar interface para criação e seleção de relatórios.
- [x] **A2.2.** Desenvolver sistema de armazenamento para múltiplos relatórios.
- [x] **A2.3.** Criar visualização comparativa entre relatórios.
- [x] **A2.4.** Adaptar funcionalidades de importação/exportação. (Parcialmente, EXPORT_FIX_001 é sobre isso) => (Concluído com EXPORT_FIX_001)

### A3. Otimizações de Performance (Referência `tasks.md` original)
- [ ] **A3.1.** Reduzir tempo de carregamento inicial.
- [ ] **A3.2.** Melhorar renderização de listas e tabelas grandes.
- [ ] **A3.3.** Revisitar sistema de cache.

*(Outras seções de prioridade Média e Baixa do `tasks.md` original foram incorporadas no Backlog de Produto acima ou nos Sprints específicos se já planejadas).*