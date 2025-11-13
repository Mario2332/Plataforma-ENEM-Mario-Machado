import { useMentorView } from "@/pages/mentor/MentorViewAluno";
import { alunoApi, mentorApi } from "@/lib/api";

/**
 * Hook que retorna a API correta dependendo se está em modo mentor ou aluno
 */
export function useAlunoApi() {
  const mentorView = useMentorView();
  
  if (mentorView?.isMentorView && mentorView?.alunoId) {
    // Modo mentor: usar funções do mentor com alunoId
    return {
      // Estudos
      getEstudos: () => mentorApi.getAlunoData({ alunoId: mentorView.alunoId, collection: "estudos" }),
      createEstudo: (data: any) => mentorApi.createAlunoEstudo({ ...data, alunoId: mentorView.alunoId }),
      updateEstudo: (estudoId: string, data: any) => mentorApi.updateAlunoEstudo({ ...data, alunoId: mentorView.alunoId, estudoId }),
      deleteEstudo: (estudoId: string) => mentorApi.deleteAlunoEstudo({ alunoId: mentorView.alunoId, estudoId }),
      
      // Simulados
      getSimulados: () => mentorApi.getAlunoData({ alunoId: mentorView.alunoId, collection: "simulados" }),
      createSimulado: (data: any) => mentorApi.createAlunoSimulado({ ...data, alunoId: mentorView.alunoId }),
      updateSimulado: (data: any) => mentorApi.updateAlunoSimulado({ ...data, alunoId: mentorView.alunoId }),
      deleteSimulado: (simuladoId: string) => mentorApi.deleteAlunoSimulado({ alunoId: mentorView.alunoId, simuladoId }),
      
      // Métricas
      getMetricas: () => mentorApi.getAlunoData({ alunoId: mentorView.alunoId, collection: "metricas" }),
      
      // Cronograma
      getCronograma: () => mentorApi.getAlunoData({ alunoId: mentorView.alunoId, collection: "cronogramas" }),
      getTarefas: (cronogramaId: string) => {
        // Implementar se necessário
        return Promise.resolve([]);
      },
      
      // Horários
      getHorarios: () => mentorApi.getAlunoData({ alunoId: mentorView.alunoId, collection: "horarios" }),
      
      // Diário Emocional
      getDiarioEmocional: (data?: any) => mentorApi.getAlunoData({ alunoId: mentorView.alunoId, collection: "diario_emocional" }),
      
      // Autodiagnóstico
      getAutodiagnosticos: () => mentorApi.getAlunoData({ alunoId: mentorView.alunoId, collection: "autodiagnosticos" }),
      
      // Progresso (conteúdos ENEM)
      getProgresso: (materia?: string) => mentorApi.getAlunoData({ alunoId: mentorView.alunoId, collection: "progresso" }),
    };
  }
  
  // Modo aluno: usar API normal do aluno
  return alunoApi;
}
