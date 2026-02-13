import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuthContextV2, requireRole } from "../utils/auth";

const db = getFirestore();

// ==================== ALERTAS ====================

export const getConfigAlertas = onCall(
  { region: "southamerica-east1" },
  async (request) => {
    const auth = await getAuthContextV2(request);
    requireRole(auth, "mentor");

    const configDoc = await db
      .collection("config_alertas")
      .doc(auth.uid)
      .get();

    if (!configDoc.exists) {
      // Retornar configuração padrão
      return {
        alertas: [
          { id: "inatividade", tipo: "inatividade", ativo: true, valor: 3, unidade: "dias" },
          { id: "desempenho_baixo", tipo: "desempenho_baixo", ativo: true, valor: 60, unidade: "%" },
          { id: "meta_nao_atingida", tipo: "meta_nao_atingida", ativo: true, valor: 2, unidade: "semanas" },
          { id: "sem_simulado", tipo: "sem_simulado", ativo: false, valor: 7, unidade: "dias" },
        ],
      };
    }

    return configDoc.data();
  });

export const saveConfigAlertas = onCall(
  { region: "southamerica-east1" },
  async (request) => {
    const auth = await getAuthContextV2(request);
    requireRole(auth, "mentor");

    const { alertas } = request.data;

    if (!alertas || !Array.isArray(alertas)) {
      throw new HttpsError("invalid-argument", "Alertas inválidos");
    }

    await db
      .collection("config_alertas")
      .doc(auth.uid)
      .set(
        {
          alertas,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    return { success: true };
  });

export const getAlertas = onCall(
  { region: "southamerica-east1" },
  async (request) => {
    const auth = await getAuthContextV2(request);
    requireRole(auth, "mentor");

    const alertasSnapshot = await db
      .collection("alertas")
      .where("mentorId", "==", auth.uid)
      .where("lido", "==", false)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    return alertasSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  });

export const marcarAlertaLido = onCall(
  { region: "southamerica-east1" },
  async (request) => {
    const auth = await getAuthContextV2(request);
    requireRole(auth, "mentor");

    const { alertaId } = request.data;

    if (!alertaId) {
      throw new HttpsError("invalid-argument", "alertaId é obrigatório");
    }

    const alertaRef = db.collection("alertas").doc(alertaId);
    const alertaDoc = await alertaRef.get();

    if (!alertaDoc.exists) {
      throw new HttpsError("not-found", "Alerta não encontrado");
    }

    const alertaData = alertaDoc.data();
    if (alertaData?.mentorId !== auth.uid) {
      throw new HttpsError("permission-denied", "Sem permissão");
    }

    await alertaRef.update({
      lido: true,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  });

export const removerAlerta = onCall(
  { region: "southamerica-east1" },
  async (request) => {
    const auth = await getAuthContextV2(request);
    requireRole(auth, "mentor");

    const { alertaId } = request.data;

    if (!alertaId) {
      throw new HttpsError("invalid-argument", "alertaId é obrigatório");
    }

    const alertaRef = db.collection("alertas").doc(alertaId);
    const alertaDoc = await alertaRef.get();

    if (!alertaDoc.exists) {
      throw new HttpsError("not-found", "Alerta não encontrado");
    }

    const alertaData = alertaDoc.data();
    if (alertaData?.mentorId !== auth.uid) {
      throw new HttpsError("permission-denied", "Sem permissão");
    }

    await alertaRef.delete();

    return { success: true };
  });

// ==================== ANOTAÇÕES ====================

export const getAnotacoesAluno = onCall(
  { region: "southamerica-east1" },
  async (request) => {
    const auth = await getAuthContextV2(request);
    requireRole(auth, "mentor");

    const { alunoId } = request.data;

    if (!alunoId) {
      throw new HttpsError("invalid-argument", "alunoId é obrigatório");
    }

    // Verificar se o aluno pertence ao mentor
    const alunoDoc = await db.collection("alunos").doc(alunoId).get();
    if (!alunoDoc.exists) {
      throw new HttpsError("not-found", "Aluno não encontrado");
    }

    const alunoData = alunoDoc.data();
    if (alunoData?.mentorId !== auth.uid && alunoData?.mentorId !== "todos") {
      throw new HttpsError("permission-denied", "Sem permissão");
    }

    const anotacoesSnapshot = await db
      .collection("anotacoes_alunos")
      .where("mentorId", "==", auth.uid)
      .where("alunoId", "==", alunoId)
      .orderBy("createdAt", "desc")
      .get();

    return anotacoesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  });

export const criarAnotacaoAluno = onCall(
  { region: "southamerica-east1" },
  async (request) => {
    const auth = await getAuthContextV2(request);
    requireRole(auth, "mentor");

    const { alunoId, texto } = request.data;

    if (!alunoId || !texto) {
      throw new HttpsError("invalid-argument", "alunoId e texto são obrigatórios");
    }

    // Verificar se o aluno pertence ao mentor
    const alunoDoc = await db.collection("alunos").doc(alunoId).get();
    if (!alunoDoc.exists) {
      throw new HttpsError("not-found", "Aluno não encontrado");
    }

    const alunoData = alunoDoc.data();
    if (alunoData?.mentorId !== auth.uid && alunoData?.mentorId !== "todos") {
      throw new HttpsError("permission-denied", "Sem permissão");
    }

    const anotacaoRef = await db.collection("anotacoes_alunos").add({
      mentorId: auth.uid,
      alunoId,
      texto,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { id: anotacaoRef.id, success: true };
  });

export const editarAnotacaoAluno = onCall(
  { region: "southamerica-east1" },
  async (request) => {
    const auth = await getAuthContextV2(request);
    requireRole(auth, "mentor");

    const { anotacaoId, texto } = request.data;

    if (!anotacaoId || !texto) {
      throw new HttpsError("invalid-argument", "anotacaoId e texto são obrigatórios");
    }

    const anotacaoRef = db.collection("anotacoes_alunos").doc(anotacaoId);
    const anotacaoDoc = await anotacaoRef.get();

    if (!anotacaoDoc.exists) {
      throw new HttpsError("not-found", "Anotação não encontrada");
    }

    const anotacaoData = anotacaoDoc.data();
    if (anotacaoData?.mentorId !== auth.uid) {
      throw new HttpsError("permission-denied", "Sem permissão");
    }

    await anotacaoRef.update({
      texto,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  });

export const deletarAnotacaoAluno = onCall(
  { region: "southamerica-east1" },
  async (request) => {
    const auth = await getAuthContextV2(request);
    requireRole(auth, "mentor");

    const { anotacaoId } = request.data;

    if (!anotacaoId) {
      throw new HttpsError("invalid-argument", "anotacaoId é obrigatório");
    }

    const anotacaoRef = db.collection("anotacoes_alunos").doc(anotacaoId);
    const anotacaoDoc = await anotacaoRef.get();

    if (!anotacaoDoc.exists) {
      throw new HttpsError("not-found", "Anotação não encontrada");
    }

    const anotacaoData = anotacaoDoc.data();
    if (anotacaoData?.mentorId !== auth.uid) {
      throw new HttpsError("permission-denied", "Sem permissão");
    }

    await anotacaoRef.delete();

    return { success: true };
  });
