/**
 * Hook para acesso ao Firestore com suporte automático à visualização do mentor
 * 
 * Este hook encapsula as funções do firestore-direct.ts e automaticamente
 * passa o ID correto do usuário (aluno logado ou aluno sendo visualizado pelo mentor).
 */

import { useMentorViewContext } from "@/contexts/MentorViewContext";
import * as firestoreDirect from "@/lib/firestore-direct";

export function useFirestoreDirect() {
  const { alunoId, isMentorView } = useMentorViewContext();
  
  // Obter o ID do usuário efetivo
  const effectiveUserId = isMentorView && alunoId ? alunoId : null;

  return {
    // Horários
    getHorarios: () => firestoreDirect.getHorariosDirect(effectiveUserId),
    createHorario: (horario: Parameters<typeof firestoreDirect.createHorarioDirect>[0]) => 
      firestoreDirect.createHorarioDirect(horario, effectiveUserId),
    updateHorario: (id: string, updates: Parameters<typeof firestoreDirect.updateHorarioDirect>[1]) => 
      firestoreDirect.updateHorarioDirect(id, updates, effectiveUserId),
    deleteHorario: (id: string) => firestoreDirect.deleteHorarioDirect(id, effectiveUserId),
    clearAllHorarios: () => firestoreDirect.clearAllHorariosDirect(effectiveUserId),
    saveHorariosBatch: (horarios: Parameters<typeof firestoreDirect.saveHorariosBatch>[0]) => 
      firestoreDirect.saveHorariosBatch(horarios, effectiveUserId),
    replaceAllHorarios: (horarios: Parameters<typeof firestoreDirect.replaceAllHorarios>[0]) => 
      firestoreDirect.replaceAllHorarios(horarios, effectiveUserId),

    // Templates
    getTemplates: () => firestoreDirect.getTemplatesDirect(effectiveUserId),
    saveTemplate: (template: Parameters<typeof firestoreDirect.saveTemplateDirect>[0]) => 
      firestoreDirect.saveTemplateDirect(template, effectiveUserId),
    loadTemplate: (id: string) => firestoreDirect.loadTemplateDirect(id, effectiveUserId),
    deleteTemplate: (id: string) => firestoreDirect.deleteTemplateDirect(id, effectiveUserId),

    // Estudos
    getEstudos: () => firestoreDirect.getEstudosDirect(effectiveUserId),
    createEstudo: (estudo: Parameters<typeof firestoreDirect.createEstudoDirect>[0]) => 
      firestoreDirect.createEstudoDirect(estudo, effectiveUserId),
    updateEstudo: (id: string, updates: Parameters<typeof firestoreDirect.updateEstudoDirect>[1]) => 
      firestoreDirect.updateEstudoDirect(id, updates, effectiveUserId),
    deleteEstudo: (id: string) => firestoreDirect.deleteEstudoDirect(id, effectiveUserId),

    // Simulados
    getSimulados: () => firestoreDirect.getSimuladosDirect(effectiveUserId),
    createSimulado: (simulado: Parameters<typeof firestoreDirect.createSimuladoDirect>[0]) => 
      firestoreDirect.createSimuladoDirect(simulado, effectiveUserId),
    updateSimulado: (id: string, updates: Parameters<typeof firestoreDirect.updateSimuladoDirect>[1]) => 
      firestoreDirect.updateSimuladoDirect(id, updates, effectiveUserId),
    deleteSimulado: (id: string) => firestoreDirect.deleteSimuladoDirect(id, effectiveUserId),

    // Metas
    getMetas: () => firestoreDirect.getMetasDirect(effectiveUserId),
    createMeta: (meta: Parameters<typeof firestoreDirect.createMetaDirect>[0]) => 
      firestoreDirect.createMetaDirect(meta, effectiveUserId),
    updateMeta: (id: string, updates: Parameters<typeof firestoreDirect.updateMetaDirect>[1]) => 
      firestoreDirect.updateMetaDirect(id, updates, effectiveUserId),
    deleteMeta: (id: string) => firestoreDirect.deleteMetaDirect(id, effectiveUserId),

    // Redações
    getRedacoes: () => firestoreDirect.getRedacoesDirect(effectiveUserId),
    createRedacao: (redacao: Parameters<typeof firestoreDirect.createRedacaoDirect>[0]) => 
      firestoreDirect.createRedacaoDirect(redacao, effectiveUserId),
    updateRedacao: (id: string, updates: Parameters<typeof firestoreDirect.updateRedacaoDirect>[1]) => 
      firestoreDirect.updateRedacaoDirect(id, updates, effectiveUserId),
    deleteRedacao: (id: string) => firestoreDirect.deleteRedacaoDirect(id, effectiveUserId),

    // Diário Emocional
    getDiarios: () => firestoreDirect.getDiariosDirect(effectiveUserId),
    createDiario: (entry: Parameters<typeof firestoreDirect.createDiarioDirect>[0]) => 
      firestoreDirect.createDiarioDirect(entry, effectiveUserId),
    updateDiario: (id: string, updates: Parameters<typeof firestoreDirect.updateDiarioDirect>[1]) => 
      firestoreDirect.updateDiarioDirect(id, updates, effectiveUserId),
    deleteDiario: (id: string) => firestoreDirect.deleteDiarioDirect(id, effectiveUserId),

    // Conteúdos Progresso
    getConteudosProgresso: () => firestoreDirect.getConteudosProgressoDirect(effectiveUserId),
    updateConteudoProgresso: (id: string, updates: Parameters<typeof firestoreDirect.updateConteudoProgressoDirect>[1]) => 
      firestoreDirect.updateConteudoProgressoDirect(id, updates, effectiveUserId),
    createConteudoProgresso: (progresso: Parameters<typeof firestoreDirect.createConteudoProgressoDirect>[0]) => 
      firestoreDirect.createConteudoProgressoDirect(progresso, effectiveUserId),

    // Planos de Ação
    getPlanosAcao: () => firestoreDirect.getPlanosAcaoDirect(effectiveUserId),
    createPlanoAcao: (plano: Parameters<typeof firestoreDirect.createPlanoAcaoDirect>[0]) => 
      firestoreDirect.createPlanoAcaoDirect(plano, effectiveUserId),
    updatePlanoAcao: (id: string, updates: Parameters<typeof firestoreDirect.updatePlanoAcaoDirect>[1]) => 
      firestoreDirect.updatePlanoAcaoDirect(id, updates, effectiveUserId),
    deletePlanoAcao: (id: string) => firestoreDirect.deletePlanoAcaoDirect(id, effectiveUserId),

    // Autodiagnósticos
    getAutodiagnosticos: () => firestoreDirect.getAutodiagnosticosDirect(effectiveUserId),
    createAutodiagnostico: (autodiag: Parameters<typeof firestoreDirect.createAutodiagnosticoDirect>[0]) => 
      firestoreDirect.createAutodiagnosticoDirect(autodiag, effectiveUserId),
    deleteAutodiagnostico: (id: string) => firestoreDirect.deleteAutodiagnosticoDirect(id, effectiveUserId),

    // ID do usuário efetivo (para uso direto quando necessário)
    effectiveUserId,
    isMentorView,
  };
}
