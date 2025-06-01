# CONTEXTO ATIVO - SISTEMA DE MÚLTIPLAS APIS POR RELATÓRIO

## 🎯 FOCO ATUAL
**Implementação concluída do sistema inteligente de associação entre relatórios e configurações de API LN Markets**

## 📊 STATUS DO PROJETO
- **Modo Atual**: CREATIVE (Concluído) → **Próximo**: IMPLEMENT (Concluído)
- **Fase**: Implementação concluída com sucesso
- **Complexidade**: Nível 3 (Feature Development)

## 🔍 CONTEXTO TÉCNICO

### Arquivos Modificados
1. **`lib/calculator-types.ts`** - Estruturas de dados atualizadas com suporte a múltiplas APIs
2. **`hooks/use-reports.ts`** - Hooks atualizados com suporte à migração de formato
3. **`components/profit-calculator.tsx`** - Interface atualizada com indicadores visuais
4. **`lib/ln-markets-converters.ts`** - Funções de conversão atualizadas para rastrear origem

### Funcionalidades Implementadas
1. ✅ **Estrutura de Dados Multi-API** - Interface `Report` atualizada com arrays de configurações
2. ✅ **Migração Automática** - Função `migrateReportToMultipleAPIs` para migrar relatórios existentes
3. ✅ **Rastreamento de Origem** - Registros agora têm informações de origem da API
4. ✅ **Indicadores Visuais** - Badges para APIs associadas e última API utilizada
5. ✅ **Alerta Múltiplas APIs** - Mensagem amarela quando um relatório tem múltiplas fontes de dados
6. ✅ **Seleção Automática** - A última API utilizada é selecionada automaticamente

### Pontos Chave da Implementação
- Mantida compatibilidade com relatórios no formato antigo
- Lógica robusta para detectar e usar a última API utilizada
- Interface intuitiva com indicadores visuais claros
- Sistema de rastreamento de origem para todos os tipos de registros

## 🚀 PRÓXIMOS PASSOS
1. Testar minuciosamente o sistema com múltiplas APIs
2. Verificar a migração automática de relatórios existentes
3. Monitorar o desempenho e a usabilidade para possíveis melhorias futuras

## 📝 NOTAS ADICIONAIS
Esta implementação atende a todos os requisitos solicitados, permitindo:
- Rastreamento completo da origem dos dados
- Seleção automática inteligente da última API utilizada
- Indicadores visuais claros para usuários
- Suporte para casos onde um relatório tem dados de múltiplas fontes

A arquitetura é flexível e extensível, permitindo futuras melhorias conforme necessário.

## 🎨 COMPONENTES CRIATIVOS PENDENTES

### 1. Sistema de Badges Inteligentes
**Localização**: Seleção de API (linha ~3346 em profit-calculator.tsx)
**Decisões Necessárias**:
- Cores para diferentes tipos de relação (relacionada, última usada, padrão)
- Ícones para identificação visual rápida
- Layout dos badges no SelectItem

### 2. Alerta de Múltiplas APIs
**Localização**: Próximo ao card de seleção de API
**Decisões Necessárias**:
- Estilo do alerta (seguir padrão amarelo existente)
- Texto explicativo claro
- Quando mostrar/ocultar

### 3. Indicadores de Origem
**Localização**: Tabelas de dados e tooltips
**Decisões Necessárias**:
- Como mostrar origem sem poluir interface
- Granularidade da informação

## 🔄 PRÓXIMAS AÇÕES IMEDIATAS

### CREATIVE PHASE (Próximo)
1. **Definir design dos badges** para APIs relacionadas
2. **Criar layout do alerta** de múltiplas APIs
3. **Especificar indicadores** de origem dos dados

### IMPLEMENT PHASE (Após Creative)
1. **Fase 1**: Modificar estruturas de dados
2. **Fase 2**: Implementar lógica de rastreamento
3. **Fase 3**: Criar componentes visuais
4. **Fase 4**: Integração e testes

## 📋 DECISÕES TÉCNICAS TOMADAS

### Stack Tecnológico
- ✅ Next.js 14 + TypeScript (validado)
- ✅ Shadcn/ui + Tailwind CSS (validado)
- ✅ React hooks + Context API (validado)
- ✅ localStorage para persistência (validado)

### Estrutura de Dados Planejada
```typescript
interface Report {
  associatedLNMarketsConfigIds?: string[]; // Múltiplas APIs
  lastUsedConfigId?: string; // Última API utilizada
  dataSourceMapping?: Record<string, DataSourceInfo>; // Mapeamento de origem
}

interface DataSourceInfo {
  configId: string;
  configName: string;
  importDate: string;
  recordType: 'trade' | 'deposit' | 'withdrawal';
}
```

## ⚠️ PONTOS DE ATENÇÃO

### Compatibilidade
- Manter compatibilidade total com dados existentes
- Migração automática e transparente
- Fallbacks para casos extremos

### Performance
- Memoização para cálculos de estatísticas
- Lazy loading de informações de origem
- Evitar re-renders desnecessários

### UX/UI
- Manter consistência com design existente
- Progressividade: informações básicas → detalhes sob demanda
- Feedback claro para o usuário

## 🎯 OBJETIVOS ESPECÍFICOS

### Comportamento Esperado
1. **Ao selecionar relatório**: API é selecionada automaticamente
2. **Na lista de APIs**: Badges indicam relação com relatório ativo
3. **Com múltiplas APIs**: Alerta amarelo informa sobre múltiplas fontes
4. **Em registros**: Origem é rastreada e pode ser consultada

### Critérios de Sucesso
- [ ] Seleção automática funciona corretamente
- [ ] Badges são claros e informativos
- [ ] Alerta aparece quando apropriado
- [ ] Performance mantida
- [ ] Migração de dados funciona

## 🔗 REFERÊNCIAS IMPORTANTES

### Código Existente
- **Linha 3346**: Select de configuração de API
- **Linha 2172**: Função de associação atual
- **Linha 394**: Estado selectedConfigForImport
- **Linha 581-596**: Effect de seleção automática atual

### Padrões Visuais
- Alertas amarelos existentes para referência
- Badges do Shadcn/ui já em uso
- Sistema de cores do Tailwind CSS

## 📝 NOTAS DE DESENVOLVIMENTO
- Projeto usa estrutura bem organizada com hooks customizados
- Sistema de relatórios já suporta múltiplos relatórios
- API LN Markets já integrada e funcionando
- Componentes Shadcn/ui disponíveis e configurados 