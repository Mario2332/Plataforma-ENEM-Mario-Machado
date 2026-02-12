import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { BarChart3, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { parseDataSegura } from "@/pages/aluno/AlunoEstudos";
import { getMetaMentor, formatarTempo } from "@/services/metasMentor";
import { useAuth } from "@/hooks/useAuth";
import { useMentorViewContext } from "@/contexts/MentorViewContext";

interface StudyHistoryChartProps {
  estudos: any[];
}

type ModoVisualizacao = "periodo" | "semanas";
type PeriodoFiltro = "7" | "30" | "90" | "180";

// Função para formatar minutos em horas e minutos
function formatarTempoCompleto(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const mins = Math.round(minutos % 60);
  
  if (horas === 0) {
    return `${mins}min`;
  } else if (mins === 0) {
    return `${horas}h`;
  } else {
    return `${horas}h ${mins}min`;
  }
}

// Função para obter o domingo de uma data
function getDomingo(data: Date): Date {
  const d = new Date(data);
  const diaSemana = d.getDay();
  d.setDate(d.getDate() - diaSemana);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Função para obter o sábado de uma data
function getSabado(data: Date): Date {
  const d = getDomingo(data);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function StudyHistoryChart({ estudos }: StudyHistoryChartProps) {
  const { user } = useAuth();
  const { alunoId, isMentorView } = useMentorViewContext();
  const [modo, setModo] = useState<ModoVisualizacao>("semanas");
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("7");
  const [semanaAtual, setSemanaAtual] = useState<Date>(getDomingo(new Date()));
  const [metaMentor, setMetaMentor] = useState<{ horas: number; minutos: number } | null>(null);

  // Determinar o ID efetivo do usuário (aluno ou mentor visualizando)
  const effectiveUserId = isMentorView && alunoId ? alunoId : user?.uid;

  // Carregar meta do mentor
  useEffect(() => {
    if (effectiveUserId) {
      console.log("[StudyHistoryChart] Carregando meta para:", effectiveUserId);
      getMetaMentor(effectiveUserId).then((meta) => {
        if (meta) {
          console.log("[StudyHistoryChart] Meta carregada:", meta.tempoMedioDiario);
          setMetaMentor(meta.tempoMedioDiario);
        } else {
          console.log("[StudyHistoryChart] Nenhuma meta encontrada");
        }
      });
    }
  }, [effectiveUserId]);

  // Calcular meta em minutos para a linha de referência
  const metaMinutos = useMemo(() => {
    if (!metaMentor) return null;
    return metaMentor.horas * 60 + metaMentor.minutos;
  }, [metaMentor]);

  // Dados do gráfico para modo "período personalizado"
  const dadosGraficoPeriodo = useMemo(() => {
    const hoje = new Date();
    const diasParaMostrar = parseInt(periodo);
    
    const mapaDatas = new Map<string, number>();
    
    for (let i = 0; i < diasParaMostrar; i++) {
      const data = new Date(hoje);
      data.setDate(data.getDate() - i);
      const dataStr = data.toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).split('/').reverse().join('-');
      mapaDatas.set(dataStr, 0);
    }

    estudos.forEach(estudo => {
      try {
        const dataEstudo = parseDataSegura(estudo.data);
        if (!dataEstudo) return;

        const dataStr = dataEstudo.toLocaleDateString('pt-BR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).split('/').reverse().join('-');
        
        if (mapaDatas.has(dataStr)) {
          const tempoAtual = mapaDatas.get(dataStr) || 0;
          mapaDatas.set(dataStr, tempoAtual + (Number(estudo.tempoMinutos) || 0));
        }
      } catch (error) {
        console.warn("Erro ao processar estudo:", error);
      }
    });

    const dados = Array.from(mapaDatas.entries())
      .map(([data, minutos]) => {
        const [ano, mes, dia] = data.split('-');
        return {
          data,
          dataFormatada: `${dia}/${mes}`,
          minutos,
          horas: Number((minutos / 60).toFixed(1))
        };
      })
      .sort((a, b) => a.data.localeCompare(b.data));

    return dados;
  }, [estudos, periodo]);

  // Dados do gráfico para modo "por semanas"
  const dadosGraficoSemana = useMemo(() => {
    const domingo = getDomingo(semanaAtual);
    const sabado = getSabado(semanaAtual);
    
    const mapaDatas = new Map<string, number>();
    
    // Inicializar os 7 dias da semana
    for (let i = 0; i < 7; i++) {
      const data = new Date(domingo);
      data.setDate(domingo.getDate() + i);
      const dataStr = data.toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).split('/').reverse().join('-');
      mapaDatas.set(dataStr, 0);
    }

    estudos.forEach(estudo => {
      try {
        const dataEstudo = parseDataSegura(estudo.data);
        if (!dataEstudo) return;

        const dataStr = dataEstudo.toLocaleDateString('pt-BR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).split('/').reverse().join('-');
        
        if (mapaDatas.has(dataStr)) {
          const tempoAtual = mapaDatas.get(dataStr) || 0;
          mapaDatas.set(dataStr, tempoAtual + (Number(estudo.tempoMinutos) || 0));
        }
      } catch (error) {
        console.warn("Erro ao processar estudo:", error);
      }
    });

    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    const dados = Array.from(mapaDatas.entries())
      .map(([data, minutos], index) => {
        const [ano, mes, dia] = data.split('-');
        return {
          data,
          dataFormatada: `${diasSemana[index]} ${dia}/${mes}`,
          minutos,
          horas: Number((minutos / 60).toFixed(1))
        };
      })
      .sort((a, b) => a.data.localeCompare(b.data));

    return dados;
  }, [estudos, semanaAtual]);

  const dadosGrafico = modo === "semanas" ? dadosGraficoSemana : dadosGraficoPeriodo;

  const totalMinutosPeriodo = useMemo(() => {
    return dadosGrafico.reduce((acc, curr) => acc + curr.minutos, 0);
  }, [dadosGrafico]);

  const mediaMinutosDiaria = useMemo(() => {
    return Math.round(totalMinutosPeriodo / dadosGrafico.length);
  }, [totalMinutosPeriodo, dadosGrafico]);

  // Navegação de semanas
  const irParaSemanaAnterior = () => {
    const novaSemana = new Date(semanaAtual);
    novaSemana.setDate(novaSemana.getDate() - 7);
    setSemanaAtual(getDomingo(novaSemana));
  };

  const irParaProximaSemana = () => {
    const novaSemana = new Date(semanaAtual);
    novaSemana.setDate(novaSemana.getDate() + 7);
    const hoje = getDomingo(new Date());
    
    // Não permitir ir para semanas futuras
    if (novaSemana <= hoje) {
      setSemanaAtual(getDomingo(novaSemana));
    }
  };

  const irParaSemanaAtual = () => {
    setSemanaAtual(getDomingo(new Date()));
  };

  const formatarRangeSemana = () => {
    const domingo = getDomingo(semanaAtual);
    const sabado = getSabado(semanaAtual);
    
    const diaInicio = domingo.getDate();
    const mesInicio = domingo.toLocaleDateString('pt-BR', { month: 'short' });
    const diaFim = sabado.getDate();
    const mesFim = sabado.toLocaleDateString('pt-BR', { month: 'short' });
    
    if (mesInicio === mesFim) {
      return `${diaInicio}-${diaFim} de ${mesInicio}`;
    } else {
      return `${diaInicio} de ${mesInicio} - ${diaFim} de ${mesFim}`;
    }
  };

  const ehSemanaAtual = () => {
    const hoje = getDomingo(new Date());
    return semanaAtual.getTime() === hoje.getTime();
  };

  return (
    <Card className="border-2 hover:shadow-xl transition-all duration-500">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                <BarChart3 className="h-5 w-5" />
              </div>
              Histórico de Estudos
            </CardTitle>
            <CardDescription className="mt-1">
              Acompanhe sua consistência e volume de estudos
            </CardDescription>
          </div>
          
          {/* Toggle de modo de visualização */}
          <div className="flex gap-2">
            <Button
              variant={modo === "periodo" ? "default" : "outline"}
              size="sm"
              onClick={() => setModo("periodo")}
              className="flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Período personalizado
            </Button>
            <Button
              variant={modo === "semanas" ? "default" : "outline"}
              size="sm"
              onClick={() => setModo("semanas")}
              className="flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Por semanas
            </Button>
          </div>
        </div>

        {/* Controles específicos por modo */}
        <div className="mt-4">
          {modo === "periodo" ? (
            <Select value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoFiltro)}>
              <SelectTrigger className="w-[200px] border-2 font-medium">
                <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="180">Últimos 180 dias</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={irParaSemanaAnterior}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="px-4 py-2 bg-muted rounded-md font-medium min-w-[200px] text-center">
                {formatarRangeSemana()}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={irParaProximaSemana}
                disabled={ehSemanaAtual()}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              {!ehSemanaAtual() && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={irParaSemanaAtual}
                >
                  Semana atual
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
            <p className="text-sm text-muted-foreground font-medium">Total no Período</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatarTempoCompleto(totalMinutosPeriodo)}
            </p>
          </div>
          <div className="p-4 bg-cyan-50 dark:bg-cyan-950/20 rounded-xl border border-cyan-100 dark:border-cyan-900/30">
            <p className="text-sm text-muted-foreground font-medium">Média Diária</p>
            <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
              {formatarTempoCompleto(mediaMinutosDiaria)}
            </p>
          </div>
        </div>

        {/* Mostrar meta do mentor se existir */}
        {metaMentor && (
          <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-xl border border-orange-200 dark:border-orange-900/30">
            <p className="text-sm font-medium text-orange-800 dark:text-orange-400">
              🎯 Meta do mentor: {formatarTempo(metaMentor.horas, metaMentor.minutos)}/dia
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosGrafico} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis 
                dataKey="dataFormatada" 
                tick={{ fontSize: 12 }} 
                tickLine={false}
                axisLine={false}
                minTickGap={modo === "semanas" ? 0 : 30}
              />
              <YAxis 
                tick={{ fontSize: 12 }} 
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatarTempoCompleto(value)}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  padding: '12px'
                }}
                formatter={(value: number) => [formatarTempoCompleto(value), 'Tempo Estudado']}
                labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: '#64748b' }}
              />
              
              {/* Linha de referência da meta do mentor */}
              {metaMinutos && (
                <ReferenceLine 
                  y={metaMinutos} 
                  stroke="#f97316" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  label={{
                    value: `Meta: ${formatarTempo(metaMentor!.horas, metaMentor!.minutos)}`,
                    position: 'insideTopRight',
                    fill: '#f97316',
                    fontSize: 12,
                    fontWeight: 'bold'
                  }}
                />
              )}
              
              <Bar dataKey="minutos" radius={[4, 4, 0, 0]} maxBarSize={50}>
                {dadosGrafico.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.minutos > 0 ? "url(#colorGradient)" : "#e2e8f0"} 
                  />
                ))}
              </Bar>
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={1}/>
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
