# 🎓 Plataforma Mentoria Mario Machado

Plataforma completa de gestão de estudos para alunos, mentores e gestores, com foco na preparação para o ENEM.

## 🚀 Tecnologias

- **Frontend:** React 19, TypeScript, Vite, TailwindCSS, shadcn/ui
- **Backend:** Firebase Cloud Functions
- **Banco de Dados:** Firebase Firestore
- **Autenticação:** Firebase Authentication
- **Armazenamento:** Firebase Storage
- **Hospedagem:** Vercel (frontend) + Firebase (backend)

## 📦 Estrutura do Projeto

```
.
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── pages/         # Páginas da aplicação
│   │   ├── contexts/      # Contextos React
│   │   ├── hooks/         # Custom hooks
│   │   └── lib/           # Utilitários e configurações
│
├── functions/             # Firebase Cloud Functions
│   ├── src/
│   │   ├── callable/     # Funções callable
│   │   ├── triggers/     # Triggers automáticos
│   │   └── utils/        # Utilitários
│
├── firestore.rules        # Regras de segurança Firestore
├── storage.rules          # Regras de segurança Storage
├── firebase.json          # Configuração Firebase
└── GUIA_CONFIGURACAO_FIREBASE.md  # Guia de setup

```

## 🎯 Funcionalidades

### Para Alunos
- 📚 Registro de sessões de estudo
- 📝 Registro e análise de simulados
- 📊 Dashboard com métricas de desempenho
- 📅 Cronograma de estudos personalizável
- 🎯 Acompanhamento de progresso por matéria
- ✅ Checklist de conteúdos ENEM

### Para Mentores
- 👥 Gestão de alunos
- 📈 Visualização de métricas dos alunos
- 🎨 Plataforma white-label personalizada
- 📊 Dashboard consolidado

### Para Gestores
- 🏢 Gestão de mentores
- 👥 Visão geral de todos os alunos
- ⚙️ Configurações da plataforma
- 📊 Métricas gerais

## 🛠️ Instalação e Configuração

### Pré-requisitos
- Node.js 20+
- pnpm
- Firebase CLI

### Passo 1: Clonar o repositório
```bash
git clone https://github.com/Mario2332/Plataforma-2026-Mentoria-Mario-Machado.git
cd Plataforma-2026-Mentoria-Mario-Machado
```

### Passo 2: Instalar dependências
```bash
pnpm install
cd functions && pnpm install && cd ..
```

### Passo 3: Configurar Firebase
Siga o guia completo em `GUIA_CONFIGURACAO_FIREBASE.md`

### Passo 4: Rodar localmente
```bash
# Frontend
pnpm dev

# Cloud Functions (em outro terminal)
cd functions
pnpm serve
```

### Passo 5: Deploy
```bash
# Deploy completo
firebase deploy

# Apenas frontend (Vercel)
vercel deploy
```

## 📝 Licença

MIT

## 👨‍💻 Autor

Mario Machado
