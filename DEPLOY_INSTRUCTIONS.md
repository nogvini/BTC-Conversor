# 🚀 Instruções para Deploy no Vercel

## Problema 401 - Solução

O erro 401 que vocês estão enfrentando é causado pela falta de configuração das variáveis de ambiente do Supabase no Vercel. Aqui está como resolver:

## ✅ Passos para Corrigir

### 1. Configurar Variáveis de Ambiente no Vercel

Acesse o [Dashboard do Vercel](https://vercel.com/dashboard) e vá para o projeto:

1. **Clique no seu projeto** na dashboard
2. **Vá para "Settings"** (configurações)
3. **Clique em "Environment Variables"** (variáveis de ambiente)
4. **Adicione as seguintes variáveis:**

```bash
# Variáveis OBRIGATÓRIAS do Supabase
NEXT_PUBLIC_SUPABASE_URL=https://sua-url-supabase.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima-supabase
```

### 2. Como Obter as Credenciais do Supabase

1. **Acesse o [Dashboard do Supabase](https://app.supabase.com/)**
2. **Selecione seu projeto**
3. **Vá para "Settings" → "API"**
4. **Copie:**
   - **Project URL** → Use como `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** (chave pública) → Use como `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Redeploy Após Configurar

Depois de adicionar as variáveis:

1. **Volte para "Deployments"**
2. **Clique nos "..." do último deploy**
3. **Selecione "Redeploy"**

## 🔧 Verificações Adicionais

### Middleware Atualizado
O middleware foi corrigido para:
- ✅ Ser mais tolerante a erros de conexão
- ✅ Excluir arquivos estáticos (manifesto, favicons, etc.)
- ✅ Não bloquear acesso em caso de falha crítica

### Componentes Melhorados
- ✅ `RequireAuth` com retry automático
- ✅ Melhor tratamento de estados de carregamento
- ✅ Fallbacks para funcionalidades básicas

## 🏗️ Estrutura de Arquivos Importante

```
app/
├── profile/page.tsx      # Página protegida
├── settings/page.tsx     # Página protegida
├── auth/page.tsx         # Página pública (login)
├── layout.tsx           # Layout principal
└── page.tsx             # Página inicial (pública)

components/
├── require-auth.tsx     # Proteção de rotas
├── user-profile.tsx     # Componente de perfil
└── user-settings.tsx    # Componente de configurações

middleware.ts            # Proteção de rotas no servidor
```

## 🚨 Problemas Comuns

### Erro: "Variáveis não encontradas"
**Solução:** Certifique-se de que as variáveis começam com `NEXT_PUBLIC_`

### Erro: "Manifesto 401"
**Solução:** Já corrigido no middleware - arquivos estáticos são excluídos

### Erro: "Sessão não encontrada"
**Solução:** Verifique se o projeto Supabase está ativo e as credenciais estão corretas

## 📱 Funcionalidades Sem Autenticação

Estas páginas funcionam SEM login:
- `/` - Página inicial
- `/converter` - Conversor Bitcoin
- `/calculator` - Calculadora
- `/chart` - Gráficos
- `/auth` - Login/Registro

## 🔐 Funcionalidades COM Autenticação

Estas páginas PRECISAM de login:
- `/profile` - Perfil do usuário
- `/settings` - Configurações

## 🆘 Se o Problema Persistir

1. **Verifique os logs do Vercel:**
   - Dashboard → Projeto → Functions → Ver logs

2. **Teste localmente:**
   ```bash
   npm run dev
   ```

3. **Verifique no console do navegador:**
   - F12 → Console → Procure por erros

4. **Variáveis de ambiente locais (desenvolvimento):**
   Crie um arquivo `.env.local` na raiz:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=sua-url-aqui
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-aqui
   ```

## ✨ Resultado Esperado

Após seguir esses passos:
- ✅ Páginas públicas funcionam normalmente
- ✅ Páginas protegidas redirecionam para login se não autenticado
- ✅ Usuários logados acessam perfil e configurações normalmente
- ✅ Manifesto e arquivos estáticos carregam sem erro 401

---

**💡 Dica:** Sempre redeploy após alterar variáveis de ambiente no Vercel! 