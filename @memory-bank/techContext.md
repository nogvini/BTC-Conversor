# Tech Context: Raid Bitcoin Toolkit

## 1. Stack Tecnológica Principal

*   **Frontend Framework:** Next.js (React)
*   **Linguagem de Programação:** TypeScript
*   **Estilização:** Tailwind CSS
*   **Componentes UI:** Shadcn/UI (construído sobre Radix UI e Tailwind CSS)
*   **Backend (Autenticação e API de Dados):** Supabase (utilizando PostgreSQL, GoTrue para autenticação, e Functions para APIs customizadas, se necessário)
*   **Gráficos:** Recharts
*   **Gerenciamento de Estado:** Principalmente Context API do React e hooks customizados. O estado de autenticação é gerenciado com um `AuthProvider` e `useAuth`.
*   **Armazenamento Local (Client-Side):** `localStorage` para persistir dados de calculadora (aportes, lucros), preferências do usuário (unidade de conversão) e sessão de autenticação (para recuperação rápida).
*   **Comunicação entre Abas:** `BroadcastChannel` API para sincronizar o estado de autenticação entre múltiplas abas abertas.
*   **Utilitários e Bibliotecas Adicionais:**
    *   `date-fns`: Para manipulação e formatação de datas.
    *   `lucide-react`: Para ícones SVG.
    *   `exceljs`: Para exportação de dados para formato Excel (.xlsx).
    *   `file-saver`: Para facilitar o download de arquivos no cliente.
    *   `uuid`: Para geração de IDs únicos.

## 2. Arquitetura Geral

*   **Monorepo (Implícito):** O projeto parece estar estruturado de forma que o frontend e as interações com o backend (Supabase) estão contidos no mesmo codebase Next.js.
*   **Client-Side Rendering (CSR) e Server-Side Rendering (SSR)/Static Site Generation (SSG):** Next.js permite uma abordagem híbrida. Componentes de UI são primariamente renderizados no cliente (`"use client"`). Páginas podem ser pré-renderizadas (SSG/SSR) ou renderizadas no cliente.
*   **Estrutura de Diretórios:**
    *   `app/`: Contém as rotas principais da aplicação (App Router do Next.js).
        *   `app/api/`: Endpoints de API (Route Handlers do Next.js), utilizados para buscar dados de cotação e interagir com Supabase.
        *   `app/(rotas)/page.tsx`: Componentes de página.
    *   `components/`: Componentes React reutilizáveis.
        *   `components/ui/`: Componentes base do Shadcn/UI.
    *   `hooks/`: Hooks customizados para lógica reutilizável (ex: `useAuth`, `useSupabaseRetry`, `useIsMobile`).
    *   `lib/`: Utilitários, configuração de clientes (Supabase), e lógica de API (client-side e server-side).
    *   `public/`: Arquivos estáticos.
*   **Gerenciamento de Estado de Autenticação:**
    *   `AuthProvider` (`@/hooks/use-auth.tsx` e `@/context/auth-context.tsx` - parece haver duas implementações ou uma refatoração em progresso, sendo `@/hooks/use-auth.tsx` a mais recente e robusta com `useSupabaseRetry` e `BroadcastChannel`).
    *   `RequireAuth` (`@/components/require-auth.tsx`): Componente de ordem superior (HOC) para proteger rotas que exigem autenticação.
    *   `AuthProviderClient` (`@/components/auth-provider-client.tsx`): Garante que o `AuthProvider` seja inicializado corretamente no lado do cliente, gerenciando a carga das credenciais do Supabase.
*   **Comunicação com API Externa (Cotação Bitcoin):**
    *   Uma API externa (provavelmente CoinGecko ou similar, não explicitamente definida mas inferida pela funcionalidade) é consumida para obter os preços atuais do Bitcoin.
    *   Há um mecanismo de cache no lado do servidor e/ou cliente para evitar chamadas excessivas e fornecer dados de fallback (`@/lib/api.ts`, `fetchAllAppData`).

## 3. Principais Decisões Técnicas

*   **Next.js (App Router):** Escolhido pela sua capacidade de renderização híbrida, roteamento baseado em arquivos, e ecossistema robusto para desenvolvimento full-stack com JavaScript/TypeScript.
*   **Supabase:** Selecionado como backend-as-a-service para simplificar a autenticação, gerenciamento de banco de dados (PostgreSQL) e criação de APIs, permitindo foco no frontend.
*   **Shadcn/UI:** Adotado para um desenvolvimento rápido de interfaces de usuário modernas e acessíveis, com a flexibilidade do Tailwind CSS.
*   **TypeScript:** Utilizado para adicionar tipagem estática, melhorando a manutenibilidade e reduzindo erros em tempo de desenvolvimento.
*   **Armazenamento Local:** `localStorage` é usado extensivamente para persistência de dados da calculadora e preferências do usuário, visando uma experiência offline-first para essas funcionalidades e reduzindo a dependência de um backend para tudo.
*   **Padrão Singleton para Cliente Supabase:** Implementado em `lib/supabase.ts` para garantir uma única instância do cliente Supabase por contexto de navegador, com coordenação entre abas via `BroadcastChannel` para evitar conflitos e sincronizar o estado de autenticação.
*   **Hooks Customizados:** Abstração de lógicas complexas e reutilizáveis, como `useSupabaseRetry` para lidar com a conectividade do Supabase e `useAuth` para o estado de autenticação.

## 4. Considerações de Performance e UX

*   **Carregamento Dinâmico:** Componentes mais pesados ou específicos de cliente (como `BitcoinConverter`) são carregados dinamicamente (`next/dynamic`) para melhorar o tempo de carregamento inicial.
*   **Fallback e Cache de API:** Para dados de cotação, há um sistema de fallback para dados em cache caso a API externa falhe, garantindo que o aplicativo continue funcional.
*   **Responsividade:** Uso de Tailwind CSS e hooks como `useIsMobile` para adaptar a interface a diferentes tamanhos de tela.
*   **Feedback ao Usuário:** Uso de `toast` notifications para informar o usuário sobre o status de operações (login, logout, erros, atualizações de cotação).
*   **Indicadores de Carregamento:** Componentes de esqueleto (`Skeleton`) e ícones de carregamento (`Loader2`) são usados para indicar atividade e melhorar a percepção de performance. 