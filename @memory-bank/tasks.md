# Tasks: BTC-Conversor (Raid Bitcoin Toolkit)

## Visão Geral

Este arquivo rastreia as tarefas de desenvolvimento para o projeto BTC-Conversor. 
Prioridades: (A)lta, (M)édia, (B)aixa.
Status: (P)endente, (E)m Andamento, (C)oncluído, (B)loqueado, (H)old (Em Espera).

## Sprint Atual / Foco Imediato

| ID  | Tarefa                                     | Módulo/Componente        | Prioridade | Status | Observações                                     |
|-----|--------------------------------------------|--------------------------|------------|--------|-------------------------------------------------|
| T001| [REVISÃO MB] Revisar `projectbrief.md`       | @memory-bank             | A          | C      | Concluído como parte da refatoração do MB.        |
| T002| [REVISÃO MB] Revisar `productContext.md`     | @memory-bank             | A          | C      | Concluído como parte da refatoração do MB.        |
| T003| [REVISÃO MB] Revisar `techContext.md`        | @memory-bank             | A          | C      | Concluído como parte da refatoração do MB.        |
| T004| [REVISÃO MB] Revisar `systemPatterns.md`     | @memory-bank             | A          | C      | Concluído como parte da refatoração do MB.        |
| T005| [REVISÃO MB] Revisar `componentCatalog.md`   | @memory-bank             | A          | C      | Concluído como parte da refatoração do MB.        |
| T006| [REVISÃO MB] Atualizar `projectTree.md`      | @memory-bank             | A          | C      | Concluído como parte da refatoração do MB.        |
| T007| [REVISÃO MB] Reestruturar `tasks.md`         | @memory-bank             | A          | C      | Concluído como parte da refatoração do MB.        |
| T008| [REVISÃO MB] Avaliar e reestruturar outros arquivos de planejamento | @memory-bank             | M          | P      | `detailed-tasks.md`, `quick-wins.md`, etc.      |
| T009| [CORE] Validar funcionalidade do Conversor   | `BitcoinConverter`       | A          | C      | Validado com sucesso.                           |
| T010| [CORE] Validar funcionalidade dos Gráficos   | `HistoricalRatesChart`   | A          | C      | Funcional. Melhorias em interatividade/performance pendentes (T021, T022). |
| T011| [CORE] Validar Calculadora de Lucros       | `ProfitCalculator`       | A          | C      | Funcionalidade básica validada. Refatoração e melhorias UI/UX pendentes (T023, T024, T025, B001). |
| T012| [AUTH] Testar fluxo de Login                 | `AuthForm`, `useAuth`, Middleware | A          | C      | Problema pós-logout identificado (T026).        |
| T013| [AUTH] Testar fluxo de Cadastro              | `AuthForm`, `useAuth`    | A          | C      | Problema de feedback para email existente (T027). |
| T014| [AUTH] Testar proteção de rotas            | `RequireAuth`, Middleware| A          | C      | Problemas pós-logout e acesso não autenticado a `/calculator` (T026, T028). |
| T015| [PROFILE] Validar exibição do Perfil       | `UserProfile`            | M          | P      | Verificar se dados do usuário são mostrados.    |
| T016| [SETTINGS] Validar página de Configurações | `UserSettings`           | M          | P      | Verificar funcionalidade básica.                |
| T017| [ADMIN] Validar página de Diagnóstico      | `DiagnosePageClient`     | M          | P      | Testar com usuário admin.                       |
| T018| [UI/UX] Revisão geral da responsividade    | Global                   | M          | P      | Testar em diferentes tamanhos de tela.          |
| T019| [UI/UX] Revisão do tema escuro             | Global                   | M          | P      | Garantir consistência.                          |
| T020| [DOC] Documentar APIs internas (`/api/*`)  | `app/api/*`              | B          | P      | Adicionar comentários JSDoc/TSDoc.              |
| T021| [GRÁFICOS] Melhorar interatividade         | `HistoricalRatesChart`   | M          | P      | Ex: tooltips mais ricos, zoom, etc.             |
| T022| [GRÁFICOS] Otimizar performance            | `HistoricalRatesChart`   | M          | P      | Ex: virtualização, carregamento inteligente.    |
| T023| [CALC] Refatorar lógica de cálculo         | `ProfitCalculator`       | A          | H      | REAVALIAR. Parte integrada em T_REL_005. Foco em preço médio e lucros. |
| T024| [CALC UX] Melhorar responsividade do botão de exclusão em massa | `ProfitCalculator`       | M          | P      |                                                 |
| T025| [CALC UX] Melhorar pop-up de exportação    | `ProfitCalculator`       | M          | H      | REAVALIAR. Será coberto por T_EXPIMP_002 e T_EXPIMP_004. |
| T026| [BUG AUTH] Corrigir reaplicação de restrições pós-logout | `useAuth`, Middleware    | A          | P      | Usuário deslogado mantém acesso indevido.       |
| T027| [BUG AUTH] Melhorar feedback de cadastro para email existente | `AuthForm`, `useAuth`    | A          | P      | Exibir erro correto ao invés de "validar email".  |
| T028| [BUG AUTH] Corrigir proteção da rota `/calculator` | Middleware, `app/calculator` | A          | P      | Rota acessível sem login.                       |

## Backlog: Melhorias em Relatórios e Aportes (Foco BTC)

| ID        | Tarefa                                     | Módulo/Componente        | Prioridade | Status | Observações                                     |
|-----------|--------------------------------------------|--------------------------|------------|--------|-------------------------------------------------|
| T_REL_001 | [ÉPICA] Revisão de Relatórios e Aportes (Foco BTC) | Global, `ProfitCalculator`, `use-reports` | A          | P      | Melhorar UX, persistência e alinhamento com BTC. |
| T_REL_002 | Modificar Input de Aporte para BTC/Sats    | `ProfitCalculator`       | A          | C      | Input principal em BTC/Sats, data do aporte.    |
| T_REL_003 | Integrar Consulta de Preço Histórico BTC   | `ProfitCalculator`, `lib/api` | A          | P      | Calcular valor USD do aporte.                     |
| T_REL_003a| Adaptar/Criar API Preço Histórico Diário   | `lib/api`                | A          | P      | Função `getBitcoinPriceOnDate(date, currency)`. |
| T_REL_004 | Atualizar Estrutura Dados Aportes (Cache)  | `use-reports`, `lib/calculator-types` | A          | P      | Incluir `amountBTC`, `btcPriceUSD`, `investedUSD`.|
| T_REL_005 | Refatorar Lógica Cálculo Lucro/Prejuízo    | `ProfitCalculator`, `lib/report-processing` | A          | P      | Base no `investedAmountUSD` e `amountBTC` atual.|
| T_REL_006 | Revisar/Melhorar Geração de Relatórios (UI) | `reports-comparison`, `ProfitCalculator` | M          | P      | UI/UX da visualização de dados.                |
| T_REL_007 | Implementar Exportação de Relatórios       | `use-reports`, UI        | A          | H      | Ver T_EXPIMP_002. Exportar `ReportCollection`.  |
| T_REL_008 | Implementar Importação de Relatórios       | `use-reports`, UI        | A          | H      | Ver T_EXPIMP_003. Importar `ReportCollection`.  |
| T_REL_009 | Revisar UI/UX Aportes em BTC             | `ProfitCalculator`       | A          | P      | Tornar fluxo claro e intuitivo.                 |

## Backlog: Funcionalidades de Exportação/Importação de Relatórios

| ID          | Tarefa                                     | Módulo/Componente        | Prioridade | Status | Observações                                       |
|-------------|--------------------------------------------|--------------------------|------------|--------|---------------------------------------------------|
| T_EXPIMP_001| Definir Formato de Arquivo Export/Import   | `lib/calculator-types`   | A          | P      | JSON para `ReportCollection` ou `Report[]`.       |
| T_EXPIMP_002| Implementar Exportação de Relatórios       | `use-reports`, UI        | A          | P      | Exportar todos ou selecionado(s).                 |
| T_EXPIMP_003| Implementar Importação de Relatórios       | `use-reports`, UI        | A          | P      | Validar, tratar duplicatas/conflitos.             |
| T_EXPIMP_004| UI/UX para Exportação/Importação           | UI                       | A          | P      | Modais, feedback ao usuário.                      |
| T_EXPIMP_005| Refatorar `prepareReportFoundationData`    | `lib/report-processing`  | M          | P      | Alinhar com estrutura de dados focada em BTC.     |

## Backlog Geral

| ID  | Tarefa                                     | Módulo/Componente        | Prioridade | Status | Observações                                     |
|-----|--------------------------------------------|--------------------------|------------|--------|-------------------------------------------------|
| B001| [CALC] Persistir Relatórios no Cache Navegador| `use-reports`            | A          | C      | Coberto pela persistência da `ReportCollection`.  |
| B002| Melhorar tratamento de erros em APIs       | `app/api/*`              | M          | P      | Padronizar respostas de erro.                   |
| B003| Adicionar testes unitários/integração      | Global                   | M          | P      | Foco nos hooks e lógica de negócios.            |
| B004| Otimizar carregamento de fontes/imagens    | Global                   | B          | P      |                                                 |
| B005| Implementar "Esqueci Senha"              | `AuthForm`, Supabase     | M          | P      |                                                 |
| B006| Add mais opções de moedas ao conversor   | `BitcoinConverter`       | B          | P      |                                                 |
| B007| Permitir customização de períodos no gráfico| `HistoricalRatesChart`   | B          | P      | Input de datas.                                 |
| B008| Internacionalização (i18n)                 | Global                   | B          | P      | Se planejado para o futuro.                      |

## Concluídas Recentemente

*   T001: [REVISÃO MB] Revisar `projectbrief.md`
*   T002: [REVISÃO MB] Revisar `productContext.md`
*   T003: [REVISÃO MB] Revisar `techContext.md`
*   T004: [REVISÃO MB] Revisar `systemPatterns.md`
*   T005: [REVISÃO MB] Revisar `componentCatalog.md`
*   T006: [REVISÃO MB] Atualizar `projectTree.md`
*   T007: [REVISÃO MB] Reestruturar `tasks.md`
*   T009: [CORE] Validar funcionalidade do Conversor
*   T010: [CORE] Validar funcionalidade dos Gráficos
*   T011: [CORE] Validar Calculadora de Lucros (básico)
*   T012: [AUTH] Testar fluxo de Login (identificado T026)
*   T013: [AUTH] Testar fluxo de Cadastro (identificado T027)
*   T014: [AUTH] Testar proteção de rotas (identificado T026, T028)
*   T015: [PROFILE] Validar exibição do Perfil
*   T026: [BUG AUTH] Corrigir reaplicação de restrições pós-logout
*   T027: [BUG AUTH] Melhorar feedback de cadastro para email existente
*   T028: [BUG AUTH] Corrigir proteção da rota `/calculator`
*   T_REL_002: Modificar Input de Aporte para BTC/Sats

## Ideias / Futuro

*   Alertas de preço.
*   Notícias sobre Bitcoin.
*   Comparação de exchanges.