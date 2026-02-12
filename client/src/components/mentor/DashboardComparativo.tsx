import React, { useEffect, useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { mentorApi } from "../../lib/api";

interface AlunoData {
  id: string;
  nome: string;
  tempoEstudo: number; // em horas
  desempenho: number; // percentual 0-100
}

interface DashboardComparativoProps {
  periodo?: "7d" | "30d" | "90d";
}

export const DashboardComparativo: React.FC<DashboardComparativoProps> = ({
  periodo = "30d",
}) => {
  const [dados, setDados] = useState<AlunoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAluno, setSelectedAluno] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [periodo]);

  const loadData = async () => {
    try {
      setLoading(true);
      const alunos = await mentorApi.getAlunos();
      const metricas = await mentorApi.getAlunosMetricas();

      const dadosProcessados: AlunoData[] = alunos.map((aluno: any) => {
        const metrica = metricas.find((m: any) => m.userId === aluno.userId);
        return {
          id: aluno.userId,
          nome: aluno.nome,
          tempoEstudo: metrica?.totalHoras || 0,
          desempenho: metrica?.mediaDesempenho || 0,
        };
      });

      setDados(dadosProcessados);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const getColor = (desempenho: number, tempoEstudo: number) => {
    // Alto desempenho (>75%) e bom tempo de estudo (>20h)
    if (desempenho >= 75 && tempoEstudo >= 20) return "#10b981"; // Verde
    // Alto desempenho mas pouco estudo (potencial não aproveitado)
    if (desempenho >= 75 && tempoEstudo < 20) return "#3b82f6"; // Azul
    // Baixo desempenho mas muito estudo (precisa de ajuda na estratégia)
    if (desempenho < 60 && tempoEstudo >= 20) return "#ef4444"; // Vermelho
    // Baixo desempenho e pouco estudo (precisa de motivação)
    if (desempenho < 60 && tempoEstudo < 20) return "#f59e0b"; // Laranja
    // Médio
    return "#8b5cf6"; // Roxo
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900">{data.nome}</p>
          <p className="text-sm text-gray-600">
            Tempo de Estudo: <span className="font-medium">{data.tempoEstudo.toFixed(1)}h</span>
          </p>
          <p className="text-sm text-gray-600">
            Desempenho: <span className="font-medium">{data.desempenho.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Dashboard Comparativo de Alunos
        </h3>
        <p className="text-sm text-gray-600">
          Análise de desempenho vs tempo de estudo (últimos {periodo === "7d" ? "7 dias" : periodo === "30d" ? "30 dias" : "90 dias"})
        </p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="tempoEstudo"
            name="Tempo de Estudo"
            unit="h"
            label={{ value: "Tempo de Estudo (horas)", position: "insideBottom", offset: -10 }}
          />
          <YAxis
            type="number"
            dataKey="desempenho"
            name="Desempenho"
            unit="%"
            label={{ value: "Desempenho (%)", angle: -90, position: "insideLeft" }}
            domain={[0, 100]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            content={() => (
              <div className="flex flex-wrap gap-4 justify-center mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>Excelente</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span>Alto potencial</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span>Médio</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span>Precisa de estratégia</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span>Precisa de motivação</span>
                </div>
              </div>
            )}
          />
          <Scatter name="Alunos" data={dados} fill="#8884d8">
            {dados.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getColor(entry.desempenho, entry.tempoEstudo)}
                stroke={selectedAluno === entry.id ? "#000" : "none"}
                strokeWidth={selectedAluno === entry.id ? 2 : 0}
                r={8}
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedAluno(entry.id)}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-900 mb-1">🌟 Excelentes</h4>
          <p className="text-sm text-green-700">
            {dados.filter((d) => d.desempenho >= 75 && d.tempoEstudo >= 20).length} alunos
          </p>
          <p className="text-xs text-green-600 mt-1">Alto desempenho e bom tempo de estudo</p>
        </div>

        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <h4 className="font-semibold text-red-900 mb-1">⚠️ Precisam de Estratégia</h4>
          <p className="text-sm text-red-700">
            {dados.filter((d) => d.desempenho < 60 && d.tempoEstudo >= 20).length} alunos
          </p>
          <p className="text-xs text-red-600 mt-1">Muito estudo mas baixo desempenho</p>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-1">💎 Alto Potencial</h4>
          <p className="text-sm text-blue-700">
            {dados.filter((d) => d.desempenho >= 75 && d.tempoEstudo < 20).length} alunos
          </p>
          <p className="text-xs text-blue-600 mt-1">Alto desempenho, podem render mais</p>
        </div>
      </div>
    </div>
  );
};
