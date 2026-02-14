/**
 * GestorMentoriaDetalhe - Página de detalhes de uma mentoria com gestão de usuários
 * 
 * Permite ao gestor:
 * - Ver detalhes da mentoria
 * - Criar/editar/deletar mentores dentro da mentoria
 * - Criar/editar/deletar alunos dentro da mentoria
 * - Ver estatísticas da mentoria
 */

import { useState, useEffect, useCallback } from "react";
import { mentoriasApi } from "@/lib/api-mentorias";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Users,
  GraduationCap,
  Plus,
  Trash2,
  Edit,
  Mail,
  Shield,
  Crown,
  Eye,
  EyeOff,
  UserPlus,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

interface MentorData {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  mentoriaId: string;
  createdAt?: any;
}

interface AlunoData {
  id: string;
  nome: string;
  email: string;
  celular?: string;
  ativo: boolean;
  mentorId?: string;
  mentoriaId: string;
  createdAt?: any;
}

interface MentoriaInfo {
  id: string;
  nome: string;
  modo: string;
  status: string;
  plano: string;
  branding: any;
  limites: any;
}

export default function GestorMentoriaDetalhe() {
  const params = useParams<{ mentoriaId: string }>();
  const mentoriaId = params.mentoriaId;
  const [, navigate] = useLocation();

  const [mentoria, setMentoria] = useState<MentoriaInfo | null>(null);
  const [mentores, setMentores] = useState<MentorData[]>([]);
  const [alunos, setAlunos] = useState<AlunoData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog states
  const [showMentorDialog, setShowMentorDialog] = useState(false);
  const [showAlunoDialog, setShowAlunoDialog] = useState(false);
  const [editingMentor, setEditingMentor] = useState<MentorData | null>(null);
  const [editingAluno, setEditingAluno] = useState<AlunoData | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [mentorForm, setMentorForm] = useState({
    nome: "",
    email: "",
    password: "",
  });

  const [alunoForm, setAlunoForm] = useState({
    nome: "",
    email: "",
    password: "",
    mentorId: "",
  });

  const loadData = useCallback(async () => {
    if (!mentoriaId) return;
    try {
      setIsLoading(true);
      const [mentoriasData, mentoresData, alunosData] = await Promise.all([
        mentoriasApi.getMentorias(),
        mentoriasApi.getMentoresInMentoria(mentoriaId),
        mentoriasApi.getAlunosInMentoria(mentoriaId),
      ]);

      const found = (mentoriasData as any[]).find((m: any) => m.id === mentoriaId);
      if (found) {
        setMentoria(found);
      }

      setMentores(mentoresData as MentorData[]);
      setAlunos(alunosData as AlunoData[]);
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      toast.error(error.message || "Erro ao carregar dados da mentoria");
    } finally {
      setIsLoading(false);
    }
  }, [mentoriaId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================
  // MENTORES
  // ============================================

  const handleOpenMentorDialog = (mentor?: MentorData) => {
    if (mentor) {
      setEditingMentor(mentor);
      setMentorForm({ nome: mentor.nome, email: mentor.email, password: "" });
    } else {
      setEditingMentor(null);
      setMentorForm({ nome: "", email: "", password: "" });
    }
    setShowMentorDialog(true);
  };

  const handleSaveMentor = async () => {
    if (!mentoriaId) return;

    if (editingMentor) {
      // Atualizar
      try {
        setIsSubmitting(true);
        await mentoriasApi.updateMentorInMentoria({
          mentoriaId,
          mentorId: editingMentor.id,
          nome: mentorForm.nome,
          email: mentorForm.email,
        });
        toast.success("Mentor atualizado com sucesso!");
        setShowMentorDialog(false);
        loadData();
      } catch (error: any) {
        toast.error(error.message || "Erro ao atualizar mentor");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Criar
      if (!mentorForm.nome || !mentorForm.email || !mentorForm.password) {
        toast.error("Nome, email e senha são obrigatórios");
        return;
      }
      if (mentorForm.password.length < 6) {
        toast.error("A senha deve ter pelo menos 6 caracteres");
        return;
      }
      try {
        setIsSubmitting(true);
        await mentoriasApi.createMentorInMentoria({
          mentoriaId,
          nome: mentorForm.nome,
          email: mentorForm.email,
          password: mentorForm.password,
        });
        toast.success("Mentor criado com sucesso!");
        setShowMentorDialog(false);
        loadData();
      } catch (error: any) {
        toast.error(error.message || "Erro ao criar mentor");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleDeleteMentor = async (mentorId: string, mentorNome: string) => {
    if (!mentoriaId) return;
    if (!confirm(`Tem certeza que deseja deletar o mentor "${mentorNome}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    try {
      await mentoriasApi.deleteMentorInMentoria(mentoriaId, mentorId);
      toast.success("Mentor deletado com sucesso!");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao deletar mentor");
    }
  };

  const handleToggleMentorStatus = async (mentor: MentorData) => {
    if (!mentoriaId) return;
    try {
      await mentoriasApi.updateMentorInMentoria({
        mentoriaId,
        mentorId: mentor.id,
        ativo: !mentor.ativo,
      });
      toast.success(`Mentor ${mentor.ativo ? "desativado" : "ativado"} com sucesso!`);
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar status do mentor");
    }
  };

  // ============================================
  // ALUNOS
  // ============================================

  const handleOpenAlunoDialog = (aluno?: AlunoData) => {
    if (aluno) {
      setEditingAluno(aluno);
      setAlunoForm({
        nome: aluno.nome,
        email: aluno.email,
        password: "",
        mentorId: aluno.mentorId || "",
      });
    } else {
      setEditingAluno(null);
      setAlunoForm({ nome: "", email: "", password: "", mentorId: "" });
    }
    setShowAlunoDialog(true);
  };

  const handleSaveAluno = async () => {
    if (!mentoriaId) return;

    if (editingAluno) {
      // Atualizar
      try {
        setIsSubmitting(true);
        await mentoriasApi.updateAlunoInMentoria({
          mentoriaId,
          alunoId: editingAluno.id,
          nome: alunoForm.nome,
          email: alunoForm.email,
          mentorId: alunoForm.mentorId || undefined,
        });
        toast.success("Aluno atualizado com sucesso!");
        setShowAlunoDialog(false);
        loadData();
      } catch (error: any) {
        toast.error(error.message || "Erro ao atualizar aluno");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Criar
      if (!alunoForm.nome || !alunoForm.email || !alunoForm.password) {
        toast.error("Nome, email e senha são obrigatórios");
        return;
      }
      if (alunoForm.password.length < 6) {
        toast.error("A senha deve ter pelo menos 6 caracteres");
        return;
      }
      try {
        setIsSubmitting(true);
        await mentoriasApi.createAlunoInMentoria({
          mentoriaId,
          nome: alunoForm.nome,
          email: alunoForm.email,
          password: alunoForm.password,
          mentorId: alunoForm.mentorId || undefined,
        });
        toast.success("Aluno criado com sucesso!");
        setShowAlunoDialog(false);
        loadData();
      } catch (error: any) {
        toast.error(error.message || "Erro ao criar aluno");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleDeleteAluno = async (alunoId: string, alunoNome: string) => {
    if (!mentoriaId) return;
    if (!confirm(`Tem certeza que deseja deletar o aluno "${alunoNome}"? Todos os dados serão perdidos.`)) {
      return;
    }
    try {
      await mentoriasApi.deleteAlunoInMentoria(mentoriaId, alunoId);
      toast.success("Aluno deletado com sucesso!");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao deletar aluno");
    }
  };

  const handleToggleAlunoStatus = async (aluno: AlunoData) => {
    if (!mentoriaId) return;
    try {
      await mentoriasApi.updateAlunoInMentoria({
        mentoriaId,
        alunoId: aluno.id,
        ativo: !aluno.ativo,
      });
      toast.success(`Aluno ${aluno.ativo ? "desativado" : "ativado"} com sucesso!`);
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar status do aluno");
    }
  };

  // ============================================
  // HELPERS
  // ============================================

  const isLegacy = mentoria?.modo === "legacy";
  const mentoresAtivos = mentores.filter((m) => m.ativo !== false);
  const alunosAtivos = alunos.filter((a) => a.ativo !== false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!mentoria) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/gestor/mentorias")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Mentoria não encontrada
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/gestor/mentorias")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            {isLegacy && <Crown className="h-5 w-5 text-amber-500" />}
            {mentoria.nome}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={mentoria.modo === "legacy" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"}>
              {mentoria.modo === "legacy" ? "Legacy" : "Multi-Tenant"}
            </Badge>
            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">{mentoria.status}</Badge>
            <Badge variant="outline">{mentoria.plano}</Badge>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mentores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mentoresAtivos.length}</div>
            <p className="text-xs text-muted-foreground">
              de {mentoria.limites?.maxMentores || "?"} permitidos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alunos Ativos</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alunosAtivos.length}</div>
            <p className="text-xs text-muted-foreground">
              de {mentoria.limites?.maxAlunos || "?"} permitidos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alunos</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alunos.length}</div>
            <p className="text-xs text-muted-foreground">
              {alunos.length - alunosAtivos.length} inativos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plataforma</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">{mentoria.branding?.nomePlataforma}</div>
            <p className="text-xs text-muted-foreground truncate">
              {mentoria.branding?.dominio || "Sem domínio customizado"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Aviso para mentoria legacy */}
      {isLegacy && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="py-4 flex items-center gap-3">
            <Shield className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <div className="text-sm">
              <strong>Mentoria Legacy:</strong> Para gerenciar mentores e alunos desta mentoria,
              use as páginas <a href="/gestor/mentores" className="underline">Mentores</a> e{" "}
              <a href="/gestor/alunos" className="underline">Alunos</a> do menu principal.
              Os dados abaixo são somente leitura.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs: Mentores e Alunos */}
      <Tabs defaultValue="mentores">
        <TabsList>
          <TabsTrigger value="mentores" className="gap-2">
            <Users className="h-4 w-4" /> Mentores ({mentores.length})
          </TabsTrigger>
          <TabsTrigger value="alunos" className="gap-2">
            <GraduationCap className="h-4 w-4" /> Alunos ({alunos.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab Mentores */}
        <TabsContent value="mentores" className="space-y-4">
          {!isLegacy && (
            <div className="flex justify-end">
              <Button onClick={() => handleOpenMentorDialog()} className="gap-2">
                <UserPlus className="h-4 w-4" /> Novo Mentor
              </Button>
            </div>
          )}

          {mentores.length > 0 ? (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      {!isLegacy && <TableHead className="text-right">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mentores.map((mentor) => (
                      <TableRow key={mentor.id}>
                        <TableCell className="font-medium">{mentor.nome}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" /> {mentor.email}
                          </span>
                        </TableCell>
                        <TableCell>
                          {mentor.ativo !== false ? (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Ativo</Badge>
                          ) : (
                            <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Inativo</Badge>
                          )}
                        </TableCell>
                        {!isLegacy && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleOpenMentorDialog(mentor)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleToggleMentorStatus(mentor)}>
                                {mentor.ativo !== false ? (
                                  <EyeOff className="h-4 w-4 text-yellow-500" />
                                ) : (
                                  <Eye className="h-4 w-4 text-green-500" />
                                )}
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteMentor(mentor.id, mentor.nome)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Nenhum mentor cadastrado</p>
                {!isLegacy && <p className="text-sm">Clique em "Novo Mentor" para adicionar</p>}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab Alunos */}
        <TabsContent value="alunos" className="space-y-4">
          {!isLegacy && (
            <div className="flex justify-end">
              <Button onClick={() => handleOpenAlunoDialog()} className="gap-2">
                <UserPlus className="h-4 w-4" /> Novo Aluno
              </Button>
            </div>
          )}

          {alunos.length > 0 ? (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Mentor</TableHead>
                      <TableHead>Status</TableHead>
                      {!isLegacy && <TableHead className="text-right">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alunos.map((aluno) => {
                      const mentorDoAluno = mentores.find((m) => m.id === aluno.mentorId);
                      return (
                        <TableRow key={aluno.id}>
                          <TableCell className="font-medium">{aluno.nome}</TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" /> {aluno.email}
                            </span>
                          </TableCell>
                          <TableCell>
                            {mentorDoAluno ? (
                              <span className="text-sm">{mentorDoAluno.nome}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">Sem mentor</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {aluno.ativo !== false ? (
                              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Ativo</Badge>
                            ) : (
                              <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Inativo</Badge>
                            )}
                          </TableCell>
                          {!isLegacy && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleOpenAlunoDialog(aluno)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleToggleAlunoStatus(aluno)}>
                                  {aluno.ativo !== false ? (
                                    <EyeOff className="h-4 w-4 text-yellow-500" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-green-500" />
                                  )}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteAluno(aluno.id, aluno.nome)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Nenhum aluno cadastrado</p>
                {!isLegacy && <p className="text-sm">Clique em "Novo Aluno" para adicionar</p>}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog Mentor */}
      <Dialog open={showMentorDialog} onOpenChange={setShowMentorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMentor ? "Editar Mentor" : "Novo Mentor"}</DialogTitle>
            <DialogDescription>
              {editingMentor
                ? "Atualize os dados do mentor"
                : `Criar um novo mentor na mentoria "${mentoria.nome}"`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={mentorForm.nome}
                onChange={(e) => setMentorForm({ ...mentorForm, nome: e.target.value })}
                placeholder="Nome completo do mentor"
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={mentorForm.email}
                onChange={(e) => setMentorForm({ ...mentorForm, email: e.target.value })}
                placeholder="email@exemplo.com"
                disabled={!!editingMentor}
              />
            </div>
            {!editingMentor && (
              <div className="space-y-2">
                <Label>Senha *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={mentorForm.password}
                    onChange={(e) => setMentorForm({ ...mentorForm, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-7 w-7 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMentorDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveMentor} disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : editingMentor ? "Salvar" : "Criar Mentor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Aluno */}
      <Dialog open={showAlunoDialog} onOpenChange={setShowAlunoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAluno ? "Editar Aluno" : "Novo Aluno"}</DialogTitle>
            <DialogDescription>
              {editingAluno
                ? "Atualize os dados do aluno"
                : `Criar um novo aluno na mentoria "${mentoria.nome}"`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={alunoForm.nome}
                onChange={(e) => setAlunoForm({ ...alunoForm, nome: e.target.value })}
                placeholder="Nome completo do aluno"
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={alunoForm.email}
                onChange={(e) => setAlunoForm({ ...alunoForm, email: e.target.value })}
                placeholder="email@exemplo.com"
                disabled={!!editingAluno}
              />
            </div>
            {!editingAluno && (
              <div className="space-y-2">
                <Label>Senha *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={alunoForm.password}
                    onChange={(e) => setAlunoForm({ ...alunoForm, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-7 w-7 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
            {mentores.length > 0 && (
              <div className="space-y-2">
                <Label>Mentor Responsável</Label>
                <Select
                  value={alunoForm.mentorId}
                  onValueChange={(value) => setAlunoForm({ ...alunoForm, mentorId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um mentor (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem mentor</SelectItem>
                    {mentores
                      .filter((m) => m.ativo !== false)
                      .map((mentor) => (
                        <SelectItem key={mentor.id} value={mentor.id}>
                          {mentor.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAlunoDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAluno} disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : editingAluno ? "Salvar" : "Criar Aluno"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
