import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { mentorApi } from "@/lib/api";
import { Plus, Users, ArrowUpDown, Edit, Trash2, Search, TrendingUp, Eye, FileText, Calendar, Clock, Target, Award, Flame, BookOpen, Trophy, CheckCircle2, XCircle, User, Zap, HelpCircle, Settings } from "lucide-react";
import { DefinirMetasModal } from "@/components/DefinirMetasModal";
import { AnotacoesAluno } from "@/components/mentor/AnotacoesAluno";
import { MetasBadges } from "@/components/mentor/MetasBadges";
import { AlunoCardExpandivel } from "@/components/mentor/AlunoCardExpandivel";
import { ConfigurarCriteriosClassificacao, CRITERIOS_PADRAO, type CriteriosClassificacao } from "@/components/mentor/ConfigurarCriteriosClassificacao";
import { getMetasNaoAtingidas } from "@/services/metasMentor";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuthContext } from "@/contexts/AuthContext";

export default function MentorAlunos() {
  const { userData } = useAuthContext();
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resumoDialogOpen, setResumoDialogOpen] = useState(false);
  const [metasDialogOpen, setMetasDialogOpen] = useState(false);
  const [anotacoesDialogOpen, setAnotacoesDialogOpen] = useState(false);
  const [criteriosDialogOpen, setCriteriosDialogOpen] = useState(false);
  const [criteriosClassificacao, setCriteriosClassificacao] = useState<CriteriosClassificacao>(CRITERIOS_PADRAO);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [metricas, setMetricas] = useState<any[]>([]);
  const [evolucao, setEvolucao] = useState<any[]>([]);
  const [resumoAluno, setResumoAluno] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingResumo, setIsLoadingResumo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroInteligente, setFiltroInteligente] = useState<string>("todos");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [periodoFiltro, setPeriodoFiltro] = useState("todo");
  const [selectedAluno, setSelectedAluno] = useState<any>(null);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    celular: "",
    senha: "",
  });
  const [editFormData, setEditFormData] = useState({
    nome: "",
    email: "",
    celular: "",
    plano: "",
    ativo: true,
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [alunosData, metricasData, evolucaoData] = await Promise.all([
        mentorApi.getAlunos(),
        mentorApi.getAlunosMetricas(),
        mentorApi.getEvolucaoAlunos(),
      ]);
      
      // Carregar metas não atingidas
      const alunosIds = (alunosData as any[]).map(a => a.id);
      const metasNaoAtingidas = await getMetasNaoAtingidas(alunosIds);
      
      // Adicionar metas não atingidas aos dados dos alunos
      const alunosComMetas = (alunosData as any[]).map(aluno => ({
        ...aluno,
        metasNaoAtingidas: metasNaoAtingidas[aluno.id] ? 1 : 0
      }));
      
      setAlunos(alunosComMetas);
      setMetricas(metricasData as any[]);
      setEvolucao(evolucaoData as any[]);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };  useEffect(() => {
    loadAlunos();
    // Carregar critérios salvos do localStorage
    const criteriosSalvos = localStorage.getItem('criteriosClassificacao');
    if (criteriosSalvos) {
      try {
        setCriteriosClassificacao(JSON.parse(criteriosSalvos));
      } catch (e) {
        console.error('Erro ao carregar critérios salvos:', e);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSaving(true);
      await mentorApi.createAluno(formData);
      toast.success("Aluno adicionado!");
      setDialogOpen(false);
      setFormData({
        nome: "",
        email: "",
        celular: "",
        senha: "",
      });
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao adicionar aluno");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleOpenEditDialog = (aluno: any) => {
    setSelectedAluno(aluno);
    setEditFormData({
      nome: aluno.nome || "",
      email: aluno.email || "",
      celular: aluno.celular || "",
      plano: aluno.plano || "",
      ativo: aluno.ativo !== false,
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAluno) return;
    
    try {
      setIsSaving(true);
      await mentorApi.updateAluno({
        alunoId: selectedAluno.id,
        ...editFormData,
      });
      toast.success("Aluno atualizado!");
      setEditDialogOpen(false);
      setSelectedAluno(null);
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar aluno");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDeleteDialog = (aluno: any) => {
    setSelectedAluno(aluno);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedAluno) return;
    
    try {
      setIsDeleting(true);
      await mentorApi.deleteAluno(selectedAluno.id);
      toast.success("Aluno excluído!");
      setDeleteDialogOpen(false);
      setSelectedAluno(null);
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir aluno");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenResumoDialog = async (aluno: any) => {
    setSelectedAluno(aluno);
    setResumoDialogOpen(true);
    setIsLoadingResumo(true);
    
    try {
      const resumo = await mentorApi.getAlunoResumo(aluno.id);
      setResumoAluno(resumo);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar resumo do aluno");
    } finally {
      setIsLoadingResumo(false);
    }
  };

  const handleOpenMetasDialog = (aluno: any) => {
    setSelectedAluno(aluno);
    setMetasDialogOpen(true);
  };

  const handleOpenAnotacoesDialog = (aluno: any) => {
    setSelectedAluno(aluno);
    setAnotacoesDialogOpen(true);
  };

  const handleMetaSalva = () => {
    // Recarregar dados para atualizar a coluna de metas não atingidas
    loadData();
  };

  // Formatar data de cadastro
  const formatarDataCadastro = (aluno: any) => {
    if (!aluno.createdAt) return "-";
    
    try {
      let date: Date;
      const timestamp = aluno.createdAt;
      
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp.seconds || timestamp._seconds) {
        const seconds = timestamp.seconds || timestamp._seconds;
        date = new Date(seconds * 1000);
      } else {
        date = new Date(timestamp);
      }
      
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return "-";
    }
  };

  // Filtrar evolução por período
  const evolucaoFiltrada = useMemo(() => {
    if (!evolucao || evolucao.length === 0) return [];
    
    const hoje = new Date();
    let dataLimite: Date;
    
    switch (periodoFiltro) {
      case "7d":
        dataLimite = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        dataLimite = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "3m":
        dataLimite = new Date(hoje.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "6m":
        dataLimite = new Date(hoje.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case "12m":
        dataLimite = new Date(hoje.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case "24m":
        dataLimite = new Date(hoje.getTime() - 730 * 24 * 60 * 60 * 1000);
        break;
      default:
        return evolucao.map(e => ({
          ...e,
          dataFormatada: new Date(e.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        }));
    }
    
    return evolucao
      .filter(e => new Date(e.data) >= dataLimite)
      .map(e => ({
        ...e,
        dataFormatada: new Date(e.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      }));
  }, [evolucao, periodoFiltro]);

  // Função para classificar aluno usando critérios personalizados
  const classificarAluno = (aluno: any): string => {
    const { diasInatividade, desempenho, questoesFeitas, metasNaoAtingidas } = aluno;
    
    // Inativo: sem atividade há X+ dias
    if (diasInatividade >= criteriosClassificacao.inativo.diasInatividade) return "inativo";
    
    // Atenção Urgente: múltiplos problemas
    if (
      diasInatividade >= criteriosClassificacao.urgente.diasInatividade ||
      (questoesFeitas > criteriosClassificacao.urgente.questoesMinimas && desempenho < criteriosClassificacao.urgente.desempenhoMinimo) ||
      metasNaoAtingidas > criteriosClassificacao.urgente.metasNaoAtingidas
    ) {
      return "urgente";
    }
    
    // Precisa Acompanhamento
    if (
      diasInatividade >= criteriosClassificacao.atencao.diasInatividade ||
      (questoesFeitas > criteriosClassificacao.atencao.questoesMinimas && desempenho < criteriosClassificacao.atencao.desempenhoMinimo) ||
      metasNaoAtingidas > criteriosClassificacao.atencao.metasNaoAtingidas
    ) {
      return "atencao";
    }
    
    // Destaque: indo muito bem
    if (
      diasInatividade === criteriosClassificacao.destaque.diasInatividade &&
      desempenho >= criteriosClassificacao.destaque.desempenhoMinimo &&
      questoesFeitas > criteriosClassificacao.destaque.questoesMinimas
    ) {
      return "destaque";
    }
    
    // Indo Bem: padrão
    return "bem";
  };

  // Calcular classificações para todos os alunos
  const alunosComClassificacao = useMemo(() => {
    return alunos.map(aluno => {
      const metrica = metricas.find(m => m.alunoId === aluno.id);
      const alunoComMetricas = {
        ...aluno,
        questoesFeitas: metrica?.questoesFeitas || 0,
        desempenho: metrica?.desempenho || 0,
        horasEstudo: metrica?.horasEstudo || 0,
      };
      return {
        ...alunoComMetricas,
        classificacao: classificarAluno(alunoComMetricas),
      };
    });
  }, [alunos, metricas, criteriosClassificacao]);

  // Contadores de classificação
  const contadoresClassificacao = useMemo(() => {
    return {
      urgente: alunosComClassificacao.filter(a => a.classificacao === "urgente").length,
      atencao: alunosComClassificacao.filter(a => a.classificacao === "atencao").length,
      bem: alunosComClassificacao.filter(a => a.classificacao === "bem").length,
      destaque: alunosComClassificacao.filter(a => a.classificacao === "destaque").length,
      inativo: alunosComClassificacao.filter(a => a.classificacao === "inativo").length,
    };
  }, [alunosComClassificacao]);

  // Filtrar e ordenar alunos com métricas
  const filteredAndSortedAlunos = useMemo(() => {
    let result = [...alunosComClassificacao];
    
    // Filtrar por nome
    if (searchTerm) {
      result = result.filter(aluno => 
        aluno.nome?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtrar por classificação inteligente
    if (filtroInteligente !== "todos") {
      result = result.filter(aluno => aluno.classificacao === filtroInteligente);
    }
    
    // Ordenar
    if (sortColumn) {
      result.sort((a, b) => {
        let aVal = a[sortColumn];
        let bVal = b[sortColumn];
        
        // Tratar valores nulos
        if (aVal === null || aVal === undefined) aVal = sortColumn === 'nome' || sortColumn === 'email' ? "" : 0;
        if (bVal === null || bVal === undefined) bVal = sortColumn === 'nome' || sortColumn === 'email' ? "" : 0;
        
        // Tratar datas
        if (sortColumn === 'createdAt') {
          const getTimestamp = (val: any) => {
            if (!val) return 0;
            if (val.seconds) return val.seconds;
            if (val._seconds) return val._seconds;
            if (val.toDate && typeof val.toDate === 'function') return val.toDate().getTime() / 1000;
            return new Date(val).getTime() / 1000;
          };
          aVal = getTimestamp(aVal);
          bVal = getTimestamp(bVal);
        }
        
        // Comparar
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDirection === 'asc' 
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        
        if (sortDirection === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    }
    
    return result;
  }, [alunosComClassificacao, searchTerm, filtroInteligente, sortColumn, sortDirection]);

  const alunosAtivos = alunos.filter(a => a.ativo !== false).length;

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bem-vindo, {userData?.name}!</h1>
          <p className="text-muted-foreground mt-2">Gerencie e acompanhe seus alunos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Adicionar Aluno</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Aluno</DialogTitle>
              <DialogDescription>Preencha os dados do aluno</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Celular (opcional)</Label>
                  <Input value={formData.celular} onChange={(e) => setFormData({...formData, celular: e.target.value})} placeholder="(00) 00000-0000" />
                </div>
                <div className="space-y-2">
                  <Label>Senha Provisória</Label>
                  <Input type="password" value={formData.senha} onChange={(e) => setFormData({...formData, senha: e.target.value})} required minLength={6} placeholder="Mínimo 6 caracteres" />
                  <p className="text-xs text-muted-foreground">O aluno poderá alterar esta senha após o primeiro acesso</p>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alunos.length}</div>
            <p className="text-xs text-muted-foreground">{alunosAtivos} ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Questões</CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metricas.reduce((acc, m) => acc + (m.questoesFeitas || 0), 0).toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-muted-foreground">Feitas por todos os alunos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média de Desempenho</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(() => {
                const totalQuestoes = metricas.reduce((acc, m) => acc + (m.questoesFeitas || 0), 0);
                const totalAcertos = metricas.reduce((acc, m) => acc + (m.questoesAcertadas || 0), 0);
                return totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : 0;
              })()}%
            </div>
            <p className="text-xs text-muted-foreground">Média ponderada de acertos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Horas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(metricas.reduce((acc, m) => acc + (m.horasEstudo || 0), 0))}h
            </div>
            <p className="text-xs text-muted-foreground">De todos os alunos</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Evolução */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Evolução de Alunos</CardTitle>
              <CardDescription>Crescimento ao longo do tempo</CardDescription>
            </div>
            <Select value={periodoFiltro} onValueChange={setPeriodoFiltro}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="3m">Últimos 3 meses</SelectItem>
                <SelectItem value="6m">Últimos 6 meses</SelectItem>
                <SelectItem value="12m">Últimos 12 meses</SelectItem>
                <SelectItem value="24m">Últimos 24 meses</SelectItem>
                <SelectItem value="todo">Todo período</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {evolucaoFiltrada.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={evolucaoFiltrada}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="dataFormatada" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-background border rounded-lg p-2 shadow-lg">
                          <p className="text-sm font-medium">{payload[0].payload.data}</p>
                          <p className="text-sm text-muted-foreground">
                            Total: {payload[0].value} alunos
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum dado disponível para o período selecionado
            </p>
          )}
        </CardContent>
      </Card>

      {/* Campo de Pesquisa */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar aluno por nome..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filtros Inteligentes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Filtros Inteligentes</CardTitle>
              <CardDescription>Classificação automática baseada em métricas</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCriteriosDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Configurar Critérios
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filtroInteligente === "todos" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroInteligente("todos")}
            >
              Todos ({alunos.length})
            </Button>
            <Button
              variant={filtroInteligente === "urgente" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroInteligente("urgente")}
              className={filtroInteligente === "urgente" ? "" : "border-red-500 text-red-600 hover:bg-red-50"}
            >
              🔴 Atenção Urgente ({contadoresClassificacao.urgente})
            </Button>
            <Button
              variant={filtroInteligente === "atencao" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroInteligente("atencao")}
              className={filtroInteligente === "atencao" ? "" : "border-yellow-500 text-yellow-600 hover:bg-yellow-50"}
            >
              🟡 Precisa Acompanhamento ({contadoresClassificacao.atencao})
            </Button>
            <Button
              variant={filtroInteligente === "bem" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroInteligente("bem")}
              className={filtroInteligente === "bem" ? "" : "border-green-500 text-green-600 hover:bg-green-50"}
            >
              ✅ Indo Bem ({contadoresClassificacao.bem})
            </Button>
            <Button
              variant={filtroInteligente === "destaque" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroInteligente("destaque")}
              className={filtroInteligente === "destaque" ? "" : "border-blue-500 text-blue-600 hover:bg-blue-50"}
            >
              ⭐ Destaque ({contadoresClassificacao.destaque})
            </Button>
            <Button
              variant={filtroInteligente === "inativo" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroInteligente("inativo")}
              className={filtroInteligente === "inativo" ? "" : "border-gray-500 text-gray-600 hover:bg-gray-50"}
            >
              💤 Inativos ({contadoresClassificacao.inativo})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Alunos */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Alunos</CardTitle>
          <CardDescription>Todos os alunos cadastrados com suas métricas</CardDescription>
        </CardHeader>
        <CardContent>
          {alunos && alunos.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('nome')} className="h-8 px-2">
                        Nome
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('createdAt')} className="h-8 px-2">
                        Cadastro
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('metasNaoAtingidas')} className="h-8 px-2">
                        Progresso das Metas
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('questoesFeitas')} className="h-8 px-2">
                        Questões
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('desempenho')} className="h-8 px-2">
                        Desempenho
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('horasEstudo')} className="h-8 px-2">
                        Horas
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('diasInatividade')} className="h-8 px-2">
                        Inatividade
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedAlunos.map((aluno) => (
                    <AlunoCardExpandivel
                      key={aluno.id}
                      aluno={aluno}
                      formatarDataCadastro={formatarDataCadastro}
                      onVerAreaCompleta={(a) => setLocation(`/mentor/alunos/${a.id}`)}
                      onResumo={handleOpenResumoDialog}
                      onMetas={handleOpenMetasDialog}
                      onAnotacoes={handleOpenAnotacoesDialog}
                      onEdit={handleOpenEditDialog}
                      onDelete={handleOpenDeleteDialog}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum aluno cadastrado ainda
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Aluno</DialogTitle>
            <DialogDescription>Atualize os dados do aluno</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input 
                  value={editFormData.nome} 
                  onChange={(e) => setEditFormData({...editFormData, nome: e.target.value})} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email" 
                  value={editFormData.email} 
                  onChange={(e) => setEditFormData({...editFormData, email: e.target.value})} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Celular</Label>
                <Input 
                  value={editFormData.celular} 
                  onChange={(e) => setEditFormData({...editFormData, celular: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Plano</Label>
                <Input 
                  value={editFormData.plano} 
                  onChange={(e) => setEditFormData({...editFormData, plano: e.target.value})} 
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="ativo" 
                  checked={editFormData.ativo}
                  onCheckedChange={(checked) => setEditFormData({...editFormData, ativo: checked as boolean})}
                />
                <label
                  htmlFor="ativo"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Aluno ativo
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O aluno <strong>{selectedAluno?.nome}</strong> será excluído permanentemente, incluindo todos os seus dados de estudos, simulados e métricas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Resumo do Aluno */}
      <Dialog open={resumoDialogOpen} onOpenChange={setResumoDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Resumo do Aluno
            </DialogTitle>
            <DialogDescription>
              Informações detalhadas sobre {selectedAluno?.nome}
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingResumo ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : resumoAluno ? (
            <div className="space-y-6">
              {/* Informações Básicas */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Informações Básicas
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nome:</span>
                    <p className="font-medium">{resumoAluno.nome}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{resumoAluno.email}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Celular:</span>
                    <p className="font-medium">{resumoAluno.celular || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Plano:</span>
                    <p className="font-medium">{resumoAluno.plano || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Data de Cadastro:</span>
                    <p className="font-medium">
                      {resumoAluno.dataCadastro 
                        ? new Date(resumoAluno.dataCadastro).toLocaleDateString('pt-BR')
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <p>
                      <Badge variant={resumoAluno.ativo ? "default" : "secondary"}>
                        {resumoAluno.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Dias de Inatividade:</span>
                    <p>
                      <Badge variant={resumoAluno.diasInatividade === 0 ? "default" : resumoAluno.diasInatividade <= 3 ? "secondary" : "destructive"}>
                        {resumoAluno.diasInatividade === 0 ? 'Ativo hoje' :
                         resumoAluno.diasInatividade === 1 ? '1 dia' :
                         `${resumoAluno.diasInatividade} dias`}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Última Atividade:</span>
                    <p className="font-medium">
                      {resumoAluno.ultimaAtividade 
                        ? new Date(resumoAluno.ultimaAtividade).toLocaleDateString('pt-BR')
                        : "Nenhuma"}
                    </p>
                  </div>
                </div>
                {resumoAluno.perfil && (
                  <div>
                    <span className="text-muted-foreground text-sm">Perfil:</span>
                    <p className="font-medium">{resumoAluno.perfil}</p>
                  </div>
                )}
                {resumoAluno.perfilEstudanteNome && (
                  <div className="mt-2 p-3 bg-primary/5 rounded-lg border">
                    <span className="text-muted-foreground text-sm">Perfil de Estudante (Diagnóstico):</span>
                    <p className="font-semibold text-primary">{resumoAluno.perfilEstudanteNome}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Gamificação e Ranking */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Gamificação e Ranking
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Award className="h-4 w-4" />
                      Nível
                    </div>
                    <p className="text-2xl font-bold">{resumoAluno.nivel || 1}</p>
                    <p className="text-xs text-muted-foreground">
                      {resumoAluno.pontosSemanais ? `${resumoAluno.pontosSemanais} pts/semana` : `${resumoAluno.xp || 0} XP`}
                    </p>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Trophy className="h-4 w-4" />
                      Ranking (Nível {resumoAluno.nivel || 1})
                    </div>
                    <p className="text-2xl font-bold">
                      {resumoAluno.posicaoRanking ? `#${resumoAluno.posicaoRanking}` : '-'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {resumoAluno.totalAlunos ? `de ${resumoAluno.totalAlunos} no nível` : 'sem ranking'}
                    </p>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Flame className="h-4 w-4 text-orange-500" />
                      Sequência
                    </div>
                    <p className="text-2xl font-bold">{resumoAluno.streak}</p>
                    <p className="text-xs text-muted-foreground">dias consecutivos</p>
                  </Card>
                </div>
              </div>

              <Separator />

              {/* Métricas de Estudo */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Métricas de Estudo
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Clock className="h-4 w-4" />
                      Horas de Estudo
                    </div>
                    <p className="text-2xl font-bold">{resumoAluno.horasEstudo}h</p>
                    <p className="text-xs text-muted-foreground">{resumoAluno.totalEstudos} sessões</p>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Target className="h-4 w-4" />
                      Questões
                    </div>
                    <p className="text-2xl font-bold">{resumoAluno.questoesFeitas}</p>
                    <p className="text-xs text-muted-foreground">{resumoAluno.questoesAcertadas} acertadas</p>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <TrendingUp className="h-4 w-4" />
                      Desempenho
                    </div>
                    <p className={`text-2xl font-bold ${
                      resumoAluno.desempenho >= 80 ? 'text-green-600' :
                      resumoAluno.desempenho >= 60 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {resumoAluno.desempenho}%
                    </p>
                    <p className="text-xs text-muted-foreground">em questões</p>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <FileText className="h-4 w-4" />
                      Simulados
                    </div>
                    <p className="text-2xl font-bold">{resumoAluno.totalSimulados}</p>
                    <p className="text-xs text-muted-foreground">média: {resumoAluno.mediaSimulados}%</p>
                  </Card>
                </div>
              </div>

              <Separator />

              {/* Progresso de Conteúdo */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Progresso de Conteúdo
                </h3>
                
                {/* Cronograma Anual de Ciclos */}
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Cronograma Anual de Ciclos</span>
                    </div>
                    {resumoAluno.cronogramaAnualAtivo && (
                      <Badge variant="outline" className="text-xs">
                        {resumoAluno.cronogramaAnualAtivo === "intensive" ? "Intensivo" : "Extensivo"}
                      </Badge>
                    )}
                  </div>
                  {resumoAluno.cronogramaAnualAtivo ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tópicos concluídos</span>
                        <span className="font-medium">
                          {resumoAluno.cronogramaAnualTopicosConcluidos} de {resumoAluno.cronogramaAnualTopicosTotal}
                        </span>
                      </div>
                      <Progress 
                        value={resumoAluno.cronogramaAnualTopicosTotal > 0 
                          ? Math.round((resumoAluno.cronogramaAnualTopicosConcluidos / resumoAluno.cronogramaAnualTopicosTotal) * 100) 
                          : 0} 
                        className="h-2" 
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {resumoAluno.cronogramaAnualTopicosTotal > 0 
                          ? Math.round((resumoAluno.cronogramaAnualTopicosConcluidos / resumoAluno.cronogramaAnualTopicosTotal) * 100) 
                          : 0}% concluído
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum cronograma anual iniciado</p>
                  )}
                </Card>
                
                {/* Cronograma Dinâmico */}
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-purple-500" />
                      <span className="font-medium">Cronograma Dinâmico</span>
                    </div>
                    {resumoAluno.cronogramaDinamicoAtivo && resumoAluno.cronogramaDinamicoTipo && (
                      <Badge variant="outline" className="text-xs">
                        {resumoAluno.cronogramaDinamicoTipo === "intensivo" ? "Intensivo" : "Extensivo"}
                      </Badge>
                    )}
                  </div>
                  {resumoAluno.cronogramaDinamicoAtivo ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tópicos concluídos</span>
                        <span className="font-medium">
                          {resumoAluno.cronogramaDinamicoTopicosConcluidos} de {resumoAluno.cronogramaDinamicoTopicosTotal}
                        </span>
                      </div>
                      <Progress 
                        value={resumoAluno.cronogramaDinamicoTopicosTotal > 0 
                          ? Math.round((resumoAluno.cronogramaDinamicoTopicosConcluidos / resumoAluno.cronogramaDinamicoTopicosTotal) * 100) 
                          : 0} 
                        className="h-2" 
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {resumoAluno.cronogramaDinamicoTopicosTotal > 0 
                          ? Math.round((resumoAluno.cronogramaDinamicoTopicosConcluidos / resumoAluno.cronogramaDinamicoTopicosTotal) * 100) 
                          : 0}% concluído
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum cronograma dinâmico criado</p>
                  )}
                </Card>
              </div>

              <Separator />

              {/* Metas */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Metas
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Clock className="h-4 w-4" />
                      Metas Ativas
                    </div>
                    <p className="text-2xl font-bold">{resumoAluno.metasAtivas}</p>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Metas Concluídas
                    </div>
                    <p className="text-2xl font-bold">{resumoAluno.metasConcluidas}</p>
                  </Card>
                </div>
              </div>

              <Separator />

              {/* Alertas e Pendências */}
              {resumoAluno.alertas && resumoAluno.alertas.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    Alertas e Pendências
                  </h3>
                  <div className="space-y-2">
                    {resumoAluno.alertas.map((alerta: any, idx: number) => (
                      <Card key={idx} className={`p-3 ${
                        alerta.severidade === 'alta' ? 'border-red-500 bg-red-50' :
                        alerta.severidade === 'media' ? 'border-yellow-500 bg-yellow-50' :
                        'border-blue-500 bg-blue-50'
                      }`}>
                        <div className="flex items-center gap-2">
                          {alerta.severidade === 'alta' ? (
                            <XCircle className="h-4 w-4 text-red-600" />
                          ) : alerta.severidade === 'media' ? (
                            <HelpCircle className="h-4 w-4 text-yellow-600" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-blue-600" />
                          )}
                          <span className="text-sm font-medium">{alerta.mensagem}</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Metas Detalhadas */}
              {resumoAluno.metasDetalhadas && resumoAluno.metasDetalhadas.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Progresso das Metas
                    </h3>
                    <div className="space-y-3">
                      {resumoAluno.metasDetalhadas.map((meta: any) => (
                        <Card key={meta.id} className="p-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-medium capitalize">
                                {meta.tipo === 'questoes' ? 'Questões' :
                                 meta.tipo === 'horas' ? 'Horas de Estudo' :
                                 meta.tipo === 'simulados' ? 'Simulados' : meta.tipo}
                              </span>
                              <Badge variant={
                                meta.progresso >= 100 ? 'default' :
                                meta.progresso >= 80 ? 'secondary' :
                                meta.progresso >= 50 ? 'outline' : 'destructive'
                              }>
                                {meta.progresso}%
                              </Badge>
                            </div>
                            <div className="flex justify-between text-sm text-muted-foreground">
                              <span>{meta.valorAtual} de {meta.valor}</span>
                              {meta.prazo && (
                                <span>Prazo: {new Date(meta.prazo).toLocaleDateString('pt-BR')}</span>
                              )}
                            </div>
                            <Progress value={meta.progresso} className="h-2" />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Atividades de Hoje */}
              {resumoAluno.atividadesHoje && resumoAluno.atividadesHoje.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Atividades de Hoje
                    </h3>
                    <div className="space-y-2">
                      {resumoAluno.atividadesHoje.map((ativ: any) => (
                        <Card key={ativ.id} className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ativ.cor || '#3b82f6' }} />
                              <div>
                                <p className="font-medium text-sm">
                                  {ativ.atividade === 'Outra atividade' ? ativ.atividadePersonalizada : ativ.atividade}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {ativ.horaInicio} - {ativ.horaFim}
                                </p>
                              </div>
                            </div>
                            {ativ.isManual && (
                              <Badge variant="outline" className="text-xs">Manual</Badge>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Últimas Atividades Realizadas */}
              {resumoAluno.ultimasAtividades && resumoAluno.ultimasAtividades.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Últimas Atividades Realizadas
                    </h3>
                    <div className="space-y-2">
                      {resumoAluno.ultimasAtividades.map((ativ: any) => {
                        const dataAtiv = ativ.data?.toDate && typeof ativ.data.toDate === 'function' ? ativ.data.toDate() : (ativ.data?._seconds ? new Date(ativ.data._seconds * 1000) : new Date(ativ.data));
                        return (
                          <Card key={ativ.id} className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{ativ.materia}</p>
                                <p className="text-xs text-muted-foreground">
                                  {ativ.topico || 'Estudo geral'} • {ativ.tempoMinutos || 0} min
                                </p>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {dataAtiv.toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Anotações do Mentor */}
              {resumoAluno.anotacoes && resumoAluno.anotacoes.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Anotações do Mentor
                    </h3>
                    <div className="space-y-2">
                      {resumoAluno.anotacoes.map((anotacao: any) => {
                        const dataAnotacao = anotacao.createdAt?.toDate && typeof anotacao.createdAt.toDate === 'function' ? anotacao.createdAt.toDate() : (anotacao.createdAt?._seconds ? new Date(anotacao.createdAt._seconds * 1000) : new Date(anotacao.createdAt));
                        return (
                          <Card key={anotacao.id} className="p-3 bg-blue-50 border-blue-200">
                            <p className="text-sm">{anotacao.texto}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {dataAnotacao.toLocaleDateString('pt-BR')} às {dataAnotacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Erro ao carregar resumo do aluno
            </p>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setResumoDialogOpen(false)}>
              Fechar
            </Button>
            <Button onClick={() => {
              setResumoDialogOpen(false);
              setLocation(`/mentor/alunos/${selectedAluno?.id}`);
            }}>
              <Eye className="h-4 w-4 mr-2" />
              Ver Área Completa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Definir Metas */}
      <DefinirMetasModal
        open={metasDialogOpen}
        onOpenChange={setMetasDialogOpen}
        aluno={selectedAluno}
        onMetaSalva={handleMetaSalva}
      />

      {/* Modal de Anotações */}
      {selectedAluno && (
        <AnotacoesAluno
          alunoId={selectedAluno.userId}
          alunoNome={selectedAluno.nome}
          open={anotacoesDialogOpen}
          onClose={() => setAnotacoesDialogOpen(false)}
        />
      )}
      
      {/* Modal de Configurar Critérios de Classificação */}
      <ConfigurarCriteriosClassificacao
        open={criteriosDialogOpen}
        onClose={() => setCriteriosDialogOpen(false)}
        criteriosAtuais={criteriosClassificacao}
        onSalvar={(novosCriterios) => {
          setCriteriosClassificacao(novosCriterios);
          // Salvar no localStorage para persistência
          localStorage.setItem('criteriosClassificacao', JSON.stringify(novosCriterios));
        }}
      />
    </div>
  );
}
