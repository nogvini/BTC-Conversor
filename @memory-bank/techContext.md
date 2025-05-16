# Tech Context: BTC-Conversor (Raid Bitcoin Toolkit)

## 1. Frontend

*   **Framework:** Next.js (~15.2.4)
*   **Linguagem:** TypeScript
*   **UI Library:** Shadcn/UI (construída sobre Radix UI e Tailwind CSS)
    *   Componentes utilizados incluem: `Accordion`, `AlertDialog`, `Avatar`, `Button`, `Card`, `Dialog`, `DropdownMenu`, `Input`, `Label`, `Select`, `Sheet`, `Sonner` (para toasts/notificações via `Toaster`), `Tabs`, `Tooltip`, etc.
*   **Estilização:** Tailwind CSS (~3.4.17)
    *   Utilitários: `clsx`, `tailwind-merge`, `tailwindcss-animate`.
*   **Estado Global/Gerenciamento de Estado:**
    *   React Context API (inferido, comum com Next.js, ex: `AuthProviderClient`, `ThemeProvider`).
    *   `@supabase/ssr` e `@supabase/supabase-js` para gerenciamento de estado de autenticação e dados do Supabase no cliente e servidor.
*   **Formulários:** React Hook Form (`react-hook-form` ~7.54.1) com Zod (`zod` ~3.24.1) para validação de schemas (`@hookform/resolvers`).
*   **Gráficos:** Recharts (`recharts` ~2.15.0)
*   **Ícones:** Lucide React (`lucide-react` ~0.508.0)
*   **Temas:** `next-themes` (~0.4.4) para gerenciamento de tema (embora o projeto esteja forçando o tema escuro).
*   **Animações/Transições:**
    *   `tailwindcss-animate`
    *   Componente customizado `PageTransition`.
    *   `embla-carousel-react` para carrosséis.
*   **Utilitários React:**
    *   `react-day-picker` para seleção de datas.
    *   `react-resizable-panels` para painéis redimensionáveis.
    *   `cmdk` para interfaces de comando.
    *   `input-otp` para campos de One-Time Password.
    *   `vaul` para drawers responsivos.

## 2. Backend (Supabase & Next.js API Routes)

*   **Plataforma Backend-as-a-Service (BaaS):** Supabase
    *   **Autenticação:** Supabase Auth (email/senha, gerenciamento de sessão, JWTs).
    *   **Banco de Dados:** Supabase (PostgreSQL) para armazenar perfis de usuários e, potencialmente, dados da calculadora de lucros e configurações.
        *   Tabela `profiles` com RLS (Row Level Security).
        *   Função SQL `handle_new_user` e trigger `on_auth_user_created` para sincronizar `auth.users` com `public.profiles`.
    *   **APIs do Supabase:** Utilização do cliente `@supabase/supabase-js` para interagir com os serviços do Supabase.
*   **Next.js API Routes (`app/api/`)**
    *   `/api/init-db`: Rota para diagnóstico e inicialização do banco de dados (verifica tabelas, cria se necessário).
    *   `/api/bitcoin/price`, `/api/bitcoin/historical`: Prováveis rotas para servir como proxy ou cache para as APIs externas de dados do Bitcoin, gerenciando chaves de API e lógica de cache no servidor.

## 3. APIs Externas

*   **CoinGecko:** Para preços atuais e dados históricos do Bitcoin.
*   **Exchange Rate API:** Para taxas de câmbio (ex: USD/BRL).

## 4. Ferramentas de Desenvolvimento e Build

*   **Gerenciador de Pacotes:** `npm` (inferido pelo `package-lock.json` na listagem do diretório, embora `pnpm-lock.yaml` também esteja presente, o `package.json` tem scripts `npm`).
*   **Build Tool:** Next.js (`next build`).
*   **Servidor de Desenvolvimento:** Next.js (`next dev`).
*   **Linting:** ESLint (configurado via `next lint`).
*   **TypeScript:** (~5.8.3) para tipagem estática.
*   **Controle de Versão:** Git.

## 5. Deploy

*   **Plataforma:** Vercel (configurado em `vercel.json` e instruções no `README.md`).
*   **Variáveis de Ambiente:** Utilização de `.env.local` para desenvolvimento e configuração na Vercel para produção/preview (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

## 6. Funcionalidades Adicionais e Bibliotecas

*   **Exportação para Excel:** `exceljs` (~4.3.0) e `file-saver` (~2.0.5) para gerar e baixar arquivos Excel.
*   **Manipulação de Datas:** `date-fns` (~4.1.0).
*   **Geração de PDF/Screenshots (Potencial, via Puppeteer):**
    *   `@sparticuz/chromium` (~133.0.0)
    *   `puppeteer` (~24.8.2) / `puppeteer-core` (~24.8.2)
    *   *Nota: A presença dessas dependências sugere a possibilidade de geração de PDFs ou screenshots no backend, embora não explicitamente mencionado nas funcionalidades principais. Pode ser para relatórios ou outras features.*

## 7. Arquitetura Geral

*   **Monorepo (implícito):** Todo o código (frontend e backend leve com API routes) está no mesmo projeto Next.js.
*   **Server-Side Rendering (SSR) e Static Site Generation (SSG):** Capacidades do Next.js, com foco em componentes cliente (`"use client";`) para interatividade.
*   **Component-Based Architecture:** Utilização de componentes React reutilizáveis.
*   **Middleware:** `middleware.ts` para lógica de roteamento e proteção de rotas.

## 8. Considerações de Segurança

*   **RLS (Row Level Security)** no Supabase para proteger dados na tabela `profiles`.
*   Variáveis de ambiente para chaves de API e credenciais do Supabase.
*   Proteção de rotas via autenticação. 