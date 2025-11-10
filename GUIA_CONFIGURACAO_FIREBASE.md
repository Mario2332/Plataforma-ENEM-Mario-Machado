# 🚀 Guia de Configuração do Firebase - Plataforma Mentoria

Olá! Este é um guia passo a passo para você, que não é programador, configurar o projeto da plataforma no seu próprio ambiente Firebase. Siga cada etapa com atenção.

## 1. Pré-requisitos

Antes de começar, você vai precisar de:

1.  **Uma Conta no Google:** Essencial para acessar o Firebase.
2.  **Node.js e npm:** Um ambiente para rodar comandos. Não se preocupe, vou te guiar na instalação.
3.  **Firebase CLI:** A ferramenta de linha de comando do Firebase. Também vou te guiar.

## 2. Configuração no Firebase Console (Interface Web)

Vamos começar preparando seu projeto no site do Firebase.

### Passo 2.1: Criar o Projeto Firebase

1.  Acesse o [Firebase Console](https://console.firebase.google.com/).
2.  Clique em **"Adicionar projeto"**.
3.  Dê um nome para o seu projeto (ex: `plataforma-mentoria-prod`).
4.  **Desative** a opção "Ativar o Google Analytics neste projeto" (não precisamos disso agora) e clique em **"Criar projeto"**.
5.  Aguarde a criação do projeto.

### Passo 2.2: Habilitar a Autenticação

1.  No menu à esquerda, clique em **Build > Authentication**.
2.  Clique em **"Primeiros passos"**.
3.  Na lista de provedores, selecione **"E-mail/senha"** e ative-o. Clique em **"Salvar"**.

### Passo 2.3: Habilitar o Banco de Dados (Firestore)

1.  No menu à esquerda, clique em **Build > Firestore Database**.
2.  Clique em **"Criar banco de dados"**.
3.  Selecione **"Iniciar em modo de produção"** e clique em **"Avançar"**.
4.  Escolha a localização do Firestore. Recomendo **`southamerica-east1 (São Paulo)`**. Clique em **"Ativar"**.

### Passo 2.4: Habilitar o Armazenamento (Storage)

1.  No menu à esquerda, clique em **Build > Storage**.
2.  Clique em **"Primeiros passos"**.
3.  Selecione **"Iniciar em modo de produção"** e clique em **"Avançar"**.
4.  A localização será a mesma do Firestore. Clique em **"Concluído"**.

### Passo 2.5: Obter as Credenciais do Aplicativo Web

1.  No menu à esquerda, clique no ícone de engrenagem (⚙️) e vá para **"Configurações do projeto"**.
2.  Na aba **"Geral"**, role para baixo até a seção **"Seus apps"**.
3.  Clique no ícone **`</>`** (que representa "Web").
4.  Dê um apelido para o seu app (ex: "Plataforma Web") e clique em **"Registrar app"**.
5.  Na próxima tela, você verá um objeto chamado `firebaseConfig`. **Copie todo este código.** Ele se parece com o que você me enviou.
6.  **Ação:** Cole esse código no arquivo `client/src/lib/firebase.ts`, substituindo o conteúdo existente. Eu já deixei o arquivo preparado para você.

### Passo 2.6: Obter as Credenciais de Administrador (Service Account)

1.  Ainda em **"Configurações do projeto"**, vá para a aba **"Contas de serviço"**.
2.  Clique no botão **"Gerar nova chave privada"**. Um aviso aparecerá, confirme clicando em **"Gerar chave"**.
3.  Um arquivo `.json` será baixado no seu computador. Ele terá um nome como `seu-projeto-firebase-adminsdk-....json`.
4.  **Ação:**
    *   Renomeie este arquivo para `serviceAccountKey.json`.
    *   Mova este arquivo para a pasta `functions/` do projeto.

**⚠️ ATENÇÃO: Esta chave é super secreta! Nunca a compartilhe ou a envie para o GitHub.**

## 3. Configuração do Ambiente Local (Seu Computador)

Agora vamos preparar seu computador para interagir com o Firebase.

### Passo 3.1: Instalar Node.js

1.  Acesse o [site oficial do Node.js](https://nodejs.org/).
2.  Baixe e instale a versão **LTS** (a recomendada para a maioria dos usuários).

### Passo 3.2: Instalar o Firebase CLI

1.  Abra o **Terminal** (no Mac/Linux) ou o **PowerShell** (no Windows).
2.  Digite o seguinte comando e pressione Enter:
    ```bash
    npm install -g firebase-tools
    ```

### Passo 3.3: Fazer Login no Firebase

1.  Ainda no Terminal/PowerShell, digite o comando:
    ```bash
    firebase login
    ```
2.  Uma janela do navegador será aberta. Faça login com a mesma conta Google que você usou para criar o projeto no Firebase.

## 4. Deploy do Projeto

Com tudo configurado, vamos enviar o código para o Firebase.

### Passo 4.1: Instalar Dependências do Projeto

1.  Navegue até a pasta raiz do projeto no seu Terminal/PowerShell.
2.  Execute os seguintes comandos, um de cada vez:
    ```bash
    pnpm install
    cd functions && pnpm install && cd ..
    ```

### Passo 4.2: Fazer o Deploy

1.  Ainda na pasta raiz do projeto, execute o comando:
    ```bash
    firebase deploy
    ```
2.  Este comando irá:
    *   Enviar as regras de segurança do Firestore e do Storage.
    *   Enviar e ativar as Cloud Functions (o backend da aplicação).
3.  Aguarde o processo terminar. Ele pode demorar alguns minutos.

## 5. Criar o Primeiro Usuário Gestor

O sistema precisa de um administrador. Vamos criar sua conta de gestor manualmente.

1.  Volte para o **Firebase Console**.
2.  Vá para **Build > Authentication**.
3.  Clique em **"Adicionar usuário"**.
4.  Digite o seu **email** e uma **senha forte**. Clique em **"Adicionar usuário"**.
5.  **Copie o UID** do usuário que você acabou de criar (é uma sequência de letras e números).
6.  Agora, vá para **Build > Firestore Database**.
7.  Clique em **"+ Iniciar coleção"**. Digite `users` como ID da coleção.
8.  No campo **"ID do documento"**, **cole o UID** que você copiou.
9.  Adicione os seguintes campos e valores:
    *   `uid` (String): Cole o UID novamente.
    *   `email` (String): Seu email.
    *   `name` (String): Seu nome.
    *   `role` (String): `gestor`
    *   `createdAt` (Timestamp): Clique no campo e selecione a data e hora atuais.
    *   `updatedAt` (Timestamp): Clique no campo e selecione a data e hora atuais.
    *   `lastSignedIn` (Timestamp): Clique no campo e selecione a data e hora atuais.
10. Clique em **"Salvar"**.

## 6. Rodar a Aplicação Web

Por fim, para hospedar a parte visual (frontend), você pode usar a Vercel, como estava antes, ou o Firebase Hosting.

### Opção A: Usar a Vercel (Recomendado)

1.  Conecte seu repositório GitHub à Vercel.
2.  Configure o projeto na Vercel com as seguintes configurações:
    *   **Framework Preset:** `Vite`
    *   **Build Command:** `pnpm build`
    *   **Output Directory:** `dist`
3.  Adicione as variáveis de ambiente do `firebaseConfig` nas configurações da Vercel para que o frontend saiba como se conectar ao seu Firebase.

### Opção B: Usar o Firebase Hosting

1.  No Terminal, na raiz do projeto, execute: `firebase init hosting`.
2.  Selecione seu projeto.
3.  Informe `dist` como o diretório público.
4.  Configure como um single-page app (SPA).
5.  Após isso, execute `firebase deploy --only hosting` para publicar.

**Pronto!** Após seguir estes passos, sua plataforma estará 100% funcional e configurada no seu ambiente Firebase.
