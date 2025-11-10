# 🚀 Guia de Deploy usando GitHub Codespaces

Ótima notícia! Você **NÃO precisa instalar nada no seu computador**. Vamos usar o GitHub Codespaces, que é um ambiente de desenvolvimento completo na nuvem.

## O que é o GitHub Codespaces?

É como ter um computador virtual no navegador, já com tudo instalado (Node.js, Firebase CLI, etc.). Você só precisa de uma conta no GitHub.

## Passo 1: Preparar o Repositório no GitHub

### 1.1: Fazer commit das alterações

Como você já tem o projeto conectado ao GitHub, vamos enviar as atualizações:

1. Abra o terminal aqui no Manus
2. Execute os seguintes comandos:

```bash
cd /home/ubuntu/Plataforma-2026-Mentoria-Mario-Machado
git add .
git commit -m "Reestruturação completa para Firebase"
git push origin main
```

## Passo 2: Abrir o Codespace

### 2.1: Acessar o repositório

1. Acesse [GitHub.com](https://github.com) e faça login
2. Vá para o seu repositório: `Mario2332/Plataforma-2026-Mentoria-Mario-Machado`

### 2.2: Criar o Codespace

1. Clique no botão verde **"Code"**
2. Clique na aba **"Codespaces"**
3. Clique em **"Create codespace on main"**
4. Aguarde alguns segundos. Uma nova aba será aberta com o VS Code no navegador!

## Passo 3: Instalar Dependências no Codespace

Agora você está dentro do Codespace. Vamos instalar as dependências:

### 3.1: Abrir o Terminal

1. No menu superior, clique em **Terminal > New Terminal**
2. Um terminal aparecerá na parte inferior da tela

### 3.2: Instalar dependências

Digite os seguintes comandos, um de cada vez:

```bash
# Instalar dependências do projeto principal
npm install -g pnpm
pnpm install

# Instalar dependências das Cloud Functions
cd functions
pnpm install
cd ..
```

## Passo 4: Fazer Login no Firebase

### 4.1: Instalar Firebase CLI

```bash
npm install -g firebase-tools
```

### 4.2: Fazer login

```bash
firebase login --no-localhost
```

**O que vai acontecer:**
1. Um link será exibido no terminal
2. Copie e cole esse link no seu navegador
3. Faça login com sua conta Google (a mesma do Firebase)
4. Você verá um código de autorização
5. Copie esse código e cole no terminal do Codespace
6. Pressione Enter

## Passo 5: Deploy das Regras de Segurança

Primeiro, vamos enviar as regras de segurança do Firestore e Storage:

```bash
firebase deploy --only firestore:rules,storage:rules
```

Aguarde a conclusão. Você verá mensagens de sucesso.

## Passo 6: Deploy das Cloud Functions

Agora vamos enviar o backend (Cloud Functions):

```bash
firebase deploy --only functions
```

**⚠️ Atenção:** Este processo pode demorar de 5 a 10 minutos. É normal!

Você verá várias funções sendo criadas:
- `onUserCreated`
- `gestorFunctions-getMe`
- `gestorFunctions-getTotalAlunos`
- E muitas outras...

## Passo 7: Criar o Primeiro Usuário Gestor

Agora que tudo está no ar, vamos criar sua conta de administrador:

### 7.1: Criar usuário no Authentication

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto: **plataforma-mentoria-mario**
3. Vá para **Build > Authentication**
4. Clique em **"Adicionar usuário"**
5. Digite seu **email** e uma **senha forte**
6. Clique em **"Adicionar usuário"**
7. **Copie o UID** do usuário (é uma sequência de letras e números)

### 7.2: Criar documento no Firestore

1. Vá para **Build > Firestore Database**
2. Clique em **"+ Iniciar coleção"**
3. Digite `users` como ID da coleção e clique em **"Avançar"**
4. No campo **"ID do documento"**, **cole o UID** que você copiou
5. Adicione os seguintes campos:

| Campo | Tipo | Valor |
|-------|------|-------|
| `uid` | string | Cole o UID novamente |
| `email` | string | Seu email |
| `name` | string | Seu nome |
| `role` | string | `gestor` |
| `createdAt` | timestamp | Clique e selecione data/hora atual |
| `updatedAt` | timestamp | Clique e selecione data/hora atual |
| `lastSignedIn` | timestamp | Clique e selecione data/hora atual |

6. Clique em **"Salvar"**

### 7.3: Criar documento do gestor

1. Ainda no Firestore, clique em **"+ Iniciar coleção"**
2. Digite `gestores` como ID da coleção e clique em **"Avançar"**
3. No campo **"ID do documento"**, **cole o mesmo UID**
4. Adicione os seguintes campos:

| Campo | Tipo | Valor |
|-------|------|-------|
| `userId` | string | Cole o UID |
| `nome` | string | Seu nome |
| `email` | string | Seu email |
| `createdAt` | timestamp | Clique e selecione data/hora atual |

5. Clique em **"Salvar"**

## Passo 8: Deploy do Frontend (Vercel)

Agora vamos colocar a interface da plataforma no ar:

### 8.1: Conectar à Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Faça login com sua conta GitHub
3. Clique em **"Add New Project"**
4. Selecione o repositório **Plataforma-2026-Mentoria-Mario-Machado**
5. Clique em **"Import"**

### 8.2: Configurar o projeto

Na tela de configuração:

1. **Framework Preset:** Selecione `Vite`
2. **Build Command:** `pnpm build`
3. **Output Directory:** `dist`
4. **Install Command:** `pnpm install`

### 8.3: Deploy

1. Clique em **"Deploy"**
2. Aguarde alguns minutos
3. Quando terminar, você verá um link para sua plataforma! 🎉

## Passo 9: Testar a Plataforma

1. Acesse o link que a Vercel forneceu
2. Vá para `/login/gestor`
3. Faça login com o email e senha que você criou
4. Você deve ser redirecionado para o painel do gestor!

## 🎉 Pronto!

Sua plataforma está 100% funcional e no ar! Agora você pode:

- Criar mentores
- Os mentores podem criar alunos
- Os alunos podem registrar estudos e simulados
- Tudo está sendo salvo no Firebase

## 💡 Dicas Importantes

### Atualizações Futuras

Sempre que você quiser fazer alterações:

1. Abra o Codespace novamente
2. Faça as alterações no código
3. Execute `git add .` e `git commit -m "Descrição da alteração"`
4. Execute `git push`
5. Execute `firebase deploy --only functions` (se alterou o backend)
6. A Vercel vai fazer deploy automático do frontend!

### Custos

- **GitHub Codespaces:** 60 horas grátis por mês (mais que suficiente)
- **Firebase:** Plano gratuito é bem generoso
- **Vercel:** Plano gratuito para projetos pessoais

### Segurança

⚠️ **Nunca compartilhe:**
- O arquivo `serviceAccountKey.json`
- Suas senhas do Firebase
- Tokens de acesso

## Precisa de Ajuda?

Se algo der errado:

1. Verifique se todos os serviços estão habilitados no Firebase Console
2. Confira se as regras de segurança foram aplicadas
3. Veja os logs das Cloud Functions no Firebase Console
4. Me chame aqui no Manus! 😊

---

**Boa sorte com sua plataforma! 🚀**
