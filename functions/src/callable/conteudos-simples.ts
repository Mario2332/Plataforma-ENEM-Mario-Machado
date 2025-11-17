import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();
const fs = require("fs");
const path = require("path");

// Flag global para controlar inicialização
let initializationPromise: Promise<void> | null = null;

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
    } catch (error: any) {
      functions.logger.error("❌ Erro ao inicializar:", error);
      initializationPromise = null; // Resetar para tentar novamente
      throw error;
    }
  })();
  
  return initializationPromise;
}

/**
 * Função SIMPLES para obter conteúdos
 * Retorna dados direto do Firestore
 * Inicializa automaticamente se necessário
 */
export const getConteudosSimples = functions
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
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Você precisa estar autenticado"
        );
      }

      // Garantir que dados existem (inicializa se necessário)
      await ensureDataExists();

      const { materiaKey } = data;

      if (materiaKey) {
        // Retornar apenas uma matéria
        const doc = await db.collection("conteudos_base").doc(materiaKey).get();
        
        if (!doc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            `Matéria ${materiaKey} não encontrada`
          );
        }

        const materiaData = doc.data();
        functions.logger.info("✅ Matéria carregada", { 
          materiaKey,
          topicsCount: materiaData?.topics?.length || 0
        });

        return materiaData;
      } else {
        // Retornar todas as matérias
        const snapshot = await db.collection("conteudos_base").get();
        
        const allData: Record<string, any> = {};
        snapshot.docs.forEach(doc => {
          allData[doc.id] = doc.data();
        });

        functions.logger.info("✅ Todas as matérias carregadas", {
          count: Object.keys(allData).length
        });

        return allData;
      }
    } catch (error: any) {
      functions.logger.error("❌ Erro em getConteudosSimples:", {
        message: error.message,
        code: error.code,
        stack: error.stack
      });

      // Se já for HttpsError, re-lançar
      if (error.code && error.code.startsWith('functions/')) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        `Erro ao carregar conteúdos: ${error.message}`
      );
    }
  });
