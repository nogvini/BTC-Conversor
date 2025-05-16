# Active Context: BTC-Conversor (Raid Bitcoin Toolkit)

**Data da Última Atualização:** 2024-07-29

## 1. Resumo do Estado Atual do Projeto

O projeto BTC-Conversor (Raid Bitcoin Toolkit) passou por uma refatoração completa de seu `@memory-bank` para garantir que toda a documentação interna reflita com precisão o estado atual do código e dos objetivos. A aplicação está funcional, com as seguintes características principais implementadas:

*   **Core:** Conversor de Bitcoin, Gráficos Históricos, Calculadora de Lucros (funcionalidade básica).
*   **Autenticação:** Sistema completo de Login/Cadastro com Supabase, incluindo criação de perfis e verificação de email.
*   **Gerenciamento de Usuário:** Páginas de Perfil e Configurações.
*   **Admin:** Página de Diagnóstico para o Supabase.
*   **UI/UX:** Tema escuro forçado, componentes `shadcn/ui`, responsividade básica, navegação principal e mobile, notificações (toasts), indicadores de carregamento.
*   **Tecnologias Chave:** Next.js, TypeScript, Supabase, TailwindCSS, Recharts, React Hook Form, Zod.

O `README.md` está atualizado e fornece boas instruções de setup e deploy.
Os arquivos do `@memory-bank` (`projectTree.md`, `projectbrief.md`, `productContext.md`, `techContext.md`, `systemPatterns.md`, `componentCatalog.md`, `tasks.md`, `progress.md`) foram todos revisados e atualizados.

## 2. Foco Atual / Próximos Passos Imediatos

O foco imediato, conforme delineado no novo `tasks.md`, é a **validação e teste completo das funcionalidades existentes** para garantir que tudo opera conforme esperado após quaisquer mudanças recentes e para solidificar a base antes de novas features.

*   **Validação Funcional (Prioridade Alta):**
    *   Testar exaustivamente o `BitcoinConverter` (T009).
    *   Verificar todos os aspectos do `HistoricalRatesChart` (T010).
    *   Testar a `ProfitCalculator` (T011).
    *   Validar todo o fluxo de autenticação: Login (T012), Cadastro (T013), Proteção de Rotas (T014).
    *   Verificar as páginas de `UserProfile` (T015) e `UserSettings` (T016).
    *   Testar a página de `DiagnosePageClient` (T017).

*   **Revisão UI/UX (Prioridade Média):**
    *   Revisão geral da responsividade em múltiplos dispositivos (T018).
    *   Garantir a consistência do tema escuro em toda a aplicação (T019).

*   **Revisão dos Arquivos de Planejamento Suplementares (Prioridade Média):**
    *   Avaliar `detailed-tasks.md`, `quick-wins.md`, `sprint-planning.md`, `sprint-focus-export-import-enhancements.md` e decidir se devem ser arquivados, reestruturados ou integrados ao `tasks.md` principal (T008).

## 3. Desafios ou Bloqueios Atuais

*   Nenhum bloqueio crítico identificado no momento. O principal desafio é garantir que a base de código existente seja estável e bem compreendida através dos testes e da documentação atualizada.

## 4. Objetivos de Médio Prazo (Pós-Validação)

Consultar o Backlog Geral em `tasks.md` para próximos itens, que incluem:

*   Implementar persistência na Calculadora de Lucros (B001).
*   Melhorar tratamento de erros em APIs (B002).
*   Adicionar testes unitários/integração (B003).
*   Implementar "Esqueci Senha" (B005).

## 5. Considerações Importantes

*   Manter o `tasks.md` como a fonte única da verdade para o planejamento de tarefas.
*   Continuar priorizando a experiência do usuário (UI/UX) e a performance.
*   A estrutura do projeto deve ser mantida o mais simples possível para facilitar a manutenção futura.

Este `activeContext.md` serve como um instantâneo para orientar as próximas etapas de desenvolvimento e garantir que todos os envolvidos estejam alinhados com o estado e as prioridades do projeto. 