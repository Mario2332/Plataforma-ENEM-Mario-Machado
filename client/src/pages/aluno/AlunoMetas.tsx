import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// Substituindo useAlunoApi por funções diretas atualizadas para multi-tenant
import { 
  getMetasDirect, 
  createMetaDirect, 
  updateMetaDirect, 
  deleteMetaDirect,
  checkExpiredMetasDirect
} from "@/lib/firestore-direct";
import { 
  Target, 
  Plus, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Calendar,
  TrendingUp,
  Edit,
  Trash2,
  Flame,
  BookOpen,
  FileText,
  BarChart3,
  Trophy,
  ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import { toDate, timestampToInputDate, formatDateBR, getTodayString, addDays } from "@/utils/dateHelpers";
import { EstatisticasMetasCards } from "@/components/metas/EstatisticasMetasCards";
import { GraficoMetasPorDia } from "@/components/metas/GraficoMetasPorDia";
import { GraficosStatusETipo } from "@/components/metas/GraficosStatusETipo";
import { FiltrosPeriodoGraficos, PeriodoGrafico } from "@/components/metas/FiltrosPeriodoGraficos";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDataService } from "@/hooks/useDataService";
import { useAuthContext } from "@/contexts/AuthContext";
import { useMentorViewContext } from "@/contexts/MentorViewContext";
import { auth } from "@/lib/firebase";

// Tipos de metas
type TipoMeta = 'horas' | 'questoes' | 'simulados' | 'topicos' | 'sequencia' | 'desempenho';
type StatusMeta = 'ativa' | 'concluida' | 'expirada' | 'cancelada';

interface Meta {
  id: string;
  tipo: TipoMeta;
  nome: string;
  descricao?: string;
  valorAlvo: number;
  valorAtual: number;
  unidade: string;
  dataInicio: any;
  dataFim: any;
  status: StatusMeta;
  materia?: string;
  incidencia?: string;
  dataConclusao?: any;
  createdBy?: string;
  repetirDiariamente?: boolean;
  metaPaiId?: string; // ID da meta "template" (para instâncias diárias)
  dataReferencia?: any; // Data específica desta instância (para metas diárias)
}



// Matérias do ENEM
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
];

// Configurações dos tipos de meta
const TIPOS_META = {
  horas: {
    nome: "Horas de Estudo",
    icon: Clock,
    unidade: "horas",
    descricao: "Estudar X horas em um período",
    color: "text-blue-500",
    bgGradient: "from-blue-500/20 to-blue-600/10",
  },
  questoes: {
    nome: "Questões",
    icon: FileText,
    unidade: "questões",
    descricao: "Resolver X questões",
    color: "text-green-500",
    bgGradient: "from-green-500/20 to-green-600/10",
  },
  simulados: {
    nome: "Simulados",
    icon: BookOpen,
    unidade: "simulados",
    descricao: "Fazer X simulados completos",
    color: "text-purple-500",
    bgGradient: "from-purple-500/20 to-purple-600/10",
  },
  topicos: {
    nome: "Tópicos do Cronograma",
    icon: CheckCircle2,
    unidade: "tópicos",
    descricao: "Concluir X tópicos do cronograma",
    color: "text-orange-500",
    bgGradient: "from-orange-500/20 to-orange-600/10",
  },
  sequencia: {
    nome: "Sequência de Dias",
    icon: Flame,
    unidade: "dias",
    descricao: "Estudar X dias consecutivos",
    color: "text-red-500",
    bgGradient: "from-red-500/20 to-red-600/10",
  },
  desempenho: {
    nome: "Desempenho em Simulados",
    icon: Trophy,
    unidade: "acertos",
    descricao: "Acertar X questões em simulados",
    color: "text-yellow-500",
    bgGradient: "from-yellow-500/20 to-yellow-600/10",
  },
};

export default function AlunoMetas() {
  // USANDO DATA SERVICE para obter o contexto
  const { mentoriaId } = useDataService();
  const { userData } = useAuthContext();
  const { alunoId: mentorViewAlunoId, isMentorView } = useMentorViewContext();

  // Função para obter o ID do aluno efetivo
  const getEffectiveUserId = () => {
    if (isMentorView && mentorViewAlunoId) return mentorViewAlunoId;
    return auth.currentUser?.uid || null;
  };

  const [metas, setMetas] = useState<Meta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [metaEditando, setMetaEditando] = useState<Meta | null>(null);

  // Form state
  const [tipo, setTipo] = useState<TipoMeta>('horas');
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valorAlvo, setValorAlvo] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [materia, setMateria] = useState('');
  const [repetirDiariamente, setRepetirDiariamente] = useState(false);
  
  // Filtro de período para gráficos
  const [periodoGraficos, setPeriodoGraficos] = useState<PeriodoGrafico>('30');
  
  // Estados de expansão das seções
  const [metasAtivasExpanded, setMetasAtivasExpanded] = useState(true);
  const [metasConcluidasExpanded, setMetasConcluidasExpanded] = useState(false);
  const [metasNaoAlcancadasExpanded, setMetasNaoAlcancadasExpanded] = useState(false);

  const loadMetas = async () => {
    try {
      setIsLoading(true);
      const userId = getEffectiveUserId();
      if (!userId) return;

      // Verificar metas expiradas usando função direta com mentoriaId
      await checkExpiredMetasDirect(userId, mentoriaId); 
      
      // Carregar metas usando função direta com mentoriaId
      const metasData = await getMetasDirect(userId, mentoriaId);
      setMetas(metasData as Meta[]);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar metas");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMetas();
    
    // Atualizar metas automaticamente a cada 5 segundos para refletir mudanças do backend
    const interval = setInterval(() => {
      const userId = getEffectiveUserId();
      if (!userId) return;

      // Recarregar metas silenciosamente (sem mostrar loading)
      getMetasDirect(userId, mentoriaId).then((metasData) => {
        setMetas(metasData as Meta[]);
      }).catch(() => {
        // Ignorar erros silenciosos
      });
    }, 5000);
    
    return () => clearInterval(interval);
  }, [mentoriaId]); // Recarregar se mentoriaId mudar

  const handleOpenDialog = (meta?: Meta) => {
    if (meta) {
      setIsEditMode(true);
      setMetaEditando(meta);
      setTipo(meta.tipo);
      setNome(meta.nome);
      setDescricao(meta.descricao || '');
      setValorAlvo(meta.valorAlvo.toString());
      setMateria(meta.materia || '');
      setRepetirDiariamente(meta.repetirDiariamente || false);
      setDataInicio(timestampToInputDate(meta.dataInicio));
      setDataFim(timestampToInputDate(meta.dataFim));
    } else {
      setIsEditMode(false);
      setMetaEditando(null);
      resetForm();
      // Definir datas padrão
      setDataInicio(getTodayString());
      setDataFim(addDays(new Date(), 7));
    }
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setTipo('horas');
    setNome('');
    setDescricao('');
    setValorAlvo('');
    setDataInicio('');
    setDataFim('');
    setMateria('');
    setRepetirDiariamente(false);
  };

  const handleSubmit = async () => {
    // Validação
    if (!nome || !valorAlvo || !dataInicio || !dataFim) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const userId = getEffectiveUserId();
      if (!userId) throw new Error("Usuário não identificado");

      const unidade = TIPOS_META[tipo].unidade;
      
      // Converter datas para ISO com horário meio-dia (evita problemas de timezone)
      const dataInicioISO = `${dataInicio}T12:00:00`;
      const dataFimISO = `${dataFim}T12:00:00`;
      
      if (isEditMode && metaEditando) {
        // Usando updateMetaDirect com mentoriaId
        await updateMetaDirect(userId, metaEditando.id, {
          nome,
          descricao,
          valorAlvo: Number(valorAlvo),
          dataInicio: dataInicioISO,
          dataFim: dataFimISO,
          repetirDiariamente: (tipo === 'horas' || tipo === 'questoes' || tipo === 'topicos') ? repetirDiariamente : undefined,
        }, mentoriaId);
        toast.success("Meta atualizada com sucesso!");
      } else {
        // Usando createMetaDirect com mentoriaId
        await createMetaDirect(userId, {
          tipo,
          nome,
          descricao,
          valorAlvo: Number(valorAlvo),
          unidade,
          dataInicio: dataInicioISO,
          dataFim: dataFimISO,
          materia: materia || undefined,
          repetirDiariamente: (tipo === 'horas' || tipo === 'questoes' || tipo === 'topicos') ? repetirDiariamente : undefined,
        }, mentoriaId);
        toast.success("Meta criada com sucesso!");
      }

      setIsDialogOpen(false);
      resetForm();
      loadMetas();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar meta");
    }
  };

  const handleDelete = async (metaId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta meta?")) return;

    try {
      const userId = getEffectiveUserId();
      if (!userId) throw new Error("Usuário não identificado");

      // Usando deleteMetaDirect com mentoriaId
      await deleteMetaDirect(userId, metaId, mentoriaId);
      toast.success("Meta excluída");
      loadMetas();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir meta");
    }
  };

  const handleCancelMeta = async (metaId: string) => {
    try {
      const userId = getEffectiveUserId();
      if (!userId) throw new Error("Usuário não identificado");

      // Usando updateMetaDirect com mentoriaId
      await updateMetaDirect(userId, metaId, {
        status: 'cancelada',
      }, mentoriaId);
      toast.success("Meta cancelada");
      loadMetas();
    } catch (error: any) {
      toast.error(error.message || "Erro ao cancelar meta");
    }
  };

  const getStatusBadge = (meta: Meta) => {
    const now = new Date();
    const dataFim = toDate(meta.dataFim);
    const diasRestantes = Math.ceil((dataFim.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (meta.status === 'concluida') {
      return <Badge className="bg-green-500">Concluída</Badge>;
    }

    if (meta.status === 'expirada') {
      return <Badge variant="secondary">Expirada</Badge>;
    }

    if (meta.status === 'cancelada') {
      return <Badge variant="outline">Cancelada</Badge>;
    }

    if (diasRestantes <= 1) {
      return <Badge variant="destructive">Último dia!</Badge>;
    }

    if (diasRestantes <= 3) {
      return <Badge className="bg-orange-500">3 dias restantes</Badge>;
    }

    if (diasRestantes <= 7) {
      return <Badge className="bg-yellow-500">7 dias restantes</Badge>;
    }

    return <Badge variant="outline">Ativa</Badge>;
  };

  const getProgressColor = (progresso: number) => {
    if (progresso >= 90) return "bg-green-500";
    if (progresso >= 75) return "bg-blue-500";
    if (progresso >= 50) return "bg-yellow-500";
    if (progresso >= 25) return "bg-orange-500";
    return "bg-red-500";
  };

  // Filtrar metas por status
  const metasAtivas = metas.filter(m => m.status === 'ativa');
  const metasConcluidas = metas.filter(m => m.status === 'concluida');
  const metasNaoAlcancadas = metas.filter(m => m.status === 'expirada' || m.status === 'cancelada');

  return (
    <div className="space-y-8 pb-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Minhas Metas</h1>
          <p className="text-muted-foreground mt-1">
            Defina objetivos claros e acompanhe seu progresso rumo à aprovação.
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Meta
        </Button>
      </div>

      {/* Estatísticas Rápidas */}
      <EstatisticasMetasCards metas={metas} />

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-2 md:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Metas Concluídas</CardTitle>
                <CardDescription>Evolução diária de conclusão</CardDescription>
              </div>
              <FiltrosPeriodoGraficos periodo={periodoGraficos} onChange={setPeriodoGraficos} />
            </div>
          </CardHeader>
          <CardContent>
            <GraficoMetasPorDia metas={metas} periodo={periodoGraficos} />
          </CardContent>
        </Card>
        
        <Card className="col-span-2 md:col-span-1">
          <CardHeader>
            <CardTitle>Distribuição de Metas</CardTitle>
            <CardDescription>Por status e tipo</CardDescription>
          </CardHeader>
          <CardContent>
            <GraficosStatusETipo metas={metas} />
          </CardContent>
        </Card>
      </div>

      {/* Metas Ativas */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setMetasAtivasExpanded(!metasAtivasExpanded)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              <CardTitle>Metas Ativas ({metasAtivas.length})</CardTitle>
            </div>
            <ChevronDown className={`h-5 w-5 transition-transform ${metasAtivasExpanded ? 'rotate-180' : ''}`} />
          </div>
        </CardHeader>
        {metasAtivasExpanded && (
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando metas...</div>
            ) : metasAtivas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma meta ativa no momento. Crie uma nova meta para começar!
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {metasAtivas.map((meta) => {
                  const TipoIcon = TIPOS_META[meta.tipo].icon;
                  const progresso = Math.min(100, Math.round((meta.valorAtual / meta.valorAlvo) * 100));
                  
                  return (
                    <Card key={meta.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      <div className={`h-2 w-full bg-gradient-to-r ${TIPOS_META[meta.tipo].bgGradient}`} />
                      <CardContent className="p-4 space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-full bg-muted ${TIPOS_META[meta.tipo].color}`}>
                              <TipoIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <h3 className="font-semibold line-clamp-1" title={meta.nome}>{meta.nome}</h3>
                              <p className="text-xs text-muted-foreground capitalize">{TIPOS_META[meta.tipo].nome}</p>
                            </div>
                          </div>
                          {getStatusBadge(meta)}
                        </div>
                        
                        {meta.descricao && (
                          <p className="text-sm text-muted-foreground line-clamp-2 h-10">
                            {meta.descricao}
                          </p>
                        )}
                        
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Progresso</span>
                            <span className="font-medium">{progresso}%</span>
                          </div>
                          <Progress value={progresso} className="h-2" indicatorClassName={getProgressColor(progresso)} />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>{meta.valorAtual} {meta.unidade}</span>
                            <span>{meta.valorAlvo} {meta.unidade}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Fim: {formatDateBR(meta.dataFim)}</span>
                          </div>
                          
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenDialog(meta)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleCancelMeta(meta.id)}>
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Metas Concluídas */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setMetasConcluidasExpanded(!metasConcluidasExpanded)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <CardTitle>Metas Concluídas ({metasConcluidas.length})</CardTitle>
            </div>
            <ChevronDown className={`h-5 w-5 transition-transform ${metasConcluidasExpanded ? 'rotate-180' : ''}`} />
          </div>
        </CardHeader>
        {metasConcluidasExpanded && (
          <CardContent>
            {metasConcluidas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma meta concluída ainda. Continue se esforçando!
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {metasConcluidas.map((meta) => {
                  const TipoIcon = TIPOS_META[meta.tipo].icon;
                  
                  return (
                    <Card key={meta.id} className="opacity-75 hover:opacity-100 transition-opacity">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30">
                              <TipoIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <h3 className="font-semibold line-clamp-1">{meta.nome}</h3>
                              <p className="text-xs text-muted-foreground">Concluída em {formatDateBR(meta.dataConclusao || meta.dataFim)}</p>
                            </div>
                          </div>
                          <Badge className="bg-green-500">Concluída</Badge>
                        </div>
                        
                        <div className="pt-2 border-t text-xs text-muted-foreground flex justify-between">
                          <span>Alvo: {meta.valorAlvo} {meta.unidade}</span>
                          <span>Realizado: {meta.valorAtual} {meta.unidade}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Metas Não Alcançadas */}
      <Card className="border-l-4 border-l-red-500">
        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setMetasNaoAlcancadasExpanded(!metasNaoAlcancadasExpanded)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <CardTitle>Metas Não Alcançadas ({metasNaoAlcancadas.length})</CardTitle>
            </div>
            <ChevronDown className={`h-5 w-5 transition-transform ${metasNaoAlcancadasExpanded ? 'rotate-180' : ''}`} />
          </div>
        </CardHeader>
        {metasNaoAlcancadasExpanded && (
          <CardContent>
            {metasNaoAlcancadas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma meta perdida. Parabéns!
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {metasNaoAlcancadas.map((meta) => {
                  const TipoIcon = TIPOS_META[meta.tipo].icon;
                  const progresso = Math.min(100, Math.round((meta.valorAtual / meta.valorAlvo) * 100));
                  
                  return (
                    <Card key={meta.id} className="opacity-75 hover:opacity-100 transition-opacity border-red-200 dark:border-red-900/30">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30">
                              <TipoIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <h3 className="font-semibold line-clamp-1">{meta.nome}</h3>
                              <p className="text-xs text-muted-foreground capitalize">{meta.status}</p>
                            </div>
                          </div>
                          {getStatusBadge(meta)}
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Progresso Final</span>
                            <span className="font-medium">{progresso}%</span>
                          </div>
                          <Progress value={progresso} className="h-2" />
                        </div>
                        
                        <div className="flex justify-end pt-2">
                          <Button variant="ghost" size="sm" className="text-destructive h-8" onClick={() => handleDelete(meta.id)}>
                            <Trash2 className="h-3 w-3 mr-2" />
                            Remover
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Dialog de Criação/Edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Editar Meta" : "Nova Meta"}</DialogTitle>
            <DialogDescription>
              Defina objetivos claros para manter o foco nos estudos.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Meta</Label>
                <Select 
                  value={tipo} 
                  onValueChange={(value) => setTipo(value as TipoMeta)}
                  disabled={isEditMode}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPOS_META).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className="h-4 w-4" />
                          <span>{config.nome}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="materia">Matéria (Opcional)</Label>
                <Select value={materia} onValueChange={setMateria}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {MATERIAS_ENEM.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Meta</Label>
              <Input 
                id="nome" 
                placeholder="Ex: Estudar Matemática Básica" 
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição (Opcional)</Label>
              <Textarea 
                id="descricao" 
                placeholder="Detalhes sobre como atingir esta meta..." 
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="alvo">
                Meta de {TIPOS_META[tipo].unidade}
              </Label>
              <div className="flex items-center gap-2">
                <Input 
                  id="alvo" 
                  type="number" 
                  min="1"
                  placeholder="0" 
                  value={valorAlvo}
                  onChange={(e) => setValorAlvo(e.target.value)}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {TIPOS_META[tipo].unidade}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inicio">Data Início</Label>
                <Input 
                  id="inicio" 
                  type="date" 
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fim">Data Fim</Label>
                <Input 
                  id="fim" 
                  type="date" 
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
            </div>

            {(tipo === 'horas' || tipo === 'questoes' || tipo === 'topicos') && (
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox 
                  id="repetir" 
                  checked={repetirDiariamente}
                  onCheckedChange={(checked) => setRepetirDiariamente(!!checked)}
                />
                <Label htmlFor="repetir" className="text-sm font-normal cursor-pointer">
                  Repetir esta meta diariamente até a data fim
                </Label>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {isEditMode ? "Salvar Alterações" : "Criar Meta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
