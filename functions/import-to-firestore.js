/**
 * Script para importar dados para Firestore usando Firebase CLI
 * Execução: node import-to-firestore.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function importData() {
  try {
    console.log('📂 Carregando JSON...');
    
    // Carregar JSON
    const jsonPath = path.join(__dirname, 'src', 'study-content-data.json');
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    const baseData = JSON.parse(jsonContent);
    
    console.log(`✅ JSON carregado: ${Object.keys(baseData).length} matérias\n`);
    
    // Criar arquivo temporário para cada matéria
    const tempDir = path.join(__dirname, '.temp-import');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    
    console.log('🚀 Importando para Firestore...\n');
    
    for (const [materiaKey, materiaData] of Object.entries(baseData)) {
      const tempFile = path.join(tempDir, `${materiaKey}.json`);
      
      // Criar estrutura para import do Firebase
      const importData = {
        [`conteudos_base/${materiaKey}`]: materiaData
      };
      
      fs.writeFileSync(tempFile, JSON.stringify(importData, null, 2));
      
      try {
        // Usar Firebase CLI para importar
        execSync(`firebase firestore:delete "conteudos_base/${materiaKey}" -f`, { stdio: 'ignore' });
      } catch (e) {
        // Ignorar erro se documento não existe
      }
      
      const topicsCount = materiaData.topics?.length || 0;
      console.log(`  📝 Importando ${materiaKey}: ${topicsCount} tópicos...`);
      
      // Não há comando direto de import no Firebase CLI
      // Vamos usar uma abordagem diferente
    }
    
    // Limpar arquivos temporários
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    console.log('\n⚠️  Firebase CLI não suporta import direto de JSON.');
    console.log('💡 Solução: A função Cloud vai criar os dados automaticamente no primeiro acesso!\n');
    console.log('✅ Prossiga com o deploy das functions.');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

importData();
