/**
 * Tipos para o sistema Multi-Tenant (SaaS White Label)
 * 
 * DUAL-MODE:
 * - Legacy: Mentoria original (Mário Machado) - dados nas coleções raiz
 * - Multi-Tenant: Novos clientes white label - dados em mentorias/{id}/...
 */

export type MentoriaMode = "legacy" | "multi-tenant";
export type MentoriaStatus = "ativo" | "suspenso" | "cancelado" | "trial";
export type MentoriaPlan = "basico" | "pro" | "enterprise";

/**
 * Configuração de branding de uma mentoria white label
 */
export interface MentoriaBranding {
  nomePlataforma: string;
  logo?: string;
  favicon?: string;
  corPrimaria?: string;
  corSecundaria?: string;
  corAcento?: string;
  dominio?: string;
  subdominio?: string;
  emailContato?: string;
  whatsapp?: string;
}

/**
 * Limites do plano da mentoria
 */
export interface MentoriaLimites {
  maxAlunos: number;
  maxMentores: number;
  maxArmazenamentoMB: number;
  cronogramaCustomizado: boolean;
  relatoriosAvancados: boolean;
  suporteWhatsapp: boolean;
  dominioCustomizado: boolean;
}

/**
 * Configuração completa de uma mentoria
 */
export interface MentoriaConfig {
  id: string;
  nome: string;
  modo: MentoriaMode;
  status: MentoriaStatus;
  plano: MentoriaPlan;
  branding: MentoriaBranding;
  limites: MentoriaLimites;
  gestorId: string;
  gestorNome?: string;
  gestorEmail?: string;
  criadoEm: Date;
  atualizadoEm: Date;
  trialExpiraEm?: Date;
}

/**
 * Estatísticas de uma mentoria (para o dashboard do gestor)
 */
export interface MentoriaStats {
  mentoriaId: string;
  mentoriaNome: string;
  alunosAtivos: number;
  alunosInativos: number;
  mentoresAtivos: number;
  totalEstudosHoje: number;
  totalEstudosSemana: number;
  mediaHorasEstudo: number;
  ultimaAtividade?: Date;
}

/**
 * Resumo de todas as mentorias (para o dashboard unificado)
 */
export interface DashboardGestorData {
  totalMentorias: number;
  mentoriasAtivas: number;
  totalAlunos: number;
  totalMentores: number;
  receitaMensal?: number;
  mentorias: MentoriaStats[];
}

/**
 * Dados para criação de uma nova mentoria
 */
export interface CreateMentoriaInput {
  nome: string;
  plano: MentoriaPlan;
  branding: MentoriaBranding;
  limites?: Partial<MentoriaLimites>;
  gestorNome: string;
  gestorEmail: string;
}

/**
 * Limites padrão por plano
 */
export const LIMITES_POR_PLANO: Record<MentoriaPlan, MentoriaLimites> = {
  basico: {
    maxAlunos: 50,
    maxMentores: 2,
    maxArmazenamentoMB: 500,
    cronogramaCustomizado: false,
    relatoriosAvancados: false,
    suporteWhatsapp: false,
    dominioCustomizado: false,
  },
  pro: {
    maxAlunos: 200,
    maxMentores: 5,
    maxArmazenamentoMB: 2000,
    cronogramaCustomizado: true,
    relatoriosAvancados: true,
    suporteWhatsapp: true,
    dominioCustomizado: false,
  },
  enterprise: {
    maxAlunos: 1000,
    maxMentores: 20,
    maxArmazenamentoMB: 10000,
    cronogramaCustomizado: true,
    relatoriosAvancados: true,
    suporteWhatsapp: true,
    dominioCustomizado: true,
  },
};
