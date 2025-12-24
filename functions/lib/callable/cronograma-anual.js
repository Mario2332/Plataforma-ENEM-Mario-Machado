"use strict";
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
exports.setActiveSchedule = exports.toggleTopicoCompleto = exports.getCronogramaAnual = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const init_cronograma_templates_1 = require("./init-cronograma-templates");
const db = admin.firestore();
/**
 * Verificar se o usuário é mentor e pode acessar dados de outro aluno
 */
async function getEffectiveUserId(context, requestedAlunoId) {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Você precisa estar autenticado");
    }
    // Se não foi solicitado um alunoId específico, usar o próprio usuário
    if (!requestedAlunoId) {
        return context.auth.uid;
    }
    // Se foi solicitado um alunoId diferente, verificar se é mentor
    const userDoc = await db.collection("users").doc(context.auth.uid).get();
    const userData = userDoc.data();
    if (!userData || userData.role !== "mentor") {
        throw new functions.https.HttpsError("permission-denied", "Apenas mentores podem acessar dados de outros alunos");
    }
    return requestedAlunoId;
}
/**
 * Obter cronograma anual do aluno
 * Retorna cronograma extensivo ou intensivo com progresso
 */
exports.getCronogramaAnual = functions
    .region("southamerica-east1")
    .runWith({
    memory: "256MB",
    timeoutSeconds: 30,
})
    .https.onCall(async (data, context) => {
    try {
        functions.logger.info("🔵 getCronogramaAnual chamada", {
            tipo: data?.tipo,
            uid: context.auth?.uid,
            alunoId: data?.alunoId
        });
        if (!context.auth) {
            throw new functions.https.HttpsError("unauthenticated", "Você precisa estar autenticado");
        }
        const { tipo = "extensive", alunoId } = data; // extensive ou intensive
        // Obter o ID efetivo (próprio usuário ou aluno se for mentor)
        const effectiveUserId = await getEffectiveUserId(context, alunoId);
        // Inicializar templates se necessário
        await (0, init_cronograma_templates_1.initializeTemplatesIfNeeded)();
        // Buscar cronograma do aluno
        const cronogramaRef = db.collection("cronogramas_anuais").doc(effectiveUserId);
        const cronogramaDoc = await cronogramaRef.get();
        let cronogramaData;
        if (!cronogramaDoc.exists) {
            // Se não existe, criar com template padrão
            functions.logger.info("📦 Inicializando cronograma para novo aluno");
            const templateRef = db.collection("templates_cronograma").doc(tipo);
            const templateDoc = await templateRef.get();
            if (!templateDoc.exists) {
                throw new functions.https.HttpsError("not-found", "Template de cronograma não encontrado");
            }
            const templateData = templateDoc.data();
            cronogramaData = {
                extensive: tipo === "extensive" ? templateData : null,
                intensive: tipo === "intensive" ? templateData : null,
                completedTopics: {},
                activeSchedule: tipo,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            await cronogramaRef.set(cronogramaData);
        }
        else {
            cronogramaData = cronogramaDoc.data() || {};
            // Se o tipo solicitado não existe, buscar do template
            if (!cronogramaData || !cronogramaData[tipo]) {
                const templateRef = db.collection("templates_cronograma").doc(tipo);
                const templateDoc = await templateRef.get();
                if (templateDoc.exists) {
                    if (!cronogramaData)
                        cronogramaData = {};
                    cronogramaData[tipo] = templateDoc.data();
                    await cronogramaRef.update({
                        [tipo]: templateDoc.data(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                }
            }
        }
        // Garantir que cronogramaData existe
        if (!cronogramaData) {
            throw new functions.https.HttpsError("internal", "Erro ao carregar dados do cronograma");
        }
        functions.logger.info("✅ Cronograma carregado", {
            tipo,
            hasCycles: !!cronogramaData[tipo]?.cycles
        });
        return {
            cronograma: cronogramaData[tipo] || null,
            completedTopics: cronogramaData.completedTopics || {},
            activeSchedule: cronogramaData.activeSchedule || tipo,
        };
    }
    catch (error) {
        functions.logger.error("❌ Erro em getCronogramaAnual:", {
            message: error.message,
            stack: error.stack
        });
        if (error.code && error.code.startsWith('functions/')) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", `Erro ao carregar cronograma: ${error.message}`);
    }
});
/**
 * Marcar/desmarcar tópico como concluído
 */
exports.toggleTopicoCompleto = functions
    .region("southamerica-east1")
    .runWith({
    memory: "256MB",
    timeoutSeconds: 30,
})
    .https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError("unauthenticated", "Você precisa estar autenticado");
        }
        const { topicoId, completed, alunoId } = data;
        if (!topicoId) {
            throw new functions.https.HttpsError("invalid-argument", "topicoId é obrigatório");
        }
        // Obter o ID efetivo (próprio usuário ou aluno se for mentor)
        const effectiveUserId = await getEffectiveUserId(context, alunoId);
        const cronogramaRef = db.collection("cronogramas_anuais").doc(effectiveUserId);
        const cronogramaDoc = await cronogramaRef.get();
        // Obter completedTopics atual ou criar novo objeto
        const currentData = cronogramaDoc.data() || {};
        const completedTopics = currentData.completedTopics || {};
        // Atualizar o tópico específico
        completedTopics[topicoId] = completed;
        // Salvar de volta
        await cronogramaRef.set({
            completedTopics,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        // Sincronizar com conteudos_progresso para metas de tópicos
        const progressoRef = db
            .collection("alunos")
            .doc(effectiveUserId)
            .collection("conteudos_progresso")
            .doc(topicoId);
        const now = admin.firestore.Timestamp.now();
        if (completed) {
            // Marcar como concluído
            await progressoRef.set({
                concluido: true,
                topicoId,
                dataConclusao: now,
                updatedAt: now,
                createdAt: now,
            }, { merge: true });
        }
        else {
            // Desmarcar como concluído (deletar dataConclusao)
            await progressoRef.set({
                concluido: false,
                topicoId,
                dataConclusao: admin.firestore.FieldValue.delete(),
                updatedAt: now,
            }, { merge: true });
        }
        functions.logger.info("✅ Tópico atualizado e sincronizado", {
            topicoId,
            completed,
            effectiveUserId
        });
        return { success: true };
    }
    catch (error) {
        functions.logger.error("❌ Erro em toggleTopicoCompleto:", error);
        if (error.code && error.code.startsWith('functions/')) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", `Erro ao atualizar tópico: ${error.message}`);
    }
});
/**
 * Definir cronograma ativo (extensivo ou intensivo)
 */
exports.setActiveSchedule = functions
    .region("southamerica-east1")
    .runWith({
    memory: "256MB",
    timeoutSeconds: 30,
})
    .https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError("unauthenticated", "Você precisa estar autenticado");
        }
        const { tipo, alunoId } = data;
        if (!tipo || !["extensive", "intensive"].includes(tipo)) {
            throw new functions.https.HttpsError("invalid-argument", "tipo deve ser 'extensive' ou 'intensive'");
        }
        // Obter o ID efetivo (próprio usuário ou aluno se for mentor)
        const effectiveUserId = await getEffectiveUserId(context, alunoId);
        const cronogramaRef = db.collection("cronogramas_anuais").doc(effectiveUserId);
        await cronogramaRef.set({
            activeSchedule: tipo,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        functions.logger.info("✅ Cronograma ativo atualizado", { tipo, effectiveUserId });
        return { success: true };
    }
    catch (error) {
        functions.logger.error("❌ Erro em setActiveSchedule:", error);
        if (error.code && error.code.startsWith('functions/')) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", `Erro ao definir cronograma ativo: ${error.message}`);
    }
});
//# sourceMappingURL=cronograma-anual.js.map