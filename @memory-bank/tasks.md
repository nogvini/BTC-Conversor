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
| T023| [CALC] Refatorar lógica de cálculo         | `ProfitCalculator`       | A          | P      | Preço médio do dia do aporte, divisão de lucros, valorização do principal. |
| T024| [CALC UX] Melhorar responsividade do botão de exclusão em massa | `ProfitCalculator`       | M          | P      |                                                 |
| T025| [CALC UX] Melhorar pop-up de exportação    | `ProfitCalculator`       | M          | P      | Responsividade e atualização de dados de relatórios. |
| T026| [BUG AUTH] Corrigir reaplicação de restrições pós-logout | `useAuth`, Middleware    | A          | P      | Usuário deslogado mantém acesso indevido.       |
| T027| [BUG AUTH] Melhorar feedback de cadastro para email existente | `AuthForm`, `useAuth`    | A          | P      | Exibir erro correto ao invés de "validar email".  |
| T028| [BUG AUTH] Corrigir proteção da rota `/calculator` | Middleware, `app/calculator` | A          | P      | Rota acessível sem login.                       |

## Backlog Geral

| ID  | Tarefa                                     | Módulo/Componente        | Prioridade | Status | Observações                                     |
|-----|--------------------------------------------|--------------------------|------------|--------|-------------------------------------------------|
| B001| [CALC] Implementar persistência de dados   | `ProfitCalculator`, Supabase | A          | P      | Essencial para funcionalidade completa.         |
| B002| Melhorar tratamento de erros em APIs       | `app/api/*`              | M          | P      | Padronizar respostas de erro.                   |
| B003| Adicionar testes unitários/integração      | Global                   | M          | P      | Foco nos hooks e lógica de negócios.            |
| B004| Otimizar carregamento de fontes/imagens    | Global                   | B          | P      |                                                 |
| B005| Implementar funcionalidade de "Esqueci Senha"| `AuthForm`, Supabase     | M          | P      |                                                 |
| B006| Adicionar mais opções de moedas ao conversor| `BitcoinConverter`       | B          | P      |                                                 |
| B007| Permitir customização de períodos no gráfico| `HistoricalRatesChart`   | B          | P      | Input de datas.                                 |
| B008| Internacionalização (i18n)                 | Global                   | B          | P      | Se planejado para o futuro.                      |

## Concluídas Recentemente (Pós-Refatoração MB)

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
*   T012: [AUTH] Testar fluxo de Login
*   T013: [AUTH] Testar fluxo de Cadastro
*   T014: [AUTH] Testar proteção de rotas

## Ideias / Futuro

*   Alertas de preço.
*   Notícias sobre Bitcoin.
*   Comparação de exchanges.