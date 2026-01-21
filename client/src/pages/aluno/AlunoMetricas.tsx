import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAlunoApi } from "@/hooks/useAlunoApi";
import { BarChart3, Calendar, TrendingUp, PieChart, Activity, Zap, Target, Award, Clock, Eye, EyeOff, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type PeriodoFiltro = "7d" | "30d" | "3m" | "6m" | "1a" | "all";

interface MediasPlataforma {
  tempoMedio: number;
  questoesMedia: number;
  acertosMedia: number;
  taxaAcertoMedia: number;
  diasEstudoMedia: number;
  totalAlunos: number;
}

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
  "Redação",
  "Revisão",
  "Simulado",
  "Correção de simulado",
  "Preenchimento de lacunas",
] as const;

const CORES_GRAFICOS = [
  "#3b82f6", // blue - Matemática
  "#10b981", // green - Biologia
  "#f59e0b", // amber - Física
  "#ef4444", // red - Química
  "#8b5cf6", // violet - História
  "#ec4899", // pink - Geografia
  "#06b6d4", // cyan - Filosofia
  "#f97316", // orange - Sociologia
  "#84cc16", // lime - Linguagens
  "#14b8a6", // teal - Redação
  "#a855f7", // purple - Revisão
  "#f43f5e", // rose - Simulado
  "#0ea5e9", // sky - Correção de simulado
  "#eab308", // yellow - Preenchimento de lacunas
];

// Cores para intensidade do heatmap
const HEATMAP_CORES = [
  "#f3f4f6", // 0 - sem estudo
  "#dcfce7", // 1 - pouco
  "#86efac", // 2 - médio
  "#22c55e", // 3 - bom
  "#15803d", // 4 - muito
];

export default function AlunoMetricas() {
  const api = useAlunoApi();
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("30d");
  const [estudos, setEstudos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [itensOcultos, setItensOcultos] = useState<Set<string>>(new Set());
  
  // Estados para comparação com média da plataforma
  const [mostrarComparacao, setMostrarComparacao] = useState(true);
  const [mediasPlataforma, setMediasPlataforma] = useState<MediasPlataforma | null>(null);
  const [loadingMedias, setLoadingMedias] = useState(false);
  
  // Estados para o Heatmap
  const [mesHeatmap, setMesHeatmap] = useState(new Date());

  const loadEstudos = async () => {
    try {
      setIsLoading(true);
      const data = await api.getEstudos();
      setEstudos(data as any[]);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar estudos");
    } finally {
      setIsLoading(false);
    }
  };

  const loadMediasPlataforma = async () => {
    try {
      setLoadingMedias(true);
      const medias = await api.getMediasPlataforma(periodo);
      setMediasPlataforma(medias as MediasPlataforma);
    } catch (error: any) {
      console.error("Erro ao carregar médias da plataforma:", error);
      // Não mostrar toast para não atrapalhar a experiência
    } finally {
      setLoadingMedias(false);
    }
  };

  const loadPreferenciaComparacao = async () => {
    try {
      const result = await api.getPreferenciaComparacao();
      setMostrarComparacao((result as any).mostrar ?? true);
    } catch (error) {
      console.error("Erro ao carregar preferência de comparação:", error);
    }
  };

  const toggleComparacao = async () => {
    const novoValor = !mostrarComparacao;
    setMostrarComparacao(novoValor);
    try {
      await api.updatePreferenciaComparacao(novoValor);
    } catch (error) {
      console.error("Erro ao salvar preferência de comparação:", error);
    }
  };

  useEffect(() => {
    loadEstudos();
    loadPreferenciaComparacao();
  }, []);

  useEffect(() => {
    if (mostrarComparacao) {
      loadMediasPlataforma();
    }
  }, [periodo, mostrarComparacao]);

  const estudosFiltrados = useMemo(() => {
    if (!estudos) return [];
    
    const agora = new Date();
    let dataLimite = new Date();
    
    switch (periodo) {
      case "7d":
        dataLimite.setDate(agora.getDate() - 7);
        break;
      case "30d":
        dataLimite.setDate(agora.getDate() - 30);
        break;
      case "3m":
        dataLimite.setMonth(agora.getMonth() - 3);
        break;
      case "6m":
        dataLimite.setMonth(agora.getMonth() - 6);
        break;
      case "1a":
        dataLimite.setFullYear(agora.getFullYear() - 1);
        break;
      case "all":
        return estudos;
    }
    
    return estudos.filter(e => {
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
        return !isNaN(data.getTime()) && data >= dataLimite;
      } catch {
        return false;
      }
    });
  }, [estudos, periodo]);

  // Dados do Heatmap
  const dadosHeatmap = useMemo(() => {
    const ano = mesHeatmap.getFullYear();
    const mes = mesHeatmap.getMonth();
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);
    
    // Criar mapa de estudos por data
    const estudosPorData: Record<string, number> = {};
    estudos.forEach(estudo => {
      try {
        let data: Date;
        if (estudo.data?.seconds || estudo.data?._seconds) {
          const seconds = estudo.data.seconds || estudo.data._seconds;
          data = new Date(seconds * 1000);
        } else if (estudo.data?.toDate) {
          data = estudo.data.toDate();
        } else {
          data = new Date(estudo.data);
        }
        if (!isNaN(data.getTime())) {
          const dataStr = data.toISOString().split('T')[0];
          estudosPorData[dataStr] = (estudosPorData[dataStr] || 0) + (estudo.tempoMinutos || 0);
        }
      } catch {}
    });
    
    // Gerar dias do mês
    const dias: { data: Date; tempo: number; intensidade: number }[] = [];
    const dataAtual = new Date(primeiroDia);
    
    while (dataAtual <= ultimoDia) {
      const dataStr = dataAtual.toISOString().split('T')[0];
      const tempo = estudosPorData[dataStr] || 0;
      
      // Calcular intensidade (0-4)
      let intensidade = 0;
      if (tempo > 0) {
        if (tempo < 30) intensidade = 1;
        else if (tempo < 60) intensidade = 2;
        else if (tempo < 120) intensidade = 3;
        else intensidade = 4;
      }
      
      dias.push({
        data: new Date(dataAtual),
        tempo,
        intensidade,
      });
      
      dataAtual.setDate(dataAtual.getDate() + 1);
    }
    
    return dias;
  }, [estudos, mesHeatmap]);

  const dadosEvolucao = useMemo(() => {
    // Calcular data limite baseado no período
    const agora = new Date();
    let dataLimite = new Date();
    
    switch (periodo) {
      case "7d":
        dataLimite.setDate(agora.getDate() - 7);
        break;
      case "30d":
        dataLimite.setDate(agora.getDate() - 30);
        break;
      case "3m":
        dataLimite.setMonth(agora.getMonth() - 3);
        break;
      case "6m":
        dataLimite.setMonth(agora.getMonth() - 6);
        break;
      case "1a":
        dataLimite.setFullYear(agora.getFullYear() - 1);
        break;
      case "all":
        // Para "all", usar a data do estudo mais antigo ou 1 ano atrás
        if (estudosFiltrados.length > 0) {
          let dataMinima = new Date();
          estudosFiltrados.forEach(estudo => {
            try {
              let data: Date;
              if (estudo.data?.seconds || estudo.data?._seconds) {
                const seconds = estudo.data.seconds || estudo.data._seconds;
                data = new Date(seconds * 1000);
              } else if (estudo.data?.toDate) {
                data = estudo.data.toDate();
              } else {
                data = new Date(estudo.data);
              }
              if (!isNaN(data.getTime()) && data < dataMinima) {
                dataMinima = data;
              }
            } catch {}
          });
          dataLimite = dataMinima;
        } else {
          dataLimite.setFullYear(agora.getFullYear() - 1);
        }
        break;
    }
    
    // Gerar todos os dias do período
    const todosDias: Record<string, any> = {};
    const dataAtual = new Date(dataLimite);
    dataAtual.setHours(0, 0, 0, 0);
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    
    while (dataAtual <= hoje) {
      const dataFormatada = dataAtual.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      const timestamp = dataAtual.getTime();
      todosDias[dataFormatada] = { data: dataFormatada, tempo: 0, questoes: 0, acertos: 0, timestamp };
      dataAtual.setDate(dataAtual.getDate() + 1);
    }
    
    // Preencher com dados dos estudos
    estudosFiltrados.forEach(estudo => {
      let dataFormatada: string;
      let timestamp: number = 0;
      try {
        let data: Date;
        if (estudo.data?.seconds || estudo.data?._seconds) {
          const seconds = estudo.data.seconds || estudo.data._seconds;
          data = new Date(seconds * 1000);
        } else if (estudo.data?.toDate) {
          data = estudo.data.toDate();
        } else {
          data = new Date(estudo.data);
        }
        if (!isNaN(data.getTime())) {
          dataFormatada = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
          timestamp = data.getTime();
        } else {
          return;
        }
      } catch {
        return;
      }
      
      if (todosDias[dataFormatada]) {
        todosDias[dataFormatada].tempo += estudo.tempoMinutos || 0;
        todosDias[dataFormatada].questoes += estudo.questoesFeitas || 0;
        todosDias[dataFormatada].acertos += estudo.questoesAcertadas || 0;
      }
    });
    
    // Ordenar por timestamp (mais antigo primeiro = à esquerda do gráfico)
    const dadosOrdenados = Object.values(todosDias)
      .sort((a: any, b: any) => a.timestamp - b.timestamp);
    
    return dadosOrdenados.map((d: any) => ({
      data: d.data,
      tempo: d.tempo,
      questoes: d.questoes,
      acertos: d.acertos,
      percentual: d.questoes > 0 ? Math.round((d.acertos / d.questoes) * 100) : 0,
      // Adicionar médias da plataforma para linhas de referência
      mediaTempo: mostrarComparacao && mediasPlataforma ? Math.round(mediasPlataforma.tempoMedio / (periodo === "7d" ? 7 : periodo === "30d" ? 30 : periodo === "3m" ? 90 : periodo === "6m" ? 180 : 365)) : undefined,
      mediaTaxaAcerto: mostrarComparacao && mediasPlataforma ? mediasPlataforma.taxaAcertoMedia : undefined,
    }));
  }, [estudosFiltrados, periodo, mostrarComparacao, mediasPlataforma]);

  const dadosPorMateria = useMemo(() => {
    const porMateria: Record<string, any> = {};
    MATERIAS_ENEM.forEach(materia => {
      porMateria[materia] = { materia, tempo: 0, questoes: 0, acertos: 0 };
    });
    
    estudosFiltrados.forEach(estudo => {
      const materia = estudo.materia;
      if (!porMateria[materia]) {
        porMateria[materia] = { materia, tempo: 0, questoes: 0, acertos: 0 };
      }
      porMateria[materia].tempo += estudo.tempoMinutos;
      porMateria[materia].questoes += estudo.questoesFeitas;
      porMateria[materia].acertos += estudo.questoesAcertadas;
    });
    
    return MATERIAS_ENEM.map(materia => ({
      ...porMateria[materia],
      percentual: porMateria[materia].questoes > 0 
        ? Math.round((porMateria[materia].acertos / porMateria[materia].questoes) * 100) 
        : 0,
    }));
  }, [estudosFiltrados]);

  const dadosDistribuicaoTempo = useMemo(() => {
    return dadosPorMateria
      .filter(d => d.tempo > 0)
      .map((d) => {
        const indexMateria = MATERIAS_ENEM.indexOf(d.materia as typeof MATERIAS_ENEM[number]);
        return {
          name: d.materia,
          value: d.tempo,
          color: CORES_GRAFICOS[indexMateria >= 0 ? indexMateria : 0],
        };
      });
  }, [dadosPorMateria]);

  // Dados filtrados para o gráfico (excluindo itens ocultos)
  const dadosDistribuicaoTempoFiltrados = useMemo(() => {
    return dadosDistribuicaoTempo.filter(d => !itensOcultos.has(d.name));
  }, [dadosDistribuicaoTempo, itensOcultos]);

  // Função para alternar visibilidade de um item
  const toggleItemVisibilidade = (nome: string) => {
    setItensOcultos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nome)) {
        newSet.delete(nome);
      } else {
        newSet.add(nome);
      }
      return newSet;
    });
  };

  const metricas = useMemo(() => {
    const tempoTotal = estudosFiltrados.reduce((acc, e) => acc + e.tempoMinutos, 0);
    const questoesTotal = estudosFiltrados.reduce((acc, e) => acc + e.questoesFeitas, 0);
    const acertosTotal = estudosFiltrados.reduce((acc, e) => acc + e.questoesAcertadas, 0);
    const percentualAcerto = questoesTotal > 0 ? Math.round((acertosTotal / questoesTotal) * 100) : 0;
    
    const diasUnicos = new Set(
      estudosFiltrados
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
            
            return data.toISOString().split('T')[0];
          } catch (error) {
            return null;
          }
        })
        .filter((v): v is string => v !== null)
    );
    
    return {
      tempoTotal,
      questoesTotal,
      acertosTotal,
      percentualAcerto,
      diasEstudo: diasUnicos.size,
    };
  }, [estudosFiltrados]);

  // Funções do Heatmap
  const mesAnterior = () => {
    setMesHeatmap(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const mesProximo = () => {
    setMesHeatmap(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const formatarMes = (data: Date) => {
    return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  // Formatar tempo médio
  const formatarTempoMedio = (minutos: number) => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    if (horas > 0) {
      return `${horas}h ${mins}m`;
    }
    return `${mins}m`;
  };

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

  return (
    <div className="space-y-8 pb-8 animate-fade-in">
      {/* Elementos decorativos */}
      <div className="fixed top-20 right-10 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="fixed bottom-20 left-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-float-delayed pointer-events-none" />

      {/* Header Premium */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-500/20 via-blue-500/10 to-pink-500/10 p-8 border-2 border-white/20 dark:border-white/10 backdrop-blur-xl shadow-2xl animate-slide-up">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-blue-500/20 to-transparent rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-xl opacity-50 animate-pulse-slow" />
                <div className="relative bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500 p-4 rounded-2xl shadow-2xl">
                  <BarChart3 className="h-10 w-10 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent animate-gradient">
                  Análise de Desempenho
                </h1>
              </div>
            </div>
            <p className="text-lg text-muted-foreground font-medium">
              Acompanhe sua evolução nos estudos 📊
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Toggle de comparação */}
            <div className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-black/30 rounded-2xl border-2 border-white/30 backdrop-blur-sm">
              <Users className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Comparar com média</span>
              <Switch
                checked={mostrarComparacao}
                onCheckedChange={toggleComparacao}
              />
            </div>
            
            <div className="flex items-center gap-3 px-4 py-2 bg-white/50 dark:bg-black/30 rounded-2xl border-2 border-white/30 backdrop-blur-sm">
              <Calendar className="h-5 w-5 text-purple-500" />
              <Select value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoFiltro)}>
                <SelectTrigger className="w-[180px] border-2 font-semibold">
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="3m">Últimos 3 meses</SelectItem>
                  <SelectItem value="6m">Últimos 6 meses</SelectItem>
                  <SelectItem value="1a">Último ano</SelectItem>
                  <SelectItem value="all">Todo o período</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de métricas premium */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <Card className="relative overflow-hidden border-2 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-500 group animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold">Tempo Total</CardTitle>
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
              <Clock className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              {Math.floor(metricas.tempoTotal / 60)}h {metricas.tempoTotal % 60}m
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">de estudo dedicado</p>
            {mostrarComparacao && mediasPlataforma && (
              <p className="text-xs text-blue-600 mt-2 font-semibold flex items-center gap-1">
                <Users className="h-3 w-3" />
                Média da plataforma: {formatarTempoMedio(mediasPlataforma.tempoMedio)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-500 group animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold">Questões</CardTitle>
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl shadow-lg">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-black bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
              {metricas.questoesTotal}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">questões resolvidas</p>
            {mostrarComparacao && mediasPlataforma && (
              <p className="text-xs text-emerald-600 mt-2 font-semibold flex items-center gap-1">
                <Users className="h-3 w-3" />
                Média da plataforma: {mediasPlataforma.questoesMedia}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-500 group animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold">Acertos</CardTitle>
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {metricas.acertosTotal}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">questões corretas</p>
            {mostrarComparacao && mediasPlataforma && (
              <p className="text-xs text-purple-600 mt-2 font-semibold flex items-center gap-1">
                <Users className="h-3 w-3" />
                Média da plataforma: {mediasPlataforma.acertosMedia}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 hover:shadow-2xl hover:shadow-amber-500/20 transition-all duration-500 group animate-slide-up" style={{ animationDelay: '0.25s' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold">Taxa de Acerto</CardTitle>
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg">
              <Target className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              {metricas.percentualAcerto}%
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">de aproveitamento</p>
            {mostrarComparacao && mediasPlataforma && (
              <p className="text-xs text-amber-600 mt-2 font-semibold flex items-center gap-1">
                <Users className="h-3 w-3" />
                Média da plataforma: {mediasPlataforma.taxaAcertoMedia}%
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 hover:shadow-2xl hover:shadow-rose-500/20 transition-all duration-500 group animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold">Dias de Estudo</CardTitle>
            <div className="p-2 bg-gradient-to-br from-rose-500 to-red-500 rounded-xl shadow-lg">
              <Award className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-black bg-gradient-to-r from-rose-600 to-red-600 bg-clip-text text-transparent">
              {metricas.diasEstudo}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">dias praticados</p>
            {mostrarComparacao && mediasPlataforma && (
              <p className="text-xs text-rose-600 mt-2 font-semibold flex items-center gap-1">
                <Users className="h-3 w-3" />
                Média da plataforma: {mediasPlataforma.diasEstudoMedia}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráficos Premium */}
      <Tabs defaultValue="evolucao" className="space-y-6 animate-slide-up" style={{ animationDelay: '0.35s' }}>
        <TabsList className="grid w-full grid-cols-3 p-1 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-2">
          <TabsTrigger value="evolucao" className="font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white">
            Evolução Temporal
          </TabsTrigger>
          <TabsTrigger value="materias" className="font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white">
            Por Matéria
          </TabsTrigger>
          <TabsTrigger value="distribuicao" className="font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white">
            Distribuição
          </TabsTrigger>
        </TabsList>

        <TabsContent value="evolucao" className="space-y-4">
          <Card className="border-2 hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="text-2xl font-black flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                Evolução do Desempenho
              </CardTitle>
              <CardDescription className="text-base">Acompanhe sua progressão ao longo do tempo</CardDescription>
            </CardHeader>
            <CardContent>
              {dadosEvolucao.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={dadosEvolucao}>
                    <defs>
                      <linearGradient id="colorTempo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPercentual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="data" stroke="#6b7280" style={{ fontSize: '12px', fontWeight: 600 }} />
                    <YAxis yAxisId="left" stroke="#3b82f6" style={{ fontSize: '12px', fontWeight: 600 }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#10b981" style={{ fontSize: '12px', fontWeight: 600 }} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        fontWeight: 600
                      }} 
                    />
                    <Legend wrapperStyle={{ fontWeight: 600 }} />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="tempo"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      name="Tempo (min)"
                      dot={{ fill: '#3b82f6', r: 5 }}
                      activeDot={{ r: 8 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="percentual"
                      stroke="#10b981"
                      strokeWidth={3}
                      name="Taxa de Acerto (%)"
                      dot={{ fill: '#10b981', r: 5 }}
                      activeDot={{ r: 8 }}
                    />
                    {/* Linhas de referência da média da plataforma */}
                    {mostrarComparacao && mediasPlataforma && (
                      <>
                        <ReferenceLine 
                          yAxisId="right" 
                          y={mediasPlataforma.taxaAcertoMedia} 
                          stroke="#10b981" 
                          strokeDasharray="5 5" 
                          strokeWidth={2}
                          label={{ value: `Média: ${mediasPlataforma.taxaAcertoMedia}%`, position: 'right', fill: '#10b981', fontSize: 11, fontWeight: 600 }}
                        />
                      </>
                    )}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px]">
                  <div className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full mb-4">
                    <BarChart3 className="h-12 w-12 text-blue-500" />
                  </div>
                  <p className="text-lg font-semibold text-muted-foreground">Nenhum dado disponível</p>
                  <p className="text-sm text-muted-foreground">para o período selecionado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materias" className="space-y-6">
          <Card className="border-2 hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="text-2xl font-black flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl shadow-lg">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                Desempenho por Matéria
              </CardTitle>
              <CardDescription className="text-base">Compare seu progresso em cada disciplina</CardDescription>
            </CardHeader>
            <CardContent>
              {dadosPorMateria.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={dadosPorMateria}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="materia" stroke="#6b7280" style={{ fontSize: '11px', fontWeight: 600 }} angle={-15} textAnchor="end" height={80} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px', fontWeight: 600 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        fontWeight: 600
                      }} 
                    />
                    <Legend wrapperStyle={{ fontWeight: 600 }} />
                    <Bar dataKey="questoes" fill="#3b82f6" name="Questões Feitas" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="acertos" fill="#10b981" name="Acertos" radius={[8, 8, 0, 0]} />
                    {/* Linhas de referência da média da plataforma */}
                    {mostrarComparacao && mediasPlataforma && (
                      <>
                        <ReferenceLine 
                          y={Math.round(mediasPlataforma.questoesMedia / MATERIAS_ENEM.length)} 
                          stroke="#3b82f6" 
                          strokeDasharray="5 5" 
                          strokeWidth={2}
                          label={{ value: `Média questões`, position: 'right', fill: '#3b82f6', fontSize: 10, fontWeight: 600 }}
                        />
                        <ReferenceLine 
                          y={Math.round(mediasPlataforma.acertosMedia / MATERIAS_ENEM.length)} 
                          stroke="#10b981" 
                          strokeDasharray="5 5" 
                          strokeWidth={2}
                          label={{ value: `Média acertos`, position: 'right', fill: '#10b981', fontSize: 10, fontWeight: 600 }}
                        />
                      </>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px]">
                  <div className="p-6 bg-gradient-to-br from-emerald-500/10 to-green-500/10 rounded-full mb-4">
                    <BarChart3 className="h-12 w-12 text-emerald-500" />
                  </div>
                  <p className="text-lg font-semibold text-muted-foreground">Nenhum dado disponível</p>
                  <p className="text-sm text-muted-foreground">para o período selecionado</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="text-2xl font-black flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                  <Target className="h-5 w-5 text-white" />
                </div>
                Taxa de Acerto por Matéria
              </CardTitle>
              <CardDescription className="text-base">Identifique seus pontos fortes e fracos</CardDescription>
            </CardHeader>
            <CardContent>
              {dadosPorMateria.length > 0 ? (
                <div className="space-y-6">
                  {dadosPorMateria.map((item, index) => (
                    <div key={index} className="space-y-3 p-4 rounded-2xl bg-gradient-to-r from-purple-500/5 to-pink-500/5 border-2 border-purple-500/10 hover:border-purple-500/30 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-base">{item.materia}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground font-semibold">
                            {item.acertos}/{item.questoes} questões
                          </span>
                          <span className={`px-4 py-1.5 rounded-full font-black text-sm ${
                            item.percentual >= 80
                              ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white"
                              : item.percentual >= 60
                              ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                              : item.percentual >= 40
                              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                              : "bg-gradient-to-r from-red-500 to-rose-500 text-white"
                          }`}>
                            {item.percentual}%
                          </span>
                        </div>
                      </div>
                      <div className="relative w-full bg-gray-200 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-3 rounded-full transition-all duration-1000 ${
                            item.percentual >= 80
                              ? "bg-gradient-to-r from-emerald-500 to-green-500"
                              : item.percentual >= 60
                              ? "bg-gradient-to-r from-blue-500 to-cyan-500"
                              : item.percentual >= 40
                              ? "bg-gradient-to-r from-amber-500 to-orange-500"
                              : "bg-gradient-to-r from-red-500 to-rose-500"
                          }`}
                          style={{ width: `${item.percentual}%` }}
                        />
                        {/* Marcador da média da plataforma */}
                        {mostrarComparacao && mediasPlataforma && (
                          <div 
                            className="absolute top-0 h-full w-0.5 bg-purple-600"
                            style={{ left: `${mediasPlataforma.taxaAcertoMedia}%` }}
                            title={`Média da plataforma: ${mediasPlataforma.taxaAcertoMedia}%`}
                          />
                        )}
                      </div>
                      {mostrarComparacao && mediasPlataforma && (
                        <p className="text-xs text-purple-600 font-semibold flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Média da plataforma: {mediasPlataforma.taxaAcertoMedia}%
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px]">
                  <div className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full mb-4">
                    <Target className="h-12 w-12 text-purple-500" />
                  </div>
                  <p className="text-lg font-semibold text-muted-foreground">Nenhum dado disponível</p>
                  <p className="text-sm text-muted-foreground">para o período selecionado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribuicao" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico de Pizza - 2/3 da largura */}
            <Card className="border-2 hover:shadow-xl transition-shadow lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-2xl font-black flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl shadow-lg">
                    <PieChart className="h-5 w-5 text-white" />
                  </div>
                  Distribuição de Tempo por Matéria/Atividade
                </CardTitle>
                <CardDescription className="text-base">Veja como você distribui seu tempo de estudo</CardDescription>
              </CardHeader>
              <CardContent>
                {dadosDistribuicaoTempo.length > 0 ? (
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Gráfico de Pizza */}
                    <div className="flex-1">
                      <ResponsiveContainer width="100%" height={400}>
                        <RechartsPie>
                          <Pie
                            data={dadosDistribuicaoTempoFiltrados}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                            style={{ fontSize: '11px', fontWeight: 700 }}
                          >
                            {dadosDistribuicaoTempoFiltrados.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                              border: '2px solid #e5e7eb',
                              borderRadius: '12px',
                              fontWeight: 600
                            }}
                            formatter={(value: number) => [`${Math.floor(value / 60)}h ${value % 60}min`, 'Tempo']}
                          />
                        </RechartsPie>
                      </ResponsiveContainer>
                    </div>
                    
                    {/* Legenda Interativa */}
                    <div className="lg:w-56 space-y-2">
                      <p className="text-sm font-semibold text-muted-foreground mb-3">Clique para ocultar/exibir:</p>
                      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                        {dadosDistribuicaoTempo.map((item) => {
                          const isOculto = itensOcultos.has(item.name);
                          const tempoHoras = Math.floor(item.value / 60);
                          const tempoMinutos = item.value % 60;
                          return (
                            <button
                              key={item.name}
                              onClick={() => toggleItemVisibilidade(item.name)}
                              className={`w-full flex items-center gap-3 p-2 rounded-lg border-2 transition-all duration-200 text-left ${
                                isOculto 
                                  ? 'opacity-40 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900' 
                                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                              }`}
                            >
                              <div 
                                className={`w-4 h-4 rounded-full flex-shrink-0 transition-opacity ${isOculto ? 'opacity-40' : ''}`}
                                style={{ backgroundColor: item.color }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold truncate ${isOculto ? 'line-through text-muted-foreground' : ''}`}>
                                  {item.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {tempoHoras > 0 ? `${tempoHoras}h ` : ''}{tempoMinutos}min
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {itensOcultos.size > 0 && (
                        <button
                          onClick={() => setItensOcultos(new Set())}
                          className="w-full mt-3 p-2 text-sm font-semibold text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/30 rounded-lg transition-colors"
                        >
                          Mostrar todos ({itensOcultos.size} oculto{itensOcultos.size > 1 ? 's' : ''})
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px]">
                    <div className="p-6 bg-gradient-to-br from-pink-500/10 to-rose-500/10 rounded-full mb-4">
                      <PieChart className="h-12 w-12 text-pink-500" />
                    </div>
                    <p className="text-lg font-semibold text-muted-foreground">Nenhum dado disponível</p>
                    <p className="text-sm text-muted-foreground">para o período selecionado</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Heatmap de Estudos - 1/3 da largura */}
            <Card className="border-2 hover:shadow-xl transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg shadow-lg">
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                  Heatmap de Estudos
                </CardTitle>
                <div className="flex items-center justify-between mt-2">
                  <Button variant="ghost" size="sm" onClick={mesAnterior} className="h-8 w-8 p-0">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-semibold capitalize">{formatarMes(mesHeatmap)}</span>
                  <Button variant="ghost" size="sm" onClick={mesProximo} className="h-8 w-8 p-0">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {/* Dias da semana */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((dia, i) => (
                    <div key={i} className="text-center text-xs font-semibold text-muted-foreground">
                      {dia}
                    </div>
                  ))}
                </div>
                
                {/* Calendário */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Espaços vazios para alinhar o primeiro dia */}
                  {Array.from({ length: dadosHeatmap[0]?.data.getDay() || 0 }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}
                  
                  {/* Dias do mês */}
                  {dadosHeatmap.map((dia, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-sm flex items-center justify-center text-xs font-medium cursor-default transition-all hover:scale-110"
                      style={{ backgroundColor: HEATMAP_CORES[dia.intensidade] }}
                      title={`${dia.data.getDate()}/${dia.data.getMonth() + 1}: ${dia.tempo > 0 ? `${Math.floor(dia.tempo / 60)}h ${dia.tempo % 60}min` : 'Sem estudo'}`}
                    >
                      <span className={dia.intensidade >= 3 ? 'text-white' : 'text-gray-600'}>
                        {dia.data.getDate()}
                      </span>
                    </div>
                  ))}
                </div>
                
                {/* Legenda */}
                <div className="flex items-center justify-center gap-1 mt-3">
                  <span className="text-xs text-muted-foreground mr-1">Menos</span>
                  {HEATMAP_CORES.map((cor, i) => (
                    <div
                      key={i}
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: cor }}
                    />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">Mais</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }
        
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float-delayed 10s ease-in-out infinite;
        }
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
        
        .animate-slide-up {
          animation: slide-up 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
