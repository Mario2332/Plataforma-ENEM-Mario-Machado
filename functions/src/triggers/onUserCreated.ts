import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Trigger executado quando um novo usuário é criado no Firebase Auth
 * Cria o documento correspondente no Firestore APENAS se não existir
 */
export const onUserCreated = functions
  .region("southamerica-east1")
  .auth.user()
  .onCreate(async (user) => {
    const db = admin.firestore();

    try {
      const userDocRef = db.collection("users").doc(user.uid);
      const userDoc = await userDocRef.get();

      // Verificar se o documento já existe
      if (userDoc.exists) {
        functions.logger.info(`Documento de usuário já existe para: ${user.uid}. Pulando criação.`);
        return;
      }

      // Criar documento do usuário no Firestore apenas se não existir
      await userDocRef.set({
        uid: user.uid,
        email: user.email || "",
        name: user.displayName || "Usuário",
        role: "aluno", // Role padrão apenas para novos usuários
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
