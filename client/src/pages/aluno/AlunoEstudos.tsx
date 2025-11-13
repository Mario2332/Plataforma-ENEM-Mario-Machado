import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAlunoApi } from "@/hooks/useAlunoApi";
import { BookOpen, Clock, Edit, Play, Plus, Trash2, Pause, RotateCcw, Save, ArrowUpDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

const CRONOMETRO_STORAGE_KEY = "aluno_cronometro_estado";

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

interface CronometroEstado {
  ativo: boolean;
  tempoInicio: number | null;
  tempoAcumulado: number;
}

type OrdenacaoColuna = "data" | "materia" | "tempo" | "questoes" | "acertos" | null;
type DirecaoOrdenacao = "asc" | "desc";

export default function AlunoEstudos() {
  const api = useAlunoApi();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cronometroAtivo, setCronometroAtivo] = useState(false);
  const [tempoDecorrido, setTempoDecorrido] = useState(0);
  const [estudos, setEstudos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [colunaOrdenacao, setColunaOrdenacao] = useState<OrdenacaoColuna>(null);
  const [direcaoOrdenacao, setDirecaoOrdenacao] = useState<DirecaoOrdenacao>("desc");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [formData, setFormData] = useState({
    data: new Date().toISOString().split("T")[0],
    materia: "",
    conteudo: "",
    tempoMinutos: 0,
    questoesFeitas: 0,
    questoesAcertadas: 0,
    flashcardsRevisados: 0,
  });

  const tempoInicioRef = useRef<number | null>(null);
  const tempoAcumuladoRef = useRef<number>(0);

  // Carregar estado do cronômetro do localStorage
  useEffect(() => {
    const estadoSalvo = localStorage.getItem(CRONOMETRO_STORAGE_KEY);
    if (estadoSalvo) {
      try {
        const estado: CronometroEstado = JSON.parse(estadoSalvo);
        
        tempoInicioRef.current = estado.tempoInicio;
        tempoAcumuladoRef.current = estado.tempoAcumulado;
        
        if (estado.ativo && estado.tempoInicio) {
          setCronometroAtivo(true);
        } else {
          setTempoDecorrido(estado.tempoAcumulado);
          setCronometroAtivo(false);
        }
      } catch (error) {
        console.error("Erro ao carregar estado do cronômetro:", error);
      }
    }
  }, []);

  // Atualizar cronômetro a cada segundo
  useEffect(() => {
    if (cronometroAtivo) {
      intervalRef.current = setInterval(() => {
        if (tempoInicioRef.current) {
          const agora = Date.now();
          const tempoDecorridoAtual = Math.floor((agora - tempoInicioRef.current) / 1000) + tempoAcumuladoRef.current;
          setTempoDecorrido(tempoDecorridoAtual);
        }
      }, 100); // Atualiza a cada 100ms para maior precisão
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [cronometroAtivo]);

  // Salvar estado do cronômetro no localStorage quando mudar
  useEffect(() => {
    if (cronometroAtivo || tempoDecorrido > 0) {
      const estado: CronometroEstado = {
        ativo: cronometroAtivo,
        tempoInicio: tempoInicioRef.current,
        tempoAcumulado: tempoAcumuladoRef.current,
      };
      localStorage.setItem(CRONOMETRO_STORAGE_KEY, JSON.stringify(estado));
    }
  }, [cronometroAtivo, tempoDecorrido]);

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

  useEffect(() => {
    loadEstudos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      
      if (editandoId) {
        // Modo de edição
        // Criar data no timezone local (evita problema de um dia anterior)
        const [ano, mes, dia] = formData.data.split('-').map(Number);
        const dataLocal = new Date(ano, mes - 1, dia, 12, 0, 0); // Meio-dia para evitar problemas de timezone
        
        await api.updateEstudo(editandoId, {
          ...formData,
          data: dataLocal,
        });
        toast.success("Estudo atualizado com sucesso!");
      } else {
        // Modo de criação
        // Criar data no timezone local (evita problema de um dia anterior)
        const [ano, mes, dia] = formData.data.split('-').map(Number);
        const dataLocal = new Date(ano, mes - 1, dia, 12, 0, 0); // Meio-dia para evitar problemas de timezone
        
        await api.createEstudo({
          ...formData,
          data: dataLocal,
        });
        toast.success("Estudo registrado com sucesso!");
      }
      
      setDialogOpen(false);
      setEditandoId(null);
      setFormData({
        data: new Date().toISOString().split("T")[0],
        materia: "",
        conteudo: "",
        tempoMinutos: 0,
        questoesFeitas: 0,
        questoesAcertadas: 0,
        flashcardsRevisados: 0,
      });
      await loadEstudos();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar estudo");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleEdit = (estudo: any) => {
    // Converter data para formato do input
    let dataFormatada: string;
    try {
      let data: Date;
      if (estudo.data?.seconds) {
        data = new Date(estudo.data.seconds * 1000);
      } else if (estudo.data?.toDate) {
        data = estudo.data.toDate();
      } else {
        data = new Date(estudo.data);
      }
      dataFormatada = data.toISOString().split('T')[0];
    } catch (error) {
      dataFormatada = new Date().toISOString().split('T')[0];
    }
    
    setFormData({
      data: dataFormatada,
      materia: estudo.materia,
      conteudo: estudo.conteudo || "",
      tempoMinutos: estudo.tempoMinutos,
      questoesFeitas: estudo.questoesFeitas || 0,
      questoesAcertadas: estudo.questoesAcertadas || 0,
      flashcardsRevisados: estudo.flashcardsRevisados || 0,
    });
    setEditandoId(estudo.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este registro?")) {
      try {
        await api.deleteEstudo(id);
        toast.success("Estudo excluído com sucesso!");
        await loadEstudos();
      } catch (error: any) {
        toast.error(error.message || "Erro ao excluir estudo");
      }
    }
  };

  // Funções do cronômetro
  const iniciarCronometro = () => {
    tempoInicioRef.current = Date.now();
    tempoAcumuladoRef.current = tempoDecorrido;
    setCronometroAtivo(true);
  };

  const pausarCronometro = () => {
    tempoAcumuladoRef.current = tempoDecorrido;
    tempoInicioRef.current = null;
    setCronometroAtivo(false);
  };

  const resetarCronometro = () => {
    setCronometroAtivo(false);
    setTempoDecorrido(0);
    tempoInicioRef.current = null;
    tempoAcumuladoRef.current = 0;
    localStorage.removeItem(CRONOMETRO_STORAGE_KEY);
  };

  const salvarCronometro = () => {
    const minutos = Math.floor(tempoDecorrido / 60);
    if (minutos === 0) {
      toast.error("O tempo deve ser maior que zero");
      return;
    }
    
    setFormData({
      ...formData,
      tempoMinutos: minutos,
    });
    setDialogOpen(true);
    resetarCronometro();
  };

  const formatarTempo = (segundos: number) => {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const segs = segundos % 60;
    return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:${String(segs).padStart(2, "0")}`;
  };
  
  // Função para ordenar estudos
  const handleOrdenar = (coluna: OrdenacaoColuna) => {
    if (colunaOrdenacao === coluna) {
      // Inverte a direção se clicar na mesma coluna
      setDirecaoOrdenacao(direcaoOrdenacao === "asc" ? "desc" : "asc");
    } else {
      // Nova coluna, começa com descendente
      setColunaOrdenacao(coluna);
      setDirecaoOrdenacao("desc");
    }
  };
  
  // Estudos ordenados
  const estudosOrdenados = [...estudos].sort((a, b) => {
    if (!colunaOrdenacao) return 0;
    
    let valorA: any;
    let valorB: any;
    
    switch (colunaOrdenacao) {
      case "data":
        // Converter datas para timestamp
        try {
          const dataA = a.data?.seconds || a.data?._seconds ? new Date((a.data.seconds || a.data._seconds) * 1000) : new Date(a.data);
          const dataB = b.data?.seconds || b.data?._seconds ? new Date((b.data.seconds || b.data._seconds) * 1000) : new Date(b.data);
          valorA = dataA.getTime();
          valorB = dataB.getTime();
        } catch {
          return 0;
        }
        break;
      case "materia":
        valorA = a.materia?.toLowerCase() || "";
        valorB = b.materia?.toLowerCase() || "";
        break;
      case "tempo":
        valorA = a.tempoMinutos || 0;
        valorB = b.tempoMinutos || 0;
        break;
      case "questoes":
        valorA = a.questoesFeitas || 0;
        valorB = b.questoesFeitas || 0;
        break;
      case "acertos":
        valorA = a.questoesAcertadas || 0;
        valorB = b.questoesAcertadas || 0;
        break;
      default:
        return 0;
    }
    
    if (valorA < valorB) return direcaoOrdenacao === "asc" ? -1 : 1;
    if (valorA > valorB) return direcaoOrdenacao === "asc" ? 1 : -1;
    return 0;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estudos</h1>
          <p className="text-muted-foreground mt-2">Registre e acompanhe suas sessões de estudo</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Estudo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editandoId ? "Editar Sessão de Estudo" : "Registrar Sessão de Estudo"}</DialogTitle>
              <DialogDescription>
                {editandoId ? "Atualize os detalhes da sua sessão de estudo" : "Preencha os detalhes da sua sessão de estudo"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="data">Data</Label>
                    <Input
                      id="data"
                      type="date"
                      value={formData.data}
                      onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tempoMinutos">Tempo (minutos)</Label>
                    <Input
                      id="tempoMinutos"
                      type="number"
                      min="1"
                      value={formData.tempoMinutos}
                      onChange={(e) => setFormData({ ...formData, tempoMinutos: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="materia">Matéria</Label>
                  <Select
                    value={formData.materia}
                    onValueChange={(value) => setFormData({ ...formData, materia: value })}
                    required
                  >
                    <SelectTrigger id="materia">
                      <SelectValue placeholder="Selecione uma matéria" />
                    </SelectTrigger>
                    <SelectContent>
                      {MATERIAS_ENEM.map((materia) => (
                        <SelectItem key={materia} value={materia}>
                          {materia}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conteudo">Conteúdo Estudado</Label>
                  <Input
                    id="conteudo"
                    value={formData.conteudo}
                    onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                    placeholder="Ex: Funções quadráticas, Análise sintática..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="questoesFeitas">Questões Feitas</Label>
                    <Input
                      id="questoesFeitas"
                      type="number"
                      min="0"
                      value={formData.questoesFeitas}
                      onChange={(e) => setFormData({ ...formData, questoesFeitas: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="questoesAcertadas">Questões Acertadas</Label>
                    <Input
                      id="questoesAcertadas"
                      type="number"
                      min="0"
                      value={formData.questoesAcertadas}
                      onChange={(e) => setFormData({ ...formData, questoesAcertadas: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="flashcardsRevisados">Flashcards Revisados</Label>
                    <Input
                      id="flashcardsRevisados"
                      type="number"
                      min="0"
                      value={formData.flashcardsRevisados}
                      onChange={(e) => setFormData({ ...formData, flashcardsRevisados: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cronômetro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Cronômetro de Estudo
          </CardTitle>
          <CardDescription>
            Inicie o cronômetro para registrar o tempo de estudo em tempo real
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-6">
            <div className="text-6xl font-mono font-bold tabular-nums">
              {formatarTempo(tempoDecorrido)}
            </div>
            <div className="flex gap-3">
              {!cronometroAtivo ? (
                <Button onClick={iniciarCronometro} size="lg">
                  <Play className="h-5 w-5 mr-2" />
                  Iniciar
                </Button>
              ) : (
                <Button onClick={pausarCronometro} size="lg" variant="secondary">
                  <Pause className="h-5 w-5 mr-2" />
                  Pausar
                </Button>
              )}
              <Button onClick={resetarCronometro} size="lg" variant="outline">
                <RotateCcw className="h-5 w-5 mr-2" />
                Resetar
              </Button>
              <Button 
                onClick={salvarCronometro} 
                size="lg" 
                variant="default"
                disabled={tempoDecorrido === 0}
              >
                <Save className="h-5 w-5 mr-2" />
                Salvar Sessão
              </Button>
            </div>
            {cronometroAtivo && (
              <p className="text-sm text-muted-foreground">
                ⏱️ Cronômetro ativo - Continue estudando! O tempo será salvo mesmo se você trocar de aba.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Estudos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Histórico de Estudos
          </CardTitle>
          <CardDescription>Suas sessões de estudo registradas</CardDescription>
        </CardHeader>
        <CardContent>
          {estudos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum estudo registrado ainda</p>
              <p className="text-sm mt-2">Comece registrando sua primeira sessão de estudo!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleOrdenar("data")} className="-ml-3 h-8">
                        Data
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleOrdenar("materia")} className="-ml-3 h-8">
                        Matéria
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Conteúdo</TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleOrdenar("tempo")} className="-ml-3 h-8">
                        Tempo
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleOrdenar("questoes")} className="-ml-3 h-8">
                        Questões
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleOrdenar("acertos")} className="-ml-3 h-8">
                        Acertos
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Flashcards</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estudosOrdenados.map((estudo) => {
                    // Lidar com diferentes formatos de data
                    let dataFormatada = "Data inválida";
                    
                    // LOG DE DIAGNÓSTICO
                    console.log("=== DIAGNÓSTICO DE DATA ===");
                    console.log("Estudo ID:", estudo.id);
                    console.log("Data raw:", estudo.data);
                    console.log("Tipo:", typeof estudo.data);
                    console.log("Tem seconds?", estudo.data?.seconds);
                    console.log("Tem toDate?", typeof estudo.data?.toDate);
                    console.log("É objeto?", estudo.data && typeof estudo.data === 'object');
                    console.log("Keys:", estudo.data && typeof estudo.data === 'object' ? Object.keys(estudo.data) : 'N/A');
                    
                    try {
                      if (estudo.data?.seconds || estudo.data?._seconds) {
                        // Timestamp do Firestore (com ou sem underscore)
                        const seconds = estudo.data.seconds || estudo.data._seconds;
                        const date = new Date(seconds * 1000);
                        console.log("Convertido (seconds):", date);
                        if (!isNaN(date.getTime())) {
                          dataFormatada = date.toLocaleDateString("pt-BR");
                        }
                      } else if (estudo.data?.toDate && typeof estudo.data.toDate === 'function') {
                        // Timestamp do Firestore (método toDate)
                        const date = estudo.data.toDate();
                        console.log("Convertido (toDate):", date);
                        if (!isNaN(date.getTime())) {
                          dataFormatada = date.toLocaleDateString("pt-BR");
                        }
                      } else if (estudo.data) {
                        // String ou Date
                        const date = new Date(estudo.data);
                        console.log("Convertido (new Date):", date);
                        if (!isNaN(date.getTime())) {
                          dataFormatada = date.toLocaleDateString("pt-BR");
                        }
                      }
                    } catch (error) {
                      console.error("Erro ao formatar data:", error);
                    }
                    
                    console.log("Data formatada final:", dataFormatada);
                    console.log("=========================");
                    
                    return (
                    <TableRow key={estudo.id}>
                      <TableCell>{dataFormatada}</TableCell>
                      <TableCell className="font-medium">{estudo.materia}</TableCell>
                      <TableCell>{estudo.conteudo || "-"}</TableCell>
                      <TableCell>{estudo.tempoMinutos} min</TableCell>
                      <TableCell>{estudo.questoesFeitas || 0}</TableCell>
                      <TableCell>{estudo.questoesAcertadas || 0}</TableCell>
                      <TableCell>{estudo.flashcardsRevisados || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(estudo)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(estudo.id)}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
