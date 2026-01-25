import { Countdown } from "@/components/landing/Countdown";
import { LeadForm } from "@/components/landing/LeadForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Star, Zap, Target, BookOpen, Trophy, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a1628] text-white overflow-x-hidden font-sans selection:bg-[#9aff00] selection:text-[#0a1628]">
      {/* Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#9aff00]/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-[#1e3a8a]/20 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: "2s" }} />
        <div className="absolute top-[40%] left-[20%] w-[300px] h-[300px] bg-[#9aff00]/5 rounded-full blur-[100px] animate-float" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 px-4 md:px-6">
        <div className="container mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#9aff00]/10 border border-[#9aff00]/20 text-[#9aff00] font-medium text-sm mb-8 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#9aff00] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#9aff00]"></span>
            </span>
            Abertura das Vendas: 30/01
          </div>
          
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-6 leading-[1.1] animate-slide-up">
            Aprovação em Medicina: <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-gray-400">
              O jogo fica mais difícil
            </span>
            <span className="block text-[#9aff00] mt-2">a cada ano.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Pare de estudar errado. Tenha acesso à estratégia exata que me fez passar em Medicina na UFG estudando em casa.
          </p>

          <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <Countdown />
            <LeadForm />
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="relative z-10 py-24 bg-[#112240]/30 border-y border-white/5 backdrop-blur-sm">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Por que a <span className="text-[#9aff00]">Plataforma Mentoria Mário Machado</span>?
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Não é apenas um cronograma. É um sistema completo de organização e estratégia para vestibulandos de alta performance.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Target className="w-8 h-8 text-[#9aff00]" />,
                title: "Cronograma Inteligente",
                description: "Organização semanal adaptável à sua rotina, garantindo que você cubra todo o edital sem burnout."
              },
              {
                icon: <BarChart3 className="w-8 h-8 text-[#9aff00]" />,
                title: "Métricas de Evolução",
                description: "Acompanhe seu progresso com gráficos detalhados de acertos, tempo de estudo e simulados."
              },
              {
                icon: <BookOpen className="w-8 h-8 text-[#9aff00]" />,
                title: "Banco de Questões",
                description: "Milhares de questões filtradas por dificuldade e incidência no ENEM e vestibulares."
              }
            ].map((item, index) => (
              <Card key={index} className="bg-[#112240]/50 border-white/10 hover:border-[#9aff00]/50 transition-all duration-300 hover:-translate-y-1 group">
                <CardContent className="p-8">
                  <div className="mb-6 p-4 bg-[#9aff00]/10 rounded-2xl w-fit group-hover:bg-[#9aff00]/20 transition-colors">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3 font-display text-white">{item.title}</h3>
                  <p className="text-gray-400 leading-relaxed">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Idealizador */}
      <section className="relative z-10 py-24 bg-black overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        <div className="container mx-auto max-w-6xl px-4 relative">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative order-2 md:order-1">
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
              <div className="relative z-0 rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-[#9aff00]/10">
                <img 
                  src="/images/mario-machado.png" 
                  alt="Mário Machado" 
                  className="w-full h-auto object-cover grayscale hover:grayscale-0 transition-all duration-500"
                />
              </div>
              {/* Elemento decorativo */}
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-[#9aff00] rounded-full blur-[40px] opacity-50" />
            </div>
            
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/80 text-sm mb-6">
                <Star className="w-4 h-4 text-[#9aff00] fill-[#9aff00]" />
                <span>Idealizador da Plataforma</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
                Quem é <span className="text-[#9aff00]">Mário Machado</span>?
              </h2>
              
              <div className="space-y-6 text-lg text-gray-300">
                <p>
                  Aprovado em <strong className="text-white">Medicina na UFG com média 829,5</strong> estudando em casa, por conta própria.
                </p>
                <p>
                  Não sou apenas um estudante que passou. Sou um mentor que já orientou centenas de estudantes rumo à aprovação em Medicina há mais de 3 anos.
                </p>
                <p>
                  Criei a Plataforma Mentoria Mário Machado para democratizar o acesso às ferramentas e estratégias que os cursinhos tradicionais não ensinam: <strong className="text-white">como estudar com inteligência estratégica.</strong>
                </p>
              </div>

              <div className="mt-8 flex gap-4">
                <div className="flex flex-col">
                  <span className="text-3xl font-bold text-white font-display">829,5</span>
                  <span className="text-sm text-gray-400">Média Geral</span>
                </div>
                <div className="w-px h-12 bg-white/10" />
                <div className="flex flex-col">
                  <span className="text-3xl font-bold text-white font-display">+3 Anos</span>
                  <span className="text-sm text-gray-400">de Experiência</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Oferta */}
      <section className="relative z-10 py-24 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-gradient-to-b from-[#112240] to-[#0a1628] border border-[#9aff00]/20 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
            {/* Glow effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-[#9aff00]/10 blur-[60px]" />
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-display font-bold mb-2">
                Oferta de Lançamento
              </h2>
              <p className="text-gray-400 mb-8">Válida apenas para a abertura no dia 30/01</p>
              
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-8">
                <div className="text-2xl text-gray-400 line-through decoration-red-500/50">
                  R$ 397,00
                </div>
                <div className="text-6xl md:text-7xl font-bold text-white font-display">
                  R$ 97<span className="text-2xl text-[#9aff00]">,00</span>
                </div>
              </div>

              <div className="bg-[#9aff00]/5 border border-[#9aff00]/20 rounded-xl p-6 mb-10 max-w-2xl mx-auto">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Trophy className="w-6 h-6 text-[#9aff00]" />
                  <h3 className="text-xl font-bold text-white">BÔNUS EXCLUSIVO</h3>
                </div>
                <p className="text-gray-300">
                  Os <strong className="text-white">3 primeiros compradores</strong> terão acesso a dois ciclos de simulados da <strong className="text-white">Evolucional</strong>, com acesso à plataforma deles e análise TRI detalhada.
                </p>
              </div>

              <div className="max-w-md mx-auto">
                <LeadForm />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-black/50">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400 text-sm">
            © 2026 Mentoria Mário Machado. Todos os direitos reservados.
          </p>
          <p className="text-xs text-gray-400/50 mt-2">
            Este site não faz parte do site do Facebook ou Facebook Inc. Além disso, este site não é endossado pelo Facebook de nenhuma maneira.
          </p>
        </div>
      </footer>
    </div>
  );
}

// Icon component helper
function BarChart3(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  )
}
