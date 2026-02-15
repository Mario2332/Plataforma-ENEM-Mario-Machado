/**
 * Acesso direto ao Firestore com suporte a visualização do mentor
 * 
 * Estas funções aceitam um userId opcional como parâmetro.
 * Quando não fornecido, usa o ID do usuário logado.
 * Quando fornecido (pelo mentor), usa o ID do aluno sendo visualizado.
 * 
 * REFATORADO PARA MULTI-TENANT (FASE 3)
 * Agora todas as funções aceitam um parâmetro opcional mentoriaId
 * para resolver o caminho correto dos dados.
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  query, 
  orderBy,
  writeBatch,
  Timestamp
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { getCollectionPath, getAlunoSubcollectionPath } from "./data-service";

// Helper para obter userId
function getUserId(overrideUserId?: string | null): string {
  const userId = overrideUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Usuário não autenticado");
  return userId;
}

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

export async function getHorariosDirect(overrideUserId?: string | null, mentoriaId?: string | null): Promise<Horario[]> {
  const userId = getUserId(overrideUserId);
  const horariosRef = collection(db, getAlunoSubcollectionPath(userId, "horarios", mentoriaId));
  const q = query(horariosRef, orderBy("diaSemana"), orderBy("horaInicio"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Horario[];
}

export async function createHorarioDirect(horario: Omit<Horario, 'id'>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<string> {
  const userId = getUserId(overrideUserId);
  const horariosRef = collection(db, getAlunoSubcollectionPath(userId, "horarios", mentoriaId));
  const docRef = await addDoc(horariosRef, { ...horario, createdAt: Timestamp.now() });
  return docRef.id;
}

export async function updateHorarioDirect(horarioId: string, updates: Partial<Horario>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const horarioRef = doc(db, getAlunoSubcollectionPath(userId, "horarios", mentoriaId), horarioId);
  await updateDoc(horarioRef, updates);
}

export async function deleteHorarioDirect(horarioId: string, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const horarioRef = doc(db, getAlunoSubcollectionPath(userId, "horarios", mentoriaId), horarioId);
  await deleteDoc(horarioRef);
}

export async function clearAllHorariosDirect(overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const horariosRef = collection(db, getAlunoSubcollectionPath(userId, "horarios", mentoriaId));
  const snapshot = await getDocs(horariosRef);
  if (snapshot.empty) return;
  const BATCH_SIZE = 500;
  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = docs.slice(i, i + BATCH_SIZE);
    chunk.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
}

export async function saveHorariosBatch(horarios: Omit<Horario, 'id'>[], overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  if (horarios.length === 0) return;
  const horariosRef = collection(db, getAlunoSubcollectionPath(userId, "horarios", mentoriaId));
  const BATCH_SIZE = 500;
  for (let i = 0; i < horarios.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = horarios.slice(i, i + BATCH_SIZE);
    chunk.forEach(horario => {
      const newDocRef = doc(horariosRef);
      batch.set(newDocRef, { ...horario, createdAt: Timestamp.now() });
    });
    await batch.commit();
  }
}

export async function replaceAllHorarios(horarios: Omit<Horario, 'id'>[], overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const horariosRef = collection(db, getAlunoSubcollectionPath(userId, "horarios", mentoriaId));
  const snapshot = await getDocs(horariosRef);
  const existingDocs = snapshot.docs;
  const BATCH_SIZE = 500;
  const allOperations: Array<{ type: 'delete' | 'set', ref: any, data?: any }> = [];
  existingDocs.forEach(doc => { allOperations.push({ type: 'delete', ref: doc.ref }); });
  horarios.forEach(horario => {
    const newDocRef = doc(horariosRef);
    allOperations.push({ type: 'set', ref: newDocRef, data: { ...horario, createdAt: Timestamp.now() } });
  });
  for (let i = 0; i < allOperations.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = allOperations.slice(i, i + BATCH_SIZE);
    chunk.forEach(op => {
      if (op.type === 'delete') { batch.delete(op.ref); }
      else { batch.set(op.ref, op.data); }
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

export async function getTemplatesDirect(overrideUserId?: string | null, mentoriaId?: string | null): Promise<Template[]> {
  const userId = getUserId(overrideUserId);
  const templatesRef = collection(db, getAlunoSubcollectionPath(userId, "templates", mentoriaId));
  const q = query(templatesRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Template[];
}

export async function saveTemplateDirect(template: { nome: string; horarios: any[] }, overrideUserId?: string | null, mentoriaId?: string | null): Promise<string> {
  const userId = getUserId(overrideUserId);
  const templatesRef = collection(db, getAlunoSubcollectionPath(userId, "templates", mentoriaId));
  const docRef = await addDoc(templatesRef, { ...template, createdAt: Timestamp.now() });
  return docRef.id;
}

export async function loadTemplateDirect(templateId: string, overrideUserId?: string | null, mentoriaId?: string | null): Promise<Template | null> {
  const userId = getUserId(overrideUserId);
  const templatesRef = collection(db, getAlunoSubcollectionPath(userId, "templates", mentoriaId));
  const snapshot = await getDocs(templatesRef);
  const templateDoc = snapshot.docs.find(doc => doc.id === templateId);
  if (!templateDoc) return null;
  return { id: templateDoc.id, ...templateDoc.data() } as Template;
}

export async function deleteTemplateDirect(templateId: string, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
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

export async function getEstudosDirect(overrideUserId?: string | null, mentoriaId?: string | null): Promise<Estudo[]> {
  const userId = getUserId(overrideUserId);
  const estudosRef = collection(db, getAlunoSubcollectionPath(userId, "estudos", mentoriaId));
  const q = query(estudosRef, orderBy("data", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.slice(0, 200).map(doc => ({ id: doc.id, ...doc.data() })) as Estudo[];
}

export async function createEstudoDirect(estudo: Omit<Estudo, 'id'>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<string> {
  const userId = getUserId(overrideUserId);
  const estudosRef = collection(db, getAlunoSubcollectionPath(userId, "estudos", mentoriaId));
  const docRef = await addDoc(estudosRef, { ...estudo, createdAt: Timestamp.now() });
  return docRef.id;
}

export async function updateEstudoDirect(estudoId: string, updates: Partial<Estudo>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const estudoRef = doc(db, getAlunoSubcollectionPath(userId, "estudos", mentoriaId), estudoId);
  await updateDoc(estudoRef, updates);
}

export async function deleteEstudoDirect(estudoId: string, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const estudoRef = doc(db, getAlunoSubcollectionPath(userId, "estudos", mentoriaId), estudoId);
  await deleteDoc(estudoRef);
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

export async function getSimuladosDirect(overrideUserId?: string | null, mentoriaId?: string | null): Promise<Simulado[]> {
  const userId = getUserId(overrideUserId);
  const simuladosRef = collection(db, getAlunoSubcollectionPath(userId, "simulados", mentoriaId));
  const q = query(simuladosRef, orderBy("data", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.slice(0, 100).map(doc => ({ id: doc.id, ...doc.data() })) as Simulado[];
}

export async function createSimuladoDirect(simulado: Omit<Simulado, 'id'>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<string> {
  const userId = getUserId(overrideUserId);
  const simuladosRef = collection(db, getAlunoSubcollectionPath(userId, "simulados", mentoriaId));
  const docRef = await addDoc(simuladosRef, { ...simulado, createdAt: Timestamp.now() });
  return docRef.id;
}

export async function updateSimuladoDirect(simuladoId: string, updates: Partial<Simulado>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const simuladoRef = doc(db, getAlunoSubcollectionPath(userId, "simulados", mentoriaId), simuladoId);
  await updateDoc(simuladoRef, updates);
}

export async function deleteSimuladoDirect(simuladoId: string, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const simuladoRef = doc(db, getAlunoSubcollectionPath(userId, "simulados", mentoriaId), simuladoId);
  await deleteDoc(simuladoRef);
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
  const userId = getUserId(overrideUserId);
  const metasRef = collection(db, getAlunoSubcollectionPath(userId, "metas", mentoriaId));
  const q = query(metasRef, orderBy("dataFim", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Meta[];
}

export async function createMetaDirect(meta: Omit<Meta, 'id'>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<string> {
  const userId = getUserId(overrideUserId);
  const metasRef = collection(db, getAlunoSubcollectionPath(userId, "metas", mentoriaId));
  const docRef = await addDoc(metasRef, { ...meta, createdAt: Timestamp.now() });
  return docRef.id;
}

export async function updateMetaDirect(metaId: string, updates: Partial<Meta>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const metaRef = doc(db, getAlunoSubcollectionPath(userId, "metas", mentoriaId), metaId);
  await updateDoc(metaRef, updates);
}

export async function deleteMetaDirect(metaId: string, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
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
  const userId = getUserId(overrideUserId);
  const redacoesRef = collection(db, getAlunoSubcollectionPath(userId, "redacoes", mentoriaId));
  const q = query(redacoesRef, orderBy("data", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Redacao[];
}

export async function createRedacaoDirect(redacao: Omit<Redacao, 'id'>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<string> {
  const userId = getUserId(overrideUserId);
  const redacoesRef = collection(db, getAlunoSubcollectionPath(userId, "redacoes", mentoriaId));
  const docRef = await addDoc(redacoesRef, { ...redacao, createdAt: Timestamp.now() });
  return docRef.id;
}

export async function updateRedacaoDirect(redacaoId: string, updates: Partial<Redacao>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const redacaoRef = doc(db, getAlunoSubcollectionPath(userId, "redacoes", mentoriaId), redacaoId);
  await updateDoc(redacaoRef, updates);
}

export async function deleteRedacaoDirect(redacaoId: string, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
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
  const userId = getUserId(overrideUserId);
  const diagnosticoRef = doc(db, getAlunoSubcollectionPath(userId, "diagnostico", mentoriaId), "perfil");
  const snapshot = await getDoc(diagnosticoRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Diagnostico;
}

export async function saveDiagnosticoDirect(diagnostico: Omit<Diagnostico, 'id'>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
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
  const userId = getUserId(overrideUserId);
  const cronogramaRef = collection(db, getAlunoSubcollectionPath(userId, "cronograma", mentoriaId));
  const q = query(cronogramaRef, orderBy("semana"), orderBy("materia"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CronogramaItem[];
}

export async function updateCronogramaItemDirect(itemId: string, updates: Partial<CronogramaItem>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const itemRef = doc(db, getAlunoSubcollectionPath(userId, "cronograma", mentoriaId), itemId);
  await updateDoc(itemRef, updates);
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

export async function getPlanosAcaoDirect(overrideUserId?: string | null, mentoriaId?: string | null): Promise<PlanoAcao[]> {
  const userId = getUserId(overrideUserId);
  const planosRef = collection(db, getAlunoSubcollectionPath(userId, "planosAcao", mentoriaId));
  const q = query(planosRef, orderBy("updatedAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PlanoAcao[];
}

export async function createPlanoAcaoDirect(plano: Omit<PlanoAcao, 'id' | 'createdAt' | 'updatedAt'>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<string> {
  const userId = getUserId(overrideUserId);
  const planosRef = collection(db, getAlunoSubcollectionPath(userId, "planosAcao", mentoriaId));
  const docRef = await addDoc(planosRef, { ...plano, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
  return docRef.id;
}

export async function updatePlanoAcaoDirect(planoId: string, updates: Partial<PlanoAcao>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const planoRef = doc(db, getAlunoSubcollectionPath(userId, "planosAcao", mentoriaId), planoId);
  await updateDoc(planoRef, { ...updates, updatedAt: Timestamp.now() });
}

export async function deletePlanoAcaoDirect(planoId: string, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const planoRef = doc(db, getAlunoSubcollectionPath(userId, "planosAcao", mentoriaId), planoId);
  await deleteDoc(planoRef);
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
  const userId = getUserId(overrideUserId);
  const diarioRef = collection(db, getAlunoSubcollectionPath(userId, "diario_emocional", mentoriaId));
  const q = query(diarioRef, orderBy("data", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DiarioEmocional[];
}

export async function createDiarioEmocionalDirect(diario: Omit<DiarioEmocional, 'id'>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<string> {
  const userId = getUserId(overrideUserId);
  const diarioRef = collection(db, getAlunoSubcollectionPath(userId, "diario_emocional", mentoriaId));
  const docRef = await addDoc(diarioRef, { ...diario, createdAt: Timestamp.now() });
  return docRef.id;
}

export async function deleteDiarioEmocionalDirect(diarioId: string, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
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
  const userId = getUserId(overrideUserId);
  const autodiagRef = collection(db, getAlunoSubcollectionPath(userId, "autodiagnosticos", mentoriaId));
  const q = query(autodiagRef, orderBy("data", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Autodiagnostico[];
}

export async function createAutodiagnosticoDirect(autodiag: Omit<Autodiagnostico, 'id'>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<string> {
  const userId = getUserId(overrideUserId);
  const autodiagRef = collection(db, getAlunoSubcollectionPath(userId, "autodiagnosticos", mentoriaId));
  const docRef = await addDoc(autodiagRef, { ...autodiag, createdAt: Timestamp.now() });
  return docRef.id;
}

export async function deleteAutodiagnosticoDirect(autodiagId: string, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
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
  const userId = getUserId(overrideUserId);
  const configRef = doc(db, getAlunoSubcollectionPath(userId, "configuracoes", mentoriaId), "geral");
  const snapshot = await getDoc(configRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as AlunoConfig;
}

export async function saveAlunoConfigDirect(config: Omit<AlunoConfig, 'id'>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const configRef = doc(db, getAlunoSubcollectionPath(userId, "configuracoes", mentoriaId), "geral");
  await setDoc(configRef, { ...config, updatedAt: Timestamp.now() }, { merge: true });
}

// ============================================
// DADOS DO ALUNO (documento principal)
// ============================================

export async function getAlunoDirect(overrideUserId?: string | null, mentoriaId?: string | null): Promise<any> {
  const userId = getUserId(overrideUserId);
  const alunoRef = doc(db, getCollectionPath("alunos", mentoriaId), userId);
  const snapshot = await getDoc(alunoRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

export async function updateAlunoDirect(updates: Record<string, any>, overrideUserId?: string | null, mentoriaId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const alunoRef = doc(db, getCollectionPath("alunos", mentoriaId), userId);
  await updateDoc(alunoRef, { ...updates, updatedAt: Timestamp.now() });
}

// ============================================
// DADOS DO USUÁRIO (coleção users)
// ============================================

// Users continua sendo global (coleção raiz)
export async function getUserDirect(overrideUserId?: string | null): Promise<any> {
  const userId = getUserId(overrideUserId);
  const userRef = doc(db, "users", userId);
  const snapshot = await getDoc(userRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

// Users continua sendo global (coleção raiz)
export async function updateUserDirect(updates: Record<string, any>, overrideUserId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, { ...updates, updatedAt: Timestamp.now() });
}
