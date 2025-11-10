import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Plus, Mail, Building, Palette, Image, Trash2, Edit } from "lucide-react";

export default function GestorMentores() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMentor, setEditingMentor] = useState<any>(null);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    nomePlataforma: "",
    logoUrl: "",
    corPrincipal: "#3b82f6",
  });

  const { data: mentores, isLoading, refetch } = trpc.gestor.getMentores.useQuery();
  const createMentor = trpc.gestor.createMentor.useMutation({
    onSuccess: () => {
      toast.success("Mentor adicionado com sucesso!");
      setDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao adicionar mentor");
    },
  });

  const updateMentor = trpc.gestor.updateMentor.useMutation({
    onSuccess: () => {
      toast.success("Mentor atualizado com sucesso!");
      setDialogOpen(false);
      setEditingMentor(null);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar mentor");
    },
  });

  const deleteMentor = trpc.gestor.deleteMentor.useMutation({
    onSuccess: () => {
      toast.success("Mentor removido com sucesso!");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao remover mentor");
    },
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      email: "",
      nomePlataforma: "",
      logoUrl: "",
      corPrincipal: "#3b82f6",
    });
  };

  const handleOpenDialog = (mentor?: any) => {
    if (mentor) {
      setEditingMentor(mentor);
      setFormData({
        nome: mentor.nome,
        email: mentor.email,
        nomePlataforma: mentor.nomePlataforma,
        logoUrl: mentor.logoUrl || "",
        corPrincipal: mentor.corPrincipal || "#3b82f6",
      });
    } else {
      setEditingMentor(null);
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome || !formData.email || !formData.nomePlataforma) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (editingMentor) {
      updateMentor.mutate({
        id: editingMentor.id,
        ...formData,
      });
    } else {
      createMentor.mutate(formData);
    }
  };

  const handleDelete = (id: number, nome: string) => {
    if (window.confirm(`Tem certeza que deseja remover o mentor "${nome}"?`)) {
      deleteMentor.mutate({ id });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Mentores</h1>
          <p className="text-muted-foreground mt-1">
            Adicione e gerencie mentores/clientes da plataforma
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Mentor
        </Button>
      </div>

      {!mentores || mentores.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum mentor cadastrado ainda</p>
            <Button onClick={() => handleOpenDialog()} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Mentor
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mentores.map((mentor) => (
            <Card key={mentor.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{mentor.nome}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Mail className="h-3 w-3" />
                      {mentor.email}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(mentor)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(mentor.id, mentor.nome)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{mentor.nomePlataforma}</span>
                </div>
                {mentor.logoUrl && (
                  <div className="flex items-center gap-2 text-sm">
                    <Image className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground truncate">
                      {mentor.logoUrl}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: mentor.corPrincipal }}
                    />
                    <span className="text-xs font-mono">{mentor.corPrincipal}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingMentor ? "Editar Mentor" : "Adicionar Novo Mentor"}
              </DialogTitle>
              <DialogDescription>
                {editingMentor
                  ? "Atualize as informações do mentor"
                  : "Preencha os dados do novo mentor/cliente"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Mentor *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="João Silva"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="joao@exemplo.com"
                  required
                  disabled={!!editingMentor}
                />
                {editingMentor && (
                  <p className="text-xs text-muted-foreground">
                    O email não pode ser alterado
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nomePlataforma">Nome da Plataforma *</Label>
                <Input
                  id="nomePlataforma"
                  value={formData.nomePlataforma}
                  onChange={(e) =>
                    setFormData({ ...formData, nomePlataforma: e.target.value })
                  }
                  placeholder="Mentoria ENEM Pro"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Nome que aparecerá para os alunos deste mentor
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logoUrl">URL do Logo</Label>
                <Input
                  id="logoUrl"
                  type="url"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  placeholder="https://exemplo.com/logo.png"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="corPrincipal">Cor Principal</Label>
                <div className="flex gap-2">
                  <Input
                    id="corPrincipal"
                    type="color"
                    value={formData.corPrincipal}
                    onChange={(e) =>
                      setFormData({ ...formData, corPrincipal: e.target.value })
                    }
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={formData.corPrincipal}
                    onChange={(e) =>
                      setFormData({ ...formData, corPrincipal: e.target.value })
                    }
                    placeholder="#3b82f6"
                    className="flex-1 font-mono"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setEditingMentor(null);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMentor.isPending || updateMentor.isPending}
              >
                {createMentor.isPending || updateMentor.isPending
                  ? "Salvando..."
                  : editingMentor
                  ? "Atualizar"
                  : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
