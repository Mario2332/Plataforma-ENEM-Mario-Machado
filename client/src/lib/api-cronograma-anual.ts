import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

/**
 * API para gerenciar cronograma anual
 */

export const cronogramaAnualApi = {
  /**
   * Obter cronograma anual (extensivo ou intensivo)
   * @param tipo - Tipo do cronograma ("extensive" ou "intensive")
   * @param alunoId - ID do aluno (opcional, para visualização do mentor)
   */
  getCronograma: async (tipo: "extensive" | "intensive", alunoId?: string | null) => {
    const getCronogramaAnual = httpsCallable(functions, "getCronogramaAnual");
    const result = await getCronogramaAnual({ tipo, alunoId: alunoId || undefined });
    return result.data as {
      cronograma: {
        cycles: Array<{
          cycle: number;
          subjects: Array<{
            name: string;
            topics: string[];
          }>;
        }>;
      };
      completedTopics: Record<string, boolean>;
      activeSchedule: string;
    };
  },

  /**
   * Marcar/desmarcar tópico como concluído
   * @param topicoId - ID do tópico
   * @param completed - Se o tópico está concluído
   * @param alunoId - ID do aluno (opcional, para edição do mentor)
   */
  toggleTopico: async (topicoId: string, completed: boolean, alunoId?: string | null) => {
    const toggleTopicoCompleto = httpsCallable(functions, "toggleTopicoCompleto");
    const result = await toggleTopicoCompleto({ topicoId, completed, alunoId: alunoId || undefined });
    return result.data as { success: boolean };
  },

  /**
   * Definir cronograma ativo
   * @param tipo - Tipo do cronograma ("extensive" ou "intensive")
   * @param alunoId - ID do aluno (opcional, para edição do mentor)
   */
  setActiveSchedule: async (tipo: "extensive" | "intensive", alunoId?: string | null) => {
    const setActiveSchedule = httpsCallable(functions, "setActiveSchedule");
    const result = await setActiveSchedule({ tipo, alunoId: alunoId || undefined });
    return result.data as { success: boolean };
  },
};
