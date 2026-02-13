import React, { useState, lazy, Suspense } from "react";
import { Calendar, Zap, BarChart2, CalendarDays, RefreshCw, ListTodo, CalendarRange, Loader2 } from "lucide-react";

// Lazy loading para cada componente de cronograma
// Isso garante que apenas o componente ativo seja carregado
const CronogramaLista = lazy(() => import("./CronogramaLista"));
const CronogramaAgenda = lazy(() => import("./CronogramaAgenda"));
const CronogramaAnual = lazy(() => import("./cronograma/CronogramaAnual"));
const CronogramaEstatisticas = lazy(() => import("./cronograma/CronogramaEstatisticas"));
const CronogramaDinamico = lazy(() => import("./CronogramaDinamico"));

// Componente de loading para os sub-componentes
const ComponentLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      <p className="text-sm text-gray-500">Carregando...</p>
    </div>
  </div>
);

export default function CronogramaWrapper() {
  const [activeTab, setActiveTab] = useState<"semanal" | "agenda" | "anual-ciclos" | "anual-dinamico">("semanal");
  const [anualSubTab, setAnualSubTab] = useState<"ciclos" | "estatisticas">("ciclos");

  return (
    <div className="space-y-6 pb-8 animate-fade-in">
      {/* Elementos decorativos */}
      <div className="fixed top-20 right-10 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="fixed bottom-20 left-10 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-float-delayed pointer-events-none" />

      {/* Header Premium */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500/20 via-cyan-500/10 to-blue-500/10 p-8 border-2 border-white/20 dark:border-white/10 backdrop-blur-xl shadow-2xl animate-slide-up">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-indigo-500/30 to-cyan-500/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-gradient-to-br from-cyan-500/30 to-blue-500/30 rounded-full blur-2xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-500/25">
              <Calendar className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
                Cronograma de Estudos
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Organize sua rotina e maximize seu aprendizado
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs de navegação principal */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1.5">
        <nav className="flex flex-wrap gap-1" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("semanal")}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all
              ${
                activeTab === "semanal"
                  ? "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
              }
            `}
          >
            <ListTodo className="w-4 h-4" />
            Semanal
          </button>
          <button
            onClick={() => setActiveTab("agenda")}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all
              ${
                activeTab === "agenda"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
              }
            `}
          >
            <CalendarRange className="w-4 h-4" />
            Agenda
          </button>
          <button
            onClick={() => setActiveTab("anual-ciclos")}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all
              ${
                activeTab === "anual-ciclos"
                  ? "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
              }
            `}
          >
            <RefreshCw className="w-4 h-4" />
            Anual - Ciclos
          </button>
          <button
            onClick={() => setActiveTab("anual-dinamico")}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all
              ${
                activeTab === "anual-dinamico"
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
              }
            `}
          >
            <Zap className="w-4 h-4" />
            Anual - Dinâmico
          </button>
        </nav>
      </div>

      {/* Sub-tabs para Anual - Ciclos */}
      {activeTab === "anual-ciclos" && (
        <div className="bg-gray-50 rounded-lg p-1 inline-flex gap-1">
          <button
            onClick={() => setAnualSubTab("ciclos")}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all
              ${
                anualSubTab === "ciclos"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }
            `}
          >
            <CalendarDays className="w-4 h-4" />
            Ciclos
          </button>
          <button
            onClick={() => setAnualSubTab("estatisticas")}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all
              ${
                anualSubTab === "estatisticas"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }
            `}
          >
            <BarChart2 className="w-4 h-4" />
            Estatísticas
          </button>
        </div>
      )}

      {/* Conteúdo das tabs com Suspense para lazy loading */}
      <div>
        {activeTab === "semanal" && (
          <Suspense fallback={<ComponentLoader />}>
            <CronogramaLista />
          </Suspense>
        )}
        {activeTab === "agenda" && (
          <Suspense fallback={<ComponentLoader />}>
            <CronogramaAgenda />
          </Suspense>
        )}
        {activeTab === "anual-ciclos" && (
          <Suspense fallback={<ComponentLoader />}>
            {anualSubTab === "ciclos" && <CronogramaAnual />}
            {anualSubTab === "estatisticas" && <CronogramaEstatisticas />}
          </Suspense>
        )}
        {activeTab === "anual-dinamico" && (
          <Suspense fallback={<ComponentLoader />}>
            <CronogramaDinamico />
          </Suspense>
        )}
      </div>
    </div>
  );
}
