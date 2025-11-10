import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Trigger executado quando um novo usuário é criado no Firebase Auth
 * Cria o documento correspondente no Firestore
 */
export const onUserCreated = functions
  .region("southamerica-east1")
  .auth.user()
  .onCreate(async (user) => {
    const db = admin.firestore();

    try {
      // Criar documento do usuário no Firestore
      await db.collection("users").doc(user.uid).set({
        uid: user.uid,
        email: user.email || "",
        name: user.displayName || "Usuário",
        role: "aluno", // Role padrão
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSignedIn: admin.firestore.FieldValue.serverTimestamp(),
      });

      functions.logger.info(`Documento de usuário criado para: ${user.uid}`);
    } catch (error) {
      functions.logger.error("Erro ao criar documento de usuário:", error);
      throw error;
    }
  });
