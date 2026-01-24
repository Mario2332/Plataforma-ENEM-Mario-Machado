import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";


const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    // Cache busting: adicionar hash nos nomes dos arquivos
    assetsInlineLimit: 0,
    // Usar esbuild para minificação (padrão do Vite, mais rápido)
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar React e bibliotecas principais (juntos para evitar circular)
          'vendor-react': ['react', 'react-dom', 'react/jsx-runtime', 'scheduler'],
          // Separar Firebase (tudo junto para evitar circular)
          'vendor-firebase': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/storage',
            'firebase/functions'
          ],
          // Separar Recharts (gráficos) - só carrega quando necessário
          'vendor-recharts': ['recharts'],
          // Separar UI components (juntos para evitar circular)
          'vendor-ui': ['wouter', 'sonner'],
        },
      },
    },
    chunkSizeWarningLimit: 500, // Reduzido para alertar sobre chunks grandes
    // Otimização de sourcemaps para produção
    sourcemap: false,
  },
  // Otimizações de desenvolvimento
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'wouter',
      'sonner',
    ],
  },
  // Configuração de esbuild para remover console.log em produção
  esbuild: {
    drop: ['console', 'debugger'],
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
