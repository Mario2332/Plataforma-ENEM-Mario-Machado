import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mentorApi } from "@/lib/api";
import { ArrowLeft, Loader2, Home, BookOpen, LayoutDashboard, BarChart3, Target, FileText, PenTool, Heart, GraduationCap, Settings } from "lucide-react";
import { toast } from "sonner";
import { MentorViewProvider } from "@/contexts/MentorViewContext";

// Importar componentes originais do aluno
import AlunoHome from "../aluno/AlunoHome";
import AlunoEstudos from "../aluno/AlunoEstudos";
import AlunoSimulados from "../aluno/AlunoSimulados";
import AlunoMetricas from "../aluno/AlunoMetricas";
import CronogramaWrapper from "../aluno/CronogramaWrapper";
import AlunoDiario from "../aluno/AlunoDiario";
import AlunoMetas from "../aluno/AlunoMetas";
import AlunoRedacoes from "../aluno/AlunoRedacoes";
import AlunoConfiguracoes from "../aluno/AlunoConfiguracoes";
import PainelGeral from "../aluno/conteudos/PainelGeral";
import Matematica from "../aluno/conteudos/Matematica";
import Biologia from "../aluno/conteudos/Biologia";
import Fisica from "../aluno/conteudos/Fisica";
import Quimica from "../aluno/conteudos/Quimica";
import Historia from "../aluno/conteudos/Historia";
import Geografia from "../aluno/conteudos/Geografia";
import Linguagens from "../aluno/conteudos/Linguagens";
import Filosofia from "../aluno/conteudos/Filosofia";
import Sociologia from "../aluno/conteudos/Sociologia";

// Re-exportar o hook para compatibilidade com código existente
export { useMentorViewContext as useMentorView } from "@/contexts/MentorViewContext";

export default function MentorViewAluno() {
  const [match, params] = useRoute("/mentor/alunos/:alunoId");
  const [, setLocation] = useLocation();
  const alunoId = params?.alunoId;
  const [isLoading, setIsLoading] = useState(true);
  const [alunoData, setAlunoData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("inicio");
  const [conteudoSubTab, setConteudoSubTab] = useState("painel");

  useEffect(() => {
    loadAlunoData();
  }, [alunoId]);

  const loadAlunoData = async () => {
    if (!alunoId) {
      toast.error("ID do aluno não fornecido");
      setLocation("/mentor/alunos");
      return;
    }

    try {
      setIsLoading(true);
      const data = await mentorApi.getAlunoAreaCompleta(alunoId);
      setAlunoData(data);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar dados do aluno");
      setLocation("/mentor/alunos");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!alunoData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground mb-4">Aluno não encontrado</p>
        <Button onClick={() => setLocation("/mentor/alunos")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  // Renderizar conteúdo da sub-aba de conteúdos
  const renderConteudoContent = () => {
    switch (conteudoSubTab) {
      case "painel":
        return <PainelGeral />;
      case "matematica":
        return <Matematica />;
      case "biologia":
        return <Biologia />;
      case "fisica":
        return <Fisica />;
      case "quimica":
        return <Quimica />;
      case "historia":
        return <Historia />;
      case "geografia":
        return <Geografia />;
      case "linguagens":
        return <Linguagens />;
      case "filosofia":
        return <Filosofia />;
      case "sociologia":
        return <Sociologia />;
      default:
        return <PainelGeral />;
    }
  };

  return (
    <MentorViewProvider alunoId={alunoId} isMentorView={true}>
      <div className="space-y-6">
        {/* Header com informações do aluno */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/mentor/alunos")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </div>
            <h1 className="text-3xl font-bold">{alunoData.aluno.nome}</h1>
            <p className="text-muted-foreground mt-1">
              Visualizando e editando como mentor • {alunoData.aluno.email}
            </p>
          </div>
        </div>

        {/* Alerta informativo */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              ℹ️ Você está visualizando e pode editar a área do aluno. 
              Todas as alterações serão salvas na conta do aluno.
            </p>
          </CardContent>
        </Card>

        {/* Tabs com as áreas do aluno */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="inicio" className="flex items-center gap-1.5">
              <Home className="h-4 w-4" />
              Início
            </TabsTrigger>
            <TabsTrigger value="estudos" className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              Estudos
            </TabsTrigger>
            <TabsTrigger value="cronograma" className="flex items-center gap-1.5">
              <LayoutDashboard className="h-4 w-4" />
              Cronograma
            </TabsTrigger>
            <TabsTrigger value="metricas" className="flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4" />
              Métricas
            </TabsTrigger>
            <TabsTrigger value="metas" className="flex items-center gap-1.5">
              <Target className="h-4 w-4" />
              Metas
            </TabsTrigger>
            <TabsTrigger value="simulados" className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              Simulados
            </TabsTrigger>
            <TabsTrigger value="redacoes" className="flex items-center gap-1.5">
              <PenTool className="h-4 w-4" />
              Redações
            </TabsTrigger>
            <TabsTrigger value="diario" className="flex items-center gap-1.5">
              <Heart className="h-4 w-4" />
              Diário de Bordo
            </TabsTrigger>
            <TabsTrigger value="conteudos" className="flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4" />
              Conteúdos
            </TabsTrigger>
            <TabsTrigger value="configuracoes" className="flex items-center gap-1.5">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inicio">
            <AlunoHome />
          </TabsContent>

          <TabsContent value="estudos">
            <AlunoEstudos />
          </TabsContent>

          <TabsContent value="cronograma">
            <CronogramaWrapper />
          </TabsContent>

          <TabsContent value="metricas">
            <AlunoMetricas />
          </TabsContent>

          <TabsContent value="metas">
            <AlunoMetas />
          </TabsContent>

          <TabsContent value="simulados">
            <AlunoSimulados />
          </TabsContent>

          <TabsContent value="redacoes">
            <AlunoRedacoes />
          </TabsContent>

          <TabsContent value="diario">
            <AlunoDiario />
          </TabsContent>

          <TabsContent value="conteudos">
            {/* Sub-tabs para Conteúdos */}
            <div className="space-y-4">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-1 flex flex-wrap gap-1">
                <button
                  onClick={() => setConteudoSubTab("painel")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    conteudoSubTab === "painel"
                      ? "bg-white dark:bg-gray-700 text-primary shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  Painel Geral
                </button>
                <button
                  onClick={() => setConteudoSubTab("matematica")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    conteudoSubTab === "matematica"
                      ? "bg-white dark:bg-gray-700 text-primary shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  Matemática
                </button>
                <button
                  onClick={() => setConteudoSubTab("biologia")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    conteudoSubTab === "biologia"
                      ? "bg-white dark:bg-gray-700 text-primary shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  Biologia
                </button>
                <button
                  onClick={() => setConteudoSubTab("fisica")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    conteudoSubTab === "fisica"
                      ? "bg-white dark:bg-gray-700 text-primary shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  Física
                </button>
                <button
                  onClick={() => setConteudoSubTab("quimica")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    conteudoSubTab === "quimica"
                      ? "bg-white dark:bg-gray-700 text-primary shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  Química
                </button>
                <button
                  onClick={() => setConteudoSubTab("historia")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    conteudoSubTab === "historia"
                      ? "bg-white dark:bg-gray-700 text-primary shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  História
                </button>
                <button
                  onClick={() => setConteudoSubTab("geografia")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    conteudoSubTab === "geografia"
                      ? "bg-white dark:bg-gray-700 text-primary shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  Geografia
                </button>
                <button
                  onClick={() => setConteudoSubTab("linguagens")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    conteudoSubTab === "linguagens"
                      ? "bg-white dark:bg-gray-700 text-primary shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  Linguagens
                </button>
                <button
                  onClick={() => setConteudoSubTab("filosofia")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    conteudoSubTab === "filosofia"
                      ? "bg-white dark:bg-gray-700 text-primary shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  Filosofia
                </button>
                <button
                  onClick={() => setConteudoSubTab("sociologia")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    conteudoSubTab === "sociologia"
                      ? "bg-white dark:bg-gray-700 text-primary shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  Sociologia
                </button>
              </div>
              {renderConteudoContent()}
            </div>
          </TabsContent>

          <TabsContent value="configuracoes">
            <AlunoConfiguracoes />
          </TabsContent>
        </Tabs>
      </div>
    </MentorViewProvider>
  );
}
