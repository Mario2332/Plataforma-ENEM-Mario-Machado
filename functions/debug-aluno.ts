import * as admin from "firebase-admin";

// Inicializar Firebase Admin
const serviceAccount = require("./service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function debugAluno() {
  const email = "teste5@gmail.com";
  
  console.log(`\n=== Buscando aluno com email: ${email} ===\n`);
  
  // Buscar aluno pelo email
  const alunosSnapshot = await db.collection("alunos").where("email", "==", email).get();
  
  if (alunosSnapshot.empty) {
    console.log("Aluno não encontrado!");
    return;
  }
  
  const alunoDoc = alunosSnapshot.docs[0];
  const alunoId = alunoDoc.id;
  const alunoData = alunoDoc.data();
  
  console.log(`ID do aluno: ${alunoId}`);
  console.log(`\n=== Dados do aluno ===`);
  console.log(JSON.stringify(alunoData, null, 2));
  
  // Buscar estudos
  console.log(`\n=== Estudos do aluno ===`);
  const estudosSnapshot = await db.collection("alunos").doc(alunoId).collection("estudos").get();
  console.log(`Total de estudos: ${estudosSnapshot.docs.length}`);
  
  if (estudosSnapshot.docs.length > 0) {
    console.log("\nPrimeiros 3 estudos:");
    estudosSnapshot.docs.slice(0, 3).forEach((doc, i) => {
      const data = doc.data();
      console.log(`\nEstudo ${i + 1}:`);
      console.log(`  ID: ${doc.id}`);
      console.log(`  data: ${JSON.stringify(data.data)}`);
      console.log(`  createdAt: ${JSON.stringify(data.createdAt)}`);
    });
  }
  
  // Buscar simulados
  console.log(`\n=== Simulados do aluno ===`);
  const simuladosSnapshot = await db.collection("alunos").doc(alunoId).collection("simulados").get();
  console.log(`Total de simulados: ${simuladosSnapshot.docs.length}`);
  
  if (simuladosSnapshot.docs.length > 0) {
    console.log("\nPrimeiros 3 simulados:");
    simuladosSnapshot.docs.slice(0, 3).forEach((doc, i) => {
      const data = doc.data();
      console.log(`\nSimulado ${i + 1}:`);
      console.log(`  ID: ${doc.id}`);
      console.log(`  data: ${JSON.stringify(data.data)}`);
      console.log(`  createdAt: ${JSON.stringify(data.createdAt)}`);
    });
  }
  
  // Buscar ranking
  console.log(`\n=== Ranking do aluno ===`);
  const rankingDoc = await db.collection("ranking").doc(alunoId).get();
  if (rankingDoc.exists) {
    console.log(JSON.stringify(rankingDoc.data(), null, 2));
  } else {
    console.log("Documento de ranking não encontrado!");
  }
  
  // Buscar diagnóstico de perfil
  console.log(`\n=== Diagnóstico de perfil ===`);
  const diagnosticoDoc = await db.collection("alunos").doc(alunoId).collection("diagnostico").doc("perfil").get();
  if (diagnosticoDoc.exists) {
    console.log(JSON.stringify(diagnosticoDoc.data(), null, 2));
  } else {
    console.log("Documento de diagnóstico não encontrado!");
  }
  
  // Verificar perfilEstudante no documento principal
  console.log(`\n=== Perfil de estudante no documento principal ===`);
  console.log(`perfilEstudante: ${alunoData.perfilEstudante || "não definido"}`);
  
  process.exit(0);
}

debugAluno().catch(console.error);
