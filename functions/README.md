# Cloud Functions - Plataforma Mentoria

## 📋 Configuração

As Cloud Functions estão configuradas para usar as credenciais padrão do Firebase automaticamente.

**Em produção:** O Firebase fornece as credenciais automaticamente. Nenhuma configuração adicional é necessária.

**Em desenvolvimento local:** Use os emuladores do Firebase (não precisa de credenciais).

## 🚀 Deploy

```bash
# Instalar dependências
cd functions
pnpm install

# Build
pnpm run build

# Deploy
firebase deploy --only functions
```

## ⚠️ Segurança

- ✅ As credenciais são gerenciadas automaticamente pelo Firebase em produção
- ✅ Não é necessário armazenar chaves de serviço no código
- ✅ Use os emuladores para desenvolvimento local

## 📁 Estrutura das Functions

```
src/
├── index.ts              # Exportação principal
├── triggers/
│   └── onUserCreated.ts  # Trigger de criação de usuário
├── callable/
│   ├── gestor.ts         # Funções do gestor
│   ├── mentor.ts         # Funções do mentor
│   ├── aluno.ts          # Funções do aluno
│   └── aluno-extras.ts   # Funções extras (cronograma, conteúdos)
└── utils/
    └── auth.ts           # Utilitários de autenticação
```

## 🔧 Desenvolvimento Local

Para testar as functions localmente:

```bash
firebase emulators:start
```

Isso iniciará os emuladores do Firebase na sua máquina.
