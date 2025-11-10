const fs = require('fs');

// Ler o arquivo HTML completo
const html = fs.readFileSync('/home/ubuntu/upload/pasted_content.txt', 'utf-8');

// Extrair o bloco studyData
const match = html.match(/const studyData = (\{[\s\S]*?\n        \});/);

if (!match) {
  console.error('Não foi possível extrair studyData');
  process.exit(1);
}

// Eval seguro: criar função que retorna o objeto
const studyDataCode = match[1];
const studyData = eval(`(${studyDataCode})`);

// Salvar como JSON
fs.writeFileSync(
  '/home/ubuntu/orbita-plataforma/shared/study-content-data.json',
  JSON.stringify(studyData, null, 2),
  'utf-8'
);

console.log('✅ Dados extraídos com sucesso!');
console.log(`Total de matérias: ${Object.keys(studyData).length}`);
Object.entries(studyData).forEach(([key, subject]) => {
  console.log(`  - ${subject.displayName}: ${subject.topics.length} tópicos`);
});
