import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Copy, Clipboard, Trash2, Clock, Edit2, CheckCircle, Loader2, GripVertical, ListTodo, Info } from "lucide-react";
import { toast } from "sonner";
import { collection, doc, getDocs, setDoc, deleteDoc, writeBatch, Timestamp, query, orderBy } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useEffectiveUserId } from "@/contexts/MentorViewContext";
import { CronogramaSkeleton } from "@/components/ui/skeleton-loader";

// Dias da semana
const DIAS_SEMANA = [
  { value: 0, label: "Domingo", short: "Dom" },
  { value: 1, label: "Segunda", short: "Seg" },
  { value: 2, label: "Terça", short: "Ter" },
  { value: 3, label: "Quarta", short: "Qua" },
  { value: 4, label: "Quinta", short: "Qui" },
  { value: 5, label: "Sexta", short: "Sex" },
  { value: 6, label: "Sábado", short: "Sáb" },
];

// Atividades padrão (matérias do ENEM + atividades extras)
const ATIVIDADES_PADRAO = [
  // Matérias do ENEM
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
  // Atividades extras
  "Dormir",
  "Atividade física",
  "Igreja",
  // Opção para outras
  "Outra atividade",
];

// Cores para as atividades
const CORES_ATIVIDADES: Record<string, string> = {
  "Matemática": "#3b82f6",
  "Biologia": "#10b981",
  "Física": "#f59e0b",
  "Química": "#ef4444",
  "História": "#8b5cf6",
  "Geografia": "#ec4899",
  "Filosofia": "#06b6d4",
  "Sociologia": "#f97316",
  "Linguagens": "#84cc16",
  "Redação": "#14b8a6",
  "Revisão": "#a855f7",
  "Simulado": "#f43f5e",
  "Correção de simulado": "#0ea5e9",
  "Preenchimento de lacunas": "#eab308",
  "Dormir": "#6366f1",
  "Atividade física": "#22c55e",
  "Igreja": "#d946ef",
  "Outra atividade": "#94a3b8",
};

// Interface para atividade
interface Atividade {
  id?: string;
  diaSemana: number;
  horaInicio: string;
  horaFim: string;
  atividade: string;
  atividadePersonalizada?: string;
  cor: string;
  createdAt?: Date;
}

export default function CronogramaLista() {
  const effectiveUserId = useEffectiveUserId();
  
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Estado para modal de adicionar/editar
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAtividade, setEditingAtividade] = useState<Atividade | null>(null);
  const [formData, setFormData] = useState<Atividade>({
    diaSemana: 1,
    horaInicio: "08:00",
    horaFim: "09:00",
    atividade: "",
    atividadePersonalizada: "",
    cor: "#3b82f6",
  });
  
  // Estado para copiar/colar
  const [copiedAtividade, setCopiedAtividade] = useState<Atividade | null>(null);
  
  // Refs para auto-save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasUnsavedChanges = useRef(false);
  const atividadesRef = useRef<Atividade[]>([]);
  const userIdRef = useRef<string | null>(null);

  // Atualizar refs
  useEffect(() => {
    atividadesRef.current = atividades;
  }, [atividades]);

  useEffect(() => {
    userIdRef.current = effectiveUserId;
  }, [effectiveUserId]);

  // Carregar atividades
  useEffect(() => {
    if (!effectiveUserId) return;
    
    const loadData = async () => {
      setIsLoading(true);
      hasUnsavedChanges.current = false;
      try {
        await loadAtividades();
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (hasUnsavedChanges.current && userIdRef.current) {
        saveAtividadesImmediate(atividadesRef.current, userIdRef.current);
      }
    };
  }, [effectiveUserId]);

  const loadAtividades = async () => {
    try {
      const userId = effectiveUserId || auth.currentUser?.uid;
      if (!userId) throw new Error("Usuário não autenticado");

      const atividadesRef = collection(db, "alunos", userId, "cronograma_lista");
      const q = query(atividadesRef, orderBy("diaSemana"), orderBy("horaInicio"));
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Atividade[];
      
      setAtividades(data);
      setSaveStatus('idle');
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar atividades");
    }
  };

  const saveAtividadesImmediate = async (data: Atividade[], userId: string) => {
    try {
      const atividadesCollRef = collection(db, "alunos", userId, "cronograma_lista");
      const snapshot = await getDocs(atividadesCollRef);
      
      const batch = writeBatch(db);
      
      // Mapear IDs existentes no Firestore
      const existingIds = new Set(snapshot.docs.map(d => d.id));
      
      // IDs das atividades atuais (excluindo IDs temporários)
      const currentIds = new Set(data.filter(a => a.id && !a.id.startsWith('temp_')).map(a => a.id));
      
      // Deletar atividades que foram removidas
      snapshot.docs.forEach(docSnap => {
        if (!currentIds.has(docSnap.id)) {
          batch.delete(docSnap.ref);
        }
      });
      
      // Adicionar ou atualizar atividades
      data.forEach(atividade => {
        const { id, ...atividadeData } = atividade;
        
        if (id && !id.startsWith('temp_') && existingIds.has(id)) {
          // Atualizar existente
          const docRef = doc(atividadesCollRef, id);
          batch.update(docRef, {
            ...atividadeData,
            updatedAt: Timestamp.now()
          });
        } else {
          // Criar nova
          const newDocRef = doc(atividadesCollRef);
          batch.set(newDocRef, {
            ...atividadeData,
            createdAt: Timestamp.now()
          });
        }
      });
      
      await batch.commit();
      
      // Recarregar atividades para obter IDs corretos do Firestore
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
        await saveAtividadesImmediate(atividadesRef.current, userIdRef.current);
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

  const handleAddAtividade = () => {
    setEditingAtividade(null);
    setFormData({
      diaSemana: 1,
      horaInicio: "08:00",
      horaFim: "09:00",
      atividade: "",
      atividadePersonalizada: "",
      cor: "#3b82f6",
    });
    setIsDialogOpen(true);
  };

  const handleEditAtividade = (atividade: Atividade) => {
    setEditingAtividade(atividade);
    setFormData({
      ...atividade,
      atividadePersonalizada: atividade.atividadePersonalizada || "",
    });
    setIsDialogOpen(true);
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
    
    // Para "Outra atividade", usar a cor selecionada pelo usuário
    // Para atividades padrão, usar a cor definida em CORES_ATIVIDADES
    const corFinal = formData.atividade === "Outra atividade" 
      ? formData.cor 
      : (CORES_ATIVIDADES[formData.atividade] || formData.cor);
    
    const novaAtividade: Atividade = {
      ...formData,
      cor: corFinal,
    };
    
    if (editingAtividade) {
      // Editar existente
      setAtividades(prev => prev.map(a => 
        a.id === editingAtividade.id ? { ...novaAtividade, id: a.id } : a
      ));
      toast.success("Atividade atualizada!");
    } else {
      // Adicionar nova
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

  const handleCopyAtividade = (atividade: Atividade) => {
    setCopiedAtividade(atividade);
    toast.success("Atividade copiada! Clique em 'Colar' no dia desejado.");
  };

  const handlePasteAtividade = (diaSemana: number) => {
    if (!copiedAtividade) {
      toast.error("Nenhuma atividade copiada");
      return;
    }
    
    const novaAtividade: Atividade = {
      ...copiedAtividade,
      id: `temp_${Date.now()}`,
      diaSemana,
    };
    
    setAtividades(prev => [...prev, novaAtividade]);
    toast.success("Atividade colada!");
    triggerAutoSave();
  };

  // Agrupar atividades por dia
  const atividadesPorDia = DIAS_SEMANA.map(dia => ({
    ...dia,
    atividades: atividades
      .filter(a => a.diaSemana === dia.value)
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)),
  }));

  // Calcular total de horas por dia
  const calcularHorasDia = (atividadesDia: Atividade[]) => {
    let totalMinutos = 0;
    atividadesDia.forEach(a => {
      const [horaInicio, minInicio] = a.horaInicio.split(':').map(Number);
      const [horaFim, minFim] = a.horaFim.split(':').map(Number);
      const minutos = (horaFim * 60 + minFim) - (horaInicio * 60 + minInicio);
      totalMinutos += minutos;
    });
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    return minutos > 0 ? `${horas}h${minutos}min` : `${horas}h`;
  };

  const getAtividadeNome = (atividade: Atividade) => {
    if (atividade.atividade === "Outra atividade" && atividade.atividadePersonalizada) {
      return atividade.atividadePersonalizada;
    }
    return atividade.atividade;
  };

  if (isLoading) {
    return <CronogramaSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header com status de salvamento e dica de copiar/colar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
            <ListTodo className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Lista de Atividades</h2>
            <p className="text-sm text-muted-foreground">Organize sua semana de forma visual</p>
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
          
          <Button onClick={handleAddAtividade} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Atividade
          </Button>
        </div>
      </div>

      {/* Dica de copiar/colar */}
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-800">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Dica:</strong> Clique no ícone <Copy className="h-4 w-4 inline mx-1" /> para copiar uma atividade e depois clique em <Clipboard className="h-4 w-4 inline mx-1" /> "Colar" no dia desejado para duplicá-la rapidamente.
              {copiedAtividade && (
                <span className="ml-2 px-2 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs">
                  Atividade copiada: {getAtividadeNome(copiedAtividade)}
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Grid de dias da semana */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4">
        {atividadesPorDia.map(dia => (
          <Card key={dia.value} className="overflow-hidden border-2 border-blue-400 dark:border-blue-500 shadow-md rounded-xl bg-white dark:bg-gray-900">
            <div className="py-3 px-4 border-b-2 border-blue-400 dark:border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-gray-800 dark:text-gray-100">{dia.label}</CardTitle>
                  <CardDescription className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    {dia.atividades.length > 0 
                      ? calcularHorasDia(dia.atividades)
                      : "Nenhuma atividade"}
                  </CardDescription>
                </div>
                {copiedAtividade && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePasteAtividade(dia.value)}
                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                  >
                    <Clipboard className="h-4 w-4 mr-1" />
                    Colar
                  </Button>
                )}
              </div>
            </div>
            <CardContent className="pt-3 space-y-2 min-h-[200px]">
              {dia.atividades.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <Clock className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma atividade</p>
                </div>
              ) : (
                dia.atividades.map(atividade => (
                  <div
                    key={atividade.id}
                    className="group relative p-3 rounded-xl border-2 shadow-sm hover:shadow-lg transition-all"
                    style={{ 
                      borderColor: atividade.cor,
                      backgroundColor: `${atividade.cor}10`
                    }}
                  >
                    {/* Horário */}
                    <div 
                      className="flex items-center gap-2 text-xs font-semibold mb-2 px-2 py-1 rounded-md w-fit"
                      style={{ 
                        backgroundColor: atividade.cor,
                        color: 'white'
                      }}
                    >
                      <Clock className="h-3 w-3" />
                      <span>{atividade.horaInicio} - {atividade.horaFim}</span>
                    </div>
                    
                    {/* Nome da atividade - texto completo com quebra de linha */}
                    <p 
                      className="font-bold text-sm leading-tight break-words"
                      style={{ color: atividade.cor }}
                    >
                      {getAtividadeNome(atividade)}
                    </p>
                    
                    {/* Ações - botões flutuantes no canto */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-gray-800/90 rounded-lg p-1 shadow-md">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleCopyAtividade(atividade)}
                        title="Copiar atividade"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEditAtividade(atividade)}
                        title="Editar atividade"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteAtividade(atividade.id!)}
                        title="Remover atividade"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog para adicionar/editar atividade */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingAtividade ? "Editar Atividade" : "Nova Atividade"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da atividade abaixo.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Dia da semana */}
            <div className="space-y-2">
              <Label>Dia da Semana</Label>
              <Select
                value={String(formData.diaSemana)}
                onValueChange={(value) => setFormData({ ...formData, diaSemana: Number(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o dia" />
                </SelectTrigger>
                <SelectContent>
                  {DIAS_SEMANA.map(dia => (
                    <SelectItem key={dia.value} value={String(dia.value)}>
                      {dia.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
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
              <div className="space-y-2">
                <Label>Nome da Atividade</Label>
                <Input
                  placeholder="Ex: Curso de inglês, Trabalho..."
                  value={formData.atividadePersonalizada}
                  onChange={(e) => setFormData({ ...formData, atividadePersonalizada: e.target.value })}
                />
              </div>
            )}
            
            {/* Cor personalizada para atividade personalizada */}
            {formData.atividade === "Outra atividade" && (
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex gap-2 flex-wrap">
                  {Object.values(CORES_ATIVIDADES).filter((v, i, a) => a.indexOf(v) === i).slice(0, 10).map(cor => (
                    <button
                      key={cor}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${formData.cor === cor ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: cor }}
                      onClick={() => setFormData({ ...formData, cor })}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAtividade} className="bg-gradient-to-r from-purple-500 to-pink-500">
              {editingAtividade ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
