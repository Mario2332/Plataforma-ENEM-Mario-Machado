import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { getAuthContext, requireRole } from "../utils/auth";

const db = admin.firestore();

/**
 * Obter dados do gestor logado
 */
const getMe = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "gestor");

    const gestorDoc = await db.collection("gestores").doc(auth.uid).get();

    if (!gestorDoc.exists) {
      // Criar gestor automaticamente se não existir
      await db.collection("gestores").doc(auth.uid).set({
        userId: auth.uid,
        nome: auth.email.split("@")[0],
        email: auth.email,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const newGestorDoc = await db.collection("gestores").doc(auth.uid).get();
      return { id: newGestorDoc.id, ...newGestorDoc.data() };
    }

    return { id: gestorDoc.id, ...gestorDoc.data() };
  });

/**
 * Obter total de alunos na plataforma
 */
const getTotalAlunos = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "gestor");

    const alunosSnapshot = await db.collection("alunos").count().get();
    return alunosSnapshot.data().count;
  });

/**
 * Listar todos os mentores
 */
const getMentores = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "gestor");

    const mentoresSnapshot = await db.collection("mentores").get();
    return mentoresSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  });

/**
 * Criar novo mentor
 */
const createMentor = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "gestor");

    const { email, password, nome, nomePlataforma, logoUrl, corPrincipal } = data;

    if (!email || !password || !nome || !nomePlataforma) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Email, senha, nome e nome da plataforma são obrigatórios"
      );
    }

    try {
      // Criar usuário no Firebase Auth
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: nome,
      });

      // Criar documento do usuário
      await db.collection("users").doc(userRecord.uid).set({
        uid: userRecord.uid,
        email,
        name: nome,
        role: "mentor",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSignedIn: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Criar documento do mentor
      await db.collection("mentores").doc(userRecord.uid).set({
        userId: userRecord.uid,
        gestorId: auth.uid,
        nome,
        email,
        nomePlataforma,
        logoUrl: logoUrl || null,
        corPrincipal: corPrincipal || "#3b82f6",
        ativo: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, mentorId: userRecord.uid };
    } catch (error: any) {
      functions.logger.error("Erro ao criar mentor:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

/**
 * Atualizar dados do mentor
 */
const updateMentor = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "gestor");

    const { mentorId, nome, email, nomePlataforma, logoUrl, corPrincipal, ativo } = data;

    if (!mentorId) {
      throw new functions.https.HttpsError("invalid-argument", "ID do mentor é obrigatório");
    }

    try {
      const updates: any = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (nome !== undefined) updates.nome = nome;
      if (email !== undefined) updates.email = email;
      if (nomePlataforma !== undefined) updates.nomePlataforma = nomePlataforma;
      if (logoUrl !== undefined) updates.logoUrl = logoUrl;
      if (corPrincipal !== undefined) updates.corPrincipal = corPrincipal;
      if (ativo !== undefined) updates.ativo = ativo;

      await db.collection("mentores").doc(mentorId).update(updates);

      // Atualizar email no Firebase Auth se necessário
      if (email !== undefined) {
        await admin.auth().updateUser(mentorId, { email });
      }

      // Atualizar nome no documento users
      if (nome !== undefined) {
        await db.collection("users").doc(mentorId).update({
          name: nome,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return { success: true };
    } catch (error: any) {
      functions.logger.error("Erro ao atualizar mentor:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

/**
 * Deletar mentor
 */
const deleteMentor = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "gestor");

    const { mentorId } = data;

    if (!mentorId) {
      throw new functions.https.HttpsError("invalid-argument", "ID do mentor é obrigatório");
    }

    try {
      // Deletar documento do mentor
      await db.collection("mentores").doc(mentorId).delete();

      // Deletar documento do usuário
      await db.collection("users").doc(mentorId).delete();

      // Deletar usuário do Firebase Auth
      await admin.auth().deleteUser(mentorId);

      return { success: true };
    } catch (error: any) {
      functions.logger.error("Erro ao deletar mentor:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

/**
 * Listar todos os alunos da plataforma
 */
const getAllAlunos = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "gestor");

    const alunosSnapshot = await db.collection("alunos").get();
    return alunosSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  });

/**
 * Atualizar dados de qualquer aluno
 */
const updateAluno = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "gestor");

    const { alunoId, nome, email, celular, plano, ativo, mentorId } = data;

    if (!alunoId) {
      throw new functions.https.HttpsError("invalid-argument", "ID do aluno é obrigatório");
    }

    try {
      const updates: any = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (nome !== undefined) updates.nome = nome;
      if (email !== undefined) updates.email = email;
      if (celular !== undefined) updates.celular = celular;
      if (plano !== undefined) updates.plano = plano;
      if (ativo !== undefined) updates.ativo = ativo;
      if (mentorId !== undefined) updates.mentorId = mentorId;

      await db.collection("alunos").doc(alunoId).update(updates);

      // Atualizar email no Firebase Auth se necessário
      if (email !== undefined) {
        await admin.auth().updateUser(alunoId, { email });
      }

      // Atualizar nome no documento users
      if (nome !== undefined) {
        await db.collection("users").doc(alunoId).update({
          name: nome,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return { success: true };
    } catch (error: any) {
      functions.logger.error("Erro ao atualizar aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

/**
 * Função auxiliar para deletar todas as subcoleções de um documento
 */
async function deleteSubcollections(docRef: admin.firestore.DocumentReference) {
  const subcollections = await docRef.listCollections();
  for (const subcollection of subcollections) {
    const docs = await subcollection.listDocuments();
    for (const doc of docs) {
      await deleteSubcollections(doc); // Recursivo para subcoleções aninhadas
      await doc.delete();
    }
  }
}

/**
 * Deletar aluno - Remove TODOS os dados do aluno da plataforma
 */
const deleteAluno = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "gestor");

    const { alunoId } = data;

    if (!alunoId) {
      throw new functions.https.HttpsError("invalid-argument", "ID do aluno é obrigatório");
    }

    try {
      // Verificar se o aluno existe (pode já ter sido parcialmente excluído)
      const alunoDoc = await db.collection("alunos").doc(alunoId).get();
      
      // Deletar todas as subcoleções do aluno (estudos, simulados, metas, etc.)
      if (alunoDoc.exists) {
        await deleteSubcollections(db.collection("alunos").doc(alunoId));
      }

      // Deletar documento do aluno
      await db.collection("alunos").doc(alunoId).delete();

      // Deletar documento do usuário
      await db.collection("users").doc(alunoId).delete();

      // Deletar registro do ranking
      await db.collection("ranking").doc(alunoId).delete();

      // Deletar usuário do Firebase Auth
      try {
        await admin.auth().deleteUser(alunoId);
      } catch (authError: any) {
        // Ignorar erro se usuário já não existe no Auth
        if (authError.code !== "auth/user-not-found") {
          throw authError;
        }
      }

      functions.logger.info(`Aluno ${alunoId} excluído completamente pelo gestor`);
      return { success: true };
    } catch (error: any) {
      functions.logger.error("Erro ao deletar aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

// Exportar todas as funções do gestor
export const gestorFunctions = {
  getMe,
  getTotalAlunos,
  getMentores,
  createMentor,
  updateMentor,
  deleteMentor,
  getAllAlunos,
  updateAluno,
  deleteAluno,
};
