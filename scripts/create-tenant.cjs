const admin = require('firebase-admin');
const serviceAccount = require('/home/ubuntu/upload/plataforma-mentoria-mario-firebase-adminsdk-fbsvc-de3cee0400.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const tenantId = 'dominiotestemm.com.br';
const tenantData = {
  name: 'Mentoria Teste',
  logoUrl: 'https://firebasestorage.googleapis.com/v0/b/plataforma-mentoria-mario.firebasestorage.app/o/Logo%2FLogo%20mentoria%20sem%20texto.png?alt=media&token=452fed10-1481-41ad-a4c1-ddd61b039409', // Usando o mesmo logo por enquanto
  colors: {
    primary: '262 83% 58%', // Roxo (#8b5cf6)
    secondary: '262 83% 48%' // Roxo Escuro (#7c3aed)
  },
  createdAt: admin.firestore.FieldValue.serverTimestamp()
};

async function createTenant() {
  try {
    await db.collection('tenants').doc(tenantId).set(tenantData);
    console.log(`Tenant ${tenantId} criado com sucesso!`);
  } catch (error) {
    console.error('Erro ao criar tenant:', error);
  }
}

createTenant();
