import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CronogramaCell from "@/components/CronogramaCell";
import { Calendar, Save, Copy, Palette, Zap, Clock, Sparkles, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
// Acesso direto ao Firestore (elimina cold start de ~20s)
import {
  getHorariosDirect,
  replaceAllHorarios
} from "@/lib/firestore-direct";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CronogramaSkeleton } from "@/components/ui/skeleton-loader";
// Importar o hook para obter o ID do usuário efetivo (suporte a visualização do mentor)
import { useEffectiveUserId } from "@/contexts/MentorViewContext";

type TimeSlot = {
  day: number;
  hour: number;
  minute: number;
  activity: string;
  color: string;
};

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 30];

const COLORS = [
  { name: "Laranja", value: "#FFA500" },
  { name: "Azul", value: "#4A90E2" },
  { name: "Verde", value: "#50C878" },
  { name: "Rosa", value: "#FF69B4" },
  { name: "Roxo", value: "#9B59B6" },
  { name: "Amarelo", value: "#FFD700" },
  { name: "Vermelho", value: "#E74C3C" },
  { name: "Cinza", value: "#95A5A6" },
  { name: "Branco", value: "#FFFFFF" },
];

export default function AlunoCronograma() {
  // Obter o ID do usuário efetivo (aluno logado ou aluno sendo visualizado pelo mentor)
  const effectiveUserId = useEffectiveUserId();
  
  const [schedule, setSchedule] = useState<TimeSlot[]>([]);
  const [copiedCell, setCopiedCell] = useState<TimeSlot | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [draggedCell, setDraggedCell] = useState<{ day: number; hour: number; minute: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Estado para Popover global de cores (otimização: evita 336 Popovers)
  const [colorPickerCell, setColorPickerCell] = useState<{ day: number; hour: number; minute: number } | null>(null);

  // Ref para debounce do auto-save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Ref para rastrear se houve mudanças desde o último save
  const hasUnsavedChanges = useRef(false);
  // Ref para o schedule atual (para uso no auto-save)
  const scheduleRef = useRef<TimeSlot[]>([]);
  // Ref para o userId atual
  const userIdRef = useRef<string | null>(null);

  // Atualizar refs quando schedule ou userId mudar
  useEffect(() => {
    scheduleRef.current = schedule;
  }, [schedule]);

  useEffect(() => {
    userIdRef.current = effectiveUserId;
  }, [effectiveUserId]);

  // Carregar dados quando o userId mudar
  useEffect(() => {
    if (!effectiveUserId) return;
    
    const loadData = async () => {
      setIsLoading(true);
      hasUnsavedChanges.current = false;
      try {
        await loadSchedule();
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
    
    // Cleanup: salvar mudanças pendentes ao desmontar ou mudar de usuário
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Salvar mudanças pendentes antes de desmontar
      if (hasUnsavedChanges.current && userIdRef.current) {
        saveScheduleImmediate(scheduleRef.current, userIdRef.current);
      }
    };
  }, [effectiveUserId]);

  const loadSchedule = async () => {
    try {
      // Acesso direto ao Firestore usando o ID do usuário efetivo
      const horarios = await getHorariosDirect(effectiveUserId);
      
      const slots: TimeSlot[] = [];
      horarios.forEach((h: any) => {
        const [horaInicio, minutoInicio] = h.horaInicio.split(':').map(Number);
        const [horaFim, minutoFim] = h.horaFim.split(':').map(Number);
        
        let currentHour = horaInicio;
        let currentMinute = minutoInicio;
        
        while (currentHour < horaFim || (currentHour === horaFim && currentMinute < minutoFim)) {
          slots.push({
            day: h.diaSemana,
            hour: currentHour,
            minute: currentMinute,
            activity: h.materia + (h.descricao ? ` - ${h.descricao}` : ''),
            color: h.cor || "#FFFFFF",
          });
          
          currentMinute += 30;
          if (currentMinute >= 60) {
            currentMinute = 0;
            currentHour++;
          }
        }
      });
      
      setSchedule(slots);
      setSaveStatus('idle');
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar cronograma");
    }
  };

  const getCellKey = (day: number, hour: number, minute: number) => 
    `${day}-${hour}-${minute}`;

  // Otimização: Converter schedule para Map para lookup O(1) em vez de O(N)
  const scheduleMap = useMemo(() => {
    const map = new Map<string, TimeSlot>();
    schedule.forEach(s => map.set(getCellKey(s.day, s.hour, s.minute), s));
    return map;
  }, [schedule]);

  // Otimizado: usa Map em vez de .find()
  const getSlot = useCallback((day: number, hour: number, minute: number): TimeSlot => {
    const key = getCellKey(day, hour, minute);
    return scheduleMap.get(key) || { day, hour, minute, activity: "", color: "#FFFFFF" };
  }, [scheduleMap]);

  // Função para converter schedule em horários para salvar
  const convertScheduleToHorarios = (scheduleData: TimeSlot[]) => {
    const sortedSchedule = [...scheduleData]
      .filter(s => s.activity)
      .sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        if (a.hour !== b.hour) return a.hour - b.hour;
        return a.minute - b.minute;
      });
    
    const groupedSlots: Array<{ day: number; startHour: number; startMinute: number; endHour: number; endMinute: number; activity: string; color: string }> = [];
    
    sortedSchedule.forEach(slot => {
      const lastGroup = groupedSlots[groupedSlots.length - 1];
      
      if (
        lastGroup &&
        lastGroup.day === slot.day &&
        lastGroup.activity === slot.activity &&
        lastGroup.color === slot.color &&
        (
          (lastGroup.endHour === slot.hour && lastGroup.endMinute === slot.minute) ||
          (lastGroup.endHour === slot.hour - 1 && lastGroup.endMinute === 30 && slot.minute === 0)
        )
      ) {
        lastGroup.endHour = slot.hour;
        lastGroup.endMinute = slot.minute + 30;
        if (lastGroup.endMinute >= 60) {
          lastGroup.endMinute = 0;
          lastGroup.endHour++;
        }
      } else {
        groupedSlots.push({
          day: slot.day,
          startHour: slot.hour,
          startMinute: slot.minute,
          endHour: slot.hour,
          endMinute: slot.minute + 30,
          activity: slot.activity,
          color: slot.color,
        });
        
        if (groupedSlots[groupedSlots.length - 1].endMinute >= 60) {
          groupedSlots[groupedSlots.length - 1].endMinute = 0;
          groupedSlots[groupedSlots.length - 1].endHour++;
        }
      }
    });
    
    return groupedSlots.map(g => ({
      diaSemana: g.day,
      horaInicio: `${String(g.startHour).padStart(2, '0')}:${String(g.startMinute).padStart(2, '0')}`,
      horaFim: `${String(g.endHour).padStart(2, '0')}:${String(g.endMinute).padStart(2, '0')}`,
      materia: g.activity.split(' - ')[0].trim(),
      descricao: g.activity.split(' - ').slice(1).join(' - ').trim() || '',
      cor: g.color,
    }));
  };

  // Função para salvar imediatamente (usada no cleanup)
  const saveScheduleImmediate = async (scheduleData: TimeSlot[], userId: string) => {
    try {
      const horarios = convertScheduleToHorarios(scheduleData);
      await replaceAllHorarios(horarios, userId);
    } catch (error) {
      console.error("Erro ao salvar cronograma:", error);
    }
  };

  // Função de auto-save com debounce
  const triggerAutoSave = useCallback(() => {
    hasUnsavedChanges.current = true;
    setSaveStatus('saving');
    
    // Cancelar save anterior se existir
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Agendar novo save após 1.5 segundos de inatividade
    saveTimeoutRef.current = setTimeout(async () => {
      if (!userIdRef.current) return;
      
      try {
        const horarios = convertScheduleToHorarios(scheduleRef.current);
        await replaceAllHorarios(horarios, userIdRef.current);
        hasUnsavedChanges.current = false;
        setSaveStatus('saved');
        
        // Resetar status após 2 segundos
        setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      } catch (error: any) {
        console.error("Erro ao salvar cronograma:", error);
        setSaveStatus('error');
        toast.error("Erro ao salvar cronograma. Tente novamente.");
      }
    }, 1500);
  }, []);

  const updateSlot = useCallback((day: number, hour: number, minute: number, updates: Partial<TimeSlot>) => {
    const key = getCellKey(day, hour, minute);
    const existing = scheduleMap.has(key);

    if (existing) {
      setSchedule(prev => prev.map(s => 
        s.day === day && s.hour === hour && s.minute === minute
          ? { ...s, ...updates }
          : s
      ));
    } else {
      setSchedule(prev => [...prev, { day, hour, minute, activity: "", color: "#FFFFFF", ...updates }]);
    }
    
    // Disparar auto-save
    triggerAutoSave();
  }, [scheduleMap, triggerAutoSave]);

  // Handlers otimizados com useCallback para evitar re-renders desnecessários
  const handleCopy = useCallback((day: number, hour: number, minute: number) => {
    const slot = getSlot(day, hour, minute);
    setCopiedCell(slot);
    toast.success("Célula copiada!");
  }, [getSlot]);

  const handlePaste = useCallback((day: number, hour: number, minute: number) => {
    if (!copiedCell) {
      toast.error("Nenhuma célula copiada");
      return;
    }
    updateSlot(day, hour, minute, {
      activity: copiedCell.activity,
      color: copiedCell.color,
    });
    toast.success("Célula colada!");
  }, [copiedCell, updateSlot]);

  const handleDragStart = useCallback((day: number, hour: number, minute: number) => {
    setDraggedCell({ day, hour, minute });
  }, []);

  const handleDrop = useCallback((targetDay: number, targetHour: number, targetMinute: number) => {
    if (!draggedCell) return;

    const sourceSlot = getSlot(draggedCell.day, draggedCell.hour, draggedCell.minute);
    const targetSlot = getSlot(targetDay, targetHour, targetMinute);

    updateSlot(targetDay, targetHour, targetMinute, {
      activity: sourceSlot.activity,
      color: sourceSlot.color,
    });

    updateSlot(draggedCell.day, draggedCell.hour, draggedCell.minute, {
      activity: targetSlot.activity,
      color: targetSlot.color,
    });

    setDraggedCell(null);
    toast.success("Atividade movida!");
  }, [draggedCell, getSlot, updateSlot]);

  // Callbacks estáveis para o componente CronogramaCell
  const handleStartEdit = useCallback((cellKey: string) => {
    setEditingCell(cellKey);
  }, []);

  const handleStopEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  const handleActivityChange = useCallback((day: number, hour: number, minute: number, activity: string) => {
    updateSlot(day, hour, minute, { activity });
  }, [updateSlot]);

  const handleColorPickerOpen = useCallback((day: number, hour: number, minute: number) => {
    setColorPickerCell({ day, hour, minute });
  }, []);

  const formatTime = (hour: number, minute: number) => 
    `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  if (isLoading) {
    return (
      <div className="space-y-8 pb-8">
        <CronogramaSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Indicador de Status de Salvamento */}
      <div className="flex justify-end items-center gap-2">
        {saveStatus === 'saving' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1.5 rounded-full border border-yellow-200 dark:border-yellow-800">
            <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
            <span>Salvando...</span>
          </div>
        )}
        {saveStatus === 'saved' && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full border border-green-200 dark:border-green-800">
            <CheckCircle className="h-4 w-4" />
            <span>Salvo automaticamente</span>
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-full border border-red-200 dark:border-red-800">
            <span>Erro ao salvar</span>
          </div>
        )}
      </div>

      {/* Instruções Premium */}
      <Card className="border-2 hover:shadow-xl transition-shadow animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl font-black">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            Instruções
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-indigo-500/5 to-purple-500/5 border-2 border-indigo-500/10">
            <div className="p-2 bg-indigo-500 rounded-lg">
              <span className="text-white font-bold text-sm">1</span>
            </div>
            <div>
              <p className="font-bold text-sm">Editar</p>
              <p className="text-sm text-muted-foreground">Clique em uma célula para digitar a atividade</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-purple-500/5 to-pink-500/5 border-2 border-purple-500/10">
            <div className="p-2 bg-purple-500 rounded-lg">
              <span className="text-white font-bold text-sm">2</span>
            </div>
            <div>
              <p className="font-bold text-sm">Cor</p>
              <p className="text-sm text-muted-foreground">Clique no ícone de paleta para escolher a cor</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-pink-500/5 to-rose-500/5 border-2 border-pink-500/10">
            <div className="p-2 bg-pink-500 rounded-lg">
              <span className="text-white font-bold text-sm">3</span>
            </div>
            <div>
              <p className="font-bold text-sm">Copiar/Colar</p>
              <p className="text-sm text-muted-foreground">Clique com botão direito para copiar e colar</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-rose-500/5 to-orange-500/5 border-2 border-rose-500/10">
            <div className="p-2 bg-rose-500 rounded-lg">
              <span className="text-white font-bold text-sm">4</span>
            </div>
            <div>
              <p className="font-bold text-sm">Auto-Save</p>
              <p className="text-sm text-muted-foreground">Suas alterações são salvas automaticamente</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grade Semanal Premium */}
      <Card className="border-2 hover:shadow-xl transition-shadow animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl font-black">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl shadow-lg">
              <Clock className="h-5 w-5 text-white" />
            </div>
            Grade Semanal
          </CardTitle>
          <CardDescription className="text-base">
            Intervalos de 30 minutos • Clique para editar • Arraste para mover • Clique direito para copiar/colar
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-[900px]">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border-2 border-border bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 p-3 text-sm font-black sticky left-0 z-10">
                    Horário
                  </th>
                  {DAYS.map((day, index) => (
                    <th key={index} className="border-2 border-border bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 p-3 text-sm font-black">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map(hour =>
                  MINUTES.map(minute => {
                    const timeKey = `${hour}-${minute}`;
                    return (
                      <tr key={timeKey}>
                        <td className="border-2 border-border bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-3 text-xs font-mono font-bold sticky left-0 z-10">
                          {formatTime(hour, minute)}
                        </td>
                        {DAYS.map((_, dayIndex) => {
                          const slot = getSlot(dayIndex, hour, minute);
                          const cellKey = getCellKey(dayIndex, hour, minute);
                          const isEditing = editingCell === cellKey;

                          return (
                            <CronogramaCell
                              key={cellKey}
                              day={dayIndex}
                              hour={hour}
                              minute={minute}
                              slot={slot}
                              isEditing={isEditing}
                              onStartEdit={() => handleStartEdit(cellKey)}
                              onStopEdit={handleStopEdit}
                              onActivityChange={(activity) => handleActivityChange(dayIndex, hour, minute, activity)}
                              onColorPickerOpen={() => handleColorPickerOpen(dayIndex, hour, minute)}
                              onCopy={() => handleCopy(dayIndex, hour, minute)}
                              onPaste={() => handlePaste(dayIndex, hour, minute)}
                              onDragStart={() => handleDragStart(dayIndex, hour, minute)}
                              onDrop={() => handleDrop(dayIndex, hour, minute)}
                              hasCopiedCell={copiedCell !== null}
                            />
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Global para Seletor de Cores (otimização: 1 dialog em vez de 336 Popovers) */}
      <Dialog open={colorPickerCell !== null} onOpenChange={(open) => !open && setColorPickerCell(null)}>
        <DialogContent className="w-auto max-w-xs border-2">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Escolher Cor</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 py-2">
            {COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => {
                  if (colorPickerCell) {
                    updateSlot(colorPickerCell.day, colorPickerCell.hour, colorPickerCell.minute, { color: color.value });
                    setColorPickerCell(null);
                  }
                }}
                className="w-12 h-12 rounded-lg border-2 border-border hover:scale-110 hover:shadow-lg transition-all"
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }
        
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float-delayed 10s ease-in-out infinite;
        }
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
        
        .animate-slide-up {
          animation: slide-up 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
