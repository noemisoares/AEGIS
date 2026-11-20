import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { calculateHriScore, getRiskLevel } from '../services/hriService';

const prisma = new PrismaClient();

// ==========================================
// SEED DATA — FICTITIOUS DEMO ORGANIZATION
// All data is fictional and for demo purposes only
// ==========================================

const DEPARTMENTS = [
  { name: 'Tecnologia', description: 'Equipe de TI e Desenvolvimento' },
  { name: 'Recursos Humanos', description: 'Gestão de Pessoas e Cultura' },
  { name: 'Financeiro', description: 'Controladoria e Finanças' },
  { name: 'Comercial', description: 'Vendas e Relacionamento com Clientes' },
  { name: 'Operações', description: 'Operações e Logística' },
  { name: 'Administrativo', description: 'Administração e Suporte' },
];

// 100 fictional employees distributed across departments
const EMPLOYEES: Array<{
  name: string;
  email: string;
  jobTitle: string;
  department: string;
  behavior: 'CAREFUL' | 'IMPROVING' | 'RISKY' | 'MIXED';
}> = [
  // TECNOLOGIA (20 employees)
  { name: 'Carlos Eduardo Silva', email: 'carlos.silva@aegiscorp.demo', jobTitle: 'Analista de Sistemas', department: 'Tecnologia', behavior: 'CAREFUL' },
  { name: 'Mariana Costa', email: 'mariana.costa@aegiscorp.demo', jobTitle: 'Desenvolvedora Full Stack', department: 'Tecnologia', behavior: 'CAREFUL' },
  { name: 'Rafael Mendes', email: 'rafael.mendes@aegiscorp.demo', jobTitle: 'DevOps Engineer', department: 'Tecnologia', behavior: 'CAREFUL' },
  { name: 'Fernanda Alves', email: 'fernanda.alves@aegiscorp.demo', jobTitle: 'QA Engineer', department: 'Tecnologia', behavior: 'IMPROVING' },
  { name: 'Lucas Pereira', email: 'lucas.pereira@aegiscorp.demo', jobTitle: 'Analista de Suporte', department: 'Tecnologia', behavior: 'MIXED' },
  { name: 'Beatriz Santos', email: 'beatriz.santos@aegiscorp.demo', jobTitle: 'Arquiteta de Software', department: 'Tecnologia', behavior: 'CAREFUL' },
  { name: 'Thiago Rodrigues', email: 'thiago.rodrigues@aegiscorp.demo', jobTitle: 'Analista de Segurança', department: 'Tecnologia', behavior: 'CAREFUL' },
  { name: 'Amanda Ferreira', email: 'amanda.ferreira@aegiscorp.demo', jobTitle: 'Product Owner', department: 'Tecnologia', behavior: 'IMPROVING' },
  { name: 'Gustavo Lima', email: 'gustavo.lima@aegiscorp.demo', jobTitle: 'Desenvolvedor Backend', department: 'Tecnologia', behavior: 'CAREFUL' },
  { name: 'Priscila Nunes', email: 'priscila.nunes@aegiscorp.demo', jobTitle: 'UX Designer', department: 'Tecnologia', behavior: 'MIXED' },
  { name: 'Daniel Carvalho', email: 'daniel.carvalho@aegiscorp.demo', jobTitle: 'DBA', department: 'Tecnologia', behavior: 'CAREFUL' },
  { name: 'Larissa Moreira', email: 'larissa.moreira@aegiscorp.demo', jobTitle: 'Analista de BI', department: 'Tecnologia', behavior: 'IMPROVING' },
  { name: 'Felipe Araújo', email: 'felipe.araujo@aegiscorp.demo', jobTitle: 'Scrum Master', department: 'Tecnologia', behavior: 'CAREFUL' },
  { name: 'Camila Souza', email: 'camila.souza@aegiscorp.demo', jobTitle: 'Analista de Infraestrutura', department: 'Tecnologia', behavior: 'RISKY' },
  { name: 'Rodrigo Barbosa', email: 'rodrigo.barbosa@aegiscorp.demo', jobTitle: 'Desenvolvedor Mobile', department: 'Tecnologia', behavior: 'MIXED' },
  { name: 'Isabela Ramos', email: 'isabela.ramos@aegiscorp.demo', jobTitle: 'Analista de Dados', department: 'Tecnologia', behavior: 'CAREFUL' },
  { name: 'Matheus Oliveira', email: 'matheus.oliveira@aegiscorp.demo', jobTitle: 'Tech Lead', department: 'Tecnologia', behavior: 'CAREFUL' },
  { name: 'Juliana Castro', email: 'juliana.castro@aegiscorp.demo', jobTitle: 'Analista de Suporte N2', department: 'Tecnologia', behavior: 'RISKY' },
  { name: 'André Pinto', email: 'andre.pinto@aegiscorp.demo', jobTitle: 'SRE', department: 'Tecnologia', behavior: 'CAREFUL' },
  { name: 'Gabriela Monteiro', email: 'gabriela.monteiro@aegiscorp.demo', jobTitle: 'Analista de Cloud', department: 'Tecnologia', behavior: 'IMPROVING' },

  // RECURSOS HUMANOS (15 employees)
  { name: 'Ana Luiza Ferreira', email: 'ana.ferreira@aegiscorp.demo', jobTitle: 'Gerente de RH', department: 'Recursos Humanos', behavior: 'IMPROVING' },
  { name: 'Ricardo Gomes', email: 'ricardo.gomes@aegiscorp.demo', jobTitle: 'Analista de RH', department: 'Recursos Humanos', behavior: 'RISKY' },
  { name: 'Claudia Martins', email: 'claudia.martins@aegiscorp.demo', jobTitle: 'Recrutadora', department: 'Recursos Humanos', behavior: 'RISKY' },
  { name: 'Eduardo Freitas', email: 'eduardo.freitas@aegiscorp.demo', jobTitle: 'Analista de Treinamento', department: 'Recursos Humanos', behavior: 'IMPROVING' },
  { name: 'Patricia Lopes', email: 'patricia.lopes@aegiscorp.demo', jobTitle: 'Coordenadora de RH', department: 'Recursos Humanos', behavior: 'MIXED' },
  { name: 'Marcos Vieira', email: 'marcos.vieira@aegiscorp.demo', jobTitle: 'Analista de DP', department: 'Recursos Humanos', behavior: 'RISKY' },
  { name: 'Renata Cardoso', email: 'renata.cardoso@aegiscorp.demo', jobTitle: 'Psicóloga Organizacional', department: 'Recursos Humanos', behavior: 'IMPROVING' },
  { name: 'Alexandre Costa', email: 'alexandre.costa@aegiscorp.demo', jobTitle: 'Analista de Benefícios', department: 'Recursos Humanos', behavior: 'MIXED' },
  { name: 'Vanessa Ribeiro', email: 'vanessa.ribeiro@aegiscorp.demo', jobTitle: 'Assistente de RH', department: 'Recursos Humanos', behavior: 'RISKY' },
  { name: 'Leonardo Dias', email: 'leonardo.dias@aegiscorp.demo', jobTitle: 'Analista de Cultura', department: 'Recursos Humanos', behavior: 'IMPROVING' },
  { name: 'Simone Farias', email: 'simone.farias@aegiscorp.demo', jobTitle: 'Assistente de DP', department: 'Recursos Humanos', behavior: 'RISKY' },
  { name: 'Bruno Melo', email: 'bruno.melo@aegiscorp.demo', jobTitle: 'Analista de Cargos', department: 'Recursos Humanos', behavior: 'MIXED' },
  { name: 'Fabiana Torres', email: 'fabiana.torres@aegiscorp.demo', jobTitle: 'Coordenadora de Treinamento', department: 'Recursos Humanos', behavior: 'IMPROVING' },
  { name: 'Henrique Correia', email: 'henrique.correia@aegiscorp.demo', jobTitle: 'Analista de RH Sênior', department: 'Recursos Humanos', behavior: 'MIXED' },
  { name: 'Leticia Braga', email: 'leticia.braga@aegiscorp.demo', jobTitle: 'Assistente de Recrutamento', department: 'Recursos Humanos', behavior: 'RISKY' },

  // FINANCEIRO (15 employees)
  { name: 'Roberto Nascimento', email: 'roberto.nascimento@aegiscorp.demo', jobTitle: 'CFO', department: 'Financeiro', behavior: 'MIXED' },
  { name: 'Cristina Almeida', email: 'cristina.almeida@aegiscorp.demo', jobTitle: 'Analista Financeiro', department: 'Financeiro', behavior: 'RISKY' },
  { name: 'Paulo Henrique', email: 'paulo.henrique@aegiscorp.demo', jobTitle: 'Contador', department: 'Financeiro', behavior: 'RISKY' },
  { name: 'Adriana Lima', email: 'adriana.lima@aegiscorp.demo', jobTitle: 'Tesoureira', department: 'Financeiro', behavior: 'MIXED' },
  { name: 'Walter Teixeira', email: 'walter.teixeira@aegiscorp.demo', jobTitle: 'Analista de Crédito', department: 'Financeiro', behavior: 'IMPROVING' },
  { name: 'Elaine Rocha', email: 'elaine.rocha@aegiscorp.demo', jobTitle: 'Analista de Cobrança', department: 'Financeiro', behavior: 'RISKY' },
  { name: 'Sérgio Campos', email: 'sergio.campos@aegiscorp.demo', jobTitle: 'Coordenador Financeiro', department: 'Financeiro', behavior: 'MIXED' },
  { name: 'Monica Figueiredo', email: 'monica.figueiredo@aegiscorp.demo', jobTitle: 'Analista de Custos', department: 'Financeiro', behavior: 'IMPROVING' },
  { name: 'Caio Duarte', email: 'caio.duarte@aegiscorp.demo', jobTitle: 'Assistente Financeiro', department: 'Financeiro', behavior: 'RISKY' },
  { name: 'Stella Rezende', email: 'stella.rezende@aegiscorp.demo', jobTitle: 'Analista Fiscal', department: 'Financeiro', behavior: 'MIXED' },
  { name: 'Rodrigo Cunha', email: 'rodrigo.cunha@aegiscorp.demo', jobTitle: 'Analista de Faturamento', department: 'Financeiro', behavior: 'RISKY' },
  { name: 'Aline Medeiros', email: 'aline.medeiros@aegiscorp.demo', jobTitle: 'Analista de Conciliação', department: 'Financeiro', behavior: 'IMPROVING' },
  { name: 'Thiago Paiva', email: 'thiago.paiva@aegiscorp.demo', jobTitle: 'Analista Tributário', department: 'Financeiro', behavior: 'MIXED' },
  { name: 'Fernanda Cruz', email: 'fernanda.cruz@aegiscorp.demo', jobTitle: 'Assistente de Contabilidade', department: 'Financeiro', behavior: 'RISKY' },
  { name: 'Marcos Bastos', email: 'marcos.bastos@aegiscorp.demo', jobTitle: 'Controller', department: 'Financeiro', behavior: 'MIXED' },

  // COMERCIAL (20 employees)
  { name: 'Diego Cavalcante', email: 'diego.cavalcante@aegiscorp.demo', jobTitle: 'Gerente Comercial', department: 'Comercial', behavior: 'RISKY' },
  { name: 'Juliana Pires', email: 'juliana.pires@aegiscorp.demo', jobTitle: 'Executiva de Vendas', department: 'Comercial', behavior: 'RISKY' },
  { name: 'Samuel Oliveira', email: 'samuel.oliveira@aegiscorp.demo', jobTitle: 'SDR', department: 'Comercial', behavior: 'RISKY' },
  { name: 'Nathalia Borges', email: 'nathalia.borges@aegiscorp.demo', jobTitle: 'Key Account', department: 'Comercial', behavior: 'IMPROVING' },
  { name: 'Vinicius Machado', email: 'vinicius.machado@aegiscorp.demo', jobTitle: 'Executivo de Contas', department: 'Comercial', behavior: 'RISKY' },
  { name: 'Carolina Esteves', email: 'carolina.esteves@aegiscorp.demo', jobTitle: 'Inside Sales', department: 'Comercial', behavior: 'MIXED' },
  { name: 'Alexandre Matos', email: 'alexandre.matos@aegiscorp.demo', jobTitle: 'Business Developer', department: 'Comercial', behavior: 'RISKY' },
  { name: 'Rebeca Santos', email: 'rebeca.santos@aegiscorp.demo', jobTitle: 'CRM Analyst', department: 'Comercial', behavior: 'IMPROVING' },
  { name: 'Gustavo Mendonça', email: 'gustavo.mendonca@aegiscorp.demo', jobTitle: 'Executivo de Vendas Sr', department: 'Comercial', behavior: 'RISKY' },
  { name: 'Talita Corrêa', email: 'talita.correa@aegiscorp.demo', jobTitle: 'Coordenadora Comercial', department: 'Comercial', behavior: 'MIXED' },
  { name: 'Rafael Godoi', email: 'rafael.godoi@aegiscorp.demo', jobTitle: 'Analista Comercial', department: 'Comercial', behavior: 'IMPROVING' },
  { name: 'Melissa Andrade', email: 'melissa.andrade@aegiscorp.demo', jobTitle: 'SDR Sênior', department: 'Comercial', behavior: 'RISKY' },
  { name: 'Cauã Ferreira', email: 'caua.ferreira@aegiscorp.demo', jobTitle: 'Gerente de Território', department: 'Comercial', behavior: 'MIXED' },
  { name: 'Érica Guimarães', email: 'erica.guimaraes@aegiscorp.demo', jobTitle: 'Account Executive', department: 'Comercial', behavior: 'RISKY' },
  { name: 'Davi Moreno', email: 'davi.moreno@aegiscorp.demo', jobTitle: 'Sales Engineer', department: 'Comercial', behavior: 'IMPROVING' },
  { name: 'Lorena Fonseca', email: 'lorena.fonseca@aegiscorp.demo', jobTitle: 'Analista de Proposta', department: 'Comercial', behavior: 'MIXED' },
  { name: 'Nicolas Vaz', email: 'nicolas.vaz@aegiscorp.demo', jobTitle: 'Executivo de Vendas Jr', department: 'Comercial', behavior: 'RISKY' },
  { name: 'Débora Leite', email: 'debora.leite@aegiscorp.demo', jobTitle: 'Customer Success', department: 'Comercial', behavior: 'IMPROVING' },
  { name: 'Heitor Branco', email: 'heitor.branco@aegiscorp.demo', jobTitle: 'Pré-vendas', department: 'Comercial', behavior: 'RISKY' },
  { name: 'Yasmin Costa', email: 'yasmin.costa@aegiscorp.demo', jobTitle: 'Analista de Vendas', department: 'Comercial', behavior: 'MIXED' },

  // OPERAÇÕES (15 employees)
  { name: 'Marcos Nogueira', email: 'marcos.nogueira@aegiscorp.demo', jobTitle: 'Gerente de Operações', department: 'Operações', behavior: 'MIXED' },
  { name: 'Sandra Peixoto', email: 'sandra.peixoto@aegiscorp.demo', jobTitle: 'Analista de Processos', department: 'Operações', behavior: 'IMPROVING' },
  { name: 'Clayton Souza', email: 'clayton.souza@aegiscorp.demo', jobTitle: 'Coordenador de Logística', department: 'Operações', behavior: 'RISKY' },
  { name: 'Luciana Prado', email: 'luciana.prado@aegiscorp.demo', jobTitle: 'Analista de Supply Chain', department: 'Operações', behavior: 'MIXED' },
  { name: 'Renan Carmo', email: 'renan.carmo@aegiscorp.demo', jobTitle: 'Analista de Qualidade', department: 'Operações', behavior: 'IMPROVING' },
  { name: 'Tamara Leal', email: 'tamara.leal@aegiscorp.demo', jobTitle: 'Supervisora de Operações', department: 'Operações', behavior: 'MIXED' },
  { name: 'Alexsandro Ramos', email: 'alexsandro.ramos@aegiscorp.demo', jobTitle: 'Analista de Projetos', department: 'Operações', behavior: 'RISKY' },
  { name: 'Emanuelle Neves', email: 'emanuelle.neves@aegiscorp.demo', jobTitle: 'Coordenadora de Qualidade', department: 'Operações', behavior: 'IMPROVING' },
  { name: 'Waldecir Filho', email: 'waldecir.filho@aegiscorp.demo', jobTitle: 'Analista de Compras', department: 'Operações', behavior: 'RISKY' },
  { name: 'Priscila Aguiar', email: 'priscila.aguiar@aegiscorp.demo', jobTitle: 'Assistente de Operações', department: 'Operações', behavior: 'MIXED' },
  { name: 'Thales Queiroz', email: 'thales.queiroz@aegiscorp.demo', jobTitle: 'Analista de Contratos', department: 'Operações', behavior: 'IMPROVING' },
  { name: 'Monique Brito', email: 'monique.brito@aegiscorp.demo', jobTitle: 'Gestora de Projetos', department: 'Operações', behavior: 'CAREFUL' },
  { name: 'Eurides Pinheiro', email: 'eurides.pinheiro@aegiscorp.demo', jobTitle: 'Analista de RPA', department: 'Operações', behavior: 'MIXED' },
  { name: 'Cintia Meireles', email: 'cintia.meireles@aegiscorp.demo', jobTitle: 'Supervisora de Qualidade', department: 'Operações', behavior: 'IMPROVING' },
  { name: 'Josué Carneiro', email: 'josue.carneiro@aegiscorp.demo', jobTitle: 'Analista de Processos Sr', department: 'Operações', behavior: 'CAREFUL' },

  // ADMINISTRATIVO (15 employees)
  { name: 'Conceição Barros', email: 'conceicao.barros@aegiscorp.demo', jobTitle: 'Gerente Administrativa', department: 'Administrativo', behavior: 'RISKY' },
  { name: 'Edilson Farias', email: 'edilson.farias@aegiscorp.demo', jobTitle: 'Assistente Administrativo', department: 'Administrativo', behavior: 'RISKY' },
  { name: 'Verônica Macedo', email: 'veronica.macedo@aegiscorp.demo', jobTitle: 'Recepcionista', department: 'Administrativo', behavior: 'RISKY' },
  { name: 'Sidnei Marques', email: 'sidnei.marques@aegiscorp.demo', jobTitle: 'Auxiliar Administrativo', department: 'Administrativo', behavior: 'RISKY' },
  { name: 'Graciela Santos', email: 'graciela.santos@aegiscorp.demo', jobTitle: 'Secretária Executiva', department: 'Administrativo', behavior: 'IMPROVING' },
  { name: 'Genilson Pereira', email: 'genilson.pereira@aegiscorp.demo', jobTitle: 'Auxiliar de Escritório', department: 'Administrativo', behavior: 'RISKY' },
  { name: 'Naiara Albuquerque', email: 'naiara.albuquerque@aegiscorp.demo', jobTitle: 'Coordenadora Administrativa', department: 'Administrativo', behavior: 'MIXED' },
  { name: 'Djalma Costa', email: 'djalma.costa@aegiscorp.demo', jobTitle: 'Office Manager', department: 'Administrativo', behavior: 'MIXED' },
  { name: 'Rosângela Lima', email: 'rosangela.lima@aegiscorp.demo', jobTitle: 'Assistente de Diretoria', department: 'Administrativo', behavior: 'IMPROVING' },
  { name: 'Aparecido Vieira', email: 'aparecido.vieira@aegiscorp.demo', jobTitle: 'Assistente Administrativo Jr', department: 'Administrativo', behavior: 'RISKY' },
  { name: 'Telma Rocha', email: 'telma.rocha@aegiscorp.demo', jobTitle: 'Analista Administrativa', department: 'Administrativo', behavior: 'MIXED' },
  { name: 'Oséias Cardoso', email: 'oseias.cardoso@aegiscorp.demo', jobTitle: 'Assistente de Facilities', department: 'Administrativo', behavior: 'RISKY' },
  { name: 'Lívia Florêncio', email: 'livia.florencio@aegiscorp.demo', jobTitle: 'Coordenadora de Facilidades', department: 'Administrativo', behavior: 'IMPROVING' },
  { name: 'Waldir Mendes', email: 'waldir.mendes@aegiscorp.demo', jobTitle: 'Auxiliar de Suporte Administrativo', department: 'Administrativo', behavior: 'RISKY' },
  { name: 'Iolanda Ferreira', email: 'iolanda.ferreira@aegiscorp.demo', jobTitle: 'Assistente de Compras', department: 'Administrativo', behavior: 'MIXED' },
];

const PHISHING_TEMPLATES = [
  {
    name: 'Atualização Urgente de Senha Corporativa',
    subject: '⚠️ Ação necessária: Sua senha corporativa expirará em 24 horas',
    senderName: 'TI Corporativo - AEGIS Corp',
    senderEmail: 'ti-suporte@aegiscorp-sistemas.com',
    category: 'credential_theft',
    difficulty: 'MEDIUM' as const,
    bodyText: 'Prezado colaborador, sua senha de acesso ao sistema corporativo expirará nas próximas 24 horas. Para evitar a suspensão do seu acesso, clique no link abaixo e atualize sua senha imediatamente. Este procedimento é obrigatório para todos os colaboradores. Equipe de TI.',
    bodyHtml: `<div style="font-family:Arial;max-width:600px;margin:0 auto;border:1px solid #ddd;">
      <div style="background:#003366;padding:15px;text-align:center;">
        <h2 style="color:white;margin:0;">AEGIS Corp — Suporte de TI</h2>
      </div>
      <div style="padding:20px;">
        <p>Prezado(a) colaborador(a),</p>
        <p>Sua senha de acesso ao <strong>Portal Corporativo</strong> expirará em <strong style="color:red;">24 horas</strong>.</p>
        <p>Para evitar a suspensão do seu acesso, clique no botão abaixo:</p>
        <div style="text-align:center;margin:20px 0;">
          <a href="SIMULATION_CLICK_URL" style="background:#003366;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;">ATUALIZAR SENHA AGORA</a>
        </div>
        <p style="color:#666;font-size:12px;">Se você não atualizar sua senha, seu acesso será suspenso automaticamente.</p>
      </div>
    </div>`,
    description: 'Simula uma mensagem de TI pedindo urgência na atualização de senha',
  },
  {
    name: 'Documento Compartilhado no SharePoint',
    subject: 'Documento importante compartilhado com você',
    senderName: 'Microsoft SharePoint',
    senderEmail: 'noreply@sharepoint-corp.net',
    category: 'document_lure',
    difficulty: 'HARD' as const,
    bodyText: 'Um documento importante foi compartilhado com você. Clique aqui para visualizar: Relatório_Financeiro_Q4_2024.xlsx. Você tem acesso por 48 horas.',
    bodyHtml: `<div style="font-family:Segoe UI,Arial;max-width:600px;margin:0 auto;">
      <div style="background:#0078d4;padding:12px 20px;display:flex;align-items:center;">
        <span style="color:white;font-size:18px;font-weight:bold;">Microsoft SharePoint</span>
      </div>
      <div style="padding:24px;border:1px solid #edebe9;">
        <p style="font-size:14px;">Carlos compartilhou um documento com você:</p>
        <div style="border:1px solid #edebe9;padding:16px;border-radius:4px;margin:12px 0;">
          <p style="font-size:16px;margin:0;"><strong>📊 Relatório_Financeiro_Q4_2024.xlsx</strong></p>
          <p style="color:#605e5c;font-size:12px;margin:4px 0;">Acesso expira em 48 horas</p>
        </div>
        <a href="SIMULATION_CLICK_URL" style="display:inline-block;background:#0078d4;color:white;padding:10px 20px;text-decoration:none;border-radius:2px;margin-top:8px;">Abrir documento</a>
      </div>
    </div>`,
    description: 'Imita notificação do SharePoint para acessar documento financeiro sensível',
  },
  {
    name: 'Reembolso de Despesas Pendente',
    subject: 'Seu reembolso de R$ 847,50 está disponível para saque',
    senderName: 'Financeiro AEGIS Corp',
    senderEmail: 'financeiro@aegis-reembolsos.com.br',
    category: 'financial_lure',
    difficulty: 'EASY' as const,
    bodyText: 'Parabéns! Seu reembolso de despesas no valor de R$ 847,50 foi aprovado. Para receber o valor, confirme seus dados bancários clicando no link abaixo.',
    bodyHtml: `<div style="font-family:Arial;max-width:600px;margin:0 auto;">
      <div style="background:#1a7431;padding:15px;text-align:center;">
        <h2 style="color:white;margin:0;">💰 Reembolso Aprovado!</h2>
      </div>
      <div style="padding:20px;">
        <p>Prezado(a) colaborador(a),</p>
        <p>Seu reembolso de despesas foi <strong>aprovado</strong>:</p>
        <div style="background:#f0fdf4;border:1px solid #86efac;padding:15px;border-radius:4px;text-align:center;">
          <p style="font-size:28px;color:#1a7431;margin:0;"><strong>R$ 847,50</strong></p>
          <p style="color:#166534;margin:4px 0;">Disponível para saque</p>
        </div>
        <p>Para confirmar seus dados bancários e receber o valor, clique abaixo:</p>
        <div style="text-align:center;margin:20px 0;">
          <a href="SIMULATION_CLICK_URL" style="background:#1a7431;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;">CONFIRMAR DADOS E RECEBER</a>
        </div>
      </div>
    </div>`,
    description: 'Simula aprovação de reembolso para captura de dados bancários',
  },
  {
    name: 'Acesso ao Sistema RH Expirado',
    subject: 'URGENTE: Holerite e benefícios bloqueados — recadastre-se',
    senderName: 'RH Digital - AEGIS Corp',
    senderEmail: 'rh-digital@aegiscorp-portal.info',
    category: 'credential_theft',
    difficulty: 'MEDIUM' as const,
    bodyText: 'Seu acesso ao portal de RH foi suspenso. Para desbloquear holerites e benefícios, recadastre seus dados até sexta-feira.',
    bodyHtml: `<div style="font-family:Arial;max-width:600px;margin:0 auto;border:1px solid #fca5a5;border-radius:8px;overflow:hidden;">
      <div style="background:#dc2626;padding:15px;text-align:center;">
        <h2 style="color:white;margin:0;">⚠️ Acesso Suspenso</h2>
      </div>
      <div style="padding:20px;">
        <p>Seu acesso ao <strong>Portal RH Digital</strong> foi <strong style="color:#dc2626;">suspenso</strong> por falta de recadastramento.</p>
        <p>Itens bloqueados:</p>
        <ul style="color:#dc2626;">
          <li>✗ Holerites</li>
          <li>✗ Benefícios</li>
          <li>✗ Férias</li>
        </ul>
        <p><strong>Prazo: Sexta-feira às 18h</strong></p>
        <div style="text-align:center;margin:20px 0;">
          <a href="SIMULATION_CLICK_URL" style="background:#dc2626;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;">RECADASTRAR AGORA</a>
        </div>
      </div>
    </div>`,
    description: 'Urgência falsa sobre acesso a benefícios para coleta de credenciais',
  },
  {
    name: 'Reunião de Diretoria — Convite Urgente',
    subject: 'Convite: Reunião Estratégica da Diretoria — HOJE 15h',
    senderName: 'Assistente da Presidência',
    senderEmail: 'presidencia@aegiscorp-agenda.com',
    category: 'spear_phishing',
    difficulty: 'HARD' as const,
    bodyText: 'A Presidência convida para reunião estratégica emergencial hoje às 15h. Acesse a pauta completa e confirme presença.',
    bodyHtml: `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;">
      <div style="border-bottom:3px solid #1e3a5f;padding:15px 0;text-align:center;">
        <h2 style="color:#1e3a5f;margin:0;">AEGIS Corporation</h2>
        <p style="color:#6b7280;margin:4px 0;font-size:12px;">Presidência Executiva</p>
      </div>
      <div style="padding:24px;">
        <p>Prezado(a),</p>
        <p>A <strong>Presidência</strong> convida para uma <strong>reunião estratégica emergencial</strong>:</p>
        <div style="background:#f1f5f9;padding:16px;border-left:4px solid #1e3a5f;margin:16px 0;">
          <p style="margin:0;"><strong>📅 Data:</strong> Hoje</p>
          <p style="margin:4px 0;"><strong>🕒 Horário:</strong> 15:00</p>
          <p style="margin:0;"><strong>📍 Local:</strong> Sala Virtual — Microsoft Teams</p>
        </div>
        <p>Para acessar a <strong>pauta completa e confirmação</strong>:</p>
        <div style="text-align:center;margin:20px 0;">
          <a href="SIMULATION_CLICK_URL" style="background:#1e3a5f;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;">VER PAUTA E CONFIRMAR</a>
        </div>
      </div>
    </div>`,
    description: 'Convite falso de diretoria para reunião emergencial — spear phishing',
  },
];

const EDUCATIONAL_PILLS = [
  {
    templateIndex: 0,
    title: 'Cuidado com Links de Atualização de Senha!',
    content: 'Você clicou em um link de phishing simulado. Este tipo de mensagem é uma das táticas mais comuns de ataque. Empresas legítimas de TI NUNCA enviam links por e-mail pedindo que você atualize sua senha diretamente.',
    whatWentWrong: 'O e-mail criava urgência artificial ("expirará em 24 horas"), usava um domínio diferente do corporativo (aegiscorp-sistemas.com em vez de aegiscorp.com) e pedia ação imediata sem confirmação.',
    tips: '1. Verifique sempre o domínio do remetente\n2. Nunca clique em links de e-mails urgentes sem confirmar pelo canal oficial\n3. Acesse diretamente o portal corporativo pelo navegador\n4. Em caso de dúvida, ligue para o Help Desk',
    correctAction: 'Acesse o portal de TI diretamente pelo seu navegador (não pelo link) e verifique se há realmente uma solicitação de troca de senha. Se a mensagem parecer suspeita, reporte usando o botão AEGIS no seu agente.',
    category: 'credential_phishing',
  },
  {
    templateIndex: 1,
    title: 'Documentos Compartilhados Precisam de Verificação!',
    content: 'Você clicou em uma simulação de phishing com aparência de notificação do Microsoft SharePoint. Atacantes frequentemente imitam e-mails de serviços conhecidos para roubar credenciais.',
    whatWentWrong: 'O domínio do remetente era "sharepoint-corp.net" e não "microsoft.com" ou o domínio da sua empresa. E-mails legítimos do SharePoint vêm sempre de domínios @microsoft.com ou do domínio corporativo.',
    tips: '1. Hover no link antes de clicar — veja para onde ele aponta\n2. Verifique o domínio do remetente\n3. Acesse o SharePoint diretamente pelo portal corporativo\n4. Desconfie de documentos "urgentes" compartilhados por e-mail',
    correctAction: 'Acesse o SharePoint ou OneDrive corporativo diretamente pelo navegador. Se houver um documento real compartilhado, ele aparecerá lá. Reporte o e-mail suspeito.',
    category: 'document_phishing',
  },
  {
    templateIndex: 2,
    title: 'Ofertas de Dinheiro Fácil São Armadilhas!',
    content: 'Você clicou em uma simulação sobre reembolso de despesas. Mensagens que prometem dinheiro ou recompensas inesperadas são táticas clássicas de engenharia social para captura de dados financeiros.',
    whatWentWrong: 'O domínio era "aegis-reembolsos.com.br" (não corporativo), o valor era específico e inesperado, e havia urgência para confirmar dados bancários. Empresas não pedem dados bancários por e-mail.',
    tips: '1. Reembolsos são processados por sistemas internos acessados diretamente\n2. Sua empresa nunca pedirá dados bancários por e-mail\n3. Desconfie de valores específicos e inesperados\n4. Verifique sempre com o departamento financeiro por outro canal',
    correctAction: 'Acesse diretamente o portal de RH ou Financeiro para verificar reembolsos. Nunca forneça dados bancários por e-mail. Reporte a mensagem.',
    category: 'financial_phishing',
  },
  {
    templateIndex: 3,
    title: 'Urgência com Benefícios é Uma Tática de Manipulação!',
    content: 'Você clicou em uma simulação sobre bloqueio de acesso a benefícios. Atacantes usam medo e urgência — especialmente sobre salários e benefícios — para fazer você agir sem pensar.',
    whatWentWrong: 'O domínio era suspeito, havia um prazo curto criando pressão, e os itens bloqueados (holerites, benefícios, férias) eram escolhidos para maximizar a preocupação do colaborador.',
    tips: '1. Urgência artificial é um sinal claro de phishing\n2. Verifique pelo portal oficial se há realmente um bloqueio\n3. Ligue para o RH diretamente em caso de dúvida\n4. Nunca forneça credenciais em links enviados por e-mail',
    correctAction: 'Acesse o portal de RH diretamente. Se houver bloqueio real, o próprio sistema informará. Em dúvida, contate o RH por telefone ou pessoalmente.',
    category: 'urgency_manipulation',
  },
  {
    templateIndex: 4,
    title: 'Reuniões "Urgentes" da Diretoria Podem Ser Fraudes!',
    content: 'Você clicou em uma simulação de spear phishing imitando a presidência da empresa. Este é um dos ataques mais sofisticados: personificar alguém de autoridade para criar obrigação de agir.',
    whatWentWrong: 'O domínio era "aegiscorp-agenda.com" (não corporativo), a reunião era emergencial sem aviso prévio, e havia pressão por confirmação imediata. Convites reais vêm pelo Teams ou calendar corporativo.',
    tips: '1. Convites de reunião vêm pelo Microsoft Teams ou Google Calendar — não por e-mail externo\n2. Verifique com a assistente da presidência por outro canal\n3. Alta urgência + autoridade = maior suspeita\n4. Examine sempre o domínio do remetente',
    correctAction: 'Verifique no seu calendário corporativo se há a reunião. Confirme com a secretaria executiva por telefone ou Teams. Reporte o e-mail suspeito ao AEGIS.',
    category: 'spear_phishing',
  },
];

async function main() {
  console.log('🌱 Starting AEGIS Demo Seed...');
  console.log('⚠️  All data is FICTIONAL and for demonstration purposes only');

  // Create organization
  const org = await prisma.organization.upsert({
    where: { id: 'demo-org-aegis-2024' },
    update: {},
    create: {
      id: 'demo-org-aegis-2024',
      name: 'AEGIS Corporation',
      domain: 'aegiscorp.demo',
      description: 'Organização fictícia de demonstração — Dados gerados para apresentação acadêmica do AEGIS',
      isDemo: true,
    },
  });

  console.log(`✅ Organization created: ${org.name}`);

  // Create departments
  const deptMap: Record<string, string> = {};
  for (const dept of DEPARTMENTS) {
    const created = await prisma.department.upsert({
      where: { id: `demo-dept-${dept.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `demo-dept-${dept.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: dept.name,
        description: dept.description,
        organizationId: org.id,
      },
    });
    deptMap[dept.name] = created.id;
  }

  console.log(`✅ ${DEPARTMENTS.length} departments created`);

  // Create manager/CISO accounts
  const managerPassword = await bcrypt.hash('aegis@2024', 12);
  
  const juliana = await prisma.user.upsert({
    where: { email: 'juliana.ciso@aegiscorp.demo' },
    update: {},
    create: {
      email: 'juliana.ciso@aegiscorp.demo',
      name: 'Juliana Mendes (CISO)',
      passwordHash: managerPassword,
      role: 'MANAGER',
      jobTitle: 'Chief Information Security Officer',
      organizationId: org.id,
      isDemo: true,
    },
  });

  const ana = await prisma.user.upsert({
    where: { email: 'ana.governance@aegiscorp.demo' },
    update: {},
    create: {
      email: 'ana.governance@aegiscorp.demo',
      name: 'Ana Silva (Governança)',
      passwordHash: managerPassword,
      role: 'MANAGER',
      jobTitle: 'Gerente de Governança de Segurança',
      organizationId: org.id,
      isDemo: true,
    },
  });

  console.log(`✅ Manager accounts created (juliana.ciso@aegiscorp.demo, ana.governance@aegiscorp.demo)`);
  console.log(`   Password: aegis@2024`);

  // Create collaborator password
  const collabPassword = await bcrypt.hash('aegis@colaborador', 12);

  // Create 100 employees
  const userMap: Record<string, string> = {};
  
  for (const emp of EMPLOYEES) {
    const deptId = deptMap[emp.department];
    
    const user = await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: {
        email: emp.email,
        name: emp.name,
        passwordHash: collabPassword,
        role: 'COLLABORATOR',
        jobTitle: emp.jobTitle,
        departmentId: deptId,
        organizationId: org.id,
        isDemo: true,
      },
    });

    userMap[emp.email] = user.id;

    // Create points record
    await prisma.userPoints.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, totalPoints: 0 },
    });
  }

  console.log(`✅ ${EMPLOYEES.length} collaborators created`);

  // Create phishing templates
  const templateIds: string[] = [];
  for (const tpl of PHISHING_TEMPLATES) {
    const created = await prisma.phishingTemplate.upsert({
      where: { id: `demo-template-${tpl.category}-${tpl.difficulty.toLowerCase()}` },
      update: {},
      create: {
        id: `demo-template-${tpl.category}-${tpl.difficulty.toLowerCase()}`,
        name: tpl.name,
        subject: tpl.subject,
        bodyHtml: tpl.bodyHtml,
        bodyText: tpl.bodyText,
        senderName: tpl.senderName,
        senderEmail: tpl.senderEmail,
        difficulty: tpl.difficulty,
        category: tpl.category,
        description: tpl.description,
        isGlobal: true,
      },
    });
    templateIds.push(created.id);
  }

  console.log(`✅ ${PHISHING_TEMPLATES.length} phishing templates created`);

  // Create educational pills (linked to templates)
  const pillIds: string[] = [];
  for (let i = 0; i < EDUCATIONAL_PILLS.length; i++) {
    const pill = EDUCATIONAL_PILLS[i];
    const created = await prisma.educationalPill.upsert({
      where: { id: `demo-pill-${pill.category}` },
      update: {},
      create: {
        id: `demo-pill-${pill.category}`,
        templateId: templateIds[pill.templateIndex],
        title: pill.title,
        content: pill.content,
        tips: pill.tips,
        whatWentWrong: pill.whatWentWrong,
        correctAction: pill.correctAction,
        category: pill.category,
        difficulty: PHISHING_TEMPLATES[pill.templateIndex].difficulty,
        isGlobal: true,
      },
    });
    pillIds.push(created.id);
  }

  console.log(`✅ ${EDUCATIONAL_PILLS.length} educational pills created`);

  // Create historical campaigns (past campaigns with behavioral data)
  const historicalCampaigns = [
    { name: 'Campanha 1 — Janeiro: Senhas Corporativas', templateIdx: 0, weeksAgo: 10 },
    { name: 'Campanha 2 — Fevereiro: Documentos Suspeitos', templateIdx: 1, weeksAgo: 8 },
    { name: 'Campanha 3 — Março: Reembolsos Falsos', templateIdx: 2, weeksAgo: 6 },
    { name: 'Campanha 4 — Abril: Urgência em RH', templateIdx: 3, weeksAgo: 4 },
    { name: 'Campanha 5 — Maio: Convite de Diretoria', templateIdx: 4, weeksAgo: 2 },
  ];

  const allUserIds = EMPLOYEES.map(e => userMap[e.email]).filter(Boolean);
  const employeeBehaviorMap: Record<string, string> = {};
  for (const emp of EMPLOYEES) {
    if (userMap[emp.email]) {
      employeeBehaviorMap[userMap[emp.email]] = emp.behavior;
    }
  }

  console.log('📊 Creating historical campaigns and behavioral data...');

  for (const histCampaign of historicalCampaigns) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - histCampaign.weeksAgo * 7);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    const campaign = await prisma.campaign.create({
      data: {
        name: histCampaign.name,
        description: `Campanha histórica de demonstração — Semana ${10 - histCampaign.weeksAgo / 2}`,
        status: 'COMPLETED',
        templateId: templateIds[histCampaign.templateIdx],
        organizationId: org.id,
        targetAll: true,
        startedAt: startDate,
        endedAt: endDate,
        createdById: juliana.id,
      },
    });

    // Create simulation results for all users
    for (const userId of allUserIds) {
      const behavior = employeeBehaviorMap[userId] || 'MIXED';
      
      await prisma.campaignTarget.create({
        data: { campaignId: campaign.id, userId, sentAt: startDate },
      });

      // Determine behavior based on profile
      let clicked = false;
      let reported = false;
      let pillCompleted = false;
      
      const rnd = Math.random();
      
      if (behavior === 'CAREFUL') {
        // Mostly reports correctly
        if (rnd < 0.80) reported = true;
        else if (rnd < 0.90) clicked = true; // 10% error rate
        
      } else if (behavior === 'IMPROVING') {
        // Started risky, getting better (factor in campaign progression)
        const improvementFactor = (10 - histCampaign.weeksAgo / 1.5) / 10;
        if (rnd < 0.20 + improvementFactor * 0.40) reported = true;
        else if (rnd < 0.65 - improvementFactor * 0.30) clicked = true;
        
      } else if (behavior === 'RISKY') {
        // Often clicks
        if (rnd < 0.60) clicked = true;
        else if (rnd < 0.70) reported = true;
        
      } else { // MIXED
        if (rnd < 0.35) reported = true;
        else if (rnd < 0.65) clicked = true;
      }

      if (clicked) pillCompleted = Math.random() < 0.65;

      const clickTime = clicked ? new Date(startDate.getTime() + Math.random() * 86400000 * 3) : undefined;
      const reportTime = reported ? new Date(startDate.getTime() + Math.random() * 86400000 * 2) : undefined;
      const pillTime = clicked && pillCompleted ? new Date((clickTime?.getTime() ?? 0) + 180000) : undefined;

      let status: 'SENT' | 'OPENED' | 'CLICKED' | 'REPORTED' | 'COMPLETED' = 'OPENED';
      if (clicked && pillCompleted) status = 'COMPLETED';
      else if (clicked) status = 'CLICKED';
      else if (reported) status = 'REPORTED';

      await prisma.simulationResult.create({
        data: {
          campaignId: campaign.id,
          userId,
          status,
          sentAt: startDate,
          openedAt: new Date(startDate.getTime() + Math.random() * 3600000),
          clickedAt: clickTime ?? null,
          reportedAt: reportTime ?? null,
          pillShownAt: clicked ? clickTime : null,
          pillCompletedAt: pillTime ?? null,
        },
      });

      // Award points
      if (reported && !clicked) {
        await prisma.pointTransaction.create({
          data: {
            userId,
            points: 20,
            reason: 'THREAT_REPORTED_CORRECT',
            referenceId: campaign.id,
            description: 'Ameaça reportada corretamente',
          },
        });
        await prisma.userPoints.update({
          where: { userId },
          data: { totalPoints: { increment: 20 } },
        });

        await prisma.threatReport.create({
          data: {
            userId,
            campaignId: campaign.id,
            reportType: 'SIMULATION',
            isCorrect: true,
            pointsAwarded: 20,
          },
        });
      }

      if (clicked && pillCompleted) {
        const pill = await prisma.educationalPill.findFirst({
          where: { templateId: templateIds[histCampaign.templateIdx] },
        });

        if (pill) {
          await prisma.pillCompletion.upsert({
            where: {
              userId_pillId_campaignId: { userId, pillId: pill.id, campaignId: campaign.id },
            },
            update: {},
            create: {
              userId,
              pillId: pill.id,
              campaignId: campaign.id,
              completedAt: pillTime!,
              timeSpent: Math.floor(Math.random() * 180) + 60,
            },
          });

          await prisma.pointTransaction.create({
            data: {
              userId,
              points: 5,
              reason: 'PILL_COMPLETED',
              referenceId: `${pill.id}-${campaign.id}`,
              description: 'Pílula educativa concluída',
            },
          });
          await prisma.userPoints.update({
            where: { userId },
            data: { totalPoints: { increment: 5 } },
          });
        }
      }
    }

    // Calculate HRI for each department after this campaign
    for (const deptId of Object.values(deptMap)) {
      const deptUsers = await prisma.user.findMany({
        where: { departmentId: deptId, status: 'ACTIVE' },
        select: { id: true },
      });

      const scores: number[] = [];
      
      for (const u of deptUsers) {
        const userSims = await prisma.simulationResult.findMany({
          where: { userId: u.id },
          orderBy: { sentAt: 'desc' },
          take: 10,
        });

        const total = userSims.length;
        if (total === 0) {
          scores.push(50);
          continue;
        }

        const clicks = userSims.filter(s => s.clickedAt).length;
        const reports = userSims.filter(s => s.reportedAt).length;
        const pills = userSims.filter(s => s.pillCompletedAt).length;
        const pillsNeeded = userSims.filter(s => s.pillShownAt).length;

        const clickRate = clicks / total;
        const reportRate = reports / total;
        const pillRate = pillsNeeded > 0 ? pills / pillsNeeded : 1;
        const recidivism = clicks > 1 ? clicks / total : (clicks > 0 ? 0.5 : 0);

        const score = calculateHriScore({
          clickRate,
          reportRate,
          pillCompletionRate: pillRate,
          recidivism,
          participationRate: 1,
          observationCount: total,
        });

        // Store individual HRI
        await prisma.hriScore.create({
          data: {
            userId: u.id,
            score,
            riskLevel: getRiskLevel(score),
            clickRate,
            reportRate,
            pillCompletionRate: pillRate,
            recidivism,
            participationRate: 1,
            observationCount: total,
            calculatedAt: endDate,
          },
        });

        scores.push(score);
      }

      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 50;
      
      await prisma.hriHistory.create({
        data: {
          departmentId: deptId,
          campaignId: campaign.id,
          avgScore,
          riskLevel: getRiskLevel(avgScore),
          userCount: scores.length,
          calculatedAt: endDate,
        },
      });
    }

    console.log(`  ✓ Campaign "${histCampaign.name}" with behavioral data`);
  }

  // Create an ACTIVE demo campaign ready for demonstration
  const activeCampaign = await prisma.campaign.create({
    data: {
      name: 'Campanha 6 — DEMO AO VIVO: Urgência de Senha',
      description: 'Campanha ativa para demonstração — Pronta para usar no roteiro de apresentação',
      status: 'ACTIVE',
      templateId: templateIds[0],
      organizationId: org.id,
      targetAll: false,
      startedAt: new Date(),
      createdById: juliana.id,
    },
  });

  // Add all users to the demo campaign
  for (const userId of allUserIds) {
    await prisma.campaignTarget.create({
      data: { campaignId: activeCampaign.id, userId, sentAt: new Date() },
    });
    await prisma.simulationResult.create({
      data: {
        campaignId: activeCampaign.id,
        userId,
        status: 'SENT',
        sentAt: new Date(),
      },
    });
  }

  console.log(`✅ Active demo campaign created: "${activeCampaign.name}"`);
  console.log(`   Campaign ID: ${activeCampaign.id}`);

  // Create event logs
  await prisma.eventLog.create({
    data: {
      eventType: 'CAMPAIGN_CREATED',
      userId: juliana.id,
      campaignId: activeCampaign.id,
      organizationId: org.id,
      metadata: JSON.stringify({ campaignName: activeCampaign.name }),
    },
  });

  console.log('\n📋 AEGIS DEMO CREDENTIALS:');
  console.log('='.repeat(50));
  console.log('🔐 MANAGER/CISO Access:');
  console.log('   Email: juliana.ciso@aegiscorp.demo');
  console.log('   Password: aegis@2024');
  console.log('');
  console.log('   Email: ana.governance@aegiscorp.demo');
  console.log('   Password: aegis@2024');
  console.log('');
  console.log('👤 Collaborator Access (any of 100):');
  console.log('   Email: carlos.silva@aegiscorp.demo (Tech — CAREFUL behavior)');
  console.log('   Email: diego.cavalcante@aegiscorp.demo (Comercial — RISKY behavior)');
  console.log('   Email: ana.ferreira@aegiscorp.demo (RH — IMPROVING behavior)');
  console.log('   Password for all: aegis@colaborador');
  console.log('');
  console.log(`🎯 Active Demo Campaign ID: ${activeCampaign.id}`);
  console.log('='.repeat(50));
  console.log('\n✅ Seed completed successfully!');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

