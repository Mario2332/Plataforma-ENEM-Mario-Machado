import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Clock, AlertCircle, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface Tarefa {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade: string;
  status: string;
  dataInicio: any;
  dataFim: any;
  comentarios: any[];
}

export function TarefasAluno() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [filtro, setFiltro] = useState("dia");
  const [loading, setLoading] = useState(false);
  const [tarefaSelecionada, setTarefaSelecionada] = useState<Tarefa | null>(null);
  const [comentario, setComentario] = useState("");

  useEffect(() => {
    carregarTarefas();
  }, [filtro]);

  const carregarTarefas = async () => {
    try {
      setLoading(true);
      // @ts-ignore
      const result = await window.firebase.functions().httpsCallable("getTarefasAluno")({ filtro });
      setTarefas(result.data || []);
    } catch (error) {
      console.error("Erro ao carregar tarefas:", error);
      toast.error("Erro ao carregar tarefas");
    } finally {
      setLoading(false);
    }
  };

  const concluirTarefa = async (tarefaId: string) => {
    try {
      // @ts-ignore
      await window.firebase.functions().httpsCallable("concluirTarefa")({
        tarefaId,
        comentario: comentario || undefined,
      });
      toast.success("Tarefa concluída!");
      setTarefaSelecionada(null);
      setComentario("");
      carregarTarefas();
    } catch (error) {
      console.error("Erro ao concluir tarefa:", error);
      toast.error("Erro ao concluir tarefa");
    }
  };

  const adicionarComentario = async (tarefaId: string) => {
    if (!comentario.trim()) {
      toast.error("Digite um comentário");
      return;
    }

    try {
      // @ts-ignore
      await window.firebase.functions().httpsCallable("adicionarComentarioTarefa")({
        tarefaId,
        comentario,
      });
      toast.success("Comentário adicionado!");
      setComentario("");
      carregarTarefas();
    } catch (error) {
      console.error("Erro ao adicionar comentário:", error);
      toast.error("Erro ao adicionar comentário");
    }
  };

  const getCategoriaLabel = (cat: string) => {
    const labels: any = {
      questoes: "Questões",
      videoaula: "Vídeo-aula",
      revisao: "Revisão",
      redacao: "Redação",
      leitura: "Leitura",
      outro: "Outro",
    };
    return labels[cat] || cat;
  };

  const getPrioridadeCor = (prioridade: string) => {
    return prioridade === "alta" ? "destructive" : prioridade === "media" ? "default" : "secondary";
  };

  const getStatusIcon = (status: string) => {
    if (status === "concluida") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (status === "atrasada") return <AlertCircle className="h-4 w-4 text-red-500" />;
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  const formatarData = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp._seconds ? new Date(timestamp._seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString("pt-BR");
  };

  const tarefasPendentes = tarefas.filter((t) => t.status === "pendente");
  const tarefasConcluidas = tarefas.filter((t) => t.status === "concluida");
  const tarefasAtrasadas = tarefas.filter((t) => t.status === "atrasada");
  const progresso = tarefas.length > 0 ? (tarefasConcluidas.length / tarefas.length) * 100 : 0;

  if (tarefas.length === 0 && !loading) {
    return null; // Não exibir nada se não houver tarefas
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Minhas Tarefas</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {Math.round(progresso)}% concluído
              </span>
              <div className="w-24 h-2 bg-gray-200 rounded-full">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${progresso}%` }}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={filtro} onValueChange={setFiltro}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dia">Hoje</TabsTrigger>
              <TabsTrigger value="semana">Semana</TabsTrigger>
              <TabsTrigger value="mes">Mês</TabsTrigger>
              <TabsTrigger value="todas">Todas</TabsTrigger>
            </TabsList>

            <TabsContent value={filtro} className="space-y-4 mt-4">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Carregando...</div>
              ) : tarefas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma tarefa para este período
                </div>
              ) : (
                <>
                  {/* Estatísticas */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <div className="text-2xl font-bold text-yellow-700">{tarefasPendentes.length}</div>
                      <div className="text-sm text-yellow-600">Pendentes</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <div className="text-2xl font-bold text-green-700">{tarefasConcluidas.length}</div>
                      <div className="text-sm text-green-600">Concluídas</div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <div className="text-2xl font-bold text-red-700">{tarefasAtrasadas.length}</div>
                      <div className="text-sm text-red-600">Atrasadas</div>
                    </div>
                  </div>

                  {/* Lista de Tarefas */}
                  <div className="space-y-3">
                    {tarefas.map((tarefa) => (
                      <div
                        key={tarefa.id}
                        className={`p-4 rounded-lg border transition-all ${
                          tarefa.status === "concluida"
                            ? "bg-green-50 border-green-200"
                            : tarefa.status === "atrasada"
                            ? "bg-red-50 border-red-200"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={tarefa.status === "concluida"}
                            disabled={tarefa.status === "concluida"}
                            onCheckedChange={() => setTarefaSelecionada(tarefa)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-semibold">{tarefa.titulo}</h4>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(tarefa.status)}
                                <Badge variant={getPrioridadeCor(tarefa.prioridade)}>
                                  {tarefa.prioridade}
                                </Badge>
                              </div>
                            </div>
                            {tarefa.descricao && (
                              <p className="text-sm text-gray-600 mt-1">{tarefa.descricao}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>📚 {getCategoriaLabel(tarefa.categoria)}</span>
                              <span>📅 Até {formatarData(tarefa.dataFim)}</span>
                              {tarefa.comentarios?.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  {tarefa.comentarios.length}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog de Conclusão */}
      <Dialog open={!!tarefaSelecionada} onOpenChange={() => setTarefaSelecionada(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Concluir Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Tem certeza que deseja marcar esta tarefa como concluída?
            </p>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Comentário (opcional)
              </label>
              <Textarea
                placeholder="Adicione um comentário sobre a conclusão..."
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setTarefaSelecionada(null)}>
                Cancelar
              </Button>
              <Button onClick={() => tarefaSelecionada && concluirTarefa(tarefaSelecionada.id)}>
                Concluir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
