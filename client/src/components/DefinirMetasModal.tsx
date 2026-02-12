import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Target } from "lucide-react";
import { getMetaMentor, salvarMetaMentor, formatarTempo } from "@/services/metasMentor";
import { useAuth } from "@/hooks/useAuth";

interface DefinirMetasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aluno: {
    id: string;
    nome: string;
  } | null;
  onMetaSalva?: () => void;
}

export function DefinirMetasModal({ open, onOpenChange, aluno, onMetaSalva }: DefinirMetasModalProps) {
  const { user } = useAuth();
  const [horas, setHoras] = useState<string>("0");
  const [minutos, setMinutos] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Carregar meta existente quando o modal abrir
  useEffect(() => {
    if (open && aluno) {
      carregarMeta();
    }
  }, [open, aluno]);

  const carregarMeta = async () => {
    if (!aluno) return;
    
    try {
      setIsLoading(true);
      const meta = await getMetaMentor(aluno.id);
      
      if (meta) {
        setHoras(meta.tempoMedioDiario.horas.toString());
        setMinutos(meta.tempoMedioDiario.minutos.toString());
      } else {
        // Resetar para valores padrão se não houver meta
        setHoras("0");
        setMinutos("0");
      }
    } catch (error) {
      console.error("Erro ao carregar meta:", error);
      toast.error("Erro ao carregar meta do aluno");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSalvar = async () => {
    if (!aluno || !user) return;
    
    const horasNum = parseInt(horas) || 0;
    const minutosNum = parseInt(minutos) || 0;
    
    // Validar valores
    if (horasNum < 0 || horasNum > 24) {
      toast.error("Horas devem estar entre 0 e 24");
      return;
    }
    
    if (minutosNum < 0 || minutosNum > 59) {
      toast.error("Minutos devem estar entre 0 e 59");
      return;
    }
    
    if (horasNum === 0 && minutosNum === 0) {
      toast.error("Defina um tempo maior que zero");
      return;
    }
    
    try {
      setIsSaving(true);
      
      await salvarMetaMentor(
        aluno.id,
        { horas: horasNum, minutos: minutosNum },
        user.uid
      );
      
      toast.success(`Meta definida: ${formatarTempo(horasNum, minutosNum)} por dia`);
      onOpenChange(false);
      
      if (onMetaSalva) {
        onMetaSalva();
      }
    } catch (error) {
      console.error("Erro ao salvar meta:", error);
      toast.error("Erro ao salvar meta");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Definir Metas - {aluno?.nome}
          </DialogTitle>
          <DialogDescription>
            Configure metas específicas para este aluno. As metas aparecerão nos gráficos e relatórios.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Carregando meta atual...
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Meta de Tempo Médio Diário */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                <Label className="text-base font-semibold">Tempo Médio Diário de Estudos</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Defina o tempo que o aluno deve estudar por dia em média. Esta meta será exibida como uma linha laranja no gráfico de histórico de estudos.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="horas">Horas</Label>
                  <Input
                    id="horas"
                    type="number"
                    min="0"
                    max="24"
                    value={horas}
                    onChange={(e) => setHoras(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minutos">Minutos</Label>
                  <Input
                    id="minutos"
                    type="number"
                    min="0"
                    max="59"
                    value={minutos}
                    onChange={(e) => setMinutos(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              
              {(parseInt(horas) > 0 || parseInt(minutos) > 0) && (
                <div className="rounded-lg bg-orange-50 border border-orange-200 p-3">
                  <p className="text-sm text-orange-800">
                    <span className="font-semibold">Meta definida:</span>{" "}
                    {formatarTempo(parseInt(horas) || 0, parseInt(minutos) || 0)} por dia
                  </p>
                </div>
              )}
            </div>

            {/* Informação sobre análise */}
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">ℹ️ Como funciona:</span> A plataforma analisa a média de estudos da semana anterior (domingo a sábado) e indica se o aluno não atingiu a meta.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={isLoading || isSaving}>
            {isSaving ? "Salvando..." : "Salvar Meta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
