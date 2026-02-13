"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletarAnotacaoAluno = exports.editarAnotacaoAluno = exports.criarAnotacaoAluno = exports.getAnotacoesAluno = exports.removerAlerta = exports.marcarAlertaLido = exports.getAlertas = exports.saveConfigAlertas = exports.getConfigAlertas = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("../utils/auth");
const db = (0, firestore_1.getFirestore)();
// ==================== ALERTAS ====================
exports.getConfigAlertas = (0, https_1.onCall)({ region: "southamerica-east1" }, async (request) => {
    const auth = await (0, auth_1.getAuthContextV2)(request);
    (0, auth_1.requireRole)(auth, "mentor");
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
exports.saveConfigAlertas = (0, https_1.onCall)({ region: "southamerica-east1" }, async (request) => {
    const auth = await (0, auth_1.getAuthContextV2)(request);
    (0, auth_1.requireRole)(auth, "mentor");
    const { alertas } = request.data;
    if (!alertas || !Array.isArray(alertas)) {
        throw new https_1.HttpsError("invalid-argument", "Alertas inválidos");
    }
    await db
        .collection("config_alertas")
        .doc(auth.uid)
        .set({
        alertas,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { success: true };
});
exports.getAlertas = (0, https_1.onCall)({ region: "southamerica-east1" }, async (request) => {
    const auth = await (0, auth_1.getAuthContextV2)(request);
    (0, auth_1.requireRole)(auth, "mentor");
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
exports.marcarAlertaLido = (0, https_1.onCall)({ region: "southamerica-east1" }, async (request) => {
    const auth = await (0, auth_1.getAuthContextV2)(request);
    (0, auth_1.requireRole)(auth, "mentor");
    const { alertaId } = request.data;
    if (!alertaId) {
        throw new https_1.HttpsError("invalid-argument", "alertaId é obrigatório");
    }
    const alertaRef = db.collection("alertas").doc(alertaId);
    const alertaDoc = await alertaRef.get();
    if (!alertaDoc.exists) {
        throw new https_1.HttpsError("not-found", "Alerta não encontrado");
    }
    const alertaData = alertaDoc.data();
    if (alertaData?.mentorId !== auth.uid) {
        throw new https_1.HttpsError("permission-denied", "Sem permissão");
    }
    await alertaRef.update({
        lido: true,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { success: true };
});
exports.removerAlerta = (0, https_1.onCall)({ region: "southamerica-east1" }, async (request) => {
    const auth = await (0, auth_1.getAuthContextV2)(request);
    (0, auth_1.requireRole)(auth, "mentor");
    const { alertaId } = request.data;
    if (!alertaId) {
        throw new https_1.HttpsError("invalid-argument", "alertaId é obrigatório");
    }
    const alertaRef = db.collection("alertas").doc(alertaId);
    const alertaDoc = await alertaRef.get();
    if (!alertaDoc.exists) {
        throw new https_1.HttpsError("not-found", "Alerta não encontrado");
    }
    const alertaData = alertaDoc.data();
    if (alertaData?.mentorId !== auth.uid) {
        throw new https_1.HttpsError("permission-denied", "Sem permissão");
    }
    await alertaRef.delete();
    return { success: true };
});
// ==================== ANOTAÇÕES ====================
exports.getAnotacoesAluno = (0, https_1.onCall)({ region: "southamerica-east1" }, async (request) => {
    const auth = await (0, auth_1.getAuthContextV2)(request);
    (0, auth_1.requireRole)(auth, "mentor");
    const { alunoId } = request.data;
    if (!alunoId) {
        throw new https_1.HttpsError("invalid-argument", "alunoId é obrigatório");
    }
    // Verificar se o aluno pertence ao mentor
    const alunoDoc = await db.collection("alunos").doc(alunoId).get();
    if (!alunoDoc.exists) {
        throw new https_1.HttpsError("not-found", "Aluno não encontrado");
    }
    const alunoData = alunoDoc.data();
    if (alunoData?.mentorId !== auth.uid && alunoData?.mentorId !== "todos") {
        throw new https_1.HttpsError("permission-denied", "Sem permissão");
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
exports.criarAnotacaoAluno = (0, https_1.onCall)({ region: "southamerica-east1" }, async (request) => {
    const auth = await (0, auth_1.getAuthContextV2)(request);
    (0, auth_1.requireRole)(auth, "mentor");
    const { alunoId, texto } = request.data;
    if (!alunoId || !texto) {
        throw new https_1.HttpsError("invalid-argument", "alunoId e texto são obrigatórios");
    }
    // Verificar se o aluno pertence ao mentor
    const alunoDoc = await db.collection("alunos").doc(alunoId).get();
    if (!alunoDoc.exists) {
        throw new https_1.HttpsError("not-found", "Aluno não encontrado");
    }
    const alunoData = alunoDoc.data();
    if (alunoData?.mentorId !== auth.uid && alunoData?.mentorId !== "todos") {
        throw new https_1.HttpsError("permission-denied", "Sem permissão");
    }
    const anotacaoRef = await db.collection("anotacoes_alunos").add({
        mentorId: auth.uid,
        alunoId,
        texto,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { id: anotacaoRef.id, success: true };
});
exports.editarAnotacaoAluno = (0, https_1.onCall)({ region: "southamerica-east1" }, async (request) => {
    const auth = await (0, auth_1.getAuthContextV2)(request);
    (0, auth_1.requireRole)(auth, "mentor");
    const { anotacaoId, texto } = request.data;
    if (!anotacaoId || !texto) {
        throw new https_1.HttpsError("invalid-argument", "anotacaoId e texto são obrigatórios");
    }
    const anotacaoRef = db.collection("anotacoes_alunos").doc(anotacaoId);
    const anotacaoDoc = await anotacaoRef.get();
    if (!anotacaoDoc.exists) {
        throw new https_1.HttpsError("not-found", "Anotação não encontrada");
    }
    const anotacaoData = anotacaoDoc.data();
    if (anotacaoData?.mentorId !== auth.uid) {
        throw new https_1.HttpsError("permission-denied", "Sem permissão");
    }
    await anotacaoRef.update({
        texto,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { success: true };
});
exports.deletarAnotacaoAluno = (0, https_1.onCall)({ region: "southamerica-east1" }, async (request) => {
    const auth = await (0, auth_1.getAuthContextV2)(request);
    (0, auth_1.requireRole)(auth, "mentor");
    const { anotacaoId } = request.data;
    if (!anotacaoId) {
        throw new https_1.HttpsError("invalid-argument", "anotacaoId é obrigatório");
    }
    const anotacaoRef = db.collection("anotacoes_alunos").doc(anotacaoId);
    const anotacaoDoc = await anotacaoRef.get();
    if (!anotacaoDoc.exists) {
        throw new https_1.HttpsError("not-found", "Anotação não encontrada");
    }
    const anotacaoData = anotacaoDoc.data();
    if (anotacaoData?.mentorId !== auth.uid) {
        throw new https_1.HttpsError("permission-denied", "Sem permissão");
    }
    await anotacaoRef.delete();
    return { success: true };
});
//# sourceMappingURL=mentor-features.js.map