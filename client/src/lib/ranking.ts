/**
 * Sistema de Ranking e Gamificação
 * 
 * Este módulo gerencia o cálculo de pontuação semanal e o ranking dos alunos.
 * 
 * Sistema de Pontuação:
 * - Tempo de estudo: 10 pts/hora (máx. 100 pts/dia)
 * - Questões acertadas: 2 pts cada
 * - Questões erradas: 1 pt cada
 * - Acertos em simulados: 4 pts cada
 * - Redação enviada: 100 pts base + 10 pts a cada 100 pts da nota
 * - Diário de bordo: 50 pts (máx. 50 pts/dia)
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc,
  updateDoc,
  query, 
  orderBy,
  where,
  Timestamp
} from "firebase/firestore";
import { db, auth } from "./firebase";

// Constantes de pontuação
export const PONTOS = {
  TEMPO_ESTUDO_POR_HORA: 10,
  TEMPO_ESTUDO_MAX_DIA: 100, // 10 horas
  QUESTAO_ACERTADA: 2,
  QUESTAO_ERRADA: 1,
  SIMULADO_ACERTO: 4,
  REDACAO_BASE: 100,
  REDACAO_POR_100_PONTOS: 10,
  DIARIO_BORDO: 50,
  DIARIO_BORDO_MAX_DIA: 50,
};

// Níveis do ranking
export const NIVEIS = [
  { id: 1, nome: "Vestibulando Bronze" },
  { id: 2, nome: "Vestibulando Prata" },
  { id: 3, nome: "Vestibulando Ouro" },
  { id: 4, nome: "Vestibulando Diamante" },
  { id: 5, nome: "Vestibulando Elite" },
  { id: 6, nome: "Futuro Calouro" },
];

/**
 * Obter início e fim da semana atual (domingo a domingo)
 */
export function getSemanaAtual(): { inicio: Date; fim: Date } {
  const agora = new Date();
  const diaSemana = agora.getDay(); // 0 = domingo
  
  // Início da semana (domingo anterior ou hoje se for domingo)
  const inicio = new Date(agora);
  inicio.setDate(agora.getDate() - diaSemana);
  inicio.setHours(12, 0, 0, 0); // Meio-dia de domingo
  
  // Se ainda não passou do meio-dia de domingo, usar semana anterior
  if (diaSemana === 0 && agora.getHours() < 12) {
    inicio.setDate(inicio.getDate() - 7);
  }
  
  // Fim da semana (próximo domingo ao meio-dia)
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 7);
  
  return { inicio, fim };
}

/**
 * Calcular pontos de tempo de estudo
 * Considera o limite diário de 100 pontos (10 horas)
 */
function calcularPontosTempoEstudo(estudos: any[]): number {
  // Agrupar estudos por dia
  const estudosPorDia: { [key: string]: number } = {};
  
  estudos.forEach(estudo => {
    const data = estudo.data?.toDate?.() || new Date(estudo.data);
    const diaKey = data.toISOString().split('T')[0];
    const minutos = estudo.tempoMinutos || 0;
    
    if (!estudosPorDia[diaKey]) {
      estudosPorDia[diaKey] = 0;
    }
    estudosPorDia[diaKey] += minutos;
  });
  
  // Calcular pontos com limite diário
  let totalPontos = 0;
  Object.values(estudosPorDia).forEach(minutosDia => {
    const horasDia = minutosDia / 60;
    const pontosDia = Math.min(
      horasDia * PONTOS.TEMPO_ESTUDO_POR_HORA,
      PONTOS.TEMPO_ESTUDO_MAX_DIA
    );
    totalPontos += pontosDia;
  });
  
  return Math.round(totalPontos);
}

/**
 * Calcular pontos de questões (sessões de estudo)
 * Questões acertadas: 2 pts, erradas: 1 pt
 */
function calcularPontosQuestoes(estudos: any[]): number {
  let totalPontos = 0;
  
  estudos.forEach(estudo => {
    const feitas = estudo.questoesFeitas || 0;
    const acertadas = estudo.questoesAcertadas || 0;
    const erradas = feitas - acertadas;
    
    totalPontos += acertadas * PONTOS.QUESTAO_ACERTADA;
    totalPontos += Math.max(0, erradas) * PONTOS.QUESTAO_ERRADA;
  });
  
  return totalPontos;
}

/**
 * Calcular pontos de simulados
 * 4 pontos por acerto
 */
function calcularPontosSimulados(simulados: any[]): number {
  let totalPontos = 0;
  
  simulados.forEach(simulado => {
    const acertos = 
      (simulado.linguagensAcertos || 0) +
      (simulado.humanasAcertos || 0) +
      (simulado.naturezaAcertos || 0) +
      (simulado.matematicaAcertos || 0);
    
    totalPontos += acertos * PONTOS.SIMULADO_ACERTO;
  });
  
  return totalPontos;
}

/**
 * Calcular pontos de redações
 * 100 pts base + 10 pts a cada 100 pontos da nota
 */
function calcularPontosRedacoes(redacoes: any[]): number {
  let totalPontos = 0;
  
  redacoes.forEach(redacao => {
    // Pontos base por enviar redação
    totalPontos += PONTOS.REDACAO_BASE;
    
    // Pontos pela nota
    const nota = redacao.notaTotal || 0;
    const bonusNota = Math.floor(nota / 100) * PONTOS.REDACAO_POR_100_PONTOS;
    totalPontos += bonusNota;
  });
  
  return totalPontos;
}

/**
 * Calcular pontos do diário de bordo
 * 50 pts por dia preenchido (máx. 50 pts/dia)
 */
function calcularPontosDiario(diarios: any[]): number {
  // Agrupar por dia para aplicar limite
  const diasPreenchidos = new Set<string>();
  
  diarios.forEach(diario => {
    const data = diario.data?.toDate?.() || diario.criadoEm?.toDate?.() || new Date(diario.data || diario.criadoEm);
    const diaKey = data.toISOString().split('T')[0];
    diasPreenchidos.add(diaKey);
  });
  
  return diasPreenchidos.size * PONTOS.DIARIO_BORDO;
}

/**
 * Calcular pontuação semanal total do aluno
 */
export async function calcularPontuacaoSemanal(): Promise<{
  total: number;
  detalhes: {
    tempoEstudo: number;
    questoes: number;
    simulados: number;
    redacoes: number;
    diario: number;
  };
}> {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");
  
  const { inicio, fim } = getSemanaAtual();
  const inicioTimestamp = Timestamp.fromDate(inicio);
  const fimTimestamp = Timestamp.fromDate(fim);
  
  // Buscar dados da semana
  const [estudos, simulados, redacoes, diarios] = await Promise.all([
    buscarDadosSemana(userId, "estudos", inicioTimestamp, fimTimestamp),
    buscarDadosSemana(userId, "simulados", inicioTimestamp, fimTimestamp),
    buscarDadosSemana(userId, "redacoes", inicioTimestamp, fimTimestamp),
    buscarDadosSemana(userId, "diario_emocional", inicioTimestamp, fimTimestamp),
  ]);
  
  // Calcular pontos por categoria
  const pontosTempoEstudo = calcularPontosTempoEstudo(estudos);
  const pontosQuestoes = calcularPontosQuestoes(estudos);
  const pontosSimulados = calcularPontosSimulados(simulados);
  const pontosRedacoes = calcularPontosRedacoes(redacoes);
  const pontosDiario = calcularPontosDiario(diarios);
  
  const total = pontosTempoEstudo + pontosQuestoes + pontosSimulados + pontosRedacoes + pontosDiario;
  
  return {
    total,
    detalhes: {
      tempoEstudo: pontosTempoEstudo,
      questoes: pontosQuestoes,
      simulados: pontosSimulados,
      redacoes: pontosRedacoes,
      diario: pontosDiario,
    },
  };
}

/**
 * Buscar dados de uma coleção dentro do período da semana
 */
async function buscarDadosSemana(
  userId: string, 
  colecao: string, 
  inicio: Timestamp, 
  fim: Timestamp
): Promise<any[]> {
  try {
    const ref = collection(db, "alunos", userId, colecao);
    const snapshot = await getDocs(ref);
    
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(item => {
        // Verificar se está dentro do período
        const data = item.data?.toDate?.() || item.criadoEm?.toDate?.() || null;
        if (!data) return false;
        return data >= inicio.toDate() && data < fim.toDate();
      });
  } catch (error) {
    console.error(`Erro ao buscar ${colecao}:`, error);
    return [];
  }
}

/**
 * Atualizar pontuação do aluno no ranking
 */
export async function atualizarPontuacaoRanking(): Promise<void> {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");
  
  const { total } = await calcularPontuacaoSemanal();
  
  const rankingRef = doc(db, "ranking", userId);
  const rankingSnap = await getDoc(rankingRef);
  
  if (rankingSnap.exists()) {
    await updateDoc(rankingRef, {
      pontosSemanais: total,
      ultimaAtualizacao: Timestamp.now(),
    });
  } else {
    // Criar registro inicial no ranking
    await setDoc(rankingRef, {
      nivel: 1, // Começa no nível Bronze
      pontosSemanais: total,
      ultimaAtualizacao: Timestamp.now(),
      criadoEm: Timestamp.now(),
    });
  }
}

/**
 * Obter dados do ranking do aluno atual
 */
export async function getRankingAluno(): Promise<{
  nivel: number;
  pontosSemanais: number;
  posicao: number;
  totalNivel: number;
} | null> {
  const userId = auth.currentUser?.uid;
  if (!userId) return null;
  
  try {
    const rankingRef = doc(db, "ranking", userId);
    const rankingSnap = await getDoc(rankingRef);
    
    if (!rankingSnap.exists()) {
      // Criar registro inicial
      await setDoc(rankingRef, {
        nivel: 1,
        pontosSemanais: 0,
        ultimaAtualizacao: Timestamp.now(),
        criadoEm: Timestamp.now(),
      });
      
      return {
        nivel: 1,
        pontosSemanais: 0,
        posicao: 1,
        totalNivel: 1,
      };
    }
    
    const data = rankingSnap.data();
    const nivel = data.nivel || 1;
    const pontosSemanais = data.pontosSemanais || 0;
    
    // Calcular posição no nível
    const rankingCollectionRef = collection(db, "ranking");
    const q = query(rankingCollectionRef, orderBy("pontosSemanais", "desc"));
    const snapshot = await getDocs(q);
    
    let posicao = 1;
    let totalNivel = 0;
    
    snapshot.docs.forEach((docSnap) => {
      const docData = docSnap.data();
      if (docData.nivel === nivel) {
        totalNivel++;
        if (docSnap.id !== userId && docData.pontosSemanais > pontosSemanais) {
          posicao++;
        }
      }
    });
    
    return {
      nivel,
      pontosSemanais,
      posicao,
      totalNivel: Math.max(totalNivel, 1),
    };
  } catch (error) {
    console.error("Erro ao obter ranking do aluno:", error);
    return null;
  }
}

/**
 * Obter ranking completo de um nível
 */
export async function getRankingNivel(nivel: number): Promise<Array<{
  id: string;
  nome: string;
  photoURL?: string;
  pontosSemanais: number;
  posicao: number;
}>> {
  try {
    const rankingRef = collection(db, "ranking");
    const q = query(rankingRef, orderBy("pontosSemanais", "desc"));
    const snapshot = await getDocs(q);
    
    const alunos: Array<{
      id: string;
      nome: string;
      photoURL?: string;
      pontosSemanais: number;
      posicao: number;
    }> = [];
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      if (data.nivel === nivel) {
        // Buscar dados do aluno
        const alunoRef = doc(db, "alunos", docSnap.id);
        const alunoSnap = await getDoc(alunoRef);
        const alunoData = alunoSnap.data();
        
        alunos.push({
          id: docSnap.id,
          nome: alunoData?.nome || alunoData?.name || "Aluno",
          photoURL: alunoData?.photoURL,
          pontosSemanais: data.pontosSemanais || 0,
          posicao: 0, // Será calculado abaixo
        });
      }
    }
    
    // Ordenar e adicionar posição
    alunos.sort((a, b) => b.pontosSemanais - a.pontosSemanais);
    alunos.forEach((aluno, index) => {
      aluno.posicao = index + 1;
    });
    
    return alunos;
  } catch (error) {
    console.error("Erro ao obter ranking do nível:", error);
    return [];
  }
}
