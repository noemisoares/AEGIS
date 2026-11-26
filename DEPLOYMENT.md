# 🌐 AEGIS — Guia Completo de Implantação em Produção (Deploy)

Este documento detalha o processo de implantação do **AEGIS** em arquitetura de nuvem moderna, escalável e segura.

---

## 🏛️ 1. Arquitetura Alvo de Produção

| Componente | Plataforma Recomendada | Tipo de Serviço | Stack Tecnológico |
|---|---|---|---|
| **Frontend (Painel SOC)** | [Vercel](https://vercel.com) | Static Site / SPA (Edge CDN) | React 18, Vite 5, TailwindCSS |
| **Backend API & Agendador** | [Render](https://render.com) | Web Service (Node.js) | Node.js 22, Express, Prisma ORM |
| **Banco de Dados** | Neon / Supabase / Render Postgres | Managed PostgreSQL | PostgreSQL 15+ |
| **Agente Desktop** | GitHub Releases / Windows Installer | Executável Electron | Electron 28, NSIS / Portable |

---

## 🗄️ 2. Passo a Passo: Banco de Dados PostgreSQL (Supabase)

O AEGIS utiliza **PostgreSQL** hospedado no **Supabase** como seu banco de dados principal.

### 2.1. Configuração do Projeto Supabase
- **Nome do Projeto:** `AEGIS-Database`
- **Região:** Ohio — AWS US East 2 (`us-east-2`)
- **Project Reference:** `rnemhexpglipkwvbkyov`

### 2.2. Modalidades de Conexão: Session Pooler vs Transaction Pooler
O Supabase disponibiliza diferentes endpoints via PgBouncer / Supavisor:

1. **Session Pooler (Porta 5432 - Recomendado para Render Web Service):**
   - Ideal para aplicações persistentes Node.js com estado de sessão e suporte a conexões IPv4.
   - Formato:
     ```env
     DATABASE_URL="postgresql://postgres.rnemhexpglipkwvbkyov:[SUA-SENHA]@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
     ```

2. **Transaction Pooler (Porta 6543 - Otimizado para Serverless / Alta Concorrência):**
   - Reutiliza conexões transacionais. Quando utilizado com o Prisma, requer o parâmetro `?pgbouncer=true`.
   - Formato:
     ```env
     DATABASE_URL="postgresql://postgres.rnemhexpglipkwvbkyov:[SUA-SENHA]@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
     ```

3. **Direct URL / Session para Migrações (`DIRECT_URL`):**
   - O Prisma Migrate executa comandos DDL com advisory locks e requer uma conexão direta ou em modo Session (porta 5432).
   - Formato:
     ```env
     DIRECT_URL="postgresql://postgres.rnemhexpglipkwvbkyov:[SUA-SENHA]@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
     ```

### 2.3. Executar Migrações Versionadas (`prisma migrate deploy`)
O projeto utiliza migrações Prisma versionadas e reproduzíveis (`backend/prisma/migrations/`).
Para aplicar as migrações no Supabase:

```bash
cd backend
npm run db:deploy
```
*(Executa internamente `prisma migrate deploy`, aplicando o histórico de migrações sem risco de perda de dados)*

### 2.4. Popular Dados de Demonstração (Seed)
Para carregar os 100 colaboradores fictícios da AEGIS Corporation e os modelos de simulação:

```bash
npm run db:seed
```
*(O seed é idempotente via `upsert`, não duplicando dados caso seja reexecutado)*

---

## 🚀 3. Passo a Passo: Backend API no Render

### 3.1. Criar o Web Service
1. Conecte sua conta do GitHub ao [Render.com](https://render.com).
2. Clique em **"New +"** → **"Web Service"**.
3. Selecione o repositório `AEGIS` e a branch `develop` (ou `main`).
4. Preencha as configurações principais:
   - **Name:** `aegis-backend-api`
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run db:deploy && npm run build`
   - **Start Command:** `npm run start`
   - **Plan:** `Starter` (ou `Free` para testes)

### 3.2. Variáveis de Ambiente no Render
Na aba **Environment** do serviço, configure:

| Chave | Exemplo de Valor | Descrição |
|---|---|---|
| `NODE_ENV` | `production` | Modo de execução |
| `PORT` | `10000` | Porta dinâmica fornecida pelo Render |
| `DATABASE_URL` | `postgresql://...sslmode=require` | String do PostgreSQL |
| `JWT_SECRET` | `sua_chave_secreta_super_segura_aegis_2026` | Chave de assinatura dos tokens JWT |
| `JWT_EXPIRES_IN` | `24h` | Tempo de expiração do token |
| `ALLOWED_ORIGINS` | `https://aegis-soc.vercel.app` | URLs permitidas para CORS (separadas por vírgula) |
| `FRONTEND_URL` | `https://aegis-soc.vercel.app` | URL base do Painel SOC |

> 💡 **Nota de Alta Disponibilidade:** O backend do AEGIS inclui um agendador em background (`schedulerService`) que verifica campanhas agendadas a cada 30 segundos. Ele inicia automaticamente ao executar `npm run start`.
> O endpoint de monitoramento `/health` testa a conectividade do banco de dados antes de retornar `HTTP 200`.

---

## ⚡ 4. Passo a Passo: Frontend no Vercel

### 4.1. Importar Projeto no Vercel
1. Acesse o [Vercel Dashboard](https://vercel.com/dashboard) e clique em **"Add New..."** → **"Project"**.
2. Selecione o repositório `AEGIS`.
3. Configure o **Root Directory**:
   - Clique em **Edit** e selecione a pasta `frontend`.
4. Mantenha os comandos padrão detectados pelo Vite:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

### 4.2. Variáveis de Ambiente no Vercel
Adicione a variável de ambiente:

| Chave | Valor | Descrição |
|---|---|---|
| `VITE_API_URL` | `https://aegis-backend-api.onrender.com/api` | URL pública da API do Backend no Render |

### 4.3. Regras de Roteamento SPA
O arquivo `frontend/vercel.json` já está configurado no repositório para redirecionar todas as rotas para `/index.html`, garantindo que URLs como `/dashboard/hri` e `/dashboard/denuncias` funcionem perfeitamente ao recarregar a página sem erros 404.

---

## 💻 5. Passo a Passo: Agente Desktop (Electron)

O agente desktop pode se conectar a qualquer backend em nuvem sem necessidade de recompilação.

### 5.1. Conexão Flexível com a Nuvem
O aplicativo resolve o endpoint da API na seguinte ordem de prioridade:
1. URL configurada manualmente pelo usuário na interface do agente (ícone de engrenagem ⚙️).
2. Variável de ambiente do sistema operacional: `AEGIS_API_URL`.
3. Variável de build: `VITE_API_URL`.
4. Fallback local: `http://localhost:3001/api`.

### 5.2. Gerar Instalador Windows (.exe)
Para compilar o pacote de distribuição para Windows:

```bash
cd desktop
npm run package:win
```

O comando gerará os seguintes arquivos na pasta `desktop/dist-release/`:
- **Instalador NSIS:** `AEGIS Desktop Agent Setup 1.0.0.exe`
- **Executável Portátil:** `AEGIS Desktop Agent 1.0.0.exe`

Os arquivos podem ser disponibilizados no portal corporativo interno ou através de **GitHub Releases**.

---

## 🛡️ 6. Checklist de Validação Pós-Deploy

Após concluir os deploys, realize este teste de ponta a ponta:

1. **Healthcheck:** Acesse `https://sua-api.onrender.com/health` e verifique se o retorno é:
   ```json
   { "status": "ok", "database": "connected" }
   ```
2. **Login no Painel SOC:** Acesse `https://seu-painel.vercel.app/login` e entre com `juliana.ciso@aegiscorp.demo` / `aegis@2024`.
3. **Tempo Real (SSE):** Abra a aba **Simulações** em uma janela e execute o Agente Desktop em outra. Reporte uma simulação no agente e observe o painel SOC atualizar instantaneamente via Server-Sent Events.
4. **Agendamento Automático:** Crie uma campanha agendada para 1 minuto no futuro com a opção "Recorrente Semanalmente" ativada. Aguarde o ciclo de 30 segundos do agendador e comprove que o status mudou para `ACTIVE` automaticamente.
5. **Revisão de Denúncias:** Acesse a rota `/dashboard/denuncias` no Painel SOC e altere o status de uma denúncia de `PENDING` para `INVESTIGATING` ou `CONFIRMED_THREAT`.
6. **Exportação de Auditoria:** Na aba **Relatórios**, clique em **"Exportar Relatório PDF"** e **"Exportar Relatório CSV"** e verifique os arquivos baixados.
