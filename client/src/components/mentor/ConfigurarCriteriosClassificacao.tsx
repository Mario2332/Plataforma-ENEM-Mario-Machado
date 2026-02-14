import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Settings, X } from "lucide-react";
import { toast } from "sonner";

export interface CriteriosClassificacao {
  inativo: {
    diasInatividade: number;
  };
  urgente: {
    diasInatividade: number;
    desempenhoMinimo: number;
    questoesMinimas: number;
    metasNaoAtingidas: number;
  };
  atencao: {
    diasInatividade: number;
    desempenhoMinimo: number;
    questoesMinimas: number;
    metasNaoAtingidas: number;
  };
  destaque: {
    diasInatividade: number;
    desempenhoMinimo: number;
    questoesMinimas: number;
  };
}

const CRITERIOS_PADRAO: CriteriosClassificacao = {
  inativo: {
    diasInatividade: 7,
  },
  urgente: {
    diasInatividade: 3,
    desempenhoMinimo: 50,
    questoesMinimas: 50,
    metasNaoAtingidas: 2,
  },
  atencao: {
    diasInatividade: 1,
    desempenhoMinimo: 60,
    questoesMinimas: 20,
    metasNaoAtingidas: 0,
  },
  destaque: {
    diasInatividade: 0,
    desempenhoMinimo: 85,
    questoesMinimas: 100,
  },
};

interface ConfigurarCriteriosClassificacaoProps {
  open: boolean;
  onClose: () => void;
  criteriosAtuais: CriteriosClassificacao;
  onSalvar: (criterios: CriteriosClassificacao) => void;
}

export const ConfigurarCriteriosClassificacao: React.FC<ConfigurarCriteriosClassificacaoProps> = ({
  open,
  onClose,
  criteriosAtuais,
  onSalvar,
}) => {
  const [criterios, setCriterios] = useState<CriteriosClassificacao>(criteriosAtuais);

  useEffect(() => {
    setCriterios(criteriosAtuais);
  }, [criteriosAtuais, open]);

  const handleSalvar = () => {
    onSalvar(criterios);
    toast.success("Critérios de classificação atualizados!");
    onClose();
  };

  const handleRestaurarPadrao = () => {
    setCriterios(CRITERIOS_PADRAO);
    toast.info("Critérios restaurados para o padrão");
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <Settings className="h-6 w-6 text-blue-600" />
              <div>
                <h2 className="text-2xl font-bold">Configurar Critérios de Classificação</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Personalize os critérios que definem cada categoria de aluno
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Inativo */}
            <Card className="p-4 border-gray-300">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                💤 Inativos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="inativo-dias">Dias sem atividade (≥)</Label>
                  <Input
                    id="inativo-dias"
                    type="number"
                    min="1"
                    value={criterios.inativo.diasInatividade}
                    onChange={(e) => setCriterios({
                      ...criterios,
                      inativo: { ...criterios.inativo, diasInatividade: parseInt(e.target.value) || 7 }
                    })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Aluno sem estudar há pelo menos este número de dias
                  </p>
                </div>
              </div>
            </Card>

            {/* Atenção Urgente */}
            <Card className="p-4 border-red-300 bg-red-50">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                🔴 Atenção Urgente
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Aluno será classificado como "Atenção Urgente" se atender <strong>qualquer um</strong> dos critérios abaixo:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="urgente-dias">Dias sem atividade (≥)</Label>
                  <Input
                    id="urgente-dias"
                    type="number"
                    min="0"
                    value={criterios.urgente.diasInatividade}
                    onChange={(e) => setCriterios({
                      ...criterios,
                      urgente: { ...criterios.urgente, diasInatividade: parseInt(e.target.value) || 3 }
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="urgente-metas">Metas não atingidas (&gt;)</Label>
                  <Input
                    id="urgente-metas"
                    type="number"
                    min="0"
                    value={criterios.urgente.metasNaoAtingidas}
                    onChange={(e) => setCriterios({
                      ...criterios,
                      urgente: { ...criterios.urgente, metasNaoAtingidas: parseInt(e.target.value) || 2 }
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="urgente-desempenho">Desempenho abaixo de (%)</Label>
                  <Input
                    id="urgente-desempenho"
                    type="number"
                    min="0"
                    max="100"
                    value={criterios.urgente.desempenhoMinimo}
                    onChange={(e) => setCriterios({
                      ...criterios,
                      urgente: { ...criterios.urgente, desempenhoMinimo: parseInt(e.target.value) || 50 }
                    })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Com pelo menos {criterios.urgente.questoesMinimas} questões feitas
                  </p>
                </div>
                <div>
                  <Label htmlFor="urgente-questoes">Questões mínimas para considerar desempenho</Label>
                  <Input
                    id="urgente-questoes"
                    type="number"
                    min="0"
                    value={criterios.urgente.questoesMinimas}
                    onChange={(e) => setCriterios({
                      ...criterios,
                      urgente: { ...criterios.urgente, questoesMinimas: parseInt(e.target.value) || 50 }
                    })}
                  />
                </div>
              </div>
            </Card>

            {/* Precisa Acompanhamento */}
            <Card className="p-4 border-yellow-300 bg-yellow-50">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                🟡 Precisa Acompanhamento
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Aluno será classificado como "Precisa Acompanhamento" se atender <strong>qualquer um</strong> dos critérios abaixo:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="atencao-dias">Dias sem atividade (≥)</Label>
                  <Input
                    id="atencao-dias"
                    type="number"
                    min="0"
                    value={criterios.atencao.diasInatividade}
                    onChange={(e) => setCriterios({
                      ...criterios,
                      atencao: { ...criterios.atencao, diasInatividade: parseInt(e.target.value) || 1 }
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="atencao-metas">Metas não atingidas (&gt;)</Label>
                  <Input
                    id="atencao-metas"
                    type="number"
                    min="0"
                    value={criterios.atencao.metasNaoAtingidas}
                    onChange={(e) => setCriterios({
                      ...criterios,
                      atencao: { ...criterios.atencao, metasNaoAtingidas: parseInt(e.target.value) || 0 }
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="atencao-desempenho">Desempenho abaixo de (%)</Label>
                  <Input
                    id="atencao-desempenho"
                    type="number"
                    min="0"
                    max="100"
                    value={criterios.atencao.desempenhoMinimo}
                    onChange={(e) => setCriterios({
                      ...criterios,
                      atencao: { ...criterios.atencao, desempenhoMinimo: parseInt(e.target.value) || 60 }
                    })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Com pelo menos {criterios.atencao.questoesMinimas} questões feitas
                  </p>
                </div>
                <div>
                  <Label htmlFor="atencao-questoes">Questões mínimas para considerar desempenho</Label>
                  <Input
                    id="atencao-questoes"
                    type="number"
                    min="0"
                    value={criterios.atencao.questoesMinimas}
                    onChange={(e) => setCriterios({
                      ...criterios,
                      atencao: { ...criterios.atencao, questoesMinimas: parseInt(e.target.value) || 20 }
                    })}
                  />
                </div>
              </div>
            </Card>

            {/* Destaque */}
            <Card className="p-4 border-purple-300 bg-purple-50">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                ⭐ Destaque
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Aluno será classificado como "Destaque" se atender <strong>todos</strong> os critérios abaixo:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="destaque-dias">Dias sem atividade (=)</Label>
                  <Input
                    id="destaque-dias"
                    type="number"
                    min="0"
                    value={criterios.destaque.diasInatividade}
                    onChange={(e) => setCriterios({
                      ...criterios,
                      destaque: { ...criterios.destaque, diasInatividade: parseInt(e.target.value) || 0 }
                    })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Geralmente 0 (estudou hoje)
                  </p>
                </div>
                <div>
                  <Label htmlFor="destaque-desempenho">Desempenho mínimo (%)</Label>
                  <Input
                    id="destaque-desempenho"
                    type="number"
                    min="0"
                    max="100"
                    value={criterios.destaque.desempenhoMinimo}
                    onChange={(e) => setCriterios({
                      ...criterios,
                      destaque: { ...criterios.destaque, desempenhoMinimo: parseInt(e.target.value) || 85 }
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="destaque-questoes">Questões mínimas feitas</Label>
                  <Input
                    id="destaque-questoes"
                    type="number"
                    min="0"
                    value={criterios.destaque.questoesMinimas}
                    onChange={(e) => setCriterios({
                      ...criterios,
                      destaque: { ...criterios.destaque, questoesMinimas: parseInt(e.target.value) || 100 }
                    })}
                  />
                </div>
              </div>
            </Card>

            {/* Indo Bem */}
            <Card className="p-4 border-green-300 bg-green-50">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                ✅ Indo Bem
              </h3>
              <p className="text-sm text-muted-foreground">
                Alunos que não se encaixam em nenhuma das categorias acima são classificados como "Indo Bem".
              </p>
            </Card>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <Button
              variant="outline"
              onClick={handleRestaurarPadrao}
            >
              Restaurar Padrão
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSalvar}
              >
                Salvar Critérios
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export { CRITERIOS_PADRAO };
