import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Star, Zap, Target, BookOpen, Trophy, ArrowRight, Compass, Home, TrendingUp, Stethoscope, ShieldCheck, Lock, BarChart3, Brain, Calendar, LayoutDashboard, X } from "lucide-react";
import { FeatureCarousel } from "@/components/landing/FeatureCarousel";
import TestimonialCarousel from "@/components/landing/TestimonialCarousel";
import StickyHeader from "@/components/landing/StickyHeader";

export default function SalesPage() {
  const scrollToOffer = () => {
    const offerSection = document.getElementById('oferta');
    offerSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0a1628] text-white overflow-x-hidden font-sans selection:bg-[#9aff00] selection:text-[#0a1628]">
      {/* Sticky Header */}
      <StickyHeader />
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
            Oferta de Lançamento por Tempo Limitado!
          </div>
          
          <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight mb-6 leading-[1.1] animate-slide-up">
            A ferramenta que transforma sua preparação e te coloca mais perto da sua <span className="text-[#9aff00]">aprovação em Medicina</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Chega de estudar no escuro sem saber se está evoluindo. Planeje, metrifique e analise cada detalhe da sua preparação com a plataforma mais completa para o ENEM — e <span className="text-[#9aff00] font-bold">estude como um profissional até conquistar sua vaga</span>.
            <br/>
            <span className="text-sm md:text-base text-gray-500 mt-2 block">(Idealizada por um mentor com média 829 que orienta estudantes até a aprovação em Medicina há mais de 3 anos!)</span>
          </p>

          <div className="flex flex-col items-center gap-8 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <Button 
              onClick={scrollToOffer}
              className="h-16 px-12 text-lg font-bold bg-[#9aff00] text-[#0a1628] hover:bg-[#88e600] hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(154,255,0,0.4)] rounded-full group border-2 border-transparent hover:border-[#ccff66]"
            >
              QUERO GARANTIR MINHA VAGA
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <p className="text-sm text-gray-500 flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
              <Lock className="w-3 h-3" /> Compra 100% Segura
            </p>
          </div>
        </div>
      </section>

      {/* Feature Carousel Section */}
      <section className="relative z-10 py-24 bg-[#0a1628]">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
              Conheça a plataforma <span className="text-[#9aff00]">por dentro!</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              
            </p>
          </div>
          
          <FeatureCarousel />
          
          {/* CTA Intermediário */}
          <div className="flex justify-center mt-16 animate-fade-in">
            <Button 
              onClick={scrollToOffer}
              className="h-14 px-10 text-lg font-bold bg-[#9aff00] text-[#0a1628] hover:bg-[#88e600] hover:scale-105 transition-all duration-300 shadow-[0_0_30px_rgba(154,255,0,0.4)] rounded-full group border-2 border-transparent hover:border-[#ccff66]"
            >
              QUERO GARANTIR MINHA VAGA
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </section>

      {/* Para quem é */}
      <section className="relative z-10 py-32 bg-[#0d1b2e] border-y border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1e3a8a]/10 via-transparent to-transparent opacity-50" />
        
        <div className="container mx-auto max-w-6xl px-4 relative">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
              Para quem é a <span className="text-[#9aff00] drop-shadow-[0_0_15px_rgba(154,255,0,0.3)]">Plataforma</span>?
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Desenvolvida especificamente para resolver os maiores gargalos de quem estuda para alta performance.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Compass className="w-8 h-8 text-[#9aff00]" />,
                title: "Para quem se sente perdido",
                description: "Você sente que estuda muito mas não sai do lugar, tem matéria acumulada e não sabe como organizar a revisão."
              },
              {
                icon: <Home className="w-8 h-8 text-[#9aff00]" />,
                title: "Para quem estuda em casa",
                description: "Você estuda online e precisa de um sistema rígido de disciplina que substitua a estrutura do cursinho presencial."
              },
              {
                icon: <TrendingUp className="w-8 h-8 text-[#9aff00]" />,
                title: "Para quem estagnou na nota",
                description: "Você já fez cursinho, domina a teoria, mas sua nota estacionou e não consegue romper a barreira da aprovação."
              },
              {
                icon: <Stethoscope className="w-8 h-8 text-[#9aff00]" />,
                title: "Para quem quer Medicina",
                description: "Você entende que a concorrência é brutal e precisa de uma estratégia baseada em dados, não em 'achismo'."
              }
            ].map((item, index) => (
              <Card key={index} className="bg-[#112240]/40 border-white/5 hover:border-[#9aff00]/40 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(154,255,0,0.1)] group backdrop-blur-md overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#9aff00]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardContent className="p-8 relative z-10">
                  <div className="mb-6 p-4 bg-[#9aff00]/10 rounded-2xl w-fit group-hover:bg-[#9aff00] group-hover:text-[#0a1628] transition-all duration-500 shadow-[0_0_20px_rgba(154,255,0,0.1)]">
                    <div className="group-hover:text-[#0a1628] transition-colors duration-500">
                      {item.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-3 font-display text-white group-hover:text-[#9aff00] transition-colors">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed group-hover:text-gray-300 transition-colors">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Antes vs Depois */}
      <section className="relative z-10 py-32 bg-[#0a1628]">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
              Sua preparação <span className="text-red-500">ANTES</span> e <span className="text-[#9aff00]">DEPOIS</span> da Plataforma
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Veja a diferença entre estudar no escuro e estudar com estratégia profissional.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Coluna ANTES (Negativo) */}
            <div className="bg-gradient-to-br from-red-950/20 to-red-900/10 border-2 border-red-500/30 rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/10 rounded-full blur-[80px]" />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 font-bold text-sm mb-6 uppercase">
                  <X className="w-4 h-4" />
                  Sem a Plataforma
                </div>
                <div className="space-y-4">
                  {[
                    "Estudar sem saber se está evoluindo",
                    "Matéria acumulada e desorganizada",
                    "Não sabe onde está errando",
                    "Tempo desperdiçado em revisões ineficientes",
                    "Simulados sem análise profunda",
                    "Desmotivação por falta de resultados visíveis"
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-red-950/30 border border-red-500/20">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center mt-0.5">
                        <X className="w-4 h-4 text-red-400" />
                      </div>
                      <span className="text-gray-300 text-sm leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Coluna DEPOIS (Positivo) */}
            <div className="bg-gradient-to-br from-[#9aff00]/10 to-[#9aff00]/5 border-2 border-[#9aff00]/40 rounded-3xl p-8 relative overflow-hidden shadow-[0_0_60px_rgba(154,255,0,0.15)]">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#9aff00]/20 rounded-full blur-[80px]" />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#9aff00]/20 border border-[#9aff00]/40 text-[#9aff00] font-bold text-sm mb-6 uppercase">
                  <Check className="w-4 h-4" />
                  Com a Plataforma
                </div>
                <div className="space-y-4">
                  {[
                    "Métricas claras de progresso em tempo real",
                    "Cronograma adaptativo inteligente",
                    "Análise detalhada por disciplina e habilidade",
                    "Plano de ação personalizado para cada erro",
                    "Autodiagnóstico completo de cada simulado",
                    "Gamificação, ranking e motivação constante"
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[#9aff00]/10 border border-[#9aff00]/30 hover:bg-[#9aff00]/15 transition-colors">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#9aff00]/30 flex items-center justify-center mt-0.5">
                        <Check className="w-4 h-4 text-[#9aff00]" />
                      </div>
                      <span className="text-gray-200 text-sm leading-relaxed font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <TestimonialCarousel />
      
      {/* CTA Intermediário 2 */}
      <section className="relative z-10 py-16 bg-[#0a1628]">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <p className="text-xl md:text-2xl text-gray-300 mb-8 font-medium">
            Pronto para transformar sua preparação e <span className="text-[#9aff00] font-bold">conquistar sua vaga</span>?
          </p>
          <Button 
            onClick={scrollToOffer}
            className="h-16 px-12 text-lg font-bold bg-[#9aff00] text-[#0a1628] hover:bg-[#88e600] hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(154,255,0,0.5)] rounded-full group border-2 border-transparent hover:border-[#ccff66]"
          >
            QUERO COMEÇAR AGORA
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
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
                  src="/images/mario-machado.webp" 
                  alt="Mário Machado" 
                  width={641}
                  height={960}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-auto object-cover transition-all duration-500"
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
                  Possuo mais de 3 anos de experiência como mentor orientando estudantes como você até a aprovação em Medicina!
                </p>
                <p>
                  Criei a Plataforma Mentoria Mário Machado para fornecer uma ferramenta COMPLETA de planejamento, metrificação e análise da sua preparação para o ENEM. Com ela, você será capaz de organizar e analisar TUDO que é importante para uma preparação estratégica de alto nível!
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

      {/* Ancoragem de Preço */}
      <section className="relative z-10 py-24 bg-gradient-to-b from-[#0d1b2e] to-[#0a1628] border-t border-white/5">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
              Quanto vale <span className="text-[#9aff00]">organizar 1 ano</span> de estudos?
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Compare o investimento na plataforma com outras opções do mercado.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              { label: "Cursinho Presencial", value: "R$ 15.000", period: "/ano" },
              { label: "Mentor Particular", value: "R$ 5.000", period: "/ano" },
              { label: "Apps + Planilhas", value: "R$ 500", period: "/ano" },
              { label: "Mais 1 Ano Perdido", value: "Incalculável", period: "" }
            ].map((item, i) => (
              <div key={i} className="bg-[#112240]/50 border border-red-500/30 rounded-2xl p-6 text-center relative overflow-hidden group hover:border-red-500/50 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <p className="text-gray-400 text-sm mb-3 font-medium">{item.label}</p>
                  <div className="relative inline-block">
                    <p className="text-3xl font-bold text-white line-through decoration-red-500/70 decoration-2">
                      {item.value}
                    </p>
                    {item.period && (
                      <span className="text-sm text-gray-500 ml-1">{item.period}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-[#9aff00]/10 to-[#9aff00]/5 border-2 border-[#9aff00]/40 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden shadow-[0_0_60px_rgba(154,255,0,0.2)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#9aff00]/10 via-transparent to-transparent" />
            <div className="relative z-10">
              <p className="text-xl md:text-2xl text-gray-300 mb-4">
                Você paga <span className="text-[#9aff00] font-bold text-3xl">menos que 1%</span> do valor de um cursinho
              </p>
              <p className="text-gray-400 text-lg">
                E tem acesso a uma ferramenta profissional de gestão que cursinho nenhum oferece.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Oferta */}
      <section id="oferta" className="relative z-10 py-32 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[#0a1628]" />
        <div className="absolute bottom-0 left-0 w-full h-[600px] bg-gradient-to-t from-[#9aff00]/10 to-transparent blur-[120px] pointer-events-none" />
        
        <div className="container mx-auto max-w-7xl relative">
          {/* Banner de Bônus acima dos cards */}
          <div className="mb-10 bg-gradient-to-r from-[#9aff00]/10 via-[#9aff00]/20 to-[#9aff00]/10 border-2 border-[#9aff00]/40 rounded-2xl p-6 md:p-8 text-center relative overflow-hidden shadow-[0_0_40px_rgba(154,255,0,0.15)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#9aff00]/10 via-transparent to-transparent" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#9aff00] text-[#0a1628] font-bold text-sm mb-4 uppercase tracking-wider shadow-[0_0_20px_rgba(154,255,0,0.5)] animate-pulse">
                <Trophy className="w-4 h-4" />
                Bônus Exclusivo
              </div>
              <h3 className="text-xl md:text-2xl font-display font-bold text-white mb-3">
                Assine qualquer plano até <span className="text-[#9aff00]">11/02</span> e ganhe:
              </h3>
              <p className="text-base md:text-lg text-gray-300 max-w-3xl mx-auto mb-3">
                <strong className="text-white">Mentoria gravada de +2h</strong> com tudo sobre provas — estratégias de prova, correção, preenchimento de lacunas e muito mais!
              </p>
              <p className="text-sm text-gray-400">
                Válido para a <strong className="text-[#9aff00]">Plataforma</strong> e para o <strong className="text-[#9aff00]">Combo Plataforma + Padrões do ENEM</strong>
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Box 1: Plataforma (Original) */}
            <div className="bg-[#0d1b2e] border border-[#9aff00]/30 rounded-[2.5rem] p-8 text-center relative overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.6)] flex flex-col offer-card-hover">
              {/* Glow effect */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-40 bg-[#9aff00]/10 blur-[80px]" />
              
              <div className="relative z-10 flex-1 flex flex-col">
                <div className="inline-block px-4 py-1 rounded-full bg-[#9aff00] text-[#0a1628] font-bold text-sm mb-6 uppercase tracking-wider shadow-[0_0_20px_rgba(154,255,0,0.4)] mx-auto">
                  Oferta Exclusiva
                </div>
                
                <h2 className="text-3xl md:text-4xl font-display font-bold mb-8 text-white">
                  Plataforma Mentoria <br/>
                  <span className="text-[#9aff00]">Mário Machado</span>
                </h2>
                
                <div className="flex flex-col items-center justify-center gap-2 mb-8">
                  <div className="text-2xl text-gray-500 line-through decoration-red-500/50 font-light">
                    R$ 397,00
                  </div>
                  <div className="text-6xl font-bold text-white font-display tracking-tighter drop-shadow-2xl hover:animate-shake cursor-default">
                    R$ 97<span className="text-2xl text-[#9aff00] font-normal">,00</span>
                  </div>
                </div>

                {/* Lista de Funcionalidades */}
                <div className="space-y-3 text-left mb-8 flex-1">
                  {[
                    "Cronograma Adaptativo Inteligente",
                    "Dashboard de Métricas Avançadas",
                    "Gestão de Redações e Competências",
                    "Planejamento de Metas Semanais",
                    "Sistema de Ranking",
                    "Gerenciamento completo da sua preparação!"
                  ].map((feature, i) => (
                    <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#9aff00]/20 flex items-center justify-center mt-0.5">
                        <Check className="w-3 h-3 text-[#9aff00]" />
                      </div>
                      <span className="text-gray-300 font-medium text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto space-y-4">
                  <Button 
                    className="w-full h-auto py-4 text-lg md:text-xl font-bold bg-[#9aff00] text-[#0a1628] hover:bg-[#88e600] hover:scale-105 transition-all duration-300 shadow-[0_0_30px_rgba(154,255,0,0.3)] rounded-xl group border-2 border-transparent hover:border-white/50 whitespace-normal leading-tight"
                    onClick={() => window.open('https://pay.kiwify.com.br/ecz6BOK', '_blank')}
                  >
                    QUERO A PLATAFORMA
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  
                  <div className="flex items-center justify-center gap-4 text-xs text-gray-500 font-medium">
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-[#9aff00]" /> Acesso Imediato</span>
                    <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-[#9aff00]" /> 7 Dias de Garantia</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Box 2: Combo (Novo) */}
            <div className="bg-[#0d1b2e] border-2 border-[#9aff00] rounded-[2.5rem] p-8 text-center relative overflow-hidden shadow-[0_0_100px_rgba(154,255,0,0.2)] flex flex-col transform lg:scale-105 z-10 offer-card-hover">
              {/* Glow effect mais forte */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-60 bg-[#9aff00]/20 blur-[100px]" />
              
              <div className="relative z-10 flex-1 flex flex-col">
                <div className="inline-block px-6 py-2 rounded-full bg-[#9aff00] text-[#0a1628] font-bold text-sm mb-6 uppercase tracking-wider shadow-[0_0_30px_rgba(154,255,0,0.6)] mx-auto animate-pulse">
                  Melhor Custo-Benefício
                </div>
                
                <h2 className="text-3xl md:text-4xl font-display font-bold mb-2 text-white">
                  Combo Completo
                </h2>
                <p className="text-[#9aff00] font-medium mb-6">Plataforma + Padrões do ENEM</p>
                
                <div className="flex flex-col items-center justify-center gap-2 mb-8">
                  <div className="flex items-center gap-2 text-xl text-gray-500 line-through decoration-red-500/50 font-light">
                    <span>R$ 397</span> + <span>R$ 397</span>
                  </div>
                  <div className="text-7xl font-bold text-white font-display tracking-tighter drop-shadow-2xl hover:animate-shake cursor-default">
                    R$ 197<span className="text-3xl text-[#9aff00] font-normal">,00</span>
                  </div>
                </div>

                {/* Lista de Funcionalidades */}
                <div className="space-y-4 text-left mb-8 flex-1">
                  <div className="p-4 bg-[#9aff00]/10 rounded-xl border border-[#9aff00]/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-5 h-5 text-[#9aff00] fill-[#9aff00]" />
                      <span className="font-bold text-white">Tudo da Plataforma</span>
                    </div>
                    <p className="text-xs text-gray-400">Todas as funcionalidades do plano padrão inclusas.</p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-[#9aff00]/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#9aff00] flex items-center justify-center mt-0.5">
                        <BookOpen className="w-4 h-4 text-[#0a1628]" />
                      </div>
                      <div>
                        <span className="text-white font-bold block mb-1">Curso Padrões do ENEM</span>
                        <p className="text-gray-300 text-sm leading-relaxed">
                          Curso com aulas e listas de exercícios para você aprender na prática mais de <strong className="text-[#9aff00]">100 questões-modelo do Enem</strong> e transformar a forma como você enxerga a prova!
                        </p>
                      </div>
                    </div>
                  </div>


                </div>

                <div className="mt-auto space-y-4">
                  <Button 
                    className="w-full h-auto py-4 text-lg md:text-2xl font-bold bg-[#9aff00] text-[#0a1628] hover:bg-[#88e600] hover:scale-105 transition-all duration-300 shadow-[0_0_50px_rgba(154,255,0,0.5)] rounded-xl group border-2 border-transparent hover:border-white/50 whitespace-normal leading-tight"
                    onClick={() => window.open('https://pay.kiwify.com.br/IVBq2Hn', '_blank')}
                  >
                    QUERO O COMBO COMPLETO
                    <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-2 transition-transform" />
                  </Button>
                  
                  <div className="flex items-center justify-center gap-4 text-xs text-gray-500 font-medium">
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-[#9aff00]" /> Acesso Imediato</span>
                    <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-[#9aff00]" /> 7 Dias de Garantia</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Garantia */}
      <section className="relative z-10 py-24 bg-[#0a1628]">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="bg-gradient-to-br from-[#112240] to-[#0a1628] border border-white/10 rounded-[2rem] p-8 md:p-16 flex flex-col md:flex-row items-center gap-10 md:gap-16 relative overflow-hidden group hover:border-[#9aff00]/30 transition-colors duration-500 shadow-2xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#9aff00]/5 rounded-full blur-[100px]" />
            
            <div className="relative z-10 flex-shrink-0">
              <div className="w-40 h-40 bg-[#9aff00]/5 rounded-full flex items-center justify-center border border-[#9aff00]/20 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_40px_rgba(154,255,0,0.1)]">
                <ShieldCheck className="w-20 h-20 text-[#9aff00] drop-shadow-[0_0_15px_rgba(154,255,0,0.5)]" />
              </div>
            </div>
            
            <div className="relative z-10 text-center md:text-left">
              <h3 className="text-3xl md:text-4xl font-display font-bold mb-6 text-white">
                Garantia Incondicional de 7 Dias
              </h3>
              <p className="text-gray-400 leading-relaxed mb-8 text-lg">
                Entre, use a plataforma, organize seus estudos e teste todas as funcionalidades. Se por qualquer motivo você achar que não valeu a pena, eu devolvo 100% do seu dinheiro. Sem perguntas, sem letras miúdas.
              </p>
              <div className="inline-flex items-center gap-3 text-[#9aff00] font-bold bg-[#9aff00]/10 px-6 py-3 rounded-full text-sm uppercase tracking-wide border border-[#9aff00]/20">
                <Lock className="w-4 h-4" />
                Risco Zero para você
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 py-24 bg-[#0d1b2e] border-t border-white/5">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
              Perguntas <span className="text-[#9aff00]">Frequentes</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Tire suas dúvidas sobre a plataforma e comece sua preparação com segurança.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                question: "O que exatamente é a Plataforma Mentoria Mário Machado?",
                answer: "É uma ferramenta completa de GESTÃO e ESTRATÉGIA de estudos para o ENEM. Ela não é um cursinho com aulas de matérias. Nosso foco é fornecer o sistema mais completo para você planejar, metrificar e analisar cada detalhe da sua preparação — cronograma inteligente, controle de simulados, autodiagnóstico com plano de ação, gestão de redações e muito mais. Tudo para você estudar de forma profissional e evoluir muito mais rápido."
              },
              {
                question: "A plataforma inclui acompanhamento com o mentor?",
                answer: "A plataforma é uma ferramenta de autogestão. Você não terá sessões individuais com o mentor, porém toda a lógica por trás do cronograma inteligente, do autodiagnóstico e do plano de ação segue exatamente as mesmas estratégias utilizadas na Mentoria do Mário Machado. Ou seja, você recebe a inteligência da mentoria dentro da ferramenta, funcionando para você 24h por dia."
              },
              {
                question: "Por quanto tempo terei acesso?",
                answer: "Você terá acesso completo por 1 ano — tempo mais que suficiente para cobrir todo o seu ciclo de preparação para o ENEM. Durante esse período, todas as funcionalidades estarão liberadas sem nenhuma restrição, incluindo atualizações que forem lançadas."
              },
              {
                question: "Serve para quem quer outros cursos além de Medicina?",
                answer: "Com certeza! A metodologia de organização e metrificação funciona para qualquer curso de alta concorrência — Engenharia, Direito, Odontologia, etc. O foco em Medicina é porque a concorrência exige o nível máximo de organização, mas a ferramenta se adapta a qualquer meta de nota no ENEM."
              },
              {
                question: "E se eu não gostar? Como funciona a garantia?",
                answer: "Você tem 7 dias para testar tudo. Entre, organize seus estudos, explore cada funcionalidade. Se por qualquer motivo sentir que não valeu a pena, basta enviar uma mensagem e devolvemos 100% do seu investimento. Sem perguntas, sem burocracia. O risco é inteiramente nosso."
              },
              {
                question: "Quais são as formas de pagamento?",
                answer: "Você pode pagar via PIX (com liberação imediata do acesso) ou cartão de crédito (com opção de parcelamento). Todo o processo é 100% seguro e seus dados são protegidos por criptografia."
              },
              {
                question: "Eu já faço cursinho. A plataforma vai me ajudar mesmo assim?",
                answer: "Sim, e muito! O cursinho te dá o conteúdo, mas a plataforma te dá a ESTRATÉGIA. A maioria dos alunos que estagnam na nota não têm problema de conhecimento — têm problema de gestão. Com a plataforma, você vai identificar exatamente onde está errando, quanto tempo está dedicando a cada área e o que precisa ajustar para romper a barreira da aprovação."
              },
              {
                question: "Consigo usar pelo celular?",
                answer: "Sim! A plataforma é 100% responsiva e funciona perfeitamente no navegador do celular, tablet ou computador. Você pode acessar e atualizar seus dados de qualquer lugar, a qualquer momento."
              }
            ].map((item, i) => (
              <div key={i} className="bg-[#112240]/50 border border-white/5 rounded-2xl overflow-hidden hover:border-[#9aff00]/30 transition-colors">
                <div className="p-6">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-start gap-3">
                    <span className="text-[#9aff00] mt-1">?</span>
                    {item.question}
                  </h3>
                  <p className="text-gray-400 leading-relaxed pl-6">
                    {item.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-black/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-500 text-sm">
            © 2026 Mentoria Mário Machado. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
