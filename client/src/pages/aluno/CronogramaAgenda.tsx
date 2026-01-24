import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, Trash2, Clock, Edit2, CheckCircle, Loader2, 
  CalendarDays, ChevronLeft, ChevronRight, Info, 
  Link2, Link2Off, AlertCircle, Star
} from "lucide-react";
import { toast } from "sonner";
import { collection, doc, getDocs, setDoc, deleteDoc, writeBatch, Timestamp, query, getDoc, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useEffectiveUserId } from "@/contexts/MentorViewContext";
import { CronogramaSkeleton } from "@/components/ui/skeleton-loader";

// Atividades padrão (mesmas do CronogramaLista)
const ATIVIDADES_PADRAO = [
  "Matemática", "Biologia", "Física", "Química", "História", "Geografia",
  "Filosofia", "Sociologia", "Linguagens", "Redação", "Revisão", "Simulado",
  "Correção de simulado", "Preenchimento de lacunas", "Dormir", "Atividade física",
  "Igreja", "Outra atividade",
];

// Cores para as atividades
const CORES_ATIVIDADES: Record<string, string> = {
  "Matemática": "#3b82f6", "Biologia": "#10b981", "Física": "#f59e0b",
  "Química": "#ef4444", "História": "#8b5cf6", "Geografia": "#ec4899",
  "Filosofia": "#06b6d4", "Sociologia": "#f97316", "Linguagens": "#84cc16",
  "Redação": "#14b8a6", "Revisão": "#a855f7", "Simulado": "#f43f5e",
  "Correção de simulado": "#0ea5e9", "Preenchimento de lacunas": "#eab308",
  "Dormir": "#6366f1", "Atividade física": "#22c55e", "Igreja": "#d946ef",
  "Outra atividade": "#94a3b8",
};

// Nomes dos meses
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// Dias da semana abreviados
const DIAS_SEMANA_ABREV = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Interface para atividade da agenda
interface AtividadeAgenda {
  id?: string;
  data: string; // "2026-01-25"
  horaInicio: string;
  horaFim: string;
  atividade: string;
  atividadePersonalizada?: string;
  cor: string;
  isManual: boolean;
  createdAt?: Date;
}

// Interface para atividade do cronograma semanal
interface AtividadeSemanal {
  id?: string;
  diaSemana: number;
  horaInicio: string;
  horaFim: string;
  atividade: string;
  atividadePersonalizada?: string;
  cor: string;
}

// Interface para configuração da agenda
interface AgendaConfig {
  sincronizacaoAtiva: boolean;
  dataFimSincronizacao: string;
  atividadesManuaisPreSincronizacao: AtividadeAgenda[];
}

export default function CronogramaAgenda() {
  const effectiveUserId = useEffectiveUserId();
  
  // Estado do calendário
  const [mesAtual, setMesAtual] = useState(new Date().getMonth());
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear());
  
  // Estado das atividades
  const [atividades, setAtividades] = useState<AtividadeAgenda[]>([]);
  const [atividadesSemanais, setAtividadesSemanais] = useState<AtividadeSemanal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Estado da sincronização
  const [config, setConfig] = useState<AgendaConfig>({
    sincronizacaoAtiva: false,
    dataFimSincronizacao: "",
    atividadesManuaisPreSincronizacao: [],
  });
  
  // Estado para modais
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [isConfirmSyncDialogOpen, setIsConfirmSyncDialogOpen] = useState(false);
  const [manterAtividadesManuais, setManterAtividadesManuais] = useState(true);
  const [editingAtividade, setEditingAtividade] = useState<AtividadeAgenda | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isEditSingleDialogOpen, setIsEditSingleDialogOpen] = useState(false);
  const [editSingleOrAll, setEditSingleOrAll] = useState<'single' | 'all'>('single');
  const [tempDataFimSync, setTempDataFimSync] = useState<string>("");
  const [isDayDetailDialogOpen, setIsDayDetailDialogOpen] = useState(false);
  const [selectedDayForDetail, setSelectedDayForDetail] = useState<string>("");
  
  // Form data
  const [formData, setFormData] = useState<AtividadeAgenda>({
    data: "",
    horaInicio: "08:00",
    horaFim: "09:00",
    atividade: "",
    atividadePersonalizada: "",
    cor: "#3b82f6",
    isManual: true,
  });
  
  // Refs para auto-save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasUnsavedChanges = useRef(false);
  const atividadesRef = useRef<AtividadeAgenda[]>([]);
  const userIdRef = useRef<string | null>(null);

  // Atualizar refs
  useEffect(() => {
    atividadesRef.current = atividades;
  }, [atividades]);

  useEffect(() => {
    userIdRef.current = effectiveUserId;
  }, [effectiveUserId]);

  // Carregar dados
  useEffect(() => {
    if (!effectiveUserId) return;
    
    const loadData = async () => {
      setIsLoading(true);
      hasUnsavedChanges.current = false;
      try {
        await Promise.all([
          loadAtividades(),
          loadAtividadesSemanais(),
          loadConfig(),
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [effectiveUserId]);

  const loadAtividades = async () => {
    try {
      const userId = effectiveUserId || auth.currentUser?.uid;
      if (!userId) throw new Error("Usuário não autenticado");

      const atividadesRef = collection(db, "alunos", userId, "agenda");
      const snapshot = await getDocs(atividadesRef);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AtividadeAgenda[];
      
      setAtividades(data);
    } catch (error: any) {
      console.error("Erro ao carregar atividades da agenda:", error);
    }
  };

  const loadAtividadesSemanais = async () => {
    try {
      const userId = effectiveUserId || auth.currentUser?.uid;
      if (!userId) throw new Error("Usuário não autenticado");

      const atividadesRef = collection(db, "alunos", userId, "cronograma_lista");
      const snapshot = await getDocs(atividadesRef);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AtividadeSemanal[];
      
      setAtividadesSemanais(data);
    } catch (error: any) {
      console.error("Erro ao carregar atividades semanais:", error);
    }
  };

  const loadConfig = async () => {
    try {
      const userId = effectiveUserId || auth.currentUser?.uid;
      if (!userId) throw new Error("Usuário não autenticado");

      const configRef = doc(db, "alunos", userId, "agenda_config", "config");
      const configSnap = await getDoc(configRef);
      
      if (configSnap.exists()) {
        setConfig(configSnap.data() as AgendaConfig);
      }
    } catch (error: any) {
      console.error("Erro ao carregar configuração:", error);
    }
  };

  const saveConfig = async (newConfig: AgendaConfig) => {
    try {
      const userId = effectiveUserId || auth.currentUser?.uid;
      if (!userId) throw new Error("Usuário não autenticado");

      const configRef = doc(db, "alunos", userId, "agenda_config", "config");
      await setDoc(configRef, newConfig);
      setConfig(newConfig);
    } catch (error: any) {
      console.error("Erro ao salvar configuração:", error);
      throw error;
    }
  };

  const saveAtividades = async (data: AtividadeAgenda[]) => {
    try {
      const userId = effectiveUserId || auth.currentUser?.uid;
      if (!userId) throw new Error("Usuário não autenticado");

      const atividadesCollRef = collection(db, "alunos", userId, "agenda");
      const snapshot = await getDocs(atividadesCollRef);
      
      const batch = writeBatch(db);
      
      // Deletar todas as atividades existentes
      snapshot.docs.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });
      
      // Adicionar novas atividades
      data.forEach(atividade => {
        const { id, ...atividadeData } = atividade;
        const newDocRef = doc(atividadesCollRef);
        batch.set(newDocRef, {
          ...atividadeData,
          createdAt: Timestamp.now()
        });
      });
      
      await batch.commit();
      await loadAtividades();
    } catch (error) {
      console.error("Erro ao salvar atividades:", error);
      throw error;
    }
  };

  const triggerAutoSave = useCallback(() => {
    hasUnsavedChanges.current = true;
    setSaveStatus('saving');
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      if (!userIdRef.current) return;
      
      try {
        await saveAtividades(atividadesRef.current);
        hasUnsavedChanges.current = false;
        setSaveStatus('saved');
        
        setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      } catch (error: any) {
        console.error("Erro ao salvar:", error);
        setSaveStatus('error');
        toast.error("Erro ao salvar. Tente novamente.");
      }
    }, 1500);
  }, []);

  // Função para sincronizar a agenda com o cronograma semanal
  const sincronizarAgenda = useCallback(async (atividadesSemanaisAtuais: AtividadeSemanal[], configAtual: AgendaConfig) => {
    if (!configAtual.sincronizacaoAtiva || !configAtual.dataFimSincronizacao) {
      return;
    }

    try {
      const userId = effectiveUserId || auth.currentUser?.uid;
      if (!userId) return;

      // Carregar atividades atuais da agenda
      const atividadesRef = collection(db, "alunos", userId, "agenda");
      const snapshot = await getDocs(atividadesRef);
      const atividadesAtuais = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AtividadeAgenda[];

      // Separar atividades manuais das sincronizadas
      const atividadesManuais = atividadesAtuais.filter(a => a.isManual);

      // Gerar novas atividades sincronizadas
      const novasAtividadesSincronizadas: AtividadeAgenda[] = [];
      
      const dataFim = new Date(configAtual.dataFimSincronizacao);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      let dataAtual = new Date(hoje);
      while (dataAtual <= dataFim) {
        const diaSemana = dataAtual.getDay();
        const dataStr = dataAtual.toISOString().split('T')[0];
        
        // Encontrar atividades do cronograma semanal para este dia
        const atividadesDoDia = atividadesSemanaisAtuais.filter(a => a.diaSemana === diaSemana);
        
        atividadesDoDia.forEach(atividadeSemanal => {
          novasAtividadesSincronizadas.push({
            id: `sync_${dataStr}_${atividadeSemanal.id}`,
            data: dataStr,
            horaInicio: atividadeSemanal.horaInicio,
            horaFim: atividadeSemanal.horaFim,
            atividade: atividadeSemanal.atividade,
            atividadePersonalizada: atividadeSemanal.atividadePersonalizada,
            cor: atividadeSemanal.cor,
            isManual: false,
          });
        });
        
        dataAtual.setDate(dataAtual.getDate() + 1);
      }

      // Combinar atividades manuais com as novas sincronizadas
      const todasAtividades = [...atividadesManuais, ...novasAtividadesSincronizadas];

      // Salvar no Firestore
      const batch = writeBatch(db);
      
      // Deletar todas as atividades existentes
      snapshot.docs.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });
      
      // Adicionar novas atividades
      todasAtividades.forEach(atividade => {
        const { id, ...atividadeData } = atividade;
        const newDocRef = doc(atividadesRef);
        batch.set(newDocRef, {
          ...atividadeData,
          createdAt: Timestamp.now()
        });
      });
      
      await batch.commit();
      
      // Atualizar estado local
      setAtividades(todasAtividades);
      
      console.log('Sincronização automática concluída:', todasAtividades.length, 'atividades');
    } catch (error) {
      console.error('Erro na sincronização automática:', error);
    }
  }, [effectiveUserId]);

  // Listener para mudanças no cronograma semanal (sincronização em tempo real)
  useEffect(() => {
    if (!effectiveUserId || !config.sincronizacaoAtiva) return;

    const userId = effectiveUserId;
    const cronogramaRef = collection(db, "alunos", userId, "cronograma_lista");
    
    // Usar onSnapshot para detectar mudanças em tempo real
    const unsubscribe = onSnapshot(cronogramaRef, (snapshot) => {
      const atividadesSemanaisAtualizadas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AtividadeSemanal[];
      
      // Atualizar estado local das atividades semanais
      setAtividadesSemanais(atividadesSemanaisAtualizadas);
      
      // Executar sincronização com as atividades atualizadas
      sincronizarAgenda(atividadesSemanaisAtualizadas, config);
    }, (error) => {
      console.error('Erro no listener do cronograma semanal:', error);
    });

    // Cleanup: remover listener quando o componente for desmontado ou a sincronização for desativada
    return () => {
      unsubscribe();
    };
  }, [effectiveUserId, config.sincronizacaoAtiva, config.dataFimSincronizacao, sincronizarAgenda]);

  // Funções do calendário
  const getDiasDoMes = (mes: number, ano: number) => {
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);
    const diasNoMes = ultimoDia.getDate();
    const primeiroDiaSemana = primeiroDia.getDay();
    
    const dias: { data: string; dia: number; isCurrentMonth: boolean }[] = [];
    
    // Dias do mês anterior
    const diasMesAnterior = new Date(ano, mes, 0).getDate();
    for (let i = primeiroDiaSemana - 1; i >= 0; i--) {
      const dia = diasMesAnterior - i;
      const mesAnterior = mes === 0 ? 11 : mes - 1;
      const anoAnterior = mes === 0 ? ano - 1 : ano;
      dias.push({
        data: `${anoAnterior}-${String(mesAnterior + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
        dia,
        isCurrentMonth: false,
      });
    }
    
    // Dias do mês atual
    for (let dia = 1; dia <= diasNoMes; dia++) {
      dias.push({
        data: `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
        dia,
        isCurrentMonth: true,
      });
    }
    
    // Dias do próximo mês
    const diasRestantes = 42 - dias.length;
    for (let dia = 1; dia <= diasRestantes; dia++) {
      const mesProximo = mes === 11 ? 0 : mes + 1;
      const anoProximo = mes === 11 ? ano + 1 : ano;
      dias.push({
        data: `${anoProximo}-${String(mesProximo + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
        dia,
        isCurrentMonth: false,
      });
    }
    
    return dias;
  };

  const mesAnterior = () => {
    if (mesAtual === 0) {
      setMesAtual(11);
      setAnoAtual(anoAtual - 1);
    } else {
      setMesAtual(mesAtual - 1);
    }
  };

  const mesProximo = () => {
    if (mesAtual === 11) {
      setMesAtual(0);
      setAnoAtual(anoAtual + 1);
    } else {
      setMesAtual(mesAtual + 1);
    }
  };

  // Funções de atividades
  const getAtividadesDoDia = (data: string) => {
    return atividades.filter(a => a.data === data).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  };

  const handleAddAtividade = (data: string) => {
    setSelectedDate(data);
    setEditingAtividade(null);
    setFormData({
      data,
      horaInicio: "08:00",
      horaFim: "09:00",
      atividade: "",
      atividadePersonalizada: "",
      cor: "#3b82f6",
      isManual: true,
    });
    setIsDialogOpen(true);
  };

  const handleEditAtividade = (atividade: AtividadeAgenda) => {
    // Se for atividade sincronizada, perguntar se quer editar só esta ou todas
    if (!atividade.isManual) {
      setEditingAtividade(atividade);
      setIsEditSingleDialogOpen(true);
    } else {
      setEditingAtividade(atividade);
      setFormData({
        ...atividade,
        atividadePersonalizada: atividade.atividadePersonalizada || "",
      });
      setIsDialogOpen(true);
    }
  };

  const handleConfirmEditType = () => {
    if (!editingAtividade) return;
    
    setIsEditSingleDialogOpen(false);
    
    if (editSingleOrAll === 'single') {
      // Editar apenas este dia - converter para manual
      setFormData({
        ...editingAtividade,
        atividadePersonalizada: editingAtividade.atividadePersonalizada || "",
        isManual: true, // Converter para manual
      });
      setIsDialogOpen(true);
    } else {
      // Editar todos - redirecionar para o cronograma semanal
      toast.info("Para editar todas as ocorrências, vá para a aba 'Semanal > Lista' e edite a atividade lá.");
    }
  };

  const handleSaveAtividade = () => {
    if (!formData.atividade) {
      toast.error("Selecione uma atividade");
      return;
    }
    
    if (formData.atividade === "Outra atividade" && !formData.atividadePersonalizada?.trim()) {
      toast.error("Informe o nome da atividade personalizada");
      return;
    }
    
    if (formData.horaInicio >= formData.horaFim) {
      toast.error("O horário de início deve ser anterior ao horário de fim");
      return;
    }
    
    const corFinal = formData.atividade === "Outra atividade" 
      ? formData.cor 
      : (CORES_ATIVIDADES[formData.atividade] || formData.cor);
    
    const novaAtividade: AtividadeAgenda = {
      ...formData,
      cor: corFinal,
      isManual: true,
    };
    
    if (editingAtividade) {
      setAtividades(prev => prev.map(a => 
        a.id === editingAtividade.id ? { ...novaAtividade, id: a.id } : a
      ));
      toast.success("Atividade atualizada!");
    } else {
      const tempId = `temp_${Date.now()}`;
      setAtividades(prev => [...prev, { ...novaAtividade, id: tempId }]);
      toast.success("Atividade adicionada!");
    }
    
    setIsDialogOpen(false);
    triggerAutoSave();
  };

  const handleDeleteAtividade = (id: string) => {
    setAtividades(prev => prev.filter(a => a.id !== id));
    toast.success("Atividade removida!");
    triggerAutoSave();
  };

  // Funções de sincronização
  const handleToggleSincronizacao = () => {
    if (config.sincronizacaoAtiva) {
      // Desativar sincronização
      handleDesativarSincronizacao();
    } else {
      // Abrir dialog para ativar
      setTempDataFimSync("");
      setIsSyncDialogOpen(true);
    }
  };

  const handleAbrirConfirmacaoSync = () => {
    if (!tempDataFimSync) {
      toast.error("Defina a data de término da sincronização");
      return;
    }
    setConfig(prev => ({ ...prev, dataFimSincronizacao: tempDataFimSync }));
    setIsSyncDialogOpen(false);
    setIsConfirmSyncDialogOpen(true);
  };

  const handleAtivarSincronizacao = async () => {
    try {
      setIsSaving(true);
      
      // Salvar atividades manuais atuais para backup
      const atividadesManuaisAtuais = atividades.filter(a => a.isManual);
      
      // Gerar atividades sincronizadas
      const novasAtividades: AtividadeAgenda[] = [];
      
      // Se manter atividades manuais, incluí-las
      if (manterAtividadesManuais) {
        novasAtividades.push(...atividadesManuaisAtuais);
      }
      
      // Gerar atividades do cronograma semanal até a data fim
      const dataFim = new Date(config.dataFimSincronizacao);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      let dataAtual = new Date(hoje);
      while (dataAtual <= dataFim) {
        const diaSemana = dataAtual.getDay();
        const dataStr = dataAtual.toISOString().split('T')[0];
        
        // Encontrar atividades do cronograma semanal para este dia
        const atividadesDoDia = atividadesSemanais.filter(a => a.diaSemana === diaSemana);
        
        atividadesDoDia.forEach(atividadeSemanal => {
          novasAtividades.push({
            id: `sync_${dataStr}_${atividadeSemanal.id}`,
            data: dataStr,
            horaInicio: atividadeSemanal.horaInicio,
            horaFim: atividadeSemanal.horaFim,
            atividade: atividadeSemanal.atividade,
            atividadePersonalizada: atividadeSemanal.atividadePersonalizada,
            cor: atividadeSemanal.cor,
            isManual: false,
          });
        });
        
        dataAtual.setDate(dataAtual.getDate() + 1);
      }
      
      // Salvar nova configuração
      const novaConfig: AgendaConfig = {
        sincronizacaoAtiva: true,
        dataFimSincronizacao: config.dataFimSincronizacao,
        atividadesManuaisPreSincronizacao: atividadesManuaisAtuais,
      };
      
      await saveConfig(novaConfig);
      await saveAtividades(novasAtividades);
      
      setIsConfirmSyncDialogOpen(false);
      toast.success("Sincronização ativada com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao ativar sincronização");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDesativarSincronizacao = async () => {
    try {
      setIsSaving(true);
      
      // Restaurar apenas atividades manuais (as que foram adicionadas antes da sincronização + as adicionadas depois)
      const atividadesManuaisAtuais = atividades.filter(a => a.isManual);
      
      // Salvar nova configuração
      const novaConfig: AgendaConfig = {
        sincronizacaoAtiva: false,
        dataFimSincronizacao: "",
        atividadesManuaisPreSincronizacao: [],
      };
      
      await saveConfig(novaConfig);
      await saveAtividades(atividadesManuaisAtuais);
      
      toast.success("Sincronização desativada! Atividades manuais mantidas.");
    } catch (error: any) {
      toast.error("Erro ao desativar sincronização");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const getAtividadeNome = (atividade: AtividadeAgenda) => {
    if (atividade.atividade === "Outra atividade" && atividade.atividadePersonalizada) {
      return atividade.atividadePersonalizada;
    }
    return atividade.atividade;
  };

  const isHoje = (data: string) => {
    const hoje = new Date().toISOString().split('T')[0];
    return data === hoje;
  };

  if (isLoading) {
    return <CronogramaSkeleton />;
  }

  const diasDoMes = getDiasDoMes(mesAtual, anoAtual);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg">
            <CalendarDays className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Agenda Mensal</h2>
            <p className="text-sm text-muted-foreground">Visualize e organize suas atividades do mês</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Status de salvamento */}
          <div className="flex items-center gap-2 text-sm">
            {saveStatus === 'saving' && (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-blue-500">Salvando...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-green-500">Salvo!</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Card de Sincronização */}
      <Card className={`border-2 ${config.sincronizacaoAtiva ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20' : 'border-gray-200'}`}>
        <CardContent className="py-4 px-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {config.sincronizacaoAtiva ? (
                <Link2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <Link2Off className="h-5 w-5 text-gray-400" />
              )}
              <div>
                <p className="font-medium">
                  Sincronização com Cronograma Semanal de Lista
                </p>
                <p className="text-sm text-muted-foreground">
                  {config.sincronizacaoAtiva 
                    ? `Ativo até ${new Date(config.dataFimSincronizacao + 'T00:00:00').toLocaleDateString('pt-BR')}`
                    : "Desativado - As atividades do cronograma semanal não serão replicadas automaticamente"
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Switch
                checked={config.sincronizacaoAtiva}
                onCheckedChange={handleToggleSincronizacao}
                disabled={isSaving}
              />
              <span className="text-sm font-medium">
                {config.sincronizacaoAtiva ? "Ativado" : "Desativado"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legenda de cores */}
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-800">
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Legenda:</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-blue-700 dark:text-blue-300">Atividade manual</span>
            </div>
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-blue-700 dark:text-blue-300">Atividade sincronizada</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navegação do calendário */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={mesAnterior}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h3 className="text-xl font-bold">
          {MESES[mesAtual]} {anoAtual}
        </h3>
        <Button variant="outline" size="icon" onClick={mesProximo}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Calendário */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 border-b bg-gray-50 dark:bg-gray-800">
            {DIAS_SEMANA_ABREV.map(dia => (
              <div key={dia} className="p-2 text-center text-sm font-semibold text-gray-600 dark:text-gray-300">
                {dia}
              </div>
            ))}
          </div>
          
          {/* Dias do mês */}
          <div className="grid grid-cols-7">
            {diasDoMes.map((dia, index) => {
              const atividadesDoDia = getAtividadesDoDia(dia.data);
              const temAtividades = atividadesDoDia.length > 0;
              
              return (
                <div
                  key={index}
                  className={`
                    min-h-[100px] sm:min-h-[120px] p-1 sm:p-2 border-b border-r
                    ${!dia.isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900/50' : ''}
                    ${isHoje(dia.data) ? 'bg-blue-50 dark:bg-blue-950/30' : ''}
                  `}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`
                      text-sm font-medium
                      ${!dia.isCurrentMonth ? 'text-gray-400' : ''}
                      ${isHoje(dia.data) ? 'bg-blue-500 text-white px-2 py-0.5 rounded-full' : ''}
                    `}>
                      {dia.dia}
                    </span>
                    {dia.isCurrentMonth && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-50 hover:opacity-100"
                        onClick={() => handleAddAtividade(dia.data)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  
                  {/* Lista de atividades do dia */}
                  <div className="space-y-1 max-h-[80px] overflow-y-auto">
                    {atividadesDoDia.slice(0, 3).map(atividade => (
                      <div
                        key={atividade.id}
                        className="group relative flex items-center gap-1 px-1.5 py-0.5 rounded text-xs cursor-pointer hover:opacity-80"
                        style={{ backgroundColor: `${atividade.cor}20`, borderLeft: `3px solid ${atividade.cor}` }}
                        onClick={() => handleEditAtividade(atividade)}
                      >
                        {atividade.isManual ? (
                          <Star className="h-2.5 w-2.5 text-amber-500 flex-shrink-0" />
                        ) : (
                          <Link2 className="h-2.5 w-2.5 text-emerald-500 flex-shrink-0" />
                        )}
                        <span className="truncate" style={{ color: atividade.cor }}>
                          {getAtividadeNome(atividade)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 opacity-0 group-hover:opacity-100 absolute right-0 top-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAtividade(atividade.id!);
                          }}
                        >
                          <Trash2 className="h-2.5 w-2.5 text-red-500" />
                        </Button>
                      </div>
                    ))}
                    {atividadesDoDia.length > 3 && (
                      <button
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline px-1 cursor-pointer font-medium"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDayForDetail(dia.data);
                          setIsDayDetailDialogOpen(true);
                        }}
                      >
                        +{atividadesDoDia.length - 3} mais
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Dialog para adicionar/editar atividade */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingAtividade ? "Editar Atividade" : "Nova Atividade"}
            </DialogTitle>
            <DialogDescription>
              {selectedDate && `Data: ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Horários */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Horário Início</Label>
                <Input
                  type="time"
                  value={formData.horaInicio}
                  onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Horário Fim</Label>
                <Input
                  type="time"
                  value={formData.horaFim}
                  onChange={(e) => setFormData({ ...formData, horaFim: e.target.value })}
                />
              </div>
            </div>
            
            {/* Atividade */}
            <div className="space-y-2">
              <Label>Atividade</Label>
              <Select
                value={formData.atividade}
                onValueChange={(value) => setFormData({ 
                  ...formData, 
                  atividade: value,
                  cor: CORES_ATIVIDADES[value] || formData.cor
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a atividade" />
                </SelectTrigger>
                <SelectContent>
                  {ATIVIDADES_PADRAO.map(atividade => (
                    <SelectItem key={atividade} value={atividade}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: CORES_ATIVIDADES[atividade] || "#94a3b8" }}
                        />
                        {atividade}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Campo para atividade personalizada */}
            {formData.atividade === "Outra atividade" && (
              <>
                <div className="space-y-2">
                  <Label>Nome da Atividade</Label>
                  <Input
                    value={formData.atividadePersonalizada}
                    onChange={(e) => setFormData({ ...formData, atividadePersonalizada: e.target.value })}
                    placeholder="Ex: Curso de inglês"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <Input
                    type="color"
                    value={formData.cor}
                    onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                    className="h-10 w-full"
                  />
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAtividade} className="bg-gradient-to-r from-emerald-500 to-teal-500">
              {editingAtividade ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para configurar sincronização */}
      <Dialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Configurar Sincronização</DialogTitle>
            <DialogDescription>
              As atividades do seu Cronograma Semanal de Lista serão replicadas automaticamente na agenda até a data definida.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Data de Término da Sincronização</Label>
              <Input
                type="date"
                value={tempDataFimSync}
                onChange={(e) => setTempDataFimSync(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground">
                As atividades serão sincronizadas de hoje até esta data.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSyncDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              type="button"
              onClick={handleAbrirConfirmacaoSync}
              className="bg-gradient-to-r from-emerald-500 to-teal-500"
            >
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de sincronização */}
      <Dialog open={isConfirmSyncDialogOpen} onOpenChange={setIsConfirmSyncDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Confirmar Sincronização
            </DialogTitle>
            <DialogDescription>
              Você possui {atividades.filter(a => a.isManual).length} atividade(s) adicionada(s) manualmente na agenda.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm">
              O que deseja fazer com as atividades manuais existentes?
            </p>
            
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                <input
                  type="radio"
                  name="manterAtividades"
                  checked={manterAtividadesManuais}
                  onChange={() => setManterAtividadesManuais(true)}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium">Manter atividades manuais</p>
                  <p className="text-sm text-muted-foreground">
                    As atividades que você adicionou manualmente serão mantidas junto com as sincronizadas.
                  </p>
                </div>
              </label>
              
              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                <input
                  type="radio"
                  name="manterAtividades"
                  checked={!manterAtividadesManuais}
                  onChange={() => setManterAtividadesManuais(false)}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium">Excluir atividades manuais</p>
                  <p className="text-sm text-muted-foreground">
                    Apenas as atividades sincronizadas do cronograma semanal serão mantidas.
                  </p>
                </div>
              </label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmSyncDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAtivarSincronizacao} 
              className="bg-gradient-to-r from-emerald-500 to-teal-500"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                "Ativar Sincronização"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para escolher editar único ou todos */}
      <Dialog open={isEditSingleDialogOpen} onOpenChange={setIsEditSingleDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Atividade Sincronizada</DialogTitle>
            <DialogDescription>
              Esta atividade foi sincronizada do cronograma semanal. Como deseja editá-la?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                <input
                  type="radio"
                  name="editType"
                  checked={editSingleOrAll === 'single'}
                  onChange={() => setEditSingleOrAll('single')}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium">Apenas este dia</p>
                  <p className="text-sm text-muted-foreground">
                    A atividade será convertida para manual e editada apenas neste dia.
                  </p>
                </div>
              </label>
              
              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                <input
                  type="radio"
                  name="editType"
                  checked={editSingleOrAll === 'all'}
                  onChange={() => setEditSingleOrAll('all')}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium">Todos os dias desta atividade</p>
                  <p className="text-sm text-muted-foreground">
                    Você será direcionado para editar no cronograma semanal.
                  </p>
                </div>
              </label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditSingleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmEditType} className="bg-gradient-to-r from-emerald-500 to-teal-500">
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para ver todas as atividades do dia */}
      <Dialog open={isDayDetailDialogOpen} onOpenChange={setIsDayDetailDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-blue-500" />
              Atividades do Dia
            </DialogTitle>
            <DialogDescription>
              {selectedDayForDetail && new Date(selectedDayForDetail + 'T00:00:00').toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {selectedDayForDetail && getAtividadesDoDia(selectedDayForDetail).map(atividade => (
              <div
                key={atividade.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                style={{ borderLeft: `4px solid ${atividade.cor}` }}
              >
                <div className="flex items-center gap-3">
                  {atividade.isManual ? (
                    <Star className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  ) : (
                    <Link2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-medium" style={{ color: atividade.cor }}>
                      {getAtividadeNome(atividade)}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {atividade.horaInicio} - {atividade.horaFim}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setIsDayDetailDialogOpen(false);
                      handleEditAtividade(atividade);
                    }}
                  >
                    <Edit2 className="h-4 w-4 text-blue-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      handleDeleteAtividade(atividade.id!);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
            
            {selectedDayForDetail && getAtividadesDoDia(selectedDayForDetail).length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Nenhuma atividade neste dia.
              </p>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDayDetailDialogOpen(false);
                handleAddAtividade(selectedDayForDetail);
              }}
              className="mr-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Atividade
            </Button>
            <Button onClick={() => setIsDayDetailDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
