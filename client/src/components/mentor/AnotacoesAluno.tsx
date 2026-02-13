import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { mentorApi } from "@/lib/api";
import { Trash2, Edit2, Plus, FileText } from "lucide-react";
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
}

export const AnotacoesAluno: React.FC<AnotacoesAlunoProps> = ({
  alunoId,
  alunoNome,
}) => {
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [conteudoEditor, setConteudoEditor] = useState("");
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

  const abrirModalNova = () => {
    setEditandoId(null);
    setConteudoEditor("");
    setModalOpen(true);
  };

  const abrirModalEditar = (anotacao: Anotacao) => {
    setEditandoId(anotacao.id);
    setConteudoEditor(anotacao.texto);
    setModalOpen(true);
  };

  const fecharModal = () => {
    setModalOpen(false);
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
      
      fecharModal();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Anotações Privadas - {alunoNome}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Apenas você pode ver estas anotações
              </p>
            </div>
            <Button onClick={abrirModalNova} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova Anotação
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {anotacoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma anotação ainda.</p>
              <p className="text-sm">Clique em "Nova Anotação" para começar!</p>
            </div>
          ) : (
            anotacoes.map((anotacao) => (
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
                      onClick={() => abrirModalEditar(anotacao)}
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
            ))
          )}
        </CardContent>
      </Card>

      {/* Modal de Edição */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editandoId ? "Editar Anotação" : "Nova Anotação"}
            </DialogTitle>
            <DialogDescription>
              Use as ferramentas de formatação para criar anotações ricas sobre {alunoNome}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <RichTextEditor
              content={conteudoEditor}
              onChange={setConteudoEditor}
              placeholder="Escreva suas anotações aqui..."
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={fecharModal}
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
