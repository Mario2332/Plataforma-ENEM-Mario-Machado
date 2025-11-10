import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyChFCUxaTiXIcNh0PCFORe_FTK8NWV0xLA",
  authDomain: "plataforma-mentoria-mario.firebaseapp.com",
  projectId: "plataforma-mentoria-mario",
  storageBucket: "plataforma-mentoria-mario.firebasestorage.app",
  messagingSenderId: "1072418970493",
  appId: "1:1072418970493:web:f5184d12a0e67ba0d70a14"
};

// Inicializar Firebase
export const app = initializeApp(firebaseConfig);

// Inicializar serviços
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'southamerica-east1'); // Região São Paulo

// Conectar aos emuladores em desenvolvimento (opcional)
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  connectAuthEmulator(auth, "http://localhost:9099");
  connectFirestoreEmulator(db, "localhost", 8080);
  connectStorageEmulator(storage, "localhost", 9199);
  connectFunctionsEmulator(functions, "localhost", 5001);
}
