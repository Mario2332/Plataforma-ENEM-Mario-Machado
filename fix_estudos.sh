#!/bin/bash
FILE="client/src/pages/aluno/AlunoEstudos.tsx"
echo "Corrigindo aspas escapadas em $FILE..."
sed -i 's/\\"/"/g' "$FILE"
echo "✅ Correção concluída!"
echo ""
echo "Agora execute: pnpm build"
