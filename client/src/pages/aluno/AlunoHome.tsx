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
import { useDataService } from "@/hooks/useDataService";

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
  const { alunoSubdoc, mentoriaId } = useDataService();
  
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
      // Passando mentoriaId para as funções diretas
      const [estudosData, simuladosData, metasData] = await Promise.all([
        getEstudosDirect(effectiveUserId, mentoriaId),
        getSimuladosDirect(effectiveUserId, mentoriaId),
        getMetasDirect(effectiveUserId, mentoriaId),
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
  }, [mentoriaId]); // Recarregar se mentoriaId mudar

  // Carregar perfil do aluno
  useEffect(() => {
    const loadPerfil = async () => {
      const userId = getEffectiveUserId();
      if (!userId) return;
      
      try {
        // USANDO DATA SERVICE
        const perfilRef = alunoSubdoc(userId, "diagnostico", "perfil");
        const perfilSnap = await getDoc(perfilRef);
        
        if (perfilSnap.exists()) {
          setPerfilEstudante(perfilSnap.data().perfilId || null);
        }
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
      }
    };

    loadPerfil();
  }, [mentoriaId]); // Recarregar se mentoriaId mudar

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
            className="text-muted/20"
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
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className="text-xl font-bold">{value}</span>
          <span className="text-xs text-muted-foreground">de {max}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Cabeçalho com Saudação e Resumo */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Olá, {userData?.nome?.split(' ')[0] || 'Estudante'}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Aqui está o resumo do seu progresso hoje.
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => setLocation("/app/estudos/novo")} className="gap-2">
            <Plus className="h-4 w-4" />
            Registrar Estudo
          </Button>
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Total</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.floor(tempoTotal / 60)}h {tempoTotal % 60}m</div>
            <p className="text-xs text-muted-foreground">
              de estudo registrado
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Questões</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{questoesTotal}</div>
            <p className="text-xs text-muted-foreground">
              resolvidas no total
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Acerto</CardTitle>
            <TrendingUp className={`h-4 w-4 ${percentualAcerto >= 80 ? 'text-green-500' : percentualAcerto >= 60 ? 'text-yellow-500' : 'text-red-500'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{percentualAcerto}%</div>
            <p className="text-xs text-muted-foreground">
              média geral
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-200 dark:border-orange-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-400">Ofensiva</CardTitle>
            <Flame className="h-4 w-4 text-orange-500 fill-orange-500 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">{streak} dias</div>
            <p className="text-xs text-orange-600/80 dark:text-orange-400/80">
              consecutivos estudando
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Gráfico de Atividade (Mapa de Calor) */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Consistência</CardTitle>
            <CardDescription>
              Seu histórico de estudos nos últimos 5 meses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1 justify-center sm:justify-start">
              {mapaCalor.map((dia, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-sm ${getCorIntensidade(dia.count)}`}
                  title={`${dia.data.toLocaleDateString()}: ${dia.count} registros`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
              <span>Menos</span>
              <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800" />
              <div className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-900" />
              <div className="w-3 h-3 rounded-sm bg-emerald-400 dark:bg-emerald-700" />
              <div className="w-3 h-3 rounded-sm bg-emerald-600 dark:bg-emerald-500" />
              <span>Mais</span>
            </div>
          </CardContent>
        </Card>

        {/* Atalhos Rápidos e Próximas Metas */}
        <div className="col-span-3 space-y-6">
          {/* Card de Ranking */}
          <Card className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border-indigo-100 dark:border-indigo-900/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-indigo-500" />
                  Ranking
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setRankingModalOpen(true)}>
                  Ver completo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <RankingResumo />
            </CardContent>
          </Card>

          {/* Card de Perfil de Estudante */}
          <Card className="bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border-blue-100 dark:border-blue-900/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-blue-500" />
                  Perfil de Estudante
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setDiagnosticoModalOpen(true)}>
                  {perfilEstudante ? "Ver análise" : "Descobrir perfil"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {perfilEstudante ? (
                <PerfilResumo perfilId={perfilEstudante} />
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Descubra seus pontos fortes e fracos com nossa análise baseada em IA.
                  </p>
                  <Button size="sm" onClick={() => setDiagnosticoModalOpen(true)}>
                    Fazer Diagnóstico
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card de Pontos Fortes e Fracos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Análise de Desempenho</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analisePorMateria.pontosFortes.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-green-600 dark:text-green-400">
                    <TrendingUp className="h-4 w-4" />
                    Pontos Fortes (&gt;80%)
                  </h4>
                  <div className="space-y-2">
                    {analisePorMateria.pontosFortes.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span>{item.materia}</span>
                        <span className="font-bold">{item.percentual}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analisePorMateria.pontosFracos.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-red-600 dark:text-red-400">
                    <TrendingDown className="h-4 w-4" />
                    Atenção Necessária (&lt;60%)
                  </h4>
                  <div className="space-y-2">
                    {analisePorMateria.pontosFracos.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span>{item.materia}</span>
                        <span className="font-bold">{item.percentual}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analisePorMateria.pontosFortes.length === 0 && analisePorMateria.pontosFracos.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Registre mais questões para ver sua análise de desempenho.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modais */}
      <RankingModal open={rankingModalOpen} onOpenChange={setRankingModalOpen} />
      <DiagnosticoPerfil open={diagnosticoModalOpen} onOpenChange={setDiagnosticoModalOpen} />
    </div>
  );
}
