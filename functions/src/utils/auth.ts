import * as functions from "firebase-functions";
import { CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

export type UserRole = "gestor" | "mentor" | "aluno";

export interface AuthContext {
  uid: string;
  email: string;
  role: UserRole;
}

/**
 * Verifica se o usuário está autenticado e retorna seus dados
 */
export async function getAuthContext(context: functions.https.CallableContext): Promise<AuthContext> {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Usuário não autenticado");
  }

  const db = admin.firestore();
  const userDoc = await db.collection("users").doc(context.auth.uid).get();

  if (!userDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Dados do usuário não encontrados");
  }

  const userData = userDoc.data()!;

  return {
    uid: context.auth.uid,
    email: userData.email,
    role: userData.role as UserRole,
  };
}

/**
 * Verifica se o usuário está autenticado e retorna seus dados (v2)
 */
export async function getAuthContextV2(request: CallableRequest): Promise<AuthContext> {
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Usuário não autenticado");
  }

  const db = admin.firestore();
  const userDoc = await db.collection("users").doc(request.auth.uid).get();

  if (!userDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Dados do usuário não encontrados");
  }

  const userData = userDoc.data()!;

  return {
    uid: request.auth.uid,
    email: userData.email,
    role: userData.role as UserRole,
  };
}

/**
 * Verifica se o usuário tem a role especificada
 */
export function requireRole(authContext: AuthContext, requiredRole: UserRole) {
  if (authContext.role !== requiredRole) {
    throw new functions.https.HttpsError(
      "permission-denied",
      `Acesso negado. Role necessária: ${requiredRole}`
    );
  }
}

/**
 * Verifica se o usuário tem uma das roles especificadas
 */
export function requireAnyRole(authContext: AuthContext, requiredRoles: UserRole[]) {
  if (!requiredRoles.includes(authContext.role)) {
    throw new functions.https.HttpsError(
      "permission-denied",
      `Acesso negado. Roles aceitas: ${requiredRoles.join(", ")}`
    );
  }
}
