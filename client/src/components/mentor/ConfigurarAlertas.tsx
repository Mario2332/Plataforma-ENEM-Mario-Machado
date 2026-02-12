import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { mentorApi } from "@/lib/api";

interface ConfigAlerta {
  id: string;
  tipo: "inatividade" | "desempenho_baixo" | "meta_nao_atingida" | "sem_simulado";
  ativo: boolean;
  valor: number;
  unidade: string;
}

export const ConfigurarAlertas: React.FC = () => {
  const [alertas, setAlertas] = useState<ConfigAlerta[]>([
    {
      id: "inatividade",
      tipo: "inatividade",
      ativo: true,
      valor: 3,
      unidade: "dias",
    },
    {
      id: "desempenho_baixo",
      tipo: "desempenho_baixo",
      ativo: true,
      valor: 60,
      unidade: "%",
    },
    {
      id: "meta_nao_atingida",
      tipo: "meta_nao_atingida",
      ativo: true,
      valor: 2,
      unidade: "semanas",
    },
    {
      id: "sem_simulado",
      tipo: "sem_simulado",
      ativo: false,
      valor: 7,
      unidade: "dias",
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const config = await mentorApi.getConfigAlertas();
      if (config && config.alertas) {
        setAlertas(config.alertas);
      }
    } catch (error) {
      console.log("Usando configuração padrão");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await mentorApi.saveConfigAlertas({ alertas });
      toast.success("Configurações salvas com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const updateAlerta = (id: string, field: string, value: any) => {
    setAlertas((prev) =>
      prev.map((alerta) =>
        alerta.id === id ? { ...alerta, [field]: value } : alerta
      )
    );
  };

  const getTitulo = (tipo: string) => {
    switch (tipo) {
      case "inatividade":
        return "Aluno inativo";
      case "desempenho_baixo":
        return "Desempenho baixo";
      case "meta_nao_atingida":
        return "Meta não atingida";
      case "sem_simulado":
        return "Sem simulado";
      default:
        return tipo;
    }
  };

  const getDescricao = (alerta: ConfigAlerta) => {
    switch (alerta.tipo) {
      case "inatividade":
        return `Alertar quando aluno não acessar a plataforma por ${alerta.valor} ${alerta.unidade}`;
      case "desempenho_baixo":
        return `Alertar quando desempenho cair abaixo de ${alerta.valor}${alerta.unidade}`;
      case "meta_nao_atingida":
        return `Alertar quando meta não for atingida por ${alerta.valor} ${alerta.unidade} consecutivas`;
      case "sem_simulado":
        return `Alertar quando aluno não fizer simulado há ${alerta.valor} ${alerta.unidade}`;
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurar Alertas Inteligentes</CardTitle>
        <CardDescription>
          Defina quando você deseja ser alertado sobre seus alunos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {alertas.map((alerta) => (
          <div
            key={alerta.id}
            className="flex items-start justify-between p-4 border rounded-lg"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Switch
                  checked={alerta.ativo}
                  onCheckedChange={(checked) =>
                    updateAlerta(alerta.id, "ativo", checked)
                  }
                />
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {getTitulo(alerta.tipo)}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {getDescricao(alerta)}
                  </p>
                </div>
              </div>

              {alerta.ativo && (
                <div className="ml-12 mt-3 flex items-center gap-3">
                  <Label htmlFor={`valor-${alerta.id}`} className="text-sm">
                    Valor:
                  </Label>
                  <Input
                    id={`valor-${alerta.id}`}
                    type="number"
                    value={alerta.valor}
                    onChange={(e) =>
                      updateAlerta(alerta.id, "valor", parseInt(e.target.value))
                    }
                    className="w-24"
                    min={1}
                  />
                  <span className="text-sm text-gray-600">{alerta.unidade}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={loadConfig} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
