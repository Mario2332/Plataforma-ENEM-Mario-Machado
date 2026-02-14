/**
 * GestorMentorias - Dashboard de gestão de mentorias white label
 * 
 * Permite ao gestor:
 * - Ver todas as mentorias (legacy + multi-tenant)
 * - Criar novas mentorias white label
 * - Editar configurações de mentorias existentes
 * - Ver estatísticas unificadas
 * - Suspender/reativar mentorias
 */

import { useState, useEffect } from "react";
import { mentoriasApi } from "@/lib/api-mentorias";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Plus,
  Users,
  GraduationCap,
  Crown,
  Pause,
  Play,
  Settings,
  BarChart3,
  Globe,
  Palette,
  Shield,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { LIMITES_POR_PLANO, type MentoriaPlan } from "@/types/mentoria";

interface MentoriaData {
  id: string;
  nome: string;
  modo: "legacy" | "multi-tenant";
  status: string;
  plano: string;
  branding: {
    nomePlataforma: string;
    logo?: string;
    corPrimaria?: string;
    dominio?: string;
    emailContato?: string;
    whatsapp?: string;
  };
  limites: {
    maxAlunos: number;
    maxMentores: number;
  };
  gestorNome?: string;
  gestorEmail?: string;
  criadoEm: string;
  atualizadoEm: string;
}

interface DashboardData {
  totalMentorias: number;
  mentoriasAtivas: number;
  totalAlunos: number;
  totalMentores: number;
  mentorias: Array<{
    mentoriaId: string;
    mentoriaNome: string;
    modo: string;
    status: string;
    plano: string;
    alunosAtivos: number;
    alunosInativos: number;
    mentoresAtivos: number;
  }>;
}

export default function GestorMentorias() {
  const { userData } = useAuthContext();
  const [, navigate] = useLocation();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [mentorias, setMentorias] = useState<MentoriaData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingMentoria, setEditingMentoria] = useState<MentoriaData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state para criar mentoria
  const [formData, setFormData] = useState({
    nome: "",
    plano: "basico" as MentoriaPlan,
    nomePlataforma: "",
    corPrimaria: "#3b82f6",
    dominio: "",
    emailContato: "",
    whatsapp: "",
    gestorNome: "",
    gestorEmail: "",
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [dashboardData, mentoriasData] = await Promise.all([
        mentoriasApi.getDashboardUnificado(),
        mentoriasApi.getMentorias(),
      ]);
      setDashboard(dashboardData as DashboardData);
      setMentorias(mentoriasData as MentoriaData[]);
    } catch (error: any) {
      console.error("Erro ao carregar mentorias:", error);
      toast.error(error.message || "Erro ao carregar dados das mentorias");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateMentoria = async () => {
    if (!formData.nome || !formData.nomePlataforma) {
      toast.error("Nome e Nome da Plataforma são obrigatórios");
      return;
    }

    try {
      setIsSubmitting(true);
      await mentoriasApi.criarMentoria({
        nome: formData.nome,
        plano: formData.plano,
        branding: {
          nomePlataforma: formData.nomePlataforma,
          corPrimaria: formData.corPrimaria,
          dominio: formData.dominio || undefined,
          emailContato: formData.emailContato || undefined,
          whatsapp: formData.whatsapp || undefined,
        },
        gestorNome: formData.gestorNome || undefined,
        gestorEmail: formData.gestorEmail || undefined,
      });

      toast.success("Mentoria criada com sucesso!");
      setShowCreateDialog(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar mentoria");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (mentoriaId: string) => {
    try {
      const result = await mentoriasApi.toggleMentoriaStatus(mentoriaId) as any;
      toast.success(`Mentoria ${result.newStatus === "ativo" ? "reativada" : "suspensa"} com sucesso!`);
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar status");
    }
  };

  const handleDeleteMentoria = async (mentoriaId: string) => {
    if (!confirm("Tem certeza que deseja cancelar esta mentoria? Os dados serão mantidos mas a mentoria ficará inativa.")) {
      return;
    }

    try {
      await mentoriasApi.deletarMentoria(mentoriaId);
      toast.success("Mentoria cancelada com sucesso!");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao cancelar mentoria");
    }
  };

  const handleEditMentoria = async () => {
    if (!editingMentoria) return;

    try {
      setIsSubmitting(true);
      await mentoriasApi.atualizarMentoria({
        mentoriaId: editingMentoria.id,
        nome: editingMentoria.nome,
        plano: editingMentoria.plano,
        branding: editingMentoria.branding,
      });
      toast.success("Mentoria atualizada com sucesso!");
      setShowEditDialog(false);
      setEditingMentoria(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar mentoria");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: "",
      plano: "basico",
      nomePlataforma: "",
      corPrimaria: "#3b82f6",
      dominio: "",
      emailContato: "",
      whatsapp: "",
      gestorNome: "",
      gestorEmail: "",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ativo":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Ativo</Badge>;
      case "suspenso":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Suspenso</Badge>;
      case "cancelado":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Cancelado</Badge>;
      case "trial":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Trial</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanoBadge = (plano: string) => {
    switch (plano) {
      case "basico":
        return <Badge variant="outline" className="border-gray-400 text-gray-600">Básico</Badge>;
      case "pro":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Pro</Badge>;
      case "enterprise":
        return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">Enterprise</Badge>;
      default:
        return <Badge variant="outline">{plano}</Badge>;
    }
  };

  const getModoBadge = (modo: string) => {
    if (modo === "legacy") {
      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Legacy</Badge>;
    }
    return <Badge className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20">Multi-Tenant</Badge>;
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mentorias White Label</h1>
          <p className="text-muted-foreground">
            Gerencie todas as mentorias da plataforma SaaS
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Mentoria
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Nova Mentoria White Label</DialogTitle>
              <DialogDescription>
                Configure uma nova mentoria para um cliente. Ela será criada no modo multi-tenant.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Mentoria *</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Mentoria Prof. João"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plano">Plano</Label>
                <Select
                  value={formData.plano}
                  onValueChange={(value) => setFormData({ ...formData, plano: value as MentoriaPlan })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basico">
                      Básico (até {LIMITES_POR_PLANO.basico.maxAlunos} alunos, {LIMITES_POR_PLANO.basico.maxMentores} mentores)
                    </SelectItem>
                    <SelectItem value="pro">
                      Pro (até {LIMITES_POR_PLANO.pro.maxAlunos} alunos, {LIMITES_POR_PLANO.pro.maxMentores} mentores)
                    </SelectItem>
                    <SelectItem value="enterprise">
                      Enterprise (até {LIMITES_POR_PLANO.enterprise.maxAlunos} alunos, {LIMITES_POR_PLANO.enterprise.maxMentores} mentores)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />
              <h4 className="font-medium flex items-center gap-2">
                <Palette className="h-4 w-4" /> Personalização
              </h4>

              <div className="space-y-2">
                <Label htmlFor="nomePlataforma">Nome da Plataforma *</Label>
                <Input
                  id="nomePlataforma"
                  placeholder="Ex: Plataforma ENEM Prof. João"
                  value={formData.nomePlataforma}
                  onChange={(e) => setFormData({ ...formData, nomePlataforma: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="corPrimaria">Cor Primária</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="corPrimaria"
                      value={formData.corPrimaria}
                      onChange={(e) => setFormData({ ...formData, corPrimaria: e.target.value })}
                      className="h-10 w-14 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.corPrimaria}
                      onChange={(e) => setFormData({ ...formData, corPrimaria: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dominio">Domínio Customizado</Label>
                  <Input
                    id="dominio"
                    placeholder="app.mentoria.com.br"
                    value={formData.dominio}
                    onChange={(e) => setFormData({ ...formData, dominio: e.target.value })}
                  />
                </div>
              </div>

              <Separator />
              <h4 className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4" /> Responsável
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gestorNome">Nome do Gestor</Label>
                  <Input
                    id="gestorNome"
                    placeholder="Nome do responsável"
                    value={formData.gestorNome}
                    onChange={(e) => setFormData({ ...formData, gestorNome: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gestorEmail">Email do Gestor</Label>
                  <Input
                    id="gestorEmail"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={formData.gestorEmail}
                    onChange={(e) => setFormData({ ...formData, gestorEmail: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emailContato">Email de Contato</Label>
                  <Input
                    id="emailContato"
                    type="email"
                    placeholder="contato@mentoria.com"
                    value={formData.emailContato}
                    onChange={(e) => setFormData({ ...formData, emailContato: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    placeholder="(11) 99999-9999"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateMentoria} disabled={isSubmitting}>
                {isSubmitting ? "Criando..." : "Criar Mentoria"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Mentorias</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.totalMentorias || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboard?.mentoriasAtivas || 0} ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.totalAlunos || 0}</div>
            <p className="text-xs text-muted-foreground">
              Em todas as mentorias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Mentores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.totalMentores || 0}</div>
            <p className="text-xs text-muted-foreground">
              Em todas as mentorias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Modo da Plataforma</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Dual</div>
            <p className="text-xs text-muted-foreground">
              Legacy + Multi-Tenant
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Mentorias */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Todas as Mentorias
          </CardTitle>
          <CardDescription>
            Visão unificada de todas as mentorias da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dashboard?.mentorias && dashboard.mentorias.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mentoria</TableHead>
                  <TableHead>Modo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead className="text-center">Alunos</TableHead>
                  <TableHead className="text-center">Mentores</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.mentorias.map((mentoria) => (
                  <TableRow key={mentoria.mentoriaId}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {mentoria.modo === "legacy" && (
                          <Crown className="h-4 w-4 text-amber-500" />
                        )}
                        <button
                          className="hover:underline cursor-pointer text-left"
                          onClick={() => navigate(`/gestor/mentorias/${mentoria.mentoriaId}`)}
                        >
                          {mentoria.mentoriaNome}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>{getModoBadge(mentoria.modo)}</TableCell>
                    <TableCell>{getStatusBadge(mentoria.status)}</TableCell>
                    <TableCell>{getPlanoBadge(mentoria.plano)}</TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold text-green-600">{mentoria.alunosAtivos}</span>
                      {mentoria.alunosInativos > 0 && (
                        <span className="text-muted-foreground text-xs ml-1">
                          (+{mentoria.alunosInativos} inativos)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {mentoria.mentoresAtivos}
                    </TableCell>
                    <TableCell className="text-right">
                      {mentoria.modo === "legacy" ? (
                        <Badge variant="outline" className="text-xs">
                          Protegido
                        </Badge>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const m = mentorias.find((mt) => mt.id === mentoria.mentoriaId);
                              if (m) {
                                setEditingMentoria(m);
                                setShowEditDialog(true);
                              }
                            }}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(mentoria.mentoriaId)}
                          >
                            {mentoria.status === "ativo" ? (
                              <Pause className="h-4 w-4 text-yellow-500" />
                            ) : (
                              <Play className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma mentoria encontrada</p>
              <p className="text-sm">Crie sua primeira mentoria white label</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cards individuais de cada mentoria com mais detalhes */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mentorias.map((mentoria) => (
          <Card key={mentoria.id} className="relative overflow-hidden">
            {/* Barra de cor da mentoria */}
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{ backgroundColor: mentoria.branding?.corPrimaria || "#3b82f6" }}
            />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  {mentoria.modo === "legacy" && <Crown className="h-4 w-4 text-amber-500" />}
                  {mentoria.nome}
                </CardTitle>
                {getStatusBadge(mentoria.status)}
              </div>
              <CardDescription className="flex items-center gap-2">
                {getModoBadge(mentoria.modo)}
                {getPlanoBadge(mentoria.plano)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Plataforma:</span>
                  <p className="font-medium truncate">{mentoria.branding?.nomePlataforma}</p>
                </div>
                {mentoria.branding?.dominio && (
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Globe className="h-3 w-3" /> Domínio:
                    </span>
                    <p className="font-medium truncate">{mentoria.branding.dominio}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Limite Alunos:</span>
                  <p className="font-medium">{mentoria.limites?.maxAlunos || "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Limite Mentores:</span>
                  <p className="font-medium">{mentoria.limites?.maxMentores || "N/A"}</p>
                </div>
              </div>

              {mentoria.gestorNome && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Responsável:</span>
                  <p className="font-medium">{mentoria.gestorNome}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() => navigate(`/gestor/mentorias/${mentoria.id}`)}
                >
                  <Users className="h-4 w-4 mr-1" />
                  Gerenciar
                </Button>
                {mentoria.modo !== "legacy" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingMentoria(mentoria);
                        setShowEditDialog(true);
                      }}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(mentoria.id)}
                    >
                      {mentoria.status === "ativo" ? (
                        <Pause className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <Play className="h-4 w-4 text-green-500" />
                      )}
                    </Button>
                  </>
                )}
              </div>

              {mentoria.modo === "legacy" && (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
                  <Shield className="h-4 w-4 flex-shrink-0" />
                  <span>Mentoria original - protegida contra alterações</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Informação sobre o sistema */}
      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            Sobre o Sistema Dual-Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Modo Legacy:</strong> A mentoria original (Mário Machado) opera no modo legacy,
            com dados nas coleções raiz do Firestore. Este modo é permanente e protegido contra
            qualquer alteração acidental.
          </p>
          <p>
            <strong>Modo Multi-Tenant:</strong> Novas mentorias white label operam no modo multi-tenant,
            com dados isolados em subcoleções (mentorias/&#123;id&#125;/...). Cada mentoria tem seus próprios
            alunos, mentores, cronogramas e configurações.
          </p>
          <p>
            <strong>Isolamento:</strong> Os dados de cada mentoria são completamente isolados.
            Alunos e mentores de uma mentoria não podem ver dados de outra.
            Apenas o gestor tem visão unificada de todas as mentorias.
          </p>
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Mentoria</DialogTitle>
            <DialogDescription>
              Atualize as configurações da mentoria {editingMentoria?.nome}
            </DialogDescription>
          </DialogHeader>
          {editingMentoria && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome da Mentoria</Label>
                <Input
                  value={editingMentoria.nome}
                  onChange={(e) =>
                    setEditingMentoria({ ...editingMentoria, nome: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Plano</Label>
                <Select
                  value={editingMentoria.plano}
                  onValueChange={(value) =>
                    setEditingMentoria({ ...editingMentoria, plano: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basico">Básico</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />
              <h4 className="font-medium">Personalização</h4>

              <div className="space-y-2">
                <Label>Nome da Plataforma</Label>
                <Input
                  value={editingMentoria.branding?.nomePlataforma || ""}
                  onChange={(e) =>
                    setEditingMentoria({
                      ...editingMentoria,
                      branding: { ...editingMentoria.branding, nomePlataforma: e.target.value },
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cor Primária</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={editingMentoria.branding?.corPrimaria || "#3b82f6"}
                      onChange={(e) =>
                        setEditingMentoria({
                          ...editingMentoria,
                          branding: { ...editingMentoria.branding, corPrimaria: e.target.value },
                        })
                      }
                      className="h-10 w-14 rounded border cursor-pointer"
                    />
                    <Input
                      value={editingMentoria.branding?.corPrimaria || "#3b82f6"}
                      onChange={(e) =>
                        setEditingMentoria({
                          ...editingMentoria,
                          branding: { ...editingMentoria.branding, corPrimaria: e.target.value },
                        })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Domínio</Label>
                  <Input
                    value={editingMentoria.branding?.dominio || ""}
                    onChange={(e) =>
                      setEditingMentoria({
                        ...editingMentoria,
                        branding: { ...editingMentoria.branding, dominio: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditMentoria} disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
