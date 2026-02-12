import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/contexts/AuthContext";
import { Bell, AlertTriangle, TrendingDown, Target } from "lucide-react";
import { toast } from "sonner";

interface AlertasConfig {
  inatividade: {
    ativo: boolean;
    diasSemEstudo: number;
  };
  quedaDesempenho: {
    ativo: boolean;
    percentualQueda: number;
  };
  metasNaoAtingidas: {
    ativo: boolean;
    diasConsecutivos: number;
  };
}

export function AlertasInteligentes() {
  const { user } = useAuthContext();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<AlertasConfig>({
    inatividade: {
      ativo: true,
      diasSemEstudo: 3,
    },
    quedaDesempenho: {
      ativo: true,
      percentualQueda: 10,
    },
    metasNaoAtingidas: {
      ativo: true,
      diasConsecutivos: 2,
    },
  });

  useEffect(() => {
    loadConfig();
  }, [user]);

  const loadConfig = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/mentor/alertas/${user.uid}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setConfig(data);
        }
      }
    } catch (error: any) {
      console.error("Erro ao carregar configurações de alertas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    try {
      setIsSaving(true);
      
      const response = await fetch(`/api/mentor/alertas/${user.uid}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar configurações");
      }

      toast.success("Configurações de alertas salvas com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertas Inteligentes
          </CardTitle>
          <CardDescription>Carregando configurações...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Alertas Inteligentes
        </CardTitle>
        <CardDescription>
          Configure alertas personalizados para acompanhar seus alunos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alerta de Inatividade */}
        <div className="space-y-3 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <Label htmlFor="inatividade-ativo" className="text-base font-semibold">
                Alerta de Inatividade
              </Label>
            </div>
            <Switch
              id="inatividade-ativo"
              checked={config.inatividade.ativo}
              onCheckedChange={(checked) =>
                setConfig({
                  ...config,
                  inatividade: { ...config.inatividade, ativo: checked },
                })
              }
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Receba alertas quando um aluno ficar sem estudar por um período
          </p>
          {config.inatividade.ativo && (
            <div className="space-y-2">
              <Label htmlFor="dias-sem-estudo">
                Dias sem estudo para alerta
              </Label>
              <Input
                id="dias-sem-estudo"
                type="number"
                min="1"
                max="30"
                value={config.inatividade.diasSemEstudo}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    inatividade: {
                      ...config.inatividade,
                      diasSemEstudo: parseInt(e.target.value) || 3,
                    },
                  })
                }
              />
            </div>
          )}
        </div>

        {/* Alerta de Queda de Desempenho */}
        <div className="space-y-3 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <Label htmlFor="queda-ativo" className="text-base font-semibold">
                Alerta de Queda de Desempenho
              </Label>
            </div>
            <Switch
              id="queda-ativo"
              checked={config.quedaDesempenho.ativo}
              onCheckedChange={(checked) =>
                setConfig({
                  ...config,
                  quedaDesempenho: { ...config.quedaDesempenho, ativo: checked },
                })
              }
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Receba alertas quando o desempenho de um aluno cair significativamente
          </p>
          {config.quedaDesempenho.ativo && (
            <div className="space-y-2">
              <Label htmlFor="percentual-queda">
                Percentual de queda para alerta (%)
              </Label>
              <Input
                id="percentual-queda"
                type="number"
                min="1"
                max="100"
                value={config.quedaDesempenho.percentualQueda}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    quedaDesempenho: {
                      ...config.quedaDesempenho,
                      percentualQueda: parseInt(e.target.value) || 10,
                    },
                  })
                }
              />
            </div>
          )}
        </div>

        {/* Alerta de Metas Não Atingidas */}
        <div className="space-y-3 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <Label htmlFor="metas-ativo" className="text-base font-semibold">
                Alerta de Metas Não Atingidas
              </Label>
            </div>
            <Switch
              id="metas-ativo"
              checked={config.metasNaoAtingidas.ativo}
              onCheckedChange={(checked) =>
                setConfig({
                  ...config,
                  metasNaoAtingidas: { ...config.metasNaoAtingidas, ativo: checked },
                })
              }
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Receba alertas quando um aluno não atingir suas metas de estudo
          </p>
          {config.metasNaoAtingidas.ativo && (
            <div className="space-y-2">
              <Label htmlFor="dias-consecutivos">
                Dias consecutivos sem atingir meta
              </Label>
              <Input
                id="dias-consecutivos"
                type="number"
                min="1"
                max="30"
                value={config.metasNaoAtingidas.diasConsecutivos}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    metasNaoAtingidas: {
                      ...config.metasNaoAtingidas,
                      diasConsecutivos: parseInt(e.target.value) || 2,
                    },
                  })
                }
              />
            </div>
          )}
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </CardContent>
    </Card>
  );
}
