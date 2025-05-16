# Product Context: BTC-Conversor (Raid Bitcoin Toolkit)

## 1. Funcionalidades Principais

O BTC-Conversor oferece um conjunto de ferramentas focadas no Bitcoin:

*   **Conversor de Moedas:**
    *   Converte entre BTC, Satoshis, USD e BRL.
    *   Utiliza taxas de câmbio e preços do Bitcoin em tempo real (ou próximo disso).
    *   Interface simples e direta para entrada de valores e visualização dos resultados.

*   **Gráficos Históricos de Preços:**
    *   Exibe o histórico de cotação do Bitcoin em relação a moedas fiduciárias (USD, BRL).
    *   Permite selecionar diferentes períodos de visualização (ex: 1 dia, 1 semana, 1 mês, 1 ano, máximo).
    *   Interface interativa para análise de tendências.
    *   Otimizações de cache para performance (local, servidor, navegador).

*   **Calculadora de Lucros/Perdas:**
    *   Permite ao usuário simular ou registrar investimentos em Bitcoin.
    *   Calcula lucros ou perdas com base nos valores de compra e venda ou cotação atual.
    *   (Pode incluir funcionalidades de registro de aportes e acompanhamento de portfólio, a ser confirmado).

*   **Autenticação e Gerenciamento de Usuário:**
    *   Sistema de cadastro e login via email/senha utilizando Supabase.
    *   Verificação de email.
    *   Criação automática de perfil de usuário no banco de dados.
    *   Página de perfil para visualização e edição de dados básicos (nome, avatar).
    *   Página de configurações do usuário.
    *   Rotas protegidas que exigem autenticação.

*   **Exportação de Dados:**
    *   Funcionalidade para exportar dados (possivelmente da calculadora de lucros ou gráficos) para o formato Excel.
    *   Opções de exportação completa ou mensal.

*   **Diagnóstico (Admin/Dev):**
    *   Página de diagnóstico para administradores ou durante o desenvolvimento.
    *   Testes de conexão com banco de dados.
    *   Status da conexão com Supabase.
    *   Monitoramento de tentativas de reconexão.

## 2. Tipos de Usuários e Seus Objetivos

*   **Usuário Geral/Não Autenticado:**
    *   **Objetivo:** Acessar rapidamente o conversor de moedas e visualizar gráficos de cotação do Bitcoin.
    *   **Necessidades:** Informação rápida, interface intuitiva, não requer login para funcionalidades básicas.

*   **Usuário Registrado/Autenticado:**
    *   **Objetivo:** Além das funcionalidades básicas, salvar preferências, gerenciar um perfil, utilizar a calculadora de lucros com dados persistidos (se aplicável), e acessar funcionalidades personalizadas.
    *   **Necessidades:** Login seguro, persistência de dados, personalização, acesso a ferramentas avançadas como a calculadora de lucros e exportação de dados.

*   **Administrador/Desenvolvedor (em ambiente de desenvolvimento/admin):**
    *   **Objetivo:** Monitorar a saúde da aplicação, diagnosticar problemas de conexão e verificar o estado dos serviços integrados (como Supabase).
    *   **Necessidades:** Acesso a ferramentas de diagnóstico e logs.

## 3. Fluxo de Dados e Persistência

*   **Dados de Mercado (Bitcoin, Câmbio):**
    *   Obtidos de APIs externas (CoinGecko para Bitcoin, Exchange Rate API para câmbio USD/BRL).
    *   Possíveis camadas de cache: no servidor (para reduzir chamadas às APIs externas) e no cliente (navegador e/ou estado do componente) para melhorar a performance da UI.

*   **Dados do Usuário (Autenticação e Perfil):**
    *   Gerenciados pelo Supabase (Autenticação).
    *   Perfis de usuário (nome, email, avatar_url) armazenados na tabela `profiles` no banco de dados Supabase (PostgreSQL).
    *   Sessões de usuário gerenciadas pelo Supabase.

*   **Dados da Calculadora de Lucros e Configurações (se persistidos):**
    *   Se os dados da calculadora ou configurações específicas do usuário forem persistidos, seriam armazenados no banco de dados Supabase, associados ao ID do usuário.

*   **Fluxo de Autenticação:**
    1.  Usuário tenta fazer login/cadastro.
    2.  Credenciais são enviadas para o Supabase.
    3.  Supabase valida/cria o usuário e retorna uma sessão.
    4.  Para novos usuários, um trigger no Supabase (`handle_new_user`) cria uma entrada na tabela `profiles`.
    5.  A aplicação no cliente armazena o estado da sessão e permite acesso a rotas protegidas.
    6.  Middleware (`middleware.ts`) pode ser usado para proteger rotas e gerenciar redirecionamentos com base no status de autenticação.

## 4. Interface do Usuário (UI) e Experiência do Usuário (UX)

*   **Tema:** Tema escuro como padrão, otimizado para visualização de dados financeiros e consistência visual.
*   **Responsividade:** Design adaptável para desktops, tablets e dispositivos móveis.
*   **Navegação:**
    *   Barra de navegação principal (`NavigationBar` / `ClientAppHeader`).
    *   Possível menu lateral (`Sidebar`) ou menu móvel (`MobileNavigation`).
    *   Breadcrumbs para navegação em seções aninhadas (ex: Admin).
*   **Feedback ao Usuário:**
    *   Notificações/Toasts (`Sonner`, `Toaster`) para ações, erros, atualizações.
    *   Indicadores de carregamento (`Loader2`, `Skeleton`).
    *   Transições de página (`PageTransition`) para suavizar a navegação.
*   **Componentes:** Utilização extensiva da biblioteca `shadcn/ui` para componentes de UI consistentes e customizáveis, complementados por componentes customizados.
*   **Performance da UI:**
    *   Carregamento dinâmico de componentes pesados (ex: `BitcoinConverter` na home page).
    *   Otimizações de renderização e cache.
    *   Detecção de conexão lenta (`SlowConnectionDetector`).

## 5. Problemas Resolvidos

*   **Dificuldade em Acompanhar Cotações:** Elimina a necessidade de consultar múltiplas fontes para obter cotações atualizadas de Bitcoin.
*   **Falta de Ferramentas Consolidadas:** Reúne conversor, gráficos e calculadora de investimentos em um único local, evitando o uso de diversas planilhas ou aplicativos separados.
*   **Gestão Complexa de Portfólio Individual:** Simplifica o rastreamento de aportes, lucros e perdas para cada usuário de forma isolada e segura.
*   **Análise de Desempenho Pessoal:** Fornece relatórios e cálculos de rendimento que ajudam o usuário a entender a performance de seus próprios investimentos em Bitcoin.
*   **Portabilidade e Backup de Dados Pessoais:** Oferece opções de importação e exportação para que o usuário tenha controle sobre seus dados financeiros.
*   **Falta de Personalização e Gerenciamento de Conta:** Introduz funcionalidades para que o usuário possa gerenciar seu perfil e configurar preferências da aplicação.
*   **Manutenção e Verificação do Sistema:** Provê ferramentas para administradores garantirem a integridade da base de dados essencial para o funcionamento da autenticação e perfis.

## 6. Benefícios para o Usuário

*   **Tomada de Decisão Informada:** Acesso rápido a cotações e dados históricos para decisões de compra, venda ou conversão.
*   **Organização Financeira:** Melhor controle e organização dos investimentos em Bitcoin.
*   **Visão Clara do Desempenho:** Entendimento facilitado sobre a rentabilidade dos ativos digitais.
*   **Economia de Tempo:** Consolidação de ferramentas que agilizam tarefas comuns relacionadas ao Bitcoin.
*   **Segurança e Privacidade:** Com a autenticação via Supabase, os dados de investimento e perfil são atrelados à conta do usuário, com separação clara entre diferentes usuários. A exportação de dados permite backups pessoais.
*   **Personalização:** Capacidade de ajustar a aplicação (ex: tema) às preferências individuais.
*   **Continuidade e Acesso Multi-dispositivo:** Dados armazenados no Supabase (associados à conta) permitem que o usuário acesse suas informações de diferentes dispositivos. 