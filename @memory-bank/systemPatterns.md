# System Patterns: BTC-Conversor (Raid Bitcoin Toolkit)

## 1. Padrão de Autenticação e Gerenciamento de Sessão

*   **Fluxo de Login:**
    1.  Usuário acessa a página de login (`app/auth/page.tsx` via `AuthForm`).
    2.  Insere email e senha.
    3.  `AuthForm` submete os dados para o `useAuth` hook, que chama a função de login do Supabase (`signInWithPassword`).
    4.  Supabase autentica e retorna uma sessão (ou erro).
    5.  `AuthProviderClient` e `useAuth` atualizam o estado de autenticação global.
    6.  Hooks como `useRequireAuth` ou lógica no `middleware.ts` podem redirecionar o usuário para a página principal ou dashboard após login bem-sucedido.
    7.  Verificações adicionais (email confirmado, perfil existente) são tratadas pelo `useAuth` ou lógica de backend associada.

*   **Fluxo de Cadastro:**
    1.  Usuário acessa a página de cadastro (parte do `app/auth/page.tsx` e `AuthForm`).
    2.  Insere email, senha (e possivelmente nome).
    3.  `AuthForm` submete os dados para o `useAuth` hook, que chama a função de cadastro do Supabase (`signUp`).
    4.  Supabase cria a conta de autenticação.
    5.  Um trigger `on_auth_user_created` no Supabase (função `handle_new_user`) é disparado, criando uma entrada correspondente na tabela `public.profiles`.
    6.  Supabase envia um email de verificação para o usuário.
    7.  O usuário é instruído a verificar seu email. Acesso completo pode ser restrito até a verificação.

*   **Gerenciamento de Sessão:**
    *   `@supabase/ssr` é usado para gerenciar sessões de forma segura tanto no lado do servidor (RSC, API routes, middleware) quanto no cliente.
    *   `AuthProviderClient` provavelmente inicializa o cliente Supabase e escuta por mudanças no estado de autenticação (`onAuthStateChange`).
    *   Tokens JWT são armazenados (geralmente em cookies seguros e httponly quando usando `@supabase/ssr`) e usados para autenticar requisições.
    *   `useAuth` hook centraliza a lógica de acesso ao estado do usuário, login, logout, etc.

*   **Proteção de Rotas:**
    *   `middleware.ts`: Intercepta requisições, verifica o status de autenticação (usando Supabase client para SSR) e redireciona usuários não autenticados de rotas protegidas para a página de login.
    *   `RequireAuth` (HOC ou componente): Pode envolver componentes/páginas que necessitam de autenticação no lado do cliente, redirecionando ou mostrando um estado alternativo se o usuário não estiver logado.

## 2. Padrão de Recuperação e Exibição de Dados de Mercado

*   **Fluxo (Exemplo: Gráfico Histórico):**
    1.  Usuário navega para a página de gráficos (`app/chart/page.tsx`).
    2.  Componente `HistoricalRatesChart` é renderizado.
    3.  O componente (ou um hook customizado) faz uma requisição para uma API interna do Next.js (ex: `/api/bitcoin/historical`).
        *   A requisição pode incluir parâmetros como período e moeda.
    4.  A API Route no Next.js:
        *   Verifica o cache interno (ex: Redis, ou um simples cache em memória no servidor, se implementado).
        *   Se os dados não estiverem no cache ou estiverem expirados, a API Route faz uma chamada para a API externa (CoinGecko).
        *   Armazena a resposta da API externa no cache do servidor.
        *   Retorna os dados para o componente cliente.
    5.  O componente `HistoricalRatesChart` recebe os dados e os renderiza usando `Recharts`.
    6.  **Cache no Cliente:**
        *   O componente pode implementar um cache local (ex: no estado do React) para evitar refazer a requisição se os mesmos parâmetros forem solicitados novamente em curto período.
        *   Headers HTTP de cache (ex: `Cache-Control`) podem ser configurados na API Route para permitir que o navegador armazene em cache a resposta da API.

*   **Otimizações:**
    *   **Cache Local no Componente:** `HistoricalRatesChart` pode manter dados por período/moeda.
    *   **Pré-carregamento Inteligente:** (Conforme README) Carregar períodos adjacentes em segundo plano.
    *   **Cache Global no Servidor:** API Routes como intermediárias.
    *   **Cache no Navegador:** Headers HTTP.

## 3. Padrão de Interação com Formulários

*   **Componente:** `AuthForm` (para login/cadastro), `BitcoinConverter`, `ProfitCalculator` (se tiver inputs).
*   **Biblioteca:** `react-hook-form` para gerenciamento do estado do formulário, validação e submissão.
*   **Validação:** `zod` para definir schemas de validação, integrado com `react-hook-form` via `@hookform/resolvers`.
*   **Fluxo:**
    1.  Usuário interage com os campos do formulário (`Input`, `Select`, etc., da `shadcn/ui`).
    2.  `react-hook-form` gerencia o estado dos campos.
    3.  Na submissão (ou em `onChange`/`onBlur` para validação em tempo real):
        *   Os dados do formulário são validados contra o schema Zod.
        *   Mensagens de erro são exibidas próximas aos campos inválidos.
    4.  Se a validação for bem-sucedida, a função de submissão é chamada com os dados do formulário.
    5.  A lógica de submissão (ex: chamar API, atualizar estado) é executada.
    6.  Feedback ao usuário (toast de sucesso/erro, redirecionamento) é fornecido.

## 4. Padrão de Navegação e Layout

*   **Layout Principal:** `app/layout.tsx` define a estrutura base da página (HTML, body, provedores globais como `ThemeProvider`, `AuthProviderClient`).
*   **Header da Aplicação:** `ClientAppHeader` (renderizado no `RootLayout`) contém a navegação principal e possivelmente o status do usuário/botão de login/logout.
*   **Páginas:** Cada rota em `app/` (ex: `app/converter/page.tsx`) define o conteúdo específico daquela página.
*   **Navegação Mobile:** Componente `MobileNavigation` para uma experiência otimizada em telas menores.
*   **Transições de Página:** Componente `PageTransition` para animar a mudança entre rotas.
*   **Layouts Aninhados:** Pastas com `layout.tsx` (ex: `app/admin/layout.tsx`) podem definir layouts específicos para seções da aplicação.

## 5. Padrão de Notificações e Feedback ao Usuário

*   **Biblioteca:** `Sonner` para exibir toasts/notificações não intrusivas.
*   **Componente:** `Toaster` (geralmente colocado no layout raiz) para renderizar os toasts.
*   **Hook:** `useToast` (customizado, de `hooks/use-toast.ts`) para disparar toasts de forma programática a partir de qualquer componente ou hook.
    *   Permite centralizar a lógica de exibição de diferentes tipos de toasts (sucesso, erro, informação, aviso).
*   **Uso:** Chamado após ações do usuário, respostas de API, erros, etc., para fornecer feedback imediato.
    *   Ex: "Login bem-sucedido", "Erro ao buscar dados", "Configurações salvas".
*   **Indicadores de Carregamento:**
    *   `Loader2` (ícone de carregamento giratório) para indicar operações em andamento.
    *   `Skeleton` (componentes de esqueleto) para placeholders enquanto os dados estão sendo carregados.
    *   `AuthLoading` para feedback durante o processo de autenticação.
    *   `SlowConnectionDetector` para alertar sobre conexões lentas.

## 6. Padrão de Diagnóstico e Inicialização (Admin)

*   **Página de Diagnóstico:** `app/admin/diagnose/page.tsx` e `app/admin/diagnose/client.tsx`.
*   **API Route de Suporte:** `/api/init-db/route.ts`.
*   **Fluxo:**
    1.  Administrador acessa a página de diagnóstico.
    2.  O componente cliente (`client.tsx`) faz uma requisição para `/api/init-db`.
    3.  A API route executa uma série de verificações no Supabase:
        *   Conexão com o banco de dados.
        *   Existência da tabela `profiles`.
        *   Existência da função `handle_new_user` e seu trigger associado.
        *   Tenta criar a tabela `profiles` via RPC se não existir.
    4.  A API route retorna um resumo dos resultados das verificações.
    5.  O componente cliente exibe o status para o administrador.
*   **Objetivo:** Facilitar a configuração inicial e a depuração de problemas relacionados à integração com o Supabase, especialmente a tabela `profiles` que é crucial para o funcionamento dos perfis de usuário.

## 7. Padrão de Tema Escuro Forçado

*   **Configuração:**
    *   Classe `dark` aplicada diretamente na tag `<html>` em `app/layout.tsx`.
    *   `ThemeProvider` de `next-themes` configurado para forçar o tema escuro ou com `defaultTheme="dark"` e `forcedTheme="dark"`.
    *   Meta tag `color-scheme` definida como `only dark`.
*   **Impacto:** A aplicação sempre será renderizada no tema escuro, independentemente das preferências do sistema operacional ou navegador do usuário.
*   **Justificativa:** Consistência visual e otimização para visualização de dados financeiros (conforme README).

## 8. Padrão de Comunicação

### 8.1. Comunicação com APIs
- Chamadas de API são centralizadas em arquivos específicos (`/lib/api.ts`, `server-api.ts`, `client-api.ts`).
- Implementação de retry pattern para lidar com falhas temporárias nas APIs.
- Cache de resposta para reduzir chamadas redundantes e melhorar performance.

### 8.2. Comunicação Entre Abas
- Uso da API BroadcastChannel para sincronizar o estado de autenticação entre múltiplas abas abertas.
- Mecanismo de coordenação que elege uma aba "primária" para gerenciar a comunicação real com o Supabase.
- Propagação de eventos importantes (login, logout, alterações de perfil) para todas as abas abertas. 