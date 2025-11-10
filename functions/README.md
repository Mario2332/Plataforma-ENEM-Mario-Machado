# Cloud Functions - Plataforma Mentoria

## 📋 Configuração Necessária

Antes de fazer deploy das Cloud Functions, você precisa adicionar o arquivo de credenciais do Firebase Admin SDK.

### Como obter o arquivo `serviceAccountKey.json`:

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto: **plataforma-mentoria-mario**
3. Clique no ícone de engrenagem (⚙️) > **Configurações do projeto**
4. Vá para a aba **Contas de serviço**
5. Clique em **Gerar nova chave privada**
6. Confirme clicando em **Gerar chave**
7. Um arquivo `.json` será baixado

### Como usar:

1. Renomeie o arquivo baixado para `serviceAccountKey.json`
2. Coloque este arquivo nesta pasta (`functions/`)
3. **NUNCA faça commit deste arquivo no Git!** (já está no .gitignore)

### Estrutura esperada:

```
functions/
├── src/
├── package.json
├── tsconfig.json
├── serviceAccountKey.json  ← Adicione este arquivo aqui
└── README.md (este arquivo)
```

## 🚀 Deploy

Após adicionar o `serviceAccountKey.json`:

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

- ❌ **NUNCA** compartilhe o arquivo `serviceAccountKey.json`
- ❌ **NUNCA** faça commit dele no Git
- ❌ **NUNCA** o envie por email ou mensagens
- ✅ Mantenha-o apenas no seu ambiente local/Codespaces
- ✅ Use variáveis de ambiente em produção

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
