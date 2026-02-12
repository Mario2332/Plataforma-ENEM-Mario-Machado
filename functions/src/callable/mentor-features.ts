import * as functions from "firebase-functions/v2";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuthContext, requireRole } from "../utils/auth";

const db = getFirestore();

// ==================== ALERTAS ====================

export const getConfigAlertas = functions
  .region("southamerica-east1")
  .https.onCall(async (request) => {
    const auth = await getAuthContext(request);
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

export const saveConfigAlertas = functions
  .region("southamerica-east1")
  .https.onCall(async (request) => {
    const auth = await getAuthContext(request);
    requireRole(auth, "mentor");

    const { alertas } = request.data;

    if (!alertas || !Array.isArray(alertas)) {
      throw new functions.https.HttpsError("invalid-argument", "Alertas inválidos");
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

export const getAlertas = functions
  .region("southamerica-east1")
  .https.onCall(async (request) => {
    const auth = await getAuthContext(request);
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

export const marcarAlertaLido = functions
  .region("southamerica-east1")
  .https.onCall(async (request) => {
    const auth = await getAuthContext(request);
    requireRole(auth, "mentor");

    const { alertaId } = request.data;

    if (!alertaId) {
      throw new functions.https.HttpsError("invalid-argument", "alertaId é obrigatório");
    }

    const alertaRef = db.collection("alertas").doc(alertaId);
    const alertaDoc = await alertaRef.get();

    if (!alertaDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Alerta não encontrado");
    }

    const alertaData = alertaDoc.data();
    if (alertaData?.mentorId !== auth.uid) {
      throw new functions.https.HttpsError("permission-denied", "Sem permissão");
    }

    await alertaRef.update({
      lido: true,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  });

export const removerAlerta = functions
  .region("southamerica-east1")
  .https.onCall(async (request) => {
    const auth = await getAuthContext(request);
    requireRole(auth, "mentor");

    const { alertaId } = request.data;

    if (!alertaId) {
      throw new functions.https.HttpsError("invalid-argument", "alertaId é obrigatório");
    }

    const alertaRef = db.collection("alertas").doc(alertaId);
    const alertaDoc = await alertaRef.get();

    if (!alertaDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Alerta não encontrado");
    }

    const alertaData = alertaDoc.data();
    if (alertaData?.mentorId !== auth.uid) {
      throw new functions.https.HttpsError("permission-denied", "Sem permissão");
    }

    await alertaRef.delete();

    return { success: true };
  });

// ==================== ANOTAÇÕES ====================

export const getAnotacoesAluno = functions
  .region("southamerica-east1")
  .https.onCall(async (request) => {
    const auth = await getAuthContext(request);
    requireRole(auth, "mentor");

    const { alunoId } = request.data;

    if (!alunoId) {
      throw new functions.https.HttpsError("invalid-argument", "alunoId é obrigatório");
    }

    // Verificar se o aluno pertence ao mentor
    const alunoDoc = await db.collection("alunos").doc(alunoId).get();
    if (!alunoDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Aluno não encontrado");
    }

    const alunoData = alunoDoc.data();
    if (alunoData?.mentorId !== auth.uid && alunoData?.mentorId !== "todos") {
      throw new functions.https.HttpsError("permission-denied", "Sem permissão");
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

export const criarAnotacaoAluno = functions
  .region("southamerica-east1")
  .https.onCall(async (request) => {
    const auth = await getAuthContext(request);
    requireRole(auth, "mentor");

    const { alunoId, texto } = request.data;

    if (!alunoId || !texto) {
      throw new functions.https.HttpsError("invalid-argument", "alunoId e texto são obrigatórios");
    }

    // Verificar se o aluno pertence ao mentor
    const alunoDoc = await db.collection("alunos").doc(alunoId).get();
    if (!alunoDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Aluno não encontrado");
    }

    const alunoData = alunoDoc.data();
    if (alunoData?.mentorId !== auth.uid && alunoData?.mentorId !== "todos") {
      throw new functions.https.HttpsError("permission-denied", "Sem permissão");
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

export const editarAnotacaoAluno = functions
  .region("southamerica-east1")
  .https.onCall(async (request) => {
    const auth = await getAuthContext(request);
    requireRole(auth, "mentor");

    const { anotacaoId, texto } = request.data;

    if (!anotacaoId || !texto) {
      throw new functions.https.HttpsError("invalid-argument", "anotacaoId e texto são obrigatórios");
    }

    const anotacaoRef = db.collection("anotacoes_alunos").doc(anotacaoId);
    const anotacaoDoc = await anotacaoRef.get();

    if (!anotacaoDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Anotação não encontrada");
    }

    const anotacaoData = anotacaoDoc.data();
    if (anotacaoData?.mentorId !== auth.uid) {
      throw new functions.https.HttpsError("permission-denied", "Sem permissão");
    }

    await anotacaoRef.update({
      texto,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  });

export const deletarAnotacaoAluno = functions
  .region("southamerica-east1")
  .https.onCall(async (request) => {
    const auth = await getAuthContext(request);
    requireRole(auth, "mentor");

    const { anotacaoId } = request.data;

    if (!anotacaoId) {
      throw new functions.https.HttpsError("invalid-argument", "anotacaoId é obrigatório");
    }

    const anotacaoRef = db.collection("anotacoes_alunos").doc(anotacaoId);
    const anotacaoDoc = await anotacaoRef.get();

    if (!anotacaoDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Anotação não encontrada");
    }

    const anotacaoData = anotacaoDoc.data();
    if (anotacaoData?.mentorId !== auth.uid) {
      throw new functions.https.HttpsError("permission-denied", "Sem permissão");
    }

    await anotacaoRef.delete();

    return { success: true };
  });
