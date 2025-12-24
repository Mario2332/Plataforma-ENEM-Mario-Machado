/**
 * Funções CRUD para tópicos de conteúdo
 * Estrutura baseada em getConteudosSimples que funciona corretamente
 */
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

// Mapeamento de incidência texto → valor
const INCIDENCE_MAP: Record<string, number> = {
  "Muito alta!": 0.05,
  "Alta!": 0.04,
  "Média": 0.03,
  "Baixa": 0.02,
  "Muito baixa": 0.01,
};

/**
 * Verificar se usuário é mentor ou gestor
 */
async function verificarMentor(uid: string): Promise<boolean> {
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) return false;
  const userData = userDoc.data()!;
  return userData.role === "mentor" || userData.role === "gestor";
}

/**
 * Criar novo tópico
 */
export const createTopico = functions
  .region("southamerica-east1")
  .runWith({
    memory: "256MB",
    timeoutSeconds: 60,
  })
  .https.onCall(async (data, context) => {
    try {
      functions.logger.info("createTopico chamada", { 
        data,
        uid: context.auth?.uid 
      });

      // Verificar autenticação
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Voce precisa estar autenticado"
        );
      }

      // Verificar se é mentor
      const isMentor = await verificarMentor(context.auth.uid);
      if (!isMentor) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Apenas mentores podem criar topicos"
        );
      }

      const { materiaKey, name, incidenceLevel } = data;

      if (!materiaKey || !name || !incidenceLevel) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Materia, nome e nivel de incidencia sao obrigatorios"
        );
      }

      if (!INCIDENCE_MAP[incidenceLevel]) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Nivel de incidencia invalido"
        );
      }

      const topicoId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const topicoData = {
        id: topicoId,
        name,
        incidenceLevel,
        incidenceValue: INCIDENCE_MAP[incidenceLevel],
        isCustom: true,
        isDeleted: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db
        .collection("conteudos_customizados")
        .doc(materiaKey)
        .collection("topicos")
        .doc(topicoId)
        .set(topicoData);

      functions.logger.info("Topico criado com sucesso", { topicoId });

      return { success: true, topicoId };
    } catch (error: any) {
      functions.logger.error("Erro em createTopico:", {
        message: error.message,
        code: error.code,
        stack: error.stack
      });

      if (error.code && error.code.startsWith('functions/')) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        `Erro ao criar topico: ${error.message}`
      );
    }
  });

/**
 * Atualizar tópico existente
 */
export const updateTopico = functions
  .region("southamerica-east1")
  .runWith({
    memory: "256MB",
    timeoutSeconds: 60,
  })
  .https.onCall(async (data, context) => {
    try {
      functions.logger.info("updateTopico chamada", { 
        data,
        uid: context.auth?.uid 
      });

      // Verificar autenticação
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Voce precisa estar autenticado"
        );
      }

      // Verificar se é mentor
      const isMentor = await verificarMentor(context.auth.uid);
      if (!isMentor) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Apenas mentores podem editar topicos"
        );
      }

      const { materiaKey, topicoId, name, incidenceLevel } = data;

      if (!materiaKey || !topicoId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Materia e ID do topico sao obrigatorios"
        );
      }

      if (incidenceLevel && !INCIDENCE_MAP[incidenceLevel]) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Nivel de incidencia invalido"
        );
      }

      const topicoRef = db
        .collection("conteudos_customizados")
        .doc(materiaKey)
        .collection("topicos")
        .doc(topicoId);

      const topicoDoc = await topicoRef.get();

      const updates: any = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (name !== undefined) updates.name = name;
      if (incidenceLevel !== undefined) {
        updates.incidenceLevel = incidenceLevel;
        updates.incidenceValue = INCIDENCE_MAP[incidenceLevel];
      }

      if (topicoDoc.exists) {
        await topicoRef.update(updates);
      } else {
        await topicoRef.set({
          id: topicoId,
          ...updates,
          isCustom: false,
          isDeleted: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      functions.logger.info("Topico atualizado com sucesso", { topicoId });

      return { success: true };
    } catch (error: any) {
      functions.logger.error("Erro em updateTopico:", {
        message: error.message,
        code: error.code,
        stack: error.stack
      });

      if (error.code && error.code.startsWith('functions/')) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        `Erro ao atualizar topico: ${error.message}`
      );
    }
  });

/**
 * Deletar tópico (soft delete)
 */
export const deleteTopico = functions
  .region("southamerica-east1")
  .runWith({
    memory: "256MB",
    timeoutSeconds: 60,
  })
  .https.onCall(async (data, context) => {
    try {
      functions.logger.info("deleteTopico chamada", { 
        data,
        uid: context.auth?.uid 
      });

      // Verificar autenticação
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Voce precisa estar autenticado"
        );
      }

      // Verificar se é mentor
      const isMentor = await verificarMentor(context.auth.uid);
      if (!isMentor) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Apenas mentores podem deletar topicos"
        );
      }

      const { materiaKey, topicoId } = data;

      if (!materiaKey || !topicoId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Materia e ID do topico sao obrigatorios"
        );
      }

      const topicoRef = db
        .collection("conteudos_customizados")
        .doc(materiaKey)
        .collection("topicos")
        .doc(topicoId);

      const topicoDoc = await topicoRef.get();

      if (topicoDoc.exists) {
        await topicoRef.update({
          isDeleted: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        await topicoRef.set({
          id: topicoId,
          isDeleted: true,
          isCustom: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      functions.logger.info("Topico deletado com sucesso", { topicoId });

      return { success: true };
    } catch (error: any) {
      functions.logger.error("Erro em deleteTopico:", {
        message: error.message,
        code: error.code,
        stack: error.stack
      });

      if (error.code && error.code.startsWith('functions/')) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        `Erro ao deletar topico: ${error.message}`
      );
    }
  });
