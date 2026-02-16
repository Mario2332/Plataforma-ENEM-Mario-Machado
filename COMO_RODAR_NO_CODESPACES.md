# 🚀 Como Rodar o Projeto no GitHub Codespaces

Este guia explica como configurar e rodar o projeto "Plataforma de Mentoria ENEM" usando o GitHub Codespaces, um ambiente de desenvolvimento na nuvem que não exige nenhuma instalação local.

## O que é o GitHub Codespaces?

É um ambiente de desenvolvimento completo que roda no seu navegador. Ele já vem com todas as ferramentas necessárias, como Node.js, pnpm e a CLI do Firebase, pré-instaladas.

## Passo a Passo para Rodar o Projeto

### 1. Abrir o Projeto em um Codespace

1.  Navegue até a página principal do repositório no GitHub: [Mario2332/Plataforma-ENEM-Mario-Machado](https://github.com/Mario2332/Plataforma-ENEM-Mario-Machado)
2.  Clique no botão verde **"<> Code"**.
3.  Vá para a aba **"Codespaces"**.
4.  Clique em **"Create codespace on main"**.
5.  Aguarde um momento enquanto o ambiente é preparado. Uma nova aba será aberta com o VS Code rodando diretamente no seu navegador.

### 2. Instalar as Dependências

Assim que o Codespace carregar, um terminal integrado aparecerá na parte inferior. Execute os seguintes comandos para instalar todas as dependências do projeto:

```bash
# Instala o pnpm (gerenciador de pacotes rápido e eficiente)
npm install -g pnpm

# Instala as dependências do projeto principal (frontend)
pnpm install

# Navega para a pasta das Cloud Functions (backend)
cd functions

# Instala as dependências do backend
pnpm install

# Volta para a pasta raiz do projeto
cd ..
```

### 3. Configurar o Firebase

O projeto utiliza o Firebase para backend, banco de dados e autenticação.

#### 3.1. Fazer Login no Firebase

Execute o comando abaixo no terminal do Codespace. A flag `--no-localhost` é essencial para que a autenticação funcione corretamente no ambiente em nuvem.

```bash
firebase login --no-localhost
```

-   Um link de autenticação será exibido no terminal.
-   **Copie** este link e **cole** em uma nova aba do seu navegador.
-   Faça login com a conta Google associada ao seu projeto Firebase.
-   Após a autorização, um código de verificação será exibido.
-   **Copie** este código e **cole** de volta no terminal do Codespace para concluir o login.

#### 3.2. Fazer Deploy das Regras e Funções

Com o login feito, execute os seguintes comandos para publicar as regras de segurança e as Cloud Functions no seu projeto Firebase:

```bash
# Deploy das regras de segurança do Firestore e Storage
firebase deploy --only firestore:rules,storage:rules

# Deploy das Cloud Functions (backend)
firebase deploy --only functions
```

**Atenção:** O deploy das functions pode levar alguns minutos.

### 4. Rodar o Ambiente de Desenvolvimento Local

Finalmente, para ver o frontend da aplicação rodando, execute:

```bash
pnpm run dev
```

-   O terminal mostrará uma URL (geralmente algo como `http://localhost:5173`).
-   O Codespaces automaticamente fará o redirecionamento de porta. Uma notificação aparecerá no canto inferior direito com um botão **"Open in Browser"**.
-   Clique nesse botão para abrir a aplicação rodando em uma nova aba.

## 🎉 Pronto!

Seu ambiente de desenvolvimento está 100% configurado e rodando na nuvem. Agora você pode editar o código no VS Code do Codespace, e as alterações serão refletidas automaticamente no navegador.

### Dicas Adicionais

-   **Fazer Commit:** Para salvar suas alterações, use os comandos `git add .`, `git commit -m "sua mensagem"` e `git push` diretamente no terminal do Codespace.
-   **Vercel:** Para o deploy de produção do frontend, o projeto está configurado para usar a Vercel, que se integra diretamente com o GitHub e faz o deploy automático a cada `push` no branch `main`.
