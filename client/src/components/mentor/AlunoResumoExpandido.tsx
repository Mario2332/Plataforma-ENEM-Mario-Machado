import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  Target,
  BookOpen,
  FileText,
  XCircle,
  HelpCircle,
  CheckCircle2,
  Eye,
  MessageSquare,
} from "lucide-react";
import { mentorApi } from "@/lib/api";
import { toast } from "sonner";

interface AlunoResumoExpandidoProps {
  alunoId: string;
  onVerAreaCompleta: () => void;
  onMetas: () => void;
  onAnotacoes: () => void;
}

export function AlunoResumoExpandido({
  alunoId,
  onVerAreaCompleta,
  onMetas,
  onAnotacoes,
}: AlunoResumoExpandidoProps) {
  const [resumo, setResumo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadResumo();
  }, [alunoId]);

  const loadResumo = async () => {
    try {
      setIsLoading(true);
      const data = await mentorApi.getAlunoResumo(alunoId);
      setResumo(data);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar resumo do aluno");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!resumo) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Erro ao carregar resumo do aluno
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Grid principal com 3 colunas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna 1: Atividades de Hoje */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Atividades de Hoje
          </h3>
          {resumo.atividadesHoje && resumo.atividadesHoje.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {resumo.atividadesHoje.map((ativ: any) => (
                <Card key={ativ.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ativ.cor || "#3b82f6" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {ativ.atividade === "Outra atividade"
                          ? ativ.atividadePersonalizada
                          : ativ.atividade}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ativ.horaInicio} - {ativ.horaFim}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma atividade para hoje</p>
          )}
        </div>

        {/* Coluna 2: Metas do Mês */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Target className="h-4 w-4" />
            Progresso das Metas
          </h3>
          {resumo.metasDetalhadas && resumo.metasDetalhadas.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {resumo.metasDetalhadas.map((meta: any) => (
                <Card key={meta.id} className="p-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm capitalize">
                        {meta.tipo === "questoes"
                          ? "Questões"
                          : meta.tipo === "horas"
                          ? "Horas"
                          : meta.tipo === "simulados"
                          ? "Simulados"
                          : meta.tipo}
                      </span>
                      <Badge
                        variant={
                          meta.progresso >= 100
                            ? "default"
                            : meta.progresso >= 80
                            ? "secondary"
                            : meta.progresso >= 50
                            ? "outline"
                            : "destructive"
                        }
                        className="text-xs"
                      >
                        {meta.progresso}%
                      </Badge>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {meta.valorAtual} / {meta.valor}
                      </span>
                    </div>
                    <Progress value={meta.progresso} className="h-1.5" />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma meta definida</p>
          )}
        </div>

        {/* Coluna 3: Alertas e Últimas Atividades */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Alertas
          </h3>
          {resumo.alertas && resumo.alertas.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {resumo.alertas.map((alerta: any, idx: number) => (
                <Card
                  key={idx}
                  className={`p-3 ${
                    alerta.severidade === "alta"
                      ? "border-red-500 bg-red-50"
                      : alerta.severidade === "media"
                      ? "border-yellow-500 bg-yellow-50"
                      : "border-blue-500 bg-blue-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {alerta.severidade === "alta" ? (
                      <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    ) : alerta.severidade === "media" ? (
                      <HelpCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    )}
                    <span className="text-xs font-medium">{alerta.mensagem}</span>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum alerta</p>
          )}
        </div>
      </div>

      <Separator />

      {/* Últimas Atividades Realizadas */}
      {resumo.ultimasAtividades && resumo.ultimasAtividades.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Últimas Atividades Realizadas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {resumo.ultimasAtividades.map((ativ: any) => {
              const dataAtiv = ativ.data?.toDate && typeof ativ.data.toDate === 'function'
                ? ativ.data.toDate()
                : (ativ.data?._seconds ? new Date(ativ.data._seconds * 1000) : new Date(ativ.data));
              return (
                <Card key={ativ.id} className="p-3">
                  <p className="font-medium text-sm">{ativ.materia}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {ativ.topico || "Estudo geral"}
                  </p>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-muted-foreground">
                      {ativ.tempoMinutos || 0} min
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {dataAtiv.toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Anotações do Mentor */}
      {resumo.anotacoes && resumo.anotacoes.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Anotações do Mentor
            </h3>
            <div className="space-y-2">
              {resumo.anotacoes.slice(0, 3).map((anotacao: any) => {
                const dataAnotacao = anotacao.createdAt?.toDate && typeof anotacao.createdAt.toDate === 'function'
                  ? anotacao.createdAt.toDate()
                  : (anotacao.createdAt?._seconds ? new Date(anotacao.createdAt._seconds * 1000) : new Date(anotacao.createdAt));
                return (
                  <Card key={anotacao.id} className="p-3 bg-blue-50 border-blue-200">
                    <p className="text-sm">{anotacao.texto}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {dataAnotacao.toLocaleDateString("pt-BR")} às{" "}
                      {dataAnotacao.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Botões de Ação */}
      <div className="flex items-center justify-end gap-2 pt-4">
        <Button variant="outline" size="sm" onClick={onAnotacoes}>
          <MessageSquare className="h-4 w-4 mr-2" />
          Anotações
        </Button>
        <Button variant="outline" size="sm" onClick={onMetas}>
          <Target className="h-4 w-4 mr-2" />
          Definir Metas
        </Button>
        <Button size="sm" onClick={onVerAreaCompleta}>
          <Eye className="h-4 w-4 mr-2" />
          Ver Área Completa
        </Button>
      </div>
    </div>
  );
}
