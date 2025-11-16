import { useState, useMemo, useEffect } from "react";
import { alunoApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUpDown, ArrowUp, ArrowDown, Filter, Loader2, StickyNote } from "lucide-react";
import { toast } from "sonner";
import studyData from "@shared/study-content-data.json";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Topic {
  id: string;
  name: string;
  incidenceValue: number;
  incidenceLevel: string;
}

interface MateriaPageProps {
  materiaKey: string;
}

export default function MateriaPage({ materiaKey }: MateriaPageProps) {
  const materia = (studyData as any)[materiaKey];
  
  const [topics, setTopics] = useState<Topic[]>([]);
  const [progressoMap, setProgressoMap] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [anotacoesDialog, setAnotacoesDialog] = useState<{ open: boolean; topicoId: string; conteudo: string }>({
    open: false,
    topicoId: "",
    conteudo: ""
  });

  const loadTopics = async () => {
    try {
      // Carregar tópicos base do JSON
      let topicsBase: Topic[] = materia?.topics || [];
      
      // Carregar customizações do Firestore
      const customTopicsSnapshot = await getDocs(collection(db, "conteudos"));
      const customTopics: Record<string, any> = {};
      
      customTopicsSnapshot.forEach((doc) => {
        customTopics[doc.id] = doc.data();
      });
      
      // Mesclar dados
      let finalTopics = [...topicsBase];
      
      Object.entries(customTopics).forEach(([topicId, topicData]: [string, any]) => {
        if (topicData.materiaKey === materiaKey) {
          if (topicData.deleted) {
            // Remover tópico deletado
            finalTopics = finalTopics.filter(t => t.id !== topicId);
          } else {
            // Atualizar ou adicionar tópico
            const existingIndex = finalTopics.findIndex(t => t.id === topicId);
            if (existingIndex >= 0) {
              finalTopics[existingIndex] = {
                ...finalTopics[existingIndex],
                name: topicData.name,
                incidenceLevel: topicData.incidenceLevel,
                incidenceValue: topicData.incidenceValue
              };
            } else {
              finalTopics.push({
                id: topicId,
                name: topicData.name,
                incidenceValue: topicData.incidenceValue,
                incidenceLevel: topicData.incidenceLevel
              });
            }
          }
        }
      });
      
      setTopics(finalTopics);
    } catch (error: any) {
      console.error("Erro ao carregar tópicos:", error);
      // Em caso de erro, usar apenas dados do JSON
      setTopics(materia?.topics || []);
    }
  };

  const loadProgresso = async () => {
    try {
      setIsLoading(true);
      await loadTopics();
      const data = await alunoApi.getProgresso(materiaKey);
      setProgressoMap(data);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar progresso");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProgresso();
  }, [materiaKey]);

  // Estados de ordenação
  const [sortColumn, setSortColumn] = useState<"name" | "incidence">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Estados de filtro
  const [filterIncidence, setFilterIncidence] = useState<string>("todos");
  const [filterStatus, setFilterStatus] = useState<string>("todos");

  const handleSort = (column: "name" | "incidence") => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 opacity-50" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="w-4 h-4" />
      : <ArrowDown className="w-4 h-4" />;
  };

  const filteredAndSortedTopics = useMemo(() => {
    let filtered = [...topics];

    if (filterIncidence !== "todos") {
      filtered = filtered.filter(topic => topic.incidenceLevel === filterIncidence);
    }

    if (filterStatus === "estudados") {
      filtered = filtered.filter(topic => progressoMap?.[topic.id]?.estudado);
    } else if (filterStatus === "nao-estudados") {
      filtered = filtered.filter(topic => !progressoMap?.[topic.id]?.estudado);
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortColumn === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortColumn === "incidence") {
        comparison = a.incidenceValue - b.incidenceValue;
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    });
    
    return filtered;
  }, [topics, sortColumn, sortDirection, filterIncidence, filterStatus, progressoMap]);

  const getIncidenceBadgeColor = (level: string) => {
    switch (level) {
      case "Muito alta!": return "bg-red-500 text-white hover:bg-red-600";
      case "Alta!": return "bg-orange-500 text-white hover:bg-orange-600";
      case "Média": return "bg-yellow-500 text-black hover:bg-yellow-600";
      case "Baixa": return "bg-blue-500 text-white hover:bg-blue-600";
      case "Muito baixa": return "bg-gray-400 text-white hover:bg-gray-500";
      default: return "bg-gray-300 text-black hover:bg-gray-400";
    }
  };

  const handleUpdateProgresso = async (topicoId: string, data: any) => {
    try {
      await alunoApi.updateProgresso({ topicoId, ...data });
      await loadProgresso();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar progresso");
    }
  };

  const handleOpenAnotacoes = (topicoId: string) => {
    const progresso = progressoMap?.[topicoId];
    setAnotacoesDialog({
      open: true,
      topicoId,
      conteudo: progresso?.anotacoes || ""
    });
  };

  const handleSaveAnotacoes = async () => {
    try {
      await handleUpdateProgresso(anotacoesDialog.topicoId, { anotacoes: anotacoesDialog.conteudo });
      toast.success("Anotações salvas com sucesso!");
      setAnotacoesDialog({ open: false, topicoId: "", conteudo: "" });
    } catch (error) {
      toast.error("Erro ao salvar anotações");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{materia?.displayName}</CardTitle>
          <p className="text-muted-foreground">
            {topics.length} tópicos • {filteredAndSortedTopics.length} exibidos • Marque como estudado e adicione anotações
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seção de Filtros */}
          <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            
            <div className="flex-1 flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Select value={filterIncidence} onValueChange={setFilterIncidence}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Incidência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas as incidências</SelectItem>
                    <SelectItem value="Muito alta!">Muito Alta!</SelectItem>
                    <SelectItem value="Alta!">Alta!</SelectItem>
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                    <SelectItem value="Muito baixa">Muito Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tópicos</SelectItem>
                    <SelectItem value="estudados">Apenas estudados</SelectItem>
                    <SelectItem value="nao-estudados">Não estudados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(filterIncidence !== "todos" || filterStatus !== "todos") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterIncidence("todos");
                    setFilterStatus("todos");
                  }}
                  className="whitespace-nowrap"
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-semibold">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("name")}
                      className="flex items-center gap-1 hover:bg-muted"
                    >
                      Conteúdo
                      {getSortIcon("name")}
                    </Button>
                  </th>
                  <th className="text-center p-3 font-semibold">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("incidence")}
                      className="flex items-center gap-1 mx-auto hover:bg-muted"
                    >
                      Incidência
                      {getSortIcon("incidence")}
                    </Button>
                  </th>
                  <th className="text-center p-3 font-semibold w-32">Estudado</th>
                  <th className="text-center p-3 font-semibold w-32">Anotações</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedTopics.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      Nenhum tópico encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedTopics.map((topic) => {
                    const progresso = progressoMap?.[topic.id];
                    const temAnotacoes = progresso?.anotacoes && progresso.anotacoes.trim().length > 0;

                    return (
                      <tr key={topic.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="p-3">{topic.name}</td>
                        <td className="p-3 text-center">
                          <Badge className={getIncidenceBadgeColor(topic.incidenceLevel)}>
                            {topic.incidenceLevel}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={progresso?.estudado || false}
                              onCheckedChange={(checked) =>
                                handleUpdateProgresso(topic.id, { estudado: checked as boolean })
                              }
                            />
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center">
                            <Button
                              variant={temAnotacoes ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleOpenAnotacoes(topic.id)}
                              className="gap-2"
                            >
                              <StickyNote className="w-4 h-4" />
                              {temAnotacoes ? "Ver" : "Adicionar"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Anotações */}
      <Dialog open={anotacoesDialog.open} onOpenChange={(open) => setAnotacoesDialog({ ...anotacoesDialog, open })}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Anotações do Conteúdo</DialogTitle>
            <DialogDescription>
              Adicione observações, dicas ou comentários sobre este conteúdo estudado.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Digite suas anotações aqui..."
              value={anotacoesDialog.conteudo}
              onChange={(e) => setAnotacoesDialog({ ...anotacoesDialog, conteudo: e.target.value })}
              className="min-h-[200px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnotacoesDialog({ open: false, topicoId: "", conteudo: "" })}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAnotacoes}>
              Salvar Anotações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
