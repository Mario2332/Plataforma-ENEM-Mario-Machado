import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
// Substituindo useAlunoApi por funções diretas atualizadas para multi-tenant
import { 
  getDiarioEmocionalDirect, 
  createDiarioEmocionalDirect, 
  deleteDiarioEmocionalDirect,
  getEstudosDirect
} from "@/lib/firestore-direct";
import { Heart, Battery, Calendar, Trash2, TrendingUp, TrendingDown, Minus, BarChart3, AlertTriangle, BookHeart, Zap, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { useDataService } from "@/hooks/useDataService";
import { useAuthContext } from "@/contexts/AuthContext";
import { useMentorViewContext } from "@/contexts/MentorViewContext";
import { auth } from "@/lib/firebase";

const ESTADOS_EMOCIONAIS = [
  { value: "otimo", label: "Ótimo", emoji: "😄", color: "bg-gradient-to-br from-blue-500 to-cyan-500" },
  { value: "bom", label: "Bom", emoji: "🙂", color: "bg-blue-500" },
  { value: "neutro", label: "Neutro", emoji: "😐", color: "bg-gray-500" },
  { value: "ruim", label: "Ruim", emoji: "😟", color: "bg-blue-400" },
  { value: "pessimo", label: "Péssimo", emoji: "😢", color: "bg-blue-300" },
];

const NIVEIS_CANSACO = [
  { value: "descansado", label: "Descansado", icon: Battery, color: "bg-gradient-to-br from-blue-500 to-cyan-500", level: 100 },
  { value: "normal", label: "Normal", icon: Battery, color: "bg-blue-500", level: 75 },
  { value: "cansado", label: "Cansado", icon: Battery, color: "bg-cyan-500", level: 50 },
  { value: "muito_cansado", label: "Muito Cansado", icon: Battery, color: "bg-sky-500", level: 25 },
  { value: "exausto", label: "Exausto", icon: Battery, color: "bg-indigo-500", level: 10 },
];

export default function AlunoDiario() {
  // USANDO DATA SERVICE para obter o contexto
  const { mentoriaId } = useDataService();
  const { userData } = useAuthContext();
  const { alunoId: mentorViewAlunoId, isMentorView } = useMentorViewContext();

  // Função para obter o ID do aluno efetivo
  const getEffectiveUserId = () => {
    if (isMentorView && mentorViewAlunoId) return mentorViewAlunoId;
    return auth.currentUser?.uid || null;
  };

  const [registros, setRegistros] = useState<any[]>([]);
  const [estudos, setEstudos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [periodoFiltro, setPeriodoFiltro] = useState<string>("todo");
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    estadoEmocional: "",
    nivelCansaco: "",
    qualidadeSono: "",
    atividadeFisica: undefined as boolean | undefined,
    observacoes: "",
  });

  const loadRegistros = async () => {
    try {
      setIsLoading(true);
      const userId = getEffectiveUserId();
      if (!userId) return;

      // Usando funções diretas com mentoriaId
      const [registrosData, estudosData] = await Promise.all([
        getDiarioEmocionalDirect(userId, mentoriaId),
        getEstudosDirect(userId, mentoriaId)
      ]);
      setRegistros(registrosData as any[]);
      setEstudos(estudosData as any[]);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRegistros();
  }, [mentoriaId]); // Recarregar se mentoriaId mudar

  const formatData = (timestamp: any) => {
    if (!timestamp) return "";
    let data: Date;
    if (timestamp.toDate) {
      data = timestamp.toDate();
    } else if (timestamp.seconds || timestamp._seconds) {
      const seconds = timestamp.seconds || timestamp._seconds;
      data = new Date(seconds * 1000);
    } else if (timestamp) {
      data = new Date(timestamp);
    } else {
      return "";
    }
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getEstadoEmocional = (value: string) => ESTADOS_EMOCIONAIS.find(e => e.value === value);
  const getNivelCansaco = (value: string) => NIVEIS_CANSACO.find(n => n.value === value);

  const prepararDadosGrafico = () => {
    const registrosFiltrados = filtrarPorPeriodo();
    const dados = registrosFiltrados.map(registro => {
      const dataStr = formatData(registro.data);
      const estadoMap: any = { 'pessimo': 1, 'ruim': 2, 'neutro': 3, 'bom': 4, 'otimo': 5 };
      const cansacoMap: any = { 'exausto': 1, 'muito_cansado': 2, 'cansado': 3, 'normal': 4, 'descansado': 5 };
      return {
        data: dataStr,
        estadoEmocional: estadoMap[registro.estadoEmocional] || 3,
        nivelEnergia: cansacoMap[registro.nivelCansaco] || 3,
        qualidadeSono: registro.qualidadeSono ? estadoMap[registro.qualidadeSono] : null,
        atividadeFisica: registro.atividadeFisica !== undefined ? (registro.atividadeFisica ? 5 : 1) : null,
      };
    }).reverse();
    return dados;
  };

  const analisarCorrelacao = () => {
    if (registros.length === 0 || estudos.length === 0) return null;
    const estudosPorData: any = {};
    estudos.forEach(estudo => {
      let dataEstudo: Date;
      if (estudo.data?.toDate) {
        dataEstudo = estudo.data.toDate();
      } else if (estudo.data?.seconds || estudo.data?._seconds) {
        const seconds = estudo.data.seconds || estudo.data._seconds;
        dataEstudo = new Date(seconds * 1000);
      } else {
        dataEstudo = new Date(estudo.data);
      }
      const dataStr = dataEstudo.toLocaleDateString('pt-BR');
      if (!estudosPorData[dataStr]) {
        estudosPorData[dataStr] = { tempoTotal: 0, questoesFeitas: 0, questoesAcertadas: 0, count: 0 };
      }
      estudosPorData[dataStr].tempoTotal += estudo.tempoMinutos || 0;
      estudosPorData[dataStr].questoesFeitas += estudo.questoesFeitas || 0;
      estudosPorData[dataStr].questoesAcertadas += estudo.questoesAcertadas || 0;
      estudosPorData[dataStr].count++;
    });
    let diasComBaixaEnergia = 0;
    let diasComEstadoNegativo = 0;
    let alertaBurnout = false;
    registros.forEach(registro => {
      if (['exausto', 'muito_cansado'].includes(registro.nivelCansaco)) diasComBaixaEnergia++;
      if (['pessimo', 'ruim'].includes(registro.estadoEmocional)) diasComEstadoNegativo++;
    });
    const ultimosRegistros = registros.slice(0, 7);
    let consecutivosBaixaEnergia = 0;
    let estadosNegativosRecentes = 0;
    ultimosRegistros.forEach(registro => {
      if (['exausto', 'muito_cansado'].includes(registro.nivelCansaco)) {
        consecutivosBaixaEnergia++;
      } else {
        consecutivosBaixaEnergia = 0;
      }
      if (['pessimo', 'ruim'].includes(registro.estadoEmocional)) estadosNegativosRecentes++;
    });
    alertaBurnout = consecutivosBaixaEnergia >= 3 || estadosNegativosRecentes >= 5;
    return { diasComBaixaEnergia, diasComEstadoNegativo, alertaBurnout, totalRegistros: registros.length };
  };

  const filtrarPorPeriodo = () => {
    if (periodoFiltro === "todo") return registros;
    const agora = new Date();
    let dataLimite: Date;
    switch (periodoFiltro) {
      case "7dias": dataLimite = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case "30dias": dataLimite = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      case "3meses": dataLimite = new Date(agora.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      case "12meses": dataLimite = new Date(agora.getTime() - 365 * 24 * 60 * 60 * 1000); break;
      default: return registros;
    }
    return registros.filter(registro => {
      let dataRegistro: Date;
      if (registro.data?.toDate) {
        dataRegistro = registro.data.toDate();
      } else if (registro.data?.seconds || registro.data?._seconds) {
        const seconds = registro.data.seconds || registro.data._seconds;
        dataRegistro = new Date(seconds * 1000);
      } else if (registro.data) {
        dataRegistro = new Date(registro.data);
      } else {
        return false;
      }
      return dataRegistro >= dataLimite;
    });
  };

  const prepararDadosDistribuicao = () => {
    const registrosFiltrados = filtrarPorPeriodo();
    const contagemEstados: any = {};
    ESTADOS_EMOCIONAIS.forEach(e => { contagemEstados[e.value] = 0; });
    const contagemCansaco: any = {};
    NIVEIS_CANSACO.forEach(n => { contagemCansaco[n.value] = 0; });
    const contagemSono: any = {};
    ESTADOS_EMOCIONAIS.forEach(e => { contagemSono[e.value] = 0; });
    let diasComAtividade = 0;
    let diasSemAtividade = 0;
    registrosFiltrados.forEach(registro => {
      if (registro.estadoEmocional) contagemEstados[registro.estadoEmocional] = (contagemEstados[registro.estadoEmocional] || 0) + 1;
      if (registro.nivelCansaco) contagemCansaco[registro.nivelCansaco] = (contagemCansaco[registro.nivelCansaco] || 0) + 1;
      if (registro.qualidadeSono) contagemSono[registro.qualidadeSono] = (contagemSono[registro.qualidadeSono] || 0) + 1;
      if (registro.atividadeFisica === true) diasComAtividade++;
      else if (registro.atividadeFisica === false) diasSemAtividade++;
    });
    const dadosEstados = ESTADOS_EMOCIONAIS.map(e => ({ nome: e.label, quantidade: contagemEstados[e.value] || 0, cor: e.color.replace('bg-', '').replace('gradient-to-br from-', '').replace(' to-cyan-500', '') }));
    const dadosCansaco = NIVEIS_CANSACO.map(n => ({ nome: n.label, quantidade: contagemCansaco[n.value] || 0, cor: n.color.replace('bg-', '').replace('gradient-to-br from-', '').replace(' to-cyan-500', '') }));
    const dadosSono = ESTADOS_EMOCIONAIS.map(e => ({ nome: e.label, quantidade: contagemSono[e.value] || 0, cor: e.color.replace('bg-', '').replace('gradient-to-br from-', '').replace(' to-cyan-500', '') }));
    const dadosAtividade = [
      { nome: 'Sim', quantidade: diasComAtividade, cor: 'blue-500' },
      { nome: 'Não', quantidade: diasSemAtividade, cor: 'gray-400' },
    ];
    return { dadosEstados, dadosCansaco, dadosSono, dadosAtividade };
  };

  const dadosGrafico = useMemo(() => prepararDadosGrafico(), [registros, periodoFiltro]);
  const analise = useMemo(() => analisarCorrelacao(), [registros, estudos]);
  const dadosDistribuicao = useMemo(() => prepararDadosDistribuicao(), [registros, periodoFiltro]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.estadoEmocional || !formData.nivelCansaco) {
      toast.error("Selecione o estado emocional e o nível de cansaço");
      return;
    }
    try {
      setIsSaving(true);
      const userId = getEffectiveUserId();
      if (!userId) throw new Error("Usuário não identificado");

      const [ano, mes, dia] = formData.data.split('-').map(Number);
      const dataLocal = new Date(ano, mes - 1, dia, 12, 0, 0);
      
      // Usando createDiarioEmocionalDirect com mentoriaId
      await createDiarioEmocionalDirect(userId, { 
        ...formData, 
        data: dataLocal.toISOString() 
      }, mentoriaId);
      
      toast.success("Registro salvo com sucesso!");
      setFormData({ data: new Date().toISOString().split('T')[0], estadoEmocional: "", nivelCansaco: "", qualidadeSono: "", atividadeFisica: undefined, observacoes: "" });
      await loadRegistros();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar registro");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (registroId: string) => {
    if (!confirm("Tem certeza que deseja excluir este registro?")) return;
    try {
      const userId = getEffectiveUserId();
      if (!userId) return;

      // Usando deleteDiarioEmocionalDirect com mentoriaId
      await deleteDiarioEmocionalDirect(userId, registroId, mentoriaId);
      toast.success("Registro excluído com sucesso!");
      loadRegistros();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir registro");
    }
  };

  return (
    <div className="space-y-8 pb-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Diário Emocional</h1>
          <p className="text-muted-foreground mt-1">
            Monitore seu bem-estar e entenda como suas emoções afetam seus estudos.
          </p>
        </div>
      </div>

      {/* Formulário de Registro */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-blue-500" />
            Como você está se sentindo hoje?
          </CardTitle>
          <CardDescription>Registre seu estado emocional para acompanhar sua evolução.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label htmlFor="data">Data</Label>
                <Input 
                  id="data" 
                  type="date" 
                  value={formData.data}
                  onChange={(e) => setFormData({...formData, data: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Estado Emocional</Label>
                <Select 
                  value={formData.estadoEmocional} 
                  onValueChange={(value) => setFormData({...formData, estadoEmocional: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_EMOCIONAIS.map((estado) => (
                      <SelectItem key={estado.value} value={estado.value}>
                        <span className="flex items-center gap-2">
                          <span className="text-lg">{estado.emoji}</span>
                          {estado.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nível de Cansaço</Label>
                <Select 
                  value={formData.nivelCansaco} 
                  onValueChange={(value) => setFormData({...formData, nivelCansaco: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {NIVEIS_CANSACO.map((nivel) => (
                      <SelectItem key={nivel.value} value={nivel.value}>
                        <span className="flex items-center gap-2">
                          <nivel.icon className="h-4 w-4" />
                          {nivel.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Qualidade do Sono (Ontem)</Label>
                <Select 
                  value={formData.qualidadeSono} 
                  onValueChange={(value) => setFormData({...formData, qualidadeSono: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_EMOCIONAIS.map((estado) => (
                      <SelectItem key={estado.value} value={estado.value}>
                        <span className="flex items-center gap-2">
                          <span className="text-lg">{estado.emoji}</span>
                          {estado.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Atividade Física</Label>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={formData.atividadeFisica === true ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setFormData({...formData, atividadeFisica: true})}
                  >
                    Sim, pratiquei
                  </Button>
                  <Button
                    type="button"
                    variant={formData.atividadeFisica === false ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setFormData({...formData, atividadeFisica: false})}
                  >
                    Não pratiquei
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações (Opcional)</Label>
                <Textarea 
                  id="observacoes" 
                  placeholder="Algo específico aconteceu hoje? Como isso afetou seus estudos?"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  className="h-[80px]"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving} className="w-full md:w-auto">
                {isSaving ? "Salvando..." : "Registrar no Diário"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Análise e Insights */}
      {analise && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className={`${analise.alertaBurnout ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : ''}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className={`h-4 w-4 ${analise.alertaBurnout ? 'text-red-500' : 'text-muted-foreground'}`} />
                Risco de Burnout
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${analise.alertaBurnout ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {analise.alertaBurnout ? "Alto Risco" : "Baixo Risco"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {analise.alertaBurnout 
                  ? "Cuidado! Você tem relatado cansaço excessivo frequentemente." 
                  : "Seus níveis de energia parecem equilibrados."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Dias com Baixa Energia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analise.diasComBaixaEnergia}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Nos últimos {analise.totalRegistros} registros
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-500" />
                Dias Positivos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analise.totalRegistros - analise.diasComEstadoNegativo}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Dias com humor neutro, bom ou ótimo
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Evolução do Bem-Estar</CardTitle>
                <CardDescription>Acompanhe seu humor e energia ao longo do tempo</CardDescription>
              </div>
              <Select value={periodoFiltro} onValueChange={setPeriodoFiltro}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">Todo o período</SelectItem>
                  <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                  <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                  <SelectItem value="3meses">Últimos 3 meses</SelectItem>
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
                  <YAxis domain={[1, 5]} hide />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.5rem' 
                    }} 
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="estadoEmocional" 
                    name="Humor" 
                    stroke="#3b82f6" 
                    strokeWidth={2} 
                    dot={{ r: 4 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="nivelEnergia" 
                    name="Energia" 
                    stroke="#f59e0b" 
                    strokeWidth={2} 
                    dot={{ r: 4 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Humor</CardTitle>
            <CardDescription>Frequência de cada estado emocional</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosDistribuicao.dadosEstados} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
                  <XAxis type="number" className="text-xs" tick={{ fill: 'currentColor' }} />
                  <YAxis dataKey="nome" type="category" className="text-xs font-bold" tick={{ fill: 'currentColor' }} width={60} />
                  <RechartsTooltip 
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.5rem' 
                    }} 
                  />
                  <Bar dataKey="quantidade" name="Dias" radius={[0, 4, 4, 0]}>
                    {dadosDistribuicao.dadosEstados.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(var(--${entry.cor === 'gray-500' ? 'muted-foreground' : entry.cor}))`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Níveis de Energia</CardTitle>
            <CardDescription>Frequência de cada nível de cansaço</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosDistribuicao.dadosCansaco} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
                  <XAxis type="number" className="text-xs" tick={{ fill: 'currentColor' }} />
                  <YAxis dataKey="nome" type="category" className="text-xs font-bold" tick={{ fill: 'currentColor' }} width={100} />
                  <RechartsTooltip 
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.5rem' 
                    }} 
                  />
                  <Bar dataKey="quantidade" name="Dias" radius={[0, 4, 4, 0]}>
                    {dadosDistribuicao.dadosCansaco.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(var(--${entry.cor === 'gray-500' ? 'muted-foreground' : entry.cor}))`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Histórico de Registros */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Histórico de Registros</h2>
        {registros.length === 0 ? (
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <BookHeart className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">Nenhum registro encontrado no período selecionado.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtrarPorPeriodo().map((registro) => {
              const estado = getEstadoEmocional(registro.estadoEmocional);
              const cansaco = getNivelCansaco(registro.nivelCansaco);
              
              return (
                <Card key={registro.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <div className={`h-2 w-full ${estado?.color || 'bg-gray-200'}`} />
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="font-semibold flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatData(registro.data)}
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(registro.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-muted/50 p-2 rounded flex flex-col items-center justify-center text-center">
                        <span className="text-2xl mb-1">{estado?.emoji}</span>
                        <span className="font-medium">{estado?.label}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">Humor</span>
                      </div>
                      <div className="bg-muted/50 p-2 rounded flex flex-col items-center justify-center text-center">
                        <Battery className="h-6 w-6 mb-1 text-blue-500" />
                        <span className="font-medium">{cansaco?.label}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">Energia</span>
                      </div>
                    </div>
                    
                    {(registro.qualidadeSono || registro.atividadeFisica !== undefined) && (
                      <div className="flex gap-2 text-xs text-muted-foreground pt-2 border-t">
                        {registro.qualidadeSono && (
                          <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full">
                            💤 Sono: {getEstadoEmocional(registro.qualidadeSono)?.label}
                          </span>
                        )}
                        {registro.atividadeFisica !== undefined && (
                          <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full">
                            🏃 Atividade: {registro.atividadeFisica ? 'Sim' : 'Não'}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {registro.observacoes && (
                      <div className="pt-2 border-t text-sm text-muted-foreground italic">
                        "{registro.observacoes}"
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
