# Progresso: Raid Bitcoin Toolkit

## Funcionalidades Implementadas

### 1. Sistema Base
- [x] Estrutura do projeto Next.js com TypeScript
- [x] Configuração de estilo com Tailwind CSS
- [x] Componentes UI base (Shadcn/UI)
- [x] Roteamento de páginas
- [x] Implementação de temas (claro/escuro)
- [x] Sistema de notificações toast
- [x] Favicon e recursos estáticos básicos

### 2. Sistema de Autenticação
- [x] Registro de usuários
- [x] Login com email/senha
- [x] Recuperação de senhas (básico)
- [x] Autenticação persistente
- [x] Proteção de rotas que requerem autenticação
- [x] Implementação do padrão Singleton para o cliente Supabase
- [x] Sistema de comunicação entre abas via BroadcastChannel
- [x] Mascaramento de email para maior privacidade no perfil

### 3. Conversor de Moedas
- [x] Interface de conversão
- [x] Suporte para conversão entre BTC, SATS, USD e BRL
- [x] Exibição de cotações atualizadas
- [x] Fallback para dados em cache
- [x] Persistência de preferências de conversão
- [x] UI melhorada com botões em vez de radio groups
- [x] Funcionalidade de cópia de valores com feedback visual

### 4. Gráficos de Preços
- [x] Visualização de gráficos históricos
- [x] Seleção de períodos (1d, 7d, 1m, 1a, etc.)
- [x] Exibição de informações relevantes (preço máximo, mínimo, etc.)
- [x] Layout responsivo para os gráficos

### 5. Calculadora de Lucros
- [x] Adição, edição e remoção de aportes (investimentos)
- [x] Adição, edição e remoção de lucros/perdas
- [x] Visualização de histórico
- [x] Cálculos de totais e rendimentos
- [x] Exportação para Excel
- [x] Importação de dados via CSV ou Excel
- [x] Persistência local de dados
- [x] Botões para remoção em massa de aportes e lucros/perdas
- [x] Sistema de múltiplos relatórios (criação, edição, exclusão)
- [x] Comparação visual entre relatórios (gráficos e tabelas)

## Funcionalidades em Desenvolvimento

### 1. Sistema de Autenticação - Melhorias
- [ ] Otimização do processo de login (redução de delay)
- [ ] Correção do problema de carregamento infinito na home
- [ ] Melhorias no feedback visual durante autenticação
- [ ] Implementação de "Lembrar-me"
- [ ] Resolução do problema de múltiplas instâncias de GoTrueClient
- [ ] Correção do uso indevido do AuthProvider em componentes

### 2. Otimizações de Performance
- [ ] Redução do tempo de carregamento inicial
- [ ] Melhorias na renderização de listas e tabelas grandes
- [ ] Otimização do sistema de cache

### 3. Melhorias de UI/UX
- [x] Correção de menus duplicados na versão desktop
- [ ] Ampliação do uso de ícones para melhorar a intuitividade
- [ ] Padronização da interface em todos os componentes
- [ ] Implementação de tutoriais para novos usuários

### 4. Infraestrutura
- [ ] Otimizar carregamento de recursos estáticos
- [ ] Implementar estratégia de cache para recursos estáticos

## Problemas Conhecidos

0. **Navegação entre Abas Quebrada:** Após correção de menus duplicados, a navegação entre as abas (conversor, gráficos, calculadora) parou de funcionar corretamente. As páginas não são carregadas ao clicar nas opções do menu. (URGENTE)
1. **Delay no Login:** Tempo considerável para completar o processo de login a partir da tela inicial.
2. **Carregamento Infinito na Home:** Após atualizações no sistema de autenticação, ocorre carregamento infinito na página inicial.
3. ~~**Menus Duplicados no Desktop:** A interface apresenta dois menus de navegação, quando apenas o superior deveria existir.~~
4. **Múltiplas Instâncias do GoTrueClient:** Erro "Multiple GoTrueClient instances detected in the same browser context" aparecendo no console.
5. **Uso Incorreto do AuthProvider:** Erro "useAuth deve ser usado dentro de um AuthProvider" sendo reportado em alguns componentes.
6. ~~**Exposição de Email na Aba de Perfil:** O email completo do usuário é exibido na aba de perfil da página principal, comprometendo a privacidade.~~
7. ~~**Favicon Ausente:** Erro 404 ao tentar carregar o favicon.ico, afetando a aparência da aplicação nas abas do navegador.~~
8. ~~**Duplicação de Toasts:** Problema já corrigido que envolvia múltiplas instâncias de notificações toast.~~
9. ~~**Múltiplas Instâncias do GoTrueClient (original):** Problema já corrigido que ocorria quando o usuário tinha múltiplas abas abertas.~~
10. ~~**Incompatibilidade do Recharts com SSR:** Problema que causava erros no build do Vercel.~~
11. ~~**Erro de 'require' no next.config.mjs:** Problema resolvido convertendo o arquivo para formato CommonJS (.js).~~
12. ~~**Configuração incompatível com Next.js 15.2.4:** Problema resolvido atualizando as opções de configuração.~~
13. ~~**Erro de pré-renderização com useAuth:** Problema resolvido usando carregamento dinâmico com SSR desabilitado.~~

## Últimas Atualizações

### Versão 1.0.1 (Atual)
- Corrigido problema de menu de navegação duplicado na versão desktop.
- Identificado novo problema: a navegação entre abas (conversor, gráficos, calculadora) não está funcionando após a correção dos menus duplicados. (Problema crítico a ser resolvido com prioridade máxima)

### Versão 1.0.0 (Atual)
- Implementado mascaramento de email no perfil do usuário com opção para mostrar/ocultar
- Melhorada a UI do conversor substituindo radiogroups por botões mais intuitivos
- Adicionada funcionalidade de cópia de valores com feedback visual no conversor
- Adicionado favicon.ico para resolver erro 404
- Reorganizada a apresentação do conversor para uma experiência mais fluida

### Versão 0.9.9
- Corrigido erro de pré-renderização nas páginas protegidas
- Implementado carregamento dinâmico (dynamic import) do componente RequireAuth com SSR desabilitado
- Atualizado app/calculator/page.tsx para evitar erros durante o build
- Adicionadas novas tarefas ao planejamento:
  - Correção de menus de navegação duplicados
  - Melhoria da UI do conversor de moedas
  - Ampliação do uso de ícones na interface
  - Resolução de problemas estruturais com GoTrueClient e AuthProvider
  - Implementação de mascaramento de email para maior privacidade
  - Adição de favicon.ico e otimização de recursos estáticos

### Versão 0.9.8
- Atualizado next.config.js para compatibilidade com o Next.js 15.2.4
- Removida a opção 'serverExternalPackages' que não é mais suportada
- Modificada a estratégia de polyfills para evitar erros durante o build
- Adicionado Recharts à lista de módulos externos para evitar problemas de SSR

### Versão 0.9.7
- Corrigido erro de build relacionado ao uso de 'require' em arquivo ESM
- Convertido next.config.mjs para next.config.js (formato CommonJS)

### Versão 0.9.6
- Implementado sistema completo de múltiplos relatórios na calculadora de lucros
- Criado componente ReportSelector para gerenciamento de relatórios
- Desenvolvido ReportsComparison para visualização comparativa entre relatórios
- Implementado ChartWrapper para carregar o Recharts dinamicamente (resolução de problemas de SSR)
- Atualizado next.config.mjs para configurar corretamente o Recharts como pacote externo
- Criado vercel.json com configurações adequadas para deploy
- Reestruturada a página da calculadora para usar o novo sistema de relatórios

### Versão 0.9.5
- Implementado padrão Singleton para o cliente Supabase
- Adicionado sistema de comunicação entre abas com BroadcastChannel
- Corrigido problema de duplicação de toasts
- Ajustado tempo de vida das notificações toast
- Adicionado botões para remoção em massa de aportes e lucros/perdas na calculadora

## Próximos Passos

0. Corrigir urgentemente o problema de navegação entre abas após remoção de menu duplicado.
1. Focar na investigação e otimização do delay no login.
2. Corrigir o problema de carregamento infinito na home.
3. Resolver problemas estruturais com GoTrueClient e uso incorreto do AuthProvider.
4. ~~Corrigir menus de navegação duplicados na versão desktop.~~
5. Implementar melhorias visuais para o sistema de relatórios.
6. Adicionar funcionalidades de compartilhamento de relatórios.
7. ~~Melhorar a UI do conversor de moedas para melhor usabilidade e coerência.~~
8. ~~Implementar mascaramento de email do usuário na aba de perfil.~~
9. ~~Adicionar favicon.ico para resolver erro 404.~~
10. ~~Iniciar a implementação do sistema de múltiplos relatórios na calculadora de lucros.~~

## Métricas de Progresso

- **Cobertura de Funcionalidades Planejadas:** ~88%
- **Funcionalidades Críticas Implementadas:** ~92%
- **Estabilidade Geral:** Média (novos problemas identificados) 