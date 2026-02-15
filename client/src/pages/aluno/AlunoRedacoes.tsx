import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
// Substituindo useAlunoApi e chamadas diretas ao Firestore por funções do firestore-direct
import { 
  getRedacoesDirect, 
  createRedacaoDirect, 
  updateRedacaoDirect, 
  deleteRedacaoDirect,
  getMetaRedacaoDirect,
  updateMetaRedacaoDirect
} from "@/lib/firestore-direct";
import { Plus, Trash2, Edit2, TrendingUp, Award, FileText, Clock, Target, AlertTriangle, ChevronDown, ChevronUp, PenTool, Zap, Star, Flame } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, Cell, Legend } from "recharts";
import { useMentorViewContext } from "@/contexts/MentorViewContext";
import { useDataService } from "@/hooks/useDataService";
import { useAuthContext } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { Timestamp } from "firebase/firestore";

// Função para formatar data sem problema de fuso horário
// A data vem no formato "YYYY-MM-DD" e deve ser exibida como "DD/MM/YYYY"
const formatarData = (dataString: string, formato: 'completo' | 'curto' = 'completo'): string => {
  if (!dataString) return '';
  const [ano, mes, dia] = dataString.split('-');
  if (formato === 'curto') {
    return `${dia}/${mes}`;
  }
  return `${dia}/${mes}/${ano}`;
};

// Valores fixos das notas do ENEM por competência
const NOTAS_COMPETENCIA = [0, 40, 80, 120, 160, 200];

// Cores para as competências
const CORES_COMPETENCIAS = {
  c1: "#3b82f6", // blue
  c2: "#10b981", // green
  c3: "#f59e0b", // amber
  c4: "#8b5cf6", // purple
  c5: "#ef4444", // red
};

// Nomes das competências
const NOMES_COMPETENCIAS = {
  c1: "C1 - Norma Culta",
  c2: "C2 - Tema/Estrutura",
  c3: "C3 - Argumentação",
  c4: "C4 - Coesão",
  c5: "C5 - Proposta",
};

interface Redacao {
  id: string;
  titulo: string;
  data: string;
  tempoHoras: number;
  tempoMinutos: number;
  c1: number;
  c2: number;
  c3: number;
  c4: number;
  c5: number;
  notaTotal: number;
  repertorioIntro?: string;
  repertorioD1?: string;
  repertorioD2?: string;
  criadoEm: Date;
}

interface RedacaoForm {
  titulo: string;
  data: string;
  tempoHoras: string;
  tempoMinutos: string;
  c1: string;
  c2: string;
  c3: string;
  c4: string;
  c5: string;
  repertorioIntro: string;
  repertorioD1: string;
  repertorioD2: string;
}

const initialForm: RedacaoForm = {
  titulo: "",
  data: new Date().toISOString().split('T')[0],
  tempoHoras: "1",
  tempoMinutos: "30",
  c1: "",
  c2: "",
  c3: "",
  c4: "",
  c5: "",
  repertorioIntro: "",
  repertorioD1: "",
  repertorioD2: "",
};

export default function AlunoRedacoes() {
  // USANDO DATA SERVICE para obter o contexto
  const { mentoriaId } = useDataService();
  const { userData } = useAuthContext();
  const { alunoId: mentorViewAlunoId, isMentorView } = useMentorViewContext();

  // Função para obter o ID do aluno efetivo
  const getEffectiveUserId = () => {
    if (isMentorView && mentorViewAlunoId) return mentorViewAlunoId;
    return auth.currentUser?.uid || null;
  };

  const [redacoes, setRedacoes] = useState<Redacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<RedacaoForm>(initialForm);
  const [metaNota, setMetaNota] = useState<number>(900);
  const [metaNotaInput, setMetaNotaInput] = useState<string>("900");
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>("todo");
  const [showHistorico, setShowHistorico] = useState(false);

  // Carregar redações do Firestore
  useEffect(() => {
    loadRedacoes();
    loadMeta();
  }, [mentoriaId]); // Recarregar se mentoriaId mudar

  const loadRedacoes = async () => {
    try {
      setIsLoading(true);
      const userId = getEffectiveUserId();
      if (!userId) return;

      // Usando função direta com mentoriaId
      const redacoesData = await getRedacoesDirect(userId, mentoriaId);
      
      // Mapeando para o formato local (embora getRedacoesDirect já retorne quase pronto, 
      // vamos garantir a tipagem correta das datas)
      const redacoesFormatadas: Redacao[] = redacoesData.map((data: any) => {
        return {
          id: data.id,
          titulo: data.titulo || "",
          data: data.data || "",
          tempoHoras: data.tempoHoras || 0,
          tempoMinutos: data.tempoMinutos || 0,
          c1: data.c1 || 0,
          c2: data.c2 || 0,
          c3: data.c3 || 0,
          c4: data.c4 || 0,
          c5: data.c5 || 0,
          notaTotal: data.notaTotal || 0,
          repertorioIntro: data.repertorioIntro || "",
          repertorioD1: data.repertorioD1 || "",
          repertorioD2: data.repertorioD2 || "",
          criadoEm: data.criadoEm?.toDate ? data.criadoEm.toDate() : new Date(),
        };
      });
      
      setRedacoes(redacoesFormatadas);
    } catch (error) {
      console.error("Erro ao carregar redações:", error);
      toast.error("Erro ao carregar redações");
    } finally {
      setIsLoading(false);
    }
  };

  const loadMeta = async () => {
    try {
      const userId = getEffectiveUserId();
      if (!userId) return;

      // Usando função direta com mentoriaId
      const meta = await getMetaRedacaoDirect(userId, mentoriaId);
      setMetaNota(meta);
      setMetaNotaInput(meta.toString());
    } catch (error) {
      console.error("Erro ao carregar meta:", error);
    }
  };

  const saveMeta = async (novaMeta: number) => {
    try {
      const userId = getEffectiveUserId();
      if (!userId) return;

      // Usando função direta com mentoriaId
      await updateMetaRedacaoDirect(userId, novaMeta, mentoriaId);
      setMetaNota(novaMeta);
      setMetaNotaInput(novaMeta.toString());
      toast.success("Meta atualizada!");
    } catch (error) {
      console.error("Erro ao salvar meta:", error);
      toast.error("Erro ao salvar meta");
    }
  };

  const calcularNotaTotal = (c1: number, c2: number, c3: number, c4: number, c5: number) => {
    return c1 + c2 + c3 + c4 + c5;
  };

  const handleSubmit = async () => {
    // Validações
    if (!form.titulo.trim()) {
      toast.error("Informe o título/tema da redação");
      return;
    }
    if (!form.data) {
      toast.error("Informe a data de realização");
      return;
    }
    if (!form.tempoHoras && !form.tempoMinutos) {
      toast.error("Informe o tempo gasto na redação");
      return;
    }
    if (!form.c1 || !form.c2 || !form.c3 || !form.c4 || !form.c5) {
      toast.error("Informe todas as notas por competência");
      return;
    }

    try {
      setIsSaving(true);
      const userId = getEffectiveUserId();
      if (!userId) {
        toast.error("Usuário não identificado");
        return;
      }

      const notaTotal = calcularNotaTotal(
        parseInt(form.c1),
        parseInt(form.c2),
        parseInt(form.c3),
        parseInt(form.c4),
        parseInt(form.c5)
      );

      const redacaoData = {
        titulo: form.titulo.trim(),
        data: form.data,
        tempoHoras: parseInt(form.tempoHoras) || 0,
        tempoMinutos: parseInt(form.tempoMinutos) || 0,
        c1: parseInt(form.c1),
        c2: parseInt(form.c2),
        c3: parseInt(form.c3),
        c4: parseInt(form.c4),
        c5: parseInt(form.c5),
        notaTotal,
        repertorioIntro: form.repertorioIntro.trim() || "",
        repertorioD1: form.repertorioD1.trim() || "",
        repertorioD2: form.repertorioD2.trim() || "",
        criadoEm: Timestamp.now(),
      };

      if (editandoId) {
        // Atualizar redação existente usando função direta com mentoriaId
        await updateRedacaoDirect(userId, editandoId, redacaoData, mentoriaId);
        toast.success("Redação atualizada com sucesso!");
      } else {
        // Criar nova redação usando função direta com mentoriaId
        await createRedacaoDirect(userId, redacaoData, mentoriaId);
        toast.success("Redação registrada com sucesso!");
      }

      setForm(initialForm);
      setEditandoId(null);
      setIsDialogOpen(false);
      loadRedacoes();
    } catch (error) {
      console.error("Erro ao salvar redação:", error);
      toast.error("Erro ao salvar redação");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (redacao: Redacao) => {
    setForm({
      titulo: redacao.titulo,
      data: redacao.data,
      tempoHoras: redacao.tempoHoras.toString(),
      tempoMinutos: redacao.tempoMinutos.toString(),
      c1: redacao.c1.toString(),
      c2: redacao.c2.toString(),
      c3: redacao.c3.toString(),
      c4: redacao.c4.toString(),
      c5: redacao.c5.toString(),
      repertorioIntro: redacao.repertorioIntro || "",
      repertorioD1: redacao.repertorioD1 || "",
      repertorioD2: redacao.repertorioD2 || "",
    });
    setEditandoId(redacao.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta redação?")) return;

    try {
      const userId = getEffectiveUserId();
      if (!userId) return;

      // Usando função direta com mentoriaId
      await deleteRedacaoDirect(userId, id, mentoriaId);
      toast.success("Redação excluída com sucesso!");
      loadRedacoes();
    } catch (error) {
      console.error("Erro ao excluir redação:", error);
      toast.error("Erro ao excluir redação");
    }
  };

  // Filtrar redações por período
  const redacoesFiltradas = useMemo(() => {
    if (filtroPeriodo === "todo") return redacoes;
    
    const hoje = new Date();
    const dataLimite = new Date();
    
    if (filtroPeriodo === "mes") {
      dataLimite.setMonth(hoje.getMonth() - 1);
    } else if (filtroPeriodo === "trimestre") {
      dataLimite.setMonth(hoje.getMonth() - 3);
    } else if (filtroPeriodo === "semestre") {
      dataLimite.setMonth(hoje.getMonth() - 6);
    }
    
    return redacoes.filter(r => new Date(r.data) >= dataLimite);
  }, [redacoes, filtroPeriodo]);

  // Dados para o gráfico de evolução
  const dadosGrafico = useMemo(() => {
    return [...redacoesFiltradas]
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
      .map(r => ({
        data: formatarData(r.data, 'curto'),
        nota: r.notaTotal,
        c1: r.c1,
        c2: r.c2,
        c3: r.c3,
        c4: r.c4,
        c5: r.c5,
        titulo: r.titulo
      }));
  }, [redacoesFiltradas]);

  // Médias por competência
  const mediasCompetencias = useMemo(() => {
    if (redacoesFiltradas.length === 0) return [
      { subject: 'C1', A: 0, fullMark: 200 },
      { subject: 'C2', A: 0, fullMark: 200 },
      { subject: 'C3', A: 0, fullMark: 200 },
      { subject: 'C4', A: 0, fullMark: 200 },
      { subject: 'C5', A: 0, fullMark: 200 },
    ];

    const soma = redacoesFiltradas.reduce((acc, curr) => ({
      c1: acc.c1 + curr.c1,
      c2: acc.c2 + curr.c2,
      c3: acc.c3 + curr.c3,
      c4: acc.c4 + curr.c4,
      c5: acc.c5 + curr.c5,
    }), { c1: 0, c2: 0, c3: 0, c4: 0, c5: 0 });

    const qtd = redacoesFiltradas.length;

    return [
      { subject: 'C1', A: Math.round(soma.c1 / qtd), fullMark: 200 },
      { subject: 'C2', A: Math.round(soma.c2 / qtd), fullMark: 200 },
      { subject: 'C3', A: Math.round(soma.c3 / qtd), fullMark: 200 },
      { subject: 'C4', A: Math.round(soma.c4 / qtd), fullMark: 200 },
      { subject: 'C5', A: Math.round(soma.c5 / qtd), fullMark: 200 },
    ];
  }, [redacoesFiltradas]);

  // Média geral
  const mediaGeral = useMemo(() => {
    if (redacoesFiltradas.length === 0) return 0;
    const soma = redacoesFiltradas.reduce((acc, curr) => acc + curr.notaTotal, 0);
    return Math.round(soma / redacoesFiltradas.length);
  }, [redacoesFiltradas]);

  // Melhor nota
  const melhorNota = useMemo(() => {
    if (redacoesFiltradas.length === 0) return 0;
    return Math.max(...redacoesFiltradas.map(r => r.notaTotal));
  }, [redacoesFiltradas]);

  // Tempo médio
  const tempoMedio = useMemo(() => {
    if (redacoesFiltradas.length === 0) return "0h 0min";
    const totalMinutos = redacoesFiltradas.reduce((acc, curr) => acc + (curr.tempoHoras * 60) + curr.tempoMinutos, 0);
    const mediaMinutos = Math.round(totalMinutos / redacoesFiltradas.length);
    const horas = Math.floor(mediaMinutos / 60);
    const minutos = mediaMinutos % 60;
    return `${horas}h ${minutos}min`;
  }, [redacoesFiltradas]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="relative">
          <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-blue-500"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <Zap className="h-8 w-8 text-blue-500 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Minhas Redações</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe sua evolução na escrita e domine as 5 competências.
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setForm(initialForm);
                setEditandoId(null);
              }} className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Redação
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editandoId ? "Editar Redação" : "Registrar Nova Redação"}</DialogTitle>
                <DialogDescription>
                  Preencha os detalhes da sua redação para análise de desempenho.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Tema da Redação</Label>
                  <Input 
                    id="titulo" 
                    placeholder="Ex: Desafios da educação no Brasil" 
                    value={form.titulo}
                    onChange={(e) => setForm({...form, titulo: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="data">Data</Label>
                    <Input 
                      id="data" 
                      type="date" 
                      value={form.data}
                      onChange={(e) => setForm({...form, data: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tempo Gasto</Label>
                    <div className="flex gap-2 items-center">
                      <div className="flex-1 flex items-center gap-1">
                        <Input 
                          type="number" 
                          min="0" 
                          max="5"
                          value={form.tempoHoras}
                          onChange={(e) => setForm({...form, tempoHoras: e.target.value})}
                        />
                        <span className="text-xs text-muted-foreground">h</span>
                      </div>
                      <div className="flex-1 flex items-center gap-1">
                        <Input 
                          type="number" 
                          min="0" 
                          max="59"
                          value={form.tempoMinutos}
                          onChange={(e) => setForm({...form, tempoMinutos: e.target.value})}
                        />
                        <span className="text-xs text-muted-foreground">min</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-medium flex items-center gap-2 text-sm">
                    <Award className="h-4 w-4 text-primary" />
                    Notas por Competência
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(NOMES_COMPETENCIAS).map(([key, label]) => (
                      <div key={key} className="space-y-1">
                        <Label htmlFor={key} className="text-xs">{label}</Label>
                        <Select 
                          value={form[key as keyof RedacaoForm] as string} 
                          onValueChange={(value) => setForm({...form, [key]: value})}
                        >
                          <SelectTrigger id={key}>
                            <SelectValue placeholder="Nota" />
                          </SelectTrigger>
                          <SelectContent>
                            {NOTAS_COMPETENCIA.map((nota) => (
                              <SelectItem key={nota} value={nota.toString()}>
                                {nota} pontos
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="font-semibold">Nota Total:</span>
                    <span className="text-xl font-bold text-primary">
                      {calcularNotaTotal(
                        parseInt(form.c1) || 0,
                        parseInt(form.c2) || 0,
                        parseInt(form.c3) || 0,
                        parseInt(form.c4) || 0,
                        parseInt(form.c5) || 0
                      )}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-medium flex items-center gap-2 text-sm">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Repertórios Utilizados (Opcional)
                  </h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="repertorioIntro" className="text-xs">Introdução</Label>
                    <Input 
                      id="repertorioIntro" 
                      placeholder="Ex: Citação de Bauman, Filme Coringa..." 
                      value={form.repertorioIntro}
                      onChange={(e) => setForm({...form, repertorioIntro: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="repertorioD1" className="text-xs">Desenvolvimento 1</Label>
                    <Input 
                      id="repertorioD1" 
                      placeholder="Ex: Constituição Federal, Dados do IBGE..." 
                      value={form.repertorioD1}
                      onChange={(e) => setForm({...form, repertorioD1: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="repertorioD2" className="text-xs">Desenvolvimento 2</Label>
                    <Input 
                      id="repertorioD2" 
                      placeholder="Ex: Alusão histórica, Obra literária..." 
                      value={form.repertorioD2}
                      onChange={(e) => setForm({...form, repertorioD2: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={isSaving}>
                  {isSaving ? "Salvando..." : (editandoId ? "Salvar Alterações" : "Registrar Redação")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média Geral</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mediaGeral}</div>
            <p className="text-xs text-muted-foreground">
              Baseado em {redacoesFiltradas.length} redações
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Melhor Nota</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{melhorNota}</div>
            <p className="text-xs text-muted-foreground">
              Recorde pessoal
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tempoMedio}</div>
            <p className="text-xs text-muted-foreground">
              Por redação
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meta de Nota</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input 
                className="h-8 w-20 text-lg font-bold p-1" 
                value={metaNotaInput}
                onChange={(e) => setMetaNotaInput(e.target.value)}
                onBlur={() => {
                  const val = parseInt(metaNotaInput);
                  if (!isNaN(val) && val >= 0 && val <= 1000) {
                    saveMeta(val);
                  } else {
                    setMetaNotaInput(metaNota.toString());
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
              />
              <span className="text-xs text-muted-foreground">pontos</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {mediaGeral >= metaNota ? "Meta alcançada! 🎉" : `Faltam ${metaNota - mediaGeral} pontos`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Evolução das Notas</CardTitle>
                <CardDescription>Acompanhe seu progresso ao longo do tempo</CardDescription>
              </div>
              <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">Todo o período</SelectItem>
                  <SelectItem value="semestre">Últimos 6 meses</SelectItem>
                  <SelectItem value="trimestre">Últimos 3 meses</SelectItem>
                  <SelectItem value="mes">Último mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dadosGrafico} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="data" className="text-xs" tick={{ fill: 'currentColor' }} />
                  <YAxis domain={[0, 1000]} className="text-xs" tick={{ fill: 'currentColor' }} />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.5rem' 
                    }} 
                  />
                  <ReferenceLine y={metaNota} stroke="hsl(var(--primary))" strokeDasharray="3 3" label={{ value: 'Meta', position: 'right', fill: 'hsl(var(--primary))' }} />
                  <Line 
                    type="monotone" 
                    dataKey="nota" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2} 
                    activeDot={{ r: 8 }} 
                    name="Nota Total"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Desempenho por Competência</CardTitle>
            <CardDescription>Média de pontos em cada competência</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={mediasCompetencias}>
                  <PolarGrid className="stroke-muted" />
                  <PolarAngleAxis dataKey="subject" className="text-xs font-bold" tick={{ fill: 'currentColor' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 200]} className="text-xs" tick={{ fill: 'currentColor' }} />
                  <Radar
                    name="Média"
                    dataKey="A"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                  />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.5rem' 
                    }} 
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Análise Detalhada</CardTitle>
            <CardDescription>Comparativo entre competências</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mediasCompetencias} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
                  <XAxis type="number" domain={[0, 200]} className="text-xs" tick={{ fill: 'currentColor' }} />
                  <YAxis dataKey="subject" type="category" className="text-xs font-bold" tick={{ fill: 'currentColor' }} />
                  <RechartsTooltip 
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.5rem' 
                    }} 
                  />
                  <Bar dataKey="A" name="Média" radius={[0, 4, 4, 0]}>
                    {mediasCompetencias.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={Object.values(CORES_COMPETENCIAS)[index]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Histórico Detalhado */}
      <Card>
        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setShowHistorico(!showHistorico)}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Histórico de Redações</CardTitle>
              <CardDescription>Lista completa de todas as redações registradas</CardDescription>
            </div>
            {showHistorico ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </CardHeader>
        {showHistorico && (
          <CardContent>
            <div className="space-y-4">
              {redacoesFiltradas.map((redacao) => (
                <div key={redacao.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border rounded-lg hover:bg-muted/30 transition-colors gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{redacao.titulo}</h3>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {formatarData(redacao.data)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {redacao.tempoHoras}h {redacao.tempoMinutos}min
                      </span>
                      <span className="flex items-center gap-1">
                        <Award className="h-3 w-3" />
                        Nota: <span className="font-bold text-primary">{redacao.notaTotal}</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="grid grid-cols-5 gap-1 flex-1 md:flex-none">
                      <div className="flex flex-col items-center p-1 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-900/30">
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">C1</span>
                        <span className="text-xs font-medium">{redacao.c1}</span>
                      </div>
                      <div className="flex flex-col items-center p-1 bg-green-50 dark:bg-green-900/20 rounded border border-green-100 dark:border-green-900/30">
                        <span className="text-[10px] text-green-600 dark:text-green-400 font-bold">C2</span>
                        <span className="text-xs font-medium">{redacao.c2}</span>
                      </div>
                      <div className="flex flex-col items-center p-1 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-100 dark:border-amber-900/30">
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">C3</span>
                        <span className="text-xs font-medium">{redacao.c3}</span>
                      </div>
                      <div className="flex flex-col items-center p-1 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-100 dark:border-purple-900/30">
                        <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">C4</span>
                        <span className="text-xs font-medium">{redacao.c4}</span>
                      </div>
                      <div className="flex flex-col items-center p-1 bg-red-50 dark:bg-red-900/20 rounded border border-red-100 dark:border-red-900/30">
                        <span className="text-[10px] text-red-600 dark:text-red-400 font-bold">C5</span>
                        <span className="text-xs font-medium">{redacao.c5}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(redacao)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(redacao.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
