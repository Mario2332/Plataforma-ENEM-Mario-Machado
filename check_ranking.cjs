const admin = require('firebase-admin');

// Inicializar Firebase Admin
const serviceAccount = require('./functions/service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkRanking() {
  // Primeiro, buscar o ID do aluno teste5@gmail.com
  const alunosSnapshot = await db.collection('alunos')
    .where('email', '==', 'teste5@gmail.com')
    .get();
  
  if (alunosSnapshot.empty) {
    console.log('Aluno não encontrado');
    return;
  }
  
  const alunoDoc = alunosSnapshot.docs[0];
  const alunoId = alunoDoc.id;
  const alunoData = alunoDoc.data();
  
  console.log('=== DADOS DO ALUNO ===');
  console.log('ID:', alunoId);
  console.log('Nome:', alunoData.nome);
  console.log('Email:', alunoData.email);
  console.log('XP no documento aluno:', alunoData.xp);
  console.log('Nível no documento aluno:', alunoData.nivel);
  
  // Buscar dados do ranking
  console.log('\n=== DADOS DO RANKING ===');
  const rankingDoc = await db.collection('ranking').doc(alunoId).get();
  
  if (rankingDoc.exists) {
    const rankingData = rankingDoc.data();
    console.log('Ranking encontrado:', JSON.stringify(rankingData, null, 2));
  } else {
    console.log('Documento de ranking NÃO encontrado para este aluno');
  }
  
  // Buscar último estudo
  console.log('\n=== ÚLTIMO ESTUDO ===');
  const estudosSnapshot = await db.collection('alunos')
    .doc(alunoId)
    .collection('estudos')
    .orderBy('data', 'desc')
    .limit(5)
    .get();
  
  if (!estudosSnapshot.empty) {
    estudosSnapshot.docs.forEach((doc, i) => {
      const estudo = doc.data();
      console.log(`Estudo ${i+1}:`, {
        data: estudo.data,
        materia: estudo.materia,
        tempoMinutos: estudo.tempoMinutos
      });
    });
  } else {
    console.log('Nenhum estudo encontrado');
  }
  
  // Listar todos os documentos na coleção ranking para verificar
  console.log('\n=== TODOS OS RANKINGS ===');
  const allRankings = await db.collection('ranking').get();
  console.log('Total de documentos na coleção ranking:', allRankings.size);
  allRankings.docs.forEach(doc => {
    const data = doc.data();
    console.log(`- ${doc.id}: nivel=${data.nivel}, pontosSemanais=${data.pontosSemanais}, nome=${data.nome}`);
  });
}

checkRanking().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
