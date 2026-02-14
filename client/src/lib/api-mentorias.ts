/**
 * API para gestão de mentorias (Multi-Tenant SaaS)
 * 
 * Funções para o gestor gerenciar mentorias white label.
 * NÃO afeta o modo legacy.
 */

import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

async function callFunction<T = any, R = any>(functionName: string, data?: T): Promise<R> {
  const callable = httpsCallable<T, R>(functions, functionName);
  const result = await callable(data);
  return result.data;
}

export const mentoriasApi = {
  // Listar todas as mentorias
  getMentorias: () => callFunction("mentoriasFunctions-getMentorias"),

  // Obter estatísticas de uma mentoria
  getMentoriaStats: (mentoriaId: string) =>
    callFunction("mentoriasFunctions-getMentoriaStats", { mentoriaId }),

  // Obter dashboard unificado
  getDashboardUnificado: () =>
    callFunction("mentoriasFunctions-getDashboardUnificado"),

  // Criar nova mentoria white label
  criarMentoria: (data: {
    nome: string;
    plano: string;
    branding: {
      nomePlataforma: string;
      logo?: string;
      corPrimaria?: string;
      corSecundaria?: string;
      dominio?: string;
      emailContato?: string;
      whatsapp?: string;
    };
    gestorNome?: string;
    gestorEmail?: string;
  }) => callFunction("mentoriasFunctions-criarMentoria", data),

  // Atualizar configuração de uma mentoria
  atualizarMentoria: (data: {
    mentoriaId: string;
    nome?: string;
    plano?: string;
    branding?: any;
    limites?: any;
  }) => callFunction("mentoriasFunctions-atualizarMentoria", data),

  // Suspender/reativar mentoria
  toggleMentoriaStatus: (mentoriaId: string) =>
    callFunction("mentoriasFunctions-toggleMentoriaStatus", { mentoriaId }),

  // Deletar mentoria (soft delete)
  deletarMentoria: (mentoriaId: string) =>
    callFunction("mentoriasFunctions-deletarMentoria", { mentoriaId }),

  // ============================================
  // GESTÃO DE MENTORES EM MENTORIAS
  // ============================================

  // Criar mentor dentro de uma mentoria
  createMentorInMentoria: (data: {
    mentoriaId: string;
    email: string;
    password: string;
    nome: string;
  }) => callFunction("mentoriaUsuariosFunctions-createMentorInMentoria", data),

  // Listar mentores de uma mentoria
  getMentoresInMentoria: (mentoriaId: string) =>
    callFunction("mentoriaUsuariosFunctions-getMentoresInMentoria", { mentoriaId }),

  // Atualizar mentor em uma mentoria
  updateMentorInMentoria: (data: {
    mentoriaId: string;
    mentorId: string;
    nome?: string;
    email?: string;
    ativo?: boolean;
  }) => callFunction("mentoriaUsuariosFunctions-updateMentorInMentoria", data),

  // Deletar mentor de uma mentoria
  deleteMentorInMentoria: (mentoriaId: string, mentorId: string) =>
    callFunction("mentoriaUsuariosFunctions-deleteMentorInMentoria", { mentoriaId, mentorId }),

  // ============================================
  // GESTÃO DE ALUNOS EM MENTORIAS
  // ============================================

  // Criar aluno dentro de uma mentoria
  createAlunoInMentoria: (data: {
    mentoriaId: string;
    email: string;
    password: string;
    nome: string;
    mentorId?: string;
  }) => callFunction("mentoriaUsuariosFunctions-createAlunoInMentoria", data),

  // Listar alunos de uma mentoria
  getAlunosInMentoria: (mentoriaId: string) =>
    callFunction("mentoriaUsuariosFunctions-getAlunosInMentoria", { mentoriaId }),

  // Atualizar aluno em uma mentoria
  updateAlunoInMentoria: (data: {
    mentoriaId: string;
    alunoId: string;
    nome?: string;
    email?: string;
    celular?: string;
    plano?: string;
    ativo?: boolean;
    mentorId?: string;
  }) => callFunction("mentoriaUsuariosFunctions-updateAlunoInMentoria", data),

  // Deletar aluno de uma mentoria
  deleteAlunoInMentoria: (mentoriaId: string, alunoId: string) =>
    callFunction("mentoriaUsuariosFunctions-deleteAlunoInMentoria", { mentoriaId, alunoId }),
};
