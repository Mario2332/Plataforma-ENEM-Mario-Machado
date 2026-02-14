import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { mentorApi } from "@/lib/api";
import { toast } from "sonner";

export default function MentorCronogramaConsolidado() {
  const [alunos, setAlunos] = useState<any[]>([]);
  const [atividadesPorAluno, setAtividadesPorAluno] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [semanaAtual, setSemanaAtual] = useState(0); // 0 = semana atual, 1 = próxima, -1 = anterior

  const diasDaSemana = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

  useEffect(() => {
    loadData();
  }, [semanaAtual]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const alunosData = await mentorApi.getAlunos();
      setAlunos(alunosData as any[]);

      // Carregar cronograma de cada aluno
      const atividades: Record<string, any[]> = {};
      for (const aluno of alunosData as any[]) {
        try {
          const resumo = await mentorApi.getAlunoResumo(aluno.id);
          atividades[aluno.id] = resumo.cronogramaSemanal || [];
        } catch (error) {
          console.error(`Erro ao carregar cronograma do aluno ${aluno.nome}:`, error);
          atividades[aluno.id] = [];
        }
      }
      setAtividadesPorAluno(atividades);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  const getDatasDaSemana = () => {
    const hoje = new Date();
    const diaSemana = hoje.getDay(); // 0 = domingo, 1 = segunda, ...
    const diasParaSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
    
    const segunda = new Date(hoje);
    segunda.setDate(hoje.getDate() + diasParaSegunda + (semanaAtual * 7));
    
    return Array.from({ length: 7 }, (_, i) => {
      const data = new Date(segunda);
      data.setDate(segunda.getDate() + i);
      return data;
    });
  };

  const datas = getDatasDaSemana();

  const getAtividadesParaDia = (alunoId: string, diaSemana: string) => {
    const atividades = atividadesPorAluno[alunoId] || [];
    return atividades.filter(ativ => ativ.dia === diaSemana);
  };

  const formatarData = (data: Date) => {
    return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  const getTituloSemana = () => {
    if (semanaAtual === 0) return "Semana Atual";
    if (semanaAtual === 1) return "Próxima Semana";
    if (semanaAtual === -1) return "Semana Passada";
    if (semanaAtual > 0) return `Daqui a ${semanaAtual} semanas`;
    return `Há ${Math.abs(semanaAtual)} semanas`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cronograma Consolidado</h1>
          <p className="text-muted-foreground">
            Visualize as atividades de todos os alunos em uma única visão
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSemanaAtual(semanaAtual - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-4">
            <CalendarIcon className="h-4 w-4" />
            <span className="font-medium">{getTituloSemana()}</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSemanaAtual(semanaAtual + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {semanaAtual !== 0 && (
            <Button variant="default" size="sm" onClick={() => setSemanaAtual(0)}>
              Hoje
            </Button>
          )}
        </div>
      </div>

      {alunos.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              Nenhum aluno cadastrado
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {alunos.map((aluno) => (
            <Card key={aluno.id}>
              <CardHeader>
                <CardTitle className="text-lg">{aluno.nome}</CardTitle>
                <CardDescription>{aluno.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {diasDaSemana.map((dia, index) => {
                    const atividades = getAtividadesParaDia(aluno.id, dia);
                    const data = datas[index];
                    const isHoje = data.toDateString() === new Date().toDateString();
                    
                    return (
                      <div
                        key={dia}
                        className={`border rounded-lg p-3 min-h-[120px] ${
                          isHoje ? "bg-blue-50 border-blue-300" : "bg-background"
                        }`}
                      >
                        <div className="font-semibold text-sm mb-2">
                          {dia}
                          <div className="text-xs text-muted-foreground font-normal">
                            {formatarData(data)}
                          </div>
                        </div>
                        <div className="space-y-1">
                          {atividades.length > 0 ? (
                            atividades.map((ativ, idx) => (
                              <div
                                key={idx}
                                className="text-xs p-1.5 rounded"
                                style={{
                                  backgroundColor: ativ.cor ? `${ativ.cor}20` : "#e0e7ff",
                                  borderLeft: `3px solid ${ativ.cor || "#3b82f6"}`,
                                }}
                              >
                                <div className="font-medium truncate">
                                  {ativ.atividade === "Outra atividade"
                                    ? ativ.atividadePersonalizada
                                    : ativ.atividade}
                                </div>
                                <div className="text-muted-foreground">
                                  {ativ.horaInicio} - {ativ.horaFim}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground italic">
                              Sem atividades
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
