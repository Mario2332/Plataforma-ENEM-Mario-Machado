import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { mentorApi } from "@/lib/api";

interface MetasBadgesProps {
  alunoId: string;
}

export function MetasBadges({ alunoId }: MetasBadgesProps) {
  const [metas, setMetas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMetas();
  }, [alunoId]);

  const loadMetas = async () => {
    try {
      setIsLoading(true);
      const resumo = await mentorApi.getAlunoResumo(alunoId);
      setMetas(resumo.metasDetalhadas || []);
    } catch (error) {
      console.error("Erro ao carregar metas:", error);
      setMetas([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <span className="text-xs text-muted-foreground">Carregando...</span>;
  }

  if (metas.length === 0) {
    return <span className="text-xs text-muted-foreground">Sem metas</span>;
  }

  const getBadgeVariant = (progresso: number) => {
    if (progresso >= 100) return "default"; // Verde escuro
    if (progresso >= 80) return "secondary"; // Verde claro
    if (progresso >= 50) return "outline"; // Amarelo
    return "destructive"; // Vermelho
  };

  const getBadgeIcon = (progresso: number) => {
    if (progresso >= 100) return "✅";
    if (progresso >= 80) return "🟢";
    if (progresso >= 50) return "🟡";
    return "🔴";
  };

  const getTipoLabel = (tipo: string) => {
    if (tipo === "questoes") return "Questões";
    if (tipo === "horas") return "Horas";
    if (tipo === "simulados") return "Simulados";
    return tipo;
  };

  const formatarPrazo = (prazo: any) => {
    if (!prazo) return "Sem prazo";
    const data = typeof prazo === "string" ? new Date(prazo) : prazo.toDate();
    return data.toLocaleDateString("pt-BR");
  };

  const calcularDiasRestantes = (prazo: any) => {
    if (!prazo) return null;
    const data = typeof prazo === "string" ? new Date(prazo) : prazo.toDate();
    const hoje = new Date();
    const diff = Math.ceil((data.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="flex flex-wrap gap-1">
      {metas.map((meta) => {
        const diasRestantes = calcularDiasRestantes(meta.prazo);
        return (
          <TooltipProvider key={meta.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant={getBadgeVariant(meta.progresso)}
                  className="text-xs cursor-help"
                >
                  {getBadgeIcon(meta.progresso)} {meta.progresso}% {getTipoLabel(meta.tipo)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-semibold">Meta: {getTipoLabel(meta.tipo)}</p>
                  <p className="text-sm">
                    Atual: <span className="font-medium">{meta.valorAtual}</span> de{" "}
                    <span className="font-medium">{meta.valor}</span>
                  </p>
                  <p className="text-sm">
                    Faltam: <span className="font-medium">{meta.valor - meta.valorAtual}</span>
                  </p>
                  <p className="text-sm">Prazo: {formatarPrazo(meta.prazo)}</p>
                  {diasRestantes !== null && (
                    <p className={`text-sm font-medium ${
                      diasRestantes < 0 ? "text-red-500" :
                      diasRestantes <= 3 ? "text-orange-500" :
                      diasRestantes <= 7 ? "text-yellow-500" :
                      "text-green-500"
                    }`}>
                      {diasRestantes < 0
                        ? `Atrasado há ${Math.abs(diasRestantes)} dias`
                        : diasRestantes === 0
                        ? "Vence hoje!"
                        : diasRestantes === 1
                        ? "Vence amanhã"
                        : `${diasRestantes} dias restantes`}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}
