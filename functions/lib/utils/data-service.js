"use strict";
/**
 * DataService - Camada de abstração para acesso a dados dual-mode
 *
 * DUAL-MODE PERMANENTE:
 * - Modo "legacy": Acessa coleções raiz (alunos/, mentores/, etc.)
 *   Usado pela mentoria original do Mário Machado.
 *   NUNCA alterado, NUNCA migrado.
 *
 * - Modo "multi-tenant": Acessa subcoleções (mentorias/{id}/alunos/, etc.)
 *   Usado por novos clientes white label.
 *
 * REGRA DE OURO: Código legacy NUNCA é alterado.
 * Este serviço é usado APENAS por novas funcionalidades e pelo gestor.
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
exports.DataService = exports.LEGACY_MENTORIA_ID = void 0;
exports.detectMentoriaForUser = detectMentoriaForUser;
exports.createDataServiceForUser = createDataServiceForUser;
exports.createDataServiceForMentoria = createDataServiceForMentoria;
exports.listAllMentorias = listAllMentorias;
exports.createMentoria = createMentoria;
exports.updateMentoria = updateMentoria;
exports.getMentoriaStats = getMentoriaStats;
const admin = __importStar(require("firebase-admin"));
const mentoria_1 = require("../types/mentoria");
const db = admin.firestore();
// ID fixo da mentoria legacy (Mário Machado)
exports.LEGACY_MENTORIA_ID = "mentoria-mario";
class DataService {
    constructor(mentoriaId) {
        this.config = null;
        this.mentoriaId = mentoriaId;
    }
    async loadConfig() {
        const configDoc = await db.doc(`mentorias/${this.mentoriaId}`).get();
        if (configDoc.exists) {
            this.config = { id: configDoc.id, ...configDoc.data() };
        }
        return this.config;
    }
    isLegacy() {
        return this.mentoriaId === exports.LEGACY_MENTORIA_ID ||
            !this.config ||
            this.config.modo === "legacy";
    }
    getCollectionPath(collectionName) {
        if (this.isLegacy()) {
            return collectionName;
        }
        return `mentorias/${this.mentoriaId}/${collectionName}`;
    }
    collection(collectionName) {
        return db.collection(this.getCollectionPath(collectionName));
    }
    doc(collectionName, docId) {
        return db.doc(`${this.getCollectionPath(collectionName)}/${docId}`);
    }
    subcollection(collectionName, docId, subcollectionName) {
        return db.collection(`${this.getCollectionPath(collectionName)}/${docId}/${subcollectionName}`);
    }
    getMentoriaId() {
        return this.mentoriaId;
    }
    getConfig() {
        return this.config;
    }
}
exports.DataService = DataService;
async function detectMentoriaForUser(uid) {
    const userDoc = await db.doc(`users/${uid}`).get();
    if (userDoc.exists) {
        const data = userDoc.data();
        if (data?.mentoriaId) {
            return data.mentoriaId;
        }
    }
    return exports.LEGACY_MENTORIA_ID;
}
async function createDataServiceForUser(uid) {
    const mentoriaId = await detectMentoriaForUser(uid);
    const service = new DataService(mentoriaId);
    await service.loadConfig();
    return service;
}
async function createDataServiceForMentoria(mentoriaId) {
    const service = new DataService(mentoriaId);
    await service.loadConfig();
    return service;
}
async function listAllMentorias() {
    const snapshot = await db.collection("mentorias").get();
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
}
async function createMentoria(id, config) {
    const limitesPadrao = mentoria_1.LIMITES_POR_PLANO[config.plano];
    const now = admin.firestore.FieldValue.serverTimestamp();
    await db.doc(`mentorias/${id}`).set({
        nome: config.nome,
        modo: "multi-tenant",
        status: "ativo",
        plano: config.plano,
        branding: config.branding,
        limites: { ...limitesPadrao, ...(config.limites || {}) },
        gestorId: config.gestorId,
        gestorNome: config.gestorNome || "",
        gestorEmail: config.gestorEmail || "",
        criadoEm: now,
        atualizadoEm: now,
    });
}
async function updateMentoria(id, updates) {
    await db.doc(`mentorias/${id}`).update({
        ...updates,
        atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    });
}
async function getMentoriaStats(mentoriaId) {
    const service = new DataService(mentoriaId);
    await service.loadConfig();
    const alunosSnapshot = await service.collection("alunos").get();
    const mentoresSnapshot = await service.collection("mentores").get();
    let alunosAtivos = 0;
    let alunosInativos = 0;
    alunosSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.ativo === false) {
            alunosInativos++;
        }
        else {
            alunosAtivos++;
        }
    });
    return {
        alunosAtivos,
        alunosInativos,
        mentoresAtivos: mentoresSnapshot.size,
    };
}
//# sourceMappingURL=data-service.js.map