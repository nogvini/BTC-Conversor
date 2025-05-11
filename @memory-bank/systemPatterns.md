# System Patterns: Raid Bitcoin Toolkit

## 1. Padrões de Design

### 1.1. Singleton para Cliente Supabase
Um padrão Singleton foi implementado para garantir que apenas uma instância do cliente Supabase (especificamente o GoTrueClient para autenticação) esteja ativa por contexto de navegador. Isso é especialmente importante quando o usuário tem múltiplas abas com o aplicativo abertas, evitando comportamentos indefinidos devido a conflitos de estado de autenticação.

### 1.2. Provider Pattern
Utilizamos o padrão Provider do React Context API para disponibilizar dados e funcionalidades em toda a árvore de componentes:
- `AuthProvider`: Gerencia e disponibiliza o estado de autenticação e funções relacionadas.
- `ThemeProvider`: Gerencia o tema da aplicação (claro/escuro).

### 1.3. Container/Presentational Components
Separamos componentes em duas categorias:
- **Container Components**: Contêm lógica de negócios, gerenciamento de estado e chamadas de API.
- **Presentational Components**: Focados apenas na renderização da UI baseada em props.

### 1.4. Hook Pattern
Encapsulamos lógicas reutilizáveis em hooks customizados:
- `useAuth`: Gerencia o estado e as operações de autenticação.
- `useSupabaseRetry`: Fornece uma camada de reconexão para o cliente Supabase.
- `useToast`: Facilita o uso de notificações toast em toda a aplicação.
- `useIsMobile`: Detecta se o dispositivo é móvel para ajustes de UI.

## 2. Fluxos de Aplicação

### 2.1. Fluxo de Autenticação
1. Usuário acessa a aplicação.
2. O `AuthProvider` inicializa e verifica a existência de uma sessão anterior.
3. Se não houver sessão, o usuário pode navegar para a página de login.
4. Após login bem-sucedido, o `AuthProvider` atualiza o estado global e sincroniza entre todas as abas abertas.
5. O componente `RequireAuth` protege rotas que exigem autenticação, redirecionando para login se necessário.

### 2.2. Fluxo do Conversor
1. Usuário acessa o conversor.
2. O sistema busca automaticamente as cotações atualizadas.
3. Usuário insere um valor em uma unidade e o sistema converte automaticamente para as demais.
4. As preferências de unidade são salvas para uso futuro.

### 2.3. Fluxo de Visualização de Gráficos
1. Usuário acessa a página de gráficos.
2. O sistema carrega os dados históricos para o período padrão.
3. Usuário pode selecionar diferentes janelas de tempo para visualizar tendências.
4. O gráfico se atualiza dinamicamente baseado na seleção do usuário.

### 2.4. Fluxo da Calculadora de Lucros
1. Usuário acessa a calculadora.
2. Sistema carrega os dados salvos localmente (ou da nuvem, se autenticado).
3. Usuário pode:
   - Adicionar novos aportes ou lucros/perdas.
   - Visualizar o histórico de registros.
   - Filtrar por período ou relatório.
   - Exportar dados para Excel.
   - Importar dados de arquivos externos.
4. Todos os dados são salvos automaticamente após alterações.

## 3. Interações e Feedback

### 3.1. Sistema de Notificações
Utilizamos toasts (notificações temporárias) para informar o usuário sobre:
- Resultado de operações (sucesso/erro).
- Atualizações de cotação.
- Status da autenticação.
- Conclusão de processos de importação/exportação.

### 3.2. Feedback Visual
- Indicadores de carregamento (skeletons e spinners) são exibidos durante operações assíncronas.
- Animações sutis são utilizadas para transições entre estados de UI.
- Cores semânticas indicam status (verde para sucesso, vermelho para erro, etc.).

### 3.3. Persistência de Dados
- Dados críticos da calculadora são persistidos automaticamente no localStorage.
- Opcionalmente, os dados podem ser sincronizados na nuvem para usuários autenticados.
- Sistema de backup manual via exportação para Excel.

## 4. Padrões de Comunicação

### 4.1. Comunicação com APIs
- Chamadas de API são centralizadas em arquivos específicos (`/lib/api.ts`, `server-api.ts`, `client-api.ts`).
- Implementação de retry pattern para lidar com falhas temporárias nas APIs.
- Cache de resposta para reduzir chamadas redundantes e melhorar performance.

### 4.2. Comunicação Entre Abas
- Uso da API BroadcastChannel para sincronizar o estado de autenticação entre múltiplas abas abertas.
- Mecanismo de coordenação que elege uma aba "primária" para gerenciar a comunicação real com o Supabase.
- Propagação de eventos importantes (login, logout, alterações de perfil) para todas as abas abertas. 