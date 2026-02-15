import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// Substituindo useAlunoApi por funções diretas atualizadas para multi-tenant
import { 
  getSimuladosDirect, 
  createSimuladoDirect, 
  updateSimuladoDirect, 
  deleteSimuladoDirect 
} from "@/lib/firestore-direct";
import { FileText, Plus, Trash2, TrendingUp, Edit, Zap, BarChart3, Target, Clock, ClipboardList } from "lucide-react";
import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AlunoAutodiagnostico from "./AlunoAutodiagnostico";
import AlunoPlanoAcao from "./AlunoPlanoAcao";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useDataService } from "@/hooks/useDataService";
import { useAuthContext } from "@/contexts/AuthContext";
import { useMentorViewContext } from "@/contexts/MentorViewContext";
import { auth } from "@/lib/firebase";

type AreaFiltro = "total" | "linguagens" | "humanas" | "natureza" | "matematica";
type MetricaFiltro = "acertos" | "tempo";

const DIFICULDADES = [
  { value: "nao_informado", label: "Não informado" },
  { value: "muito_facil", label: "Muito Fácil" },
  { value: "facil", label: "Fácil" },
  { value: "media", label: "Média" },
  { value: "dificil", label: "Difícil" },
  { value: "muito_dificil", label: "Muito Difícil" },
];

const formatarTempo = (minutos: number): string => {
  if (minutos === 0) return "-";
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  if (horas === 0) return `${mins}min`;
  if (mins === 0) return `${horas}h`;
  return `${horas}h${mins}min`;
};

export default function AlunoSimulados() {
  // USANDO DATA SERVICE para obter o contexto
  const { mentoriaId } = useDataService();
  const { userData } = useAuthContext();
  const { alunoId: mentorViewAlunoId, isMentorView } = useMentorViewContext();

  // Função para obter o ID do aluno efetivo
  const getEffectiveUserId = () => {
    if (isMentorView && mentorViewAlunoId) return mentorViewAlunoId;
    return auth.currentUser?.uid || null;
  };

  const [activeTab, setActiveTab] = useState("simulados");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [simulados, setSimulados] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [areaFiltro, setAreaFiltro] = useState<AreaFiltro>("total");
  const [metricaFiltro, setMetricaFiltro] = useState<MetricaFiltro>("acertos");

  const [formData, setFormData] = useState({
    nome: "",
    data: new Date().toISOString().split("T")[0],
    linguagensAcertos: 0,
    linguagensTempo: 0,
    humanasAcertos: 0,
    humanasTempo: 0,
    naturezaAcertos: 0,
    naturezaTempo: 0,
    matematicaAcertos: 0,
    matematicaTempo: 0,
    redacaoNota: 0,
    redacaoTempo: 0,
    dificuldadeDia1: "nao_informado",
    dificuldadeDia2: "nao_informado",
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      data: new Date().toISOString().split("T")[0],
      linguagensAcertos: 0,
      linguagensTempo: 0,
      humanasAcertos: 0,
      humanasTempo: 0,
      naturezaAcertos: 0,
      naturezaTempo: 0,
      matematicaAcertos: 0,
      matematicaTempo: 0,
      redacaoNota: 0,
      redacaoTempo: 0,
      dificuldadeDia1: "nao_informado",
      dificuldadeDia2: "nao_informado",
    });
    setEditandoId(null);
  };

  const loadSimulados = async () => {
    try {
      setIsLoading(true);
      const userId = getEffectiveUserId();
      if (!userId) return;

      // Usando função direta com suporte a multi-tenant
      const data = await getSimuladosDirect(userId, mentoriaId);
      setSimulados(data as any[]);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar simulados");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSimulados();
  }, [mentoriaId]); // Recarregar se mentoriaId mudar

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      toast.error("Nome do simulado é obrigatório");
      return;
    }
    try {
      setIsSaving(true);
      const userId = getEffectiveUserId();
      if (!userId) throw new Error("Usuário não identificado");

      const [ano, mes, dia] = formData.data.split('-').map(Number);
      const dataLocal = new Date(ano, mes - 1, dia, 12, 0, 0);
      
      if (editandoId) {
        // Usando updateSimuladoDirect com mentoriaId
        await updateSimuladoDirect(userId, editandoId, { 
          ...formData, 
          data: dataLocal 
        } as any, mentoriaId);
        toast.success("Simulado atualizado!");
      } else {
        // Usando createSimuladoDirect com mentoriaId
        await createSimuladoDirect(userId, { 
          ...formData, 
          data: dataLocal 
        } as any, mentoriaId);
        toast.success("Simulado registrado!");
      }
      setDialogOpen(false);
      resetForm();
      await loadSimulados();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar simulado");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (simulado: any) => {
    let data: Date;
    try {
      if (simulado.data?.seconds || simulado.data?._seconds) {
        const seconds = simulado.data.seconds || simulado.data._seconds;
        data = new Date(seconds * 1000);
      } else if (simulado.data?.toDate) {
        data = simulado.data.toDate();
      } else {
        data = new Date(simulado.data);
      }
    } catch {
      data = new Date();
    }
    setFormData({
      nome: simulado.nome || "",
      data: data.toISOString().split("T")[0],
      linguagensAcertos: simulado.linguagensAcertos || 0,
      linguagensTempo: simulado.linguagensTempo || 0,
      humanasAcertos: simulado.humanasAcertos || 0,
      humanasTempo: simulado.humanasTempo || 0,
      naturezaAcertos: simulado.naturezaAcertos || 0,
      naturezaTempo: simulado.naturezaTempo || 0,
      matematicaAcertos: simulado.matematicaAcertos || 0,
      matematicaTempo: simulado.matematicaTempo || 0,
      redacaoNota: simulado.redacaoNota || 0,
      redacaoTempo: simulado.redacaoTempo || 0,
      dificuldadeDia1: simulado.dificuldadeDia1 || "nao_informado",
      dificuldadeDia2: simulado.dificuldadeDia2 || "nao_informado",
    });
    setEditandoId(simulado.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este simulado?")) {
      try {
        const userId = getEffectiveUserId();
        if (!userId) throw new Error("Usuário não identificado");

        // Usando deleteSimuladoDirect com mentoriaId
        await deleteSimuladoDirect(userId, id, mentoriaId);
        toast.success("Simulado excluído!");
        await loadSimulados();
      } catch (error: any) {
        toast.error(error.message || "Erro ao excluir simulado");
      }
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) resetForm();
  };

  const prepararDadosGrafico = () => {
    if (!simulados || simulados.length === 0) return [];
    return simulados.map(s => {
      let data: Date;
      try {
        if (s.data?.seconds || s.data?._seconds) {
          const seconds = s.data.seconds || s.data._seconds;
          data = new Date(seconds * 1000);
        } else if (s.data?.toDate) {
          data = s.data.toDate();
        } else {
          data = new Date(s.data);
        }
      } catch {
        return null;
      }
      const dataFormatada = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      let valor: number;
      let label: string;
      if (metricaFiltro === "acertos") {
        switch (areaFiltro) {
          case "linguagens": valor = s.linguagensAcertos || 0; label = "Linguagens"; break;
          case "humanas": valor = s.humanasAcertos || 0; label = "Humanas"; break;
          case "natureza": valor = s.naturezaAcertos || 0; label = "Natureza"; break;
          case "matematica": valor = s.matematicaAcertos || 0; label = "Matemática"; break;
          default: valor = (s.linguagensAcertos || 0) + (s.humanasAcertos || 0) + (s.naturezaAcertos || 0) + (s.matematicaAcertos || 0); label = "Total";
        }
      } else {
        switch (areaFiltro) {
          case "linguagens": valor = s.linguagensTempo || 0; label = "Linguagens"; break;
          case "humanas": valor = s.humanasTempo || 0; label = "Humanas"; break;
          case "natureza": valor = s.naturezaTempo || 0; label = "Natureza"; break;
          case "matematica": valor = s.matematicaTempo || 0; label = "Matemática"; break;
          default: valor = (s.linguagensTempo || 0) + (s.humanasTempo || 0) + (s.naturezaTempo || 0) + (s.matematicaTempo || 0); label = "Total";
        }
      }
      return { data: dataFormatada, [label]: valor, nome: s.nome };
    }).filter(Boolean).reverse();
  };

  const dadosGrafico = prepararDadosGrafico();
  const labelGrafico = areaFiltro === "total" ? "Total" : areaFiltro === "linguagens" ? "Linguagens" : areaFiltro === "humanas" ? "Humanas" : areaFiltro === "natureza" ? "Natureza" : "Matemática";
  const getDificuldadeLabel = (value: string) => DIFICULDADES.find(d => d.value === value)?.label || "Não informado";

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
      {/* Elementos decorativos */}
      <div className="fixed top-20 right-10 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="fixed bottom-20 left-10 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-float-delayed pointer-events-none" />

      {/* Header Premium */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500/20 via-cyan-500/10 to-sky-500/10 p-8 border-2 border-white/20 dark:border-white/10 backdrop-blur-xl shadow-2xl animate-slide-up">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-cyan-500/20 to-transparent rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        <div className="relative">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur-xl opacity-50 animate-pulse-slow" />
              <div className="relative bg-gradient-to-br from-blue-500 via-cyan-500 to-sky-500 p-4 rounded-2xl shadow-2xl">
                <FileText className="h-10 w-10 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400">
                Simulados & Diagnósticos
              </h1>
              <p className="text-lg text-muted-foreground mt-1">
                Acompanhe sua evolução e identifique pontos de melhoria.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px] p-1 bg-muted/50 backdrop-blur-sm rounded-xl">
          <TabsTrigger value="simulados" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm transition-all duration-300">
            <FileText className="h-4 w-4 mr-2" />
            Simulados
          </TabsTrigger>
          <TabsTrigger value="autodiagnostico" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm transition-all duration-300">
            <ClipboardList className="h-4 w-4 mr-2" />
            Autodiagnóstico
          </TabsTrigger>
          <TabsTrigger value="plano-acao" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm transition-all duration-300">
            <Target className="h-4 w-4 mr-2" />
            Plano de Ação
          </TabsTrigger>
        </TabsList>

        <TabsContent value="simulados" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-end">
            <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-blue-500/25 transition-all duration-300 transform hover:-translate-y-0.5">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Simulado
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>{editandoId ? "Editar Simulado" : "Registrar Novo Simulado"}</DialogTitle>
                  <DialogDescription>
                    Preencha os dados do seu simulado para acompanhar seu desempenho.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome do Simulado</Label>
                      <Input
                        id="nome"
                        placeholder="Ex: Simulado ENEM 2023"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        required
                      />
                    </div>
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
                  </div>

                  <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
                    <h4 className="font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      Desempenho por Área
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Linguagens (Acertos)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="45"
                          value={formData.linguagensAcertos}
                          onChange={(e) => setFormData({ ...formData, linguagensAcertos: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tempo (minutos)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.linguagensTempo}
                          onChange={(e) => setFormData({ ...formData, linguagensTempo: parseInt(e.target.value) || 0 })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Humanas (Acertos)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="45"
                          value={formData.humanasAcertos}
                          onChange={(e) => setFormData({ ...formData, humanasAcertos: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tempo (minutos)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.humanasTempo}
                          onChange={(e) => setFormData({ ...formData, humanasTempo: parseInt(e.target.value) || 0 })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Natureza (Acertos)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="45"
                          value={formData.naturezaAcertos}
                          onChange={(e) => setFormData({ ...formData, naturezaAcertos: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tempo (minutos)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.naturezaTempo}
                          onChange={(e) => setFormData({ ...formData, naturezaTempo: parseInt(e.target.value) || 0 })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Matemática (Acertos)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="45"
                          value={formData.matematicaAcertos}
                          onChange={(e) => setFormData({ ...formData, matematicaAcertos: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tempo (minutos)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.matematicaTempo}
                          onChange={(e) => setFormData({ ...formData, matematicaTempo: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
                    <h4 className="font-medium flex items-center gap-2">
                      <Edit className="h-4 w-4 text-purple-500" />
                      Redação
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nota</Label>
                        <Input
                          type="number"
                          min="0"
                          max="1000"
                          step="20"
                          value={formData.redacaoNota}
                          onChange={(e) => setFormData({ ...formData, redacaoNota: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tempo (minutos)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.redacaoTempo}
                          onChange={(e) => setFormData({ ...formData, redacaoTempo: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
                    <h4 className="font-medium flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-orange-500" />
                      Percepção de Dificuldade
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Dia 1 (Ling + Hum + Red)</Label>
                        <Select
                          value={formData.dificuldadeDia1}
                          onValueChange={(value) => setFormData({ ...formData, dificuldadeDia1: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DIFICULDADES.map((d) => (
                              <SelectItem key={d.value} value={d.value}>
                                {d.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Dia 2 (Nat + Mat)</Label>
                        <Select
                          value={formData.dificuldadeDia2}
                          onValueChange={(value) => setFormData({ ...formData, dificuldadeDia2: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DIFICULDADES.map((d) => (
                              <SelectItem key={d.value} value={d.value}>
                                {d.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
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

          {/* Gráfico de Evolução */}
          <Card className="border-2 border-muted/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Evolução de Desempenho
                  </CardTitle>
                  <CardDescription>Acompanhe seu progresso ao longo do tempo</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={areaFiltro} onValueChange={(v) => setAreaFiltro(v as AreaFiltro)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="total">Total</SelectItem>
                      <SelectItem value="linguagens">Linguagens</SelectItem>
                      <SelectItem value="humanas">Humanas</SelectItem>
                      <SelectItem value="natureza">Natureza</SelectItem>
                      <SelectItem value="matematica">Matemática</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={metricaFiltro} onValueChange={(v) => setMetricaFiltro(v as MetricaFiltro)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="acertos">Acertos</SelectItem>
                      <SelectItem value="tempo">Tempo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dadosGrafico}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="data" 
                      className="text-xs text-muted-foreground" 
                      tick={{ fill: 'currentColor' }}
                    />
                    <YAxis 
                      className="text-xs text-muted-foreground" 
                      tick={{ fill: 'currentColor' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey={labelGrafico}
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      animationDuration={1500}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Simulados */}
          <div className="grid gap-4">
            {simulados.map((simulado) => {
              let dataFormatada = "";
              try {
                let data: Date;
                if (simulado.data?.seconds || simulado.data?._seconds) {
                  const seconds = simulado.data.seconds || simulado.data._seconds;
                  data = new Date(seconds * 1000);
                } else if (simulado.data?.toDate) {
                  data = simulado.data.toDate();
                } else {
                  data = new Date(simulado.data);
                }
                dataFormatada = data.toLocaleDateString();
              } catch {
                dataFormatada = "-";
              }

              const totalAcertos = (simulado.linguagensAcertos || 0) + 
                                 (simulado.humanasAcertos || 0) + 
                                 (simulado.naturezaAcertos || 0) + 
                                 (simulado.matematicaAcertos || 0);

              const totalTempo = (simulado.linguagensTempo || 0) + 
                               (simulado.humanasTempo || 0) + 
                               (simulado.naturezaTempo || 0) + 
                               (simulado.matematicaTempo || 0) +
                               (simulado.redacaoTempo || 0);

              return (
                <Card key={simulado.id} className="hover:border-primary/50 transition-all duration-300 group">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                            {simulado.nome}
                          </h3>
                          <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {dataFormatada}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Target className="h-4 w-4" />
                            <span>{totalAcertos} acertos</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatarTempo(totalTempo)}</span>
                          </div>
                          {simulado.redacaoNota > 0 && (
                            <div className="flex items-center gap-1">
                              <Edit className="h-4 w-4" />
                              <span>Redação: {simulado.redacaoNota}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(simulado)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(simulado.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Linguagens</span>
                        <div className="font-medium">{simulado.linguagensAcertos || 0} acertos</div>
                        <div className="text-xs text-muted-foreground">{formatarTempo(simulado.linguagensTempo || 0)}</div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Humanas</span>
                        <div className="font-medium">{simulado.humanasAcertos || 0} acertos</div>
                        <div className="text-xs text-muted-foreground">{formatarTempo(simulado.humanasTempo || 0)}</div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Natureza</span>
                        <div className="font-medium">{simulado.naturezaAcertos || 0} acertos</div>
                        <div className="text-xs text-muted-foreground">{formatarTempo(simulado.naturezaTempo || 0)}</div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Matemática</span>
                        <div className="font-medium">{simulado.matematicaAcertos || 0} acertos</div>
                        <div className="text-xs text-muted-foreground">{formatarTempo(simulado.matematicaTempo || 0)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {simulados.length === 0 && (
              <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border-2 border-dashed border-muted">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Nenhum simulado registrado</p>
                <p className="text-sm mt-1">Registre seu primeiro simulado para acompanhar sua evolução.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="autodiagnostico">
          <ErrorBoundary>
            <AlunoAutodiagnostico />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="plano-acao">
          <ErrorBoundary>
            <AlunoPlanoAcao />
          </ErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}
