# Órbita Plataforma - Sistema de Gestão de Estudos ENEM

Plataforma multi-tenant de gestão de estudos para o ENEM com três níveis de acesso hierárquicos: Gestor, Mentor e Aluno.

## 🎯 Visão Geral

A Órbita Plataforma é um sistema completo de gestão de estudos para o ENEM que permite:

- **Gestores** criarem e gerenciarem múltiplos mentores com plataformas white-label personalizadas
- **Mentores** gerenciarem seus alunos e acompanharem o progresso individual
- **Alunos** registrarem estudos, simulados e acompanharem métricas de desempenho

## 🏗️ Arquitetura

### Stack Tecnológica

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS + shadcn/ui
- tRPC (comunicação type-safe com backend)
- Wouter (roteamento)

**Backend:**
- Node.js + Express
- tRPC 11 (API type-safe)
- Drizzle ORM
- MySQL/TiDB (banco de dados)
- Manus OAuth (autenticação)

### Estrutura do Banco de Dados

```
users (autenticação base)
├── gestores (administradores da plataforma)
│   └── mentores (clientes white-label)
│       └── alunos (usuários finais)
│           ├── estudos (sessões de estudo)
│           ├── simulados (provas do ENEM)
│           └── anotacoesMentor (notas privadas do mentor)
```

## 👥 Perfis de Usuário

### 1. ALUNO

**Dashboard Inicial:**
- Cards com métricas principais (streak, tempo total, questões, último simulado)
- Análise inteligente com sugestões personalizadas
- Botões de ação rápida

**Registro de Estudos:**
- Formulário completo com matéria, conteúdo, tempo, questões e flashcards
- Cronômetro integrado com funções de iniciar/pausar/resetar
- Histórico completo com tabela ordenável
- Edição e exclusão de registros

**Simulados:**
- Registro detalhado por área (Linguagens, Humanas, Natureza, Matemática)
- Registro de redação com nota e tempo
- Histórico com cálculos automáticos de totais
- Anotações por simulado (futuro: editor Quill.js)

**Métricas e Análises:**
- Painel com tempo total, questões resolvidas e taxa de acerto
- Análise por matéria com gráficos de progresso
- Identificação automática de pontos fortes e fracos

### 2. MENTOR (White-label)

**Dashboard:**
- Visão geral dos alunos vinculados
- Métricas de engajamento
- Informações da plataforma personalizada

**Gestão de Alunos:**
- Listagem completa com status (ativo/inativo)
- Adicionar novos alunos
- Editar informações (nome, email, celular, plano)
- Remover alunos

**Acompanhamento:**
- Visualizar dashboard completo de qualquer aluno
- Acesso a todas as métricas e registros
- Anotações privadas por aluno

### 3. GESTOR (Órbita Plataforma)

**Dashboard:**
- Total de mentores cadastrados
- Total de alunos na plataforma
- Métricas de crescimento

**Gestão de Mentores:**
- Criar novos mentores/clientes
- Configuração white-label:
  - Nome da plataforma
  - Logo personalizado
  - Cor principal (branding)
- Ativar/desativar mentores

## 🚀 Funcionalidades Implementadas

### ✅ Fase 1: Configuração Base
- [x] Schema do banco de dados completo
- [x] Sistema de roles (gestor, mentor, aluno)
- [x] Autenticação e proteção de rotas
- [x] Navegação adaptativa por role

### ✅ Fase 2: Funcionalidades do Aluno
- [x] Dashboard com métricas e análise inteligente
- [x] Registro manual de estudos
- [x] Cronômetro funcional
- [x] Histórico de estudos
- [x] Registro completo de simulados
- [x] Histórico de simulados com cálculos
- [x] Página de métricas por matéria

### ✅ Fase 3: Funcionalidades do Mentor
- [x] Dashboard com visão geral
- [x] Listagem de alunos
- [x] Adicionar novos alunos

### ✅ Fase 4: Funcionalidades do Gestor
- [x] Dashboard com métricas gerais
- [x] Listagem de mentores
- [x] Adicionar mentores com white-label

## 🔮 Funcionalidades Futuras

### Aluno
- [ ] Heatmap de consistência (90 dias)
- [ ] Gráficos de pizza (tempo por área)
- [ ] Gráfico de evolução semanal
- [ ] Editor de anotações em simulados (Quill.js)
- [ ] Filtros de período em gráficos
- [ ] Sistema de metas e objetivos
- [ ] Gamificação (badges, níveis, ranking)
- [ ] Notificações e lembretes
- [ ] Exportação de relatórios em PDF

### Mentor
- [ ] Visualizar dashboard completo do aluno
- [ ] Editor de anotações privadas
- [ ] Busca e filtro de alunos
- [ ] Relatórios consolidados
- [ ] Sistema de mensagens
- [ ] Comparativo de desempenho

### Gestor
- [ ] Analytics avançado
- [ ] Gestão de pagamentos
- [ ] Sistema de suporte
- [ ] FAQ integrado

### Integrações
- [ ] Webhooks Kiwify/Hotmart
  - Ativação automática ao comprar
  - Desativação ao cancelar
  - Renovação de assinatura
- [ ] Email transacional
- [ ] Notificações push

## 🔐 Segurança e Privacidade

- Autenticação via Manus OAuth
- Proteção de rotas baseada em roles
- Validação de dados no frontend e backend
- Isolamento de dados por tenant
- Regras de segurança no banco de dados

## 📱 Responsividade

- Design mobile-first
- Sidebar colapsável em dispositivos móveis
- Tabelas com scroll horizontal
- Cards adaptáveis
- Breakpoints otimizados

## 🎨 Personalização (White-label)

Cada mentor pode ter sua própria identidade visual:
- Nome da plataforma personalizado
- Logo customizado
- Cor principal (aplicada em toda a interface)
- Domínio próprio (futuro)

## 🔄 Fluxo de Dados

```
Gestor cria Mentor
  ↓
Mentor adiciona Alunos
  ↓
Alunos registram Estudos e Simulados
  ↓
Mentor acompanha progresso
  ↓
Gestor visualiza métricas gerais
```

## 🛠️ Desenvolvimento

### Pré-requisitos
- Node.js 22+
- pnpm
- MySQL/TiDB

### Instalação
```bash
cd orbita-plataforma
pnpm install
```

### Configuração
As variáveis de ambiente são injetadas automaticamente pela plataforma Manus.

### Desenvolvimento
```bash
pnpm dev
```

### Banco de Dados
```bash
# Aplicar mudanças no schema
pnpm db:push
```

## 📊 Modelo de Dados

### Principais Entidades

**User (Base de Autenticação)**
- openId, name, email
- role: 'gestor' | 'mentor' | 'aluno'

**Gestor**
- userId, nome, email

**Mentor**
- userId, gestorId, nome, email
- nomePlataforma, logoUrl, corPrincipal
- ativo

**Aluno**
- userId, mentorId, nome, email, celular
- plano, ativo

**Estudo**
- alunoId, data, materia, conteudo
- tempoMinutos, questoesFeitas, questoesAcertadas
- flashcardsRevisados

**Simulado**
- alunoId, nome, data
- linguagensAcertos, linguagensTempo
- humanasAcertos, humanasTempo
- naturezaAcertos, naturezaTempo
- matematicaAcertos, matematicaTempo
- redacaoNota, redacaoTempo
- anotacoes

**AnotacaoMentor**
- mentorId, alunoId, conteudo

## 🎯 Métricas Calculadas

### Streak (Sequência de Dias)
Conta dias consecutivos de estudo até hoje, considerando apenas datas únicas.

### Percentual de Acerto
`(questoesAcertadas / questoesFeitas) * 100`

### Total de Acertos em Simulado
Soma de acertos nas 4 áreas (Linguagens + Humanas + Natureza + Matemática)

### Análise por Matéria
Agrupa estudos por matéria e calcula:
- Total de questões
- Total de acertos
- Percentual de acerto
- Tempo dedicado

## 📝 Notas Técnicas

### tRPC
Toda comunicação frontend-backend usa tRPC para type-safety completo. Os routers estão organizados por perfil:
- `aluno.router.ts`
- `mentor.router.ts`
- `gestor.router.ts`

### Proteção de Rotas
Cada procedimento tRPC valida o role do usuário antes de executar a operação.

### Multi-tenancy
O sistema isola dados por hierarquia:
- Mentores só veem seus alunos
- Alunos só veem seus próprios dados
- Gestores veem tudo

## 🚧 Limitações Conhecidas

1. **Criação de Usuários**: Atualmente, ao adicionar aluno/mentor, o userId é temporário (0). Em produção, deve-se integrar com sistema de convites por email.

2. **Edição de Estudos**: Botão de edição está desabilitado. Implementar modal de edição similar ao de criação.

3. **Anotações em Simulados**: Editor Quill.js ainda não implementado.

4. **Gráficos Avançados**: Alguns gráficos (heatmap, pizza, linha) ainda não implementados.

5. **Filtros de Período**: Filtros de data em gráficos não implementados.

## 🔗 Integrações Futuras

### Kiwify/Hotmart
Estrutura preparada para receber webhooks:
- `/api/webhooks/kiwify` (futuro)
- `/api/webhooks/hotmart` (futuro)

Eventos a processar:
- Compra aprovada → criar aluno + enviar email
- Cancelamento → desativar aluno
- Renovação → reativar aluno

## 📄 Licença

Projeto proprietário - Órbita Plataforma

## 🤝 Suporte

Para dúvidas ou suporte, entre em contato através da plataforma.
