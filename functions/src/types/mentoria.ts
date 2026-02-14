/**
 * Tipos para o sistema Multi-Tenant (SaaS White Label) - Backend
 */

export type MentoriaMode = "legacy" | "multi-tenant";
export type MentoriaStatus = "ativo" | "suspenso" | "cancelado" | "trial";
export type MentoriaPlan = "basico" | "pro" | "enterprise";

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

export interface MentoriaLimites {
  maxAlunos: number;
  maxMentores: number;
  maxArmazenamentoMB: number;
  cronogramaCustomizado: boolean;
  relatoriosAvancados: boolean;
  suporteWhatsapp: boolean;
  dominioCustomizado: boolean;
}

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
  criadoEm: FirebaseFirestore.Timestamp;
  atualizadoEm: FirebaseFirestore.Timestamp;
  trialExpiraEm?: FirebaseFirestore.Timestamp;
}

export interface MentoriaStats {
  mentoriaId: string;
  mentoriaNome: string;
  alunosAtivos: number;
  alunosInativos: number;
  mentoresAtivos: number;
  totalEstudosHoje: number;
  totalEstudosSemana: number;
  mediaHorasEstudo: number;
  ultimaAtividade?: FirebaseFirestore.Timestamp;
}

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
