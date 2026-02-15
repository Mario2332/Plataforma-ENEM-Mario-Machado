/**
 * Acesso direto ao Firestore (sem Cloud Functions)
 * 
 * Isso elimina o cold start das Cloud Functions, reduzindo
 * o tempo de carregamento de ~20-30s para ~1-3s.
 * 
 * As regras de segurança do Firestore garantem que apenas
 * usuários autenticados podem acessar seus próprios dados.
 * 
 * REFATORADO PARA MULTI-TENANT (FASE 3)
 * Agora todas as funções aceitam um parâmetro opcional mentoriaId
 * para resolver o caminho correto dos dados.
 */

import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  writeBatch,
  Timestamp
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { getCollectionPath, getAlunoSubcollectionPath } from "./data-service";

// ============================================
// HORÁRIOS (Cronograma Semanal)
// ============================================

export interface Horario {
  id?: string;
  diaSemana: number;
  horaInicio: string;
  horaFim: string;
  materia: string;
  descricao?: string;
  cor?: string;
  createdAt?: Date;
}

/**
 * Buscar todos os horários do aluno logado
 * Acesso direto ao Firestore - sem cold start!
 */
export async function getHorariosDirect(overrideUserId?: string | null, mentoriaId?: string | null): Promise<Horario[]> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const horariosRef = collection(db, getAlunoSubcollectionPath(userId, "horarios", mentoriaId));
  const q = query(horariosRef, orderBy("diaSemana"), orderBy("horaInicio"));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Horario[];
}

/**
 * Criar um novo horário
 */
export async function createHorarioDirect(horario: Omit<Horario, 'id'>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<string> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const horariosRef = collection(db, getAlunoSubcollectionPath(userId, "horarios", mentoriaId));
  const docRef = await addDoc(horariosRef, {
    ...horario,
    createdAt: Timestamp.now()
  });
  
  return docRef.id;
}

/**
 * Atualizar um horário existente
 */
export async function updateHorarioDirect(horarioId: string, updates: Partial<Horario>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const horarioRef = doc(db, getAlunoSubcollectionPath(userId, "horarios", mentoriaId), horarioId);
  await updateDoc(horarioRef, updates);
}

/**
 * Deletar um horário
 */
export async function deleteHorarioDirect(horarioId: string, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const horarioRef = doc(db, getAlunoSubcollectionPath(userId, "horarios", mentoriaId), horarioId);
  await deleteDoc(horarioRef);
}

/**
 * Limpar todos os horários do aluno
 * Usa batch para melhor performance
 */
export async function clearAllHorariosDirect(overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const horariosRef = collection(db, getAlunoSubcollectionPath(userId, "horarios", mentoriaId));
  const snapshot = await getDocs(horariosRef);
  
  if (snapshot.empty) return;

  // Firestore tem limite de 500 operações por batch
  const BATCH_SIZE = 500;
  const docs = snapshot.docs;
  
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = docs.slice(i, i + BATCH_SIZE);
    chunk.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
}

/**
 * Salvar múltiplos horários de uma vez (batch)
 * Muito mais rápido que salvar um por um
 */
export async function saveHorariosBatch(horarios: Omit<Horario, 'id'>[], overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  if (horarios.length === 0) return;

  const horariosRef = collection(db, getAlunoSubcollectionPath(userId, "horarios", mentoriaId));
  
  // Firestore tem limite de 500 operações por batch
  const BATCH_SIZE = 500;
  
  for (let i = 0; i < horarios.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = horarios.slice(i, i + BATCH_SIZE);
    
    chunk.forEach(horario => {
      const newDocRef = doc(horariosRef);
      batch.set(newDocRef, {
        ...horario,
        createdAt: Timestamp.now()
      });
    });
    
    await batch.commit();
  }
}

/**
 * Limpar e salvar horários em uma única operação otimizada
 * Combina delete + create para minimizar round-trips
 */
export async function replaceAllHorarios(horarios: Omit<Horario, 'id'>[], overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const horariosRef = collection(db, getAlunoSubcollectionPath(userId, "horarios", mentoriaId));
  
  // Buscar documentos existentes para deletar
  const snapshot = await getDocs(horariosRef);
  const existingDocs = snapshot.docs;
  
  // Firestore tem limite de 500 operações por batch
  const BATCH_SIZE = 500;
  const allOperations: Array<{ type: 'delete' | 'set', ref: any, data?: any }> = [];
  
  // Adicionar operações de delete
  existingDocs.forEach(doc => {
    allOperations.push({ type: 'delete', ref: doc.ref });
  });
  
  // Adicionar operações de create
  horarios.forEach(horario => {
    const newDocRef = doc(horariosRef);
    allOperations.push({ 
      type: 'set', 
      ref: newDocRef, 
      data: { ...horario, createdAt: Timestamp.now() } 
    });
  });
  
  // Executar em batches
  for (let i = 0; i < allOperations.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = allOperations.slice(i, i + BATCH_SIZE);
    
    chunk.forEach(op => {
      if (op.type === 'delete') {
        batch.delete(op.ref);
      } else {
        batch.set(op.ref, op.data);
      }
    });
    
    await batch.commit();
  }
}

// ============================================
// TEMPLATES
// ============================================

export interface Template {
  id?: string;
  nome: string;
  horarios: Horario[];
  createdAt?: Date;
}

/**
 * Buscar todos os templates do aluno
 */
export async function getTemplatesDirect(overrideUserId?: string | null, mentoriaId?: string | null): Promise<Template[]> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const templatesRef = collection(db, getAlunoSubcollectionPath(userId, "templates", mentoriaId));
  const q = query(templatesRef, orderBy("createdAt", "desc"));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Template[];
}

/**
 * Salvar um novo template
 */
export async function saveTemplateDirect(template: { nome: string; horarios: any[] }, overrideUserId?: string | null, mentoriaId?: string | null): Promise<string> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const templatesRef = collection(db, getAlunoSubcollectionPath(userId, "templates", mentoriaId));
  const docRef = await addDoc(templatesRef, {
    ...template,
    createdAt: Timestamp.now()
  });
  
  return docRef.id;
}

/**
 * Carregar um template específico
 */
export async function loadTemplateDirect(templateId: string, overrideUserId?: string | null, mentoriaId?: string | null): Promise<Template | null> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const templatesRef = collection(db, getAlunoSubcollectionPath(userId, "templates", mentoriaId));
  const snapshot = await getDocs(templatesRef);
  
  const templateDoc = snapshot.docs.find(doc => doc.id === templateId);
  if (!templateDoc) return null;
  
  return {
    id: templateDoc.id,
    ...templateDoc.data()
  } as Template;
}

/**
 * Deletar um template
 */
export async function deleteTemplateDirect(templateId: string, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const templateRef = doc(db, getAlunoSubcollectionPath(userId, "templates", mentoriaId), templateId);
  await deleteDoc(templateRef);
}


// ============================================
// ESTUDOS
// ============================================

export interface Estudo {
  id?: string;
  data: Date;
  materia: string;
  assunto?: string;
  tempoMinutos: number;
  questoesFeitas: number;
  questoesAcertadas: number;
  anotacoes?: string;
  createdAt?: Date;
}

/**
 * Buscar todos os estudos do aluno
 * Limitado aos 200 mais recentes para performance
 */
export async function getEstudosDirect(overrideUserId?: string | null, mentoriaId?: string | null): Promise<Estudo[]> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const estudosRef = collection(db, getAlunoSubcollectionPath(userId, "estudos", mentoriaId));
  const q = query(estudosRef, orderBy("data", "desc"));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.slice(0, 200).map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Estudo[];
}

// ============================================
// SIMULADOS
// ============================================

export interface Simulado {
  id?: string;
  data: Date;
  tipo: string;
  linguagensAcertos: number;
  linguagensTotal: number;
  humanasAcertos: number;
  humanasTotal: number;
  naturezaAcertos: number;
  naturezaTotal: number;
  matematicaAcertos: number;
  matematicaTotal: number;
  redacaoNota?: number;
  anotacoes?: string;
  createdAt?: Date;
}

/**
 * Buscar todos os simulados do aluno
 * Limitado aos 100 mais recentes para performance
 */
export async function getSimuladosDirect(overrideUserId?: string | null, mentoriaId?: string | null): Promise<Simulado[]> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const simuladosRef = collection(db, getAlunoSubcollectionPath(userId, "simulados", mentoriaId));
  const q = query(simuladosRef, orderBy("data", "desc"));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.slice(0, 100).map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Simulado[];
}

// ============================================
// PLANOS DE AÇÃO
// ============================================

export interface PlanoAcao {
  id?: string;
  prova: string;
  macroassunto: string;
  microassunto: string;
  motivoErro: "interpretacao" | "lacuna_teorica" | "falta_atencao" | "tempo" | "chute";
  quantidadeErros: number;
  conduta: string;
  resolvido: boolean;
  criadoManualmente: boolean;
  createdAt: any;
  updatedAt: any;
}

/**
 * Buscar planos de ação do aluno
 */
export async function getPlanosAcaoDirect(overrideUserId?: string | null, mentoriaId?: string | null): Promise<PlanoAcao[]> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const planosRef = collection(db, getAlunoSubcollectionPath(userId, "planosAcao", mentoriaId));
  const q = query(planosRef, orderBy("updatedAt", "desc"));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as PlanoAcao[];
}

/**
 * Criar plano de ação manual
 */
export async function createPlanoAcaoDirect(plano: Omit<PlanoAcao, 'id' | 'createdAt' | 'updatedAt'>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<string> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const planosRef = collection(db, getAlunoSubcollectionPath(userId, "planosAcao", mentoriaId));
  const docRef = await addDoc(planosRef, {
    ...plano,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  
  return docRef.id;
}

/**
 * Atualizar plano de ação (ex: marcar como resolvido)
 */
export async function updatePlanoAcaoDirect(planoId: string, updates: Partial<PlanoAcao>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const planoRef = doc(db, getAlunoSubcollectionPath(userId, "planosAcao", mentoriaId), planoId);
  await updateDoc(planoRef, {
    ...updates,
    updatedAt: Timestamp.now()
  });
}

/**
 * Deletar plano de ação
 */
export async function deletePlanoAcaoDirect(planoId: string, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const planoRef = doc(db, getAlunoSubcollectionPath(userId, "planosAcao", mentoriaId), planoId);
  await deleteDoc(planoRef);
}

/**
 * Gerar conduta baseada no motivo do erro e quantidade de erros
 */
export function gerarConduta(motivoErro: "interpretacao" | "lacuna_teorica", quantidadeErros: number): string {
  const dobrar = quantidadeErros >= 3;
  
  if (motivoErro === "interpretacao") {
    const questoes = dobrar ? 10 : 5;
    return `Fazer ${questoes} questões contextualizadas para praticar o conteúdo.`;
  } else {
    const questoes = dobrar ? 20 : 10;
    return `Revisar a teoria com foco na lacuna identificada e, depois, fazer ${questoes} questões.`;
  }
}

/**
 * Criar ou atualizar planos de ação a partir de um autodiagnóstico
 * Chamado automaticamente quando um autodiagnóstico é salvo
 */
export async function criarPlanosDeAutodiagnostico(
  prova: string, 
  questoes: Array<{ macroassunto: string; microassunto: string; motivoErro: string }>
, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  // Filtrar apenas erros por interpretação ou lacuna teórica
  const questoesRelevantes = questoes.filter(
    q => q.motivoErro === "interpretacao" || q.motivoErro === "lacuna_teorica"
  );

  if (questoesRelevantes.length === 0) return;

  // Buscar planos existentes para esta prova
  const planosRef = collection(db, getAlunoSubcollectionPath(userId, "planosAcao", mentoriaId));
  const snapshot = await getDocs(planosRef);
  const planosExistentes = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as PlanoAcao[];

  // Agrupar questões por microassunto + motivo
  const agrupados: Record<string, { macroassunto: string; microassunto: string; motivoErro: "interpretacao" | "lacuna_teorica"; count: number }> = {};
  
  questoesRelevantes.forEach(q => {
    const key = `${prova}-${q.microassunto}-${q.motivoErro}`;
    if (!agrupados[key]) {
      agrupados[key] = {
        macroassunto: q.macroassunto,
        microassunto: q.microassunto,
        motivoErro: q.motivoErro as "interpretacao" | "lacuna_teorica",
        count: 0
      };
    }
    agrupados[key].count++;
  });

  // Criar ou atualizar planos
  const batch = writeBatch(db);
  
  Object.entries(agrupados).forEach(([key, dados]) => {
    // Verificar se já existe um plano para este microassunto + motivo + prova
    const planoExistente = planosExistentes.find(
      p => p.prova === prova && 
           p.microassunto === dados.microassunto && 
           p.motivoErro === dados.motivoErro &&
           !p.resolvido
    );

    if (planoExistente && planoExistente.id) {
      // Atualizar quantidade de erros
      const novaQuantidade = planoExistente.quantidadeErros + dados.count;
      const planoRef = doc(db, getAlunoSubcollectionPath(userId, "planosAcao", mentoriaId), planoExistente.id);
      batch.update(planoRef, {
        quantidadeErros: novaQuantidade,
        conduta: gerarConduta(dados.motivoErro, novaQuantidade),
        updatedAt: Timestamp.now()
      });
    } else {
      // Criar novo plano
      const novoPlanoRef = doc(planosRef);
      batch.set(novoPlanoRef, {
        prova,
        macroassunto: dados.macroassunto,
        microassunto: dados.microassunto,
        motivoErro: dados.motivoErro,
        quantidadeErros: dados.count,
        conduta: gerarConduta(dados.motivoErro, dados.count),
        resolvido: false,
        criadoManualmente: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    }
  });

  await batch.commit();
}

// ============================================
// METAS
// ============================================

export interface Meta {
  id?: string;
  titulo: string;
  descricao?: string;
  tipo: string;
  valorAlvo: number;
  valorAtual: number;
  unidade: string;
  dataInicio: Date;
  dataFim: Date;
  concluida: boolean;
  createdAt?: Date;
}

export async function getMetasDirect(overrideUserId?: string | null, mentoriaId?: string | null): Promise<Meta[]> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const metasRef = collection(db, getAlunoSubcollectionPath(userId, "metas", mentoriaId));
  const q = query(metasRef, orderBy("dataFim", "asc"));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Meta[];
}

export async function createMetaDirect(meta: Omit<Meta, 'id'>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<string> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const metasRef = collection(db, getAlunoSubcollectionPath(userId, "metas", mentoriaId));
  const docRef = await addDoc(metasRef, { ...meta, createdAt: Timestamp.now() });
  return docRef.id;
}

export async function updateMetaDirect(metaId: string, updates: Partial<Meta>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const metaRef = doc(db, getAlunoSubcollectionPath(userId, "metas", mentoriaId), metaId);
  await updateDoc(metaRef, updates);
}

export async function deleteMetaDirect(metaId: string, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const metaRef = doc(db, getAlunoSubcollectionPath(userId, "metas", mentoriaId), metaId);
  await deleteDoc(metaRef);
}

// ============================================
// REDAÇÕES
// ============================================

export interface Redacao {
  id?: string;
  tema: string;
  data: Date;
  nota?: number;
  competencias?: {
    c1: number;
    c2: number;
    c3: number;
    c4: number;
    c5: number;
  };
  comentarios?: string;
  status: 'pendente' | 'corrigida';
  createdAt?: Date;
}

export async function getRedacoesDirect(overrideUserId?: string | null, mentoriaId?: string | null): Promise<Redacao[]> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const redacoesRef = collection(db, getAlunoSubcollectionPath(userId, "redacoes", mentoriaId));
  const q = query(redacoesRef, orderBy("data", "desc"));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Redacao[];
}

export async function createRedacaoDirect(redacao: Omit<Redacao, 'id'>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<string> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const redacoesRef = collection(db, getAlunoSubcollectionPath(userId, "redacoes", mentoriaId));
  const docRef = await addDoc(redacoesRef, { ...redacao, createdAt: Timestamp.now() });
  return docRef.id;
}

export async function updateRedacaoDirect(redacaoId: string, updates: Partial<Redacao>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const redacaoRef = doc(db, getAlunoSubcollectionPath(userId, "redacoes", mentoriaId), redacaoId);
  await updateDoc(redacaoRef, updates);
}

export async function deleteRedacaoDirect(redacaoId: string, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const redacaoRef = doc(db, getAlunoSubcollectionPath(userId, "redacoes", mentoriaId), redacaoId);
  await deleteDoc(redacaoRef);
}

// ============================================
// DIAGNÓSTICO
// ============================================

export interface Diagnostico {
  id?: string;
  perfil: string;
  pontosFortes: string[];
  pontosFracos: string[];
  recomendacoes: string[];
  updatedAt?: Date;
}

export async function getDiagnosticoDirect(overrideUserId?: string | null, mentoriaId?: string | null): Promise<Diagnostico | null> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const diagnosticoRef = doc(db, getAlunoSubcollectionPath(userId, "diagnostico", mentoriaId), "perfil");
  const snapshot = await getDoc(diagnosticoRef);
  
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Diagnostico;
}

export async function saveDiagnosticoDirect(diagnostico: Omit<Diagnostico, 'id'>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const diagnosticoRef = doc(db, getAlunoSubcollectionPath(userId, "diagnostico", mentoriaId), "perfil");
  await setDoc(diagnosticoRef, { ...diagnostico, updatedAt: Timestamp.now() }, { merge: true });
}

// ============================================
// CRONOGRAMA
// ============================================

export interface CronogramaItem {
  id?: string;
  materia: string;
  assunto: string;
  semana: number;
  concluido: boolean;
  dataConclusao?: Date;
}

export async function getCronogramaDirect(overrideUserId?: string | null, mentoriaId?: string | null): Promise<CronogramaItem[]> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const cronogramaRef = collection(db, getAlunoSubcollectionPath(userId, "cronograma", mentoriaId));
  const q = query(cronogramaRef, orderBy("semana"), orderBy("materia"));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CronogramaItem[];
}

export async function updateCronogramaItemDirect(itemId: string, updates: Partial<CronogramaItem>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const itemRef = doc(db, getAlunoSubcollectionPath(userId, "cronograma", mentoriaId), itemId);
  await updateDoc(itemRef, updates);
}

// ============================================
// DIÁRIO EMOCIONAL
// ============================================

export interface DiarioEmocional {
  id?: string;
  data: Date;
  humor: number; // 1-5
  texto: string;
  tags?: string[];
  createdAt?: Date;
}

export async function getDiarioEmocionalDirect(overrideUserId?: string | null, mentoriaId?: string | null): Promise<DiarioEmocional[]> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const diarioRef = collection(db, getAlunoSubcollectionPath(userId, "diario_emocional", mentoriaId));
  const q = query(diarioRef, orderBy("data", "desc"));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DiarioEmocional[];
}

export async function createDiarioEmocionalDirect(diario: Omit<DiarioEmocional, 'id'>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<string> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const diarioRef = collection(db, getAlunoSubcollectionPath(userId, "diario_emocional", mentoriaId));
  const docRef = await addDoc(diarioRef, { ...diario, createdAt: Timestamp.now() });
  return docRef.id;
}

export async function deleteDiarioEmocionalDirect(diarioId: string, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const diarioRef = doc(db, getAlunoSubcollectionPath(userId, "diario_emocional", mentoriaId), diarioId);
  await deleteDoc(diarioRef);
}

// ============================================
// AUTODIAGNÓSTICO
// ============================================

export interface Autodiagnostico {
  id?: string;
  prova: string;
  data: Date;
  questoes: Array<{
    numero: number;
    macroassunto: string;
    microassunto: string;
    acertou: boolean;
    motivoErro?: string;
  }>;
  createdAt?: Date;
}

export async function getAutodiagnosticosDirect(overrideUserId?: string | null, mentoriaId?: string | null): Promise<Autodiagnostico[]> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const autodiagRef = collection(db, getAlunoSubcollectionPath(userId, "autodiagnosticos", mentoriaId));
  const q = query(autodiagRef, orderBy("data", "desc"));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Autodiagnostico[];
}

export async function createAutodiagnosticoDirect(autodiag: Omit<Autodiagnostico, 'id'>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<string> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const autodiagRef = collection(db, getAlunoSubcollectionPath(userId, "autodiagnosticos", mentoriaId));
  const docRef = await addDoc(autodiagRef, { ...autodiag, createdAt: Timestamp.now() });
  return docRef.id;
}

export async function deleteAutodiagnosticoDirect(autodiagId: string, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const autodiagRef = doc(db, getAlunoSubcollectionPath(userId, "autodiagnosticos", mentoriaId), autodiagId);
  await deleteDoc(autodiagRef);
}

// ============================================
// CONFIGURAÇÕES DO ALUNO
// ============================================

export interface AlunoConfig {
  id?: string;
  notificacoes?: boolean;
  temaEscuro?: boolean;
  metaDiariaHoras?: number;
  metaSemanalHoras?: number;
  updatedAt?: Date;
}

export async function getAlunoConfigDirect(overrideUserId?: string | null, mentoriaId?: string | null): Promise<AlunoConfig | null> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const configRef = doc(db, getAlunoSubcollectionPath(userId, "configuracoes", mentoriaId), "geral");
  const snapshot = await getDoc(configRef);
  
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as AlunoConfig;
}

export async function saveAlunoConfigDirect(config: Omit<AlunoConfig, 'id'>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const configRef = doc(db, getAlunoSubcollectionPath(userId, "configuracoes", mentoriaId), "geral");
  await setDoc(configRef, { ...config, updatedAt: Timestamp.now() }, { merge: true });
}

// ============================================
// DADOS DO ALUNO (documento principal)
// ============================================

export async function getAlunoDirect(overrideUserId?: string | null, mentoriaId?: string | null): Promise<any> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const alunoRef = doc(db, getCollectionPath("alunos", mentoriaId), userId);
  const snapshot = await getDoc(alunoRef);
  
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

export async function updateAlunoDirect(updates: Record<string, any>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");

  const alunoRef = doc(db, getCollectionPath("alunos", mentoriaId), userId);
  await updateDoc(alunoRef, { ...updates, updatedAt: Timestamp.now() });
}

/**
 * Marcar plano de ação como resolvido
 */
export async function resolverPlanoAcaoDirect(planoId: string, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  return updatePlanoAcaoDirect(planoId, { resolvido: true }, overrideUserId, mentoriaId);
}

/**
 * Reabrir plano de ação (marcar como não resolvido)
 */
export async function reabrirPlanoAcaoDirect(planoId: string, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  return updatePlanoAcaoDirect(planoId, { resolvido: false }, overrideUserId, mentoriaId);
}
