# 🚀 AEGIS — Guia Rápido de Execução e Demonstração do Protótipo (MVP)

Este guia contém as instruções práticas para executar, testar e demonstrar o **MVP do AEGIS** em bancas acadêmicas, reuniões técnicas ou apresentações institucionais.

---

## ⚡ 1. Inicialização Rápida (1 Clique no Windows)

Na raiz do projeto `AEGIS`, basta executar o arquivo:

```cmd
start-aegis.bat
```

> **O que o script faz automaticamente?**
> Abre 3 janelas de terminal dedicadas:
> 1. **Backend API:** `http://localhost:3001`
> 2. **Painel SOC (Web):** `http://localhost:5173`
> 3. **Agente Desktop (Electron):** `http://localhost:5174` (ou janela nativa do Electron)

---

## 🖥️ 2. URLs de Acesso

| Aplicação | URL | Finalidade |
|---|---|---|
| **Painel SOC de Governança** | [http://localhost:5173/dashboard](http://localhost:5173/dashboard) | Gestão, Indicadores, HRI por setor, Relatórios e Auditoria |
| **Agente Desktop (ou Web)** | [http://localhost:5174](http://localhost:5174) | Terminal do colaborador, simulações, botão de reporte e pílulas |
| **API Backend (Healthcheck)** | [http://localhost:3001/health](http://localhost:3001/health) | Verificação de integridade e status da API REST |

---

## 🔑 3. Credenciais Prontas para Demonstração

O banco de dados SQLite local (`dev.db`) já está pré-populado com a **AEGIS Corporation** e **100 colaboradores fictícios**:

### Perfil Gestão / SOC:
- **E-mail:** `juliana.ciso@aegiscorp.demo`
- **Senha:** `aegis@2024`
- *(Alternativa de Governança: `ana.governance@aegiscorp.demo` / `aegis@2024`)*

### Perfil Colaborador no Agente Desktop:
- **Colaborador Cuidadoso (Tecnologia):** `carlos.silva@aegiscorp.demo` | Senha: `aegis@colaborador`
- **Colaborador Vulnerável (Comercial):** `diego.cavalcante@aegiscorp.demo` | Senha: `aegis@colaborador`
- **Colaborador em Evolução (RH):** `ana.ferreira@aegiscorp.demo` | Senha: `aegis@colaborador`

> 💡 *A senha `aegis@colaborador` funciona para qualquer um dos 100 colaboradores cadastrados.*

---

## 🎭 4. Roteiro Sugerido para Apresentação Acadêmica (5 a 10 min)

### Passo 1 — Visão do Gestor (Painel SOC)
1. Acesse [http://localhost:5173/login](http://localhost:5173/login) e clique no atalho **"👩‍💼 Juliana (CISO)"**.
2. Mostre o **Painel SOC**:
   - Total de **100 colaboradores** e taxa de cliques/reportes.
   - Gráfico de **Evolução Comportamental** ao longo das semanas.
   - Aba **"Risco Humano (HRI)"**: mostre os gauges radiais e o comparativo por departamento (Tecnologia, RH, Financeiro, Comercial, Operações, Administrativo).

### Passo 2 — Abertura do Agente Desktop (Experiência do Colaborador)
1. Abra o Agente Desktop (ou acesse `http://localhost:5174`).
2. Faça login como **Carlos Silva** (`carlos.silva@aegiscorp.demo` / `aegis@colaborador`).
3. O agente exibirá a simulação ativa: *"Campanha 6 — DEMO AO VIVO: Urgência de Senha"*.

### Passo 3 — O Momento do Erro e a Pílula Educativa
1. Clique na simulação para abrir o e-mail falso.
2. Clique no link *"Atualizar senha agora"*.
3. O AEGIS imediatamente **interrompe a navegação** e exibe a **Pílula Educativa**:
   - Explica o que aconteceu sem punições ou constrangimentos.
   - Aponta os sinais de phishing (remetente falso, urgência fabricada).
   - Ensina a conduta correta.
4. Clique em *"Concluir Microtreinamento"* para creditar **+5 pontos**.

### Passo 4 — O Reporte Ativo de Ameaças
1. No Agente Desktop, clique no botão principal em destaque: **"REPORTAR AMEAÇA SUSPEITA"**.
2. O sistema valida a ameaça, exibe a confirmação e credita imediatamente **+20 pontos**.
3. Tente clicar novamente para demonstrar a **regra de negócio que impede pontuação duplicada**.

### Passo 5 — Governança e Atualização em Tempo Real (SSE)
1. Volte à aba do Painel SOC da Juliana.
2. Observe que os contadores de reportes e eventos recentes foram **atualizados em tempo real** via Server-Sent Events, sem necessidade de dar F5.
3. Acesse a aba **"Relatórios"**:
   - Clique em *"Exportar PDF"* para baixar o dossiê formal de evidências.
   - Clique em *"Exportar CSV"* para obter os dados brutos compatíveis com Excel e auditorias LGPD/ISO 27001.

---

## 🧪 5. Execução dos Testes Automatizados

Para comprovar que o sistema possui validação formal de regras de negócio, execute no terminal:

```bash
cd backend
npm test
```

**Resultado:** 13 testes aprovados (100% de cobertura nos fluxos principais de RBAC, cálculo do HRI, simulações, pílulas, bloqueio de duplicidade e geração de relatórios).

---

## 🔄 6. Como Reiniciar os Dados da Demonstração

Se desejar repovoar o banco com os dados limpos originais após a apresentação:

```bash
cd backend
npm run db:seed
```

---

*AEGIS — Governança Comportamental em Cibersegurança.*

