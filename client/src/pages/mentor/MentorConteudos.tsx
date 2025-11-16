import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import studyDataJson from "@shared/study-content-data.json";
import { collection, doc, setDoc, deleteDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Topic {
  id: string;
  name: string;
  incidenceValue: number;
  incidenceLevel: string;
  isCustom?: boolean;
}

interface Materia {
  key: string;
  displayName: string;
  topics: Topic[];
}

const INCIDENCE_LEVELS = [
  { value: "Muito baixa", label: "Muito baixa", incidenceValue: 0.01 },
  { value: "Baixa", label: "Baixa", incidenceValue: 0.02 },
  { value: "Média", label: "Média", incidenceValue: 0.04 },
  { value: "Alta!", label: "Alta!", incidenceValue: 0.06 },
  { value: "Muito alta!", label: "Muito alta!", incidenceValue: 0.08 }
];

export default function MentorConteudos() {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMateria, setSelectedMateria] = useState<string>("");
  
  // Dialog states
  const [addDialog, setAddDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    incidenceLevel: "Média",
    materiaKey: ""
  });

  const loadConteudos = async () => {
    try {
      setIsLoading(true);
      
      // Carregar dados base do JSON
      const baseData = studyDataJson as Record<string, any>;
      
      // Carregar customizações do Firestore
      const customTopicsSnapshot = await getDocs(collection(db, "conteudos"));
      const customTopics: Record<string, any> = {};
      
      customTopicsSnapshot.forEach((doc) => {
        customTopics[doc.id] = doc.data();
      });
      
      // Mesclar dados
      const materiasArray: Materia[] = Object.entries(baseData).map(([key, materia]) => {
        let topics = [...(materia.topics || [])];
        
        // Adicionar tópicos customizados
        Object.entries(customTopics).forEach(([topicId, topicData]: [string, any]) => {
          if (topicData.materiaKey === key) {
            if (topicData.deleted) {
              // Remover tópico deletado
              topics = topics.filter(t => t.id !== topicId);
            } else {
              // Atualizar ou adicionar tópico
              const existingIndex = topics.findIndex(t => t.id === topicId);
              if (existingIndex >= 0) {
                topics[existingIndex] = {
                  ...topics[existingIndex],
                  ...topicData,
                  isCustom: true
                };
              } else {
                topics.push({
                  id: topicId,
                  name: topicData.name,
                  incidenceValue: topicData.incidenceValue,
                  incidenceLevel: topicData.incidenceLevel,
                  isCustom: true
                });
              }
            }
          }
        });
        
        return {
          key,
          displayName: materia.displayName,
          topics
        };
      });
      
      setMaterias(materiasArray);
      if (materiasArray.length > 0 && !selectedMateria) {
        setSelectedMateria(materiasArray[0].key);
      }
    } catch (error: any) {
      toast.error("Erro ao carregar conteúdos: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConteudos();
  }, []);

  const currentMateria = useMemo(() => {
    return materias.find(m => m.key === selectedMateria);
  }, [materias, selectedMateria]);

  const handleAddTopic = async () => {
    try {
      if (!formData.name.trim()) {
        toast.error("Nome do tópico é obrigatório");
        return;
      }
      
      const materiaKey = selectedMateria;
      const newId = `${materiaKey}-custom-${Date.now()}`;
      const incidenceData = INCIDENCE_LEVELS.find(l => l.value === formData.incidenceLevel);
      
      await setDoc(doc(db, "conteudos", newId), {
        id: newId,
        name: formData.name,
        incidenceLevel: formData.incidenceLevel,
        incidenceValue: incidenceData?.incidenceValue || 0.04,
        materiaKey,
        isCustom: true,
        deleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      toast.success("Tópico adicionado com sucesso!");
      setAddDialog(false);
      setFormData({ id: "", name: "", incidenceLevel: "Média", materiaKey: "" });
      await loadConteudos();
    } catch (error: any) {
      toast.error("Erro ao adicionar tópico: " + error.message);
    }
  };

  const handleEditTopic = async () => {
    try {
      if (!formData.name.trim()) {
        toast.error("Nome do tópico é obrigatório");
        return;
      }
      
      const incidenceData = INCIDENCE_LEVELS.find(l => l.value === formData.incidenceLevel);
      
      await setDoc(doc(db, "conteudos", formData.id), {
        id: formData.id,
        name: formData.name,
        incidenceLevel: formData.incidenceLevel,
        incidenceValue: incidenceData?.incidenceValue || 0.04,
        materiaKey: formData.materiaKey,
        isCustom: true,
        deleted: false,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      toast.success("Tópico atualizado com sucesso!");
      setEditDialog(false);
      setFormData({ id: "", name: "", incidenceLevel: "Média", materiaKey: "" });
      await loadConteudos();
    } catch (error: any) {
      toast.error("Erro ao editar tópico: " + error.message);
    }
  };

  const handleDeleteTopic = async () => {
    try {
      await setDoc(doc(db, "conteudos", formData.id), {
        deleted: true,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      toast.success("Tópico excluído com sucesso!");
      setDeleteDialog(false);
      setFormData({ id: "", name: "", incidenceLevel: "Média", materiaKey: "" });
      await loadConteudos();
    } catch (error: any) {
      toast.error("Erro ao excluir tópico: " + error.message);
    }
  };

  const openAddDialog = () => {
    setFormData({ id: "", name: "", incidenceLevel: "Média", materiaKey: selectedMateria });
    setAddDialog(true);
  };

  const openEditDialog = (topic: Topic) => {
    setFormData({
      id: topic.id,
      name: topic.name,
      incidenceLevel: topic.incidenceLevel,
      materiaKey: selectedMateria
    });
    setEditDialog(true);
  };

  const openDeleteDialog = (topic: Topic) => {
    setFormData({
      id: topic.id,
      name: topic.name,
      incidenceLevel: topic.incidenceLevel,
      materiaKey: selectedMateria
    });
    setDeleteDialog(true);
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Conteúdos</h1>
          <p className="text-muted-foreground mt-2">
            Adicione, edite ou exclua tópicos das matérias
          </p>
        </div>
        <Button onClick={openAddDialog} className="gap-2">
          <Plus className="w-4 h-4" />
          Adicionar Tópico
        </Button>
      </div>

      {/* Seletor de Matéria */}
      <Card>
        <CardHeader>
          <CardTitle>Selecione a Matéria</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedMateria} onValueChange={setSelectedMateria}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Escolha uma matéria" />
            </SelectTrigger>
            <SelectContent>
              {materias.map((materia) => (
                <SelectItem key={materia.key} value={materia.key}>
                  {materia.displayName} ({materia.topics.length} tópicos)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Lista de Tópicos */}
      {currentMateria && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              {currentMateria.displayName}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {currentMateria.topics.length} tópicos cadastrados
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-semibold">Tópico</th>
                    <th className="text-center p-3 font-semibold">Incidência</th>
                    <th className="text-center p-3 font-semibold w-32">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {currentMateria.topics.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-muted-foreground">
                        Nenhum tópico cadastrado nesta matéria.
                      </td>
                    </tr>
                  ) : (
                    currentMateria.topics.map((topic) => (
                      <tr key={topic.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="p-3">
                          {topic.name}
                          {topic.isCustom && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Customizado
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <Badge className={getIncidenceBadgeColor(topic.incidenceLevel)}>
                            {topic.incidenceLevel}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(topic)}
                              className="gap-1"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(topic)}
                              className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog: Adicionar Tópico */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Tópico</DialogTitle>
            <DialogDescription>
              Adicione um novo tópico à matéria {currentMateria?.displayName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Tópico</label>
              <Input
                placeholder="Ex: Trigonometria básica"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Incidência no ENEM</label>
              <Select
                value={formData.incidenceLevel}
                onValueChange={(value) => setFormData({ ...formData, incidenceLevel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INCIDENCE_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddTopic}>
              Adicionar Tópico
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Tópico */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Tópico</DialogTitle>
            <DialogDescription>
              Altere o nome ou a incidência do tópico
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Tópico</label>
              <Input
                placeholder="Ex: Trigonometria básica"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Incidência no ENEM</label>
              <Select
                value={formData.incidenceLevel}
                onValueChange={(value) => setFormData({ ...formData, incidenceLevel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INCIDENCE_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditTopic}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Excluir Tópico */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Excluir Tópico</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este tópico? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">
              <strong>Tópico:</strong> {formData.name}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteTopic}>
              Excluir Tópico
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
