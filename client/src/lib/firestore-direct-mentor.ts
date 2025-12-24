/**
 * Acesso direto ao Firestore com suporte a visualização do mentor
 * 
 * Estas funções aceitam um userId opcional como parâmetro.
 * Quando não fornecido, usa o ID do usuário logado.
 * Quando fornecido (pelo mentor), usa o ID do aluno sendo visualizado.
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

export async function getHorariosDirect(overrideUserId?: string | null): Promise<Horario[]> {
  const userId = getUserId(overrideUserId);
  const horariosRef = collection(db, "alunos", userId, "horarios");
  const q = query(horariosRef, orderBy("diaSemana"), orderBy("horaInicio"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Horario[];
}

export async function createHorarioDirect(horario: Omit<Horario, 'id'>, overrideUserId?: string | null): Promise<string> {
  const userId = getUserId(overrideUserId);
  const horariosRef = collection(db, "alunos", userId, "horarios");
  const docRef = await addDoc(horariosRef, { ...horario, createdAt: Timestamp.now() });
  return docRef.id;
}

export async function updateHorarioDirect(horarioId: string, updates: Partial<Horario>, overrideUserId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const horarioRef = doc(db, "alunos", userId, "horarios", horarioId);
  await updateDoc(horarioRef, updates);
}

export async function deleteHorarioDirect(horarioId: string, overrideUserId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const horarioRef = doc(db, "alunos", userId, "horarios", horarioId);
  await deleteDoc(horarioRef);
}

export async function clearAllHorariosDirect(overrideUserId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const horariosRef = collection(db, "alunos", userId, "horarios");
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

export async function saveHorariosBatch(horarios: Omit<Horario, 'id'>[], overrideUserId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  if (horarios.length === 0) return;
  const horariosRef = collection(db, "alunos", userId, "horarios");
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

export async function replaceAllHorarios(horarios: Omit<Horario, 'id'>[], overrideUserId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const horariosRef = collection(db, "alunos", userId, "horarios");
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

export async function getTemplatesDirect(overrideUserId?: string | null): Promise<Template[]> {
  const userId = getUserId(overrideUserId);
  const templatesRef = collection(db, "alunos", userId, "templates");
  const q = query(templatesRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Template[];
}

export async function saveTemplateDirect(template: { nome: string; horarios: any[] }, overrideUserId?: string | null): Promise<string> {
  const userId = getUserId(overrideUserId);
  const templatesRef = collection(db, "alunos", userId, "templates");
  const docRef = await addDoc(templatesRef, { ...template, createdAt: Timestamp.now() });
  return docRef.id;
}

export async function loadTemplateDirect(templateId: string, overrideUserId?: string | null): Promise<Template | null> {
  const userId = getUserId(overrideUserId);
  const templatesRef = collection(db, "alunos", userId, "templates");
  const snapshot = await getDocs(templatesRef);
  const templateDoc = snapshot.docs.find(doc => doc.id === templateId);
  if (!templateDoc) return null;
  return { id: templateDoc.id, ...templateDoc.data() } as Template;
}

export async function deleteTemplateDirect(templateId: string, overrideUserId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const templateRef = doc(db, "alunos", userId, "templates", templateId);
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

export async function getEstudosDirect(overrideUserId?: string | null): Promise<Estudo[]> {
  const userId = getUserId(overrideUserId);
  const estudosRef = collection(db, "alunos", userId, "estudos");
  const q = query(estudosRef, orderBy("data", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.slice(0, 200).map(doc => ({ id: doc.id, ...doc.data() })) as Estudo[];
}

export async function createEstudoDirect(estudo: Omit<Estudo, 'id'>, overrideUserId?: string | null): Promise<string> {
  const userId = getUserId(overrideUserId);
  const estudosRef = collection(db, "alunos", userId, "estudos");
  const docRef = await addDoc(estudosRef, { ...estudo, createdAt: Timestamp.now() });
  return docRef.id;
}

export async function updateEstudoDirect(estudoId: string, updates: Partial<Estudo>, overrideUserId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const estudoRef = doc(db, "alunos", userId, "estudos", estudoId);
  await updateDoc(estudoRef, updates);
}

export async function deleteEstudoDirect(estudoId: string, overrideUserId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const estudoRef = doc(db, "alunos", userId, "estudos", estudoId);
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

export async function getSimuladosDirect(overrideUserId?: string | null): Promise<Simulado[]> {
  const userId = getUserId(overrideUserId);
  const simuladosRef = collection(db, "alunos", userId, "simulados");
  const q = query(simuladosRef, orderBy("data", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.slice(0, 100).map(doc => ({ id: doc.id, ...doc.data() })) as Simulado[];
}

export async function createSimuladoDirect(simulado: Omit<Simulado, 'id'>, overrideUserId?: string | null): Promise<string> {
  const userId = getUserId(overrideUserId);
  const simuladosRef = collection(db, "alunos", userId, "simulados");
  const docRef = await addDoc(simuladosRef, { ...simulado, createdAt: Timestamp.now() });
  return docRef.id;
}

export async function updateSimuladoDirect(simuladoId: string, updates: Partial<Simulado>, overrideUserId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const simuladoRef = doc(db, "alunos", userId, "simulados", simuladoId);
  await updateDoc(simuladoRef, updates);
}

export async function deleteSimuladoDirect(simuladoId: string, overrideUserId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const simuladoRef = doc(db, "alunos", userId, "simulados", simuladoId);
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

export async function getMetasDirect(overrideUserId?: string | null): Promise<Meta[]> {
  const userId = getUserId(overrideUserId);
  const metasRef = collection(db, "alunos", userId, "metas");
  const q = query(metasRef, orderBy("dataFim", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Meta[];
}

export async function createMetaDirect(meta: Omit<Meta, 'id'>, overrideUserId?: string | null): Promise<string> {
  const userId = getUserId(overrideUserId);
  const metasRef = collection(db, "alunos", userId, "metas");
  const docRef = await addDoc(metasRef, { ...meta, createdAt: Timestamp.now() });
  return docRef.id;
}

export async function updateMetaDirect(metaId: string, updates: Partial<Meta>, overrideUserId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const metaRef = doc(db, "alunos", userId, "metas", metaId);
  await updateDoc(metaRef, updates);
}

export async function deleteMetaDirect(metaId: string, overrideUserId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const metaRef = doc(db, "alunos", userId, "metas", metaId);
  await deleteDoc(metaRef);
}

// ============================================
// REDAÇÕES
// ============================================

export interface Redacao {
  id?: string;
  data: Date;
  tema: string;
  nota?: number;
  competencia1?: number;
  competencia2?: number;
  competencia3?: number;
  competencia4?: number;
  competencia5?: number;
  observacoes?: string;
  createdAt?: Date;
}

export async function getRedacoesDirect(overrideUserId?: string | null): Promise<Redacao[]> {
  const userId = getUserId(overrideUserId);
  const redacoesRef = collection(db, "alunos", userId, "redacoes");
  const q = query(redacoesRef, orderBy("data", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Redacao[];
}

export async function createRedacaoDirect(redacao: Omit<Redacao, 'id'>, overrideUserId?: string | null): Promise<string> {
  const userId = getUserId(overrideUserId);
  const redacoesRef = collection(db, "alunos", userId, "redacoes");
  const docRef = await addDoc(redacoesRef, { ...redacao, createdAt: Timestamp.now() });
  return docRef.id;
}

export async function updateRedacaoDirect(redacaoId: string, updates: Partial<Redacao>, overrideUserId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const redacaoRef = doc(db, "alunos", userId, "redacoes", redacaoId);
  await updateDoc(redacaoRef, updates);
}

export async function deleteRedacaoDirect(redacaoId: string, overrideUserId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const redacaoRef = doc(db, "alunos", userId, "redacoes", redacaoId);
  await deleteDoc(redacaoRef);
}

// ============================================
// DIÁRIO EMOCIONAL
// ============================================

export interface DiarioEntry {
  id?: string;
  data: Date;
  humor: number;
  energia: number;
  foco: number;
  ansiedade: number;
  notas?: string;
  createdAt?: Date;
}

export async function getDiariosDirect(overrideUserId?: string | null): Promise<DiarioEntry[]> {
  const userId = getUserId(overrideUserId);
  const diarioRef = collection(db, "alunos", userId, "diario_emocional");
  const q = query(diarioRef, orderBy("data", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DiarioEntry[];
}

export async function createDiarioDirect(entry: Omit<DiarioEntry, 'id'>, overrideUserId?: string | null): Promise<string> {
  const userId = getUserId(overrideUserId);
  const diarioRef = collection(db, "alunos", userId, "diario_emocional");
  const docRef = await addDoc(diarioRef, { ...entry, createdAt: Timestamp.now() });
  return docRef.id;
}

export async function updateDiarioDirect(entryId: string, updates: Partial<DiarioEntry>, overrideUserId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const entryRef = doc(db, "alunos", userId, "diario_emocional", entryId);
  await updateDoc(entryRef, updates);
}

export async function deleteDiarioDirect(entryId: string, overrideUserId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const entryRef = doc(db, "alunos", userId, "diario_emocional", entryId);
  await deleteDoc(entryRef);
}

// ============================================
// CRONOGRAMA DINÂMICO
// ============================================

export interface CronogramaConfig {
  id?: string;
  horasDisponiveis: Record<string, number>;
  prioridades: Record<string, number>;
  updatedAt?: Date;
}

export async function getCronogramaConfigDirect(overrideUserId?: string | null): Promise<CronogramaConfig | null> {
  const userId = getUserId(overrideUserId);
  const configRef = doc(db, "alunos", userId, "cronograma", "config");
  const snapshot = await getDoc(configRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as CronogramaConfig;
}

export async function saveCronogramaConfigDirect(config: Omit<CronogramaConfig, 'id'>, overrideUserId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const configRef = doc(db, "alunos", userId, "cronograma", "config");
  await setDoc(configRef, { ...config, updatedAt: Timestamp.now() }, { merge: true });
}

// ============================================
// CONTEÚDOS PROGRESSO
// ============================================

export interface ConteudoProgresso {
  id?: string;
  materia: string;
  topico: string;
  subtopico?: string;
  status: 'nao_iniciado' | 'em_andamento' | 'concluido';
  notas?: string;
  updatedAt?: Date;
}

export async function getConteudosProgressoDirect(overrideUserId?: string | null): Promise<ConteudoProgresso[]> {
  const userId = getUserId(overrideUserId);
  const progressoRef = collection(db, "alunos", userId, "conteudos_progresso");
  const snapshot = await getDocs(progressoRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ConteudoProgresso[];
}

export async function updateConteudoProgressoDirect(progressoId: string, updates: Partial<ConteudoProgresso>, overrideUserId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const progressoRef = doc(db, "alunos", userId, "conteudos_progresso", progressoId);
  await updateDoc(progressoRef, { ...updates, updatedAt: Timestamp.now() });
}

export async function createConteudoProgressoDirect(progresso: Omit<ConteudoProgresso, 'id'>, overrideUserId?: string | null): Promise<string> {
  const userId = getUserId(overrideUserId);
  const progressoRef = collection(db, "alunos", userId, "conteudos_progresso");
  const docRef = await addDoc(progressoRef, { ...progresso, updatedAt: Timestamp.now() });
  return docRef.id;
}

// ============================================
// PLANOS DE AÇÃO
// ============================================

export interface PlanoAcao {
  id?: string;
  prova: string;
  macroassunto: string;
  microassunto: string;
  motivoErro: "interpretacao" | "lacuna_teorica";
  quantidadeErros: number;
  conduta: string;
  resolvido: boolean;
  criadoManualmente: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function getPlanosAcaoDirect(overrideUserId?: string | null): Promise<PlanoAcao[]> {
  const userId = getUserId(overrideUserId);
  const planosRef = collection(db, "alunos", userId, "planosAcao");
  const q = query(planosRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PlanoAcao[];
}

export async function createPlanoAcaoDirect(plano: Omit<PlanoAcao, 'id'>, overrideUserId?: string | null): Promise<string> {
  const userId = getUserId(overrideUserId);
  const planosRef = collection(db, "alunos", userId, "planosAcao");
  const docRef = await addDoc(planosRef, { ...plano, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
  return docRef.id;
}

export async function updatePlanoAcaoDirect(planoId: string, updates: Partial<PlanoAcao>, overrideUserId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const planoRef = doc(db, "alunos", userId, "planosAcao", planoId);
  await updateDoc(planoRef, { ...updates, updatedAt: Timestamp.now() });
}

export async function deletePlanoAcaoDirect(planoId: string, overrideUserId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const planoRef = doc(db, "alunos", userId, "planosAcao", planoId);
  await deleteDoc(planoRef);
}

// ============================================
// AUTODIAGNÓSTICOS
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

export async function getAutodiagnosticosDirect(overrideUserId?: string | null): Promise<Autodiagnostico[]> {
  const userId = getUserId(overrideUserId);
  const autodiagRef = collection(db, "alunos", userId, "autodiagnosticos");
  const q = query(autodiagRef, orderBy("data", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Autodiagnostico[];
}

export async function createAutodiagnosticoDirect(autodiag: Omit<Autodiagnostico, 'id'>, overrideUserId?: string | null): Promise<string> {
  const userId = getUserId(overrideUserId);
  const autodiagRef = collection(db, "alunos", userId, "autodiagnosticos");
  const docRef = await addDoc(autodiagRef, { ...autodiag, createdAt: Timestamp.now() });
  return docRef.id;
}

export async function deleteAutodiagnosticoDirect(autodiagId: string, overrideUserId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const autodiagRef = doc(db, "alunos", userId, "autodiagnosticos", autodiagId);
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

export async function getAlunoConfigDirect(overrideUserId?: string | null): Promise<AlunoConfig | null> {
  const userId = getUserId(overrideUserId);
  const configRef = doc(db, "alunos", userId, "configuracoes", "geral");
  const snapshot = await getDoc(configRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as AlunoConfig;
}

export async function saveAlunoConfigDirect(config: Omit<AlunoConfig, 'id'>, overrideUserId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const configRef = doc(db, "alunos", userId, "configuracoes", "geral");
  await setDoc(configRef, { ...config, updatedAt: Timestamp.now() }, { merge: true });
}

// ============================================
// DADOS DO ALUNO (documento principal)
// ============================================

export async function getAlunoDirect(overrideUserId?: string | null): Promise<any> {
  const userId = getUserId(overrideUserId);
  const alunoRef = doc(db, "alunos", userId);
  const snapshot = await getDoc(alunoRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

export async function updateAlunoDirect(updates: Record<string, any>, overrideUserId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const alunoRef = doc(db, "alunos", userId);
  await updateDoc(alunoRef, { ...updates, updatedAt: Timestamp.now() });
}

// ============================================
// DADOS DO USUÁRIO (coleção users)
// ============================================

export async function getUserDirect(overrideUserId?: string | null): Promise<any> {
  const userId = getUserId(overrideUserId);
  const userRef = doc(db, "users", userId);
  const snapshot = await getDoc(userRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

export async function updateUserDirect(updates: Record<string, any>, overrideUserId?: string | null): Promise<void> {
  const userId = getUserId(overrideUserId);
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, { ...updates, updatedAt: Timestamp.now() });
}
