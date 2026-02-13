import { useTimer } from "@/contexts/TimerContext";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Pause, Play, Save, X } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function FloatingTimer() {
  const { 
    ativo, 
    tempoDecorrido, 
    visivel, 
    minimizado, 
    iniciar, 
    pausar, 
    alternarMinimizado,
    esconderTimer,
    formatarTempo 
  } = useTimer();
  
  const [location] = useLocation();
  const [salvando, setSalvando] = useState(false);

  // Não exibir se não estiver visível ou se o tempo for 0
  if (!visivel || tempoDecorrido === 0) {
    return null;
  }

  // Não exibir na página de estudos (já tem o cronômetro principal)
  if (location.includes('/aluno/estudos')) {
    return null;
  }

  const handleSalvarSessao = async () => {
    if (tempoDecorrido === 0) {
      toast.error("Nenhuma sessão para salvar");
      return;
    }

    setSalvando(true);
    
    // Simular salvamento (aqui você deve chamar a função real de salvar do AlunoEstudos)
    // Por enquanto, apenas mostra toast e redireciona
    toast.info("Redirecionando para salvar sessão...");
    
    // Redirecionar para a página de estudos onde o usuário pode salvar
    window.location.href = "/aluno/estudos?salvar=true";
  };

  if (minimizado) {
    return (
      <div 
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "bg-primary text-primary-foreground rounded-full shadow-2xl",
          "px-6 py-3 flex items-center gap-3",
          "animate-in slide-in-from-bottom-5 fade-in duration-300",
          "border-2 border-primary-foreground/20"
        )}
      >
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            ativo ? "bg-green-400 animate-pulse" : "bg-yellow-400"
          )} />
          <span className="font-mono text-lg font-semibold">
            {formatarTempo(tempoDecorrido)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={ativo ? pausar : iniciar}
            className={cn(
              "p-1.5 rounded-full hover:bg-primary-foreground/20",
              "transition-colors"
            )}
            title={ativo ? "Pausar" : "Continuar"}
          >
            {ativo ? <Pause size={16} /> : <Play size={16} />}
          </button>

          <button
            onClick={alternarMinimizado}
            className="p-1.5 rounded-full hover:bg-primary-foreground/20 transition-colors"
            title="Expandir"
          >
            <ChevronUp size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "bg-card text-card-foreground rounded-xl shadow-2xl",
        "p-4 w-80",
        "animate-in slide-in-from-bottom-5 fade-in duration-300",
        "border border-border"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2.5 h-2.5 rounded-full",
            ativo ? "bg-green-500 animate-pulse" : "bg-yellow-500"
          )} />
          <h3 className="font-semibold text-sm">
            {ativo ? "Cronômetro Ativo" : "Cronômetro Pausado"}
          </h3>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={alternarMinimizado}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            title="Minimizar"
          >
            <ChevronDown size={16} />
          </button>
          <button
            onClick={esconderTimer}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            title="Fechar"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="bg-muted rounded-lg p-4 mb-3">
        <div className="font-mono text-3xl font-bold text-center">
          {formatarTempo(tempoDecorrido)}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={ativo ? pausar : iniciar}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
            "font-medium transition-colors",
            ativo 
              ? "bg-yellow-500 hover:bg-yellow-600 text-white" 
              : "bg-green-500 hover:bg-green-600 text-white"
          )}
        >
          {ativo ? (
            <>
              <Pause size={18} />
              Pausar
            </>
          ) : (
            <>
              <Play size={18} />
              Continuar
            </>
          )}
        </button>

        <button
          onClick={handleSalvarSessao}
          disabled={salvando}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
            "bg-primary hover:bg-primary/90 text-primary-foreground",
            "font-medium transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <Save size={18} />
          Salvar
        </button>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-3">
        Vá para Estudos para registrar os detalhes da sessão
      </p>
    </div>
  );
}
