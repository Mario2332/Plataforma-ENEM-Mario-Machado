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
exports.getConteudosSimples = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
const fs = require("fs");
const path = require("path");
// Flag global para controlar inicialização
let initializationPromise = null;
/**
 * Inicializar collection conteudos_base se não existir
 */
async function ensureDataExists() {
    // Se já está inicializando, aguardar
    if (initializationPromise) {
        return initializationPromise;
    }
    // Verificar se já existe
    const snapshot = await db.collection("conteudos_base").limit(1).get();
    if (!snapshot.empty) {
        functions.logger.info("✅ conteudos_base já existe");
        return;
    }
    // Inicializar
    functions.logger.info("🔄 Inicializando conteudos_base...");
    initializationPromise = (async () => {
        try {
            // Carregar JSON
            const jsonPath = path.join(__dirname, "..", "study-content-data.json");
            const jsonContent = fs.readFileSync(jsonPath, "utf-8");
            const baseData = JSON.parse(jsonContent);
            functions.logger.info(`📦 Carregado ${Object.keys(baseData).length} matérias`);
            // Salvar no Firestore em batch
            const batch = db.batch();
            for (const [key, value] of Object.entries(baseData)) {
                const docRef = db.collection("conteudos_base").doc(key);
                batch.set(docRef, value);
            }
            await batch.commit();
            functions.logger.info("✅ conteudos_base inicializado com sucesso!");
        }
        catch (error) {
            functions.logger.error("❌ Erro ao inicializar:", error);
            initializationPromise = null; // Resetar para tentar novamente
            throw error;
        }
    })();
    return initializationPromise;
}
/**
 * Mesclar tópicos base com customizações
 */
async function mergeTopicsWithCustomizations(materiaKey, baseTopics) {
    // Buscar customizações do Firestore
    const customizacoesSnapshot = await db
        .collection("conteudos_customizados")
        .doc(materiaKey)
        .collection("topicos")
        .get();
    // Se não há customizações, retornar tópicos base
    if (customizacoesSnapshot.empty) {
        return baseTopics;
    }
    // Criar mapa de customizações
    const customMap = {};
    customizacoesSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        customMap[data.id] = data;
    });
    functions.logger.info("📝 Customizações encontradas", {
        materiaKey,
        count: Object.keys(customMap).length
    });
    // Mesclar tópicos base com customizações
    let mergedTopics = baseTopics.map((topic) => {
        if (customMap[topic.id]) {
            const custom = customMap[topic.id];
            // Se foi deletado, retornar null para filtrar depois
            if (custom.isDeleted) {
                return null;
            }
            // Mesclar dados customizados
            return {
                ...topic,
                name: custom.name !== undefined ? custom.name : topic.name,
                incidenceLevel: custom.incidenceLevel !== undefined ? custom.incidenceLevel : topic.incidenceLevel,
                incidenceValue: custom.incidenceValue !== undefined ? custom.incidenceValue : topic.incidenceValue,
            };
        }
        return topic;
    }).filter((t) => t !== null);
    // Adicionar tópicos customizados novos (que não existem na base)
    Object.values(customMap).forEach((custom) => {
        if (custom.isCustom && !custom.isDeleted) {
            // Verificar se já não foi adicionado
            const exists = mergedTopics.some((t) => t.id === custom.id);
            if (!exists) {
                mergedTopics.push({
                    id: custom.id,
                    name: custom.name,
                    incidenceLevel: custom.incidenceLevel,
                    incidenceValue: custom.incidenceValue,
                });
            }
        }
    });
    return mergedTopics;
}
/**
 * Função para obter conteúdos com mesclagem de customizações
 * Retorna dados do Firestore mesclados com customizações
 */
exports.getConteudosSimples = functions
    .region("southamerica-east1")
    .runWith({
    memory: "512MB",
    timeoutSeconds: 60,
})
    .https.onCall(async (data, context) => {
    try {
        functions.logger.info("🔵 getConteudosSimples chamada", {
            materiaKey: data?.materiaKey,
            uid: context.auth?.uid
        });
        // Verificar autenticação
        if (!context.auth) {
            throw new functions.https.HttpsError("unauthenticated", "Você precisa estar autenticado");
        }
        // Garantir que dados existem (inicializa se necessário)
        await ensureDataExists();
        const { materiaKey } = data;
        if (materiaKey) {
            // Retornar apenas uma matéria
            const doc = await db.collection("conteudos_base").doc(materiaKey).get();
            if (!doc.exists) {
                throw new functions.https.HttpsError("not-found", `Matéria ${materiaKey} não encontrada`);
            }
            const materiaData = doc.data();
            const baseTopics = materiaData?.topics || [];
            // Mesclar com customizações
            const mergedTopics = await mergeTopicsWithCustomizations(materiaKey, baseTopics);
            functions.logger.info("✅ Matéria carregada com customizações", {
                materiaKey,
                baseTopicsCount: baseTopics.length,
                mergedTopicsCount: mergedTopics.length
            });
            return {
                ...materiaData,
                topics: mergedTopics,
            };
        }
        else {
            // Retornar todas as matérias
            const snapshot = await db.collection("conteudos_base").get();
            const allData = {};
            for (const doc of snapshot.docs) {
                const materiaData = doc.data();
                const baseTopics = materiaData?.topics || [];
                // Mesclar com customizações
                const mergedTopics = await mergeTopicsWithCustomizations(doc.id, baseTopics);
                allData[doc.id] = {
                    ...materiaData,
                    topics: mergedTopics,
                };
            }
            functions.logger.info("✅ Todas as matérias carregadas com customizações", {
                count: Object.keys(allData).length
            });
            return allData;
        }
    }
    catch (error) {
        functions.logger.error("❌ Erro em getConteudosSimples:", {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        // Se já for HttpsError, re-lançar
        if (error.code && error.code.startsWith('functions/')) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", `Erro ao carregar conteúdos: ${error.message}`);
    }
});
//# sourceMappingURL=conteudos-simples.js.map