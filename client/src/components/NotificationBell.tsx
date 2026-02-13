import { Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/AuthContext";

interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  criadaEm: any;
  tarefaId?: string;
  alunoId?: string;
}

export function NotificationBell() {
  const { user } = useAuthContext();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user) {
      carregarNotificacoes();
      // Atualizar a cada 30 segundos
      const interval = setInterval(carregarNotificacoes, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const carregarNotificacoes = async () => {
    try {
      // @ts-ignore
      const result = await window.firebase.functions().httpsCallable("getNotificacoes")({});
      setNotificacoes(result.data || []);
      
      // Contar não lidas
      const count = (result.data || []).filter((n: Notificacao) => !n.lida).length;
      setNaoLidas(count);
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
    }
  };

  const marcarComoLida = async (notificacaoId: string) => {
    try {
      // @ts-ignore
      await window.firebase.functions().httpsCallable("marcarNotificacaoLida")({
        notificacaoId,
      });
      
      // Atualizar localmente
      setNotificacoes((prev) =>
        prev.map((n) => (n.id === notificacaoId ? { ...n, lida: true } : n))
      );
      setNaoLidas((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
    }
  };

  const marcarTodasComoLidas = async () => {
    try {
      setLoading(true);
      // @ts-ignore
      await window.firebase.functions().httpsCallable("marcarTodasNotificacoesLidas")({});
      
      // Atualizar localmente
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
      setNaoLidas(0);
      toast.success("Todas as notificações foram marcadas como lidas");
    } catch (error) {
      console.error("Erro ao marcar todas como lidas:", error);
      toast.error("Erro ao marcar notificações como lidas");
    } finally {
      setLoading(false);
    }
  };

  const deletarNotificacao = async (notificacaoId: string) => {
    try {
      // @ts-ignore
      await window.firebase.functions().httpsCallable("deletarNotificacao")({
        notificacaoId,
      });
      
      // Remover localmente
      setNotificacoes((prev) => prev.filter((n) => n.id !== notificacaoId));
      toast.success("Notificação removida");
    } catch (error) {
      console.error("Erro ao deletar notificação:", error);
      toast.error("Erro ao remover notificação");
    }
  };

  const getIconeNotificacao = (tipo: string) => {
    switch (tipo) {
      case "nova_tarefa":
        return "📝";
      case "tarefa_concluida":
        return "✅";
      case "tarefa_proxima_prazo":
        return "⏰";
      case "tarefas_atrasadas":
        return "⚠️";
      case "meta_concluida":
        return "🎯";
      case "meta_criada":
        return "🆕";
      default:
        return "🔔";
    }
  };

  const formatarData = (timestamp: any) => {
    if (!timestamp) return "";
    
    const date = timestamp._seconds
      ? new Date(timestamp._seconds * 1000)
      : new Date(timestamp);
    
    const agora = new Date();
    const diff = agora.getTime() - date.getTime();
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);

    if (minutos < 1) return "Agora";
    if (minutos < 60) return `${minutos}m atrás`;
    if (horas < 24) return `${horas}h atrás`;
    if (dias < 7) return `${dias}d atrás`;
    
    return date.toLocaleDateString("pt-BR");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {naoLidas > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {naoLidas > 9 ? "9+" : naoLidas}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Notificações</span>
            {naoLidas > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={marcarTodasComoLidas}
                disabled={loading}
              >
                Marcar todas como lidas
              </Button>
            )}
          </SheetTitle>
          <SheetDescription>
            {naoLidas > 0
              ? `Você tem ${naoLidas} notificação${naoLidas > 1 ? "ões" : ""} não lida${naoLidas > 1 ? "s" : ""}`
              : "Nenhuma notificação nova"}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-4">
          {notificacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500">Nenhuma notificação ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notificacoes.map((notificacao) => (
                <div
                  key={notificacao.id}
                  className={`p-4 rounded-lg border transition-all ${
                    notificacao.lida
                      ? "bg-white border-gray-200"
                      : "bg-blue-50 border-blue-200"
                  }`}
                  onClick={() => !notificacao.lida && marcarComoLida(notificacao.id)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getIconeNotificacao(notificacao.tipo)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm">{notificacao.titulo}</h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deletarNotificacao(notificacao.id);
                          }}
                          className="text-gray-400 hover:text-gray-600 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{notificacao.mensagem}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {formatarData(notificacao.criadaEm)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
