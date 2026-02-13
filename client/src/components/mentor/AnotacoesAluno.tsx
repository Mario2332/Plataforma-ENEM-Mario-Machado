import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { mentorApi } from "@/lib/api";
import { Trash2, Edit2, X } from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";

interface Anotacao {
  id: string;
  texto: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AnotacoesAlunoProps {
  alunoId: string;
  alunoNome: string;
  open: boolean;
  onClose: () => void;
}

export const AnotacoesAluno: React.FC<AnotacoesAlunoProps> = ({
  alunoId,
  alunoNome,
  open,
  onClose,
}) => {
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [conteudoEditor, setConteudoEditor] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) {
      loadAnotacoes();
    }
  }, [alunoId, open]);

  const loadAnotacoes = async () => {
    try {
      setLoading(true);
      const data = await mentorApi.getAnotacoesAluno(alunoId);
      
      // Converter timestamps do Firestore para Date
      const anotacoesConvertidas = data.map((anotacao: any) => ({
        ...anotacao,
        createdAt: anotacao.createdAt?.toDate ? anotacao.createdAt.toDate() : new Date(anotacao.createdAt),
        updatedAt: anotacao.updatedAt?.toDate ? anotacao.updatedAt.toDate() : new Date(anotacao.updatedAt),
      }));
      
      setAnotacoes(anotacoesConvertidas);
    } catch (error) {
      console.error("Erro ao carregar anotações:", error);
    } finally {
      setLoading(false);
    }
  };

  const abrirModoNova = () => {
    setEditandoId(null);
    setConteudoEditor("");
    setModoEdicao(true);
  };

  const abrirModoEditar = (anotacao: Anotacao) => {
    setEditandoId(anotacao.id);
    setConteudoEditor(anotacao.texto);
    setModoEdicao(true);
  };

  const voltarParaLista = () => {
    setModoEdicao(false);
    setEditandoId(null);
    setConteudoEditor("");
  };

  const handleSalvar = async () => {
    if (!conteudoEditor.trim() || conteudoEditor === "<p></p>") {
      toast.error("Digite uma anotação");
      return;
    }

    try {
      setSalvando(true);
      
      if (editandoId) {
        // Editar existente
        await mentorApi.editarAnotacaoAluno(editandoId, conteudoEditor);
        toast.success("Anotação atualizada!");
      } else {
        // Criar nova
        await mentorApi.criarAnotacaoAluno(alunoId, conteudoEditor);
        toast.success("Anotação criada!");
      }
      
      voltarParaLista();
      await loadAnotacoes();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar anotação");
    } finally {
      setSalvando(false);
    }
  };

  const handleDeletar = async (anotacaoId: string) => {
    if (!confirm("Deseja realmente deletar esta anotação?")) return;

    try {
      await mentorApi.deletarAnotacaoAluno(anotacaoId);
      await loadAnotacoes();
      toast.success("Anotação deletada!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao deletar anotação");
    }
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
          className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold">
                📝 Anotações Privadas
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Aluno: <span className="font-semibold text-foreground">{alunoNome}</span>
              </p>
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
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : modoEdicao ? (
              // Modo de Edição
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    {editandoId ? "Editar Anotação" : "Nova Anotação"}
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={voltarParaLista}
                    disabled={salvando}
                  >
                    Voltar
                  </Button>
                </div>

                <RichTextEditor
                  content={conteudoEditor}
                  onChange={setConteudoEditor}
                  placeholder="Escreva suas anotações aqui..."
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={voltarParaLista}
                    disabled={salvando}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSalvar}
                    disabled={salvando || !conteudoEditor.trim()}
                  >
                    {salvando ? "Salvando..." : "Salvar Anotação"}
                  </Button>
                </div>
              </div>
            ) : (
              // Lista de Anotações
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    Anotações ({anotacoes.length})
                  </h3>
                  <Button onClick={abrirModoNova} size="sm">
                    + Nova Anotação
                  </Button>
                </div>

                {anotacoes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-lg mb-2">Nenhuma anotação ainda.</p>
                    <p className="text-sm">Clique em "Nova Anotação" para começar!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {anotacoes.map((anotacao) => (
                      <div
                        key={anotacao.id}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                      >
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: anotacao.texto }}
                        />
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-muted-foreground">
                            {new Date(anotacao.updatedAt).toLocaleString("pt-BR")}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => abrirModoEditar(anotacao)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletar(anotacao.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
