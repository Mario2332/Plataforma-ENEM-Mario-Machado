import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { BarChart3, Calendar } from "lucide-react";
import { parseDataSegura } from "@/pages/aluno/AlunoEstudos";

interface StudyHistoryChartProps {
  estudos: any[];
}

type PeriodoFiltro = "7" | "30" | "90" | "180";

export function StudyHistoryChart({ estudos }: StudyHistoryChartProps) {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("7");

  const dadosGrafico = useMemo(() => {
    const hoje = new Date();
    
    const diasParaMostrar = parseInt(periodo);
    
    // Criar mapa de datas
    const mapaDatas = new Map<string, number>();
    
    // Inicializar todas as datas do período com 0
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

    console.log("StudyHistoryChart - Total estudos:", estudos.length);

    // Preencher com dados reais
    estudos.forEach(estudo => {
      try {
        const dataEstudo = parseDataSegura(estudo.data);
        
        if (!dataEstudo) {
          return;
        }

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
        console.warn("StudyHistoryChart - Erro ao processar estudo:", error, estudo);
      }
    });

    // Converter para array e ordenar por data
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

  const totalHorasPeriodo = useMemo(() => {
    return dadosGrafico.reduce((acc, curr) => acc + curr.horas, 0).toFixed(1);
  }, [dadosGrafico]);

  const mediaDiaria = useMemo(() => {
    return (Number(totalHorasPeriodo) / dadosGrafico.length).toFixed(1);
  }, [totalHorasPeriodo, dadosGrafico]);

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
          
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoFiltro)}>
            <SelectTrigger className="w-[180px] border-2 font-medium">
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
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
            <p className="text-sm text-muted-foreground font-medium">Total no Período</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalHorasPeriodo}h</p>
          </div>
          <div className="p-4 bg-cyan-50 dark:bg-cyan-950/20 rounded-xl border border-cyan-100 dark:border-cyan-900/30">
            <p className="text-sm text-muted-foreground font-medium">Média Diária</p>
            <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{mediaDiaria}h</p>
          </div>
        </div>
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
                minTickGap={30}
              />
              <YAxis 
                tick={{ fontSize: 12 }} 
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}h`}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  padding: '12px'
                }}
                formatter={(value: number) => [`${value} horas`, 'Tempo Estudado']}
                labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: '#64748b' }}
              />
              <Bar dataKey="horas" radius={[4, 4, 0, 0]} maxBarSize={50}>
                {dadosGrafico.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.horas > 0 ? "url(#colorGradient)" : "#e2e8f0"} 
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
