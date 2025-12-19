# Backup de Designs - Pré-Natal 2024

Este arquivo contém os designs originais antes das alterações de Natal.
Use para restaurar após as festas.

---

## 1. Box de Boas-vindas (AlunoHome.tsx - linhas 313-351)

```tsx
{/* Header Premium com Glassmorphism */}
<div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-purple-500/10 to-blue-500/10 p-10 border-2 border-white/20 dark:border-white/10 backdrop-blur-xl shadow-2xl animate-slide-up">
  {/* Efeitos de luz */}
  <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl animate-pulse-slow" />
  <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-purple-500/20 to-transparent rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
  
  {/* Partículas decorativas */}
  <div className="absolute top-10 right-20 w-2 h-2 bg-primary rounded-full animate-ping" />
  <div className="absolute top-20 right-40 w-1.5 h-1.5 bg-purple-500 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
  <div className="absolute bottom-10 left-20 w-2 h-2 bg-blue-500 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
  
  <div className="relative space-y-4">
    <div className="flex items-center gap-4">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary to-purple-500 rounded-2xl blur-xl opacity-50 animate-pulse-slow" />
        <div className="relative bg-gradient-to-br from-primary via-purple-500 to-blue-500 p-4 rounded-2xl shadow-2xl">
          <Trophy className="h-10 w-10 text-white" />
        </div>
      </div>
      <div>
        <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-primary via-purple-600 to-blue-600 bg-clip-text text-transparent animate-gradient">
          Olá, {userData?.name?.split(' ')[0] || "Aluno"}!
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-6xl animate-wave inline-block">👋</span>
          {streak > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-full border border-orange-500/30 backdrop-blur-sm animate-bounce-subtle">
              <Flame className="h-5 w-5 text-orange-500" />
              <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{streak} dias de foco!</span>
            </div>
          )}
        </div>
      </div>
    </div>
    <p className="text-xl text-muted-foreground font-medium">
      Continue sua jornada rumo à aprovação no ENEM 🎯
    </p>
  </div>
</div>
```

---

## 2. Elementos decorativos flutuantes (AlunoHome.tsx - linhas 309-311)

```tsx
{/* Elementos decorativos flutuantes */}
<div className="fixed top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-float pointer-events-none" />
<div className="fixed bottom-20 left-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-float-delayed pointer-events-none" />
```

---

## 3. Foto de perfil na barra lateral (DashboardLayout.tsx)

Localização: Buscar pelo Avatar do usuário na sidebar

```tsx
{/* Avatar do usuário - Design original sem gorro */}
<Avatar className="h-10 w-10 border-2 border-white/20">
  <AvatarImage src={userData?.photoURL} />
  <AvatarFallback className="bg-gradient-to-br from-primary to-purple-500 text-white font-bold">
    {userData?.name?.charAt(0) || "U"}
  </AvatarFallback>
</Avatar>
```

---

## Instruções para restaurar:

1. Remover componente `<Snowfall />` do AlunoHome.tsx
2. Substituir o box de boas-vindas pelo código original acima
3. Remover o gorro de Natal do DashboardLayout.tsx
4. Remover CSS de animações natalinas do arquivo de estilos
5. Remover imports de componentes natalinos

---

Data do backup: 18/12/2024


---

## 4. Card de usuário na barra lateral (DashboardLayout.tsx - linhas 422-447)

```tsx
<div className="flex items-center gap-3 rounded-xl px-2 py-2 w-full group-data-[collapsible=icon]:justify-center bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-2 border-blue-200 dark:border-blue-800 shadow-sm">
  <div className="relative shrink-0">
    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full blur-md opacity-50"></div>
    <Avatar className="relative h-11 w-11 border-2 border-white dark:border-gray-800 shadow-lg">
      {userData?.photoURL ? (
        <>
          {console.log('[DashboardLayout] Renderizando Avatar com photoURL:', userData.photoURL)}
          <AvatarImage src={userData.photoURL} alt={user?.name || "Foto de perfil"} />
        </>
      ) : (
        console.log('[DashboardLayout] Sem photoURL, mostrando fallback')
      )}
      <AvatarFallback className="text-sm font-black bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
        {user?.name?.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  </div>
  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
    <p className="text-sm font-bold truncate leading-none text-blue-900 dark:text-blue-100">
      {user?.name || "-"}
    </p>
    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate mt-1.5">
      {user?.email || "-"}
    </p>
  </div>
</div>
```

---

## 5. Animações de Natal adicionadas (index.css)

Remover as seguintes animações após as festas:

```css
/* 🎄 Animações de Natal 🎄 */
@keyframes snowfall { ... }
@keyframes christmas-glow { ... }
@keyframes christmas-lights { ... }
@keyframes santa-hat-wiggle { ... }

.animate-snowfall { ... }
.animate-christmas-glow { ... }
.animate-christmas-lights { ... }
.animate-santa-hat { ... }
```

---

## Resumo das alterações de Natal:

1. **AlunoHome.tsx:**
   - Box de boas-vindas com cores vermelho/verde
   - Luzinhas de Natal animadas no topo
   - Flocos de neve caindo (Snowflake icons)
   - Árvore de Natal decorativa (TreePine)
   - Presente animado (Gift)
   - Mensagem "Feliz Natal" + "Boas festas e bons estudos!"

2. **DashboardLayout.tsx:**
   - Gorro de Papai Noel SVG sobre o Avatar
   - Card de usuário com cores vermelho/verde
   - Animação de balanço no gorro

3. **index.css:**
   - Animação snowfall (flocos caindo)
   - Animação christmas-glow (luzinhas piscando)
   - Animação christmas-lights (brilho)
   - Animação santa-hat-wiggle (gorro balançando)
