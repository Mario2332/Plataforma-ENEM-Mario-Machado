import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X, Eye } from "lucide-react";
import { mentorApi } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Alerta {
  id: string;
  alunoId: string;
  alunoNome: string;
  tipo: string;
  mensagem: string;
  createdAt: Date;
  lido: boolean;
}

export const ListaAlertas: React.FC = () => {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadAlertas();
  }, []);

  const loadAlertas = async () => {
    try {
      setLoading(true);
      const data = await mentorApi.getAlertas();
      setAlertas(data);
    } catch (error) {
      console.error("Erro ao carregar alertas:", error);
    } finally {
      setLoading(false);
    }
  };

  const marcarComoLido = async (alertaId: string) => {
    try {
      await mentorApi.marcarAlertaLido(alertaId);
      setAlertas((prev) =>
        prev.map((a) => (a.id === alertaId ? { ...a, lido: true } : a))
      );
    } catch (error: any) {
      toast.error(error.message || "Erro ao marcar como lido");
    }
  };

  const removerAlerta = async (alertaId: string) => {
    try {
      await mentorApi.removerAlerta(alertaId);
      setAlertas((prev) => prev.filter((a) => a.id !== alertaId));
      toast.success("Alerta removido");
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover alerta");
    }
  };

  const verAluno = (alunoId: string) => {
    navigate(`/mentor/alunos`);
    // TODO: Abrir modal do aluno específico
  };

  const getTipoIcon = (tipo: string) => {
    return <AlertTriangle className="h-5 w-5" />;
  };

  const getTipoCor = (tipo: string) => {
    switch (tipo) {
      case "inatividade":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "desempenho_baixo":
        return "text-red-600 bg-red-50 border-red-200";
      case "meta_nao_atingida":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "sem_simulado":
        return "text-blue-600 bg-blue-50 border-blue-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const alertasNaoLidos = alertas.filter((a) => !a.lido);

  if (alertasNaoLidos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alertas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">Nenhum alerta no momento 👍</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Alertas ({alertasNaoLidos.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alertasNaoLidos.map((alerta) => (
          <div
            key={alerta.id}
            className={`p-4 rounded-lg border ${getTipoCor(alerta.tipo)} ${
              !alerta.lido ? "font-medium" : "opacity-60"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {getTipoIcon(alerta.tipo)}
                <div className="flex-1">
                  <p className="font-semibold text-sm">{alerta.alunoNome}</p>
                  <p className="text-sm mt-1">{alerta.mensagem}</p>
                  <p className="text-xs mt-2 opacity-70">
                    {new Date(alerta.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => verAluno(alerta.alunoId)}
                  title="Ver aluno"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removerAlerta(alerta.id)}
                  title="Remover alerta"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
