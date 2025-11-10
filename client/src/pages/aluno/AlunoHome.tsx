import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
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
  ArrowRight
} from "lucide-react";
import { useLocation } from "wouter";

export default function AlunoHome() {
  const [, setLocation] = useLocation();
  const { data: aluno, isLoading: loadingAluno } = trpc.aluno.me.useQuery();
  const { data: estudos, isLoading: loadingEstudos } = trpc.aluno.getEstudos.useQuery();
  const { data: simulados, isLoading: loadingSimulados } = trpc.aluno.getSimulados.useQuery();

  if (loadingAluno || loadingEstudos || loadingSimulados) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
        const data = new Date(e.data);
        data.setHours(0, 0, 0, 0);
        return data.getTime();
      })
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => b - a);
    
    let streak = 0;
    let dataEsperada = hoje.getTime();
    
    for (const data of datasEstudo) {
      if (data === dataEsperada) {
        streak++;
        dataEsperada -= 24 * 60 * 60 * 1000;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const streak = calcularStreak();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Bem-vindo de volta, {aluno?.nome || "Aluno"}! 👋
        </h1>
        <p className="text-muted-foreground">
          Aqui está um resumo do seu progresso nos estudos
        </p>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sequência de Dias</CardTitle>
            <Target className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{streak} dias</div>
            <p className="text-xs text-muted-foreground">
              {streak > 0 ? "Continue assim!" : "Comece sua sequência hoje"}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Total</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.floor(tempoTotal / 60)}h {tempoTotal % 60}min</div>
            <p className="text-xs text-muted-foreground">
              Dedicados aos estudos
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Questões Resolvidas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{questoesTotal}</div>
            <p className="text-xs text-muted-foreground">
              {percentualAcerto}% de acerto
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Último Simulado</CardTitle>
            <FileText className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{acertosUltimoSimulado}/180</div>
            <p className="text-xs text-muted-foreground">
              {ultimoSimulado ? new Date(ultimoSimulado.data).toLocaleDateString('pt-BR') : "Nenhum simulado"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-all hover:border-primary cursor-pointer group" onClick={() => setLocation("/aluno/estudos")}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <PlayCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Iniciar Cronômetro</CardTitle>
                  <CardDescription>Registre seu tempo de estudo</CardDescription>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-all hover:border-primary cursor-pointer group" onClick={() => setLocation("/aluno/estudos")}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Plus className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Registrar Estudo</CardTitle>
                  <CardDescription>Adicione manualmente</CardDescription>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-all hover:border-primary cursor-pointer group" onClick={() => setLocation("/aluno/simulados")}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Novo Simulado</CardTitle>
                  <CardDescription>Registre seus resultados</CardDescription>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Análise Inteligente e Métricas */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Análise Inteligente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {streak === 0 && (
              <div className="p-4 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
                <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                  🎯 Comece sua sequência hoje!
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                  Estudar todos os dias aumenta sua retenção em até 40%
                </p>
              </div>
            )}
            
            {streak > 0 && streak < 7 && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  🔥 Você está no caminho certo!
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  {streak} dias de sequência. Continue para formar o hábito!
                </p>
              </div>
            )}

            {streak >= 7 && (
              <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  🏆 Excelente consistência!
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  {streak} dias consecutivos! Você está desenvolvendo um ótimo hábito.
                </p>
              </div>
            )}

            {percentualAcerto > 0 && percentualAcerto < 50 && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  📚 Foque na qualidade
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Sua taxa de acerto está em {percentualAcerto}%. Revise os conteúdos com mais atenção.
                </p>
              </div>
            )}

            {percentualAcerto >= 80 && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                  ⭐ Ótimo desempenho!
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                  {percentualAcerto}% de acerto! Continue praticando para manter.
                </p>
              </div>
            )}

            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setLocation("/aluno/metricas")}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Ver Análise Completa
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {estudos && estudos.length > 0 ? (
                estudos.slice(0, 5).map((estudo, index) => (
                  <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-0">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{estudo.materia}</p>
                      <p className="text-xs text-muted-foreground truncate">{estudo.conteudo}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {estudo.tempoMinutos} min • {estudo.questoesFeitas} questões
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(estudo.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Nenhum estudo registrado ainda</p>
                  <Button 
                    variant="link" 
                    className="mt-2"
                    onClick={() => setLocation("/aluno/estudos")}
                  >
                    Registrar primeiro estudo
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
