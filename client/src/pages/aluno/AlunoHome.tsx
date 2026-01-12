import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// Acesso direto ao Firestore (elimina cold start de ~24s)
import { getEstudosDirect, getSimuladosDirect, getMetasDirect } from "@/lib/firestore-direct";
import { 
  Activity, 
  BookOpen, 
  Calendar, 
  FileText, 
  Target, 
  TrendingUp, 
  Clock,
  CheckCircle2,
  BarChart3,
  PlayCircle,
  Plus,
  ArrowRight,
  Flame,
  Trophy,
  Zap,
  Star,
  Award,
  TrendingDown
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { RankingModal, RankingResumo } from "@/components/RankingModal";
import { DiagnosticoPerfil, PerfilResumo, PERFIS_PADRAO } from "@/components/DiagnosticoPerfil";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useMentorViewContext } from "@/contexts/MentorViewContext";

// Função auxiliar para formatar data no fuso horário brasileiro (GMT-3)
const formatarDataBrasil = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Matérias padronizadas do ENEM
const MATERIAS_ENEM = [
  "Matemática",
  "Biologia",
  "Física",
  "Química",
  "História",
  "Geografia",
  "Filosofia",
  "Sociologia",
  "Linguagens",
] as const;

export default function AlunoHome() {
  console.log('[AlunoHome] Componente montado!');
  // Removido useAlunoApi - usando acesso direto ao Firestore para eliminar cold start
  const [, setLocation] = useLocation();
  const { userData } = useAuthContext();
  const { alunoId: mentorViewAlunoId, isMentorView } = useMentorViewContext();
  
  // Função para obter o ID do aluno efetivo
  const getEffectiveUserId = () => {
    if (isMentorView && mentorViewAlunoId) return mentorViewAlunoId;
    return auth.currentUser?.uid || null;
  };
  const [estudos, setEstudos] = useState<any[]>([]);
  const [simulados, setSimulados] = useState<any[]>([]);
  const [metas, setMetas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rankingModalOpen, setRankingModalOpen] = useState(false);
  const [diagnosticoModalOpen, setDiagnosticoModalOpen] = useState(false);
  const [perfilEstudante, setPerfilEstudante] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const effectiveUserId = getEffectiveUserId();
      // Acesso direto ao Firestore (elimina cold start)
      const [estudosData, simuladosData, metasData] = await Promise.all([
        getEstudosDirect(effectiveUserId),
        getSimuladosDirect(effectiveUserId),
        getMetasDirect(effectiveUserId),
      ]);
      setEstudos(estudosData as any[]);
      setSimulados(simuladosData as any[]);
      setMetas(metasData as any[]);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Carregar perfil do aluno
  useEffect(() => {
    const loadPerfil = async () => {
      const userId = getEffectiveUserId();
      if (!userId) return;
      
      try {
        const perfilRef = doc(db, "alunos", userId, "diagnostico", "perfil");
        const perfilSnap = await getDoc(perfilRef);
        
        if (perfilSnap.exists()) {
          setPerfilEstudante(perfilSnap.data().perfilId || null);
        }
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
      }
    };

    loadPerfil();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="relative">
          <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-primary"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <Zap className="h-8 w-8 text-primary animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Calcular métricas
  const tempoTotal = estudos?.reduce((acc, e) => acc + e.tempoMinutos, 0) || 0;
  const questoesTotal = estudos?.reduce((acc, e) => acc + e.questoesFeitas, 0) || 0;
  const acertosTotal = estudos?.reduce((acc, e) => acc + e.questoesAcertadas, 0) || 0;
  const percentualAcerto = questoesTotal > 0 ? Math.round((acertosTotal / questoesTotal) * 100) : 0;

  // Último simulado
  const ultimoSimulado = simulados?.[0];
  const acertosUltimoSimulado = ultimoSimulado
    ? ultimoSimulado.linguagensAcertos +
      ultimoSimulado.humanasAcertos +
      ultimoSimulado.naturezaAcertos +
      ultimoSimulado.matematicaAcertos
    : 0;

  // Calcular streak (dias consecutivos de estudo)
  const calcularStreak = () => {
    if (!estudos || estudos.length === 0) return 0;
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const datasEstudo = estudos
      .map(e => {
        try {
          let data: Date;
          
          if (e.data?.seconds || e.data?._seconds) {
            const seconds = e.data.seconds || e.data._seconds;
            data = new Date(seconds * 1000);
          } else if (e.data?.toDate) {
            data = e.data.toDate();
          } else {
            data = new Date(e.data);
          }
          
          if (isNaN(data.getTime())) {
            return null;
          }
          
          data.setHours(0, 0, 0, 0);
          return data.getTime();
        } catch (error) {
          return null;
        }
      })
      .filter((v): v is number => v !== null)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => b - a);
    
    let streak = 0;
    let dataEsperada = hoje.getTime();
    
    const ontem = hoje.getTime() - 24 * 60 * 60 * 1000;
    const estudouHoje = datasEstudo.includes(hoje.getTime());
    const estudouOntem = datasEstudo.includes(ontem);
    
    if (!estudouHoje && !estudouOntem) {
      return 0;
    }
    
    if (!estudouHoje) {
      dataEsperada = ontem;
    }
    
    for (const data of datasEstudo) {
      if (data === dataEsperada) {
        streak++;
        dataEsperada -= 24 * 60 * 60 * 1000;
      } else if (data < dataEsperada) {
        break;
      }
    }
    
    return streak;
  };

  const streak = calcularStreak();

  // Gerar dados para o mapa de calor
  const gerarMapaCalor = () => {
    const dias: { data: Date; count: number; }[] = [];
    const hoje = new Date();
    
    const contagemPorDia = new Map<string, number>();
    
    estudos.forEach(e => {
      try {
        let data: Date;
        
        if (e.data?.seconds || e.data?._seconds) {
          const seconds = e.data.seconds || e.data._seconds;
          data = new Date(seconds * 1000);
        } else if (e.data?.toDate) {
          data = e.data.toDate();
        } else {
          data = new Date(e.data);
        }
        
        if (isNaN(data.getTime())) {
          return;
        }
        
        const dataStr = formatarDataBrasil(data);
        contagemPorDia.set(dataStr, (contagemPorDia.get(dataStr) || 0) + 1);
      } catch (error) {
        console.error('Erro ao processar data no mapa de calor:', error);
      }
    });
    
    for (let i = 149; i >= 0; i--) {
      const data = new Date(hoje);
      data.setDate(data.getDate() - i);
      const dataStr = formatarDataBrasil(data);
      
      dias.push({
        data: data,
        count: contagemPorDia.get(dataStr) || 0,
      });
    }
    
    return dias;
  };
  
  const mapaCalor = gerarMapaCalor();
  
  // Análise por matéria
  const calcularAnalisePorMateria = () => {
    if (!estudos || estudos.length === 0) {
      return { pontosFortes: [], pontosFracos: [] };
    }
    
    const porMateria: Record<string, { questoes: number; acertos: number }> = {};
    
    for (const estudo of estudos) {
      const materia = estudo.materia;
      if (!porMateria[materia]) {
        porMateria[materia] = { questoes: 0, acertos: 0 };
      }
      porMateria[materia].questoes += estudo.questoesFeitas || 0;
      porMateria[materia].acertos += estudo.questoesAcertadas || 0;
    }
    
    const pontosFortes: Array<{ materia: string; percentual: number; acertos: number; questoes: number }> = [];
    const pontosFracos: Array<{ materia: string; percentual: number; acertos: number; questoes: number }> = [];
    
    for (const [materia, dados] of Object.entries(porMateria)) {
      if (dados.questoes >= 5) {
        const percentual = Math.round((dados.acertos / dados.questoes) * 100);
        const item = { materia, percentual, acertos: dados.acertos, questoes: dados.questoes };
        
        if (percentual >= 80) {
          pontosFortes.push(item);
        } else if (percentual < 60) {
          pontosFracos.push(item);
        }
      }
    }
    
    return { pontosFortes, pontosFracos };
  };
  
  const analisePorMateria = calcularAnalisePorMateria();
  
  const getCorIntensidade = (count: number) => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
    if (count === 1) return 'bg-emerald-200 dark:bg-emerald-900';
    if (count === 2) return 'bg-emerald-400 dark:bg-emerald-700';
    if (count >= 3) return 'bg-emerald-600 dark:bg-emerald-500';
    return 'bg-gray-100 dark:bg-gray-800';
  };

  // Componente de progresso circular
  const CircularProgress = ({ value, max, color }: { value: number; max: number; color: string }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    const circumference = 2 * Math.PI * 36;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative w-24 h-24">
        <svg className="transform -rotate-90 w-24 h-24">
          <circle
            cx="48"
            cy="48"
            r="36"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-gray-200 dark:text-gray-700"
          />
          <circle
            cx="48"
            cy="48"
            r="36"
            stroke={color}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xl font-bold" style={{ color }}>
          {Math.round(percentage)}%
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-8 animate-fade-in relative">
      {/* Elementos decorativos flutuantes */}
      <div className="fixed top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="fixed bottom-20 left-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-float-delayed pointer-events-none" />
      
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
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-purple-500 rounded-2xl blur-xl opacity-50 animate-pulse-slow" />
                <div className="relative bg-gradient-to-br from-primary via-purple-500 to-blue-500 p-4 rounded-2xl shadow-2xl">
                  <Trophy className="h-10 w-10 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-primary via-purple-600 to-blue-600 bg-clip-text text-transparent">
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
            <div className="hidden md:flex gap-3">
              <PerfilResumo onClick={() => setDiagnosticoModalOpen(true)} overrideUserId={isMentorView ? mentorViewAlunoId : null} />
              <RankingResumo onClick={() => setRankingModalOpen(true)} overrideUserId={isMentorView ? mentorViewAlunoId : null} />
            </div>
          </div>
          <p className="text-xl text-muted-foreground font-medium">
            Continue sua jornada rumo à aprovação no ENEM 🎯
          </p>
          <div className="flex items-center justify-between flex-wrap gap-3 mt-4">
            <div className="flex items-center gap-4 flex-wrap">
              {/* 📓 Lembrete do Diário de Bordo */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-pink-600 dark:text-pink-400 font-medium">Lembre de preencher o diário de bordo!</span>
                <button 
                  onClick={() => setLocation('/aluno/diario')}
                  className="group flex items-center gap-2 px-3 py-1.5 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 hover:border-pink-500/50 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/20"
                >
                  <ArrowRight className="h-4 w-4 text-pink-500 group-hover:translate-x-1 transition-transform" />
                  <span className="text-sm font-semibold text-pink-600 dark:text-pink-400">Preencher</span>
                </button>
              </div>
            </div>
            
            {/* Botão de ranking e perfil para mobile */}
            <div className="md:hidden flex flex-wrap gap-2">
              <PerfilResumo onClick={() => setDiagnosticoModalOpen(true)} overrideUserId={isMentorView ? mentorViewAlunoId : null} />
              <RankingResumo onClick={() => setRankingModalOpen(true)} overrideUserId={isMentorView ? mentorViewAlunoId : null} />
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Métricas com Progresso Circular */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Card Sequência Premium */}
        <Card className="relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/20 group animate-slide-up border border-gray-200 dark:border-gray-700" style={{ animationDelay: '0.1s' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-orange-500/20 to-transparent rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
          
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Sequência de Estudos</CardTitle>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl blur-md opacity-50 animate-pulse-slow" />
              <div className="relative p-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl shadow-xl">
                <Flame className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-black bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 bg-clip-text text-transparent">
                {streak}
              </div>
              <span className="text-lg font-bold text-muted-foreground">dias</span>
            </div>
          </CardContent>
        </Card>

        {/* Card Tempo de Estudo */}
        <Card className="relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/20 group animate-slide-up border border-gray-200 dark:border-gray-700" style={{ animationDelay: '0.2s' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
          
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Tempo de Estudo</CardTitle>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl blur-md opacity-50 animate-pulse-slow" />
              <div className="relative p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-xl">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-black bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
                {Math.floor(tempoTotal / 60)}
              </div>
              <span className="text-lg font-bold text-muted-foreground mr-2">h</span>
              <div className="text-4xl font-black bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
                {tempoTotal % 60}
              </div>
              <span className="text-lg font-bold text-muted-foreground">min</span>
            </div>
          </CardContent>
        </Card>

        {/* Card Questões Resolvidas */}
        <Card className="relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/20 group animate-slide-up border border-gray-200 dark:border-gray-700" style={{ animationDelay: '0.3s' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
          
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Questões Resolvidas</CardTitle>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl blur-md opacity-50 animate-pulse-slow" />
              <div className="relative p-3 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl shadow-xl">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-black bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500 bg-clip-text text-transparent">
                {questoesTotal}
              </div>
              <span className="text-lg font-bold text-muted-foreground">resolvidas</span>
            </div>
          </CardContent>
        </Card>

        {/* Card Simulado */}
        <Card className="relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/20 group animate-slide-up border border-gray-200 dark:border-gray-700" style={{ animationDelay: '0.4s' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
          
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Último Simulado</CardTitle>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl blur-md opacity-50 animate-pulse-slow" />
              <div className="relative p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-xl">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-black bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                {acertosUltimoSimulado}
              </div>
              <span className="text-2xl font-bold text-muted-foreground">/180</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              {ultimoSimulado ? (() => {
                try {
                  let data: Date;
                  if (ultimoSimulado.data?.seconds || ultimoSimulado.data?._seconds) {
                    const seconds = ultimoSimulado.data.seconds || ultimoSimulado.data._seconds;
                    data = new Date(seconds * 1000);
                  } else if (ultimoSimulado.data?.toDate) {
                    data = ultimoSimulado.data.toDate();
                  } else {
                    data = new Date(ultimoSimulado.data);
                  }
                  return !isNaN(data.getTime()) ? data.toLocaleDateString('pt-BR') : 'Data inválida';
                } catch {
                  return 'Data inválida';
                }
              })() : "Nenhum simulado realizado"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas Premium */}
      <div className="grid gap-5 md:grid-cols-3 animate-slide-up" style={{ animationDelay: '0.5s' }}>
        <Card 
          className="relative overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-all duration-500 cursor-pointer group hover:shadow-2xl hover:shadow-blue-500/30 hover:-translate-y-2 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20" 
          onClick={() => setLocation("/aluno/estudos")}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-blue-500/5 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
          
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                  <div className="relative p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-xl group-hover:scale-110 transition-transform duration-300">
                    <PlayCircle className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-xl font-black">Iniciar Cronômetro</CardTitle>
                  <CardDescription className="text-sm mt-1">Registre seu tempo de estudo</CardDescription>
                </div>
              </div>
              <ArrowRight className="h-6 w-6 text-muted-foreground group-hover:text-blue-500 group-hover:translate-x-2 transition-all duration-300" />
            </div>
          </CardHeader>
        </Card>

        <Card 
          className="relative overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-emerald-500 transition-all duration-500 cursor-pointer group hover:shadow-2xl hover:shadow-emerald-500/30 hover:-translate-y-2 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20" 
          onClick={() => setLocation("/aluno/estudos")}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 via-emerald-500/5 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
          
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                  <div className="relative p-4 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl shadow-xl group-hover:scale-110 transition-transform duration-300">
                    <Plus className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-xl font-black">Registrar Estudo</CardTitle>
                  <CardDescription className="text-sm mt-1">Adicione manualmente</CardDescription>
                </div>
              </div>
              <ArrowRight className="h-6 w-6 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-2 transition-all duration-300" />
            </div>
          </CardHeader>
        </Card>

        <Card 
          className="relative overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-purple-500 transition-all duration-500 cursor-pointer group hover:shadow-2xl hover:shadow-purple-500/30 hover:-translate-y-2 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-950/20" 
          onClick={() => setLocation("/aluno/simulados")}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 via-purple-500/5 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
          
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                  <div className="relative p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-xl group-hover:scale-110 transition-transform duration-300">
                    <FileText className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-xl font-black">Novo Simulado</CardTitle>
                  <CardDescription className="text-sm mt-1">Registre seus resultados</CardDescription>
                </div>
              </div>
              <ArrowRight className="h-6 w-6 text-muted-foreground group-hover:text-purple-500 group-hover:translate-x-2 transition-all duration-300" />
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Mapa de Calor Premium */}
      <Card className="hover:shadow-2xl transition-all duration-500 animate-slide-up border border-gray-200 dark:border-gray-700" style={{ animationDelay: '0.6s' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-3 text-2xl font-black">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-purple-500 rounded-xl blur-md opacity-50" />
                  <div className="relative p-3 bg-gradient-to-br from-primary to-purple-500 rounded-xl shadow-xl">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                </div>
                Atividade de Estudos
              </CardTitle>
              <CardDescription className="mt-3 text-base">
                Últimos 150 dias - Quanto mais escuro, mais sessões registradas
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-30 gap-2 min-w-[800px]">
              {mapaCalor.map((dia, index) => (
                <div
                  key={index}
                  className={`w-3.5 h-3.5 rounded-md ${getCorIntensidade(dia.count)} hover:ring-2 hover:ring-primary hover:scale-150 transition-all duration-300 cursor-pointer shadow-sm`}
                  title={`${dia.data.toLocaleDateString('pt-BR')}: ${dia.count} sessões`}
                />
              ))}
            </div>
            <div className="flex items-center gap-5 mt-8 text-sm font-medium text-muted-foreground">
              <span>Menos</span>
              <div className="flex gap-2">
                <div className="w-5 h-5 rounded-md bg-gray-100 dark:bg-gray-800 border-2 shadow-sm" />
                <div className="w-5 h-5 rounded-md bg-emerald-200 dark:bg-emerald-900 shadow-sm" />
                <div className="w-5 h-5 rounded-md bg-emerald-400 dark:bg-emerald-700 shadow-sm" />
                <div className="w-5 h-5 rounded-md bg-emerald-600 dark:bg-emerald-500 shadow-sm" />
              </div>
              <span>Mais</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Análise de Desempenho Premium */}
      <Card className="hover:shadow-2xl transition-all duration-500 animate-slide-up border border-gray-200 dark:border-gray-700" style={{ animationDelay: '0.7s' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl font-black">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl blur-md opacity-50" />
              <div className="relative p-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl shadow-xl">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
            </div>
            Análise de Desempenho
          </CardTitle>
          <CardDescription className="mt-3 text-base">
            Seus pontos fortes e a melhorar, com base nos últimos estudos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Pontos Fortes */}
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-6 w-6" />
                Pontos Fortes
              </h3>
              {analisePorMateria.pontosFortes.length > 0 ? (
                <ul className="space-y-4">
                  {analisePorMateria.pontosFortes.map((item, index) => (
                    <li key={index} className="flex items-center gap-4 p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border-l-4 border-emerald-500">
                      <div className="flex-shrink-0">
                        <CircularProgress value={item.percentual} max={100} color="#10b981" />
                      </div>
                      <div className="flex-grow">
                        <p className="font-bold text-lg text-emerald-700 dark:text-emerald-300">{item.materia}</p>
                        <p className="text-sm text-muted-foreground">{item.acertos} de {item.questoes} questões</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <Trophy className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="font-semibold text-lg">Nenhum ponto forte identificado.</p>
                  <p className="text-sm text-muted-foreground mt-1">Continue estudando para encontrarmos seus pontos fortes!</p>
                </div>
              )}
            </div>

            {/* Pontos a Melhorar */}
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-red-600 dark:text-red-400">
                <TrendingDown className="h-6 w-6" />
                Pontos a Melhorar
              </h3>
              {analisePorMateria.pontosFracos.length > 0 ? (
                <ul className="space-y-4">
                  {analisePorMateria.pontosFracos.map((item, index) => (
                    <li key={index} className="flex items-center gap-4 p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border-l-4 border-red-500">
                      <div className="flex-shrink-0">
                        <CircularProgress value={item.percentual} max={100} color="#ef4444" />
                      </div>
                      <div className="flex-grow">
                        <p className="font-bold text-lg text-red-700 dark:text-red-300">{item.materia}</p>
                        <p className="text-sm text-muted-foreground">{item.acertos} de {item.questoes} questões</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <Star className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="font-semibold text-lg">Nenhum ponto a melhorar!</p>
                  <p className="text-sm text-muted-foreground mt-1">Parabéns! Continue com o ótimo trabalho.</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <RankingModal open={rankingModalOpen} onOpenChange={setRankingModalOpen} />
      <DiagnosticoPerfil open={diagnosticoModalOpen} onOpenChange={setDiagnosticoModalOpen} />
    </div>
  );
}
