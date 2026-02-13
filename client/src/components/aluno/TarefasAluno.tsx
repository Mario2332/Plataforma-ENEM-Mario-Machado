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
import { alunoApi } from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

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
  const { user } = useAuthContext();
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [filtro, setFiltro] = useState("dia");
  const [loading, setLoading] = useState(true);
  const [tarefaSelecionada, setTarefaSelecionada] = useState<Tarefa | null>(null);
  const [comentario, setComentario] = useState("");
  const [temMentorEspecifico, setTemMentorEspecifico] = useState(false);

  useEffect(() => {
    verificarMentor();
  }, [user]);

  useEffect(() => {
    if (temMentorEspecifico) {
      carregarTarefas();
    }
  }, [filtro, temMentorEspecifico]);

  const verificarMentor = async () => {
    if (!user) return;

    try {
      const alunoDoc = await getDoc(doc(db, "alunos", user.uid));
      if (alunoDoc.exists()) {
        const mentorId = alunoDoc.data().mentorId;
        console.log("[TarefasAluno] mentorId:", mentorId);
        
        // Verificar se tem mentor específico (não é "todos" nem "avulsa")
        const temMentor = mentorId && mentorId !== "todos" && mentorId !== "avulsa";
        console.log("[TarefasAluno] temMentorEspecifico:", temMentor);
        setTemMentorEspecifico(temMentor);
      }
    } catch (error) {
      console.error("Erro ao verificar mentor:", error);
    } finally {
      setLoading(false);
    }
  };

  const carregarTarefas = async () => {
    try {
      setLoading(true);
      console.log("[TarefasAluno] Carregando tarefas com filtro:", filtro);
      const result = await alunoApi.getTarefasAluno(filtro);
      console.log("[TarefasAluno] Tarefas recebidas:", result);
      setTarefas(result || []);
    } catch (error: any) {
      console.error("Erro ao carregar tarefas:", error);
      toast.error("Erro ao carregar tarefas");
    } finally {
      setLoading(false);
    }
  };

  const concluirTarefa = async (tarefaId: string) => {
    try {
      await alunoApi.concluirTarefa({
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
      await alunoApi.adicionarComentarioTarefa({
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

  const formatarData = (data: any) => {
    if (!data) return "";
    const d = data.toDate ? data.toDate() : new Date(data._seconds * 1000);
    return d.toLocaleDateString("pt-BR");
  };

  const getCategoriaColor = (categoria: string) => {
    const colors: any = {
      questoes: "bg-blue-100 text-blue-800",
      "video-aula": "bg-purple-100 text-purple-800",
      videoaula: "bg-purple-100 text-purple-800",
      revisao: "bg-green-100 text-green-800",
      redacao: "bg-orange-100 text-orange-800",
      leitura: "bg-yellow-100 text-yellow-800",
      outro: "bg-gray-100 text-gray-800",
    };
    return colors[categoria] || colors.outro;
  };

  const getPrioridadeColor = (prioridade: string) => {
    const colors: any = {
      alta: "bg-red-100 text-red-800",
      media: "bg-yellow-100 text-yellow-800",
      baixa: "bg-gray-100 text-gray-800",
    };
    return colors[prioridade] || colors.baixa;
  };

  const getStatusIcon = (status: string) => {
    if (status === "concluida") return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    if (status === "atrasada") return <AlertCircle className="h-5 w-5 text-red-600" />;
    return <Clock className="h-5 w-5 text-yellow-600" />;
  };

  // Não renderizar nada se não tem mentor específico
  if (!temMentorEspecifico) {
    return null;
  }

  if (loading && tarefas.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Carregando tarefas...</p>
        </CardContent>
      </Card>
    );
  }

  const tarefasPendentes = tarefas.filter((t) => t.status === "pendente");
  const tarefasConcluidas = tarefas.filter((t) => t.status === "concluida");
  const tarefasAtrasadas = tarefas.filter((t) => t.status === "atrasada");

  const progresso = tarefas.length > 0 ? (tarefasConcluidas.length / tarefas.length) * 100 : 0;

  if (tarefas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📝 Minhas Tarefas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">Nenhuma tarefa para este período.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>📝 Minhas Tarefas</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Barra de Progresso */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Progresso</span>
              <span className="text-sm text-muted-foreground">{Math.round(progresso)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-yellow-600">{tarefasPendentes.length}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{tarefasConcluidas.length}</p>
                <p className="text-sm text-muted-foreground">Concluídas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{tarefasAtrasadas.length}</p>
                <p className="text-sm text-muted-foreground">Atrasadas</p>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Tabs value={filtro} onValueChange={setFiltro} className="mb-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dia">Hoje</TabsTrigger>
              <TabsTrigger value="semana">Semana</TabsTrigger>
              <TabsTrigger value="mes">Mês</TabsTrigger>
              <TabsTrigger value="todas">Todas</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Lista de Tarefas */}
          <div className="space-y-3">
            {tarefas.map((tarefa) => (
              <Card key={tarefa.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <Checkbox
                        checked={tarefa.status === "concluida"}
                        onCheckedChange={() => {
                          if (tarefa.status !== "concluida") {
                            setTarefaSelecionada(tarefa);
                          }
                        }}
                        disabled={tarefa.status === "concluida"}
                      />
                      <div className="flex-1">
                        <h4 className="font-medium flex items-center gap-2">
                          {tarefa.titulo}
                          {getStatusIcon(tarefa.status)}
                        </h4>
                        {tarefa.descricao && (
                          <p className="text-sm text-muted-foreground mt-1">{tarefa.descricao}</p>
                        )}
                        <div className="flex gap-2 mt-2">
                          <Badge className={getCategoriaColor(tarefa.categoria)}>
                            {tarefa.categoria}
                          </Badge>
                          <Badge className={getPrioridadeColor(tarefa.prioridade)}>
                            {tarefa.prioridade}
                          </Badge>
                          <Badge variant="outline">
                            {formatarData(tarefa.dataFim)}
                          </Badge>
                        </div>
                        {tarefa.comentarios && tarefa.comentarios.length > 0 && (
                          <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                            <MessageSquare className="h-4 w-4" />
                            <span>{tarefa.comentarios.length} comentário(s)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Conclusão */}
      <Dialog open={!!tarefaSelecionada} onOpenChange={() => setTarefaSelecionada(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Concluir Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Adicione um comentário sobre a conclusão desta tarefa (opcional):
            </p>
            <Textarea
              placeholder="Ex: Fiz 50 questões de Biologia e acertei 42..."
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={4}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setTarefaSelecionada(null)}>
                Cancelar
              </Button>
              <Button onClick={() => tarefaSelecionada && concluirTarefa(tarefaSelecionada.id)}>
                Concluir Tarefa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
