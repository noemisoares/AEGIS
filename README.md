# AEGIS — Plataforma de Governança Comportamental em Cibersegurança

**AEGIS** é uma plataforma web B2B de conscientização contínua e gestão de riscos humanos em cibersegurança. O sistema transforma a segurança da informação em um hábito prático, mensurável e orientado a dados, apoiando equipes de segurança e governança na redução de vulnerabilidades comportamentais sem adotar abordagens punitivas ou de vigilância invasiva.

---

## 1. Apresentação

### O problema
Métodos tradicionais de conscientização — como palestras anuais, cartilhas estáticas e treinamentos extensos — frequentemente não se traduzem em comportamento seguro no dia a dia. Além disso, gestores de segurança enfrentam dificuldade para mensurar a maturidade comportamental por setor e identificar onde estão os maiores riscos diante de ataques de engenharia social.

### Objetivo do MVP
O MVP do **AEGIS** demonstra, em ambiente web funcional, como uma organização pode:
- Executar campanhas controladas de simulação de phishing;
- Educar colaboradores imediatamente após uma interação de risco por meio de pílulas educativas;
- Incentivar o reporte ativo de mensagens suspeitas com gamificação positiva;
- Acompanhar eventos em tempo real no Painel SOC;
- Mensurar a evolução do **Índice de Risco Humano (HRI)** por colaborador e departamento;
- Exportar relatórios de evidências comportamentais para auditoria e governança.

---

## 2. Acesso à Plataforma

Acesse o sistema diretamente pelo navegador através do endereço principal da aplicação web:

- **Aplicação Web (Principal):** [https://aegis-frontend-mu.vercel.app](https://aegis-frontend-mu.vercel.app)
- **Backend / API (verificação de disponibilidade):** [https://aegis-backend-irhc.onrender.com/health](https://aegis-backend-irhc.onrender.com/health)
  > Este endpoint retorna o status operacional do servidor. O backend não possui interface web — ele é consumido internamente pela aplicação.

Para entrar na plataforma, utilize as credenciais fornecidas pelo administrador responsável pela organização ou pela equipe de demonstração.

---

## 3. Funcionalidades Implementadas

As funcionalidades abaixo estão disponíveis na versão atual do sistema:

### Painel SOC e Indicadores Gerais
- Visão executiva consolidada para gestores e profissionais de segurança (`/dashboard`).
- Indicadores de colaboradores ativos, taxas de cliques, taxas de reporte e acompanhamento de campanhas.
- Atualizações e notificações em tempo real via **Server-Sent Events (SSE)**.

### Gestão de Colaboradores
- Consulta dos colaboradores vinculados à organização (`/dashboard/colaboradores`).
- Visualização de departamento, cargo, pontuação acumulada e nível individual de risco humano.

### Campanhas de Simulação de Phishing
- Criação, gerenciamento e disparo de campanhas com modelos de simulação (`/dashboard/campanhas`).
- Registro de interações dos colaboradores (envio, abertura e clique).
- Suporte a agendamento e execução recorrente semanal automatizada no backend.

### Denúncias de Ameaças
- Canal direto no portal do colaborador para reporte de mensagens suspeitas.
- Painel de triagem e acompanhamento pela equipe de segurança (`/dashboard/denuncias`), permitindo atualizar o status das denúncias ao longo da análise.

### Indicador de Risco Humano (HRI)
- Cálculo comportamental em escala de 0 a 100 com classificação de risco (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`).
- Painel dedicado (`/dashboard/hri`) com comparativo entre departamentos e histórico evolutivo ao longo das campanhas.

### Relatórios de Auditoria
- Geração e exportação de relatórios comportamentais e de evidências nos formatos **PDF** e **CSV** (`/dashboard/relatorios`).

### Gamificação, Pontuação e Pílulas Educativas
- Exibição imediata de pílulas educativas contextuais quando o colaborador interage com uma simulação (`/simulacao/:campaignId`).
- Sistema de pontuação positiva que recompensa reportes corretos e conclusão de pílulas educativas, mantendo histórico de transações sem descontar pontos por erros.

---

## 4. Como Utilizar

1. **Acesse a aplicação web:** abra [https://aegis-frontend-mu.vercel.app](https://aegis-frontend-mu.vercel.app) no navegador.
2. **Realize o login:** informe o e-mail e a senha disponibilizados pelo administrador.
3. **Navegação conforme o perfil:**
   - **Perfil Gestor / CISO:** direcionado ao **Painel SOC** (`/dashboard`), com acesso no menu lateral às seções *Visão Geral*, *Colaboradores*, *Campanhas*, *Denúncias*, *Risco Humano (HRI)* e *Relatórios*.
   - **Perfil Colaborador:** direcionado ao **Portal do Colaborador** (`/colaborador`), onde é possível acompanhar pontuação e HRI pessoal, visualizar simulações ativas, ler pílulas educativas e reportar mensagens suspeitas.

---

## 5. Tecnologias Utilizadas

| Camada | Tecnologias |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, React Router, Axios, Recharts, Lucide React |
| **Backend** | Node.js, Express, TypeScript, Prisma ORM, JWT, bcryptjs, PDFKit, Express Validator, Helmet |
| **Banco de Dados** | PostgreSQL (Supabase) |

---

## 6. Arquitetura e Infraestrutura

A versão atual do AEGIS opera em arquitetura web em nuvem composta por três camadas:

- **Interface Web (Vercel):** aplicação SPA em React/Vite responsável pelo Painel SOC e pelo Portal do Colaborador.
- **API e Agendador (Render):** serviço Node.js/Express responsável pela autenticação JWT, controle de acesso por perfil (RBAC), regras de negócio, cálculo do HRI, geração de relatórios, stream SSE e agendamento automático de campanhas.
- **Banco de Dados (Supabase):** instância PostgreSQL gerenciada utilizada exclusivamente pelo backend via Prisma ORM, com Row Level Security (RLS) habilitado nas tabelas do schema público.

---

## 7. Observações sobre o MVP

Esta entrega corresponde à versão **MVP Web** do AEGIS, disponibilizada para validação prática, testes funcionais e demonstração das funcionalidades implementadas em ambiente de produção.
