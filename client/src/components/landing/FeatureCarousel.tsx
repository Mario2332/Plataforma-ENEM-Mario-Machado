import { useState } from "react";
import { LayoutDashboard, Calendar, BarChart3, Clock, TrendingUp, Target, FileText, BookOpen, Brain, Trophy } from "lucide-react";

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  image: string;
}

const features: Feature[] = [
  {
    icon: <LayoutDashboard className="w-5 h-5" />,
    title: "Visão Geral Completa",
    description: "Painel intuitivo com resumo do seu progresso, próximas atividades e métricas principais em um só lugar.",
    image: "/lp-carousel/inicio.webp",
  },
  {
    icon: <Calendar className="w-5 h-5" />,
    title: "Cronograma Dinâmico",
    description: "Planejamento adaptável que se ajusta à sua rotina. Visualize suas tarefas diárias, semanais e mensais com clareza.",
    image: "/lp-carousel/cronograma.webp",
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: "Análise de Desempenho",
    description: "Identifique seus pontos fortes e fracos com mapas de calor e métricas detalhadas por disciplina.",
    image: "/lp-carousel/desempenho.webp",
  },
  {
    icon: <Clock className="w-5 h-5" />,
    title: "Distribuição de Tempo",
    description: "Entenda exatamente onde você está investindo seu tempo e otimize sua rotina de estudos.",
    image: "/lp-carousel/distribuicao.webp",
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    title: "Evolução Temporal",
    description: "Acompanhe seu crescimento ao longo do tempo e veja como sua constância se traduz em resultados.",
    image: "/lp-carousel/evolucao.webp",
  },
  {
    icon: <Target className="w-5 h-5" />,
    title: "Gestão de Metas",
    description: "Defina objetivos claros e acompanhe seu progresso diário para manter a motivação sempre alta.",
    image: "/lp-carousel/metas.webp",
  },
  {
    icon: <FileText className="w-5 h-5" />,
    title: "Redações Detalhadas",
    description: "Acompanhe sua evolução na redação com gráficos de competências e histórico de notas.",
    image: "/lp-carousel/redacoes-graficos.webp",
  },
  {
    icon: <BookOpen className="w-5 h-5" />,
    title: "Controle de Simulados",
    description: "Registre seus simulados, analise seus erros e veja sua evolução na nota geral e por área.",
    image: "/lp-carousel/simulados.webp",
  },
  {
    icon: <Brain className="w-5 h-5" />,
    title: "Autodiagnóstico + Plano de ação",
    description: "Faça o autodiagnóstico de cada simulado, entenda quais estão sendo seus erros mais frequentes nas provas e receba automaticamente o plano de ação correto para cada erro cometido em cada prova!",
    image: "/lp-carousel/autodiagnostico.webp",
  },
  {
    icon: <Trophy className="w-5 h-5" />,
    title: "Ranking e Gamificação",
    description: "Compare seu desempenho com outros estudantes e mantenha-se motivado com nosso sistema de níveis.",
    image: "/lp-carousel/ranking.webp",
  },
];

export function FeatureCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
      {/* Lista de features à esquerda */}
      <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {features.map((feature, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-300 shrink-0 min-h-[72px] ${
              activeIndex === index
                ? "bg-[#9aff00]/10 border border-[#9aff00]/30"
                : "bg-transparent border border-transparent hover:bg-white/5"
            }`}
          >
            <div
              className={`mt-0.5 p-2 rounded-lg shrink-0 transition-colors ${
                activeIndex === index
                  ? "bg-[#9aff00]/20 text-[#9aff00]"
                  : "bg-white/5 text-gray-400"
              }`}
            >
              {feature.icon}
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <h3
                className={`font-bold text-sm transition-colors leading-tight ${
                  activeIndex === index ? "text-[#9aff00]" : "text-white"
                }`}
              >
                {feature.title}
              </h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-2 break-words">
                {feature.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Preview da imagem à direita */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-[#9aff00]/5 bg-[#112240]/50">
        <div className="relative aspect-video">
          <img
            src={features[activeIndex].image}
            alt={features[activeIndex].title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-opacity duration-300"
          />
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a1628] via-[#0a1628]/80 to-transparent p-6">
          <h3 className="text-xl font-bold text-white mb-1">
            {features[activeIndex].title}
          </h3>
          <p className="text-sm text-gray-300">
            {features[activeIndex].description}
          </p>
        </div>

        {/* Indicadores de navegação */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {features.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                activeIndex === index
                  ? "bg-[#9aff00] w-6"
                  : "bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
