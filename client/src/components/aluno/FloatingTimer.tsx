import { useTimer } from "@/contexts/TimerContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Maximize2, Minimize2, Pause, Play, Square, Timer, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

export function FloatingTimer() {
  const { 
    ativo, 
    tempoDecorrido, 
    visivel, 
    minimizado, 
    iniciar, 
    pausar, 
    parar, 
    alternarMinimizado, 
    formatarTempo 
  } = useTimer();
  
  const [location, setLocation] = useLocation();

  if (!visivel) return null;

  const handleSalvar = () => {
    // Navega para a página de estudos com o parâmetro para abrir o modal de salvar
    if (location !== '/aluno/estudos') {
      setLocation('/aluno/estudos?action=save');
    } else {
      // Se já estiver na página, força um reload ou dispara um evento customizado
      // Como wouter não tem state na navegação, usamos query params
      window.location.href = '/aluno/estudos?action=save';
    }
  };

  return (
    <div className={cn(
      "fixed z-50 transition-all duration-300 ease-in-out shadow-2xl",
      minimizado 
        ? "bottom-4 right-4 w-auto" 
        : "bottom-4 right-4 w-80"
    )}>
      <Card className={cn(
        "border-2 border-blue-500/20 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60",
        minimizado ? "p-2 rounded-full" : "p-4 rounded-xl"
      )}>
        {minimizado ? (
          // Versão Minimizada
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-3 h-3 rounded-full animate-pulse",
              ativo ? "bg-green-500" : "bg-yellow-500"
            )} />
            <span className="font-mono font-bold text-sm text-blue-900">
              {formatarTempo(tempoDecorrido)}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 rounded-full hover:bg-blue-100"
              onClick={alternarMinimizado}
            >
              <Maximize2 className="h-3 w-3 text-blue-600" />
            </Button>
          </div>
        ) : (
          // Versão Expandida
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-sm text-blue-900">Cronômetro Ativo</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 -mr-2 hover:bg-blue-50"
                onClick={alternarMinimizado}
              >
                <Minimize2 className="h-4 w-4 text-gray-500" />
              </Button>
            </div>

            <div className="text-center py-2 bg-blue-50 rounded-lg border border-blue-100">
              <span className="font-mono text-3xl font-black text-blue-600 tracking-wider">
                {formatarTempo(tempoDecorrido)}
              </span>
            </div>

            <div className="flex items-center justify-center gap-2">
              {!ativo ? (
                <Button 
                  size="sm" 
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold"
                  onClick={iniciar}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Retomar
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold"
                  onClick={pausar}
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pausar
                </Button>
              )}
              
              <Button 
                size="sm" 
                className="w-auto px-3 bg-slate-800 hover:bg-slate-700 text-white"
                onClick={handleSalvar}
                title="Salvar Sessão"
              >
                <Save className="w-4 h-4" />
              </Button>

              <Button 
                size="sm" 
                variant="destructive"
                className="w-auto px-3"
                onClick={parar}
                title="Finalizar e Fechar"
              >
                <Square className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
