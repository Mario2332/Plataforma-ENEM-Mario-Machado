#!/bin/bash

# Array com as matérias
materias=("matematica" "biologia" "fisica" "quimica" "historia" "geografia" "linguagens" "filosofia" "sociologia")

for materia in "${materias[@]}"; do
  # Capitalizar primeira letra
  capitalized="$(tr '[:lower:]' '[:upper:]' <<< ${materia:0:1})${materia:1}"
  
  cat > "${capitalized}.tsx" << EOFPAGE
import MateriaPage from "./MateriaPage";

export default function ${capitalized}() {
  return <MateriaPage materiaKey="${materia}" />;
}
EOFPAGE
done

echo "✅ Páginas de matérias criadas com sucesso!"
