# Component Catalog: BTC-Conversor (Raid Bitcoin Toolkit)

Este catálogo documenta os principais componentes reutilizáveis do projeto, tanto os customizados quanto os mais relevantes da biblioteca `shadcn/ui`.

## 1. Componentes Customizados (`components/`)

*   **`AnimatedCounter` (`animated-counter.tsx`)**
    *   **Descrição:** Renderiza um número que se anima de um valor inicial até um valor final. Útil para exibir estatísticas ou valores que mudam de forma visualmente agradável.
    *   **Props Principais:** `value` (número final), `duration` (opcional).
    *   **Uso Típico:** Exibição de saldos, totais em calculadoras, etc.

*   **`AuthForm` (`auth-form.tsx`)**
    *   **Descrição:** Formulário unificado para login e cadastro de usuários. Gerencia os inputs de email, senha e possibly nome, e interage com o `useAuth` hook para realizar as operações de autenticação.
    *   **Props Principais:** `type` ('login' ou 'register').
    *   **Dependências:** `react-hook-form`, `zod`, `Input`, `Button`, `Label`, `useAuth`.
    *   **Uso Típico:** Em `app/auth/page.tsx`.

*   **`BitcoinConverter` (`bitcoin-converter.tsx`)**
    *   **Descrição:** Componente principal para a funcionalidade de conversão de moedas. Inclui inputs para valor, seleção de moedas (BTC, SATS, USD, BRL) e exibe o resultado da conversão.
    *   **Props Principais:** (Nenhuma explícita, busca dados internamente).
    *   **Dependências:** `Input`, `Select`, `Card`, APIs de cotação (via hooks/serviços).
    *   **Uso Típico:** Em `app/page.tsx` ou `app/converter/page.tsx`.

*   **`DiagnosePageClient` (`diagnose-page-client.tsx`)**
    *   **Descrição:** Componente cliente para a página de diagnóstico (`/admin/diagnose`). Faz a chamada para a API `/api/init-db` e exibe os resultados da verificação do Supabase.
    *   **Props Principais:** (Nenhuma explícita).
    *   **Dependências:** `Button`, `Card`.
    *   **Uso Típico:** Em `app/admin/diagnose/page.tsx`.

*   **`HistoricalRatesChart` (`historical-rates-chart.tsx`)**
    *   **Descrição:** Renderiza o gráfico de taxas históricas do Bitcoin usando `Recharts`. Inclui lógica para buscar dados (possivelmente via um hook customizado) e selecionar períodos.
    *   **Props Principais:** (Pode incluir `currency`, `period` se controlado externamente).
    *   **Dependências:** `recharts`, `Card`, `Select` (para filtros de período).
    *   **Uso Típico:** Em `app/chart/page.tsx`.

*   **`MobileNavigation` (`mobile-navigation.tsx`)**
    *   **Descrição:** Componente de navegação otimizado para dispositivos móveis, possivelmente um menu hambúrguer ou uma barra de navegação inferior.
    *   **Props Principais:** (Nenhuma explícita).
    *   **Dependências:** `Sheet` (da `shadcn/ui`) ou similar, `Button`, `Lucide Icons`.
    *   **Uso Típico:** Usado condicionalmente no layout principal ou header com base no tamanho da tela (`useMobile` hook).

*   **`PageTransition` (`page-transition.tsx`)**
    *   **Descrição:** Envolve o conteúdo da página para aplicar animações de transição quando a rota muda.
    *   **Props Principais:** `children`.
    *   **Dependências:** (Pode usar `framer-motion` ou CSS animations).
    *   **Uso Típico:** Envolvendo o `{children}` nas páginas ou no layout.

*   **`ProfitCalculator` (`profit-calculator.tsx`)**
    *   **Descrição:** Componente para a calculadora de lucros/perdas de investimentos em Bitcoin. Pode incluir formulários para entrada de dados de compra/venda e exibição de resultados.
    *   **Props Principais:** (Nenhuma explícita).
    *   **Dependências:** `Input`, `Button`, `Card`, `Table` (para exibir histórico).
    *   **Uso Típico:** Em `app/calculator/page.tsx`.

*   **`RequireAuth` (`require-auth.tsx`)**
    *   **Descrição:** Componente de Ordem Superior (HOC) ou wrapper que protege rotas/componentes, redirecionando usuários não autenticados para a página de login.
    *   **Props Principais:** `children`.
    *   **Dependências:** `useAuth`, `useRouter` (do `next/navigation`).
    *   **Uso Típico:** Envolvendo o conteúdo de páginas que exigem login.

*   **`ThemeProvider` (`theme-provider.tsx`)**
    *   **Descrição:** Provedor para o gerenciamento de temas (claro/escuro) usando `next-themes`. No contexto atual, está configurado para forçar o tema escuro.
    *   **Props Principais:** `children`, e props de configuração do `next-themes`.
    *   **Dependências:** `next-themes`.
    *   **Uso Típico:** No `app/layout.tsx`, envolvendo toda a aplicação.

*   **`UserProfile` (`user-profile.tsx`)**
    *   **Descrição:** Exibe as informações do perfil do usuário logado (nome, email, avatar). Pode incluir um formulário para edição dessas informações.
    *   **Props Principais:** (Nenhuma explícita, busca dados do `useAuth` ou Supabase).
    *   **Dependências:** `useAuth`, `Card`, `Avatar`, `Input`, `Button`.
    *   **Uso Típico:** Em `app/profile/page.tsx`.

*   **`UserSettings` (`user-settings.tsx`)**
    *   **Descrição:** Componente para permitir que o usuário ajuste configurações da aplicação (ex: preferências de notificação, se aplicável, ou outras configurações relacionadas à conta).
    *   **Props Principais:** (Nenhuma explícita).
    *   **Dependências:** `Card`, `Switch`, `Select`.
    *   **Uso Típico:** Em `app/settings/page.tsx`.

*   **`AuthLoading` (`components/auth-loading.tsx`)**
    *   **Descrição:** Exibe um indicador visual (ex: overlay com spinner) quando operações de autenticação (login, cadastro, recuperação de sessão) estão em andamento.
    *   **Props Principais:** (Nenhuma explícita, controlado pelo estado do `useAuth` hook).
    *   **Dependências:** `useAuth`, `Loader2`.
    *   **Uso Típico:** No `app/layout.tsx` ou `app/page.tsx` para feedback global.

*   **`ClientAppHeader` (`components/client-app-header.tsx`)**
    *   **Descrição:** Cabeçalho principal da aplicação, renderizado no lado do cliente. Contém links de navegação, logo, e possivelmente informações do usuário/botão de login/logout.
    *   **Props Principais:** (Nenhuma explícita).
    *   **Dependências:** `useAuth`, `Link` (do `next/link`), `Button`, `Avatar`, `NavigationBar` (se for um wrapper).
    *   **Uso Típico:** Em `app/layout.tsx`.

*   **`SlowConnectionDetector` (`components/slow-connection-detector.tsx`)**
    *   **Descrição:** Monitora a velocidade da conexão do usuário e exibe um aviso (ex: toast ou banner) se uma conexão lenta for detectada, melhorando a UX ao informar sobre possíveis demoras.
    *   **Props Principais:** (Nenhuma explícita).
    *   **Dependências:** (Pode usar `navigator.connection` ou pings para APIs).
    *   **Uso Típico:** No `app/layout.tsx` ou `app/page.tsx`.

## 2. Componentes Chave da UI (`components/ui/` - Shadcn/UI)

Esta não é uma lista exaustiva, mas destaca os componentes `shadcn/ui` frequentemente usados ou visualmente importantes para a aplicação.

*   **`Button` (`button.tsx`):** Botões com variantes (primary, secondary, destructive, etc.).
*   **`Card` (`card.tsx`):** Contêineres para agrupar conteúdo relacionado.
*   **`Input` (`input.tsx`):** Campos de entrada de texto.
*   **`Label` (`label.tsx`):** Rótulos para campos de formulário.
*   **`Select` (`select.tsx`):** Menus dropdown para seleção.
*   **`Dialog` (`dialog.tsx`):** Modais para exibir conteúdo ou formulários importantes.
*   **`Sheet` (`sheet.tsx`):** Painéis laterais (usados para `MobileNavigation`).
*   **`Toast` / `Toaster` / `Sonner` (`toast.tsx`, `toaster.tsx`, `sonner.tsx`):** Para sistema de notificações.
*   **`Avatar` (`avatar.tsx`):** Para exibir imagens de perfil de usuário.
*   **`Skeleton` (`skeleton.tsx`):** Placeholders de carregamento.
*   **`Table` (`table.tsx`):** Para exibir dados tabulares (ex: histórico de transações).
*   **`Tabs` (`tabs.tsx`):** Para organizar conteúdo em abas.
*   **`Accordion` (`accordion.tsx`):** Para seções de conteúdo colapsáveis.
*   **`DropdownMenu` (`dropdown-menu.tsx`):** Menus de contexto ou de ações.
*   **`NavigationBar` (`navigation-bar.tsx`):** Componente customizado (ou baseado em `navigation-menu.tsx`) para a barra de navegação principal.
*   **`Sidebar` (`sidebar.tsx`):** Componente customizado para navegação lateral, se utilizado.

## 3. Componentes de Gráfico (`components/ui/` ou customizados)

*   **`Chart` (`components/ui/chart.tsx`):** Componente genérico de gráfico, provavelmente um wrapper ou reexportação de `Recharts` ou similar, usado por `HistoricalRatesChart`.
*   **`ResponsiveContainer` (`components/ui/responsive-container.tsx`):** Wrapper da `Recharts` para tornar os gráficos responsivos.

Este catálogo deve ser expandido conforme novos componentes são criados ou componentes `shadcn/ui` são integrados de forma significativa. 