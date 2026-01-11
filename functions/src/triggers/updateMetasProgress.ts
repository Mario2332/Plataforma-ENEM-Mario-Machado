import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
// BACKUP: Sistema de notificações removido temporariamente - ver pasta backup_notificacoes
// import { verificarECriarNotificacoesMeta } from "../helpers/metaNotificacoes";

const db = admin.firestore();

/**
 * Helper para obter a data de hoje no fuso horário de Brasília
 */
function getHojeBrasiliaStr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

/**
 * Helper para converter uma data para string no fuso de Brasília
 */
function toDateStrBrasilia(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

/**
 * Helper para verificar se uma data está dentro de um período (inclusive) no fuso de Brasília
 */
function isDateInRangeBrasilia(date: Date, inicio: Date, fim: Date): boolean {
  const d = toDateStrBrasilia(date);
  const i = toDateStrBrasilia(inicio);
  const f = toDateStrBrasilia(fim);
  return d >= i && d <= f;
}

/**
 * Trigger: Atualizar progresso de metas quando um estudo é criado/atualizado
 */
export const onEstudoWrite = functions
  .region("southamerica-east1")
  .firestore.document("alunos/{alunoId}/estudos/{estudoId}")
  .onWrite(async (change, context) => {
    const alunoId = context.params.alunoId;

    try {
      console.log(`[onEstudoWrite] Iniciando processamento para aluno ${alunoId}`);
      
      // Buscar todas as metas ativas do aluno
      const metasSnapshot = await db
        .collection("alunos")
        .doc(alunoId)
        .collection("metas")
        .where("status", "==", "ativa")
        .get();

      if (metasSnapshot.empty) {
        console.log(`[onEstudoWrite] Nenhuma meta ativa encontrada para aluno ${alunoId}`);
        return null;
      }
      
      // Filtrar metas:
      // - Excluir metas "pai" (repetirDiariamente=true sem metaPaiId)
      // - Para instâncias diárias, manter apenas as de hoje
      // Usar fuso horário de Brasília
      const hojeStr = getHojeBrasiliaStr();
      console.log(`[onEstudoWrite] Hoje (Brasília): ${hojeStr}`);
      console.log(`[onEstudoWrite] Total de metas ativas: ${metasSnapshot.docs.length}`);
      
      const metasValidas = metasSnapshot.docs.filter((doc) => {
        const meta = doc.data();
        
        // Excluir metas "pai" (templates)
        if (meta.repetirDiariamente && !meta.metaPaiId) {
          console.log(`[onEstudoWrite] Excluindo meta-pai: ${meta.nome}`);
          return false;
        }
        
        // Se for instância diária, verificar se é de hoje
        if (meta.metaPaiId && meta.dataReferencia) {
          const dataRef = meta.dataReferencia.toDate();
          const dataRefStr = toDateStrBrasilia(dataRef);
          console.log(`[onEstudoWrite] Instância diária: ${meta.nome}, dataRef: ${dataRefStr}, hoje: ${hojeStr}, match: ${dataRefStr === hojeStr}`);
          return dataRefStr === hojeStr;
        }
        
        console.log(`[onEstudoWrite] Meta normal: ${meta.nome}, tipo: ${meta.tipo}`);
        return true;
      });
      
      console.log(`[onEstudoWrite] Metas válidas após filtro: ${metasValidas.length}`);

      // Buscar todos os estudos do aluno
      const estudosSnapshot = await db
        .collection("alunos")
        .doc(alunoId)
        .collection("estudos")
        .get();

      const estudos = estudosSnapshot.docs.map((doc) => doc.data());
      console.log(`[onEstudoWrite] Total de estudos do aluno: ${estudos.length}`);

      const batch = db.batch();
      const now = admin.firestore.Timestamp.now();

      for (const metaDoc of metasValidas) {
        const meta = metaDoc.data();
        let valorAtual = 0;

        console.log(`[onEstudoWrite] Processando meta: ${meta.nome}, tipo: ${meta.tipo}`);

        // Calcular progresso baseado no tipo de meta
        switch (meta.tipo) {
          case 'horas': {
            // Para metas diárias, contar apenas estudos de hoje
            // Para metas normais, contar todo o período
            const dataInicio = meta.dataInicio.toDate();
            const dataFim = meta.dataFim.toDate();
            
            // Para metas diárias, usar a data de referência
            const dataRefStr = meta.metaPaiId && meta.dataReferencia 
              ? toDateStrBrasilia(meta.dataReferencia.toDate())
              : null;
            
            console.log(`[onEstudoWrite] Meta horas: dataRefStr=${dataRefStr}, dataInicio=${toDateStrBrasilia(dataInicio)}, dataFim=${toDateStrBrasilia(dataFim)}`);
            
            const estudosFiltrados = estudos.filter((e: any) => {
              const dataEstudo = e.data.toDate();
              const dataEstudoStr = toDateStrBrasilia(dataEstudo);
              
              if (dataRefStr) {
                // Meta diária: apenas estudos do dia de referência
                const match = dataEstudoStr === dataRefStr;
                console.log(`[onEstudoWrite] Estudo: data=${dataEstudoStr}, dataRef=${dataRefStr}, match=${match}, tempoMinutos=${e.tempoMinutos}`);
                return match;
              } else {
                // Meta normal: período completo
                return isDateInRangeBrasilia(dataEstudo, dataInicio, dataFim);
              }
            });
            
            console.log(`[onEstudoWrite] Estudos filtrados para meta horas: ${estudosFiltrados.length}`);
            
            valorAtual = estudosFiltrados.reduce((acc: number, e: any) => acc + (e.tempoMinutos || 0), 0) / 60;
            
            valorAtual = Math.round(valorAtual * 10) / 10; // Arredondar para 1 casa decimal
            console.log(`[onEstudoWrite] Valor calculado para meta horas: ${valorAtual}`);
            break;
          }

          case 'questoes': {
            // Para metas diárias, contar apenas questões de hoje
            // Para metas normais, contar todo o período
            const dataInicio = meta.dataInicio.toDate();
            const dataFim = meta.dataFim.toDate();
            
            // Para metas diárias, usar a data de referência
            const dataRefStr = meta.metaPaiId && meta.dataReferencia 
              ? toDateStrBrasilia(meta.dataReferencia.toDate())
              : null;
            
            valorAtual = estudos
              .filter((e: any) => {
                const dataEstudo = e.data.toDate();
                
                let matchPeriodo: boolean;
                if (dataRefStr) {
                  // Meta diária: apenas estudos do dia de referência
                  matchPeriodo = toDateStrBrasilia(dataEstudo) === dataRefStr;
                } else {
                  // Meta normal: período completo
                  matchPeriodo = isDateInRangeBrasilia(dataEstudo, dataInicio, dataFim);
                }
                
                const matchMateria = !meta.materia || e.materia === meta.materia;
                return matchPeriodo && matchMateria;
              })
              .reduce((acc: number, e: any) => acc + (e.questoesFeitas || 0), 0);
            break;
          }

          case 'sequencia': {
            // Calcular dias consecutivos de estudo
            // Usar fuso horário de Brasília
            const datasEstudo = [...new Set(estudos.map((e: any) => {
              const data = e.data.toDate();
              return toDateStrBrasilia(data);
            }))].sort().reverse();

            let streak = 0;
            const hoje = getHojeBrasiliaStr();
            
            if (datasEstudo.length > 0) {
              let dataAtualStr = hoje;
              
              for (const dataStr of datasEstudo) {
                // Calcular diferença em dias usando strings de data
                const dataAtualDate = new Date(dataAtualStr + 'T12:00:00Z');
                const dataEstudoDate = new Date(dataStr + 'T12:00:00Z');
                const diffDias = Math.round((dataAtualDate.getTime() - dataEstudoDate.getTime()) / (1000 * 60 * 60 * 24));
                
                if (diffDias === 0 || diffDias === 1) {
                  streak++;
                  dataAtualStr = dataStr;
                } else {
                  break;
                }
              }
            }
            
            valorAtual = streak;
            break;
          }

          default:
            // Outros tipos de meta não são atualizados por estudos
            continue;
        }

        // Atualizar meta
        const updateData: any = {
          valorAtual,
          updatedAt: now,
        };

        // BACKUP: Sistema de notificações removido temporariamente - ver pasta backup_notificacoes
        // Verificar e criar notificações
        // const notifResult = await verificarECriarNotificacoesMeta(
        //   alunoId,
        //   metaDoc.id,
        //   meta.nome,
        //   meta.status,
        //   meta.valorAtual || 0,
        //   valorAtual,
        //   meta.valorAlvo,
        //   'updateMetasProgress'
        // );
        
        // Verificar se meta foi concluída (sem notificação)
        if (valorAtual >= meta.valorAlvo && meta.status === 'ativa') {
          updateData.status = 'concluida';
          updateData.dataConclusao = now;
          console.log(`[onEstudoWrite] Meta ${meta.nome} concluída!`);
        }

        console.log(`[onEstudoWrite] Atualizando meta ${meta.nome}: valorAtual=${valorAtual}, valorAlvo=${meta.valorAlvo}`);
        batch.update(metaDoc.ref, updateData);
      }

      await batch.commit();
      console.log(`[onEstudoWrite] Batch commit realizado com sucesso`);
      functions.logger.info(`Progresso de metas atualizado para aluno ${alunoId}`);
      
      return null;
    } catch (error: any) {
      functions.logger.error("Erro ao atualizar progresso de metas:", error);
      return null;
    }
  });

/**
 * Trigger: Atualizar progresso de metas quando um simulado é criado/atualizado
 */
export const onSimuladoWrite = functions
  .region("southamerica-east1")
  .firestore.document("alunos/{alunoId}/simulados/{simuladoId}")
  .onWrite(async (change, context) => {
    const alunoId = context.params.alunoId;

    try {
      // Buscar todas as metas ativas do aluno
      const metasSnapshot = await db
        .collection("alunos")
        .doc(alunoId)
        .collection("metas")
        .where("status", "==", "ativa")
        .get();

      if (metasSnapshot.empty) {
        return null;
      }
      
      // Filtrar metas:
      // - Excluir metas "pai" (repetirDiariamente=true sem metaPaiId)
      // - Para instâncias diárias, manter apenas as de hoje
      const hojeStr = getHojeBrasiliaStr();
      
      const metasValidas = metasSnapshot.docs.filter((doc) => {
        const meta = doc.data();
        
        // Excluir metas "pai" (templates)
        if (meta.repetirDiariamente && !meta.metaPaiId) {
          return false;
        }
        
        // Se for instância diária, verificar se é de hoje
        if (meta.metaPaiId && meta.dataReferencia) {
          const dataRef = meta.dataReferencia.toDate();
          const dataRefStr = toDateStrBrasilia(dataRef);
          return dataRefStr === hojeStr;
        }
        
        return true;
      });

      // Buscar todos os simulados do aluno
      const simuladosSnapshot = await db
        .collection("alunos")
        .doc(alunoId)
        .collection("simulados")
        .get();

      const simulados = simuladosSnapshot.docs.map((doc) => doc.data());

      const batch = db.batch();
      const now = admin.firestore.Timestamp.now();

      for (const metaDoc of metasValidas) {
        const meta = metaDoc.data();
        let valorAtual = 0;

        // Calcular progresso baseado no tipo de meta
        switch (meta.tipo) {
          case 'simulados': {
            // Contar simulados no período da meta
            const dataInicio = meta.dataInicio.toDate();
            const dataFim = meta.dataFim.toDate();
            
            // Para metas diárias, usar a data de referência
            const dataRefStr = meta.metaPaiId && meta.dataReferencia 
              ? toDateStrBrasilia(meta.dataReferencia.toDate())
              : null;
            
            valorAtual = simulados.filter((s: any) => {
              const dataSimulado = s.data.toDate();
              
              if (dataRefStr) {
                // Meta diária: apenas simulados do dia de referência
                return toDateStrBrasilia(dataSimulado) === dataRefStr;
              } else {
                // Meta normal: período completo com fuso de Brasília
                return isDateInRangeBrasilia(dataSimulado, dataInicio, dataFim);
              }
            }).length;
            break;
          }

          case 'desempenho': {
            // Somar acertos em simulados no período da meta
            const dataInicio = meta.dataInicio.toDate();
            const dataFim = meta.dataFim.toDate();
            
            // Para metas diárias, usar a data de referência
            const dataRefStrDesemp = meta.metaPaiId && meta.dataReferencia 
              ? toDateStrBrasilia(meta.dataReferencia.toDate())
              : null;
            
            valorAtual = simulados
              .filter((s: any) => {
                const dataSimulado = s.data.toDate();
                
                if (dataRefStrDesemp) {
                  // Meta diária: apenas simulados do dia de referência
                  return toDateStrBrasilia(dataSimulado) === dataRefStrDesemp;
                } else {
                  // Meta normal: período completo com fuso de Brasília
                  return isDateInRangeBrasilia(dataSimulado, dataInicio, dataFim);
                }
              })
              .reduce((acc: number, s: any) => {
                let acertos = 0;
                
                if (meta.materia) {
                  // Filtrar por matéria específica
                  switch (meta.materia) {
                    case 'Matemática':
                      acertos = s.matematicaAcertos || 0;
                      break;
                    case 'Linguagens':
                      acertos = s.linguagensAcertos || 0;
                      break;
                    case 'Ciências Humanas':
                    case 'História':
                    case 'Geografia':
                    case 'Filosofia':
                    case 'Sociologia':
                      acertos = s.humanasAcertos || 0;
                      break;
                    case 'Ciências da Natureza':
                    case 'Biologia':
                    case 'Física':
                    case 'Química':
                      acertos = s.naturezaAcertos || 0;
                      break;
                  }
                } else {
                  // Somar todos os acertos
                  acertos = (s.matematicaAcertos || 0) +
                           (s.linguagensAcertos || 0) +
                           (s.humanasAcertos || 0) +
                           (s.naturezaAcertos || 0);
                }
                
                return acc + acertos;
              }, 0);
            break;
          }

          default:
            // Outros tipos de meta não são atualizados por simulados
            continue;
        }

        // Atualizar meta
        const updateData: any = {
          valorAtual,
          updatedAt: now,
        };

        // BACKUP: Sistema de notificações removido temporariamente - ver pasta backup_notificacoes
        // Verificar e criar notificações
        // const notifResult = await verificarECriarNotificacoesMeta(
        //   alunoId,
        //   metaDoc.id,
        //   meta.nome,
        //   meta.status,
        //   meta.valorAtual || 0,
        //   valorAtual,
        //   meta.valorAlvo,
        //   'updateMetasProgress'
        // );
        
        // Verificar se meta foi concluída (sem notificação)
        if (valorAtual >= meta.valorAlvo && meta.status === 'ativa') {
          updateData.status = 'concluida';
          updateData.dataConclusao = now;
        }

        batch.update(metaDoc.ref, updateData);
      }

      await batch.commit();
      functions.logger.info(`Progresso de metas (simulados) atualizado para aluno ${alunoId}`);
      
      return null;
    } catch (error: any) {
      functions.logger.error("Erro ao atualizar progresso de metas (simulados):", error);
      return null;
    }
  });

/**
 * Trigger: Atualizar progresso de metas quando progresso de conteúdo é atualizado
 */
export const onConteudoProgressoWrite = functions
  .region("southamerica-east1")
  .firestore.document("alunos/{alunoId}/conteudos_progresso/{progressoId}")
  .onWrite(async (change, context) => {
    const alunoId = context.params.alunoId;

    try {
      // Buscar todas as metas ativas do aluno do tipo 'topicos'
      const metasSnapshot = await db
        .collection("alunos")
        .doc(alunoId)
        .collection("metas")
        .where("status", "==", "ativa")
        .where("tipo", "==", "topicos")
        .get();

      if (metasSnapshot.empty) {
        return null;
      }
      
      // Filtrar metas:
      // - Excluir metas "pai" (repetirDiariamente=true sem metaPaiId)
      // - Para instâncias diárias, manter apenas as de hoje
      const hojeStr = getHojeBrasiliaStr();
      
      const metasValidas = metasSnapshot.docs.filter((doc) => {
        const meta = doc.data();
        
        // Excluir metas "pai" (templates)
        if (meta.repetirDiariamente && !meta.metaPaiId) {
          return false;
        }
        
        // Se for instância diária, verificar se é de hoje
        if (meta.metaPaiId && meta.dataReferencia) {
          const dataRef = meta.dataReferencia.toDate();
          const dataRefStr = toDateStrBrasilia(dataRef);
          return dataRefStr === hojeStr;
        }
        
        return true;
      });

      // Buscar progresso de todos os conteúdos do aluno
      const progressoSnapshot = await db
        .collection("alunos")
        .doc(alunoId)
        .collection("conteudos_progresso")
        .where("concluido", "==", true)
        .get();

      const batch = db.batch();
      const now = admin.firestore.Timestamp.now();

      for (const metaDoc of metasValidas) {
        const meta = metaDoc.data();
        
        // Contar tópicos concluídos no período da meta
        const dataInicio = meta.dataInicio.toDate();
        const dataFim = meta.dataFim.toDate();
        
        // Para metas diárias, usar a data de referência
        const dataRefStrTopicos = meta.metaPaiId && meta.dataReferencia 
          ? toDateStrBrasilia(meta.dataReferencia.toDate())
          : null;
        
        const valorAtual = progressoSnapshot.docs.filter((doc) => {
          const data = doc.data();
          // Usar dataConclusao se existir, senão usar updatedAt ou createdAt
          const dataConclusao = data.dataConclusao?.toDate() || data.updatedAt?.toDate() || data.createdAt?.toDate();
          
          if (!dataConclusao) return false;
          
          let matchPeriodo: boolean;
          if (dataRefStrTopicos) {
            // Meta diária: apenas tópicos concluídos no dia de referência
            matchPeriodo = toDateStrBrasilia(dataConclusao) === dataRefStrTopicos;
          } else {
            // Meta normal: período completo com fuso de Brasília
            matchPeriodo = isDateInRangeBrasilia(dataConclusao, dataInicio, dataFim);
          }
          
          // Filtrar por incidencia apenas se a meta especificar E o progresso tiver incidencia
          // (para não excluir tópicos do cronograma anual que não têm incidencia)
          const matchIncidencia = !meta.incidencia || !data.incidencia || data.incidencia === meta.incidencia;
          
          return matchPeriodo && matchIncidencia;
        }).length;

        // Atualizar meta
        const updateData: any = {
          valorAtual,
          updatedAt: now,
        };

        // BACKUP: Sistema de notificações removido temporariamente - ver pasta backup_notificacoes
        // Verificar e criar notificações
        // const notifResult = await verificarECriarNotificacoesMeta(
        //   alunoId,
        //   metaDoc.id,
        //   meta.nome,
        //   meta.status,
        //   meta.valorAtual || 0,
        //   valorAtual,
        //   meta.valorAlvo,
        //   'updateMetasProgress'
        // );
        
        // Verificar se meta foi concluída (sem notificação)
        if (valorAtual >= meta.valorAlvo && meta.status === 'ativa') {
          updateData.status = 'concluida';
          updateData.dataConclusao = now;
        }

        batch.update(metaDoc.ref, updateData);
      }

      await batch.commit();
      functions.logger.info(`Progresso de metas (tópicos) atualizado para aluno ${alunoId}`);
      
      return null;
    } catch (error: any) {
      functions.logger.error("Erro ao atualizar progresso de metas (tópicos):", error);
      return null;
    }
  });
