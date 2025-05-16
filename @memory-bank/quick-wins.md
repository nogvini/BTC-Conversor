<!-- 
AVISO: Este arquivo precisa ser reavaliado e possivelmente reestruturado ou arquivado.
O `tasks.md` principal foi recentemente atualizado e deve ser a fonte primária para o planejamento de tarefas.
Data da Revisão: YYYY-MM-DD (Preencher data atual)
-->

# Quick Wins - Raid Bitcoin Toolkit (A Ser Reavaliado)

Este documento lista melhorias rápidas que podem ser implementadas com relativo baixo esforço e potencialmente alto impacto na experiência do usuário e performance do aplicativo. Todas as sugestões precisam ser reavaliadas no novo contexto do projeto.

## Autenticação e Login (Exemplos - Reavaliar)

### QW-A1: Melhorias Visuais de Feedback
- **Esforço**: A Ser Definido
- **Impacto**: A Ser Definido
- **Status**: [ ] Pendente
- **Descrição**: Adicionar indicadores de carregamento visíveis durante o processo de login
- **Implementação (Exemplo Antigo)**:
  ```tsx
  // Exemplo: Adicionar spinner e desabilitar botão durante login
  <Button 
    type="submit" 
    disabled={isLoading} 
    className="w-full"
  >
    {isLoading ? (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Entrando...
      </>
    ) : (
      "Entrar"
    )}
  </Button>
  ```

### QW-A2: Lazy Loading da Página de Autenticação
- **Esforço**: A Ser Definido
- **Impacto**: A Ser Definido
- **Status**: [ ] Pendente
- **Descrição**: Implementar carregamento dinâmico da página de login/registro
- **Implementação (Exemplo Antigo)**:
  ```tsx
  // Em app/page.tsx ou outro componente que carrega a autenticação
  import dynamic from 'next/dynamic';

  const AuthForm = dynamic(() => import('@/components/auth-form'), {
    loading: () => <div className="p-8 text-center">Carregando formulário...</div>,
    ssr: false // Desabilitar SSR se necessário
  });
  ```

## UX e Feedback ao Usuário (Exemplos - Reavaliar)

### QW-U1: Toast de Cotação Atualizada
- **Esforço**: A Ser Definido
- **Impacto**: A Ser Definido
- **Status**: [ ] Pendente
- **Descrição**: Melhorar notificação de atualização de cotação para mostrar diferença percentual
- **Implementação (Exemplo Antigo)**:
  ```tsx
  // Mostrar variação percentual nas notificações de atualização
  toast({
    title: "Cotação atualizada",
    description: `Bitcoin: ${priceData.usd.toLocaleString()} USD ${diffPercent > 0 ? '▲' : '▼'} ${Math.abs(diffPercent).toFixed(2)}%`,
    variant: diffPercent > 0 ? "success" : (diffPercent < 0 ? "destructive" : "default"),
  });
  ```

### QW-U2: Atalhos de Teclado
- **Esforço**: A Ser Definido
- **Impacto**: A Ser Definido
- **Status**: [ ] Pendente
- **Descrição**: Adicionar atalhos de teclado para ações comuns (alternar entre visualizações, atualizar cotação)
- **Implementação (Exemplo Antigo)**:
  ```tsx
  // Adicionar hook básico de atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+R: Atualizar cotações
      if (e.altKey && e.key === 'r') {
        e.preventDefault();
        updateRates();
      }
      // Alt+1, Alt+2, Alt+3: Navegação rápida
      if (e.altKey && e.key === '1') navigateToTab('converter');
      if (e.altKey && e.key === '2') navigateToTab('chart');
      if (e.altKey && e.key === '3') navigateToTab('calculator');
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  ```

### QW-U3: Feedback para Estados Vazios
- **Esforço**: A Ser Definido
- **Impacto**: A Ser Definido
- **Status**: [ ] Pendente
- **Descrição**: Melhorar estados vazios (sem aportes/lucros, sem resultado de busca)
- **Implementação**: Criar componentes de ilustração ou mensagens amigáveis para estados vazios

## Performance e Otimizações (Exemplos - Reavaliar)

### QW-P1: Otimização de Imagens
- **Esforço**: A Ser Definido
- **Impacto**: A Ser Definido
- **Status**: [ ] Pendente
- **Descrição**: Otimizar imagens estáticas e implementar carregamento otimizado
- **Implementação (Exemplo Antigo)**:
  ```tsx
  // Usar componente Image do Next.js com otimização automática
  import Image from 'next/image';
  
  <Image 
    src="/logo.png"
    alt="Logo"
    width={200}
    height={50}
    priority={true} // Para logo e imagens importantes acima da dobra
  />
  ```

### QW-P2: Cache de API com SWR
- **Esforço**: A Ser Definido
- **Impacto**: A Ser Definido
- **Status**: [ ] Pendente
- **Descrição**: Implementar SWR para cache e revalidação de dados de API
- **Implementação (Exemplo Antigo)**:
  ```tsx
  // Implementar SWR para busca de cotações
  import useSWR from 'swr';
  
  function BitcoinPrice() {
    const { data, error, isValidating } = useSWR(
      '/api/bitcoin/price', 
      fetcher, 
      { 
        refreshInterval: 60000, // Atualiza a cada 1 minuto
        revalidateOnFocus: false 
      }
    );
    
    if (error) return <div>Erro ao carregar cotação</div>;
    if (!data) return <PriceSkeleton />;
    
    return (
      <div>
        {isValidating && <SmallRefreshIndicator />}
        <PriceDisplay data={data} />
      </div>
    );
  }
  ```

### QW-P3: Memoização de Componentes
- **Esforço**: A Ser Definido
- **Impacto**: A Ser Definido
- **Status**: [ ] Pendente
- **Descrição**: Aplicar React.memo em componentes de lista que renderizam frequentemente
- **Implementação (Exemplo Antigo)**:
  ```tsx
  // Exemplo de memoização para item de transação
  const TransactionItem = React.memo(({ transaction, onDelete }: TransactionItemProps) => {
    // Implementação do componente
    return (/* JSX */);
  }, (prevProps, nextProps) => {
    // Comparação personalizada se necessário
    return prevProps.transaction.id === nextProps.transaction.id && 
           prevProps.transaction.updatedAt === nextProps.transaction.updatedAt;
  });
  ```

## Calculadora de Lucros (Exemplos - Reavaliar)

### QW-C1: Filtro Rápido por Data
- **Esforço**: A Ser Definido
- **Impacto**: A Ser Definido
- **Status**: [ ] Pendente
- **Descrição**: Adicionar botões de filtro rápido (Hoje, Semana, Mês, Ano)
- **Implementação (Exemplo Antigo)**:
  ```tsx
  const quickFilters = [
    { label: 'Hoje', days: 0 },
    { label: 'Semana', days: 7 },
    { label: 'Mês', days: 30 },
    { label: 'Ano', days: 365 },
    { label: 'Todos', days: null }
  ];
  
  // No JSX
  <div className="flex space-x-2 mb-4">
    {quickFilters.map(filter => (
      <Button
        key={filter.label}
        variant={currentFilter === filter.days ? "default" : "outline"}
        size="sm"
        onClick={() => applyQuickFilter(filter.days)}
      >
        {filter.label}
      </Button>
    ))}
  </div>
  ```

### QW-C2: Ordenação Flexível de Registros
- **Esforço**: A Ser Definido
- **Impacto**: A Ser Definido
- **Status**: [ ] Pendente
- **Descrição**: Permitir que o usuário ordene registros por diferentes colunas
- **Implementação**: Adicionar cabeçalhos clicáveis nas tabelas que alternam a ordenação

## Gráficos (Exemplos - Reavaliar)

### QW-G1: Tooltip Aprimorado
- **Esforço**: A Ser Definido
- **Impacto**: A Ser Definido
- **Status**: [ ] Pendente
- **Descrição**: Melhorar o tooltip dos gráficos para mostrar mais informações contextuais
- **Implementação**: Customizar o componente de tooltip do Recharts para incluir variação percentual e outros dados relevantes

### QW-G2: Miniatura do Gráfico
- **Esforço**: A Ser Definido
- **Impacto**: A Ser Definido
- **Status**: [ ] Pendente
- **Descrição**: Adicionar uma miniatura do gráfico para navegação em períodos longos
- **Implementação**: Implementar um componente BrushChart do Recharts como visualização secundária

## Melhorias de Acessibilidade (Exemplos - Reavaliar)

### QW-A1: Foco Visual Aprimorado
- **Esforço**: A Ser Definido
- **Impacto**: A Ser Definido
- **Status**: [ ] Pendente
- **Descrição**: Melhorar indicadores visuais de foco para navegação por teclado
- **Implementação**: Ajustar estilos de :focus e :focus-visible no CSS global

### QW-A2: Textos Alternativos e Labels ARIA
- **Esforço**: A Ser Definido
- **Impacto**: A Ser Definido
- **Status**: [ ] Pendente
- **Descrição**: Revisar e adicionar textos alternativos para imagens e labels ARIA para componentes interativos
- **Implementação**: Revisar componentes existentes e adicionar atributos aria-* apropriados

## Implementação Recomendada (A Ser Redefinida)

A ordem de implementação e a relevância destes "quick wins" precisam ser reavaliadas dentro do novo planejamento estratégico do projeto. 