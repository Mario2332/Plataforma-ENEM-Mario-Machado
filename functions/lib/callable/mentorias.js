"use strict";
/**
 * Cloud Functions para gestão de mentorias (Multi-Tenant SaaS)
 *
 * Estas funções são usadas EXCLUSIVAMENTE pelo gestor para:
 * - Criar/editar/listar mentorias white label
 * - Obter estatísticas de cada mentoria
 * - Gerenciar o dashboard unificado
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
exports.mentoriasFunctions = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("../utils/auth");
const data_service_1 = require("../utils/data-service");
const mentoria_1 = require("../types/mentoria");
const db = admin.firestore();
/**
 * Listar todas as mentorias (incluindo a legacy)
 */
const getMenutorias = functions
    .region("southamerica-east1")
    .https.onCall(async (_data, context) => {
    const auth = await (0, auth_1.getAuthContext)(context);
    (0, auth_1.requireRole)(auth, "gestor");
    const mentorias = await (0, data_service_1.listAllMentorias)();
    // Sempre incluir a mentoria legacy mesmo que não exista no Firestore
    const hasLegacy = mentorias.some((m) => m.id === data_service_1.LEGACY_MENTORIA_ID);
    if (!hasLegacy) {
        // Contar alunos e mentores da mentoria legacy (coleções raiz)
        const alunosCount = await db.collection("alunos").count().get();
        const mentoresCount = await db.collection("mentores").count().get();
        mentorias.unshift({
            id: data_service_1.LEGACY_MENTORIA_ID,
            nome: "Mentoria Mário Machado",
            modo: "legacy",
            status: "ativo",
            plano: "enterprise",
            branding: {
                nomePlataforma: "Mentoria Mário Machado",
                corPrimaria: "#3b82f6",
                dominio: "app.mentoriamariomachado.com.br",
            },
            limites: {
                ...mentoria_1.LIMITES_POR_PLANO.enterprise,
            },
            gestorId: auth.uid,
            gestorNome: "Mário Machado",
            gestorEmail: auth.email,
            criadoEm: admin.firestore.Timestamp.now(),
            atualizadoEm: admin.firestore.Timestamp.now(),
        });
    }
    return mentorias.map((m) => ({
        ...m,
        criadoEm: m.criadoEm?.toDate?.() || new Date(),
        atualizadoEm: m.atualizadoEm?.toDate?.() || new Date(),
    }));
});
/**
 * Obter estatísticas de uma mentoria específica
 */
const getMentoriaStatsFunc = functions
    .region("southamerica-east1")
    .https.onCall(async (data, context) => {
    const auth = await (0, auth_1.getAuthContext)(context);
    (0, auth_1.requireRole)(auth, "gestor");
    const { mentoriaId } = data;
    if (!mentoriaId) {
        throw new functions.https.HttpsError("invalid-argument", "mentoriaId é obrigatório");
    }
    const stats = await (0, data_service_1.getMentoriaStats)(mentoriaId);
    return stats;
});
/**
 * Obter dashboard unificado com estatísticas de todas as mentorias
 */
const getDashboardUnificado = functions
    .region("southamerica-east1")
    .https.onCall(async (_data, context) => {
    const auth = await (0, auth_1.getAuthContext)(context);
    (0, auth_1.requireRole)(auth, "gestor");
    const mentorias = await (0, data_service_1.listAllMentorias)();
    // Estatísticas da mentoria legacy (coleções raiz)
    const alunosLegacy = await db.collection("alunos").get();
    const mentoresLegacy = await db.collection("mentores").get();
    let alunosLegacyAtivos = 0;
    let alunosLegacyInativos = 0;
    alunosLegacy.docs.forEach((doc) => {
        const data = doc.data();
        if (data.ativo === false) {
            alunosLegacyInativos++;
        }
        else {
            alunosLegacyAtivos++;
        }
    });
    const mentoriasStats = [{
            mentoriaId: data_service_1.LEGACY_MENTORIA_ID,
            mentoriaNome: "Mentoria Mário Machado",
            modo: "legacy",
            status: "ativo",
            plano: "enterprise",
            alunosAtivos: alunosLegacyAtivos,
            alunosInativos: alunosLegacyInativos,
            mentoresAtivos: mentoresLegacy.size,
        }];
    // Estatísticas de cada mentoria multi-tenant
    let totalAlunosMultiTenant = 0;
    let totalMentoresMultiTenant = 0;
    for (const mentoria of mentorias) {
        if (mentoria.id === data_service_1.LEGACY_MENTORIA_ID)
            continue;
        try {
            const stats = await (0, data_service_1.getMentoriaStats)(mentoria.id);
            mentoriasStats.push({
                mentoriaId: mentoria.id,
                mentoriaNome: mentoria.nome,
                modo: mentoria.modo,
                status: mentoria.status,
                plano: mentoria.plano,
                alunosAtivos: stats.alunosAtivos,
                alunosInativos: stats.alunosInativos,
                mentoresAtivos: stats.mentoresAtivos,
            });
            totalAlunosMultiTenant += stats.alunosAtivos + stats.alunosInativos;
            totalMentoresMultiTenant += stats.mentoresAtivos;
        }
        catch (error) {
            functions.logger.error(`Erro ao obter stats da mentoria ${mentoria.id}:`, error);
        }
    }
    return {
        totalMentorias: mentoriasStats.length,
        mentoriasAtivas: mentoriasStats.filter((m) => m.status === "ativo").length,
        totalAlunos: alunosLegacyAtivos + alunosLegacyInativos + totalAlunosMultiTenant,
        totalMentores: mentoresLegacy.size + totalMentoresMultiTenant,
        mentorias: mentoriasStats,
    };
});
/**
 * Criar uma nova mentoria white label
 */
const criarMentoria = functions
    .region("southamerica-east1")
    .https.onCall(async (data, context) => {
    const auth = await (0, auth_1.getAuthContext)(context);
    (0, auth_1.requireRole)(auth, "gestor");
    const { nome, plano, branding, limites } = data;
    if (!nome || !plano || !branding?.nomePlataforma) {
        throw new functions.https.HttpsError("invalid-argument", "nome, plano e branding.nomePlataforma são obrigatórios");
    }
    // Validar plano
    if (!["basico", "pro", "enterprise"].includes(plano)) {
        throw new functions.https.HttpsError("invalid-argument", "Plano inválido");
    }
    // Gerar ID slug a partir do nome
    const id = nome
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    // Verificar se já existe
    const existingDoc = await db.doc(`mentorias/${id}`).get();
    if (existingDoc.exists) {
        throw new functions.https.HttpsError("already-exists", "Já existe uma mentoria com este nome");
    }
    await (0, data_service_1.createMentoria)(id, {
        nome,
        plano: plano,
        branding,
        limites,
        gestorId: auth.uid,
        gestorNome: data.gestorNome || "",
        gestorEmail: data.gestorEmail || auth.email,
    });
    return { id, success: true };
});
/**
 * Atualizar configuração de uma mentoria
 */
const atualizarMentoria = functions
    .region("southamerica-east1")
    .https.onCall(async (data, context) => {
    const auth = await (0, auth_1.getAuthContext)(context);
    (0, auth_1.requireRole)(auth, "gestor");
    const { mentoriaId, ...updates } = data;
    if (!mentoriaId) {
        throw new functions.https.HttpsError("invalid-argument", "mentoriaId é obrigatório");
    }
    // Não permitir alterar a mentoria legacy
    if (mentoriaId === data_service_1.LEGACY_MENTORIA_ID) {
        throw new functions.https.HttpsError("permission-denied", "A mentoria legacy não pode ser alterada por aqui");
    }
    const mentoriaDoc = await db.doc(`mentorias/${mentoriaId}`).get();
    if (!mentoriaDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Mentoria não encontrada");
    }
    await (0, data_service_1.updateMentoria)(mentoriaId, updates);
    return { success: true };
});
/**
 * Suspender/reativar uma mentoria
 */
const toggleMentoriaStatus = functions
    .region("southamerica-east1")
    .https.onCall(async (data, context) => {
    const auth = await (0, auth_1.getAuthContext)(context);
    (0, auth_1.requireRole)(auth, "gestor");
    const { mentoriaId } = data;
    if (!mentoriaId || mentoriaId === data_service_1.LEGACY_MENTORIA_ID) {
        throw new functions.https.HttpsError("invalid-argument", "mentoriaId inválido ou mentoria legacy");
    }
    const mentoriaDoc = await db.doc(`mentorias/${mentoriaId}`).get();
    if (!mentoriaDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Mentoria não encontrada");
    }
    const currentStatus = mentoriaDoc.data()?.status;
    const newStatus = currentStatus === "ativo" ? "suspenso" : "ativo";
    await (0, data_service_1.updateMentoria)(mentoriaId, { status: newStatus });
    return { success: true, newStatus };
});
/**
 * Deletar uma mentoria (soft delete - muda status para cancelado)
 */
const deletarMentoria = functions
    .region("southamerica-east1")
    .https.onCall(async (data, context) => {
    const auth = await (0, auth_1.getAuthContext)(context);
    (0, auth_1.requireRole)(auth, "gestor");
    const { mentoriaId } = data;
    if (!mentoriaId || mentoriaId === data_service_1.LEGACY_MENTORIA_ID) {
        throw new functions.https.HttpsError("invalid-argument", "mentoriaId inválido ou mentoria legacy não pode ser deletada");
    }
    const mentoriaDoc = await db.doc(`mentorias/${mentoriaId}`).get();
    if (!mentoriaDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Mentoria não encontrada");
    }
    // Soft delete: apenas muda o status
    await (0, data_service_1.updateMentoria)(mentoriaId, { status: "cancelado" });
    return { success: true };
});
// Exportar todas as funções de mentorias
exports.mentoriasFunctions = {
    getMentorias: getMenutorias,
    getMentoriaStats: getMentoriaStatsFunc,
    getDashboardUnificado,
    criarMentoria,
    atualizarMentoria,
    toggleMentoriaStatus,
    deletarMentoria,
};
//# sourceMappingURL=mentorias.js.map