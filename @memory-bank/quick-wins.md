# Quick Wins - Raid Bitcoin Toolkit

Este documento lista melhorias rápidas que podem ser implementadas com relativo baixo esforço e potencialmente alto impacto na experiência do usuário e performance do aplicativo.

## Autenticação e Login

### QW-A1: Melhorias Visuais de Feedback
- **Esforço**: Baixo (3-4 horas)
- **Impacto**: Alto
- **Descrição**: Adicionar indicadores de carregamento visíveis durante o processo de login
- **Implementação**:
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
- **Esforço**: Baixo (2-3 horas)
- **Impacto**: Médio
- **Descrição**: Implementar carregamento dinâmico da página de login/registro
- **Implementação**:
  ```tsx
  // Em app/page.tsx ou outro componente que carrega a autenticação
  import dynamic from 'next/dynamic';

  const AuthForm = dynamic(() => import('@/components/auth-form'), {
    loading: () => <div className="p-8 text-center">Carregando formulário...</div>,
    ssr: false // Desabilitar SSR se necessário
  });
  ```

## UX e Feedback ao Usuário

### QW-U1: Toast de Cotação Atualizada
- **Esforço**: Baixo (1-2 horas)
- **Impacto**: Médio
- **Descrição**: Melhorar notificação de atualização de cotação para mostrar diferença percentual
- **Implementação**:
  ```tsx
  // Mostrar variação percentual nas notificações de atualização
  toast({
    title: "Cotação atualizada",
    description: `Bitcoin: ${priceData.usd.toLocaleString()} USD ${diffPercent > 0 ? '▲' : '▼'} ${Math.abs(diffPercent).toFixed(2)}%`,
    variant: diffPercent > 0 ? "success" : (diffPercent < 0 ? "destructive" : "default"),
  });
  ```

### QW-U2: Atalhos de Teclado
- **Esforço**: Baixo (2-3 horas)
- **Impacto**: Médio
- **Descrição**: Adicionar atalhos de teclado para ações comuns (alternar entre visualizações, atualizar cotação)
- **Implementação**:
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
- **Esforço**: Baixo (2-3 horas)
- **Impacto**: Médio
- **Descrição**: Melhorar estados vazios (sem aportes/lucros, sem resultado de busca)
- **Implementação**: Criar componentes de ilustração ou mensagens amigáveis para estados vazios

## Performance e Otimizações

### QW-P1: Otimização de Imagens
- **Esforço**: Baixo (1-2 horas)
- **Impacto**: Médio
- **Descrição**: Otimizar imagens estáticas e implementar carregamento otimizado
- **Implementação**:
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
- **Esforço**: Médio (3-4 horas)
- **Impacto**: Alto
- **Descrição**: Implementar SWR para cache e revalidação de dados de API
- **Implementação**:
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
- **Esforço**: Baixo (2-3 horas)
- **Impacto**: Médio
- **Descrição**: Aplicar React.memo em componentes de lista que renderizam frequentemente
- **Implementação**:
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

## Calculadora de Lucros

### QW-C1: Filtro Rápido por Data
- **Esforço**: Baixo (2-3 horas)
- **Impacto**: Alto
- **Descrição**: Adicionar botões de filtro rápido (Hoje, Semana, Mês, Ano)
- **Implementação**:
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
- **Esforço**: Baixo (2-3 horas)
- **Impacto**: Médio
- **Descrição**: Permitir que o usuário ordene registros por diferentes colunas
- **Implementação**: Adicionar cabeçalhos clicáveis nas tabelas que alternam a ordenação

## Gráficos

### QW-G1: Tooltip Aprimorado
- **Esforço**: Baixo (2 horas)
- **Impacto**: Médio
- **Descrição**: Melhorar o tooltip dos gráficos para mostrar mais informações contextuais
- **Implementação**: Customizar o componente de tooltip do Recharts para incluir variação percentual e outros dados relevantes

### QW-G2: Miniatura do Gráfico
- **Esforço**: Médio (3-4 horas)
- **Impacto**: Médio
- **Descrição**: Adicionar uma miniatura do gráfico para navegação em períodos longos
- **Implementação**: Implementar um componente BrushChart do Recharts como visualização secundária

## Melhorias de Acessibilidade

### QW-A1: Foco Visual Aprimorado
- **Esforço**: Baixo (1-2 horas)
- **Impacto**: Médio
- **Descrição**: Melhorar indicadores visuais de foco para navegação por teclado
- **Implementação**: Ajustar estilos de :focus e :focus-visible no CSS global

### QW-A2: Textos Alternativos e Labels ARIA
- **Esforço**: Baixo (1-2 horas)
- **Impacto**: Médio
- **Descrição**: Revisar e adicionar textos alternativos para imagens e labels ARIA para componentes interativos
- **Implementação**: Revisar componentes existentes e adicionar atributos aria-* apropriados

## Implementação Recomendada

Recomenda-se implementar os quick wins na seguinte ordem para maximizar o impacto inicial:

1. **QW-A1: Melhorias Visuais de Feedback** - Melhora imediata na percepção de performance
2. **QW-P2: Cache de API com SWR** - Melhoria real de performance com estrutura para o futuro
3. **QW-C1: Filtro Rápido por Data** - Funcionalidade útil com implementação simples
4. **QW-P3: Memoização de Componentes** - Melhoria de performance para grandes conjuntos de dados
5. **QW-U3: Feedback para Estados Vazios** - Melhoria rápida na experiência de novos usuários

Estas implementações podem ser realizadas paralelamente ao trabalho de sprints mais estruturado, oferecendo melhorias constantes enquanto os recursos maiores são desenvolvidos. 