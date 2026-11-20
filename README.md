# AEGIS — Plataforma de Governança Comportamental em Cibersegurança

> **MVP Funcional e Demonstrável** para Governança, Conscientização Contínua e Redução Ativa do Risco Humano em Segurança da Informação.

---

## 1. Descrição do Projeto

O **AEGIS** é uma plataforma SaaS B2B projetada para transformar a conscientização dos colaboradores em um hábito prático, contínuo, seguro, gamificado e mensurável através de dados.

Substituindo métodos tradicionais ineficazes (como palestras anuais e cursos EAD passivos), o AEGIS atua no comportamento real do colaborador por meio de:
1. **Agente Desktop Leve:** Canal direto e discreto instalado no endpoint do funcionário.
2. **Simulador Semanal de Phishing:** Campanhas periódicas controladas e inofensivas.
3. **Pílulas Educativas no Momento do Erro:** Microtreinamento imediato e acolhedor (não punitivo) exibido no exato instante do clique indevido.
4. **Botão de Reporte de Ameaças:** Mecanismo acessível que transforma o colaborador em uma linha de defesa ativa.
5. **Sistema de Gamificação e Recompensas:** Pontuação transparente que premia reportes corretos (+20 pts) e microtreinamentos concluídos (+5 pts), sem penalizar erros.
6. **Painel SOC de Governança:** Dashboard web em tempo real (via Server-Sent Events) para CISOs e lideranças de segurança.
7. **Human Risk Index (HRI):** Indicador comportamental algorítmico (0 a 100) com evolução histórica calculada individualmente e agregada por setor.
8. **Relatórios de Auditoria:** Evidências comportamentais exportáveis em **PDF** e **CSV** para conformidade (LGPD, ISO/IEC 27001).

### 🚫 O que o AEGIS NÃO é
- Não é um antivírus ou EDR/XDR.
- Não é ferramenta de defesa de rede ou firewall.
- Não é spyware ou software de vigilância de funcionários (sem keylogger, sem captura de tela, sem monitoramento de navegação arbitrária).
- Não é punitivo nem disciplinar (não expõe colaboradores a constrangimentos).

---

## 2. Arquitetura do Sistema

```
                  ┌────────────────────────────────────────┐
                  │       AGENTE DESKTOP (Endpoint)        │
                  │   Electron + React + TypeScript + IPC   │
                  └──────────────────┬─────────────────────┘
                                     │ HTTP / REST
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        AEGIS BACKEND API                               │
│              Node.js + Express + TypeScript + Prisma ORM               │
│                                                                        │
│  ┌───────────────┐ ┌────────────────┐ ┌─────────────────────────────┐  │
│  │ Auth & RBAC   │ │ HRI Engine     │ │ Threat & Gamification Engine│  │
│  └───────┬───────┘ └───────┬────────┘ └──────────────┬──────────────┘  │
│          │                 │                         │                 │
│          ▼                 ▼                         ▼                 │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │     Banco de Dados Relacional (SQLite / PostgreSQL)              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ SSE (Server-Sent Events) + REST
                                     ▼
                  ┌────────────────────────────────────────┐
                  │          PAINEL SOC (Web)              │
                  │ React + Vite + TailwindCSS + Recharts  │
                  └────────────────────────────────────────┘
```

---

## 3. Tecnologias Utilizadas

- **Backend:** Node.js v20+, Express, TypeScript, Prisma ORM, SQLite (ou PostgreSQL), JSON Web Tokens (JWT), Bcrypt, PDFKit, Server-Sent Events (SSE).
- **Frontend Web (SOC & Colaborador):** React 18, Vite, TypeScript, TailwindCSS, Recharts, Lucide Icons, Axios.
- **Agente Desktop:** Electron, React, TypeScript, TailwindCSS, Windows Notifications IPC.
- **Testes Automatizados:** Jest, ts-jest, Supertest.

---

## 4. Estrutura de Diretórios

```
AEGIS/
├── backend/                  # Servidor API REST & SSE
│   ├── prisma/
│   │   └── schema.prisma     # Modelagem relacional completa
│   ├── src/
│   │   ├── __tests__/        # Testes automatizados Jest
│   │   ├── middleware/       # Autenticação, RBAC e Logger
│   │   ├── routes/           # Rotas REST da API
│   │   ├── services/         # Motores de HRI, Gamificação e Relatórios
│   │   └── seed/             # População com 100 colaboradores e histórico
│   ├── package.json
│   └── tsconfig.json
├── frontend/                 # Painel Web SOC e Portal do Colaborador
│   ├── src/
│   │   ├── contexts/         # Contexto de Autenticação e RBAC
│   │   ├── layouts/          # Layout do SOC Dashboard
│   │   ├── pages/            # Telas de Gestão e Simulação
│   │   └── lib/              # Client Axios configurado
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── desktop/                  # Agente Desktop (Electron + React)
│   ├── src/
│   │   ├── main.ts           # Processo Principal Electron
│   │   ├── preload.ts        # Ponte segura de IPC
│   │   └── renderer/         # Interface do Agente Desktop
│   ├── package.json
│   └── vite.config.ts
├── start-aegis.bat           # Script de inicialização integrada
└── README.md
```

---

## 5. Pré-requisitos

- **Node.js** >= 18.x (testado em v22.x)
- **npm** >= 9.x
- Sistema Operacional: Windows (compatível com Linux/macOS)

---

## 6. Instalação Passo a Passo

### 6.1. Clonar ou Acessar o Repositório
```bash
git clone https://github.com/SeuRepo/AEGIS.git
cd AEGIS
```

### 6.2. Instalar Dependências do Backend
```bash
cd backend
npm install
```

### 6.3. Instalar Dependências do Frontend
```bash
cd ../frontend
npm install
```

### 6.4. Instalar Dependências do Desktop
```bash
cd ../desktop
npm install
```

---

## 7. Configuração do Ambiente e Banco de Dados

1. Copie o arquivo de exemplo de ambiente no backend:
   ```bash
   cd ../backend
   copy .env.example .env
   ```

2. Inicialize as tabelas do banco de dados (SQLite automático para execução imediata sem depender de servidores externos):
   ```bash
   npx prisma db push
   npx prisma generate
   ```

---

## 8. Inicialização dos 100 Colaboradores Fictícios

Execute o seed que popula a organização fictícia **AEGIS Corporation**, distribuindo 100 colaboradores entre os 6 setores com 5 campanhas históricas pré-calculadas e 1 campanha ativa para demonstração ao vivo:

```bash
cd backend
npm run db:seed
```

---

## 9. Execução dos Serviços

### Opção A — Inicialização Automática com 1 Clique (Recomendada no Windows)
Na raiz do projeto, execute o script em lote:
```bash
start-aegis.bat
```
Ele abrirá automaticamente as 3 instâncias necessárias em terminais separados.

### Opção B — Inicialização Manual

1. **Terminal 1 — Backend:**
   ```bash
   cd backend
   npm run dev
   # Executando em: http://localhost:3001
   ```

2. **Terminal 2 — Frontend SOC Dashboard:**
   ```bash
   cd frontend
   npm run dev
   # Executando em: http://localhost:5173
   ```

3. **Terminal 3 — Agente Desktop:**
   ```bash
   cd desktop
   npm run dev
   # Executando em: http://localhost:5174 (ou janela do Agente Desktop)
   ```

---

## 10. Credenciais de Demonstração

| Perfil | Nome / Persona | E-mail | Senha | Função |
|---|---|---|---|---|
| **Gestor / CISO** | Juliana Mendes | `juliana.ciso@aegiscorp.demo` | `aegis@2024` | Acesso total ao SOC, HRI, Campanhas e Relatórios |
| **Gestora de Governança** | Ana Silva | `ana.governance@aegiscorp.demo` | `aegis@2024` | Governança e Auditoria de Risco |
| **Colaborador (Cuidadoso)** | Carlos Silva | `carlos.silva@aegiscorp.demo` | `aegis@colaborador` | Tecnologia — Baixo risco |
| **Colaborador (Vulnerável)** | Diego Cavalcante | `diego.cavalcante@aegiscorp.demo` | `aegis@colaborador` | Comercial — Alto risco |
| **Colaborador (Em Evolução)** | Ana Ferreira | `ana.ferreira@aegiscorp.demo` | `aegis@colaborador` | Recursos Humanos — Risco moderado |

*(Qualquer um dos 100 colaboradores pode ser acessado com a senha: `aegis@colaborador`)*

---

## 11. Metodologia do Human Risk Index (HRI)

O **HRI** é um índice comportamental de **0 a 100** onde **valores maiores indicam maior risco**.

### Pesos e Racional Teórico:
- **Taxa de Cliques (Peso 40%):** O comportamento de risco primário em ataques de engenharia social.
- **Taxa de Reporte (Peso 25%):** Inversamente proporcional; quanto mais o colaborador reporta suspeitas, menor o risco que representa.
- **Reincidência de Erros (Peso 20%):** Cometer erros repetidos em múltiplas campanhas eleva exponencialmente o índice de vulnerabilidade.
- **Conclusão de Pílulas (Peso 10%):** Concluir os microtreinamentos reflete absorção de conhecimento e reduz o risco.
- **Taxa de Participação (Peso 5%):** Ausência de engajamento gera incerteza amostral.

### Faixas de Classificação:
- **0 a 24:** Baixo Risco (Verde)
- **25 a 49:** Risco Moderado (Amarelo)
- **50 a 74:** Alto Risco (Laranja)
- **75 a 100:** Risco Crítico (Vermelho)

*Fator de Amostragem:* Colaboradores com menos de 5 observações sofrem regressão à média neutra (50.0) para evitar distorções bruscas com poucos eventos.

---

## 12. Regras de Gamificação

| Ação | Pontuação | Efeito no HRI |
|---|---:|---|
| Reportar Ameaça Corretamente | **+20 pts** | Reduz o HRI |
| Concluir Pílula Educativa | **+5 pts** | Reduz o HRI |
| Identificar Ameaça | **+10 pts** | Reduz o HRI |
| Clicar em Phishing | **0 pts** (sem punição) | Eleva o HRI |
| Reporte Duplicado | **0 pts** (prevenção de abuso) | Inalterado |

---

## 13. Execução dos Testes Automatizados

O sistema inclui testes automatizados cobrindo autenticação, controle de permissões (RBAC), lógica matemática do HRI, simulações de phishing, pílulas educativas imediatas, concessão de pontos, bloqueio de reportes duplicados e consistência dos relatórios em PDF e CSV.

Para executar a suíte de testes:
```bash
cd backend
npm test
```

---

## 14. Roteiro Sugerido para Apresentação Acadêmica

1. **Apresentação do Painel SOC:**
   - Faça login como Gestora CISO (`juliana.ciso@aegiscorp.demo` / `aegis@2024`).
   - Apresente os **100 colaboradores** distribuídos nos 6 setores.
   - Mostre o **HRI médio organizacional** e a distribuição por departamento.
2. **Experiência do Colaborador no Agente Desktop:**
   - Abra o Agente Desktop (ou `http://localhost:5174`) e acesse como Carlos Silva (`carlos.silva@aegiscorp.demo`).
   - Veja a notificação de simulação ativa: *"Campanha 6 — DEMO AO VIVO: Urgência de Senha"*.
3. **Fluxo do Erro e Microtreinamento Imediato:**
   - Abra a mensagem simulada e clique no link de redefinição de senha.
   - Veja a interrupção imediata pelo AEGIS, explicando os sinais de phishing.
   - Conclua a pílula educativa e confirme o crédito de **+5 pontos**.
4. **Fluxo de Defesa Ativa e Reporte:**
   - Em uma nova mensagem suspeita, clique no botão em destaque **"REPORTAR AMEAÇA SUSPEITA"**.
   - Receba a confirmação em tela e a premiação de **+20 pontos**.
5. **Governança em Tempo Real e Auditoria:**
   - Retorne ao Painel SOC e veja os eventos atualizados em tempo real sem recarregar a página.
   - Acesse a aba **Relatórios**, selecione formato **PDF** ou **CSV** e exporte o documento completo com as evidências comportamentais.

---

## 15. Principais Endpoints da API

| Método | Endpoint | Perfil | Descrição |
|---|---|---|---|
| `POST` | `/api/auth/login` | Público | Autenticação e geração de JWT |
| `GET` | `/api/auth/me` | Autenticado | Dados do usuário logado e HRI atual |
| `GET` | `/api/dashboard/overview` | Manager | Indicadores gerais do SOC em tempo real |
| `GET` | `/api/dashboard/behavior` | Manager | Tendência comportamental por campanha |
| `GET` | `/api/dashboard/sectors` | Manager | Indicadores agrupados por departamento |
| `GET` | `/api/hri/departments` | Manager | HRI detalhado por setor |
| `POST` | `/api/campaigns` | Manager | Criação de campanha de phishing |
| `POST` | `/api/campaigns/:id/start` | Manager | Início e disparo de simulações |
| `GET` | `/api/simulations/active` | Colaborador | Simulações pendentes no desktop |
| `POST` | `/api/simulations/:id/interact` | Colaborador | Registro de abertura e clique (com retorno da pílula) |
| `POST` | `/api/simulations/:id/pill-complete`| Colaborador | Conclusão de pílula e recompensa |
| `POST` | `/api/threat-reports` | Colaborador | Reporte de ameaça e concessão de pontos |
| `POST` | `/api/audit/reports/generate` | Manager | Geração de relatório de evidências em PDF/CSV |
| `GET` | `/api/sse/events` | Autenticado | Stream de eventos em tempo real (SSE) |
| `POST` | `/api/demo/reset` | Manager | Reinicialização limpa dos dados de demonstração |

---

## 16. Solução de Problemas Comuns

- **Erro de porta em uso (3001, 5173 ou 5174):**
  Certifique-se de que nenhum outro processo esteja utilizando as portas ou altere a porta correspondente no arquivo `.env` e nos scripts `vite.config.ts`.
- **Banco de dados não encontrado:**
  Execute `npx prisma db push` e `npm run db:seed` dentro da pasta `backend`.
- **Notificações não aparecendo no Windows:**
  Verifique se o Assistente de Foco do Windows não está ativo bloqueando notificações de aplicativos.

---

© AEGIS Security — Governança Comportamental em Cibersegurança. Todos os dados presentes são fictícios para fins de demonstração.
