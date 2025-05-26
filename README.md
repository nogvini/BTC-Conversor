# Raid Bitcoin Toolkit

Aplicativo para conversão e monitoramento de preços de Bitcoin, com gráficos históricos e calculadora de lucros.

## Características

- Conversão entre BTC, Satoshis, USD e BRL
- Gráficos históricos de preços do Bitcoin
- Calculadora de lucros/perdas com investimentos
- Exportação de dados para Excel
- Interface responsiva para dispositivos móveis e desktop

## Arquitetura

O aplicativo utiliza uma arquitetura moderna com:

- Interface do usuário construída com Next.js e TailwindCSS
- APIs do servidor para buscar dados de preços e taxas
- Armazenamento persistente no servidor
- Componentes reutilizáveis e responsivos

## APIs Utilizadas

- CoinGecko: Preços e dados históricos do Bitcoin
- Exchange Rate API: Taxas de câmbio USD/BRL

## Como executar

1. Clone o repositório
2. Instale as dependências:
   ```
   npm install
   ```
3. Execute o servidor de desenvolvimento:
   ```
   npm run dev
   ```
4. Acesse o aplicativo em http://localhost:3000

## Estrutura do Projeto

- `/app`: Páginas e rotas do Next.js
- `/app/api`: APIs do servidor
- `/components`: Componentes da interface do usuário
- `/lib`: Bibliotecas e serviços de API
- `/data`: Armazenamento de dados no servidor

## Melhorias Recentes

### Otimização de Notificações
- Removidas notificações redundantes ao mudar o período no gráfico histórico
- Notificações de atualização de preço são mostradas apenas quando há mudanças significativas (>0.1%)
- Mantidas apenas notificações críticas para erros de conexão e dados em cache

### Tema Escuro Forçado
- A aplicação agora sempre usa o tema escuro, independente das preferências do navegador
- Melhor consistência visual entre dispositivos e usuários
- Otimizado para visualização de dados financeiros

### Exportação Excel
- Adicionada exportação de dados completos ou mensais
- Estatísticas detalhadas de rendimento e lucros incluídas
- Valores em BTC, USD e BRL disponíveis em todas as planilhas

### Filtro Mensal
- Implementado filtro por mês no histórico
- Visualização detalhada de aportes e lucros/perdas
- Estatísticas de rendimento por período

### Otimização de Requisições para Gráficos
- **Cache Local no Componente**: Mantém dados por período e moeda para navegação instantânea
- **Pré-carregamento Inteligente**: Carrega períodos adjacentes em segundo plano
- **Cache Global no Servidor**: Reduz chamadas à API externa com dados compartilhados
- **Cache no Navegador**: Usa headers HTTP para permitir cache local por 5 minutos

### Interface Responsiva
- Adaptações específicas para dispositivos móveis
- Menu de navegação otimizado para telas pequenas
- Visualização de gráficos adaptada para diferentes tamanhos de tela

## Integração com Supabase

Este projeto utiliza o Supabase para autenticação de usuários. Para configurar o Supabase:

1. Crie uma conta no [Supabase](https://supabase.com/) e crie um novo projeto
2. Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```bash
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
```

3. No Supabase, habilite a autenticação por email e senha em "Authentication" > "Providers"
4. Crie uma tabela `profiles` com a seguinte estrutura SQL:

```sql
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  name text,
  email text not null,
  avatar_url text,
  created_at timestamp with time zone default now()
);

-- Configurar acesso RLS (Row Level Security)
alter table public.profiles enable row level security;

-- Políticas de acesso
create policy "Usuários podem ver seus próprios perfis" 
  on profiles for select 
  using (auth.uid() = id);

create policy "Usuários podem atualizar seus próprios perfis" 
  on profiles for update 
  using (auth.uid() = id);

-- Função para criar automaticamente um perfil ao cadastrar um usuário
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger para chamar a função quando um novo usuário é criado
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

## Sistema de Autenticação

O sistema de autenticação implementa um fluxo completo para:

1. **Login de usuário**: 
   - Verifica credenciais (email/senha)
   - Verifica se o email está confirmado
   - Verifica se o perfil associado existe no banco de dados
   - Redireciona para cadastro se não existir um perfil

2. **Cadastro de usuário**:
   - Cria conta de autenticação
   - Cria perfil no banco de dados automaticamente
   - Envia email de verificação

3. **Recuperação de sessão**:
   - Sistema de retry para conexão com Supabase
   - Recuperação automática de sessão

### Fluxo de autenticação

```
┌─────────────┐       ┌─────────────┐      ┌─────────────┐
│             │       │             │      │             │
│    Login    ├──────►│  Verifica   │─────►│   Perfil    │
│             │       │   Email     │  ┌───┤  Existe?    │
└─────────────┘       └─────────────┘  │   └──────┬──────┘
                                       │          │
┌─────────────┐                        │          │ Sim
│             │◄──────────────────────┐│          │
│  Cadastro   │  Não (Redirecionado)  ││          ▼
│             │                       ││   ┌─────────────┐
└─────┬───────┘                       ││   │             │
      │                               ││   │   Acesso    │
      ▼                               ││   │ Autorizado  │
┌─────────────┐                       ││   │             │
│             │                       ││   └─────────────┘
│   Verifica  │                       ││
│    Email    │◄──────────────────────┘│
│             │                        │
└─────────────┘                        │
                                       │
```

### Tratamento de erros

O sistema implementa tratamento robusto para:
- Falhas de conexão com o Supabase
- Usuários autenticados sem perfil
- Emails não verificados
- Credenciais inválidas

### Ferramentas de diagnóstico

Em modo de desenvolvimento, o sistema disponibiliza ferramentas para:
- Testar a conexão com o banco de dados
- Visualizar status de conexão com o Supabase
- Monitorar tentativas de reconexão
- Ver detalhes de diagnóstico

## Deploy na Vercel

Para fazer deploy deste projeto na Vercel:

1. Conecte seu repositório GitHub à Vercel
2. Configure as variáveis de ambiente necessárias na seção de configurações do projeto na Vercel:
   - Vá para o Dashboard da Vercel > Seu Projeto > Settings > Environment Variables
   - Adicione as mesmas variáveis que estão no seu arquivo `.env.local`:
     ```
     NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
     NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
     ```
   - Estas variáveis devem ser adicionadas para todos os ambientes (Production, Preview e Development)
3. Faça o redeploy do projeto para aplicar as novas variáveis:
   - Vá para o Dashboard da Vercel > Seu Projeto > Deployments
   - Encontre seu último deploy e clique em "Redeploy"
   - Ou faça um novo commit no seu repositório para acionar um novo deploy

Importante: As variáveis de ambiente com prefixo `NEXT_PUBLIC_` são expostas no navegador do cliente. Para informações sensíveis que não devem ser expostas ao cliente, use variáveis sem esse prefixo e acesse-as apenas no lado do servidor.

## Configuração de Ambiente

### Variáveis de Ambiente

Este projeto utiliza o Supabase como backend. Para executar localmente, você precisa configurar as seguintes variáveis de ambiente:

1. Crie um arquivo `.env.local` na raiz do projeto com o seguinte conteúdo:

```
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
```

Substitua `sua_url_do_supabase` e `sua_chave_anonima` pelas suas credenciais do Supabase.

2. Para ambientes de produção ou preview, estas variáveis já estão configuradas nos arquivos `.env.production` e `.env.preview`, respectivamente.

**Nota importante:** A aplicação necessita destas variáveis de ambiente para funcionar corretamente, especialmente para autenticação. Se você estiver tendo problemas de login, verifique se as variáveis estão definidas corretamente.

### Inicialização do Banco de Dados

O sistema possui uma rota `/api/init-db` que verifica e inicializa as tabelas necessárias para o funcionamento da aplicação. Você pode acessar esta rota após iniciar o servidor de desenvolvimento para garantir que o banco de dados está configurado corretamente.

## Melhorias Recentes Implementadas

### 🔄 Sincronização de Cotações
- **Correção na contação de unidades do histórico**: Agora as cotações são sincronizadas automaticamente do `bitcoin-converter.tsx` para o `profit-calculator.tsx`
- **Priorização de fontes**: Sistema hierárquico de cotações (props do bitcoin-converter > appData > API direta)
- **Logs detalhados**: Rastreamento completo da origem das cotações para debugging

### 🛡️ Sistema de Importação Melhorado
- **Validação robusta de trades**: Verificação aprimorada com múltiplos critérios de validação
- **Detecção de dados corrompidos**: Filtros para valores de P&L extremos e dados inválidos
- **Sistema de retry**: Tentativas automáticas em caso de falha na API
- **Controle de duplicatas**: Verificação eficiente usando Sets para evitar importações duplicadas
- **Parada inteligente**: Detecção automática do fim dos dados da API

### 📊 Melhorias na Aba Histórico
- **Cotações sincronizadas**: Valores em tempo real do bitcoin-converter
- **Cálculos precisos**: Conversões BTC/USD/BRL consistentes
- **Performance otimizada**: Cache de dados filtrados para melhor responsividade

### 🔧 Correções Técnicas
- **Tipos TypeScript**: Correção de erros de tipos implícitos
- **Interfaces atualizadas**: Novos campos para estatísticas de importação
- **Logs estruturados**: Sistema de logging mais detalhado para debugging

## Como Usar

### Sincronização de Cotações
As cotações são sincronizadas automaticamente entre os componentes. O sistema prioriza:
1. Cotações do `bitcoin-converter` (props)
2. Dados do `appData` (fallback)
3. API direta (último recurso)

### Sistema de Importação
O sistema de importação agora inclui:
- Validação automática de trades
- Detecção de duplicatas
- Retry automático em falhas
- Parada inteligente quando não há mais dados

### Monitoramento
Use o console do navegador para acompanhar:
- Origem das cotações utilizadas
- Progresso da importação
- Estatísticas de validação
- Detecção de problemas