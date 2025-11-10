import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Users, TrendingUp, Activity } from "lucide-react";

export default function MentorHome() {
  const { data: mentor } = trpc.mentor.me.useQuery();
  const { data: alunos } = trpc.mentor.getAlunos.useQuery();

  const alunosAtivos = alunos?.filter(a => a.ativo).length || 0;
  const alunosTotal = alunos?.length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard do Mentor</h1>
        <p className="text-muted-foreground mt-2">Bem-vindo, {mentor?.nome}!</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alunosTotal}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {alunosAtivos} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plataforma</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mentor?.nomePlataforma}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Seu espaço personalizado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engajamento</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground mt-1">
              Em breve
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visão Geral</CardTitle>
          <CardDescription>Resumo da sua plataforma de mentoria</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Gerencie seus alunos, acompanhe o progresso e mantenha anotações privadas sobre cada estudante.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
