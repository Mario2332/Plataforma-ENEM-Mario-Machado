import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { mentorApi } from "@/lib/api";
import { Trash2, Edit2, Save, X } from "lucide-react";

interface Anotacao {
  id: string;
  texto: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AnotacoesAlunoProps {
  alunoId: string;
  alunoNome: string;
}

export const AnotacoesAluno: React.FC<AnotacoesAlunoProps> = ({
  alunoId,
  alunoNome,
}) => {
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [novaAnotacao, setNovaAnotacao] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [textoEditando, setTextoEditando] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    loadAnotacoes();
  }, [alunoId]);

  const loadAnotacoes = async () => {
    try {
      setLoading(true);
      const data = await mentorApi.getAnotacoesAluno(alunoId);
      setAnotacoes(data);
    } catch (error) {
      console.error("Erro ao carregar anotações:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCriarAnotacao = async () => {
    if (!novaAnotacao.trim()) {
      toast.error("Digite uma anotação");
      return;
    }

    try {
      setSalvando(true);
      await mentorApi.criarAnotacaoAluno(alunoId, novaAnotacao);
      setNovaAnotacao("");
      await loadAnotacoes();
      toast.success("Anotação criada!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar anotação");
    } finally {
      setSalvando(false);
    }
  };

  const handleEditarAnotacao = async (anotacaoId: string) => {
    if (!textoEditando.trim()) {
      toast.error("Digite uma anotação");
      return;
    }

    try {
      setSalvando(true);
      await mentorApi.editarAnotacaoAluno(anotacaoId, textoEditando);
      setEditando(null);
      setTextoEditando("");
      await loadAnotacoes();
      toast.success("Anotação atualizada!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao editar anotação");
    } finally {
      setSalvando(false);
    }
  };

  const handleDeletarAnotacao = async (anotacaoId: string) => {
    if (!confirm("Deseja realmente deletar esta anotação?")) return;

    try {
      await mentorApi.deletarAnotacaoAluno(anotacaoId);
      await loadAnotacoes();
      toast.success("Anotação deletada!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao deletar anotação");
    }
  };

  const iniciarEdicao = (anotacao: Anotacao) => {
    setEditando(anotacao.id);
    setTextoEditando(anotacao.texto);
  };

  const cancelarEdicao = () => {
    setEditando(null);
    setTextoEditando("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          📝 Anotações Privadas - {alunoNome}
        </CardTitle>
        <p className="text-sm text-gray-600">
          Apenas você pode ver estas anotações
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Nova Anotação */}
        <div className="space-y-2">
          <Textarea
            placeholder="Escreva uma nova anotação sobre este aluno..."
            value={novaAnotacao}
            onChange={(e) => setNovaAnotacao(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleCriarAnotacao}
              disabled={salvando || !novaAnotacao.trim()}
              size="sm"
            >
              {salvando ? "Salvando..." : "Adicionar Anotação"}
            </Button>
          </div>
        </div>

        {/* Lista de Anotações */}
        <div className="space-y-3 mt-6">
          {anotacoes.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Nenhuma anotação ainda. Adicione a primeira!
            </p>
          ) : (
            anotacoes.map((anotacao) => (
              <div
                key={anotacao.id}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                {editando === anotacao.id ? (
                  // Modo de Edição
                  <div className="space-y-2">
                    <Textarea
                      value={textoEditando}
                      onChange={(e) => setTextoEditando(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelarEdicao}
                        disabled={salvando}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleEditarAnotacao(anotacao.id)}
                        disabled={salvando || !textoEditando.trim()}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        {salvando ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Modo de Visualização
                  <>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {anotacao.texto}
                    </p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        {new Date(anotacao.updatedAt).toLocaleString("pt-BR")}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => iniciarEdicao(anotacao)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletarAnotacao(anotacao.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
