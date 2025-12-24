import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { getAuthContext, requireRole } from "../utils/auth";
import { initializeTemplatesIfNeeded } from "./init-cronograma-templates";

const db = admin.firestore();

/**
 * Verificar se o usuário é mentor e pode acessar dados de outro aluno
 */
async function getEffectiveUserId(context: functions.https.CallableContext, requestedAlunoId?: string): Promise<string> {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Você precisa estar autenticado"
    );
  }

  // Se não foi solicitado um alunoId específico, usar o próprio usuário
  if (!requestedAlunoId) {
    return context.auth.uid;
  }

  // Se foi solicitado um alunoId diferente, verificar se é mentor
  const userDoc = await db.collection("users").doc(context.auth.uid).get();
  const userData = userDoc.data();
  
  if (!userData || userData.role !== "mentor") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Apenas mentores podem acessar dados de outros alunos"
    );
  }

  return requestedAlunoId;
}

/**
 * Obter cronograma anual do aluno
 * Retorna cronograma extensivo ou intensivo com progresso
 */
export const getCronogramaAnual = functions
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
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Você precisa estar autenticado"
        );
      }

      const { tipo = "extensive", alunoId } = data; // extensive ou intensive
      
      // Obter o ID efetivo (próprio usuário ou aluno se for mentor)
      const effectiveUserId = await getEffectiveUserId(context, alunoId);

      // Inicializar templates se necessário
      await initializeTemplatesIfNeeded();

      // Buscar cronograma do aluno
      const cronogramaRef = db.collection("cronogramas_anuais").doc(effectiveUserId);
      const cronogramaDoc = await cronogramaRef.get();

      let cronogramaData: any;
      
      if (!cronogramaDoc.exists) {
        // Se não existe, criar com template padrão
        functions.logger.info("📦 Inicializando cronograma para novo aluno");
        
        const templateRef = db.collection("templates_cronograma").doc(tipo);
        const templateDoc = await templateRef.get();
        
        if (!templateDoc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            "Template de cronograma não encontrado"
          );
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
      } else {
        cronogramaData = cronogramaDoc.data() || {};
        
        // Se o tipo solicitado não existe, buscar do template
        if (!cronogramaData || !cronogramaData[tipo]) {
          const templateRef = db.collection("templates_cronograma").doc(tipo);
          const templateDoc = await templateRef.get();
          
          if (templateDoc.exists) {
            if (!cronogramaData) cronogramaData = {};
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
        throw new functions.https.HttpsError(
          "internal",
          "Erro ao carregar dados do cronograma"
        );
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
    } catch (error: any) {
      functions.logger.error("❌ Erro em getCronogramaAnual:", {
        message: error.message,
        stack: error.stack
      });

      if (error.code && error.code.startsWith('functions/')) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        `Erro ao carregar cronograma: ${error.message}`
      );
    }
  });

/**
 * Marcar/desmarcar tópico como concluído
 */
export const toggleTopicoCompleto = functions
  .region("southamerica-east1")
  .runWith({
    memory: "256MB",
    timeoutSeconds: 30,
  })
  .https.onCall(async (data, context) => {
    try {
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Você precisa estar autenticado"
        );
      }

      const { topicoId, completed, alunoId } = data;

      if (!topicoId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "topicoId é obrigatório"
        );
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
      } else {
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
    } catch (error: any) {
      functions.logger.error("❌ Erro em toggleTopicoCompleto:", error);

      if (error.code && error.code.startsWith('functions/')) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        `Erro ao atualizar tópico: ${error.message}`
      );
    }
  });

/**
 * Definir cronograma ativo (extensivo ou intensivo)
 */
export const setActiveSchedule = functions
  .region("southamerica-east1")
  .runWith({
    memory: "256MB",
    timeoutSeconds: 30,
  })
  .https.onCall(async (data, context) => {
    try {
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Você precisa estar autenticado"
        );
      }

      const { tipo, alunoId } = data;

      if (!tipo || !["extensive", "intensive"].includes(tipo)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "tipo deve ser 'extensive' ou 'intensive'"
        );
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
    } catch (error: any) {
      functions.logger.error("❌ Erro em setActiveSchedule:", error);

      if (error.code && error.code.startsWith('functions/')) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        `Erro ao definir cronograma ativo: ${error.message}`
      );
    }
  });
