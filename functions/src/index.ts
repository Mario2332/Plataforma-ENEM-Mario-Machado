import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as serviceAccount from "../serviceAccountKey.json";

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
});

// Exportar todas as funções
export { onUserCreated } from "./triggers/onUserCreated";
export { gestorFunctions } from "./callable/gestor";
export { mentorFunctions } from "./callable/mentor";
export { alunoFunctions } from "./callable/aluno";
export * from "./callable/aluno-extras";
