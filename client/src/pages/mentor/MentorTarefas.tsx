import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { mentorApi } from "@/lib/api";

interface Aluno {
  id: string;
  nome: string;
}

interface Tarefa {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade: string;
  alunoId: string;
  status: string;
  dataInicio: any;
  dataFim: any;
}

export default function MentorTarefas() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState<string>("");
  const [modalAberto, setModalAberto] = useState(false);
  const [tarefaEditando, setTarefaEditando] = useState<Tarefa | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    categoria: "questoes",
    prioridade: "media",
    alunoId: "",
    dataInicio: "",
    dataFim: "",
  });

  useEffect(() => {
    carregarAlunos();
  }, []);

  useEffect(() => {
    if (alunoSelecionado) {
      carregarTarefas();
    }
  }, [alunoSelecionado]);

  const carregarAlunos = async () => {
    try {
      const result = await mentorApi.getAlunos();
      const alunosValidos = (result || []).filter(
        (a: any) => a.mentorId && a.mentorId !== "todos" && a.mentorId !== "avulsa"
      );
      setAlunos(alunosValidos);
    } catch (error: any) {
      console.error("Erro ao carregar alunos:", error);
      toast.error("Erro ao carregar alunos");
    }
  };

  const carregarTarefas = async () => {
    try {
      setLoading(true);
      const result = await mentorApi.getTarefasMentor(alunoSelecionado);
      setTarefas(result || []);
    } catch (error) {
      console.error("Erro ao carregar tarefas:", error);
      toast.error("Erro ao carregar tarefas");
    } finally {
      setLoading(false);
    }
  };

  const abrirModalCriar = () => {
    setTarefaEditando(null);
    setFormData({
      titulo: "",
      descricao: "",
      categoria: "questoes",
      prioridade: "media",
      alunoId: alunoSelecionado,
      dataInicio: new Date().toISOString().split("T")[0],
      dataFim: "",
    });
    setModalAberto(true);
  };

  const abrirModalEditar = (tarefa: Tarefa) => {
    setTarefaEditando(tarefa);
    setFormData({
      titulo: tarefa.titulo,
      descricao: tarefa.descricao,
      categoria: tarefa.categoria,
      prioridade: tarefa.prioridade,
      alunoId: tarefa.alunoId,
      dataInicio: tarefa.dataInicio._seconds
        ? new Date(tarefa.dataInicio._seconds * 1000).toISOString().split("T")[0]
        : "",
      dataFim: tarefa.dataFim._seconds
        ? new Date(tarefa.dataFim._seconds * 1000).toISOString().split("T")[0]
        : "",
    });
    setModalAberto(true);
  };

  const salvarTarefa = async () => {
    if (!formData.titulo || !formData.alunoId || !formData.dataFim) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      if (tarefaEditando) {
        await mentorApi.editarTarefa({
          tarefaId: tarefaEditando.id,
          ...formData,
        });
        toast.success("Tarefa atualizada!");
      } else {
        await mentorApi.criarTarefa(formData);
        toast.success("Tarefa criada!");
      }
      setModalAberto(false);
      carregarTarefas();
    } catch (error) {
      console.error("Erro ao salvar tarefa:", error);
      toast.error("Erro ao salvar tarefa");
    }
  };

  const deletarTarefa = async (tarefaId: string) => {
    if (!confirm("Tem certeza que deseja deletar esta tarefa?")) return;

    try {
      await mentorApi.deletarTarefa(tarefaId);
      toast.success("Tarefa deletada!");
      carregarTarefas();
    } catch (error) {
      console.error("Erro ao deletar tarefa:", error);
      toast.error("Erro ao deletar tarefa");
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

  const getStatusCor = (status: string) => {
    if (status === "concluida") return "bg-green-100 text-green-800";
    if (status === "atrasada") return "bg-red-100 text-red-800";
    return "bg-yellow-100 text-yellow-800";
  };

  const formatarData = (timestamp: any) => {
    if (!timestamp) return "";
    let date: Date;
    if (timestamp._seconds) {
      date = new Date(timestamp._seconds * 1000);
    } else if (timestamp.toDate) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }
    // Adicionar offset de timezone para garantir que a data seja exibida corretamente
    const offset = date.getTimezoneOffset();
    date = new Date(date.getTime() + offset * 60 * 1000);
    return date.toLocaleDateString("pt-BR");
  };

  const tarefasPorStatus = {
    pendentes: tarefas.filter((t) => t.status === "pendente").length,
    concluidas: tarefas.filter((t) => t.status === "concluida").length,
    atrasadas: tarefas.filter((t) => t.status === "atrasada").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestão de Tarefas</h1>
      </div>

      {/* Seletor de Aluno */}
      <Card>
        <CardHeader>
          <CardTitle>Selecione um Aluno</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={alunoSelecionado} onValueChange={setAlunoSelecionado}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha um aluno" />
            </SelectTrigger>
            <SelectContent>
              {alunos.map((aluno) => (
                <SelectItem key={aluno.id} value={aluno.id}>
                  {aluno.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {alunoSelecionado && (
        <>
          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-700">{tarefasPorStatus.pendentes}</div>
                <div className="text-sm text-gray-600">Pendentes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-700">{tarefasPorStatus.concluidas}</div>
                <div className="text-sm text-gray-600">Concluídas</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-700">{tarefasPorStatus.atrasadas}</div>
                <div className="text-sm text-gray-600">Atrasadas</div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Tarefas */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tarefas</CardTitle>
                <Button onClick={abrirModalCriar}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Tarefa
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Carregando...</div>
              ) : tarefas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma tarefa criada ainda
                </div>
              ) : (
                <div className="space-y-3">
                  {tarefas.map((tarefa) => (
                    <div
                      key={tarefa.id}
                      className="p-4 rounded-lg border bg-white hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{tarefa.titulo}</h4>
                            <Badge variant={getPrioridadeCor(tarefa.prioridade)}>
                              {tarefa.prioridade}
                            </Badge>
                            <span className={`text-xs px-2 py-1 rounded ${getStatusCor(tarefa.status)}`}>
                              {tarefa.status}
                            </span>
                          </div>
                          {tarefa.descricao && (
                            <p className="text-sm text-gray-600 mb-2">{tarefa.descricao}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>📚 {getCategoriaLabel(tarefa.categoria)}</span>
                            <span>📅 {formatarData(tarefa.dataInicio)} - {formatarData(tarefa.dataFim)}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => abrirModalEditar(tarefa)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deletarTarefa(tarefa.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Modal de Criar/Editar */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{tarefaEditando ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ex: Fazer 50 questões de Biologia"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Detalhes adicionais..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria *</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(value) => setFormData({ ...formData, categoria: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="questoes">Questões</SelectItem>
                    <SelectItem value="videoaula">Vídeo-aula</SelectItem>
                    <SelectItem value="revisao">Revisão</SelectItem>
                    <SelectItem value="redacao">Redação</SelectItem>
                    <SelectItem value="leitura">Leitura</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Prioridade *</Label>
                <Select
                  value={formData.prioridade}
                  onValueChange={(value) => setFormData({ ...formData, prioridade: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data Início *</Label>
                <Input
                  type="date"
                  value={formData.dataInicio}
                  onChange={(e) => setFormData({ ...formData, dataInicio: e.target.value })}
                />
              </div>

              <div>
                <Label>Data Fim *</Label>
                <Input
                  type="date"
                  value={formData.dataFim}
                  onChange={(e) => setFormData({ ...formData, dataFim: e.target.value })}
                />
              </div>
            </div>

            {!tarefaEditando && (
              <div>
                <Label>Aluno *</Label>
                <Select
                  value={formData.alunoId}
                  onValueChange={(value) => setFormData({ ...formData, alunoId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um aluno" />
                  </SelectTrigger>
                  <SelectContent>
                    {alunos.map((aluno) => (
                      <SelectItem key={aluno.id} value={aluno.id}>
                        {aluno.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setModalAberto(false)}>
                Cancelar
              </Button>
              <Button onClick={salvarTarefa}>
                {tarefaEditando ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
