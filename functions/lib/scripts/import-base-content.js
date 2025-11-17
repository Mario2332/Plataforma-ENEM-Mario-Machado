"use strict";
/**
 * Script para importar conteúdo base do JSON para o Firestore
 * Execução única para popular a collection conteudos_base
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
const admin = __importStar(require("firebase-admin"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Inicializar Firebase Admin
admin.initializeApp();
const db = admin.firestore();
async function importBaseContent() {
    try {
        console.log("📂 Carregando JSON...");
        // Carregar JSON
        const jsonPath = path.join(__dirname, "..", "study-content-data.json");
        const jsonContent = fs.readFileSync(jsonPath, "utf-8");
        const baseData = JSON.parse(jsonContent);
        console.log(`✅ JSON carregado: ${Object.keys(baseData).length} matérias`);
        // Importar para Firestore
        const batch = db.batch();
        let count = 0;
        for (const [materiaKey, materiaData] of Object.entries(baseData)) {
            const docRef = db.collection("conteudos_base").doc(materiaKey);
            batch.set(docRef, materiaData);
            count++;
            console.log(`  📝 ${materiaKey}: ${materiaData.topics?.length || 0} tópicos`);
        }
        console.log(`\n🚀 Salvando ${count} matérias no Firestore...`);
        await batch.commit();
        console.log("✅ Importação concluída com sucesso!");
        console.log("\n📊 Resumo:");
        console.log(`  - Matérias importadas: ${count}`);
        console.log(`  - Collection: conteudos_base`);
        process.exit(0);
    }
    catch (error) {
        console.error("❌ Erro na importação:", error);
        process.exit(1);
    }
}
importBaseContent();
//# sourceMappingURL=import-base-content.js.map