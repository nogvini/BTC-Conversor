# BTC Conversor

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
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
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