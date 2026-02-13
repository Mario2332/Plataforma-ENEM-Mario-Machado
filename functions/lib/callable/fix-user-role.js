"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncMentorRole = exports.fixUserRole = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("../utils/auth");
const db = (0, firestore_1.getFirestore)();
/**
 * Função administrativa para corrigir a role de um usuário
 * Apenas o gestor pode executar esta função
 */
exports.fixUserRole = (0, https_1.onCall)({ region: "southamerica-east1" }, async (request) => {
    const auth = await (0, auth_1.getAuthContextV2)(request);
    (0, auth_1.requireRole)(auth, "gestor");
    const { userId, newRole } = request.data;
    if (!userId || !newRole) {
        throw new https_1.HttpsError("invalid-argument", "userId e newRole são obrigatórios");
    }
    if (!["gestor", "mentor", "aluno"].includes(newRole)) {
        throw new https_1.HttpsError("invalid-argument", "Role inválida. Use: gestor, mentor ou aluno");
    }
    try {
        // Atualizar a role na coleção users
        await db.collection("users").doc(userId).update({
            role: newRole,
            updatedAt: new Date(),
        });
        return {
            success: true,
            message: `Role do usuário ${userId} atualizada para ${newRole}`,
        };
    }
    catch (error) {
        throw new https_1.HttpsError("internal", `Erro ao atualizar role: ${error.message}`);
    }
});
/**
 * Função administrativa para sincronizar role baseada na coleção mentores
 * Se o usuário existe na coleção mentores, define role como "mentor"
 */
exports.syncMentorRole = (0, https_1.onCall)({ region: "southamerica-east1" }, async (request) => {
    const auth = await (0, auth_1.getAuthContextV2)(request);
    (0, auth_1.requireRole)(auth, "gestor");
    const { email } = request.data;
    if (!email) {
        throw new https_1.HttpsError("invalid-argument", "Email é obrigatório");
    }
    try {
        // Buscar mentor pelo email
        const mentoresSnapshot = await db
            .collection("mentores")
            .where("email", "==", email)
            .limit(1)
            .get();
        if (mentoresSnapshot.empty) {
            throw new https_1.HttpsError("not-found", `Mentor com email ${email} não encontrado`);
        }
        const mentorDoc = mentoresSnapshot.docs[0];
        const mentorId = mentorDoc.id;
        // Buscar usuário pelo email
        const usersSnapshot = await db
            .collection("users")
            .where("email", "==", email)
            .limit(1)
            .get();
        if (usersSnapshot.empty) {
            throw new https_1.HttpsError("not-found", `Usuário com email ${email} não encontrado na coleção users`);
        }
        const userDoc = usersSnapshot.docs[0];
        const userId = userDoc.id;
        // Atualizar role para mentor
        await db.collection("users").doc(userId).update({
            role: "mentor",
            updatedAt: new Date(),
        });
        return {
            success: true,
            message: `Role do usuário ${email} sincronizada para "mentor"`,
            userId,
            mentorId,
        };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", `Erro ao sincronizar role: ${error.message}`);
    }
});
//# sourceMappingURL=fix-user-role.js.map