"use strict";
/**
 * Cloud Functions para gestão de usuários dentro de mentorias multi-tenant
 *
 * Permite ao gestor:
 * - Criar mentores dentro de uma mentoria específica
 * - Criar alunos dentro de uma mentoria específica
 * - Listar mentores/alunos de uma mentoria
 * - Atualizar/deletar mentores/alunos de uma mentoria
 *
 * Cada usuário criado aqui recebe o campo `mentoriaId` no documento `users`,
 * permitindo que o sistema detecte automaticamente o modo (legacy vs multi-tenant).
 *
 * NÃO afeta o modo legacy de nenhuma forma.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.mentoriaUsuariosFunctions = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("../utils/auth");
const data_service_1 = require("../utils/data-service");
const mentoria_1 = require("../types/mentoria");
const db = admin.firestore();
/**
 * Validar que a mentoria existe e está ativa
 */
async function validateMentoria(mentoriaId) {
    if (mentoriaId === data_service_1.LEGACY_MENTORIA_ID) {
        throw new functions.https.HttpsError("permission-denied", "Use as funções do gestor padrão para gerenciar a mentoria legacy");
    }
    const mentoriaDoc = await db.doc(`mentorias/${mentoriaId}`).get();
    if (!mentoriaDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Mentoria não encontrada");
    }
    const mentoriaData = mentoriaDoc.data();
    if (mentoriaData.status !== "ativo") {
        throw new functions.https.HttpsError("failed-precondition", `Mentoria está ${mentoriaData.status}. Apenas mentorias ativas podem receber novos usuários.`);
    }
    return mentoriaData;
}
/**
 * Verificar limites do plano
 */
async function checkLimites(mentoriaId, mentoriaData, tipo) {
    const service = new data_service_1.DataService(mentoriaId);
    await service.loadConfig();
    const snapshot = await service.collection(tipo).get();
    const ativos = snapshot.docs.filter((d) => d.data().ativo !== false).length;
    const plano = mentoriaData.plano;
    const limites = mentoriaData.limites || mentoria_1.LIMITES_POR_PLANO[plano] || mentoria_1.LIMITES_POR_PLANO.basico;
    const maxKey = tipo === "alunos" ? "maxAlunos" : "maxMentores";
    const max = limites[maxKey] || mentoria_1.LIMITES_POR_PLANO.basico[maxKey];
    if (ativos >= max) {
        throw new functions.https.HttpsError("resource-exhausted", `Limite de ${tipo} atingido (${ativos}/${max}). Faça upgrade do plano para adicionar mais.`);
    }
}
// ============================================
// MENTORES
// ============================================
/**
 * Criar mentor dentro de uma mentoria multi-tenant
 */
const createMentorInMentoria = functions
    .region("southamerica-east1")
    .https.onCall(async (data, context) => {
    const auth = await (0, auth_1.getAuthContext)(context);
    (0, auth_1.requireRole)(auth, "gestor");
    const { mentoriaId, email, password, nome } = data;
    if (!mentoriaId || !email || !password || !nome) {
        throw new functions.https.HttpsError("invalid-argument", "mentoriaId, email, password e nome são obrigatórios");
    }
    const mentoriaData = await validateMentoria(mentoriaId);
    await checkLimites(mentoriaId, mentoriaData, "mentores");
    try {
        // Criar usuário no Firebase Auth
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: nome,
        });
        // Criar documento na coleção global `users` COM mentoriaId
        await db.collection("users").doc(userRecord.uid).set({
            uid: userRecord.uid,
            email,
            name: nome,
            role: "mentor",
            mentoriaId, // <-- Campo chave para detecção de modo
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastSignedIn: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Criar documento do mentor na subcoleção da mentoria
        const service = new data_service_1.DataService(mentoriaId);
        await service.loadConfig();
        await service.collection("mentores").doc(userRecord.uid).set({
            userId: userRecord.uid,
            gestorId: auth.uid,
            mentoriaId,
            nome,
            email,
            nomePlataforma: mentoriaData.branding?.nomePlataforma || mentoriaData.nome,
            logoUrl: mentoriaData.branding?.logo || null,
            corPrincipal: mentoriaData.branding?.corPrimaria || "#3b82f6",
            ativo: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        functions.logger.info(`Mentor ${userRecord.uid} criado na mentoria ${mentoriaId}`);
        return { success: true, mentorId: userRecord.uid };
    }
    catch (error) {
        if (error.code === "auth/email-already-exists") {
            throw new functions.https.HttpsError("already-exists", "Já existe um usuário com este email");
        }
        functions.logger.error("Erro ao criar mentor na mentoria:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
/**
 * Listar mentores de uma mentoria multi-tenant
 */
const getMentoresInMentoria = functions
    .region("southamerica-east1")
    .https.onCall(async (data, context) => {
    const auth = await (0, auth_1.getAuthContext)(context);
    (0, auth_1.requireRole)(auth, "gestor");
    const { mentoriaId } = data;
    if (!mentoriaId) {
        throw new functions.https.HttpsError("invalid-argument", "mentoriaId é obrigatório");
    }
    if (mentoriaId === data_service_1.LEGACY_MENTORIA_ID) {
        // Para legacy, usar a coleção raiz
        const snapshot = await db.collection("mentores").get();
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), mentoriaId: data_service_1.LEGACY_MENTORIA_ID }));
    }
    const service = new data_service_1.DataService(mentoriaId);
    await service.loadConfig();
    const snapshot = await service.collection("mentores").get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), mentoriaId }));
});
/**
 * Atualizar mentor dentro de uma mentoria
 */
const updateMentorInMentoria = functions
    .region("southamerica-east1")
    .https.onCall(async (data, context) => {
    const auth = await (0, auth_1.getAuthContext)(context);
    (0, auth_1.requireRole)(auth, "gestor");
    const { mentoriaId, mentorId, nome, email, ativo } = data;
    if (!mentoriaId || !mentorId) {
        throw new functions.https.HttpsError("invalid-argument", "mentoriaId e mentorId são obrigatórios");
    }
    if (mentoriaId === data_service_1.LEGACY_MENTORIA_ID) {
        throw new functions.https.HttpsError("permission-denied", "Use as funções padrão para a mentoria legacy");
    }
    try {
        const service = new data_service_1.DataService(mentoriaId);
        await service.loadConfig();
        const updates = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (nome !== undefined)
            updates.nome = nome;
        if (email !== undefined)
            updates.email = email;
        if (ativo !== undefined)
            updates.ativo = ativo;
        await service.collection("mentores").doc(mentorId).update(updates);
        // Atualizar no Firebase Auth e users
        if (email !== undefined) {
            await admin.auth().updateUser(mentorId, { email });
        }
        if (nome !== undefined) {
            await db.collection("users").doc(mentorId).update({
                name: nome,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        return { success: true };
    }
    catch (error) {
        functions.logger.error("Erro ao atualizar mentor na mentoria:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
/**
 * Deletar mentor de uma mentoria
 */
const deleteMentorInMentoria = functions
    .region("southamerica-east1")
    .https.onCall(async (data, context) => {
    const auth = await (0, auth_1.getAuthContext)(context);
    (0, auth_1.requireRole)(auth, "gestor");
    const { mentoriaId, mentorId } = data;
    if (!mentoriaId || !mentorId) {
        throw new functions.https.HttpsError("invalid-argument", "mentoriaId e mentorId são obrigatórios");
    }
    if (mentoriaId === data_service_1.LEGACY_MENTORIA_ID) {
        throw new functions.https.HttpsError("permission-denied", "Use as funções padrão para a mentoria legacy");
    }
    try {
        const service = new data_service_1.DataService(mentoriaId);
        await service.loadConfig();
        // Deletar da subcoleção da mentoria
        await service.collection("mentores").doc(mentorId).delete();
        // Deletar documento global users
        await db.collection("users").doc(mentorId).delete();
        // Deletar do Firebase Auth
        await admin.auth().deleteUser(mentorId);
        functions.logger.info(`Mentor ${mentorId} deletado da mentoria ${mentoriaId}`);
        return { success: true };
    }
    catch (error) {
        functions.logger.error("Erro ao deletar mentor da mentoria:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
// ============================================
// ALUNOS
// ============================================
/**
 * Criar aluno dentro de uma mentoria multi-tenant
 */
const createAlunoInMentoria = functions
    .region("southamerica-east1")
    .https.onCall(async (data, context) => {
    const auth = await (0, auth_1.getAuthContext)(context);
    (0, auth_1.requireRole)(auth, "gestor");
    const { mentoriaId, email, password, nome, mentorId } = data;
    if (!mentoriaId || !email || !password || !nome) {
        throw new functions.https.HttpsError("invalid-argument", "mentoriaId, email, password e nome são obrigatórios");
    }
    const mentoriaData = await validateMentoria(mentoriaId);
    await checkLimites(mentoriaId, mentoriaData, "alunos");
    try {
        // Criar usuário no Firebase Auth
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: nome,
        });
        // Criar documento na coleção global `users` COM mentoriaId
        await db.collection("users").doc(userRecord.uid).set({
            uid: userRecord.uid,
            email,
            name: nome,
            role: "aluno",
            mentoriaId, // <-- Campo chave para detecção de modo
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastSignedIn: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Criar documento do aluno na subcoleção da mentoria
        const service = new data_service_1.DataService(mentoriaId);
        await service.loadConfig();
        await service.collection("alunos").doc(userRecord.uid).set({
            userId: userRecord.uid,
            mentoriaId,
            mentorId: mentorId || null,
            nome,
            email,
            celular: null,
            plano: null,
            ativo: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Inicializar ranking na subcoleção da mentoria
        await service.collection("ranking").doc(userRecord.uid).set({
            nivel: 1,
            pontosSemanais: 0,
            ultimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
            criadoEm: admin.firestore.FieldValue.serverTimestamp(),
        });
        functions.logger.info(`Aluno ${userRecord.uid} criado na mentoria ${mentoriaId}`);
        return { success: true, alunoId: userRecord.uid };
    }
    catch (error) {
        if (error.code === "auth/email-already-exists") {
            throw new functions.https.HttpsError("already-exists", "Já existe um usuário com este email");
        }
        functions.logger.error("Erro ao criar aluno na mentoria:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
/**
 * Listar alunos de uma mentoria multi-tenant
 */
const getAlunosInMentoria = functions
    .region("southamerica-east1")
    .https.onCall(async (data, context) => {
    const auth = await (0, auth_1.getAuthContext)(context);
    (0, auth_1.requireRole)(auth, "gestor");
    const { mentoriaId } = data;
    if (!mentoriaId) {
        throw new functions.https.HttpsError("invalid-argument", "mentoriaId é obrigatório");
    }
    if (mentoriaId === data_service_1.LEGACY_MENTORIA_ID) {
        // Para legacy, usar a coleção raiz
        const snapshot = await db.collection("alunos").get();
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), mentoriaId: data_service_1.LEGACY_MENTORIA_ID }));
    }
    const service = new data_service_1.DataService(mentoriaId);
    await service.loadConfig();
    const snapshot = await service.collection("alunos").get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), mentoriaId }));
});
/**
 * Atualizar aluno dentro de uma mentoria
 */
const updateAlunoInMentoria = functions
    .region("southamerica-east1")
    .https.onCall(async (data, context) => {
    const auth = await (0, auth_1.getAuthContext)(context);
    (0, auth_1.requireRole)(auth, "gestor");
    const { mentoriaId, alunoId, nome, email, celular, plano, ativo, mentorId } = data;
    if (!mentoriaId || !alunoId) {
        throw new functions.https.HttpsError("invalid-argument", "mentoriaId e alunoId são obrigatórios");
    }
    if (mentoriaId === data_service_1.LEGACY_MENTORIA_ID) {
        throw new functions.https.HttpsError("permission-denied", "Use as funções padrão para a mentoria legacy");
    }
    try {
        const service = new data_service_1.DataService(mentoriaId);
        await service.loadConfig();
        const updates = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (nome !== undefined)
            updates.nome = nome;
        if (email !== undefined)
            updates.email = email;
        if (celular !== undefined)
            updates.celular = celular;
        if (plano !== undefined)
            updates.plano = plano;
        if (ativo !== undefined)
            updates.ativo = ativo;
        if (mentorId !== undefined)
            updates.mentorId = mentorId;
        await service.collection("alunos").doc(alunoId).update(updates);
        // Atualizar no Firebase Auth e users
        if (email !== undefined) {
            await admin.auth().updateUser(alunoId, { email });
        }
        if (nome !== undefined) {
            await db.collection("users").doc(alunoId).update({
                name: nome,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        return { success: true };
    }
    catch (error) {
        functions.logger.error("Erro ao atualizar aluno na mentoria:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
/**
 * Deletar aluno de uma mentoria
 */
const deleteAlunoInMentoria = functions
    .region("southamerica-east1")
    .https.onCall(async (data, context) => {
    const auth = await (0, auth_1.getAuthContext)(context);
    (0, auth_1.requireRole)(auth, "gestor");
    const { mentoriaId, alunoId } = data;
    if (!mentoriaId || !alunoId) {
        throw new functions.https.HttpsError("invalid-argument", "mentoriaId e alunoId são obrigatórios");
    }
    if (mentoriaId === data_service_1.LEGACY_MENTORIA_ID) {
        throw new functions.https.HttpsError("permission-denied", "Use as funções padrão para a mentoria legacy");
    }
    try {
        const service = new data_service_1.DataService(mentoriaId);
        await service.loadConfig();
        // Deletar subcoleções do aluno dentro da mentoria
        const alunoDocRef = service.doc("alunos", alunoId);
        const subcollections = await alunoDocRef.listCollections();
        for (const subcol of subcollections) {
            const docs = await subcol.listDocuments();
            for (const docRef of docs) {
                await docRef.delete();
            }
        }
        // Deletar documento do aluno da mentoria
        await service.collection("alunos").doc(alunoId).delete();
        // Deletar ranking da mentoria
        try {
            await service.collection("ranking").doc(alunoId).delete();
        }
        catch (e) { /* ignore */ }
        // Deletar documento global users
        await db.collection("users").doc(alunoId).delete();
        // Deletar do Firebase Auth
        try {
            await admin.auth().deleteUser(alunoId);
        }
        catch (authError) {
            if (authError.code !== "auth/user-not-found") {
                throw authError;
            }
        }
        functions.logger.info(`Aluno ${alunoId} deletado da mentoria ${mentoriaId}`);
        return { success: true };
    }
    catch (error) {
        functions.logger.error("Erro ao deletar aluno da mentoria:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
// Exportar todas as funções
exports.mentoriaUsuariosFunctions = {
    createMentorInMentoria,
    getMentoresInMentoria,
    updateMentorInMentoria,
    deleteMentorInMentoria,
    createAlunoInMentoria,
    getAlunosInMentoria,
    updateAlunoInMentoria,
    deleteAlunoInMentoria,
};
//# sourceMappingURL=mentoria-usuarios.js.map