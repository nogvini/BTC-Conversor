# Planejamento: Melhorias Avançadas em Exportação e Importação

## Visão Geral

Este plano detalha as próximas etapas para aprimorar significativamente o sistema de exportação de relatórios e reestruturar o sistema de importação de backups, com foco em usabilidade, riqueza de informações e consistência visual. Este trabalho expande as tarefas A2.4.1, A2.4.2 e A2.4.3 definidas anteriormente.

**Status da Tarefa Anterior Relevante:**
- `EXPORT_FIX_001`: Concluído (correções básicas de exportação).

**Novos Objetivos Principais:**

1.  **Relatório de Exportação Avançado:**
    *   Design e Conteúdo: Rico, informativo e visualmente alinhado com a aplicação.
    *   Funcionalidades: Gráficos, ROI, Lucros, Aportes, Saldo Total, filtros avançados.
2.  **Sistema de Importação de Backup Robusto:**
    *   Compatibilidade: Utilizar o novo formato de exportação como base.
    *   Inteligência: Popular dados existentes e evitar duplicatas.

## Nível de Complexidade Estimado: 3-4

Devido à necessidade de design de UI/UX para o relatório, arquitetura da estrutura de dados do arquivo exportado/backup, e a lógica complexa para cálculos (ROI) e importação inteligente.

## Fases de Implementação

### Fase 1: Aprimoramento do Relatório de Exportação

**Objetivo:** Criar um relatório exportável (preferencialmente em PDF) que seja completo, visualmente atraente e útil para o usuário.

**Sub-fase 1.1: Definição da Estrutura de Dados e Formato do Relatório**
    - **Tarefa 1.1.1:** Pesquisar e decidir o formato de exportação ideal (PDF via HTML/Puppeteer é uma forte candidata para manter o design).
    - **Tarefa 1.1.2:** Definir a estrutura de dados do arquivo exportado. Esta estrutura será a "verdade" para o backup.
        - Incluir campos para:
            - Metadados do relatório (nome, período, data de geração).
            - Dados de operações (já existentes).
            - Cotações relevantes para o período.
            - Dados calculados:
                - ROI mensal e acumulado.
                - Lucro/Prejuízo por período e total.
                - Total de aportes.
                - Saldo total em diferentes moedas (BRL, USD, BTC).
            - Configurações para gráficos (tipo de gráfico, dados a serem plotados).
    - **Saída Esperada:** Documento de especificação da estrutura do arquivo de exportação.

**Sub-fase 1.2: Implementação da Lógica de Coleta e Cálculo de Dados**
    - **Tarefa 1.2.1:** Desenvolver/Ajustar funções para buscar todos os dados necessários para o relatório (operações, cotações, aportes).
    - **Tarefa 1.2.2:** Implementar a lógica de cálculo para ROI (mensal e comparativo).
    - **Tarefa 1.2.3:** Implementar a lógica para calcular Lucros, Aportes e Saldo Total consolidado.
    - **Componentes Afetados:** `app/api/`, `lib/api.ts`, `lib/utils.ts`.
    - **Saída Esperada:** Módulos/funções capazes de fornecer todos os dados necessários para o relatório.

**Sub-fase 1.3: Design e Geração do Relatório (UI/UX e Implementação Técnica)**
    - **Tarefa 1.3.1 (Fase Criativa - UI/UX):** Projetar o layout do relatório exportado.
        - Priorizar clareza, legibilidade e apelo visual.
        - Definir como tabelas e gráficos serão apresentados.
        - Manter consistência com o design da aplicação.
    - **Tarefa 1.3.2:** Escolher e integrar biblioteca de geração de PDF (ex: `Puppeteer` para converter HTML estilizado em PDF, ou uma biblioteca de geração direta de PDF se mais adequado).
    - **Tarefa 1.3.3:** Desenvolver templates HTML/CSS (se usar `Puppeteer`) ou código de geração direta para o relatório.
        - Incorporar tabelas com design aprimorado.
    - **Tarefa 1.3.4 (Fase Criativa - Gráficos):** Implementar a geração de gráficos (ex: usando `Chart.js` ou similar, renderizados no HTML antes da conversão para PDF).
        - Gráficos de evolução de saldo.
        - Gráficos de ROI.
        - Gráficos de distribuição de aportes/lucros.
    - **Tarefa 1.3.5:** Adicionar filtros ao processo de exportação para que o usuário possa selecionar quais seções/dados incluir.
    - **Componentes Afetados:** Novas rotas de API para geração de PDF, componentes de UI para opções de exportação.
    - **Saída Esperada:** Funcionalidade de exportação gerando o relatório em PDF com o novo design e conteúdo.

### Fase 2: Reestruturação do Sistema de Importação de Backup

**Objetivo:** Adaptar o sistema de importação para que ele utilize o novo formato do relatório exportado como arquivo de backup, implementando uma lógica inteligente para lidar com dados existentes.

**Sub-fase 2.1: Adaptação do Importador ao Novo Formato**
    - **Tarefa 2.1.1:** Modificar a lógica de parsing do arquivo de importação para ler a nova estrutura de dados definida na Fase 1.1.2.
    - **Componentes Afetados:** Código existente de importação.
    - **Saída Esperada:** Capacidade de ler e interpretar o novo formato de arquivo de backup.

**Sub-fase 2.2: Implementação da Lógica de Mesclagem e Prevenção de Duplicatas**
    - **Tarefa 2.2.1:** Desenvolver a lógica para verificar se os dados/relatórios do arquivo de backup já existem no sistema.
        - Utilizar IDs únicos para operações, relatórios, etc.
    - **Tarefa 2.2.2:** Se um relatório importado já existir, permitir a opção de sobrescrever ou mesclar dados (apenas adicionar novos, não modificar existentes - a ser definido). A prioridade inicial é popular/atualizar, evitando duplicatas.
    - **Tarefa 2.2.3:** Garantir que, ao importar, os dados sejam corretamente associados ou criem as estruturas necessárias (ex: novos relatórios, se não existirem).
    - **Componentes Afetados:** Lógica de banco de dados/armazenamento, `hooks/use-reports.ts` (ou similar).
    - **Saída Esperada:** Sistema de importação que lida de forma inteligente com dados, preenchendo informações e evitando redundâncias.

## Componentes Chave Afetados (Visão Geral)

-   `app/api/export/` (nova ou modificada)
-   `app/api/import/` (modificada)
-   `components/profit-calculator.tsx` (ajustes na interface de exportação)
-   `components/ui/` (potencialmente novos componentes para a UI de exportação/importação ou para o relatório HTML)
-   `lib/api.ts`, `lib/client-api.ts`, `lib/server-api.ts`
-   `lib/utils.ts` (novas funções de cálculo e formatação)
-   `hooks/use-reports.ts` (ou equivalente, para lidar com a lógica de múltiplos relatórios na importação)
-   Estrutura de dados no Supabase (se aplicável, para armazenar metadados de relatórios ou configurações).

## Dependências Potenciais

-   Biblioteca de geração de PDF (ex: `puppeteer`, `html-pdf`, `pdfmake`)
-   Biblioteca de gráficos (ex: `chart.js`, `recharts` - se renderizados no servidor/HTML para PDF)

## Desafios e Mitigações

-   **Desafio:** Complexidade na geração de PDF com design customizado e gráficos.
    -   **Mitigação:** Utilizar `Puppeteer` para renderizar uma página HTML bem estilizada. Testar exaustivamente a conversão.
-   **Desafio:** Performance da exportação/importação com grandes volumes de dados.
    -   **Mitigação:** Otimizar queries, processamento assíncrono se necessário para exportação. Processamento em lotes para importação.
-   **Desafio:** Lógica de mesclagem de dados na importação para evitar duplicatas e inconsistências.
    -   **Mitigação:** Planejamento cuidadoso da estrutura de IDs. Testes unitários e de integração rigorosos.
-   **Desafio:** Manter o design do relatório exportado consistente com a aplicação.
    -   **Mitigação:** Reutilizar ou adaptar o CSS da aplicação para o template HTML do relatório.

## Fases Criativas Identificadas

-   **UI/UX Design (Fase 1.3.1):** Design visual do relatório exportado (layout, tabelas, apresentação de gráficos).
-   **Arquitetura de Dados (Fase 1.1.2):** Definição da estrutura do arquivo de exportação/backup.
-   **Design de Algoritmo (Fase 1.2.2, 1.2.3):** Lógica de cálculo para ROI e outras métricas financeiras agregadas.
-   **Design de Gráficos (Fase 1.3.4):** Escolha dos tipos de gráficos e dados a serem exibidos para melhor representar as informações.

## Próximos Passos Sugeridos

1.  **Priorizar Fase 1 (Exportação):**
    *   Iniciar pela **Sub-fase 1.1** (Definição da Estrutura de Dados e Formato).
    *   Paralelamente, iniciar o **Design UI/UX do relatório (Tarefa 1.3.1)**.
2.  Após a estrutura de dados estar definida, proceder com a **Sub-fase 1.2** (Lógica de Coleta e Cálculo).
3.  Em seguida, focar na **Sub-fase 1.3** (Geração do Relatório).
4.  Uma vez que a exportação esteja funcional e o formato do arquivo consolidado, iniciar a **Fase 2 (Importação)**.

Este planejamento será a base para as próximas etapas de desenvolvimento. 