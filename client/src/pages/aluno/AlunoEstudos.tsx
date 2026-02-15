import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// Substituindo useAlunoApi por funções diretas atualizadas para multi-tenant
import { 
  getEstudosDirect, 
  createEstudoDirect, 
  updateEstudoDirect, 
  deleteEstudoDirect 
} from "@/lib/firestore-direct";
import { BookOpen, Clock, Edit, Play, Plus, Trash2, Pause, RotateCcw, Save, ArrowUpDown, Zap, Timer, CheckCircle2, Target, Maximize2, X, AlertCircle } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useTimer } from "@/contexts/TimerContext";
import { DailySummary } from "@/components/aluno/DailySummary";
import { StudyHistoryChart } from "@/components/aluno/StudyHistoryChart";
import { useLocation } from "wouter";
import { useDataService } from "@/hooks/useDataService";
import { useAuthContext } from "@/contexts/AuthContext";
import { useMentorViewContext } from "@/contexts/MentorViewContext";
import { auth } from "@/lib/firebase";

const CRONOMETRO_STORAGE_KEY = "aluno_cronometro_estado";

// Matérias e atividades padronizadas do ENEM
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

interface CronometroEstado {
  ativo: boolean;
  tempoInicio: number | null;
  tempoAcumulado: number;
}

type OrdenacaoColuna = "data" | "materia" | "tempo" | "questoes" | "acertos" | null;
type DirecaoOrdenacao = "asc" | "desc";

// Função auxiliar para parsear datas de forma segura (exportada para uso em componentes filhos)
export const parseDataSegura = (data: any): Date => {
  if (!data) return new Date();
  
  try {
    if (data.seconds || data._seconds) {
      const seconds = data.seconds || data._seconds;
      return new Date(seconds * 1000);
    } 
    
    if (data.toDate && typeof data.toDate === 'function') {
      return data.toDate();
    }
    
    const parsed = new Date(data);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    
    return new Date();
  } catch (error) {
    console.error("Erro ao parsear data:", error);
    return new Date();
  }
};

export default function AlunoEstudos() {
  // USANDO DATA SERVICE para obter o contexto
  const { mentoriaId } = useDataService();
  const { userData } = useAuthContext();
  const { alunoId: mentorViewAlunoId, isMentorView } = useMentorViewContext();

  // Função para obter o ID do aluno efetivo
  const getEffectiveUserId = () => {
    if (isMentorView && mentorViewAlunoId) return mentorViewAlunoId;
    return auth.currentUser?.uid || null;
  };

  const { 
    ativo: cronometroAtivo, 
    tempoDecorrido, 
    iniciar: iniciarCronometroGlobal, 
    pausar: pausarCronometroGlobal, 
    parar: resetarCronometroGlobal,
    definirMeta: definirMetaGlobal,
    tempoMeta: tempoMetaGlobal,
    modoFoco: modoFocoGlobal,
    alternarModoFoco: toggleModoFocoGlobal
  } = useTimer();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [estudos, setEstudos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [colunaOrdenacao, setColunaOrdenacao] = useState<OrdenacaoColuna>(null);
  const [direcaoOrdenacao, setDirecaoOrdenacao] = useState<DirecaoOrdenacao>("desc");
  
  const [dialogTempoOpen, setDialogTempoOpen] = useState(false);
  const [horasMeta, setHorasMeta] = useState("0");
  const [minutosMeta, setMinutosMeta] = useState("30");
  
  const [location, setLocation] = useLocation();

  // Verifica se deve abrir o modal de salvar via URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'save') {
      salvarCronometro();
      // Limpa o parâmetro da URL sem recarregar a página
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [location]);

  const [formData, setFormData] = useState({
    data: new Date().toISOString().split("T")[0],
    materia: "",
    conteudo: "",
    tempoMinutos: 0,
    questoesFeitas: 0,
    questoesAcertadas: 0,
    flashcardsRevisados: 0,
  });

  const loadEstudos = async () => {
    try {
      setIsLoading(true);
      const userId = getEffectiveUserId();
      if (!userId) return;

      // Usando função direta com suporte a multi-tenant
      const data = await getEstudosDirect(userId, mentoriaId);
      setEstudos(data as any[]);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar estudos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEstudos();
  }, [mentoriaId]); // Recarregar se mentoriaId mudar

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const userId = getEffectiveUserId();
      if (!userId) throw new Error("Usuário não identificado");
      
      if (editandoId) {
        const [ano, mes, dia] = formData.data.split('-').map(Number);
        const dataLocal = new Date(ano, mes - 1, dia, 12, 0, 0);
        
        const { data: _, ...restFormData } = formData;
        
        // Usando updateEstudoDirect com mentoriaId
        await updateEstudoDirect(userId, editandoId, {
          ...restFormData,
          data: dataLocal,
        } as any, mentoriaId);
        
        toast.success("Estudo atualizado com sucesso!");
      } else {
        const [ano, mes, dia] = formData.data.split('-').map(Number);
        const dataLocal = new Date(ano, mes - 1, dia, 12, 0, 0);
        
        const { data: _, ...restFormData } = formData;
        
        // Usando createEstudoDirect com mentoriaId
        await createEstudoDirect(userId, {
          ...restFormData,
          data: dataLocal,
        } as any, mentoriaId);
        
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
      // Resetar o cronômetro após salvar a sessão
      resetarCronometroGlobal();
      // Recarregar estudos
      try {
        await loadEstudos();
      } catch (error) {
        console.error('Erro ao carregar estudos:', error);
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar estudo");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleEdit = (estudo: any) => {
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
        const userId = getEffectiveUserId();
        if (!userId) throw new Error("Usuário não identificado");

        // Usando deleteEstudoDirect com mentoriaId
        await deleteEstudoDirect(userId, id, mentoriaId);
        
        toast.success("Estudo excluído com sucesso!");
        await loadEstudos();
      } catch (error: any) {
        toast.error(error.message || "Erro ao excluir estudo");
      }
    }
  };

  const iniciarCronometro = () => {
    iniciarCronometroGlobal();
  };

  const pausarCronometro = () => {
    pausarCronometroGlobal();
  };

  const resetarCronometro = () => {
    resetarCronometroGlobal();
  };

  const salvarCronometro = () => {
    if (tempoDecorrido === 0) {
      toast.error("O cronômetro está zerado");
      return;
    }

    // Arredonda para cima ou garante no mínimo 1 minuto se houver algum tempo decorrido
    const minutos = Math.max(1, Math.round(tempoDecorrido / 60));
    
    setFormData({
      ...formData,
      tempoMinutos: minutos,
    });
    setDialogOpen(true);
    // Não reseta automaticamente ao abrir o modal, espera o usuário salvar ou cancelar
    // resetarCronometroGlobal(); 
  };

  const formatarTempo = (segundos: number) => {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const segs = segundos % 60;
    return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:${String(segs).padStart(2, "0")}`;
  };
  
  const definirTempoMeta = () => {
    const horas = parseInt(horasMeta) || 0;
    const minutos = parseInt(minutosMeta) || 0;
    const totalSegundos = (horas * 3600) + (minutos * 60);
    
    if (totalSegundos === 0) {
      toast.error("Defina um tempo válido");
      return;
    }
    
    definirMetaGlobal(totalSegundos);
    setDialogTempoOpen(false);
    toast.success(`Meta de tempo definida: ${horas}h ${minutos}min`);
  };
  
  const removerTempoMeta = () => {
    definirMetaGlobal(null);
    toast.info("Meta de tempo removida");
  };
  
  const ativarModoFoco = () => {
    toggleModoFocoGlobal();
  };
  
  const desativarModoFoco = () => {
    toggleModoFocoGlobal();
  };
  
  const tempoRestante = tempoMetaGlobal ? Math.max(0, tempoMetaGlobal - tempoDecorrido) : 0;
  const progressoPercentual = tempoMetaGlobal ? Math.min(100, (tempoDecorrido / tempoMetaGlobal) * 100) : 0;
  
  const handleOrdenar = (coluna: OrdenacaoColuna) => {
    if (colunaOrdenacao === coluna) {
      setDirecaoOrdenacao(direcaoOrdenacao === "asc" ? "desc" : "asc");
    } else {
      setColunaOrdenacao(coluna);
      setDirecaoOrdenacao("desc");
    }
  };
  
  // useMemo para evitar re-ordenação desnecessária a cada atualização do cronômetro
  const estudosOrdenados = useMemo(() => {
    return [...estudos].sort((a, b) => {
      if (!colunaOrdenacao) return 0;
      
      let valorA: any;
      let valorB: any;
      
      switch (colunaOrdenacao) {
        case "data":
          try {
            const dataA = a.data?.seconds || a.data?._seconds ? new Date((a.data.seconds || a.data._seconds) * 1000) : new Date(a.data);
            const dataB = b.data?.seconds || b.data?._seconds ? new Date((b.data.seconds || b.data._seconds) * 1000) : new Date(b.data);
            valorA = dataA.getTime();
            valorB = dataB.getTime();
          } catch (e) {
            valorA = 0;
            valorB = 0;
          }
          break;
        case "materia":
          valorA = a.materia || "";
          valorB = b.materia || "";
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
  }, [estudos, colunaOrdenacao, direcaoOrdenacao]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meus Estudos</h1>
          <p className="text-muted-foreground mt-1">
            Registre e acompanhe seu tempo de estudo e resolução de questões.
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Registrar Estudo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editandoId ? "Editar Estudo" : "Registrar Novo Estudo"}</DialogTitle>
                <DialogDescription>
                  Preencha os detalhes do seu estudo para acompanhar seu progresso.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
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
                    <Label htmlFor="tempo">Tempo (minutos)</Label>
                    <Input
                      id="tempo"
                      type="number"
                      min="0"
                      value={formData.tempoMinutos}
                      onChange={(e) => setFormData({ ...formData, tempoMinutos: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="materia">Matéria / Atividade</Label>
                  <Select
                    value={formData.materia}
                    onValueChange={(value) => setFormData({ ...formData, materia: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a matéria" />
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
                    placeholder="Ex: Logaritmos, Revolução Francesa..."
                    value={formData.conteudo}
                    onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="questoes">Questões Feitas</Label>
                    <Input
                      id="questoes"
                      type="number"
                      min="0"
                      value={formData.questoesFeitas}
                      onChange={(e) => setFormData({ ...formData, questoesFeitas: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="acertos">Acertos</Label>
                    <Input
                      id="acertos"
                      type="number"
                      min="0"
                      max={formData.questoesFeitas}
                      value={formData.questoesAcertadas}
                      onChange={(e) => setFormData({ ...formData, questoesAcertadas: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="flashcards">Flashcards Revisados (Opcional)</Label>
                  <Input
                    id="flashcards"
                    type="number"
                    min="0"
                    value={formData.flashcardsRevisados}
                    onChange={(e) => setFormData({ ...formData, flashcardsRevisados: parseInt(e.target.value) || 0 })}
                  />
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
      </div>

      {/* Cronômetro */}
      <Card className={`border-2 transition-all duration-300 ${cronometroAtivo ? 'border-primary shadow-lg shadow-primary/10' : ''} ${modoFocoGlobal ? 'fixed inset-0 z-50 rounded-none flex flex-col justify-center items-center bg-background/95 backdrop-blur-sm border-0' : ''}`}>
        <CardHeader className={modoFocoGlobal ? 'text-center' : ''}>
          <div className="flex items-center justify-between">
            <div className={modoFocoGlobal ? 'w-full flex flex-col items-center' : ''}>
              <CardTitle className={`flex items-center gap-2 ${modoFocoGlobal ? 'text-4xl mb-4' : ''}`}>
                <Timer className={modoFocoGlobal ? 'h-10 w-10 text-primary' : 'h-5 w-5 text-primary'} />
                Cronômetro de Estudos
              </CardTitle>
              <CardDescription className={modoFocoGlobal ? 'text-xl' : ''}>
                {cronometroAtivo ? "Sessão em andamento..." : "Inicie uma sessão de estudos"}
              </CardDescription>
            </div>
            
            {!modoFocoGlobal && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setDialogTempoOpen(true)} className="gap-1">
                  <Target className="h-3 w-3" />
                  {tempoMetaGlobal ? "Editar Meta" : "Definir Meta"}
                </Button>
                <Button variant="ghost" size="icon" onClick={ativarModoFoco} title="Modo Foco">
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className={`flex flex-col items-center justify-center space-y-6 ${modoFocoGlobal ? 'scale-125' : ''}`}>
            <div className="relative">
              {/* Círculo de progresso (visual) */}
              <div className="w-64 h-64 rounded-full border-8 border-muted flex items-center justify-center relative">
                {tempoMetaGlobal && (
                  <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-primary transition-all duration-1000 ease-linear"
                      strokeDasharray="289.02652413026095"
                      strokeDashoffset={289.02652413026095 - (progressoPercentual / 100) * 289.02652413026095}
                    />
                  </svg>
                )}
                
                <div className="text-center z-10">
                  <div className="text-6xl font-bold tabular-nums tracking-tight">
                    {formatarTempo(tempoDecorrido)}
                  </div>
                  {tempoMetaGlobal && (
                    <div className="text-sm text-muted-foreground mt-2 font-medium">
                      Meta: {formatarTempo(tempoMetaGlobal)}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Indicador de status pulsante */}
              {cronometroAtivo && (
                <div className="absolute top-0 right-0">
                  <span className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              {!cronometroAtivo ? (
                <Button size="lg" className="w-32 gap-2 text-lg h-12" onClick={iniciarCronometro}>
                  <Play className="h-5 w-5" /> Iniciar
                </Button>
              ) : (
                <Button size="lg" variant="outline" className="w-32 gap-2 text-lg h-12 border-primary/20 hover:bg-primary/5" onClick={pausarCronometro}>
                  <Pause className="h-5 w-5" /> Pausar
                </Button>
              )}
              
              <Button 
                size="lg" 
                variant={cronometroAtivo ? "default" : "secondary"} 
                className="w-32 gap-2 text-lg h-12" 
                onClick={salvarCronometro}
                disabled={tempoDecorrido === 0}
              >
                <Save className="h-5 w-5" /> Salvar
              </Button>
              
              <Button size="lg" variant="ghost" className="w-12 h-12 p-0 rounded-full" onClick={resetarCronometro} title="Resetar">
                <RotateCcw className="h-5 w-5 text-muted-foreground" />
              </Button>
            </div>
            
            {modoFocoGlobal && (
              <Button variant="ghost" className="mt-8 text-muted-foreground hover:text-foreground" onClick={desativarModoFoco}>
                <X className="h-4 w-4 mr-2" /> Sair do Modo Foco
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resumo Diário e Gráfico */}
      <div className="grid gap-6 md:grid-cols-2">
        <DailySummary estudos={estudos} />
        <StudyHistoryChart estudos={estudos} />
      </div>

      {/* Histórico de Estudos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Histórico de Estudos
          </CardTitle>
          <CardDescription>
            Seus registros mais recentes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando histórico...</div>
          ) : estudos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum estudo registrado ainda. Comece agora!
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleOrdenar("data")}>
                      <div className="flex items-center gap-1">
                        Data
                        {colunaOrdenacao === "data" && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleOrdenar("materia")}>
                      <div className="flex items-center gap-1">
                        Matéria
                        {colunaOrdenacao === "materia" && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </TableHead>
                    <TableHead>Conteúdo</TableHead>
                    <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleOrdenar("tempo")}>
                      <div className="flex items-center justify-end gap-1">
                        Tempo
                        {colunaOrdenacao === "tempo" && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer hover:bg-muted/50" onClick={() => handleOrdenar("questoes")}>
                      <div className="flex items-center justify-center gap-1">
                        Questões
                        {colunaOrdenacao === "questoes" && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer hover:bg-muted/50" onClick={() => handleOrdenar("acertos")}>
                      <div className="flex items-center justify-center gap-1">
                        Acertos
                        {colunaOrdenacao === "acertos" && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estudosOrdenados.map((estudo) => {
                    let dataFormatada = "";
                    try {
                      const data = parseDataSegura(estudo.data);
                      dataFormatada = data.toLocaleDateString();
                    } catch (e) {
                      dataFormatada = "-";
                    }

                    return (
                      <TableRow key={estudo.id}>
                        <TableCell>{dataFormatada}</TableCell>
                        <TableCell className="font-medium">{estudo.materia}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={estudo.conteudo}>
                          {estudo.conteudo || "-"}
                        </TableCell>
                        <TableCell className="text-right">{estudo.tempoMinutos} min</TableCell>
                        <TableCell className="text-center">{estudo.questoesFeitas || 0}</TableCell>
                        <TableCell className="text-center">
                          {estudo.questoesFeitas > 0 ? (
                            <div className="flex flex-col items-center">
                              <span>{estudo.questoesAcertadas || 0}</span>
                              <span className="text-xs text-muted-foreground">
                                ({Math.round(((estudo.questoesAcertadas || 0) / estudo.questoesFeitas) * 100)}%)
                              </span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(estudo)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(estudo.id)}>
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
      
      {/* Dialog de Meta de Tempo */}
      <Dialog open={dialogTempoOpen} onOpenChange={setDialogTempoOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Definir Meta de Tempo</DialogTitle>
            <DialogDescription>
              Estabeleça um objetivo de tempo para esta sessão de estudos.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="horas">Horas</Label>
              <Input
                id="horas"
                type="number"
                min="0"
                max="24"
                value={horasMeta}
                onChange={(e) => setHorasMeta(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minutos">Minutos</Label>
              <Input
                id="minutos"
                type="number"
                min="0"
                max="59"
                value={minutosMeta}
                onChange={(e) => setMinutosMeta(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {tempoMetaGlobal && (
              <Button type="button" variant="destructive" onClick={removerTempoMeta} className="sm:mr-auto">
                Remover Meta
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setDialogTempoOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={definirTempoMeta}>
              Definir Meta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
