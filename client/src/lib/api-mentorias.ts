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
};
