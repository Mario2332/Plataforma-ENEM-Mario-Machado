import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardComparativo } from "@/components/mentor/DashboardComparativo";
import { BarChart3 } from "lucide-react";

export default function MentorMetricas() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Métricas e Análises
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualize e analise o desempenho dos seus alunos
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard Comparativo de Alunos</CardTitle>
          <CardDescription>
            Gráfico de dispersão: Desempenho vs Tempo de Estudo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DashboardComparativo />
        </CardContent>
      </Card>
    </div>
  );
}
