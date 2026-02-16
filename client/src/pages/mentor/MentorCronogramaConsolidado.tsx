import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Settings2, CheckCircle2, Circle } from "lucide-react";
import { mentorApi } from "@/lib/api";
import { toast } from "sonner";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type FonteDados = "agenda" | "dinamico";

interface ConfiguracaoAluno {
  alunoId: string;
  fonte: FonteDados;
}

export default function MentorCronogramaConsolidado() {
  const [alunos, setAlunos] = useState<any[]>([]);
  const [atividadesPorAluno, setAtividadesPorAluno] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [semanaAtual, setSemanaAtual] = useState(0); // 0 = semana atual, 1 = próxima, -1 = anterior
  const [fonteGlobal, setFonteGlobal] = useState<FonteDados>("agenda");
  const [configuracoesIndividuais, setConfiguracoesIndividuais] = useState<Record<string, FonteDados>>({});

  const diasDaSemana = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  const diasDaSemanaMap: Record<number, string> = {
    1: "Segunda",
    2: "Terça",
    3: "Quarta",
    4: "Quinta",
    5: "Sexta",
    6: "Sábado",
    0: "Domingo"
  };

  useEffect(() => {
    loadData();
  }, [semanaAtual, fonteGlobal, configuracoesIndividuais]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const alunosData = await mentorApi.getAlunos();
      setAlunos(alunosData as any[]);

      // Carregar atividades de cada aluno
      const atividades: Record<string, any[]> = {};
      for (const aluno of alunosData as any[]) {
        try {
          const fonteAluno = configuracoesIndividuais[aluno.id] || fonteGlobal;
          atividades[aluno.id] = await loadAtividadesAluno(aluno.userId, fonteAluno);
        } catch (error) {
          console.error(`Erro ao carregar atividades do aluno ${aluno.nome}:`, error);
          atividades[aluno.id] = [];
        }
      }
      setAtividadesPorAluno(atividades);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  const loadAtividadesAluno = async (userId: string, fonte: FonteDados): Promise<any[]> => {
    const datas = getDatasDaSemana();
    const dataInicio = datas[0];
    const dataFim = datas[6];

    if (fonte === "agenda") {
      // Buscar da agenda
      const agendaRef = collection(db, `alunos/${userId}/agenda`);
      const q = query(
        agendaRef,
        where("data", ">=", formatarDataISO(dataInicio)),
        where("data", "<=", formatarDataISO(dataFim))
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        // Corrigir fuso horário: adicionar T12:00:00 para garantir que caia no dia correto independente do fuso
        // Se data.data for YYYY-MM-DD, new Date(data.data) é UTC. new Date(data.data + 'T12:00:00') é local meio-dia.
        const dataString = data.data.includes('T') ? data.data.split('T')[0] : data.data;
        const dataAtividade = new Date(dataString + 'T12:00:00');
        
        console.log("DEBUG AGENDA:", {
          original: data.data,
          interpretada: dataAtividade.toString(),
          diaSemana: dataAtividade.getDay(),
          titulo: data.titulo,
          atividade: data.atividade,
          descricao: data.descricao,
          details: data.details,
          observacao: data.observacao,
          nomeAtividade: data.nomeAtividade,
          nome: data.nome,
          atividadePersonalizada: data.atividadePersonalizada
        });

        // Lógica robusta para encontrar a descrição
        let atividadeNome = data.titulo || data.atividade || "Sem título";
        
        if (atividadeNome === "Outra atividade") {
          // Tenta encontrar uma descrição em vários campos possíveis, priorizando nomes específicos
          if (data.atividadePersonalizada && data.atividadePersonalizada.trim() !== "") atividadeNome = data.atividadePersonalizada;
          else if (data.nomeAtividade && data.nomeAtividade.trim() !== "") atividadeNome = data.nomeAtividade;
          else if (data.nome && data.nome.trim() !== "") atividadeNome = data.nome;
          else if (data.descricao && data.descricao.trim() !== "") atividadeNome = data.descricao;
          else if (data.details && data.details.trim() !== "") atividadeNome = data.details;
          else if (data.observacao && data.observacao.trim() !== "") atividadeNome = data.observacao;
          else atividadeNome = "Outra atividade (Sem descrição)";
        }

        return {
          ...data,
          id: doc.id,
          dia: diasDaSemanaMap[dataAtividade.getDay()],
          atividade: atividadeNome,
          horaInicio: data.horaInicio || "",
          horaFim: data.horaFim || "",
          concluido: data.concluido || false,
        };
      });
    } else {
      // Buscar do cronograma anual dinâmico
      const cronogramaRef = doc(db, `alunos/${userId}/cronograma/dinamico`);
      const snapshot = await getDoc(cronogramaRef);
      
      if (!snapshot.exists()) {
        return [];
      }

      const data = snapshot.data();
      const schedule = data.schedule || [];
      
      const atividades: any[] = [];
      schedule.forEach((day: any) => {
        // Corrigir fuso horário: adicionar T12:00:00 para garantir que caia no dia correto independente do fuso
        const dataString = day.date.includes('T') ? day.date.split('T')[0] : day.date;
        const dataAtividade = new Date(dataString + 'T12:00:00');
        
        const dataAtividadeStr = dataString;
        const dataInicioStr = formatarDataISO(dataInicio);
        const dataFimStr = formatarDataISO(dataFim);

        // Verificar se a data está dentro da semana selecionada (comparação de strings YYYY-MM-DD funciona bem)
        if (dataAtividadeStr >= dataInicioStr && dataAtividadeStr <= dataFimStr) {
          // Cada dia pode ter múltiplas tarefas
          (day.tasks || []).forEach((task: any) => {
            console.log("DEBUG DINAMICO:", {
              original: day.date,
              interpretada: dataAtividade.toString(),
              diaSemana: dataAtividade.getDay(),
              name: task.name,
              subject: task.subject,
              details: task.details,
              description: task.description,
              nomeAtividade: task.nomeAtividade,
              nome: task.nome,
              atividadePersonalizada: task.atividadePersonalizada
            });

            // Lógica robusta para encontrar a descrição
            let atividadeNome = task.name || task.subject || "Sem título";
            
            if (atividadeNome === "Outra atividade") {
              // Tenta encontrar uma descrição em vários campos possíveis, priorizando nomes específicos
              if (task.atividadePersonalizada && task.atividadePersonalizada.trim() !== "") atividadeNome = task.atividadePersonalizada;
              else if (task.nomeAtividade && task.nomeAtividade.trim() !== "") atividadeNome = task.nomeAtividade;
              else if (task.nome && task.nome.trim() !== "") atividadeNome = task.nome;
              else if (task.details && task.details.trim() !== "") atividadeNome = task.details;
              else if (task.description && task.description.trim() !== "") atividadeNome = task.description;
              else if (task.observacao && task.observacao.trim() !== "") atividadeNome = task.observacao;
              else atividadeNome = "Outra atividade (Sem descrição)";
            }

            atividades.push({
              id: `${day.date}_${task.name}`,
              dia: diasDaSemanaMap[dataAtividade.getDay()],
              atividade: atividadeNome,
              materia: task.subject || "",
              duracao: task.duration || 0,
              tipo: task.type || "",
              horaInicio: "",
              horaFim: "",
              concluido: task.concluido || false,
            });
          });
        }
      });
      return atividades;
    }
  };

  const getDatasDaSemana = () => {
    const hoje = new Date();
    const diaSemana = hoje.getDay(); // 0 = domingo, 1 = segunda, ...
    const diasParaSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
    
    const segunda = new Date(hoje);
    segunda.setDate(hoje.getDate() + diasParaSegunda + (semanaAtual * 7));
    segunda.setHours(0, 0, 0, 0);
    
    return Array.from({ length: 7 }, (_, i) => {
      const data = new Date(segunda);
      data.setDate(segunda.getDate() + i);
      return data;
    });
  };

  // Função auxiliar para formatar data localmente para YYYY-MM-DD
  const formatarDataISO = (data: Date) => {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  const datas = getDatasDaSemana();

  const getAtividadesParaDia = (alunoId: string, diaSemana: string) => {
    const atividades = atividadesPorAluno[alunoId] || [];
    const atividadesDoDia = atividades.filter(ativ => ativ.dia === diaSemana);
    
    // Ordenar por horário de início
    return atividadesDoDia.sort((a, b) => {
      if (!a.horaInicio) return 1; // Sem horário vai para o final
      if (!b.horaInicio) return -1;
      return a.horaInicio.localeCompare(b.horaInicio);
    });
  };

  const formatarData = (data: Date) => {
    return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  const getTituloSemana = () => {
    if (semanaAtual === 0) return "Semana Atual";
    if (semanaAtual === 1) return "Próxima Semana";
    if (semanaAtual === -1) return "Semana Passada";
    if (semanaAtual > 0) return `Daqui a ${semanaAtual} semanas`;
    return `Há ${Math.abs(semanaAtual)} semanas`;
  };

  const handleFonteIndividualChange = (alunoId: string, fonte: FonteDados) => {
    setConfiguracoesIndividuais(prev => ({
      ...prev,
      [alunoId]: fonte
    }));
  };

  const getFonteAluno = (alunoId: string): FonteDados => {
    return configuracoesIndividuais[alunoId] || fonteGlobal;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cronograma Consolidado</h1>
          <p className="text-muted-foreground">
            Visualize as atividades de todos os alunos em uma única visão
          </p>
        </div>
      </div>

      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Visualização</CardTitle>
          <CardDescription>Selecione a fonte de dados para visualização</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Fonte Global */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">Fonte de Dados Global</label>
              <p className="text-xs text-muted-foreground">
                Aplica-se a todos os alunos que não têm configuração individual
              </p>
            </div>
            <Select value={fonteGlobal} onValueChange={(v) => setFonteGlobal(v as FonteDados)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agenda">Agenda</SelectItem>
                <SelectItem value="dinamico">Cronograma Dinâmico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Navegação de Semana */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSemanaAtual(prev => prev - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Semana Anterior
            </Button>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              <span className="font-semibold">{getTituloSemana()}</span>
              <Badge variant="outline">
                {formatarData(datas[0])} - {formatarData(datas[6])}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSemanaAtual(prev => prev + 1)}
            >
              Próxima Semana
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Cronogramas */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4 bg-muted/50 font-semibold sticky left-0 z-10 bg-background border-r min-w-[200px]">
                Aluno
              </th>
              {diasDaSemana.map((dia, index) => (
                <th key={dia} className="text-center p-4 bg-muted/50 font-semibold min-w-[150px]">
                  <div>{dia}</div>
                  <div className="text-xs font-normal text-muted-foreground">
                    {formatarData(datas[index])}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alunos.map((aluno) => {
              const fonteAluno = getFonteAluno(aluno.id);
              return (
                <tr key={aluno.id} className="border-b hover:bg-muted/30">
                  <td className="p-4 sticky left-0 bg-background border-r">
                    <div className="space-y-2">
                      <div className="font-medium">{aluno.nome}</div>
                      <Select 
                        value={fonteAluno} 
                        onValueChange={(v) => handleFonteIndividualChange(aluno.id, v as FonteDados)}
                      >
                        <SelectTrigger className="w-full h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="agenda">Agenda</SelectItem>
                          <SelectItem value="dinamico">Dinâmico</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </td>
                  {diasDaSemana.map((dia) => {
                    const atividades = getAtividadesParaDia(aluno.id, dia);
                    return (
                      <td key={dia} className="p-2 align-top">
                        <div className="space-y-1">
                          {atividades.length === 0 ? (
                            <div className="text-xs text-muted-foreground text-center py-2">
                              -
                            </div>
                          ) : (
                            atividades.map((ativ, idx) => (
                              <div
                                key={idx}
                                className={`text-xs p-2 rounded border transition-all ${
                                  ativ.concluido 
                                    ? "bg-emerald-50 border-emerald-200 opacity-75" 
                                    : "bg-blue-50 border-blue-200"
                                }`}
                              >
                                <div className="flex items-start gap-1.5">
                                  <div className="mt-0.5 flex-shrink-0">
                                    {ativ.concluido ? (
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                    ) : (
                                      <Circle className="h-3.5 w-3.5 text-blue-300" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div 
                                      className={`font-medium truncate ${ativ.concluido ? "line-through text-muted-foreground" : ""}`} 
                                      title={ativ.atividade}
                                    >
                                      {ativ.atividade}
                                    </div>
                                    {ativ.horaInicio && (
                                      <div className={`text-[10px] ${ativ.concluido ? "text-muted-foreground/70" : "text-muted-foreground"}`}>
                                        {ativ.horaInicio}
                                        {ativ.horaFim && ` - ${ativ.horaFim}`}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {alunos.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhum aluno cadastrado</p>
            <p className="text-sm text-muted-foreground">
              Cadastre alunos para visualizar seus cronogramas
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
