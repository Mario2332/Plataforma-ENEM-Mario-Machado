import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Plus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function MentorAlunos() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: alunos, isLoading, refetch } = trpc.mentor.getAlunos.useQuery();

  const createMutation = trpc.mentor.createAluno.useMutation({
    onSuccess: () => {
      toast.success("Aluno adicionado!");
      refetch();
      setDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
    },
  });

  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    celular: "",
    plano: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alunos</h1>
          <p className="text-muted-foreground mt-2">Gerencie seus alunos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Adicionar Aluno</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Aluno</DialogTitle>
              <DialogDescription>Preencha os dados do aluno</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Celular</Label>
                  <Input value={formData.celular} onChange={(e) => setFormData({...formData, celular: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Plano</Label>
                  <Input value={formData.plano} onChange={(e) => setFormData({...formData, plano: e.target.value})} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Alunos</CardTitle>
          <CardDescription>Todos os alunos cadastrados</CardDescription>
        </CardHeader>
        <CardContent>
          {alunos && alunos.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Celular</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alunos.map((aluno) => (
                    <TableRow key={aluno.id}>
                      <TableCell className="font-medium">{aluno.nome}</TableCell>
                      <TableCell>{aluno.email}</TableCell>
                      <TableCell>{aluno.celular || "-"}</TableCell>
                      <TableCell>{aluno.plano || "-"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${aluno.ativo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                          {aluno.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum aluno cadastrado ainda.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
