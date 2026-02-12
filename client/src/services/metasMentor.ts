import { db } from "@/lib/firebase";
import { collection, doc, getDoc, setDoc, Timestamp, query, where, getDocs } from "firebase/firestore";

export interface MetaMentor {
  id?: string;
  alunoId: string;
  tempoMedioDiario: {
    horas: number;
    minutos: number;
  };
  criadoEm: Date;
  atualizadoEm: Date;
  criadoPor: string; // ID do mentor
}

/**
 * Buscar meta do mentor para um aluno específico
 */
export async function getMetaMentor(alunoId: string): Promise<MetaMentor | null> {
  try {
    const metaRef = doc(db, "metas_mentor", alunoId);
    const metaSnap = await getDoc(metaRef);
    
    if (!metaSnap.exists()) {
      return null;
    }
    
    const data = metaSnap.data();
    return {
      id: metaSnap.id,
      alunoId,
      tempoMedioDiario: data.tempoMedioDiario,
      criadoEm: data.criadoEm?.toDate() || new Date(),
      atualizadoEm: data.atualizadoEm?.toDate() || new Date(),
      criadoPor: data.criadoPor,
    };
  } catch (error) {
    console.error("Erro ao buscar meta do mentor:", error);
    return null;
  }
}

/**
 * Salvar ou atualizar meta do mentor para um aluno
 */
export async function salvarMetaMentor(
  alunoId: string,
  tempoMedioDiario: { horas: number; minutos: number },
  mentorId: string
): Promise<void> {
  try {
    console.log("[metasMentor] Salvando meta:", { alunoId, tempoMedioDiario, mentorId });
    
    const metaRef = doc(db, "metas_mentor", alunoId);
    const metaExistente = await getDoc(metaRef);
    
    const metaData = {
      alunoId,
      tempoMedioDiario,
      atualizadoEm: Timestamp.now(),
      criadoPor: mentorId,
    };
    
    if (metaExistente.exists()) {
      console.log("[metasMentor] Atualizando meta existente");
      await setDoc(metaRef, metaData, { merge: true });
    } else {
      console.log("[metasMentor] Criando nova meta");
      await setDoc(metaRef, {
        ...metaData,
        criadoEm: Timestamp.now(),
      });
    }
    
    console.log("[metasMentor] Meta salva com sucesso");
  } catch (error: any) {
    console.error("[metasMentor] Erro ao salvar meta:", error);
    console.error("[metasMentor] Detalhes do erro:", {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // Lançar erro com mensagem mais descritiva
    if (error.code === 'permission-denied') {
      throw new Error("Permissão negada. Verifique as regras do Firestore.");
    } else {
      throw new Error(`Erro ao salvar meta: ${error.message}`);
    }
  }
}

/**
 * Verificar se aluno atingiu a meta na semana anterior
 */
export async function verificarMetaNaoAtingida(alunoId: string): Promise<boolean> {
  try {
    // Buscar meta do mentor
    const meta = await getMetaMentor(alunoId);
    if (!meta) return false;
    
    // Calcular tempo total da meta em minutos
    const metaTotalMinutos = meta.tempoMedioDiario.horas * 60 + meta.tempoMedioDiario.minutos;
    
    // Calcular período da semana anterior (domingo a sábado)
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    // Encontrar o domingo da semana atual
    const diaDaSemana = hoje.getDay(); // 0 = domingo, 1 = segunda, etc.
    const domingoAtual = new Date(hoje);
    domingoAtual.setDate(hoje.getDate() - diaDaSemana);
    
    // Semana anterior: domingo a sábado
    const domingoAnterior = new Date(domingoAtual);
    domingoAnterior.setDate(domingoAtual.getDate() - 7);
    
    const sabadoAnterior = new Date(domingoAnterior);
    sabadoAnterior.setDate(domingoAnterior.getDate() + 6);
    sabadoAnterior.setHours(23, 59, 59, 999);
    
    // Buscar sessões de estudo da semana anterior
    const sessoesRef = collection(db, "estudos");
    const q = query(
      sessoesRef,
      where("userId", "==", alunoId),
      where("data", ">=", Timestamp.fromDate(domingoAnterior)),
      where("data", "<=", Timestamp.fromDate(sabadoAnterior))
    );
    
    const sessoesSnap = await getDocs(q);
    
    // Calcular tempo total de estudos na semana
    let tempoTotalMinutos = 0;
    sessoesSnap.forEach((doc) => {
      const data = doc.data();
      tempoTotalMinutos += data.tempoEstudo || 0;
    });
    
    // Calcular média diária (7 dias)
    const mediaDiariaMinutos = tempoTotalMinutos / 7;
    
    // Verificar se a média ficou abaixo da meta
    return mediaDiariaMinutos < metaTotalMinutos;
  } catch (error) {
    console.error("Erro ao verificar meta não atingida:", error);
    return false;
  }
}

/**
 * Buscar todas as metas não atingidas para múltiplos alunos
 */
export async function getMetasNaoAtingidas(alunosIds: string[]): Promise<Record<string, boolean>> {
  const resultado: Record<string, boolean> = {};
  
  await Promise.all(
    alunosIds.map(async (alunoId) => {
      resultado[alunoId] = await verificarMetaNaoAtingida(alunoId);
    })
  );
  
  return resultado;
}

/**
 * Formatar tempo para exibição (ex: "2h 30min")
 */
export function formatarTempo(horas: number, minutos: number): string {
  const partes: string[] = [];
  
  if (horas > 0) {
    partes.push(`${horas}h`);
  }
  
  if (minutos > 0) {
    partes.push(`${minutos}min`);
  }
  
  return partes.length > 0 ? partes.join(" ") : "0min";
}
